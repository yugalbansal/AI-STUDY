"""
JSONL Dataset Pipeline with Token Bucket Rate Limiting, Smart Model Selection,
Low Concurrency Pacing, and Upstream 429 Retry-After Handling.
"""

import os
import sys
import json
import re
import time
import logging
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx
import openai
from openai import AsyncOpenAI

# Setup detailed logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("jsonl_pipeline")

# Load environment variables
load_dotenv()


# ---------------------------------------------------------------------------
# 1. Token Bucket Rate Limiter
# ---------------------------------------------------------------------------

class TokenBucketLimiter:
    """
    Manages rate limits in terms of Tokens Per Minute (TPM) using the Token Bucket algorithm.
    This prevents hitting upstream rate limit errors on free tiers.
    """
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity              # Max bucket capacity (e.g. 5,500 for 8B, 11,000 for 70B)
        self.tokens = float(capacity)
        self.refill_rate = refill_rate_per_sec  # Tokens regenerated per second (capacity / 60)
        self.updated_at = time.monotonic()
        self.lock = asyncio.Lock()

    def update_limits(self, capacity: int):
        """Dynamically update capacity and refill rate (e.g. when model selection shifts)."""
        self.capacity = capacity
        self.refill_rate = capacity / 60.0
        self.tokens = min(self.tokens, float(capacity))
        logger.debug(f"Limiter capacity updated to {capacity} (refill rate: {self.refill_rate:.1f}/s)")

    async def consume(self, amount: int) -> bool:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.updated_at
            # Refill tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.updated_at = now
            
            if self.tokens >= amount:
                self.tokens -= amount
                return True
            return False

    async def wait_for_tokens(self, amount: int):
        """Block execution until the bucket has enough tokens for the request."""
        while True:
            if await self.consume(amount):
                break
            # Calculate wait time needed to regenerate missing tokens
            needed = amount - self.tokens
            wait_time = needed / self.refill_rate
            sleep_duration = max(0.5, min(wait_time, 2.0))  # Poll every 0.5s to 2s
            await asyncio.sleep(sleep_duration)


# ---------------------------------------------------------------------------
# 2. Text Processor (Whitespace Cleaner & Chunker)
# ---------------------------------------------------------------------------

class TextProcessor:
    """Handles text cleaning and chunking prior to LLM processing."""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Removes excessive spaces, tabs, and duplicate newlines."""
        # Fix broken hyphenations
        text = re.sub(r'(\w+)-\r?\n\s*(\w+)', r'\1\2', text)
        # Collapse multiple spaces/tabs into a single space
        text = re.sub(r'[ \t]+', ' ', text)
        # Collapse 3 or more consecutive newlines to exactly 2 newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @classmethod
    def split_text(cls, content: str, chunk_size: int = 2500, chunk_overlap: int = 200) -> List[str]:
        """
        Splits document text recursively using paragraphs, lines, sentences, or characters
        to stay within the requested chunk_size.
        """
        if not content or not content.strip():
            return []
            
        cleaned = cls.clean_text(content)
        separators = ["\n\n", "\n", ". ", " ", ""]
        return cls._split_recursive(cleaned, separators, chunk_size, chunk_overlap)

    @classmethod
    def _split_recursive(cls, text: str, separators: List[str], chunk_size: int, chunk_overlap: int) -> List[str]:
        final_chunks = []
        separator = separators[-1]
        new_separators = []
        
        for i, sep in enumerate(separators):
            if sep == "":
                separator = sep
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break
                
        if separator != "":
            splits = text.split(separator)
        else:
            splits = list(text)
            
        good_splits = []
        for s in splits:
            if len(s) < chunk_size:
                good_splits.append(s)
            else:
                if good_splits:
                    merged = cls._merge_splits(good_splits, separator, chunk_size, chunk_overlap)
                    final_chunks.extend(merged)
                    good_splits = []
                recursive_chunks = cls._split_recursive(s, new_separators, chunk_size, chunk_overlap)
                final_chunks.extend(recursive_chunks)
                
        if good_splits:
            merged = cls._merge_splits(good_splits, separator, chunk_size, chunk_overlap)
            final_chunks.extend(merged)
            
        return final_chunks

    @staticmethod
    def _merge_splits(splits: List[str], separator: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        docs = []
        current_doc = []
        total = 0
        separator_len = len(separator)
        
        for d in splits:
            len_d = len(d)
            if total + len_d + (separator_len if current_doc else 0) > chunk_size:
                if total > 0:
                    docs.append(separator.join(current_doc))
                    while total > chunk_overlap or (total + len_d + (separator_len if current_doc else 0) > chunk_size and total > 0):
                        popped = current_doc.pop(0)
                        total -= len(popped) + (separator_len if current_doc else 0)
            current_doc.append(d)
            total += len_d + (separator_len if len(current_doc) > 1 else 0)
            
        if current_doc:
            docs.append(separator.join(current_doc))
        return docs


# ---------------------------------------------------------------------------
# 3. LLM API Key Client
# ---------------------------------------------------------------------------

class APIKeyClient:
    """Wraps an API key, its AsyncOpenAI client, Semaphore, and TokenBucketLimiter."""
    def __init__(self, provider_name: str, api_key: str, base_url: str):
        self.provider_name = provider_name
        self.api_key = api_key
        self.base_url = base_url
        self.semaphore = asyncio.Semaphore(2)  # Low concurrency: max 2 requests per key
        self.cooldown_until = 0.0
        self.rate_limit_count = 0
        
        # Initial safe capacity
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


# ---------------------------------------------------------------------------
# 4. LLM Orchestrator
# ---------------------------------------------------------------------------

class LLMOrchestrator:
    """Manages dynamic model selection, key pooling, token pacing, and error handling."""
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
            return bool(k and not any(p in k.lower() for p in ["your-", "placeholder", "api-key"]))
            
        self.groq_keys = [k for k in self.groq_keys if is_valid_key(k)]
        self.openrouter_keys = [k for k in self.openrouter_keys if is_valid_key(k)]
        
        self.groq_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        self.openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        
        # Initialize clients
        self.clients: List[APIKeyClient] = []
        for key in self.groq_keys:
            self.clients.append(APIKeyClient("groq", key, self.groq_base_url))
        for key in self.openrouter_keys:
            self.clients.append(APIKeyClient("openrouter", key, self.openrouter_base_url))
            
        self._last_client_index = -1
        
        # Default model cache
        self.model_cache = {
            "groq": "llama-3.3-70b-versatile",
            "openrouter": "meta-llama/llama-3.3-70b-instruct:free"
        }
        
    async def get_next_available_client(self, preferred_provider: Optional[str] = None) -> APIKeyClient:
        if not self.clients:
            raise ValueError("No active API clients configured")
            
        while True:
            now = time.time()
            # 1. Match preferred provider first
            if preferred_provider:
                matched = [c for c in self.clients if c.provider_name == preferred_provider]
                for c in matched:
                    if c.cooldown_until <= now:
                        return c
                        
            # 2. Round robin across all clients
            for i in range(len(self.clients)):
                idx = (self._last_client_index + i + 1) % len(self.clients)
                client = self.clients[idx]
                if client.cooldown_until <= now:
                    self._last_client_index = idx
                    return client
                    
            # 3. Sleep if all clients are in cooldown
            min_cooldown = min((c.cooldown_until - now for c in self.clients), default=1.0)
            if min_cooldown > 0:
                logger.warning(f"All clients in cooldown. Throttling for {min_cooldown:.2f} seconds...")
                await asyncio.sleep(min_cooldown)
            else:
                await asyncio.sleep(1.0)

    async def get_best_model(self, provider: str) -> str:
        """Retrieve the best model. Prefers llama-3.3-70b-versatile on Groq."""
        if provider == "groq":
            # Attempt to query live models to prioritize llama-3.3-70b-versatile
            try:
                headers = {"Authorization": f"Bearer {self.groq_keys[0]}"}
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    res = await http_client.get(f"{self.groq_base_url}/models", headers=headers)
                if res.status_code == 200:
                    models = [m["id"] for m in res.json().get("data", [])]
                    # Filter audio/whisper models
                    models = [m for m in models if not any(x in m.lower() for x in ("whisper", "audio", "distil"))]
                    # Prioritize llama-3.3-70b-versatile
                    for m in models:
                        if "llama-3.3-70b-versatile" in m.lower():
                            self.model_cache["groq"] = m
                            return m
                    if models:
                        self.model_cache["groq"] = models[0]
            except Exception as e:
                logger.debug(f"Live Groq model fetch failed: {e}. Using fallback.")
            return self.model_cache["groq"]
        else:
            # OpenRouter default free model
            return self.model_cache["openrouter"]

    async def process_chunk(self, chunk: str, preferred_provider: Optional[str] = None, num_examples: int = 4) -> List[str]:
        max_attempts = 5
        stricter_prompt = False
        last_provider_used = "groq"
        
        for attempt in range(max_attempts):
            client = None
            try:
                client = await self.get_next_available_client(preferred_provider)
                last_provider_used = client.provider_name
            except Exception as e:
                raise RuntimeError(f"Client lookup failed: {e}")
                
            async with client.semaphore:
                try:
                    model = await self.get_best_model(client.provider_name)
                    
                    # Dynamically update token limits capacity based on selected model
                    if client.provider_name == "groq":
                        if "llama-3.3-70b" in model.lower():
                            client.limiter.update_limits(11000)
                        elif "llama-3.1-8b" in model.lower():
                            client.limiter.update_limits(5500)
                        else:
                            client.limiter.update_limits(11000)
                    else:
                        client.limiter.update_limits(10000)
                        
                    # Create prompts
                    system_prompt = (
                        "You are an AI tutor specializing in conceptual understanding. "
                        "You generate high-quality question-answer examples grounded in the text. "
                        "Demonstrate causal reasoning (explaining why and how concepts relate)."
                    )
                    if stricter_prompt:
                        system_prompt += (
                            "\n\nCRITICAL REQUIRED FORMAT: You must return a single JSON object matching the requested schema. "
                            "Do not include any explanation, prose comments, or markdown code block formatting (e.g. ```json). "
                            "Make sure your response parses exactly with json.loads() and has the 'examples' list key."
                        )
                        
                    user_prompt = f"""Generate up to {num_examples} high-quality question-answer examples in JSON format based on the text below.

TEXT:
{chunk}

JSON OUTPUT SCHEMA:
{{
  "examples": [
    {{
      "instruction": "Explain why/how...",
      "input": "Context snippet from the text",
      "output": "Detailed grounded answer demonstrating causal reasoning."
    }}
  ]
}}
"""
                    # Pacing request: Estimate token count (chars / 4) + 500 estimated output tokens
                    prompt_len = len(system_prompt) + len(user_prompt)
                    estimated_tokens = int(prompt_len / 4) + 500
                    
                    logger.info(f"[{client.provider_name}] Key {client.api_key[:8]}... - Waiting for {estimated_tokens} tokens (current bucket: {client.limiter.tokens:.1f})")
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
                        
                    # Successfully completed request - reset rate limit count
                    client.rate_limit_count = 0
                    
                    try:
                        data = json.loads(content)
                        examples = data.get("examples", [])
                        if not isinstance(examples, list) or not examples:
                            if all(k in data for k in ("instruction", "input", "output")):
                                examples = [data]
                            else:
                                raise ValueError("Missing 'examples' array in response JSON schema")
                                
                        valid_lines = []
                        for ex in examples:
                            # Basic validation checks
                            if all(k in ex and isinstance(ex[k], str) and ex[k].strip() for k in ("instruction", "input", "output")):
                                valid_lines.append(json.dumps(ex, ensure_ascii=False))
                                
                        if not valid_lines:
                            logger.warning(f"No examples passed quality checks on attempt {attempt + 1}")
                            stricter_prompt = True
                            continue
                            
                        return valid_lines
                        
                    except (json.JSONDecodeError, ValueError) as json_err:
                        logger.warning(f"JSON validation mismatch on attempt {attempt + 1}: {json_err}")
                        stricter_prompt = True
                        if attempt == max_attempts - 1:
                            raise json_err
                        continue
                        
                except openai.RateLimitError as e:
                    client.rate_limit_count += 1
                    
                    # Parse OpenRouter metadata.retry_after_seconds if present
                    retry_after = None
                    if client.provider_name == "openrouter" and hasattr(e, "response") and e.response:
                        try:
                            err_data = e.response.json()
                            retry_after = err_data.get("error", {}).get("metadata", {}).get("retry_after_seconds")
                        except Exception:
                            pass
                            
                    if retry_after is not None:
                        logger.warning(f"429 Rate Limit on OpenRouter. Upstream retry command: sleep for {retry_after}s.")
                        await asyncio.sleep(float(retry_after))
                    else:
                        backoff = 15 if client.provider_name == "groq" else 10
                        logger.warning(f"429 Rate Limit on {client.provider_name} (key: {client.api_key[:8]}...). Retrying in {backoff}s. Error: {e}")
                        await asyncio.sleep(backoff)
                        
                    if client.rate_limit_count >= 3:
                        logger.warning(f"Threshold exceeded. Putting key {client.api_key[:8]} on 60s cooldown.")
                        client.cooldown_until = time.time() + 60.0
                        client.rate_limit_count = 0
                    continue
                    
                except Exception as e:
                    logger.error(f"Error on {client.provider_name} (attempt {attempt + 1}): {e}")
                    if attempt == max_attempts - 1:
                        raise e
                    await asyncio.sleep(2)
                    continue
                    
        raise RuntimeError("All retry attempts exhausted for chunk")

    async def generate_jsonl(self, chunks: List[str]) -> List[str]:
        if not self.clients:
            logger.error("No active API clients found")
            return []
            
        results: List[List[str]] = [[] for _ in chunks]
        queue = asyncio.Queue()
        for idx, chunk in enumerate(chunks):
            queue.put_nowait((idx, chunk))
            
        # Dynamically set target number of examples per chunk to ensure we get a decent size dataset
        total_chunks = len(chunks)
        if total_chunks == 1:
            examples_per_chunk = 12
        elif total_chunks == 2:
            examples_per_chunk = 7
        else:
            examples_per_chunk = 4
            
        # Create workers (1 worker per key, max 18 workers total)
        num_workers = min(18, len(chunks))
        
        async def worker():
            while True:
                try:
                    idx, chunk = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                try:
                    lines = await self.process_chunk(chunk, num_examples=examples_per_chunk)
                    results[idx] = lines
                except Exception as e:
                    logger.error(f"Permanently failed to process chunk {idx}: {e}")
                finally:
                    queue.task_done()
                    
        workers = [asyncio.create_task(worker()) for _ in range(num_workers)]
        await asyncio.gather(*workers)
        
        # Flatten lines
        flat_results = []
        for sublist in results:
            flat_results.extend(sublist)
        return flat_results


# ---------------------------------------------------------------------------
# 5. Main execution entry point
# ---------------------------------------------------------------------------

async def main():
    if len(sys.argv) < 3:
        print("Usage: python jsonl_pipeline.py <input_text_file> <output_jsonl_file>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} does not exist.")
        sys.exit(1)
        
    # Read text file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if not content.strip():
        print("Error: Input file is empty.")
        sys.exit(1)
        
    # Split text into chunks
    print(f"Splitting content into chunks (max 2500 chars, 200 overlap)...")
    chunks = TextProcessor.split_text(content, chunk_size=2500, chunk_overlap=200)
    print(f"Successfully generated {len(chunks)} chunks.")
    
    # Initialize orchestrator
    print("Initializing LLM Orchestrator...")
    orchestrator = LLMOrchestrator()
    if not orchestrator.clients:
        print("Error: No valid API keys found in environment. Please set GROQ_API_KEY_1..3 or OPENROUTER_API_KEY_1..3 in .env")
        sys.exit(1)
        
    # Generate JSONL lines
    print("Generating JSONL dataset (this will take some time due to rate limiting pacing)...")
    jsonl_lines = await orchestrator.generate_jsonl(chunks)
    
    # Validate result count
    if not jsonl_lines:
        print("Failed to generate any valid Q&A examples.")
        sys.exit(1)
        
    # Write to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in jsonl_lines:
            f.write(line + '\n')
            
    print(f"Completed successfully! Generated {len(jsonl_lines)} JSONL examples saved to: {output_file}")


if __name__ == "__main__":
    # Run async main
    asyncio.run(main())
