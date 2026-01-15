"""Authentication utilities."""

from fastapi import HTTPException
from app.utils.database import db
import logging

logger = logging.getLogger(__name__)

async def verify_document_ownership(document_id: str, user_id: str) -> bool:
    """
    Verify that user owns the document
    
    Args:
        document_id: Document UUID
        user_id: User UUID
        
    Returns:
        True if user owns document, raises HTTPException otherwise
    """
    doc = await db.get_document(document_id)
    
    if not doc:
        logger.warning(f"Document {document_id} not found")
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.get("user_id") != user_id:
        logger.warning(f"User {user_id} attempted to access document {document_id} owned by {doc.get('user_id')}")
        raise HTTPException(status_code=403, detail="You don't have permission to access this document")
    
    return True
