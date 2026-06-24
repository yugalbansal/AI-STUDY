"""
LLM client for generating JSONL training data with strict TPM rate limiting,
dynamic free-model discovery, and graceful upstream 429 handling.

ARCHITECTURE
------------
TokenBucketLimiter
    Per-API-key token bucket that tracks Tokens-Per-Minute (TPM). Crucially it
    is *reconciled* against the REAL consumption reported in every response
    (`response.usage.total_tokens`) and *recalibrated* from a Groq 429 body
    (`Limit N, Used M`). It pre-reserves an estimate before firing and never
    fires a request it cannot afford within the TPM window, so we avoid 429s
    instead of catching them.

ModelManager
    Fetches `/v1/models` at runtime for both providers. Groq models are sorted
    strictly by TPM (70B = 12,000 TPM ranks above 8B = 6,000 TPM). OpenRouter
    models are filtered to `pricing.prompt == "0"` AND `pricing.completion == "0"`
    and sorted by context-window size. No model ID is hardcoded as a selection
    preference; a tiny last-resort default exists only for total network failure.

LLMOrchestrator
    Pool of APIKeyClient objects (3 Groq + 3 OpenRouter). One worker per key
    (`Semaphore(1)` per key) serializes per-key traffic so the bucket paces each
    start. Robust 429 handling: Groq recalibrates the bucket from the error body
    and sleeps the parsed "try again in Xs"; OpenRouter sleeps the exact
    `retry_after_seconds` (or `Retry-After` header) — no blind exponential
    backoff. Deprecated models (404) are invalidated and refetched on retry.

Public surface (unchanged for FastAPI consumers):
    llm_client.generate_jsonl_for_chunks(chunks) -> List[List[str]]
"""

import os
import re
import json
import time
import logging
import asyncio
from enum import Enum
from typing import List, Dict, Any, Optional, NamedTuple
from collections import deque

import httpx
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dataset Mode Definitions (preserved from original)
# ---------------------------------------------------------------------------

class DatasetMode(str, Enum):
    """Dataset generation modes with distinct quality requirements"""
    THEORY_QA = "theory_qa"            # Document-grounded conceptual Q&A with causal reasoning
    CODE_GEN = "code_gen"              # Programming problems with code-only answers
    STRUCTURAL_QA = "structural_qa"    # Definitions, properties, components, structural details
    TRADEOFFS_QA = "tradeoffs_qa"      # Limitations, trade-offs, constraints, design considerations
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
# 1. Token Bucket Rate Limiter (TPM-aware, reconciled)
# ---------------------------------------------------------------------------

class TokenBucketLimiter:
    """
    Per-API-key token bucket tracking Tokens-Per-Minute (TPM).

    Design notes
    ------------
    * `capacity` is the EFFECTIVE capacity, i.e. `raw_limit * SAFETY_FACTOR`.
      The safety factor (default 0.9) leaves headroom for token-estimation error
      so we stay under the hard upstream limit.
    * `consume(amount)` reserves tokens atomically under a lock; if insufficient
      it returns False WITHOUT reserving (no negative borrowing on reserve).
    * `wait_for_tokens(amount)` sleeps for the PRECISE deficit/refill time
      (capped at 30s for cancellation responsiveness) rather than busy-polling.
    * `reconcile(reserved, actual)` corrects the bucket using the REAL token
      count from `response.usage.total_tokens`. If we under-reserved we drain the
      deficit (the bucket may go into "debt", forcing the next request to wait
      longer); if we over-reserved we refund the surplus (capped at capacity).
    * `recalibrate(used, limit)` hard-syncs the bucket to upstream-reported
      accounting parsed from a Groq 429 body (`Limit N, Used M`).
    """

    # Fraction of the raw upstream TPM we actually allow ourselves to use.
    # 0.9 => we target 90% of the limit, leaving 10% headroom for estimation
    # error so a slightly-off estimate cannot tip us over into a 429.
    SAFETY_FACTOR = 0.9

    def __init__(self, raw_capacity: int, safety_factor: float = SAFETY_FACTOR):
        self.safety_factor = safety_factor
        self.capacity = int(raw_capacity * self.safety_factor)
        self.refill_rate = self.capacity / 60.0          # tokens regenerated per second
        self.tokens = float(self.capacity)
        self.updated_at = time.monotonic()
        self.lock = asyncio.Lock()
        # Rolling 60s history of actual consumption for observability / tuning.
        self._history: deque = deque()  # (monotonic_ts, tokens_actually_consumed)

    def update_limits(self, raw_capacity: int):
        """Dynamically update capacity/refill when model selection shifts TPM."""
        self.capacity = int(raw_capacity * self.safety_factor)
        self.refill_rate = self.capacity / 60.0
        self.tokens = min(self.tokens, float(self.capacity))
        logger.debug(f"Limiter capacity -> {self.capacity} TPM (refill {self.refill_rate:.1f}/s)")

    def _refill_locked(self):
        """Refill tokens based on elapsed wall-clock time. Caller holds the lock."""
        now = time.monotonic()
        elapsed = now - self.updated_at
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.updated_at = now

    async def consume(self, amount: int) -> bool:
        """Atomically reserve `amount` tokens. Returns True if afforded."""
        async with self.lock:
            self._refill_locked()
            if self.tokens >= amount:
                self.tokens -= amount
                return True
            return False

    async def wait_for_tokens(self, amount: int):
        """Block until the bucket can afford `amount`, reserving it on exit."""
        while True:
            async with self.lock:
                self._refill_locked()
                if self.tokens >= amount:
                    self.tokens -= amount
                    return
                deficit = amount - self.tokens
            # Precise sleep: time for the bucket to regenerate the deficit.
            # Capped at 30s so we stay responsive to cooldown/cancellation changes.
            sleep_for = min(deficit / self.refill_rate + 0.1, 30.0)
            logger.info(
                f"   [limiter] need {amount} tok, have {self.tokens:.0f}, "
                f"deficit {deficit:.0f} -> sleeping {sleep_for:.1f}s"
            )
            await asyncio.sleep(sleep_for)

    async def reconcile(self, reserved: int, actual: int):
        """Correct the bucket using REAL upstream consumption.

        Called after every successful response with response.usage.total_tokens.
        - actual > reserved: we under-paid -> drain the deficit (may go negative,
          i.e. "debt"; the next request then waits for the refill to clear it).
        - actual < reserved: we over-paid -> refund the surplus (capped).
        """
        async with self.lock:
            self._refill_locked()
            delta = actual - reserved
            if delta > 0:
                self.tokens -= delta              # into debt if necessary
            elif delta < 0:
                self.tokens = min(self.capacity, self.tokens + (-delta))
            # Record real consumption for the 60s rolling window.
            self._history.append((time.monotonic(), actual))
        self._prune_history()

    async def recalibrate(self, used: int, limit: int):
        """Hard-sync the bucket to upstream-reported accounting (Groq 429 body).

        Groq's 429 body reports `Limit N` and `Used M`. We set the effective
        capacity from `limit` and the current token level to `capacity - used`,
        so the next reservation waits exactly as long as the upstream requires.
        """
        async with self.lock:
            if limit and limit > 0:
                self.capacity = int(limit * self.safety_factor)
                self.refill_rate = self.capacity / 60.0
            self.tokens = max(0.0, self.capacity - used)
            self.updated_at = time.monotonic()
            logger.warning(
                f"   [limiter] RECALIBRATED from upstream -> "
                f"limit={limit} used={used} capacity={self.capacity} tokens={self.tokens:.0f}"
            )

    def _prune_history(self):
        """Drop consumption records older than 60s (rolling TPM window)."""
        cutoff = time.monotonic() - 60.0
        while self._history and self._history[0][0] < cutoff:
            self._history.popleft()

    def rolling_tpm(self) -> int:
        """Actual tokens consumed in the last 60s (observability)."""
        self._prune_history()
        return int(sum(t for _, t in self._history))


# ---------------------------------------------------------------------------
# 2. Dynamic Model Discovery & Selection
# ---------------------------------------------------------------------------

class ModelInfo(NamedTuple):
    """A selected model plus its TPM limit (for sizing the per-key bucket)."""
    id: str
    tpm: int


# Groq free-tier TPM limits, derived from the model ID. These are properties of
# the model/tier (NOT hardcoded selection preferences): Groq's /v1/models does
# not expose TPM, so we map it from the model name. Update as Groq changes tiers.
_GROQ_TPM_RULES = [
    (re.compile(r"llama-3\.3-70b"), 12000),   # llama-3.3-70b-versatile -> 12,000 TPM
    (re.compile(r"llama-3\.1-8b"), 6000),     # llama-3.1-8b-instant   ->  6,000 TPM
    (re.compile(r"llama-3\.1-70b"), 6000),
    (re.compile(r"llama3-70b"), 6000),
    (re.compile(r"gemma2-9b"), 5000),
    (re.compile(r"mixtral"), 5000),
]
DEFAULT_GROQ_TPM = 6000
DEFAULT_OPENROUTER_TPM = 8000   # OpenRouter free pool has no published per-minute cap; conservative.


def groq_tpm_for(model_id: str) -> int:
    """Derive the Groq free-tier TPM limit from a model ID."""
    mid = model_id.lower()
    for pattern, tpm in _GROQ_TPM_RULES:
        if pattern.search(mid):
            return tpm
    return DEFAULT_GROQ_TPM


class ModelManager:
    """Discovers, filters, and caches free models from providers at runtime.

    Selection rules (per the refactor spec):
      * Groq      -> sort strictly by TPM (higher first), then context_window.
                     This guarantees llama-3.3-70b-versatile (12k) ranks above
                     llama-3.1-8b-instant (6k).
      * OpenRouter-> keep only models where pricing.prompt == "0" AND
                     pricing.completion == "0" (strictly $0.00), then sort by
                     context_length (larger first), with a family tiebreaker.
    """

    # Cache TTL for the /v1/models listing.
    CACHE_TTL = 3600.0

    def __init__(self, config: "PipelineConfig"):
        self.config = config
        self.cached_models: Dict[str, List[ModelInfo]] = {"groq": [], "openrouter": []}
        self.last_fetch_time: Dict[str, float] = {"groq": 0.0, "openrouter": 0.0}

    # -- last-resort defaults (network-failure ONLY, not selection preferences) --
    @staticmethod
    def _network_failure_defaults(provider: str) -> List[ModelInfo]:
        """Used only when /v1/models is completely unreachable."""
        if provider == "groq":
            return [ModelInfo("llama-3.3-70b-versatile", 12000)]
        return [ModelInfo("meta-llama/llama-3.3-70b-instruct:free", DEFAULT_OPENROUTER_TPM)]

    async def get_best_model(self, provider: str) -> ModelInfo:
        """Return the highest-ranked available model for `provider`."""
        now = time.time()
        if not self.cached_models[provider] or (now - self.last_fetch_time[provider] > self.CACHE_TTL):
            try:
                await self.fetch_models(provider)
            except Exception as e:
                logger.error(f"Failed to fetch models for {provider}: {e}. Using network-failure default.")
                if not self.cached_models[provider]:
                    self.cached_models[provider] = self._network_failure_defaults(provider)

        if not self.cached_models[provider]:
            self.cached_models[provider] = self._network_failure_defaults(provider)

        return self.cached_models[provider][0]

    async def invalidate_model(self, provider: str, model_id: str):
        """Remove a deprecated/404 model and refetch if the list is now empty."""
        logger.warning(f"Invalidating model {model_id} on {provider}")
        before = len(self.cached_models[provider])
        self.cached_models[provider] = [m for m in self.cached_models[provider] if m.id != model_id]
        if len(self.cached_models[provider]) < before:
            logger.info(f"Model {model_id} removed; {len(self.cached_models[provider])} models remain for {provider}")
        if not self.cached_models[provider]:
            try:
                await self.fetch_models(provider)
            except Exception:
                self.cached_models[provider] = self._network_failure_defaults(provider)
            # Ensure the bad model is gone even after a fresh fetch.
            self.cached_models[provider] = [m for m in self.cached_models[provider] if m.id != model_id]

    async def fetch_models(self, provider: str):
        """Fetch and rank models from /v1/models. Raises on HTTP failure."""
        if provider == "groq":
            await self._fetch_groq()
        elif provider == "openrouter":
            await self._fetch_openrouter()

    async def _fetch_groq(self):
        keys = self.config.groq_keys
        if not keys:
            raise ValueError("No Groq keys configured")
        headers = {"Authorization": f"Bearer {keys[0]}"}
        url = f"{self.config.groq_base_url}/models"

        async with httpx.AsyncClient(timeout=10.0) as http_client:
            res = await http_client.get(url, headers=headers)
        res.raise_for_status()
        data = res.json().get("data", [])

        # Exclude non-chat (whisper/audio/distil) models.
        filtered = []
        for m in data:
            mid = m.get("id", "")
            if any(x in mid.lower() for x in ("whisper", "audio", "distil")):
                continue
            filtered.append(m)

        # Rank strictly by TPM (higher first), then context window.
        # This puts llama-3.3-70b-versatile (12k) above llama-3.1-8b-instant (6k).
        ranked: List[ModelInfo] = []
        for m in filtered:
            mid = m.get("id", "")
            tpm = groq_tpm_for(mid)
            ranked.append(ModelInfo(mid, tpm))
        ranked.sort(key=lambda mi: (mi.tpm, m_context(filtered, mi.id)), reverse=True)

        self.cached_models["groq"] = ranked
        self.last_fetch_time["groq"] = time.time()
        if ranked:
            logger.info(
                f"Groq models (dynamic): "
                + ", ".join(f"{m.id}({m.tpm} TPM)" for m in ranked[:5])
            )

    async def _fetch_openrouter(self):
        keys = self.config.openrouter_keys
        headers = {}
        if keys:
            headers["Authorization"] = f"Bearer {keys[0]}"
        url = f"{self.config.openrouter_base_url}/models"

        async with httpx.AsyncClient(timeout=15.0) as http_client:
            res = await http_client.get(url, headers=headers)
        res.raise_for_status()
        data = res.json().get("data", [])

        # STRICT $0.00 filter: prompt AND completion pricing must be exactly 0.
        free_models = []
        for m in data:
            pricing = m.get("pricing", {}) or {}
            try:
                prompt_p = float(pricing.get("prompt", 1.0))
                completion_p = float(pricing.get("completion", 1.0))
            except (TypeError, ValueError):
                continue
            if prompt_p == 0.0 and completion_p == 0.0:
                free_models.append(m)

        # Exclude non-text modalities (image/audio/embedding-only) where detectable.
        text_models = []
        for m in free_models:
            arch = m.get("architecture", {}) or {}
            in_mod = str(arch.get("input_modality", "")).lower()
            out_mod = str(arch.get("output_modality", "")).lower()
            mid = m.get("id", "").lower()
            # Keep anything text-capable; drop obvious non-text (image/audio/embed).
            if any(x in mid for x in ("embed", "whisper", "tts", "image")):
                continue
            if in_mod and "text" not in in_mod and "any" not in in_mod:
                continue
            if out_mod and "text" not in out_mod and "any" not in out_mod:
                continue
            text_models.append(m)

        # Family tiebreaker (same priority weight for all, just to order ties).
        def family_score(mid: str) -> int:
            mid_l = mid.lower()
            if "llama-3.3" in mid_l:
                return 40
            if "llama-3.1" in mid_l:
                return 30
            if "qwen" in mid_l:
                return 20
            if "gemma" in mid_l:
                return 10
            return 0

        # Primary sort: larger context window first; tiebreak by family.
        text_models.sort(
            key=lambda m: (m.get("context_length", 0), family_score(m.get("id", ""))),
            reverse=True,
        )

        ranked = [ModelInfo(m.get("id", ""), DEFAULT_OPENROUTER_TPM) for m in text_models]
        self.cached_models["openrouter"] = ranked
        self.last_fetch_time["openrouter"] = time.time()
        if ranked:
            logger.info(
                f"OpenRouter FREE models (dynamic, $0.00): "
                + ", ".join(f"{m.id}({next((mm.get('context_length',0) for mm in text_models if mm.get('id')==m.id),0)} ctx)" for m in ranked[:5])
            )


def m_context(model_list: List[Dict[str, Any]], model_id: str) -> int:
    """Helper: look up context_window for a Groq model id (0 if absent)."""
    for m in model_list:
        if m.get("id") == model_id:
            return int(m.get("context_window", 0) or 0)
    return 0


# ---------------------------------------------------------------------------
# 3. Pipeline Configuration & Key Pooling
# ---------------------------------------------------------------------------

class PipelineConfig:
    """Holds base URLs and active API keys for Groq and OpenRouter."""
    def __init__(self):
        self.groq_keys = [
            os.getenv("GROQ_API_KEY_1", os.getenv("GROQ_API_KEY", "")),
            os.getenv("GROQ_API_KEY_2", ""),
            os.getenv("GROQ_API_KEY_3", ""),
        ]
        self.openrouter_keys = [
            os.getenv("OPENROUTER_API_KEY_1", os.getenv("OPENROUTER_API_KEY", "")),
            os.getenv("OPENROUTER_API_KEY_2", ""),
            os.getenv("OPENROUTER_API_KEY_3", ""),
        ]

        def is_valid_key(k: str) -> bool:
            k = (k or "").strip()
            if not k:
                return False
            lower_k = k.lower()
            placeholders = ["your-", "placeholder", "api-key-", "api_key_"]
            if any(p in lower_k for p in placeholders):
                return False
            return True

        self.groq_keys = [k.strip() for k in self.groq_keys if is_valid_key(k)]
        self.openrouter_keys = [k.strip() for k in self.openrouter_keys if is_valid_key(k)]

        self.groq_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        self.openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")

        logger.info(f"Loaded config: Groq keys: {len(self.groq_keys)}, OpenRouter keys: {len(self.openrouter_keys)}")


# ---------------------------------------------------------------------------
# 4. Per-Key API Client
# ---------------------------------------------------------------------------

# Free tiers have low TPM (6k-12k). Serializing per key (1 concurrent) means the
# token bucket paces each request start cleanly, preventing burst-on-refill. Once
# estimates are trusted you may raise this to 2 for more throughput.
MAX_CONCURRENT_PER_KEY = 1


class APIKeyClient:
    """Wraps one API key, its AsyncOpenAI client, semaphore, and TokenBucketLimiter."""
    def __init__(self, provider_name: str, api_key: str, base_url: str):
        self.provider_name = provider_name
        self.api_key = api_key
        self.base_url = base_url
        # Serialize per-key traffic so the bucket paces each start (no bursts).
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_PER_KEY)
        self.cooldown_until = 0.0
        self.rate_limit_count = 0

        # Conservative initial capacity; refined to the real TPM as soon as the
        # first model is selected for this key.
        raw_cap = DEFAULT_GROQ_TPM if provider_name == "groq" else DEFAULT_OPENROUTER_TPM
        self.limiter = TokenBucketLimiter(raw_capacity=raw_cap)

        if provider_name == "openrouter":
            self.openai_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                default_headers={
                    "HTTP-Referer": "https://vectormind.site",
                    "X-Title": "VectorMind",
                },
            )
        else:
            self.openai_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )


class ChunkProcessingException(Exception):
    """Raised when a chunk fails after all retries."""
    def __init__(self, message: str, last_provider: str):
        super().__init__(message)
        self.last_provider = last_provider


# ---------------------------------------------------------------------------
# 5. 429 Error Parsing Helpers
# ---------------------------------------------------------------------------

def parse_groq_429(message: str) -> Dict[str, Optional[float]]:
    """Extract retry_after / used / limit from a Groq 429 error message.

    Example body text:
        Rate limit reached for model 'llama-3.1-8b-instant' ... on tokens per
        minute (TPM): Limit 6000, Used 5960, Requested 1295. Please try again
        in 12.3s
    """
    out: Dict[str, Optional[float]] = {"retry_after": None, "used": None, "limit": None}
    if not message:
        return out
    m = re.search(r"try again in\s+(\d+(?:\.\d+)?)\s*s", message, re.IGNORECASE)
    if m:
        out["retry_after"] = float(m.group(1))
    m = re.search(r"Used\s+(\d+)", message, re.IGNORECASE)
    if m:
        out["used"] = float(m.group(1))
    m = re.search(r"Limit\s+(\d+)", message, re.IGNORECASE)
    if m:
        out["limit"] = float(m.group(1))
    return out


def parse_openrouter_429(exc: openai.RateLimitError) -> Optional[float]:
    """Extract retry_after_seconds from an OpenRouter 429.

    Tries, in order:
      1. error.metadata.retry_after_seconds (JSON body)
      2. top-level `retry_after_seconds` / `retry_after`
      3. HTTP `Retry-After` header (seconds or HTTP-date)
    Returns seconds (float) or None.
    """
    resp = getattr(exc, "response", None)
    if resp is None:
        return None

    # 1 & 2: JSON body. Read via .text (the stream may already be consumed).
    try:
        body = json.loads(resp.text)
        err = body.get("error", {}) if isinstance(body, dict) else {}
        meta = err.get("metadata", {}) or {}
        ra = meta.get("retry_after_seconds") or err.get("retry_after_seconds") or body.get("retry_after")
        if ra is not None:
            return float(ra)
    except Exception:
        pass

    # 3: Retry-After header.
    try:
        ra_header = resp.headers.get("Retry-After") or resp.headers.get("retry-after")
        if ra_header:
            return float(ra_header)
    except Exception:
        pass

    return None


# ---------------------------------------------------------------------------
# 6. LLM Orchestrator
# ---------------------------------------------------------------------------

class LLMOrchestrator:
    """Manages the key pool, routes chunks, paces TPM, retries, and runs the DLQ."""

    # Output token budget per generated example (instruction+input+output ~350 tok).
    TOKENS_PER_EXAMPLE = 350
    # Hard cap on max_tokens sent to the API (bounds response size for the bucket).
    MAX_OUTPUT_TOKENS_CAP = 8192
    # When a Groq 429 omits a retry hint, cool the key this long (seconds).
    GROQ_DEFAULT_COOLDOWN = 60.0

    def __init__(self, config: PipelineConfig, model_manager: ModelManager):
        self.config = config
        self.model_manager = model_manager
        self.clients: List[APIKeyClient] = []
        self._last_client_index = -1

        for key in config.groq_keys:
            self.clients.append(APIKeyClient("groq", key, config.groq_base_url))
        for key in config.openrouter_keys:
            self.clients.append(APIKeyClient("openrouter", key, config.openrouter_base_url))

        if not self.clients:
            logger.error("NO ACTIVE LLM API KEYS CONFIGURED (3 Groq, 3 OpenRouter). Pipeline cannot process tasks!")

    # -- client selection --------------------------------------------------

    async def get_next_available_client(self, preferred_provider: Optional[str] = None) -> APIKeyClient:
        """Round-robin an available (non-cooled-down) client, preferring a provider."""
        if not self.clients:
            raise ValueError("No active API clients registered in orchestrator")

        while True:
            now = time.time()

            # 1. Preferred-provider clients first.
            if preferred_provider:
                matched = [c for c in self.clients if c.provider_name == preferred_provider]
                for c in matched:
                    if c.cooldown_until <= now:
                        return c

            # 2. Round-robin across all clients.
            for i in range(len(self.clients)):
                idx = (self._last_client_index + i + 1) % len(self.clients)
                client = self.clients[idx]
                if client.cooldown_until <= now:
                    self._last_client_index = idx
                    return client

            # 3. All in cooldown -> sleep until the soonest one frees up.
            min_cooldown = min((c.cooldown_until - now for c in self.clients), default=1.0)
            sleep_for = max(0.5, min_cooldown)
            logger.warning(f"All clients in cooldown. Throttling for {sleep_for:.2f}s...")
            await asyncio.sleep(sleep_for)

    # -- token estimation --------------------------------------------------

    def _estimate_tokens(self, system_prompt: str, user_prompt: str, examples_per_chunk: int) -> tuple[int, int]:
        """Return (total_estimated, max_tokens_cap).

        Output estimate SCALES with examples_per_chunk so the bucket reserves a
        realistic amount (this was the #1 cause of the old 429 storms: a flat
        +500 assumed far too little output).
        """
        input_tokens = (len(system_prompt) + len(user_prompt)) // 4
        output_estimate = examples_per_chunk * self.TOKENS_PER_EXAMPLE
        total = input_tokens + output_estimate
        max_tokens = min(output_estimate + 256, self.MAX_OUTPUT_TOKENS_CAP)
        return total, max_tokens

    # -- main entry --------------------------------------------------------

    async def generate_jsonl_for_chunks(self, chunks: List[str]) -> List[List[str]]:
        if not self.clients:
            logger.error("Skipping document processing: no active API clients")
            return [[] for _ in chunks]

        queue: asyncio.Queue = asyncio.Queue()
        for idx, chunk in enumerate(chunks):
            queue.put_nowait((idx, chunk))

        results: List[List[str]] = [[] for _ in chunks]
        dead_letter_queue: List[tuple] = []  # (idx, chunk, last_provider)

        # One worker per key, each serialized by its own semaphore. This gives
        # clean per-key pacing: at most len(clients) requests in flight, each
        # gated by its token bucket. No burst-on-refill.
        num_workers = min(len(self.clients), len(chunks)) or 1

        # Scale examples-per-chunk with document length (preserved heuristic).
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
                    lines = await self.process_chunk_with_retry(chunk, examples_per_chunk=examples_per_chunk)
                    results[idx] = lines
                except ChunkProcessingException as e:
                    logger.error(f"Worker chunk {idx} failure: {e}. -> DLQ.")
                    dead_letter_queue.append((idx, chunk, e.last_provider))
                except Exception as e:
                    logger.error(f"Worker chunk {idx} unexpected failure: {e}. -> DLQ.")
                    dead_letter_queue.append((idx, chunk, "groq"))
                finally:
                    queue.task_done()

        workers = [asyncio.create_task(worker()) for _ in range(num_workers)]
        await asyncio.gather(*workers)

        # Dead Letter Queue: retry on the alternate provider.
        if dead_letter_queue:
            logger.info(f"Processing Dead Letter Queue ({len(dead_letter_queue)} chunks)...")
            for idx, chunk, last_provider in dead_letter_queue:
                alternate = "openrouter" if last_provider == "groq" else "groq"
                logger.info(f"DLQ retry chunk {idx} on {alternate}")
                try:
                    lines = await self.process_chunk_with_retry(
                        chunk, preferred_provider=alternate, examples_per_chunk=examples_per_chunk
                    )
                    results[idx] = lines
                    logger.info(f"Recovered DLQ chunk {idx} on {alternate}")
                except Exception as e:
                    logger.error(f"DLQ chunk {idx} permanently failed on alternate provider: {e}")
                    results[idx] = []

        return results

    # -- per-chunk processing with retry ----------------------------------

    async def process_chunk_with_retry(
        self,
        chunk: str,
        preferred_provider: Optional[str] = None,
        examples_per_chunk: int = 4,
    ) -> List[str]:
        mode = detect_dataset_mode(chunk)
        if not self._is_mode_applicable(mode, chunk):
            logger.info(f"Mode {mode.value} not applicable to this chunk; skipping.")
            return []

        max_attempts = 5
        stricter_prompt = False
        last_provider_used = "groq"

        for attempt in range(max_attempts):
            client: Optional[APIKeyClient] = None
            try:
                client = await self.get_next_available_client(preferred_provider)
                last_provider_used = client.provider_name
            except Exception as e:
                logger.error(f"Client lookup failed: {e}")
                raise ChunkProcessingException(f"Failed to find active provider: {e}", last_provider_used)

            async with client.semaphore:
                try:
                    model_info: ModelInfo = await self.model_manager.get_best_model(client.provider_name)
                    model = model_info.id

                    # Size the per-key bucket to the SELECTED model's real TPM.
                    # Groq 70B -> 12,000; 8B -> 6,000. OpenRouter -> conservative 8,000.
                    client.limiter.update_limits(model_info.tpm)

                    system_prompt = MODE_SYSTEM_PROMPTS[mode]
                    if stricter_prompt:
                        system_prompt += (
                            "\n\nCRITICAL REQUIRED FORMAT: You must return a single JSON object matching the "
                            "requested schema. Do not include any explanation, code comments, or markdown code "
                            "block formatting (e.g. ```json). Make sure your response parses exactly with "
                            "json.loads() and has the 'examples' list key."
                        )

                    user_prompt = self._build_user_prompt(chunk, mode, examples_per_chunk)

                    # Estimate tokens with an output budget that SCALES with the
                    # number of examples, and cap max_tokens so the response (and
                    # thus the bucket) is bounded and predictable.
                    estimated_tokens, max_tokens = self._estimate_tokens(
                        system_prompt, user_prompt, examples_per_chunk
                    )

                    logger.info(
                        f"[{client.provider_name}:{model}] key {client.api_key[:8]}... "
                        f"est {estimated_tokens} tok (max_tokens={max_tokens}); "
                        f"bucket={client.limiter.tokens:.0f}/{client.limiter.capacity} "
                        f"rolling60s={client.limiter.rolling_tpm()}"
                    )

                    # PACE: block until the bucket can afford this request.
                    # This is the primary 429-avoidance mechanism.
                    await client.limiter.wait_for_tokens(estimated_tokens)

                    response = await client.openai_client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        max_tokens=max_tokens,
                        timeout=90.0,
                    )

                    content = response.choices[0].message.content
                    if not content or not content.strip():
                        raise ValueError("Received empty content from LLM completions")

                    # RECONCILE: correct the bucket with REAL consumption so it
                    # never drifts. If usage is missing, keep the reservation.
                    usage = getattr(response, "usage", None)
                    actual_tokens = None
                    if usage is not None:
                        actual_tokens = getattr(usage, "total_tokens", None)
                    if actual_tokens is not None:
                        await client.limiter.reconcile(estimated_tokens, int(actual_tokens))

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
                            if self._validate_example_quality(ex, chunk, mode):
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

                # ---- 429: provider-specific graceful handling -------------
                except openai.RateLimitError as e:
                    await self._handle_429(client, e, estimated_tokens)
                    continue

                # ---- 404: deprecated/missing model -> invalidate + retry ---
                except openai.NotFoundError:
                    logger.warning(f"Model {model} returned 404 on {client.provider_name}. Invalidate and retry.")
                    await self.model_manager.invalidate_model(client.provider_name, model)
                    continue

                # ---- transient network/timeout ----------------------------
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

    # -- 429 handler -------------------------------------------------------

    async def _handle_429(self, client: APIKeyClient, exc: openai.RateLimitError, reserved: int):
        """Provider-specific 429 handling (no blind exponential backoff)."""
        client.rate_limit_count += 1
        message = str(exc)

        if client.provider_name == "openrouter":
            # OpenRouter: honor the EXACT upstream retry hint. Never blind-backoff.
            retry_after = parse_openrouter_429(exc)
            if retry_after is None:
                # No hint available -> conservative fixed wait (NOT exponential).
                retry_after = 20.0
            logger.warning(
                f"429 on OpenRouter key {client.api_key[:8]}... -> "
                f"sleeping upstream retry_after={retry_after:.1f}s. ({message[:160]})"
            )
            # OpenRouter rate limits are usually per-model-upstream, so cool the
            # whole key briefly to avoid hammering the same upstream model.
            client.cooldown_until = time.time() + retry_after
            await asyncio.sleep(retry_after)

        else:  # groq
            parsed = parse_groq_429(message)
            used = parsed["used"]
            limit = parsed["limit"]
            retry_after = parsed["retry_after"]

            # RECALIBRATE the bucket from Groq's own accounting so the next
            # reservation waits exactly as long as the upstream requires.
            if used is not None and limit is not None:
                await client.limiter.recalibrate(int(used), int(limit))
            else:
                # No accounting in the body -> drain the bucket to force a pause.
                async with client.limiter.lock:
                    client.limiter.tokens = 0.0

            if retry_after is None:
                retry_after = self.GROQ_DEFAULT_COOLDOWN
            logger.warning(
                f"429 on Groq key {client.api_key[:8]}... -> "
                f"limit={limit} used={used} -> sleeping {retry_after:.1f}s. ({message[:160]})"
            )
            await asyncio.sleep(retry_after)

            # Repeated 429s on the same key -> extended cooldown + bucket reset.
            if client.rate_limit_count >= 3:
                logger.warning(f"Groq key {client.api_key[:8]}... hit 429 x3 -> 60s cooldown.")
                client.cooldown_until = time.time() + self.GROQ_DEFAULT_COOLDOWN
                client.rate_limit_count = 0

    # ---- prompt building -------------------------------------------------

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

    # ---- mode applicability ---------------------------------------------

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

    # ---- quality control filters ----------------------------------------

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
                re.search(r'^[A-Z].*[.!?]$', line_stripped)
                and len(line_stripped.split()) > 4
                and not line_stripped.startswith(('#', '//'))
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
        if word_count < 5 or word_count > 200:
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
        is_substantial = len(answer.split()) >= 8
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
        has_comparative = any(kw in answer_lower or kw in question_lower for kw in comparative_keywords)
        if not has_comparative:
            return False

        chunk_concepts = set(re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{4,}\b', chunk))
        answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
        concept_overlap = len([c for c in chunk_concepts if c.lower() in answer_words])
        if concept_overlap < 2:
            return False

        return len(answer.split()) >= 8

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
            return False
        if self._is_generic_answer(output, chunk):
            return False

        if mode == DatasetMode.THEORY_QA:
            if not self._has_causal_reasoning(output):
                return False
        elif mode == DatasetMode.CODE_GEN:
            if not self._is_code_only(output):
                return False
        elif mode == DatasetMode.STRUCTURAL_QA:
            if not self._is_structural_answer(output, chunk):
                return False
        elif mode == DatasetMode.TRADEOFFS_QA:
            if not self._has_tradeoff_reasoning(output, instruction):
                return False
        elif mode == DatasetMode.COMPARATIVE_QA:
            if not self._has_comparative_reasoning(output, instruction, chunk):
                return False

        return True


# ---------------------------------------------------------------------------
# 7. Public API Wrapper & Singletons (interface preserved for FastAPI)
# ---------------------------------------------------------------------------

class LLMClient:
    """Public interface wrapping LLMOrchestrator and ModelManager."""
    def __init__(self):
        self.config = PipelineConfig()
        self.model_manager = ModelManager(self.config)
        self.orchestrator = LLMOrchestrator(self.config, self.model_manager)

    async def generate_jsonl_for_chunks(self, chunks: List[str]) -> List[List[str]]:
        """Process list of chunks concurrently with DLQ failover."""
        return await self.orchestrator.generate_jsonl_for_chunks(chunks)

    async def generate_jsonl_from_chunk(self, chunk: str, **kwargs) -> List[str]:
        """Backward compatible single chunk processor."""
        results = await self.generate_jsonl_for_chunks([chunk])
        return results[0] if results else []


# Global LLM client instance - lazily initialized.
_llm_client_instance: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create the LLM client instance."""
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance


class LLMClientProxy:
    """Proxy to lazily initialize LLM client."""
    def __getattr__(self, name):
        return getattr(get_llm_client(), name)


# Singleton export (consumed by app.services.job_manager).
llm_client = LLMClientProxy()
