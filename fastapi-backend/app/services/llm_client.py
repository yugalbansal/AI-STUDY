"""
LLM client for generating JSONL training data with dataset mode support
"""

import os
import httpx
import json
import re
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional
from collections import deque
from enum import Enum

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
    r'\bisbn\b',  # ISBN appears anywhere
    r'\b(publisher|published|publication)\b.*\?',
    r'\bcopyright\b.*\?',
    r'\bdedicated?\b.*\?',
    r'\bedition\b.*\?',
    r'who\s+(is\s+)?the\s+author',
    r'what\s+(is\s+)?the\s+title',
]

def detect_dataset_mode(text: str) -> DatasetMode:
    """
    Automatically detect dataset mode based on document content.
    
    CODE_GEN indicators:
    - Programming language keywords
    - Code patterns (functions, classes, syntax)
    - Problem statements with code requirements
    
    THEORY_QA fallback:
    - Explanatory or textbook-like content
    - Conceptual descriptions
    - Default if uncertain
    """
    text_lower = text.lower()
    text_sample = text[:5000]  # Analyze first 5000 chars
    
    # CODE_GEN indicators
    code_keywords = [
        'def ', 'function ', 'class ', 'import ', 'const ', 'let ', 'var ',
        'public ', 'private ', 'void ', 'return ', '#!/', 'package ',
        '#include', 'malloc', 'printf', 'iostream'
    ]
    
    code_patterns = [
        r'\bdef\s+\w+\s*\(',           # Python functions
        r'\bfunction\s+\w+\s*\(',      # JavaScript functions
        r'\bclass\s+\w+\s*[:{]',       # Class definitions
        r'^\s*import\s+\w+',           # Import statements
        r'\bpublic\s+\w+\s+\w+\s*\(', # Java methods
        r'=>\s*{',                     # Arrow functions
        r'\w+\s*\(\s*\)\s*{',          # Function calls with blocks
    ]
    
    code_keyword_count = sum(1 for kw in code_keywords if kw in text_lower)
    code_pattern_count = sum(1 for pattern in code_patterns if re.search(pattern, text_sample, re.MULTILINE))
    
    # Decision logic
    if code_keyword_count >= 3 or code_pattern_count >= 2:
        logger.info(f"Detected CODE_GEN mode (keywords: {code_keyword_count}, patterns: {code_pattern_count})")
        return DatasetMode.CODE_GEN
    
    logger.info("Detected THEORY_QA mode (default)")
    return DatasetMode.THEORY_QA

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
    
    async def generate_jsonl_from_chunk(
        self, 
        chunk: str, 
        retry_count: int = 3,
        mode: Optional[DatasetMode] = None,
        chunk_metadata: Optional[Dict[str, Any]] = None,
        target_per_chunk: int = 12
    ) -> List[str]:
        """
        Generate JSONL training examples from a text chunk with automatic mode detection.
        Uses retry logic with fallback models and applies strict quality controls.
        ACCUMULATES results across models/retries until target is reached.
        
        Args:
            chunk: Text content to generate training data from
            retry_count: Number of retries per model
            mode: Dataset mode (auto-detected if None)
            chunk_metadata: Optional metadata (page number, section name) for source anchoring
            target_per_chunk: Target number of examples to accumulate (default 12)
            
        Returns:
            List of valid, quality-filtered JSONL strings
        """
        # Auto-detect mode if not provided
        if mode is None:
            mode = detect_dataset_mode(chunk)
        
        # Check if mode is applicable to this chunk (skip if not)
        if not self._is_mode_applicable(mode, chunk):
            logger.info(f"Mode {mode.value} not applicable to this chunk, skipping")
            return []
        
        collected = []  # Accumulate results across all attempts
        models = [self.primary_model] + self.fallback_models
        
        for model in models:
            for attempt in range(retry_count):
                try:
                    logger.info(f"Generating JSONL with {model} in {mode.value} mode (attempt {attempt + 1}, collected: {len(collected)})")
                    
                    response = await self._call_cerebras(chunk, model, mode, chunk_metadata)
                    lines = self._parse_llm_output(response, mode, chunk)
                    
                    if len(lines) > 0:
                        collected.extend(lines)
                        logger.info(f"Added {len(lines)} lines, total collected: {len(collected)}")
                        
                        # Early exit if we've reached target
                        if len(collected) >= target_per_chunk:
                            logger.info(f"Reached target of {target_per_chunk} examples")
                            return collected[:target_per_chunk]
                    else:
                        logger.warning(f"No valid JSONL lines from {model} after quality filtering")
                    
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
        
        # Return whatever we collected
        if len(collected) > 0:
            logger.info(f"Accumulated {len(collected)} examples across all attempts")
        else:
            logger.error("All models and retries exhausted for this chunk")
        return collected
    
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
    
    def _is_mode_applicable(self, mode: DatasetMode, chunk: str) -> bool:
        """
        Pre-check if a mode is applicable to a chunk before calling LLM.
        Prevents wasted API calls and improves throughput.
        
        Returns:
            True if mode should be attempted, False to skip
        """
        chunk_lower = chunk.lower()
        
        # TRADEOFFS_QA: Pre-check for limitation/constraint signals
        if mode == DatasetMode.TRADEOFFS_QA:
            tradeoff_signals = [
                'limitation', 'limited', 'constraint', 'drawback', 'disadvantage',
                'trade-off', 'tradeoff', 'compromise', 'downside', 'problem',
                'issue', 'challenge', 'difficulty', 'slower', 'expensive',
                'inefficient', 'cannot', 'unable', 'fails', 'however', 'but'
            ]
            has_signal = any(signal in chunk_lower for signal in tradeoff_signals)
            if not has_signal:
                logger.debug("TRADEOFFS_QA: No limitation/constraint signals in chunk")
                return False
        
        # COMPARATIVE_QA: Pre-check for comparison/relationship signals
        elif mode == DatasetMode.COMPARATIVE_QA:
            comparative_signals = [
                'compare', 'comparison', 'versus', 'vs', 'differ', 'difference',
                'similar', 'unlike', 'whereas', 'while', 'in contrast',
                'on the other hand', 'both', 'relationship', 'between',
                'more than', 'less than', 'faster', 'slower', 'better', 'worse',
                'instead of', 'rather than', 'alternative'
            ]
            has_signal = any(signal in chunk_lower for signal in comparative_signals)
            if not has_signal:
                logger.debug("COMPARATIVE_QA: No comparison/relationship signals in chunk")
                return False
        
        # All other modes are always applicable
        return True
    
    async def _call_cerebras(
        self, 
        chunk: str, 
        model: str,
        mode: DatasetMode,
        chunk_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Call Cerebras API with mode-specific prompts and round-robin key selection.
        
        Args:
            chunk: Text content to generate training data from
            model: Cerebras model name
            mode: Dataset mode (determines system prompt and output format)
            chunk_metadata: Optional metadata for source anchoring
        """
        # Build source context for anchoring
        source_context = ""
        if chunk_metadata:
            if 'page' in chunk_metadata:
                source_context = f"[Source: Page {chunk_metadata['page']}]\n"
            elif 'section' in chunk_metadata:
                source_context = f"[Source: {chunk_metadata['section']}]\n"
        
        # Mode-specific prompts with fixed system instructions
        if mode == DatasetMode.THEORY_QA:
            prompt = f"""You are a training data generator for AI tutoring systems. Generate 4 diverse question-answer pairs in JSONL format from the text below.

MANDATORY RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message MUST be EXACTLY: "{MODE_SYSTEM_PROMPTS[DatasetMode.THEORY_QA]}"
- Questions must be DIRECTLY answerable from the provided text
- Questions must test understanding, application, and explanation (NOT meta information like author, title, ISBN)
- Answers MUST explain WHY or HOW concepts work (causal reasoning required)
- Answers must be clear, educational, and grounded in the text
- Vary question types: conceptual, how-to, why-based, relationship-based
- Each line must be complete and parseable JSON

TEXT:
{source_context}{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown, no code blocks):
{{"messages": [{{"role": "system", "content": "{MODE_SYSTEM_PROMPTS[DatasetMode.THEORY_QA]}"}}, {{"role": "user", "content": "How does X work and why?"}}, {{"role": "assistant", "content": "X works by... This is because..."}}]}}

Generate up to 6 high-quality JSONL lines with WHY/HOW reasoning. Only include lines that fully satisfy all rules:"""
        
        elif mode == DatasetMode.CODE_GEN:
            prompt = f"""You are a training data generator for programming education. Generate 4 diverse code generation examples in JSONL format from the text below.

MANDATORY RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message MUST be EXACTLY: "{MODE_SYSTEM_PROMPTS[DatasetMode.CODE_GEN]}"
- Questions must describe programming tasks or problems from the provided text
- Answers MUST contain ONLY valid, executable code (NO explanations, NO comments, NO markdown)
- Code must be directly related to concepts in the provided text
- Each line must be complete and parseable JSON

TEXT:
{source_context}{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown, no code blocks):
{{"messages": [{{"role": "system", "content": "{MODE_SYSTEM_PROMPTS[DatasetMode.CODE_GEN]}"}}, {{"role": "user", "content": "Write a function that..."}}, {{"role": "assistant", "content": "def solution():\\n    return 42"}}]}}

Generate up to 6 high-quality JSONL lines with CODE ONLY answers. Only include lines that fully satisfy all rules:"""

        elif mode == DatasetMode.STRUCTURAL_QA:
            prompt = f"""You are a training data generator for AI tutoring systems. Generate 4 diverse question-answer pairs in JSONL format from the text below, focusing on definitions, properties, components, and structural details.

MANDATORY RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message MUST be EXACTLY: "{MODE_SYSTEM_PROMPTS[DatasetMode.STRUCTURAL_QA]}"
- Questions must ask about WHAT things are, their properties, characteristics, or components
- Questions must be DIRECTLY answerable from explicit statements in the provided text
- Questions must focus on: definitions, key properties, components/parts, or explicit structural details
- Do NOT ask meta questions (author, title, ISBN, publisher, copyright, dedication)
- Do NOT repeat questions about the same concept
- Answers must be concise (1-3 sentences), precise, and quote or paraphrase the text directly
- Answers must NOT include opinions, general knowledge, or external facts
- Vary question types: "What is X?", "What are the properties of X?", "What components does X have?", "What defines X?"
- Each line must be complete and parseable JSON

TEXT:
{source_context}{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown, no code blocks):
{{"messages": [{{"role": "system", "content": "{MODE_SYSTEM_PROMPTS[DatasetMode.STRUCTURAL_QA]}"}}, {{"role": "user", "content": "What is X?"}}, {{"role": "assistant", "content": "X is defined as..."}}]}}

Generate up to 6 high-quality JSONL lines with concise, text-grounded definitions and properties. Only include lines that fully satisfy all rules:"""
        
        elif mode == DatasetMode.TRADEOFFS_QA:
            prompt = f"""You are a training data generator for AI tutoring systems. Generate 4 diverse question-answer pairs in JSONL format from the text below, focusing on limitations, trade-offs, constraints, and design considerations.

MANDATORY RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message MUST be EXACTLY: "{MODE_SYSTEM_PROMPTS[DatasetMode.TRADEOFFS_QA]}"
- Questions must focus on: limitations, trade-offs between alternatives, constraints, design considerations, or problems under certain conditions
- Questions must be DIRECTLY answerable from explicit statements in the provided text
- Do NOT ask generic or hypothetical questions not grounded in the document
- Do NOT ask meta questions (author, title, ISBN, publisher, copyright)
- Do NOT repeat questions from earlier contexts
- Answers MUST explain WHY a limitation or trade-off exists (causal reasoning required)
- Answers must be grounded in the text and demonstrate understanding of constraints
- Vary question types: "What are the limitations of X?", "What trade-offs exist when using X?", "What constraints does X impose?", "What problems arise when X?"
- Each line must be complete and parseable JSON
- STOP if the text does not describe trade-offs, limitations, or constraints

TEXT:
{source_context}{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown, no code blocks):
{{"messages": [{{"role": "system", "content": "{MODE_SYSTEM_PROMPTS[DatasetMode.TRADEOFFS_QA]}"}}, {{"role": "user", "content": "What are the limitations of X?"}}, {{"role": "assistant", "content": "X is limited by... because..."}}]}}

Generate up to 6 high-quality JSONL lines about limitations, trade-offs, and constraints with WHY explanations. Only include lines that fully satisfy all rules:"""
        
        else:  # COMPARATIVE_QA mode
            prompt = f"""You are a training data generator for AI tutoring systems. Generate 4 diverse question-answer pairs in JSONL format from the text below, focusing on comparisons and relationships between concepts.

MANDATORY RULES:
- Each line must be valid JSON with a "messages" array
- Use roles: "system", "user", "assistant"
- System message MUST be EXACTLY: "{MODE_SYSTEM_PROMPTS[DatasetMode.COMPARATIVE_QA]}"
- Questions must focus on: comparisons (A vs B), relationships between concepts, or cause-effect links
- Questions MUST require understanding of MORE THAN ONE concept from the text
- Questions must be DIRECTLY answerable from explicit comparisons or relationships stated in the text
- Do NOT invent comparisons or relationships not present in the text
- Do NOT ask meta questions (author, title, ISBN, publisher, copyright)
- Do NOT repeat questions from earlier contexts
- Answers MUST reference BOTH sides of the comparison or relationship explicitly
- Answers must explain how concepts relate, differ, or connect
- Vary question types: "How does X compare to Y?", "What is the relationship between X and Y?", "How does X affect Y?", "What distinguishes X from Y?"
- Each line must be complete and parseable JSON
- STOP if the text does not contain explicit comparisons or relationships between concepts

TEXT:
{source_context}{chunk}

OUTPUT FORMAT (one JSON object per line, no markdown, no code blocks):
{{"messages": [{{"role": "system", "content": "{MODE_SYSTEM_PROMPTS[DatasetMode.COMPARATIVE_QA]}"}}, {{"role": "user", "content": "How does X compare to Y?"}}, {{"role": "assistant", "content": "X differs from Y in that... while Y..."}}]}}

Generate up to 6 high-quality JSONL lines comparing or relating multiple concepts. Only include lines that fully satisfy all rules:"""

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
    
    def _is_meta_question(self, question: str) -> bool:
        """
        Check if a question is about meta information (author, title, etc.).
        These questions must be filtered out as they don't depend on document content.
        """
        question_lower = question.lower()
        for pattern in META_QUESTION_PATTERNS:
            if re.search(pattern, question_lower):
                return True
        return False
    
    def _is_generic_answer(self, answer: str, chunk: str) -> bool:
        """
        Check if an answer is generic (could be generated without reading the document).
        
        A generic answer is one that:
        - Is very short (< 20 chars) and doesn't reference document concepts
        - Contains no specific terms from the chunk
        - Is a common definition that could come from general knowledge
        """
        if len(answer.strip()) < 20:
            # Very short answers are likely generic unless they contain specific terms
            chunk_words = set(re.findall(r'\b\w{4,}\b', chunk.lower()))
            answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
            specific_overlap = chunk_words & answer_words
            if len(specific_overlap) < 2:
                return True
        
        # Generic response patterns
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
        """
        Check if THEORY_QA answer demonstrates causal reasoning (WHY/HOW).
        
        Valid answers must explain mechanisms, causes, or relationships,
        not just define or describe.
        """
        # Causal reasoning indicators
        causal_keywords = [
            'because', 'since', 'therefore', 'thus', 'hence',
            'causes', 'leads to', 'results in', 'due to',
            'why', 'how', 'by doing', 'through', 'via',
            'this is because', 'the reason', 'this allows',
            'enables', 'prevents', 'ensures', 'guarantees'
        ]
        
        answer_lower = answer.lower()
        
        # Must contain at least one causal indicator
        has_causal = any(keyword in answer_lower for keyword in causal_keywords)
        
        # Must be substantial (not just "because X")
        word_count = len(answer.split())
        is_substantial = word_count >= 15
        
        return has_causal and is_substantial
    
    def _is_code_only(self, answer: str) -> bool:
        """
        Check if CODE_GEN answer contains only code (no explanations).
        
        Valid code-only answers:
        - Contain programming syntax
        - No prose explanations (except minimal inline comments if unavoidable)
        - No markdown formatting
        """
        answer_stripped = answer.strip()
        
        # Reject markdown code blocks (indicates explanation mode)
        if answer_stripped.startswith('```'):
            return False
        
        # Check for explanatory prose patterns
        prose_indicators = [
            r"Here'?s?\s+(the|a)",  # "Here's the solution"
            r"This\s+(function|code|method|class)",  # "This function does..."
            r"The\s+(above|following|code)",  # "The above code..."
            r"^(First|Second|Third|Finally|Note|Remember)",  # Tutorial language
            r"(will|would|should|must|can)\s+\w+",  # Modal verbs in explanations
            r"In\s+this\s+(example|case)",
        ]
        
        for pattern in prose_indicators:
            if re.search(pattern, answer_stripped, re.IGNORECASE | re.MULTILINE):
                return False
        
        # Count code lines vs prose lines
        lines = answer_stripped.split('\n')
        code_line_count = 0
        prose_line_count = 0
        
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # Code indicators (indentation, keywords, operators, brackets)
            has_code_markers = any([
                line_stripped.startswith((' ', '\t')),  # Indented
                re.search(r'\bdef\s+\w+', line_stripped),
                re.search(r'\bclass\s+\w+', line_stripped),
                re.search(r'\b(import|from|return|if|else|for|while|function|const|let|var)\b', line_stripped),
                re.search(r'[=;{}()\[\]]', line_stripped),
                line_stripped.startswith('#') and len(line_stripped) < 80,  # Short comment, not prose
                line_stripped.startswith('//') and len(line_stripped) < 80,
            ])
            
            # Prose indicators (complete sentences with punctuation)
            has_prose_markers = (
                re.search(r'^[A-Z].*[.!?]$', line_stripped) and 
                len(line_stripped.split()) > 4 and
                not line_stripped.startswith(('#', '//'))
            )
            
            if has_code_markers:
                code_line_count += 1
            elif has_prose_markers:
                prose_line_count += 1
        
        # Validation: must have code and prose must be minimal
        if code_line_count == 0:
            return False  # No code found
        
        if prose_line_count > 1:  # Allow at most 1 prose line
            return False
        
        return True
    
    def _is_structural_answer(self, answer: str, chunk: str) -> bool:
        """
        Check if STRUCTURAL_QA answer is appropriate (concise, definition-focused).
        
        Valid structural answers:
        - Concise (typically 1-3 sentences, 10-150 words)
        - Defines, describes properties, or lists components
        - Grounded in document (contains specific terms from chunk)
        - Not overly explanatory (doesn't need WHY/HOW reasoning)
        """
        word_count = len(answer.split())
        
        # Should be concise but substantive
        if word_count < 5:
            return False  # Too short
        if word_count > 200:
            return False  # Too long for a definition/property statement
        
        # Must contain specific terms from the chunk (grounding check)
        chunk_words = set(re.findall(r'\b\w{4,}\b', chunk.lower()))
        answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
        specific_overlap = chunk_words & answer_words
        
        if len(specific_overlap) < 2:
            return False  # Not grounded in text
        
        # Should not be overly causal (that's THEORY_QA territory)
        # Check if answer is predominantly explanatory rather than definitional
        causal_density = sum(
            1 for keyword in ['because', 'therefore', 'thus', 'since', 'this causes']
            if keyword in answer.lower()
        )
        
        # Allow some causal words but not too many (definitions can have "which allows" etc.)
        if causal_density > 6:
            return False  # Too explanatory, should use THEORY_QA
        
        return True
    
    def _has_tradeoff_reasoning(self, answer: str, question: str) -> bool:
        """
        Check if TRADEOFFS_QA answer discusses limitations/trade-offs with reasoning.
        
        Valid answers must:
        - Discuss limitations, constraints, or trade-offs
        - Explain WHY the limitation exists
        - Be substantial (not just stating a limitation without explanation)
        """
        answer_lower = answer.lower()
        question_lower = question.lower()
        
        # Trade-off/limitation indicators
        tradeoff_keywords = [
            'limitation', 'limited', 'constraint', 'drawback', 'disadvantage',
            'trade-off', 'tradeoff', 'compromise', 'cost', 'downside',
            'problem', 'issue', 'challenge', 'difficulty', 'slower',
            'expensive', 'inefficient', 'cannot', 'unable', 'fails',
            'at the expense', 'sacrifice', 'however', 'but',
        ]
        
        # Must mention at least one trade-off/limitation indicator
        has_tradeoff = any(keyword in answer_lower for keyword in tradeoff_keywords)
        if not has_tradeoff:
            return False
        
        # Must have causal reasoning (WHY the limitation exists)
        causal_keywords = [
            'because', 'since', 'due to', 'as a result', 'therefore',
            'this causes', 'leads to', 'results in', 'this means',
            'which means', 'making it', 'rendering it'
        ]
        
        has_reasoning = any(keyword in answer_lower for keyword in causal_keywords)
        
        # Must be substantial
        word_count = len(answer.split())
        is_substantial = word_count >= 15
        
        return has_tradeoff and has_reasoning and is_substantial
    
    def _has_comparative_reasoning(self, answer: str, question: str, chunk: str) -> bool:
        """
        Check if COMPARATIVE_QA answer discusses relationships/comparisons between concepts.
        
        Valid answers must:
        - Reference multiple concepts (at least 2)
        - Show comparison, relationship, or connection between them
        - Be grounded in the text
        """
        answer_lower = answer.lower()
        question_lower = question.lower()
        
        # Comparative/relational indicators
        comparative_keywords = [
            'compare', 'comparison', 'versus', 'vs', 'differ', 'difference',
            'similar', 'like', 'unlike', 'whereas', 'while', 'in contrast',
            'on the other hand', 'both', 'neither', 'either',
            'relationship', 'related', 'connect', 'link', 'between',
            'cause', 'effect', 'leads to', 'results in', 'affects',
            'more than', 'less than', 'faster than', 'slower than',
            'better than', 'worse than', 'instead of', 'rather than'
        ]
        
        # Must contain comparative language
        has_comparative = any(keyword in answer_lower or keyword in question_lower 
                             for keyword in comparative_keywords)
        
        if not has_comparative:
            return False
        
        # Extract potential concept names from chunk (words with 4+ chars, capitalized or technical)
        chunk_concepts = set(re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{4,}\b', chunk))
        answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
        
        # Count how many distinct concepts from chunk appear in answer
        concept_overlap = len([c for c in chunk_concepts if c.lower() in answer_words])
        
        # Must reference at least 2 concepts
        if concept_overlap < 2:
            return False
        
        # Must be substantial
        word_count = len(answer.split())
        if word_count < 15:
            return False
        
        return True
    
    def _validate_quality(
        self, 
        messages: List[Dict[str, str]], 
        mode: DatasetMode,
        chunk: str
    ) -> tuple[bool, str]:
        """
        Apply mode-specific quality controls to a sample.
        
        Returns:
            (is_valid, rejection_reason)
        """
        # Extract user question and assistant answer
        user_msg = None
        assistant_msg = None
        
        for msg in messages:
            if msg.get('role') == 'user':
                user_msg = msg.get('content', '')
            elif msg.get('role') == 'assistant':
                assistant_msg = msg.get('content', '')
        
        if not user_msg or not assistant_msg:
            return False, "Missing user or assistant message"
        
        # Universal filters
        if self._is_meta_question(user_msg):
            return False, "Meta question (author/title/ISBN)"
        
        if self._is_generic_answer(assistant_msg, chunk):
            return False, "Generic answer not grounded in document"
        
        # Mode-specific filters
        if mode == DatasetMode.THEORY_QA:
            if not self._has_causal_reasoning(assistant_msg):
                return False, "THEORY_QA answer lacks WHY/HOW reasoning"
        
        elif mode == DatasetMode.CODE_GEN:
            if not self._is_code_only(assistant_msg):
                return False, "CODE_GEN answer contains explanations (not code-only)"
        
        elif mode == DatasetMode.STRUCTURAL_QA:
            if not self._is_structural_answer(assistant_msg, chunk):
                return False, "STRUCTURAL_QA answer not concise/definitional"
        
        elif mode == DatasetMode.TRADEOFFS_QA:
            if not self._has_tradeoff_reasoning(assistant_msg, user_msg):
                return False, "TRADEOFFS_QA answer lacks limitation/trade-off reasoning"
        
        elif mode == DatasetMode.COMPARATIVE_QA:
            if not self._has_comparative_reasoning(assistant_msg, user_msg, chunk):
                return False, "COMPARATIVE_QA answer lacks multi-concept comparison/relationship"
        
        return True, ""
    
    def _parse_llm_output(self, llm_response: str, mode: DatasetMode, chunk: str) -> List[str]:
        """
        Extract valid JSONL lines from LLM output with strict quality filtering.
        Handles markdown code blocks and applies mode-specific validation.
        
        Args:
            llm_response: Raw LLM response text
            mode: Dataset mode for quality validation
            chunk: Original text chunk for grounding checks
            
        Returns:
            List of quality-filtered, valid JSONL strings
        """
        lines = []
        rejected_count = 0
        
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
                valid_structure = True
                for msg in data['messages']:
                    if 'role' not in msg or 'content' not in msg:
                        valid_structure = False
                        break
                    if msg['role'] not in ['system', 'user', 'assistant', 'function']:
                        valid_structure = False
                        break
                
                if not valid_structure:
                    continue
                
                # Apply quality controls
                is_valid, rejection_reason = self._validate_quality(data['messages'], mode, chunk)
                if not is_valid:
                    rejected_count += 1
                    logger.debug(f"Rejected sample: {rejection_reason}")
                    continue
                
                # Re-serialize to ensure clean JSONL format
                lines.append(json.dumps(data, ensure_ascii=False))
                    
            except json.JSONDecodeError:
                continue  # Skip invalid JSON
        
        if rejected_count > 0:
            logger.info(f"Quality filter rejected {rejected_count} samples")
        
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
