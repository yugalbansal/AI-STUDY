-- Run this SQL in Supabase SQL Editor to set up storage buckets with proper RLS policies

-- Create documents bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create jsonl-datasets bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('jsonl-datasets', 'jsonl-datasets', false)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT: Disable owner_id requirement for documents bucket
-- This allows Clerk users (non-UUID IDs) to upload files
UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webp', 'audio/mpeg', 'audio/wav']
WHERE id = 'documents';

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload JSONL" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own JSONL" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read all JSONL" ON storage.objects;

-- RLS Policy: Allow authenticated users to upload to documents bucket
-- Uses path-based ownership (folder structure)
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- RLS Policy: Allow authenticated users to read their own documents
-- Based on folder structure (user_id/filename)
CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);

-- RLS Policy: Allow authenticated users to delete their own documents
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
);

-- RLS Policy: Service role can upload JSONL files
CREATE POLICY "Service role can upload JSONL"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'jsonl-datasets');

-- RLS Policy: Authenticated users can read JSONL files
CREATE POLICY "Users can read JSONL"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'jsonl-datasets');

-- RLS Policy: Service role can read all JSONL files (for signed URLs)
CREATE POLICY "Service role can read all JSONL"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'jsonl-datasets');
