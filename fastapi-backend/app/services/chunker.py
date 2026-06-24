"""
Text chunking service
"""

import logging
import re
from typing import List

logger = logging.getLogger(__name__)

class Chunker:
    """Split document text into chunks for LLM processing"""
    
    def clean_text(self, text: str) -> str:
        """
        Clean the text prior to chunking:
        - Resolve soft-hyphenations (hyphen followed by newline and optional whitespace)
        - Remove multiple consecutive spaces/tabs
        - Remove excessive newlines (max 2 consecutive)
        """
        # Fix broken hyphenations: e.g., "hyphen-\nation" -> "hyphenation"
        text = re.sub(r'(\w+)-\r?\n\s*(\w+)', r'\1\2', text)
        # Replace multiple spaces/tabs with a single space
        text = re.sub(r'[ \t]+', ' ', text)
        # Replace 3 or more consecutive newlines with exactly 2 newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def split_text(self, content: str, chunk_size: int = 2500, chunk_overlap: int = 200) -> List[str]:
        """
        Split document into chunks for LLM processing.
        Uses a recursive character text splitting strategy similar to LangChain's.
        
        Args:
            content: Full document text
            chunk_size: Maximum characters per chunk
            chunk_overlap: Overlap between consecutive chunks
            
        Returns:
            List of text chunks
        """
        if not content or not content.strip():
            logger.warning("Empty content provided to chunker")
            return []
        
        cleaned = self.clean_text(content)
        separators = ["\n\n", "\n", ". ", " ", ""]
        
        logger.info(f"Splitting cleaned text (length={len(cleaned)}) with size={chunk_size}, overlap={chunk_overlap}")
        chunks = self._split_text(cleaned, separators, chunk_size, chunk_overlap)
        logger.info(f"Split content into {len(chunks)} chunks")
        return chunks

    def _split_text(self, text: str, separators: List[str], chunk_size: int, chunk_overlap: int) -> List[str]:
        final_chunks = []
        
        # Get appropriate separator
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
                
        # Split the text
        if separator != "":
            splits = text.split(separator)
        else:
            splits = list(text)
            
        # Now merge splits
        good_splits = []
        for s in splits:
            if len(s) < chunk_size:
                good_splits.append(s)
            else:
                # Split this oversized split recursively
                if good_splits:
                    merged = self._merge_splits(good_splits, separator, chunk_size, chunk_overlap)
                    final_chunks.extend(merged)
                    good_splits = []
                recursive_chunks = self._split_text(s, new_separators, chunk_size, chunk_overlap)
                final_chunks.extend(recursive_chunks)
                
        if good_splits:
            merged = self._merge_splits(good_splits, separator, chunk_size, chunk_overlap)
            final_chunks.extend(merged)
            
        return final_chunks

    def _merge_splits(self, splits: List[str], separator: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        # Merges splits into chunks of max chunk_size, with chunk_overlap
        docs = []
        current_doc = []
        total = 0
        separator_len = len(separator)
        
        for d in splits:
            len_d = len(d)
            if total + len_d + (separator_len if current_doc else 0) > chunk_size:
                if total > 0:
                    docs.append(separator.join(current_doc))
                    # Now pop elements from current_doc until we have room for the new element plus overlap
                    while total > chunk_overlap or (total + len_d + (separator_len if current_doc else 0) > chunk_size and total > 0):
                        popped = current_doc.pop(0)
                        total -= len(popped) + (separator_len if current_doc else 0)
                
            current_doc.append(d)
            total += len_d + (separator_len if len(current_doc) > 1 else 0)
            
        if current_doc:
            docs.append(separator.join(current_doc))
            
        return docs

# Global chunker instance
chunker = Chunker()
