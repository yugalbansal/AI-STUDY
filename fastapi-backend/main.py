from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

# Load .env only for local dev
if os.getenv("ENV") != "production":
    load_dotenv()

from app.api import jsonl, status
from app.services.job_manager import recover_stuck_jobs, start_background_worker, stop_background_worker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FastAPI backend...")
    try:
        # Recover jobs interrupted by previous shutdown
        await recover_stuck_jobs()
        
        # Start background worker for queue processing
        await start_background_worker()
        
        logger.info("Startup complete")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    
    yield
    
    # Shutdown: stop background worker gracefully
    logger.info("Shutting down FastAPI backend...")
    try:
        await stop_background_worker()
        logger.info("Background worker stopped")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

app = FastAPI(
    title="VectorMind JSONL Generator",
    version="1.0.0",
    lifespan=lifespan
)

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX")

# Production setup:
# - Prefer setting ALLOWED_ORIGINS to your exact frontend URL(s).
# - Optionally set ALLOWED_ORIGIN_REGEX for preview domains (e.g. Vercel previews).
cors_kwargs = {
    "allow_origins": origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
    "expose_headers": ["*"],
}
if origin_regex:
    cors_kwargs["allow_origin_regex"] = origin_regex

logger.info(f"CORS configured with origins: {origins}")
app.add_middleware(CORSMiddleware, **cors_kwargs)

app.include_router(jsonl.router, prefix="/api/jsonl", tags=["JSONL Generation"])
app.include_router(status.router, prefix="/api", tags=["Status Dashboard"])

@app.get("/")
@app.head("/")
async def root():
    return {"status": "ok"}

@app.get("/health")
@app.head("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

