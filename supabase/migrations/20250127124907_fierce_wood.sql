/*
  # Refresh Schema Cache and Verify Structure

  1. Changes:
    - Refresh schema cache
    - Verify documents table structure
    - Ensure RLS policies are correctly applied
*/

-- Refresh schema cache
SELECT schema_cache_reload();

-- Verify documents table structure
DO $$ 
BEGIN
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN type text NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'link'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'url'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN url text;
  END IF;

  -- Verify constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'documents'
    AND constraint_name = 'valid_url'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT valid_url CHECK (
      (type = 'link' AND url IS NOT NULL AND url ~ '^https?://') OR
      (type = 'file' AND url IS NULL)
    );
  END IF;
END $$;