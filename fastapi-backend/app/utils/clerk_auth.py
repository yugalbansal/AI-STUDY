"""Clerk authentication utilities.

Validates the incoming Bearer token by calling Clerk's Backend API.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx
from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

CLERK_API_BASE_URL = "https://api.clerk.com/v1"


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logger.warning("Missing Authorization header in request")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        logger.warning(f"Invalid Authorization header format: {auth_header[:50]}...")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")

    token = parts[1].strip()
    logger.info(f"Extracted Bearer token (length: {len(token)})")
    return token


async def _verify_with_clerk_backend_api(token: str, secret_key: str) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    # Use Clerk's /v1/tokens/verify endpoint for session JWT verification.
    # This endpoint is designed specifically for backend session token validation.
    logger.info(f"Calling Clerk /v1/tokens/verify endpoint")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{CLERK_API_BASE_URL}/tokens/verify",
                headers=headers,
                json={"token": token},
            )

        if resp.status_code != 200:
            # Log failure details for debugging (don't leak to client)
            logger.warning(f"Clerk token verification failed: status={resp.status_code}, body={resp.text[:200]}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

        logger.info("Clerk token verification successful")
        return resp.json()
    except httpx.HTTPError as e:
        logger.error(f"HTTP error calling Clerk API: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error")


def _extract_user_id_from_verify_response(payload: dict[str, Any]) -> Optional[str]:
    # /v1/tokens/verify returns JWT claims directly.
    # The 'sub' claim contains the user_id (format: user_xxx).
    user_id = payload.get("sub")
    return user_id if isinstance(user_id, str) and user_id else None


async def verify_clerk_token(request: Request) -> str:
    """FastAPI dependency that verifies Clerk token and returns the Clerk user_id.

    Expected header:
    logger.info(f"verify_clerk_token called for {request.url.path}")
    token = _extract_bearer_token(request)

    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        logger.error("CLERK_SECRET_KEY is not set in environment")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server misconfigured")

    payload = await _verify_with_clerk_backend_api(token=token, secret_key=secret_key)
    user_id = _extract_user_id_from_verify_response(payload)

    if not user_id:
        logger.warning(f"Failed to extract user_id from Clerk response: {payload}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    logger.info(f"Successfully authenticated user: {user_id}")    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        logger.error("CLERK_SECRET_KEY is not set")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server misconfigured")

    payload = await _verify_with_clerk_backend_api(token=token, secret_key=secret_key)
    user_id = _extract_user_id_from_verify_response(payload)

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    request.state.clerk_user_id = user_id
    return user_id
