/*
  # Add links support to documents

  1. Changes
    - Add `type` column to documents table
    - Add `url` column for storing links
    - Update RLS policies
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for URL format
*/

-- Add new columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'link')),
ADD COLUMN IF NOT EXISTS url text,
ADD CONSTRAINT valid_url CHECK (
  (type = 'link' AND url IS NOT NULL AND url ~ '^https?://') OR
  (type = 'file' AND url IS NULL)
);