"""
JSONL Generation API Endpoints
"""

from fastapi import APIRouter, HTTPException
from uuid import uuid4
import logging

from app.models.schemas import (
    GenerateRequest,
    GenerateResponse,
    StatusResponse,
    DownloadResponse
)
from app.utils.database import db
from app.utils.auth import verify_document_ownership
from app.services.job_manager import start_jsonl_job
from app.services.storage_client import storage_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate", response_model=GenerateResponse)
async def generate_jsonl(request: GenerateRequest):
    """
    Start JSONL generation for a document
    
    Process:
    1. Verify user owns the document
    2. Check if JSONL generation is already in progress or completed
    3. Create background job
    4. Return job ID immediately
    """
    try:
        # Verify ownership
        await verify_document_ownership(request.document_id, request.user_id)
        
        # Get document details
        doc = await db.get_document(request.document_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if already generating or completed
        current_status = doc.get('jsonl_status', 'idle')
        
        if current_status == 'generating':
            raise HTTPException(
                status_code=409,
                detail="JSONL generation already in progress for this document"
            )
        
        if current_status == 'completed':
            raise HTTPException(
                status_code=409,
                detail="JSONL already generated for this document. Delete the existing file to regenerate."
            )
        
        # Check if document has file path
        file_path = doc.get('jsonl_file_path')
        if not file_path:
            raise HTTPException(
                status_code=400,
                detail="Document has no file uploaded. Only file-based documents can generate JSONL."
            )
        
        # Create job ID
        job_id = str(uuid4())
        
        # Update status to 'generating'
        await db.update_document_jsonl_status(
            request.document_id,
            status='generating',
            job_id=job_id
        )
        
        # Start background job
        await start_jsonl_job(
            job_id=job_id,
            document_id=request.document_id,
            user_id=request.user_id,
            file_path=file_path
        )
        
        logger.info(f"Started JSONL generation job {job_id} for document {request.document_id}")
        
        return GenerateResponse(
            job_id=job_id,
            status="started",
            message="JSONL generation started. Use the job ID to check status."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting JSONL generation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start JSONL generation: {str(e)}")

@router.get("/status/{job_id}", response_model=StatusResponse)
async def get_job_status(job_id: str):
    """
    Get status of a JSONL generation job
    
    Returns:
    - job_id: Job identifier
    - status: idle, generating, completed, failed
    - jsonl_url: Storage path if completed
    - error: Error message if failed
    """
    try:
        doc = await db.get_document_by_job_id(job_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return StatusResponse(
            job_id=job_id,
            status=doc.get('jsonl_status', 'idle'),
            jsonl_url=doc.get('jsonl_url'),
            error=doc.get('jsonl_error'),
            created_at=doc.get('jsonl_created_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch job status: {str(e)}")

@router.get("/download/{document_id}", response_model=DownloadResponse)
async def get_download_url(document_id: str, user_id: str):
    """
    Get signed download URL for generated JSONL file
    
    Args:
        document_id: Document UUID
        user_id: User UUID (for ownership verification)
        
    Returns:
        Signed URL that expires in 1 hour
    """
    try:
        # Verify ownership
        await verify_document_ownership(document_id, user_id)
        
        # Get document
        doc = await db.get_document(document_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if JSONL is completed
        if doc.get('jsonl_status') != 'completed':
            raise HTTPException(status_code=404, detail="JSONL file not ready. Status: " + doc.get('jsonl_status', 'unknown'))
        
        jsonl_url = doc.get('jsonl_url')
        if not jsonl_url:
            raise HTTPException(status_code=404, detail="JSONL file path not found")
        
        # Generate signed URL
        signed_url = storage_client.get_signed_url(jsonl_url, expires_in=3600)
        
        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to generate download URL")
        
        return DownloadResponse(
            download_url=signed_url,
            expires_in=3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")

@router.post("/retry/{document_id}", response_model=GenerateResponse)
async def retry_failed_job(document_id: str, user_id: str):
    """
    Retry a failed JSONL generation job
    
    Args:
        document_id: Document UUID
        user_id: User UUID (for ownership verification)
    """
    try:
        # Verify ownership
        await verify_document_ownership(document_id, user_id)
        
        # Get document
        doc = await db.get_document(document_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Only allow retry if failed
        if doc.get('jsonl_status') != 'failed':
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retry job with status: {doc.get('jsonl_status')}"
            )
        
        # Check if document has file path
        file_path = doc.get('jsonl_file_path')
        if not file_path:
            raise HTTPException(
                status_code=400,
                detail="Document has no file uploaded"
            )
        
        # Create new job
        job_id = str(uuid4())
        
        # Reset status
        await db.update_document_jsonl_status(
            document_id,
            status='generating',
            job_id=job_id,
            error=None  # Clear previous error
        )
        
        # Start background job
        await start_jsonl_job(
            job_id=job_id,
            document_id=document_id,
            user_id=user_id,
            file_path=file_path
        )
        
        logger.info(f"Retrying JSONL generation with job {job_id} for document {document_id}")
        
        return GenerateResponse(
            job_id=job_id,
            status="started",
            message="JSONL generation restarted"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retry job: {str(e)}")
