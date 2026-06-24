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
        """Clean the text prior to chunking."""
        # Fix broken hyphenations
        text = re.sub(r'(\w+)-\r?\n\s*(\w+)', r'\1\2', text)
        # Replace multiple spaces/tabs with a single space
        text = re.sub(r'[ \t]+', ' ', text)
        # Replace 3 or more consecutive newlines with exactly 2 newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def split_text(self, content: str, chunk_size: int = 2500, chunk_overlap: int = 200) -> List[str]:
        """Split document into chunks for LLM processing."""
        if not content or not content.strip():
            return []
        
        cleaned = self.clean_text(content)
        separators = ["\n\n", "\n", ". ", " ", ""]
        
        chunks = self._split_text(cleaned, separators, chunk_size, chunk_overlap)
        return chunks

    def _split_text(self, text: str, separators: List[str], chunk_size: int, chunk_overlap: int) -> List[str]:
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
                
        splits = text.split(separator) if separator != "" else list(text)
            
        good_splits = []
        for s in splits:
            if len(s) < chunk_size:
                good_splits.append(s)
            else:
                if good_splits:
                    final_chunks.extend(self._merge_splits(good_splits, separator, chunk_size, chunk_overlap))
                    good_splits = []
                final_chunks.extend(self._split_text(s, new_separators, chunk_size, chunk_overlap))
                
        if good_splits:
            final_chunks.extend(self._merge_splits(good_splits, separator, chunk_size, chunk_overlap))
            
        return final_chunks

    def _merge_splits(self, splits: List[str], separator: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        docs = []
        current_doc = []
        total = 0
        sep_len = len(separator)
        
        for d in splits:
            len_d = len(d)
            if total + len_d + (sep_len if current_doc else 0) > chunk_size:
                if total > 0:
                    docs.append(separator.join(current_doc))
                    while total > chunk_overlap or (total + len_d + (sep_len if current_doc else 0) > chunk_size and total > 0):
                        popped = current_doc.pop(0)
                        total -= len(popped) + (sep_len if current_doc else 0)
            current_doc.append(d)
            total += len_d + (sep_len if len(current_doc) > 1 else 0)
            
        if current_doc:
            docs.append(separator.join(current_doc))
        return docs

chunker = Chunker()