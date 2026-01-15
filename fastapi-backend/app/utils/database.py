"""
Supabase database client and operations
"""

import os
from datetime import datetime, timezone
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
                update_data["jsonl_created_at"] = datetime.now(timezone.utc).isoformat()

            # Allow callers to clear the error by passing error=None.
            if error is not None:
                update_data["jsonl_error"] = error
            
            self.client.table("documents").update(update_data).eq("id", document_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            return False

    async def claim_document_for_processing(self, document_id: str) -> bool:
        """
        Atomically claim a queued document for processing.

        SAFETY:
        - Single UPDATE with a status predicate prevents two workers (or two loop iterations)
          from claiming the same job.
        - Returns True only if this call performed the transition to 'processing'.
        """
        try:
            response = (
                self.client.table("documents")
                .update({"jsonl_status": "processing"})
                .eq("id", document_id)
                .in_("jsonl_status", ["queued", "generating"])  # backward compatible
                .execute()
            )
            return bool(getattr(response, "data", None))
        except Exception as e:
            logger.error(f"Error claiming document {document_id} for processing: {e}")
            return False
    
    async def get_stuck_jobs(self):
        """
        DEPRECATED: Use get_processing_jobs() instead.
        Get documents stuck in the queued state (for recovery on startup)
        """
        try:
            response = (
                self.client.table("documents")
                .select("id, user_id, jsonl_job_id")
                .in_("jsonl_status", ["queued", "generating"])  # backward compatible
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching stuck jobs: {e}")
            return []
    
    async def get_queued_jobs(self, limit: int = 10):
        """
        Get queued jobs (status = 'queued', backward compatible with 'generating')
        ordered by creation time (FIFO).
        
        ATOMICITY:
        - Query is read-only, no race condition
        - Status transition happens in generate_jsonl_task
        - Multiple queries are safe because each job transitions atomically
        
        Args:
            limit: Maximum number of jobs to return
            
        Returns:
            List of document records with queued status
        """
        try:
            response = (
                self.client.table("documents")
                .select("id, user_id, jsonl_job_id, jsonl_file_path, created_at")
                .in_("jsonl_status", ["queued", "generating"])  # FIFO queue
                .order("created_at", desc=False)  # FIFO: oldest first
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching queued jobs: {e}")
            return []
    
    async def get_processing_jobs(self):
        """
        Get jobs currently being processed (status = 'processing').
        Used for recovery on startup to mark interrupted jobs as failed.
        
        Returns:
            List of document records with status 'processing'
        """
        try:
            response = (
                self.client.table("documents")
                .select("id, user_id, jsonl_job_id")
                .eq("jsonl_status", "processing")
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching processing jobs: {e}")
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
