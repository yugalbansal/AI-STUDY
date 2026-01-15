"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class GenerateRequest(BaseModel):
    """Request to generate JSONL for a document"""
    document_id: str = Field(..., description="UUID of the document")
    user_id: str = Field(..., description="UUID of the user")

class GenerateResponse(BaseModel):
    """Response when JSONL generation starts"""
    job_id: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Job status")
    message: str = Field(..., description="Human-readable message")

class StatusResponse(BaseModel):
    """Job status response"""
    job_id: str
    status: str  # idle, generating, completed, failed
    progress: Optional[float] = None
    jsonl_url: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None

class DownloadResponse(BaseModel):
    """Download URL response"""
    download_url: str
    expires_in: int = Field(3600, description="URL expiry time in seconds")
