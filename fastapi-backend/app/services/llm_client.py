"""
LLM client for generating JSONL training data with dataset mode support.
Supports 3 Groq and 3 OpenRouter API keys with:
- Dynamic free model discovery
- Concurrency limiting (max 3 concurrent per key)
- Rate limit handling (exponential backoff + cooldown)
- Invalidation of deprecated/missing models (404)
- Queue-based worker orchestration
- Dead letter queue (DLQ) processing at the end
- Schema output format: {"instruction": "...", "input": "...", "output": "..."}
"""

import os
import httpx
import json
import re
import logging
import asyncio
import time
from enum import Enum
from typing import List, Dict, Any, Optional
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Dataset Mode Definitions
class DatasetMode(str, Enum):
    """Dataset generation modes with distinct quality requirements"""
    THEORY_QA = "theory_qa"      # Document-grounded conceptual Q&A with causal reasoning
    CODE_GEN = "code_gen"        # Programming problems with code-only answers
    STRUCTURAL_QA = "structural_qa"  # Definitions, properties, components, structural details
    TRADEOFFS_QA = "tradeoffs_qa"    # Limitations, trade-offs, constraints, design considerations
    COMPARATIVE_QA = "comparative_qa"  # Comparisons, relationships, multi-concept connections

# Fixed system prompts per mode (no dynamic drift allowed)
MODE_SYSTEM_PROMPTS = {
    DatasetMode.THEORY_QA: (
        "You are an AI tutor specializing in conceptual understanding. "
        "You explain WHY concepts work and HOW they relate to each other. "
        "Your answers must be grounded in the provided text and demonstrate causal reasoning."
    ),
    DatasetMode.CODE_GEN: (
        "You are a programming instructor who generates executable code solutions. "
        "You provide ONLY valid, runnable code without explanations or comments. "
        "Your code must solve the problem based on the provided text."
    ),
    DatasetMode.STRUCTURAL_QA: (
        "You are an AI tutor specializing in definitions and structural knowledge. "
        "You provide concise, precise answers about WHAT things are, their properties, "
        "components, and characteristics as explicitly stated in the text."
    ),
    DatasetMode.TRADEOFFS_QA: (
        "You are an AI tutor specializing in critical analysis of technical limitations. "
        "You explain limitations, trade-offs, constraints, and design considerations. "
        "Your answers must explain WHY limitations exist and what trade-offs are involved."
    ),
    DatasetMode.COMPARATIVE_QA: (
        "You are an AI tutor specializing in comparisons and relationships between concepts. "
        "You explain how concepts relate to each other, compare alternatives, and describe "
        "cause-effect relationships. Your answers must reference multiple concepts explicitly."
    )
}

# Meta question patterns to filter out (case-insensitive matching)
META_QUESTION_PATTERNS = [
    r'\b(author|writer|wrote)\b.*\?',
    r'\btitle\b.*\?',
    r'\bisbn\b',
    r'\b(publisher|published|publication)\b.*\?',
    r'\bcopyright\b.*\?',
    r'\bdedicated?\b.*\?',
    r'\bedition\b.*\?',
    r'who\s+(is\s+)?the\s+author',
    r'what\s+(is\s+)?the\s+title',
]

def detect_dataset_mode(text: str) -> DatasetMode:
    """Automatically detect dataset mode based on document content."""
    text_lower = text.lower()
    text_sample = text[:5000]
    
    code_keywords = [
        'def ', 'function ', 'class ', 'import ', 'const ', 'let ', 'var ',
        'public ', 'private ', 'void ', 'return ', '#!/', 'package ',
        '#include', 'malloc', 'printf', 'iostream'
    ]
    
    code_patterns = [
        r'\bdef\s+\w+\s*\(',
        r'\bfunction\s+\w+\s*\(',
        r'\bclass\s+\w+\s*[:{]',
        r'^\s*import\s+\w+',
        r'\bpublic\s+\w+\s+\w+\s*\(',
        r'=>\s*{',
        r'\w+\s*\(\s*\)\s*{',
    ]
    
    code_keyword_count = sum(1 for kw in code_keywords if kw in text_lower)
    code_pattern_count = sum(1 for pattern in code_patterns if re.search(pattern, text_sample, re.MULTILINE))
    
    if code_keyword_count >= 3 or code_pattern_count >= 2:
        logger.info(f"Detected CODE_GEN mode (keywords: {code_keyword_count}, patterns: {code_pattern_count})")
        return DatasetMode.CODE_GEN
    
    logger.info("Detected THEORY_QA mode (default)")
    return DatasetMode.THEORY_QA

# ---------------------------------------------------------------------------
# Token Bucket Rate Limiter
# ---------------------------------------------------------------------------

class TokenBucketLimiter:
    """Manages tokens per minute per API key using a token bucket algorithm"""
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = refill_rate_per_sec
        self.updated_at = time.monotonic()
        self.lock = asyncio.Lock()

    def update_limits(self, capacity: int):
        """Dynamically update capacity and refill rate (e.g. when model shifts)"""
        self.capacity = capacity
        self.refill_rate = capacity / 60.0
        self.tokens = min(self.tokens, float(capacity))

    async def consume(self, amount: int) -> bool:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.updated_at
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.updated_at = now
            
            if self.tokens >= amount:
                self.tokens -= amount
                return True
            return False

    async def wait_for_tokens(self, amount: int):
        while True:
            if await self.consume(amount):
                break
            needed = amount - self.tokens
            wait_time = needed / self.refill_rate
            sleep_duration = max(0.5, min(wait_time, 2.0))
            await asyncio.sleep(sleep_duration)

# ---------------------------------------------------------------------------
# Pipeline Configuration & Key Pooling
# ---------------------------------------------------------------------------

class PipelineConfig:
    """Holds base URLs and active API keys for Groq and OpenRouter"""
    def __init__(self):
        # Gather keys
        self.groq_keys = [
            os.getenv("GROQ_API_KEY_1", os.getenv("GROQ_API_KEY", "")),
            os.getenv("GROQ_API_KEY_2", ""),
            os.getenv("GROQ_API_KEY_3", "")
        ]
        self.openrouter_keys = [
            os.getenv("OPENROUTER_API_KEY_1", os.getenv("OPENROUTER_API_KEY", "")),
            os.getenv("OPENROUTER_API_KEY_2", ""),
            os.getenv("OPENROUTER_API_KEY_3", "")
        ]
        
        def is_valid_key(k: str) -> bool:
            k = k.strip()
            if not k:
                return False
            lower_k = k.lower()
            placeholders = ["your-", "placeholder", "api-key-", "api_key_"]
            if any(p in lower_k for p in placeholders):
                return False
            return True
            
        # Strip empty strings and placeholder templates
        self.groq_keys = [k.strip() for k in self.groq_keys if is_valid_key(k)]
        self.openrouter_keys = [k.strip() for k in self.openrouter_keys if is_valid_key(k)]
        
        # Base URLs
        self.groq_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        self.openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        
        logger.info(f"Loaded config: Groq keys: {len(self.groq_keys)}, OpenRouter keys: {len(self.openrouter_keys)}")

class APIKeyClient:
    """Wraps an API key, its AsyncOpenAI client, and throttling/cooldown state"""
    def __init__(self, provider_name: str, api_key: str, base_url: str):
        self.provider_name = provider_name
        self.api_key = api_key
        self.base_url = base_url
        self.semaphore = asyncio.Semaphore(2)  # Max 2 concurrent requests per key
        self.cooldown_until = 0.0
        self.rate_limit_count = 0
        
        # Safe default capacity (11,000 for Groq llama-3.3-70b, 10,000 for OpenRouter)
        capacity = 11000 if provider_name == "groq" else 10000
        self.limiter = TokenBucketLimiter(capacity=capacity, refill_rate_per_sec=capacity / 60.0)
        
        if provider_name == "openrouter":
            self.openai_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                default_headers={
                    "HTTP-Referer": "https://vectormind.site",
                    "X-Title": "VectorMind"
                }
            )
        else:
            self.openai_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )

class ChunkProcessingException(Exception):
    """Custom exception raised when processing a chunk fails after all retries"""
    def __init__(self, message: str, last_provider: str):
        super().__init__(message)
        self.last_provider = last_provider

# ---------------------------------------------------------------------------
# Dynamic Model Discovery & Selection
# ---------------------------------------------------------------------------

class ModelManager:
    """Discovers, filters, and caches free models from providers at runtime"""
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.cached_models = {
            "groq": [],
            "openrouter": []
        }
        self.last_fetch_time = {
            "groq": 0.0,
            "openrouter": 0.0
        }
        self.cache_ttl = 3600.0  # Cache for 1 hour
        
    def _get_fallbacks(self, provider: str) -> List[str]:
        if provider == "groq":
            return [
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "mixtral-8x7b-32768",
                "gemma2-9b-it"
            ]
        elif provider == "openrouter":
            return [
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen-2.5-72b-instruct:free",
                "meta-llama/llama-3.1-8b-instruct:free",
                "qwen/qwen-2.5-7b-instruct:free"
            ]
        return []

    async def get_best_model(self, provider: str) -> str:
        now = time.time()
        # Refresh cache if empty or expired
        if not self.cached_models[provider] or (now - self.last_fetch_time[provider] > self.cache_ttl):
            try:
                await self.fetch_models(provider)
            except Exception as e:
                logger.error(f"Failed to fetch models for {provider}: {e}. Utilizing fallbacks.")
                if not self.cached_models[provider]:
                    self.cached_models[provider] = self._get_fallbacks(provider)
        
        if not self.cached_models[provider]:
            fallback_list = self._get_fallbacks(provider)
            self.cached_models[provider] = fallback_list
            
        return self.cached_models[provider][0]

    async def invalidate_model(self, provider: str, model_id: str):
        logger.warning(f"Invalidating model {model_id} on provider {provider}")
        if model_id in self.cached_models[provider]:
            self.cached_models[provider].remove(model_id)
        
        # If cache is now empty, reset list using fallbacks or try refetching
        if not self.cached_models[provider]:
            try:
                await self.fetch_models(provider)
            except Exception:
                self.cached_models[provider] = self._get_fallbacks(provider)
                
            # If the bad model is still in there, filter it out
            if model_id in self.cached_models[provider]:
                self.cached_models[provider].remove(model_id)

    async def fetch_models(self, provider: str):
        if provider == "groq":
            keys = self.config.groq_keys
            if not keys:
                raise ValueError("No Groq keys configured")
            
            headers = {"Authorization": f"Bearer {keys[0]}"}
            url = f"{self.config.groq_base_url}/models"
            
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                res = await http_client.get(url, headers=headers)
            res.raise_for_status()
            
            data = res.json().get("data", [])
            
            # Filter: Exclude audio/whisper models
            filtered = []
            for m in data:
                m_id = m.get("id", "")
                if any(x in m_id.lower() for x in ("whisper", "audio", "distil")):
                    continue
                filtered.append(m)
                
            # Sort: strictly prefer llama-3.3-70b-versatile, then other llama-3.3 or llama-3.1 models
            def groq_sort_key(m):
                m_id = m.get("id", "").lower()
                # Groq doesn't always send context_window, default to 0
                context = m.get("context_window", 0)
                boost = 0
                if "llama-3.3-70b-versatile" in m_id:
                    boost += 5000000
                elif "llama-3.3" in m_id or "llama-3.1" in m_id:
                    boost += 1000000
                return boost + context
                
            filtered.sort(key=groq_sort_key, reverse=True)
            self.cached_models["groq"] = [m["id"] for m in filtered]
            self.last_fetch_time["groq"] = time.time()
            logger.info(f"Dynamically loaded Groq models. Best candidate: {self.cached_models['groq'][0]}")
            
        elif provider == "openrouter":
            keys = self.config.openrouter_keys
            # Try getting models. OpenRouter models endpoint doesn't strictly need a key,
            # but we pass the first one if available to avoid rate limit throttling
            headers = {}
            if keys:
                headers["Authorization"] = f"Bearer {keys[0]}"
                
            url = f"{self.config.openrouter_base_url}/models"
            
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                res = await http_client.get(url, headers=headers)
            res.raise_for_status()
            
            data = res.json().get("data", [])
            
            # Filter: pricing must be strictly 0
            filtered = []
            for m in data:
                pricing = m.get("pricing", {})
                prompt_p = float(pricing.get("prompt", 1.0))
                completion_p = float(pricing.get("completion", 1.0))
                if prompt_p == 0.0 and completion_p == 0.0:
                    filtered.append(m)
                    
            # Sort: Prefer llama 3.3/3.1, Qwen, and larger context length
            def or_sort_key(m):
                m_id = m.get("id", "").lower()
                context = m.get("context_length", 0)
                boost = 0
                if "llama-3.3" in m_id or "llama-3.1" in m_id:
                    boost += 1000000
                elif "qwen" in m_id:
                    boost += 500000
                return boost + context
                
            filtered.sort(key=or_sort_key, reverse=True)
            self.cached_models["openrouter"] = [m["id"] for m in filtered]
            self.last_fetch_time["openrouter"] = time.time()
            logger.info(f"Dynamically loaded OpenRouter free models. Best candidate: {self.cached_models['openrouter'][0]}")

# ---------------------------------------------------------------------------
# LLM Orchestrator
# ---------------------------------------------------------------------------

class LLMOrchestrator:
    """Manages the pool of API clients, routes chunks, retries, and coordinates the DLQ"""
    def __init__(self, config: PipelineConfig, model_manager: ModelManager):
        self.config = config
        self.model_manager = model_manager
        self.clients: List[APIKeyClient] = []
        self._last_client_index = -1
        
        # Register clients
        for key in config.groq_keys:
            self.clients.append(APIKeyClient("groq", key, config.groq_base_url))
        for key in config.openrouter_keys:
            self.clients.append(APIKeyClient("openrouter", key, config.openrouter_base_url))
            
        if not self.clients:
            logger.error("NO ACTIVE LLM API KEYS CONFIGURED (3 Groq, 3 OpenRouter). Pipeline cannot process tasks!")

    async def get_next_available_client(self, preferred_provider: Optional[str] = None) -> APIKeyClient:
        if not self.clients:
            raise ValueError("No active API clients registered in orchestrator")
            
        while True:
            now = time.time()
            
            # 1. Check preferred provider clients first
            if preferred_provider:
                matched_clients = [c for c in self.clients if c.provider_name == preferred_provider]
                for c in matched_clients:
                    if c.cooldown_until <= now:
                        return c
                        
            # 2. General round-robin across all clients
            for i in range(len(self.clients)):
                idx = (self._last_client_index + i + 1) % len(self.clients)
                client = self.clients[idx]
                if client.cooldown_until <= now:
                    self._last_client_index = idx
                    return client
            
            # 3. All clients in cooldown, find minimum cooldown time
            min_cooldown = min((c.cooldown_until - now for c in self.clients), default=1.0)
            if min_cooldown > 0:
                logger.warning(f"All clients in cooldown state. Throttling for {min_cooldown:.2f} seconds...")
                await asyncio.sleep(min_cooldown)
            else:
                await asyncio.sleep(1.0)

    async def generate_jsonl_for_chunks(self, chunks: List[str]) -> List[List[str]]:
        if not self.clients:
            logger.error("Skipping document processing: no active API clients")
            return [[] for _ in chunks]
            
        queue = asyncio.Queue()
        for idx, chunk in enumerate(chunks):
            queue.put_nowait((idx, chunk))
            
        results: List[List[str]] = [[] for _ in chunks]
        dead_letter_queue: List[tuple[int, str, str]] = []
        
        # Concurrency: 6 keys × max 3 concurrent = 18 workers
        num_workers = min(18, len(chunks))
        if num_workers == 0:
            return []
            
        # Determine target examples per chunk dynamically based on document length to satisfy min requirement
        total_chunks = len(chunks)
        if total_chunks == 1:
            examples_per_chunk = 12
        elif total_chunks == 2:
            examples_per_chunk = 7
        else:
            examples_per_chunk = 4
            
        async def worker():
            while True:
                try:
                    idx, chunk = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                    
                try:
                    # Initial attempt allows any provider (preferred_provider=None)
                    lines = await self.process_chunk_with_retry(chunk, examples_per_chunk=examples_per_chunk)
                    results[idx] = lines
                except ChunkProcessingException as e:
                    logger.error(f"Worker chunk {idx} failure: {e}. Appending to DLQ.")
                    dead_letter_queue.append((idx, chunk, e.last_provider))
                except Exception as e:
                    logger.error(f"Worker chunk {idx} unexpected failure: {e}. Appending to DLQ.")
                    dead_letter_queue.append((idx, chunk, "groq"))  # default to groq for retry swap
                finally:
                    queue.task_done()
                    
        workers = [asyncio.create_task(worker()) for _ in range(num_workers)]
        await asyncio.gather(*workers)
        
        # Process DLQ at the very end
        if dead_letter_queue:
            logger.info(f"Starting Dead Letter Queue (DLQ) processing for {len(dead_letter_queue)} chunks...")
            for idx, chunk, last_provider in dead_letter_queue:
                alternate_provider = "openrouter" if last_provider == "groq" else "groq"
                logger.info(f"Retrying DLQ chunk {idx} with alternative provider: {alternate_provider}")
                try:
                    lines = await self.process_chunk_with_retry(chunk, preferred_provider=alternate_provider, examples_per_chunk=examples_per_chunk)
                    results[idx] = lines
                    logger.info(f"Recovered DLQ chunk {idx} successfully on {alternate_provider}")
                except Exception as e:
                    logger.error(f"DLQ chunk {idx} permanently failed on alternate provider: {e}")
                    results[idx] = []
                    
        return results

    async def process_chunk_with_retry(self, chunk: str, preferred_provider: Optional[str] = None, examples_per_chunk: int = 4) -> List[str]:
        mode = detect_dataset_mode(chunk)
        if not self._is_mode_applicable(mode, chunk):
            logger.info(f"Mode {mode.value} is not applicable to text chunk, skipping.")
            return []
            
        max_attempts = 5
        stricter_prompt = False
        last_provider_used = "groq"
        
        for attempt in range(max_attempts):
            client = None
            try:
                client = await self.get_next_available_client(preferred_provider)
                last_provider_used = client.provider_name
            except Exception as e:
                logger.error(f"Client lookup failed: {e}")
                raise ChunkProcessingException(f"Failed to find active provider: {e}", last_provider_used)
                
            async with client.semaphore:
                try:
                    model = await self.model_manager.get_best_model(client.provider_name)
                    
                    # Dynamically adjust capacity based on selected model
                    if client.provider_name == "groq":
                        if "llama-3.3-70b" in model.lower():
                            client.limiter.update_limits(11000)
                        elif "llama-3.1-8b" in model.lower():
                            client.limiter.update_limits(5500)
                        else:
                            client.limiter.update_limits(11000)
                    else:
                        client.limiter.update_limits(10000)

                    system_prompt = MODE_SYSTEM_PROMPTS[mode]
                    if stricter_prompt:
                        system_prompt += (
                            "\n\nCRITICAL REQUIRED FORMAT: You must return a single JSON object matching the requested schema. "
                            "Do not include any explanation, code comments, or markdown code block formatting (e.g. ```json). "
                            "Make sure your response parses exactly with json.loads() and has the 'examples' list key."
                        )
                        
                    user_prompt = self._build_user_prompt(chunk, mode, examples_per_chunk)
                    
                    # Pacing request: Estimate token count (chars / 4) + 500 estimated output tokens
                    prompt_len = len(system_prompt) + len(user_prompt)
                    estimated_tokens = int(prompt_len / 4) + 500
                    
                    logger.info(f"Waiting for rate limiter tokens ({estimated_tokens}) on key {client.api_key[:8]}... (Current tokens: {client.limiter.tokens:.1f})")
                    await client.limiter.wait_for_tokens(estimated_tokens)
                    
                    response = await client.openai_client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={"type": "json_object"},
                        timeout=60.0
                    )
                    
                    content = response.choices[0].message.content
                    if not content or not content.strip():
                        raise ValueError("Received empty content from LLM completions")
                        
                    # Successfully completed request - reset client limits
                    client.rate_limit_count = 0
                    
                    try:
                        logger.debug(f"Raw completion response: {content}")
                        data = json.loads(content)
                        examples = data.get("examples", [])
                        if not isinstance(examples, list) or not examples:
                            # If model returns single dict directly, wrap it
                            if all(k in data for k in ("instruction", "input", "output")):
                                examples = [data]
                            else:
                                raise ValueError("Missing 'examples' array in response JSON schema")
                                
                        valid_lines = []
                        for ex in examples:
                            if self._validate_example_quality(ex, chunk, mode):
                                # Re-serialize into single lines
                                valid_lines.append(json.dumps(ex, ensure_ascii=False))
                                
                        if not valid_lines:
                            logger.warning(f"No examples passed quality controls on attempt {attempt + 1}")
                            if not stricter_prompt:
                                stricter_prompt = True
                                continue
                            return []
                            
                        return valid_lines
                        
                    except (json.JSONDecodeError, ValueError) as json_err:
                        logger.warning(f"JSON schema mismatch on attempt {attempt + 1}: {json_err}")
                        stricter_prompt = True
                        if attempt == max_attempts - 1:
                            raise json_err
                        continue
                        
                except openai.RateLimitError as e:
                    client.rate_limit_count += 1
                    
                    # Try to parse OpenRouter metadata.retry_after_seconds
                    retry_after = None
                    if client.provider_name == "openrouter" and hasattr(e, "response") and e.response:
                        try:
                            err_data = e.response.json()
                            retry_after = err_data.get("error", {}).get("metadata", {}).get("retry_after_seconds")
                        except Exception as parse_err:
                            logger.warning(f"Could not parse OpenRouter retry_after_seconds: {parse_err}")
                            
                    if retry_after is not None:
                        logger.warning(f"429 Rate Limit on OpenRouter. Upstream retry instruction: sleep for {retry_after}s.")
                        await asyncio.sleep(float(retry_after))
                    else:
                        backoff = 15 if client.provider_name == "groq" else 10
                        logger.warning(f"429 Rate Limit on {client.provider_name} (key: {client.api_key[:8]}...). Retrying in {backoff}s. Error: {e}")
                        await asyncio.sleep(backoff)
                    
                    if client.rate_limit_count >= 3:
                        logger.warning(f"Rate-limiting threshold exceeded for key {client.api_key[:8]}... putting on 60s cooldown.")
                        client.cooldown_until = time.time() + 60.0
                        client.rate_limit_count = 0
                    continue
                    
                except openai.NotFoundError as e:
                    logger.warning(f"Model {model} returned 404 on {client.provider_name}. Invalidate and retry.")
                    await self.model_manager.invalidate_model(client.provider_name, model)
                    continue
                    
                except (openai.APITimeoutError, openai.APIConnectionError, httpx.RequestError) as e:
                    logger.warning(f"Timeout/Network error on {client.provider_name} (attempt {attempt + 1}): {e}")
                    if attempt == max_attempts - 1:
                        raise e
                    await asyncio.sleep(2)
                    continue
                    
                except Exception as e:
                    logger.error(f"Completions error on {client.provider_name} (attempt {attempt + 1}): {type(e).__name__}: {e}")
                    if attempt == max_attempts - 1:
                        raise e
                    await asyncio.sleep(2)
                    continue
                    
        raise ChunkProcessingException("All retry attempts exhausted for chunk", last_provider_used)

    # ---- prompt building ---------------------------------------------------

    def _build_user_prompt(self, chunk: str, mode: DatasetMode, num_examples: int = 4) -> str:
        return f"""Generate up to {num_examples} high-quality question-answer examples in JSON format based on the text below.

MANDATORY RULES:
1. Return a JSON object with an "examples" array of objects.
2. Each object in "examples" MUST have the keys: "instruction", "input", and "output".
3. "instruction" must ask a fundamental question relevant to the text content.
4. "input" must contain the relevant context/text snippet from the text below supporting the question.
5. "output" must be the answer, grounded strictly in the text.
6. The entire output must be valid JSON parseable by json.loads().
7. Do not include markdown code block formatting (like ```json ... ```) in your raw response. Just output the raw JSON string.

TEXT:
{chunk}

JSON OUTPUT SCHEMA:
{{
  "examples": [
    {{
      "instruction": "...",
      "input": "...",
      "output": "..."
    }}
  ]
}}
"""

    # ---- mode applicability ------------------------------------------------

    def _is_mode_applicable(self, mode: DatasetMode, chunk: str) -> bool:
        chunk_lower = chunk.lower()
        if mode == DatasetMode.TRADEOFFS_QA:
            tradeoff_signals = [
                'limitation', 'limited', 'constraint', 'drawback', 'disadvantage',
                'trade-off', 'tradeoff', 'compromise', 'downside', 'problem',
                'issue', 'challenge', 'difficulty', 'slower', 'expensive',
                'inefficient', 'cannot', 'unable', 'fails', 'however', 'but'
            ]
            if not any(signal in chunk_lower for signal in tradeoff_signals):
                return False
        elif mode == DatasetMode.COMPARATIVE_QA:
            comparative_signals = [
                'compare', 'comparison', 'versus', 'vs', 'differ', 'difference',
                'similar', 'unlike', 'whereas', 'while', 'in contrast',
                'on the other hand', 'both', 'relationship', 'between',
                'more than', 'less than', 'faster', 'slower', 'better', 'worse',
                'instead of', 'rather than', 'alternative'
            ]
            if not any(signal in chunk_lower for signal in comparative_signals):
                return False
        return True

    # ---- quality control filters -------------------------------------------

    def _is_meta_question(self, question: str) -> bool:
        question_lower = question.lower()
        for pattern in META_QUESTION_PATTERNS:
            if re.search(pattern, question_lower):
                return True
        return False
    
    def _is_generic_answer(self, answer: str, chunk: str) -> bool:
        if len(answer.strip()) < 20:
            chunk_words = set(re.findall(r'\b\w{4,}\b', chunk.lower()))
            answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
            specific_overlap = chunk_words & answer_words
            if len(specific_overlap) < 2:
                return True
        
        generic_patterns = [
            r'^(yes|no|true|false|correct|incorrect)\.?$',
            r'^(it is|this is|that is)\s+\w+\.?$',
            r'^see (the )?(book|text|document|article)',
        ]
        answer_lower = answer.lower().strip()
        for pattern in generic_patterns:
            if re.search(pattern, answer_lower):
                return True
        return False
    
    def _has_causal_reasoning(self, answer: str) -> bool:
        # Relax to allow any substantial explanation of 8+ words
        word_count = len(answer.split())
        return word_count >= 8
    
    def _is_code_only(self, answer: str) -> bool:
        answer_stripped = answer.strip()
        if answer_stripped.startswith('```'):
            return False
            
        prose_indicators = [
            r"Here'?s?\s+(the|a)",
            r"This\s+(function|code|method|class)",
            r"The\s+(above|following|code)",
            r"^(First|Second|Third|Finally|Note|Remember)",
            r"(will|would|should|must|can)\s+\w+",
            r"In\s+this\s+(example|case)",
        ]
        for pattern in prose_indicators:
            if re.search(pattern, answer_stripped, re.IGNORECASE | re.MULTILINE):
                return False
                
        lines = answer_stripped.split('\n')
        code_line_count = 0
        prose_line_count = 0
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue
            has_code_markers = any([
                line_stripped.startswith((' ', '\t')),
                re.search(r'\bdef\s+\w+', line_stripped),
                re.search(r'\bclass\s+\w+', line_stripped),
                re.search(r'\b(import|from|return|if|else|for|while|function|const|let|var)\b', line_stripped),
                re.search(r'[=;{}()\[\]]', line_stripped),
                line_stripped.startswith('#') and len(line_stripped) < 80,
                line_stripped.startswith('//') and len(line_stripped) < 80,
            ])
            has_prose_markers = (
                re.search(r'^[A-Z].*[.!?]$', line_stripped) and 
                len(line_stripped.split()) > 4 and
                not line_stripped.startswith(('#', '//'))
            )
            if has_code_markers:
                code_line_count += 1
            elif has_prose_markers:
                prose_line_count += 1
                
        if code_line_count == 0:
            return False
        if prose_line_count > 1:
            return False
        return True
    
    def _is_structural_answer(self, answer: str, chunk: str) -> bool:
        word_count = len(answer.split())
        if word_count < 5:
            return False
        if word_count > 200:
            return False
            
        chunk_words = set(re.findall(r'\b\w{4,}\b', chunk.lower()))
        answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
        specific_overlap = chunk_words & answer_words
        if len(specific_overlap) < 2:
            return False
            
        causal_density = sum(
            1 for keyword in ['because', 'therefore', 'thus', 'since', 'this causes']
            if keyword in answer.lower()
        )
        if causal_density > 6:
            return False
        return True
    
    def _has_tradeoff_reasoning(self, answer: str, question: str) -> bool:
        answer_lower = answer.lower()
        question_lower = question.lower()
        tradeoff_keywords = [
            'limitation', 'limited', 'constraint', 'drawback', 'disadvantage',
            'trade-off', 'tradeoff', 'compromise', 'cost', 'downside',
            'problem', 'issue', 'challenge', 'difficulty', 'slower',
            'expensive', 'inefficient', 'cannot', 'unable', 'fails',
            'at the expense', 'sacrifice', 'however', 'but',
        ]
        has_tradeoff = any(keyword in answer_lower for keyword in tradeoff_keywords)
        if not has_tradeoff:
            return False
            
        causal_keywords = [
            'because', 'since', 'due to', 'as a result', 'therefore',
            'this causes', 'leads to', 'results in', 'this means',
            'which means', 'making it', 'rendering it'
        ]
        has_reasoning = any(keyword in answer_lower for keyword in causal_keywords)
        word_count = len(answer.split())
        is_substantial = word_count >= 8
        return has_tradeoff and has_reasoning and is_substantial
    
    def _has_comparative_reasoning(self, answer: str, question: str, chunk: str) -> bool:
        answer_lower = answer.lower()
        question_lower = question.lower()
        comparative_keywords = [
            'compare', 'comparison', 'versus', 'vs', 'differ', 'difference',
            'similar', 'like', 'unlike', 'whereas', 'while', 'in contrast',
            'on the other hand', 'both', 'neither', 'either',
            'relationship', 'related', 'connect', 'link', 'between',
            'cause', 'effect', 'leads to', 'results in', 'affects',
            'more than', 'less than', 'faster than', 'slower than',
            'better than', 'worse than', 'instead of', 'rather than'
        ]
        has_comparative = any(keyword in answer_lower or keyword in question_lower 
                             for keyword in comparative_keywords)
        if not has_comparative:
            return False
            
        chunk_concepts = set(re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{4,}\b', chunk))
        answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
        concept_overlap = len([c for c in chunk_concepts if c.lower() in answer_words])
        if concept_overlap < 2:
            return False
            
        word_count = len(answer.split())
        if word_count < 8:
            return False
        return True

    def _validate_example_quality(self, example: Dict[str, Any], chunk: str, mode: DatasetMode) -> bool:
        if not all(k in example for k in ("instruction", "input", "output")):
            return False
            
        instruction = example["instruction"]
        input_context = example["input"]
        output = example["output"]
        
        if not isinstance(instruction, str) or not isinstance(input_context, str) or not isinstance(output, str):
            return False
            
        instruction = instruction.strip()
        input_context = input_context.strip()
        output = output.strip()
        
        if not instruction or not output:
            return False
            
        if self._is_meta_question(instruction):
            logger.debug(f"Validation rejected: meta question pattern matched: {instruction}")
            return False
            
        if self._is_generic_answer(output, chunk):
            logger.debug(f"Validation rejected: generic/ungrounded answer: {output}")
            return False
            
        if mode == DatasetMode.THEORY_QA:
            if not self._has_causal_reasoning(output):
                logger.debug(f"Validation rejected: THEORY_QA lacks causal reasoning (why/how) or is too short (<15 words): {output}")
                return False
        elif mode == DatasetMode.CODE_GEN:
            if not self._is_code_only(output):
                logger.debug(f"Validation rejected: CODE_GEN contains explanations/comments or markdown blocks: {output}")
                return False
        elif mode == DatasetMode.STRUCTURAL_QA:
            if not self._is_structural_answer(output, chunk):
                logger.debug(f"Validation rejected: STRUCTURAL_QA answer is not concise or lack grounding: {output}")
                return False
        elif mode == DatasetMode.TRADEOFFS_QA:
            if not self._has_tradeoff_reasoning(output, instruction):
                logger.debug(f"Validation rejected: TRADEOFFS_QA lacks tradeoff/limitation keywords or reasoning: {output}")
                return False
        elif mode == DatasetMode.COMPARATIVE_QA:
            if not self._has_comparative_reasoning(output, instruction, chunk):
                logger.debug(f"Validation rejected: COMPARATIVE_QA fails to compare/relate multiple concepts: {output}")
                return False
                
        return True

# ---------------------------------------------------------------------------
# Public API Wrapper & Singletons
# ---------------------------------------------------------------------------

class LLMClient:
    """Public interface wrapping LLMOrchestrator and ModelManager"""
    def __init__(self):
        self.config = PipelineConfig()
        self.model_manager = ModelManager(self.config)
        self.orchestrator = LLMOrchestrator(self.config, self.model_manager)
        
    async def generate_jsonl_for_chunks(self, chunks: List[str]) -> List[List[str]]:
        """Process list of chunks concurrently with DLQ failover"""
        return await self.orchestrator.generate_jsonl_for_chunks(chunks)
        
    async def generate_jsonl_from_chunk(self, chunk: str, **kwargs) -> List[str]:
        """Backward compatible single chunk processor"""
        results = await self.generate_jsonl_for_chunks([chunk])
        return results[0] if results else []

# Global LLM client instance - lazily initialized
_llm_client_instance = None

def get_llm_client() -> LLMClient:
    """Get or create the LLM client instance"""
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance

class LLMClientProxy:
    """Proxy to lazily initialize LLM client"""
    def __getattr__(self, name):
        return getattr(get_llm_client(), name)

# Singleton export
llm_client = LLMClientProxy()
