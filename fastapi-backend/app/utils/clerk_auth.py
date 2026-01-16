"""Clerk authentication utilities.

Validates the incoming Bearer token by verifying the JWT signature using Clerk's JWKS.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

import httpx
import jwt
from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

# Cache for JWKS keys with TTL
_jwks_cache: Optional[dict[str, Any]] = None
_jwks_cache_time: float = 0
# Cache JWKS for 1 hour (Clerk typically rotates keys less frequently)
JWKS_CACHE_TTL = 3600


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


async def _get_clerk_jwks(force_refresh: bool = False) -> dict[str, Any]:
    """Fetch Clerk's JWKS (public keys for JWT verification).
    
    Args:
        force_refresh: If True, bypass cache and fetch fresh JWKS
    """
    global _jwks_cache, _jwks_cache_time
    
    current_time = time.time()
    cache_age = current_time - _jwks_cache_time
    
    # Use cache if valid and not forcing refresh
    if not force_refresh and _jwks_cache and cache_age < JWKS_CACHE_TTL:
        logger.debug(f"Using cached JWKS (age: {cache_age:.1f}s)")
        return _jwks_cache
    
    # Use Clerk's public JWKS endpoint (recommended approach from docs)
    # This is public, cacheable, and doesn't require authentication
    jwks_url = os.getenv("CLERK_JWKS_URL")
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL not configured. Set to: https://<frontend-api>.clerk.accounts.dev/.well-known/jwks.json"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # No Authorization header needed - public endpoint
            resp = await client.get(jwks_url)
        
        if resp.status_code != 200:
            logger.error(f"Failed to fetch JWKS: status={resp.status_code}, body={resp.text[:200]}")
            # If we have cached data, use it as fallback
            if _jwks_cache:
                logger.warning("Using stale JWKS cache due to fetch failure")
                return _jwks_cache
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error")
        
        _jwks_cache = resp.json()
        _jwks_cache_time = current_time
        logger.info(f"Successfully fetched Clerk JWKS with {len(_jwks_cache.get('keys', []))} keys")
        return _jwks_cache
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching JWKS: {e}")
        # Fallback to cache if available
        if _jwks_cache:
            logger.warning("Using stale JWKS cache due to HTTP error")
            return _jwks_cache
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error")
    except Exception as e:
        logger.error(f"Error fetching JWKS: {e}")
        # Fallback to cache if available
        if _jwks_cache:
            logger.warning("Using stale JWKS cache due to error")
            return _jwks_cache
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server error")


async def _verify_jwt_token(token: str, retry_with_refresh: bool = True) -> dict[str, Any]:
    """Verify JWT token using Clerk's JWKS.
    
    Args:
        token: JWT token to verify
        retry_with_refresh: If True, retry once with fresh JWKS on key mismatch
    """
    try:
        # Get JWKS
        jwks_data = await _get_clerk_jwks()
        
        # Decode token header to get the key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
            logger.warning("No 'kid' in token header")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        
        # Find the matching key in JWKS
        signing_key = None
        for key in jwks_data.get("keys", []):
            if key.get("kid") == kid:
                # Use PyJWT's built-in JWK conversion
                signing_key = jwt.PyJWK(key).key
                break
        
        # If key not found and we haven't retried yet, refresh JWKS and try again
        if not signing_key and retry_with_refresh:
            logger.info(f"Key ID {kid} not found in cached JWKS, refreshing...")
            jwks_data = await _get_clerk_jwks(force_refresh=True)
            
            # Search again in fresh JWKS
            for key in jwks_data.get("keys", []):
                if key.get("kid") == kid:
                    signing_key = jwt.PyJWK(key).key
                    logger.info(f"Found key {kid} in refreshed JWKS")
                    break
        
        if not signing_key:
            available_kids = [k.get("kid") for k in jwks_data.get("keys", [])]
            logger.warning(f"No matching key found for kid: {kid}. Available kids: {available_kids}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        
        # Verify and decode the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_aud": False}  # Clerk tokens don't have standard aud
        )
        
        # Validate azp (authorized party) claim to prevent token reuse from other origins
        allowed_origins_str = os.getenv("CLERK_ALLOWED_ORIGINS", "")
        if allowed_origins_str:
            allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
            azp = payload.get("azp")
            if azp and allowed_origins and azp not in allowed_origins:
                logger.warning(f"Invalid azp claim: {azp}. Allowed: {allowed_origins}")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
            if azp:
                logger.debug(f"Validated azp claim: {azp}")
        
        logger.info("JWT token verified successfully")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying JWT: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _extract_user_id_from_verify_response(payload: dict[str, Any]) -> Optional[str]:
    # JWT payload contains 'sub' claim with user_id (format: user_xxx)
    user_id = payload.get("sub")
    return user_id if isinstance(user_id, str) and user_id else None


async def verify_clerk_token(request: Request) -> str:
    """FastAPI dependency that verifies Clerk token and returns the Clerk user_id.
    
    CACHING: Authentication is cached per-request using request.state
    This ensures verification happens only ONCE per HTTP request, not per chunk/step.

    Expected header:
        Authorization: Bearer <clerk_session_token>

    On success:
        - returns the Clerk user_id (string)
        - also sets request.state.clerk_user_id for downstream code

    On failure:
        - raises HTTP 401
    """
    try:
        # Check if already authenticated in this request
        if hasattr(request.state, "clerk_user_id") and request.state.clerk_user_id:
            logger.debug(f"Using cached auth for {request.url.path}: {request.state.clerk_user_id}")
            return request.state.clerk_user_id
        
        logger.info(f"verify_clerk_token called for {request.url.path}")
        token = _extract_bearer_token(request)

        # Verify JWT using JWKS
        payload = await _verify_jwt_token(token)
        user_id = _extract_user_id_from_verify_response(payload)

        if not user_id:
            logger.warning(f"Failed to extract user_id from JWT payload: {payload}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

        logger.info(f"Successfully authenticated user: {user_id}")
        request.state.clerk_user_id = user_id
        return user_id
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors and log them
        logger.error(f"Unexpected error in verify_clerk_token: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error")
