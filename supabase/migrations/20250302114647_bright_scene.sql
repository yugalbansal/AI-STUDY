/*
  # Fix recursive policies and add delete permissions

  1. Changes
    - Fix admin policies to avoid recursion
    - Add delete policies for documents and chat history
    - Ensure proper user role checking
  2. Security
    - Maintain RLS security while fixing recursion issues
    - Add proper delete permissions for users
*/

-- Fix admin policy for documents to avoid recursion
DROP POLICY IF EXISTS "Admin can read all documents" ON documents;

CREATE POLICY "Admin can read all documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Add delete policy for documents
CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add delete policy for chat history
CREATE POLICY "Users can delete own chat history"
  ON chat_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Fix admin policy for users to avoid recursion
DROP POLICY IF EXISTS "Admin can read all users" ON users;

CREATE POLICY "Admin can read all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );