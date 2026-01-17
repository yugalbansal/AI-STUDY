"""
LLM client for generating JSONL training data
"""

import os
import httpx
import json
import re
import logging
import asyncio
import time
# from typing import List, Dict
from typing import List, Dict, Any
from collections import deque

logger = logging.getLogger(__name__)

class LLMClient:
    """Client for Cerebras API to generate JSONL training examples with round-robin key management"""
    
    def __init__(self):
        # Load multiple API keys (5 keys, each can handle 2 parallel requests = 10 total)
        self.api_keys = []
        for i in range(1, 6):  # Keys 1-5
            key = os.getenv(f"CEREBRAS_API_KEY_{i}")
            if key:
                self.api_keys.append(key)
        
        # Fall back to single key if multiple keys not configured
        if not self.api_keys:
            single_key = os.getenv("CEREBRAS_API_KEY")
            if single_key:
                self.api_keys = [single_key]
            else:
                raise ValueError("At least CEREBRAS_API_KEY or CEREBRAS_API_KEY_1 must be set")
        
        logger.info(f"Initialized with {len(self.api_keys)} API key(s)")
        
        # Round-robin queue for keys
        self.key_queue = deque(self.api_keys)
        self.key_lock = asyncio.Lock()
        
        # Track rate limit status per key: {key: timestamp_when_available}
        self.rate_limited_keys: Dict[str, float] = {}
        self.rate_limit_lock = asyncio.Lock()
        
        self.api_url = "https://api.cerebras.ai/v1/chat/completions"
        # Cerebras models (Jan 2026)
        self.primary_model = "llama-3.3-70b"
        self.fallback_models = [
            "gpt-oss-120b",
            "llama3.1-8b",
            "qwen-3-32b",
        ]
        
        # Log configuration for debugging
        logger.info(f"Cerebras API URL: {self.api_url}")
        logger.info(f"Primary model: {self.primary_model}")
        logger.info(f"Fallback models: {self.fallback_models}")
    
    async def generate_jsonl_from_chunk(self, chunk: str, retry_count: int = 3) -> List[str]:
        """
        Generate JSONL training examples from a text chunk.
        Uses retry logic with fallback models.
        
        Args:
            chunk: Text content to generate training data from
            retry_count: Number of retries per model
            
        Returns:
            List of valid JSONL strings
        """
        models = [self.primary_model] + self.fallback_models
        
        for model in models:
            for attempt in range(retry_count):
                try:
                    logger.info(f"Generating JSONL with {model} (attempt {attempt + 1})")
                    
                    response = await self._call_cerebras(chunk, model)
                    lines = self._parse_llm_output(response)
                    
                    if len(lines) > 0:
                        logger.info(f"Successfully generated {len(lines)} JSONL lines")
                        return lines
                    
                    logger.warning(f"No valid JSONL lines from {model}")
                    
                except httpx.TimeoutException:
                    logger.warning(f"Timeout on {model}, attempt {attempt + 1}")
                    if attempt < retry_count - 1:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:  # Rate limit
                        logger.warning(f"Rate limit hit, waiting 10s")
                        await asyncio.sleep(10)
                        continue
                    logger.error(f"HTTP error {e.response.status_code} from {model}: {e.response.text[:500]}")
                    break  # Try next model
                
                except Exception as e:
                    logger.error(f"Unexpected error with {model}: {type(e).__name__}: {e}", exc_info=True)
                    break  # Try next model
        
        # All attempts failed
        logger.error("All models and retries exhausted for this chunk")
        return []
    
    async def _get_available_key(self) -> str:
        """Get an available API key using round-robin, waiting if all keys are rate-limited"""
        max_wait_cycles = 5  # Maximum cycles to wait for a key
        
        for cycle in range(max_wait_cycles):
            async with self.key_lock:
                # Try each key in the queue
                for _ in range(len(self.key_queue)):
                    key = self.key_queue[0]
                    self.key_queue.rotate(-1)  # Move to back of queue
                    
                    # Check if this key is rate-limited
                    async with self.rate_limit_lock:
                        if key in self.rate_limited_keys:
                            if time.time() < self.rate_limited_keys[key]:
                                continue  # Still rate-limited, try next key
                            else:
                                # Rate limit expired, remove from tracking
                                del self.rate_limited_keys[key]
                    
                    return key
            
            # All keys are rate-limited, wait 2 seconds and try again
            logger.warning(f"All API keys rate-limited, waiting 2s (cycle {cycle + 1}/{max_wait_cycles})")
            await asyncio.sleep(2)
        
        # Fallback: return first key even if rate-limited
        async with self.key_lock:
            return self.key_queue[0]
    
    async def _mark_key_rate_limited(self, key: str):
        """Mark a key as rate-limited for 10 seconds"""
        async with self.rate_limit_lock:
            self.rate_limited_keys[key] = time.time() + 10  # Available again in 10 seconds
            logger.info(f"Key rate-limited, will retry after 10 seconds")
    
    async def _call_cerebras(self, chunk: str, model: str) -> str:
        """Call Cerebras API with round-robin key selection"""
        
        prompt = f"""You are a training data generator for AI tutoring systems. Given the following text, create 4 diverse question-answer pairs in JSONL format suitable for fine-tuning an LLM.

RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message should describe an AI tutor persona
- Questions should test understanding, application, and explanation
- Answers should be clear, educational, and concise
- Vary question types: factual, conceptual, how-to, why-based
- Each line must be complete and parseable JSON

TEXT:
{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown):
{{"messages": [{{"role": "system", "content": "You are an AI tutor."}}, {{"role": "user", "content": "What is...?"}}, {{"role": "assistant", "content": "The answer is..."}}]}}

Generate exactly 4 JSONL lines:"""

        # Get an available API key
        api_key = await self._get_available_key()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 2000,
                        "top_p": 1
                    }
                )
            except httpx.ConnectError as e:
                logger.error(f"Connection error to Cerebras API: {e}")
                raise
            except httpx.ReadTimeout as e:
                logger.error(f"Read timeout from Cerebras API: {e}")
                raise
            
            # Handle rate limit
            if response.status_code == 429:
                await self._mark_key_rate_limited(api_key)
            
            # Log error responses before raising
            if response.status_code != 200:
                logger.error(f"Cerebras API error {response.status_code}: {response.text[:500]}")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Validate response structure
            if "choices" not in data or not data["choices"]:
                logger.error(f"Invalid Cerebras response structure: {data}")
                raise ValueError("Invalid API response structure")
            
            return data["choices"][0]["message"]["content"]
    
    def _parse_llm_output(self, llm_response: str) -> List[str]:
        """
        Extract valid JSONL lines from LLM output.
        Handles cases where LLM adds markdown code blocks or extra text.
        """
        lines = []
        
        # Remove markdown code blocks if present
        cleaned = re.sub(r'```json\s*', '', llm_response)
        cleaned = re.sub(r'```', '', cleaned)
        
        # Split by newlines and validate each line
        for line in cleaned.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            
            try:
                # Validate JSON structure
                data = json.loads(line)
                
                # Validate messages array format
                if 'messages' not in data:
                    continue
                if not isinstance(data['messages'], list):
                    continue
                if len(data['messages']) < 2:
                    continue
                
                # Validate each message has role and content
                valid = True
                for msg in data['messages']:
                    if 'role' not in msg or 'content' not in msg:
                        valid = False
                        break
                    if msg['role'] not in ['system', 'user', 'assistant', 'function']:
                        valid = False
                        break
                
                if valid:
                    # Re-serialize to ensure clean JSONL format
                    lines.append(json.dumps(data, ensure_ascii=False))
                    
            except json.JSONDecodeError:
                continue  # Skip invalid JSON
        
        return lines

# Global LLM client instance - lazily initialized
_llm_client_instance = None

def get_llm_client():
    """Get or create the LLM client instance"""
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance

class LLMClientProxy:
    """Proxy to lazily initialize LLM client"""
    def __getattr__(self, name):
        return getattr(get_llm_client(), name)

llm_client = LLMClientProxy()
