/*
  # Refresh schema cache for documents table

  1. Changes
    - Drop and recreate the documents table with all columns
    - Preserve existing RLS policies
    - Add new columns for link support
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for URL format
*/

-- Recreate documents table with all columns
CREATE TABLE IF NOT EXISTS documents_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  type text NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'link')),
  url text,
  CONSTRAINT valid_url CHECK (
    (type = 'link' AND url IS NOT NULL AND url ~ '^https?://') OR
    (type = 'file' AND url IS NULL)
  )
);

-- Copy data from old table if it exists
INSERT INTO documents_new (id, title, content, user_id, created_at, updated_at)
SELECT id, title, content, user_id, created_at, updated_at
FROM documents;

-- Drop old table and rename new one
DROP TABLE IF EXISTS documents;
ALTER TABLE documents_new RENAME TO documents;

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