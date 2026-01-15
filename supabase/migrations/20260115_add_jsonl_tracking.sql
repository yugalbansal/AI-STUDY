/*
  # Add JSONL Generation Tracking
  
  1. Changes:
    - Add jsonl_status column to track generation state
    - Add jsonl_job_id for background job tracking
    - Add jsonl_url for storage location of generated JSONL
    - Add jsonl_file_path for original uploaded file path
    - Add jsonl_created_at for completion timestamp
    - Add indexes for efficient queries
*/

-- Add JSONL tracking columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS jsonl_status TEXT DEFAULT 'idle' CHECK (jsonl_status IN ('idle', 'generating', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS jsonl_job_id UUID,
ADD COLUMN IF NOT EXISTS jsonl_url TEXT,
ADD COLUMN IF NOT EXISTS jsonl_file_path TEXT,
ADD COLUMN IF NOT EXISTS jsonl_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS jsonl_error TEXT;

-- Index for faster job lookups
CREATE INDEX IF NOT EXISTS documents_jsonl_job_id_idx ON documents(jsonl_job_id) WHERE jsonl_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_jsonl_status_idx ON documents(jsonl_status) WHERE jsonl_status != 'idle';

-- Prevent duplicate active jobs for same document
CREATE UNIQUE INDEX IF NOT EXISTS documents_active_jsonl_job_idx 
ON documents(id) 
WHERE jsonl_status = 'generating';

-- Comment for documentation
COMMENT ON COLUMN documents.jsonl_status IS 'Status of JSONL generation: idle, generating, completed, failed';
COMMENT ON COLUMN documents.jsonl_job_id IS 'Unique job ID for background JSONL generation task';
COMMENT ON COLUMN documents.jsonl_url IS 'Storage path for generated JSONL file';
COMMENT ON COLUMN documents.jsonl_file_path IS 'Storage path for original uploaded file';
COMMENT ON COLUMN documents.jsonl_error IS 'Error message if generation failed';
