"""
Job manager for background JSONL generation tasks
"""

import os
import asyncio
import logging
from typing import Dict
import aiofiles
from uuid import uuid4

from app.services.document_loader import document_loader
from app.services.chunker import chunker
from app.services.llm_client import llm_client
from app.services.storage_client import storage_client
from app.utils.database import db

logger = logging.getLogger(__name__)

# Track active jobs
active_jobs: Dict[str, asyncio.Task] = {}

async def start_jsonl_job(job_id: str, document_id: str, user_id: str, file_path: str):
    """
    Start a background JSONL generation job
    
    Args:
        job_id: Unique job identifier
        document_id: Document UUID
        user_id: User UUID
        file_path: Path to document in storage bucket
    """
    task = asyncio.create_task(
        generate_jsonl_task(job_id, document_id, user_id, file_path)
    )
    active_jobs[job_id] = task
    logger.info(f"Started job {job_id} for document {document_id}")
    return job_id

async def generate_jsonl_task(job_id: str, document_id: str, user_id: str, file_path: str):
    """
    Background task to generate JSONL file
    
    Args:
        job_id: Unique job identifier
        document_id: Document UUID
        user_id: User UUID
        file_path: Path to document in storage bucket
    """
    temp_dir = "/tmp/jsonl_generator"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{job_id}.jsonl")
    
    try:
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
        
        # Step 3: Generate JSONL lines from chunks in parallel (with concurrency limit)
        total_lines = 0
        successful_chunks = 0
        
        # Process chunks in parallel: 5 API keys × 2 parallel requests each = 10 concurrent
        max_concurrent = 10  # Process 10 chunks at a time
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_chunk_with_semaphore(i, chunk):
            async with semaphore:
                try:
                    logger.info(f"Job {job_id}: Processing chunk {i + 1}/{len(chunks)}")
                    jsonl_lines = await llm_client.generate_jsonl_from_chunk(chunk)
                    
                    if jsonl_lines:
                        logger.info(f"Job {job_id}: Generated {len(jsonl_lines)} lines from chunk {i + 1}")
                        return jsonl_lines
                    else:
                        logger.warning(f"Job {job_id}: No lines generated from chunk {i + 1}")
                        return []
                except Exception as chunk_error:
                    logger.error(f"Job {job_id}: Error on chunk {i + 1}: {chunk_error}")
                    return []
        
        # Process all chunks in parallel (controlled by semaphore)
        logger.info(f"Job {job_id}: Processing {len(chunks)} chunks in parallel (max {max_concurrent} concurrent)")
        results = await asyncio.gather(*[process_chunk_with_semaphore(i, chunk) for i, chunk in enumerate(chunks)])
        
        # Write all results to file
        async with aiofiles.open(temp_file_path, 'w', encoding='utf-8') as f:
            for jsonl_lines in results:
                if jsonl_lines:
                    for line in jsonl_lines:
                        await f.write(line + '\n')
                        total_lines += 1
                    successful_chunks += 1
        
        # Step 4: Validate minimum quality threshold
        if total_lines < 10:
            raise Exception(f"Insufficient training data: only {total_lines} examples generated (minimum 10 required)")
        
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

async def recover_stuck_jobs():
    """
    Called on startup to handle jobs that were interrupted by server restart.
    Marks stuck jobs as 'failed' so users can retry.
    """
    logger.info("Recovering stuck jobs...")
    
    stuck_docs = await db.get_stuck_jobs()
    
    if not stuck_docs:
        logger.info("No stuck jobs found")
        return
    
    logger.info(f"Found {len(stuck_docs)} stuck jobs, marking as failed")
    
    for doc in stuck_docs:
        await db.update_document_jsonl_status(
            doc['id'],
            status='failed',
            error='Job was interrupted by server restart. Please retry.'
        )
        logger.info(f"Marked document {doc['id']} as failed")
    
    logger.info("Stuck job recovery complete")
