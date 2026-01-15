"""
Utils package initialization
"""

from .database import db
from .auth import verify_document_ownership

__all__ = ["db", "verify_document_ownership"]
