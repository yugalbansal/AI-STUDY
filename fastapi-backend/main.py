from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

# Load .env only for local dev
if os.getenv("ENV") != "production":
    load_dotenv()

from app.api import jsonl
from app.services.job_manager import recover_stuck_jobs

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FastAPI backend...")
    try:
        await recover_stuck_jobs()
        logger.info("Startup complete")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield
    logger.info("Shutting down FastAPI backend...")

app = FastAPI(
    title="VectorMind JSONL Generator",
    version="1.0.0",
    lifespan=lifespan
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jsonl.router, prefix="/api/jsonl", tags=["JSONL Generation"])

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
