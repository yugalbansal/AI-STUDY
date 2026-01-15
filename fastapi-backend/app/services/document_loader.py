"""
Document loader - downloads and extracts text from documents
"""

import os
import logging
from typing import Optional
from PyPDF2 import PdfReader
from docx import Document
from pptx import Presentation
from app.services.storage_client import storage_client

logger = logging.getLogger(__name__)

class DocumentLoader:
    """Load and extract text from documents"""
    
    async def download_and_extract_text(self, file_path: str, document_id: str) -> Optional[str]:
        """
        Download document from storage and extract text
        
        Args:
            file_path: Path in storage bucket (from documents.jsonl_file_path)
            document_id: Document UUID (for temp file naming)
            
        Returns:
            Extracted text content or None if failed
        """
        # Determine file extension
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        
        # Create temp directory if not exists
        temp_dir = "/tmp/jsonl_generator"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Download to temp file
        temp_file_path = os.path.join(temp_dir, f"{document_id}{ext}")
        
        try:
            # Download from storage
            success = await storage_client.download_document(file_path, temp_file_path)
            if not success:
                logger.error(f"Failed to download document {file_path}")
                return None
            
            # Extract text based on file type
            if ext == '.pdf':
                text = self._extract_from_pdf(temp_file_path)
            elif ext == '.docx':
                text = self._extract_from_docx(temp_file_path)
            elif ext in ['.pptx', '.ppt']:
                text = self._extract_from_pptx(temp_file_path)
            elif ext in ['.txt', '.md']:
                text = self._extract_from_text(temp_file_path)
            else:
                logger.error(f"Unsupported file type: {ext}")
                return None
            
            # Cleanup temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            # Cleanup on error
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            return None
    
    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            raise
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            doc = Document(file_path)
            text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting DOCX: {e}")
            raise
    
    def _extract_from_pptx(self, file_path: str) -> str:
        """Extract text from PPTX"""
        try:
            prs = Presentation(file_path)
            text = ""
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
                text += "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PPTX: {e}")
            raise
    
    def _extract_from_text(self, file_path: str) -> str:
        """Extract text from TXT/MD files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Error extracting text file: {e}")
            raise

# Global document loader instance
document_loader = DocumentLoader()
