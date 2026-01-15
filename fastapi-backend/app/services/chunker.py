"""
Text chunking service
"""

import logging
from typing import List

logger = logging.getLogger(__name__)

class Chunker:
    """Split document text into chunks for LLM processing"""
    
    def split_text(self, content: str, max_chunk_size: int = 800) -> List[str]:
        """
        Split document into chunks for LLM processing.
        Strategy: Split on double newlines (paragraphs), then combine until ~800 chars.
        
        Args:
            content: Full document text
            max_chunk_size: Maximum characters per chunk
            
        Returns:
            List of text chunks
        """
        if not content or not content.strip():
            logger.warning("Empty content provided to chunker")
            return []
        
        # Split on double newlines (paragraphs)
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph exceeds limit, save current chunk
            if len(current_chunk) + len(para) + 2 > max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = para
            else:
                current_chunk += ("\n\n" + para if current_chunk else para)
        
        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        logger.info(f"Split content into {len(chunks)} chunks")
        return chunks

# Global chunker instance
chunker = Chunker()
