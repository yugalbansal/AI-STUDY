"""
Job manager for background JSONL generation tasks
"""

import os
import asyncio
import logging
import tempfile
from typing import Dict, Optional
import aiofiles

from app.services.document_loader import document_loader
from app.services.chunker import chunker
from app.services.llm_client import llm_client
from app.services.storage_client import storage_client
from app.utils.database import db

logger = logging.getLogger(__name__)

# CONCURRENCY CONTROL:
# Semaphore enforces max 2 documents processing simultaneously.
# When both slots are taken, new jobs wait in the database queue.
# As soon as one job completes, the worker picks the next queued job.
MAX_CONCURRENT_JOBS = 2
job_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

# Track active jobs (for monitoring/debugging)
active_jobs: Dict[str, asyncio.Task] = {}

# Background worker control
worker_running = False
worker_task: Optional[asyncio.Task] = None

async def queue_jsonl_job(job_id: str, document_id: str, user_id: str, file_path: str):
    """
    Queue a JSONL generation job (does NOT start it immediately).
    
    The job is marked as 'queued' in the database.
    The background worker will pick it up when capacity is available.
    
    Args:
        job_id: Unique job identifier
        document_id: Document UUID
        user_id: User UUID
        file_path: Path to document in storage bucket
    """
    # Status is already set to 'queued' by the API endpoint.
    # (Older rows may still be 'generating'.)
    # The worker will atomically transition queued/generating -> 'processing'
    # when it picks up the job.
    logger.info(f"Queued job {job_id} for document {document_id}")
    return job_id

async def generate_jsonl_task(job_id: str, document_id: str, user_id: str, file_path: str):
    """
    Background task to generate JSONL file.
    
    CONCURRENCY ENFORCEMENT:
    - Acquires semaphore before processing (blocks if 2 jobs already running)
    - Releases semaphore on completion/failure (allows next job to start)
    - This ensures max 2 documents are processed at any time
    
    Args:
        job_id: Unique job identifier
        document_id: Document UUID
        user_id: User UUID
        file_path: Path to document in storage bucket
    """
    # Use OS temp dir (works on Windows/Linux).
    temp_dir = os.path.join(tempfile.gettempdir(), "jsonl_generator")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{job_id}.jsonl")
    
    # ACQUIRE SEMAPHORE: Block here if 2 jobs already running
    async with job_semaphore:
        logger.info(
            f"Job {job_id}: Acquired processing slot ({len(active_jobs)}/{MAX_CONCURRENT_JOBS} running)"
        )
        
        try:
            # Status is atomically transitioned to 'processing' by the worker before the task is scheduled.
            logger.info(f"Job {job_id}: Starting JSONL generation")
        
            # Step 1: Download and extract text from document
            logger.info(f"Job {job_id}: Downloading and extracting text")
            content = await document_loader.download_and_extract_text(file_path, document_id)
            
            if not content or not content.strip():
                raise Exception("Failed to extract text from document or document is empty")
            
            logger.info(f"Job {job_id}: Extracted {len(content)} characters")
            
            # Step 2: Split text into chunks
            chunks = chunker.split_text(content)
            
            if not chunks:
                raise Exception("No chunks generated from document")
            
            logger.info(f"Job {job_id}: Split into {len(chunks)} chunks")
            
            # Step 3: Generate JSONL lines from chunks concurrently using LLM client
            total_lines = 0
            successful_chunks = 0
            
            logger.info(f"Job {job_id}: Processing {len(chunks)} chunks with resilient multi-provider pipeline")
            results = await llm_client.generate_jsonl_for_chunks(chunks)
            
            # Write all results to file
            async with aiofiles.open(temp_file_path, 'w', encoding='utf-8') as f:
                for jsonl_lines in results:
                    if jsonl_lines:
                        for line in jsonl_lines:
                            await f.write(line + '\n')
                            total_lines += 1
                        successful_chunks += 1
            
            # Step 4: Validate minimum quality threshold
            if total_lines < 1:
                raise Exception("Insufficient training data: no valid examples could be generated from this document")
            
            logger.info(f"Job {job_id}: Generated {total_lines} total JSONL lines from {successful_chunks}/{len(chunks)} chunks")
            
            # Step 5: Upload JSONL file to storage
            logger.info(f"Job {job_id}: Uploading JSONL to storage")
            storage_path = await storage_client.upload_jsonl(user_id, document_id, temp_file_path)
            
            if not storage_path:
                raise Exception("Failed to upload JSONL file to storage")
            
            # Step 6: Mark job as completed
            await db.update_document_jsonl_status(
                document_id,
                status='completed',
                jsonl_url=storage_path
            )
            
            logger.info(f"Job {job_id}: COMPLETED successfully")
        
        except Exception as e:
            # Mark job as failed
            logger.error(f"Job {job_id}: FAILED - {e}")
            await db.update_document_jsonl_status(
                document_id,
                status='failed',
                error=str(e)
            )
        
        finally:
            # Cleanup temp file
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                    logger.info(f"Job {job_id}: Cleaned up temp file")
                except Exception as e:
                    logger.error(f"Job {job_id}: Failed to cleanup temp file: {e}")
            
            # Remove from active jobs
            if job_id in active_jobs:
                del active_jobs[job_id]

async def background_job_worker():
    """
    Background worker loop that continuously processes queued JSONL jobs.
    
    QUEUE PROCESSING LOGIC:
    1. Poll database every 2 seconds for jobs in 'generating' status (FIFO order)
    2. Atomically pick jobs when capacity available (max 2 concurrent)
    3. Start job execution (with semaphore to enforce concurrency)
    4. As jobs complete, semaphore releases and next job is picked
    
    ATOMICITY & RACE CONDITION SAFETY:
    - Database query filters by 'generating' status (queued jobs)
    - Jobs ordered by created_at (FIFO)
    - Each job transitions: generating -> processing -> completed/failed
    - Multiple workers are safe because status transitions are atomic
    
    RESTART SAFETY:
    - On startup, stuck 'processing' jobs are marked as 'failed'
    - New jobs can then be queued and processed normally
    """
    global worker_running
    worker_running = True
    logger.info(f"Background job worker started (max {MAX_CONCURRENT_JOBS} concurrent jobs)")
    
    while worker_running:
        try:
            # Only schedule up to available capacity to keep memory stable.
            available_slots = MAX_CONCURRENT_JOBS - len(active_jobs)
            if available_slots <= 0:
                await asyncio.sleep(1)
                continue

            # Query for queued jobs in FIFO order.
            # We fetch a small batch and atomically claim before scheduling.
            queued_docs = await db.get_queued_jobs(limit=max(10, available_slots * 5))
            
            if queued_docs:
                for doc in queued_docs:
                    if not worker_running:
                        break

                    if available_slots <= 0:
                        break
                    
                    job_id = doc.get('jsonl_job_id')
                    document_id = doc.get('id')
                    user_id = doc.get('user_id')
                    file_path = doc.get('jsonl_file_path')
                    
                    if not all([job_id, document_id, user_id, file_path]):
                        logger.warning(f"Skipping incomplete job data: {doc}")
                        continue
                    
                    # Check if already processing this job
                    if job_id in active_jobs:
                        continue

                    # ATOMIC CLAIM:
                    # Transition queued -> processing in a single UPDATE guarded by jsonl_status.
                    # If this returns False, some other loop iteration/worker already claimed it.
                    claimed = await db.claim_document_for_processing(document_id)
                    if not claimed:
                        continue
                    
                    # Start the job (semaphore still enforces max concurrency)
                    task = asyncio.create_task(
                        generate_jsonl_task(job_id, document_id, user_id, file_path)
                    )
                    active_jobs[job_id] = task

                    available_slots -= 1
                    
                    logger.info(f"Worker picked up job {job_id} for document {document_id}")
            
            # Poll every 2 seconds
            await asyncio.sleep(2)
            
        except Exception as e:
            logger.error(f"Background worker error: {e}")
            await asyncio.sleep(5)  # Back off on error
    
    logger.info("Background job worker stopped")

async def start_background_worker():
    """
    Start the background job worker.
    Called during app startup.
    """
    global worker_task
    if worker_task is None or worker_task.done():
        worker_task = asyncio.create_task(background_job_worker())
        logger.info("Background worker task created")

async def stop_background_worker():
    """
    Stop the background job worker.
    Called during app shutdown.
    """
    global worker_running, worker_task
    worker_running = False
    if worker_task:
        await worker_task
        logger.info("Background worker stopped")

async def recover_stuck_jobs():
    """
    Called on startup to handle jobs that were interrupted by server restart.
    
    RECOVERY LOGIC:
    - Jobs in 'generating' status: Leave as-is (queued, worker will process)
    - Jobs in 'processing' status: Mark as 'failed' (were running when server crashed)
    
    This ensures:
    1. Queued jobs don't get lost on restart
    2. In-progress jobs are safely marked as failed (user can retry)
    3. No duplicate processing
    """
    logger.info("Recovering stuck jobs...")
    
    # Get jobs that were actively processing when server stopped
    stuck_docs = await db.get_processing_jobs()
    
    if not stuck_docs:
        logger.info("No stuck processing jobs found")
    else:
        logger.info(f"Found {len(stuck_docs)} stuck processing jobs, marking as failed")
        
        for doc in stuck_docs:
            await db.update_document_jsonl_status(
                doc['id'],
                status='failed',
                error='Job was interrupted by server restart. Please retry.'
            )
            logger.info(f"Marked document {doc['id']} as failed")
    
    # Count queued jobs (will be processed by worker)
    queued_docs = await db.get_queued_jobs(limit=100)
    if queued_docs:
        logger.info(f"Found {len(queued_docs)} queued jobs waiting to be processed")
    
    logger.info("Stuck job recovery complete")
