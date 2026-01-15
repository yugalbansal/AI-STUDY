"""
Storage client for downloading documents and uploading JSONL files
"""

import os
from supabase import create_client, Client
import logging
from typing import Optional
import aiofiles

logger = logging.getLogger(__name__)

class StorageClient:
    """Handle file operations with Supabase Storage"""
    
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.client: Client = create_client(supabase_url, supabase_key)
        self.documents_bucket = os.getenv("STORAGE_BUCKET_DOCUMENTS", "documents")
        self.jsonl_bucket = os.getenv("STORAGE_BUCKET_JSONL", "jsonl-datasets")
    
    async def download_document(self, file_path: str, destination: str) -> bool:
        """
        Download document from Supabase Storage
        
        Args:
            file_path: Path in storage bucket (e.g., "user_id/document_id.pdf")
            destination: Local file path to save to
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Downloading document from {file_path}")
            
            # Download file from Supabase Storage
            response = self.client.storage.from_(self.documents_bucket).download(file_path)
            
            # Save to local file
            async with aiofiles.open(destination, 'wb') as f:
                await f.write(response)
            
            logger.info(f"Successfully downloaded to {destination}")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading document {file_path}: {e}")
            return False
    
    async def upload_jsonl(self, user_id: str, document_id: str, local_file_path: str) -> Optional[str]:
        """
        Upload JSONL file to Supabase Storage
        
        Args:
            user_id: User UUID
            document_id: Document UUID
            local_file_path: Path to local JSONL file
            
        Returns:
            Storage path if successful, None otherwise
        """
        try:
            storage_path = f"{user_id}/{document_id}.jsonl"
            
            logger.info(f"Uploading JSONL to {storage_path}")
            
            # Read file content
            async with aiofiles.open(local_file_path, 'rb') as f:
                file_content = await f.read()
            
            # Upload to Supabase Storage
            self.client.storage.from_(self.jsonl_bucket).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": "application/jsonl", "upsert": "true"}
            )
            
            logger.info(f"Successfully uploaded JSONL to {storage_path}")
            return storage_path
            
        except Exception as e:
            logger.error(f"Error uploading JSONL: {e}")
            return None
    
    def get_signed_url(self, file_path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate signed URL for file download
        
        Args:
            file_path: Path in storage bucket
            expires_in: URL expiry time in seconds (default 1 hour)
            
        Returns:
            Signed URL if successful, None otherwise
        """
        try:
            response = self.client.storage.from_(self.jsonl_bucket).create_signed_url(
                path=file_path,
                expires_in=expires_in
            )
            return response.get("signedURL")
        except Exception as e:
            logger.error(f"Error generating signed URL for {file_path}: {e}")
            return None

# Global storage client instance - lazily initialized
_storage_client_instance = None

def get_storage_client():
    """Get or create the storage client instance"""
    global _storage_client_instance
    if _storage_client_instance is None:
        _storage_client_instance = StorageClient()
    return _storage_client_instance

class StorageClientProxy:
    """Proxy to lazily initialize storage client"""
    def __getattr__(self, name):
        return getattr(get_storage_client(), name)

storage_client = StorageClientProxy()
