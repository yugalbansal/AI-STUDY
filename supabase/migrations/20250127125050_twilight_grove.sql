/*
  # Force Schema Refresh and Table Recreation
  
  1. Changes:
    - Drop and recreate documents table with correct structure
    - Force schema cache refresh
    - Reapply RLS policies
*/

-- Drop existing table completely
DROP TABLE IF EXISTS documents CASCADE;

-- Recreate table with all required columns
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  type text NOT NULL DEFAULT 'file',
  url text,
  CONSTRAINT documents_type_check CHECK (type IN ('file', 'link')),
  CONSTRAINT documents_url_check CHECK (
    (type = 'link' AND url IS NOT NULL AND url ~ '^https?://') OR
    (type = 'file' AND url IS NULL)
  )
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Force schema cache refresh
SELECT schema_cache_reload();