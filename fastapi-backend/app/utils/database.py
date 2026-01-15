"""
Supabase database client and operations
"""

import os
from supabase import create_client, Client
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class Database:
    """Database operations for JSONL generation"""
    
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        try:
            response = self.client.table("documents").select("*").eq("id", document_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching document {document_id}: {e}")
            return None
    
    async def get_document_by_job_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get document by job ID"""
        try:
            response = self.client.table("documents").select("*").eq("jsonl_job_id", job_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching document by job_id {job_id}: {e}")
            return None
    
    async def update_document_jsonl_status(
        self,
        document_id: str,
        status: str,
        job_id: Optional[str] = None,
        jsonl_url: Optional[str] = None,
        error: Optional[str] = None
    ) -> bool:
        """Update document JSONL generation status"""
        try:
            update_data = {"jsonl_status": status}
            
            if job_id:
                update_data["jsonl_job_id"] = job_id
            if jsonl_url:
                update_data["jsonl_url"] = jsonl_url
                update_data["jsonl_created_at"] = "now()"
            if error:
                update_data["jsonl_error"] = error
            
            self.client.table("documents").update(update_data).eq("id", document_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            return False
    
    async def get_stuck_jobs(self):
        """Get documents stuck in 'generating' status (for recovery on startup)"""
        try:
            response = self.client.table("documents").select("id, user_id, jsonl_job_id").eq("jsonl_status", "generating").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching stuck jobs: {e}")
            return []

# Global database instance - will be initialized lazily
_db_instance = None

def get_db():
    """Get or create the database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance

# Create property for backward compatibility
class DatabaseProxy:
    """Proxy to lazily initialize database"""
    def __getattr__(self, name):
        return getattr(get_db(), name)

db = DatabaseProxy()
