-- Update existing documents and embeddings with Clerk user_id
-- Replace 'OLD_SUPABASE_UUID' with your actual old Supabase user ID
-- Replace 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX' with your actual Clerk user ID

-- IMPORTANT: Update these values before running!
-- You can find your old user_id by running: SELECT DISTINCT user_id FROM documents LIMIT 5;
-- Your Clerk user_id is shown in the console logs when you sign in

DO $$
DECLARE
  old_user_id TEXT := 'REPLACE_WITH_OLD_UUID';  -- Your old Supabase Auth UUID
  new_user_id TEXT := 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX';  -- Your Clerk user ID
BEGIN
  -- Update documents table
  UPDATE documents 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;
  
  RAISE NOTICE 'Updated % documents', (SELECT COUNT(*) FROM documents WHERE user_id = new_user_id);

  -- Update document_embeddings table
  UPDATE document_embeddings 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;
  
  RAISE NOTICE 'Updated % document embeddings', (SELECT COUNT(*) FROM document_embeddings WHERE user_id = new_user_id);

  -- Update chats table
  UPDATE chats 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;
  
  RAISE NOTICE 'Updated % chats', (SELECT COUNT(*) FROM chats WHERE user_id = new_user_id);

  -- Update chat_embeddings table
  UPDATE chat_embeddings 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;
  
  RAISE NOTICE 'Updated % chat embeddings', (SELECT COUNT(*) FROM chat_embeddings WHERE user_id = new_user_id);
END $$;

-- Verify the updates
SELECT 'documents' as table_name, COUNT(*) as count FROM documents WHERE user_id = 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX'
UNION ALL
SELECT 'document_embeddings', COUNT(*) FROM document_embeddings WHERE user_id = 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX'
UNION ALL
SELECT 'chats', COUNT(*) FROM chats WHERE user_id = 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX'
UNION ALL
SELECT 'chat_embeddings', COUNT(*) FROM chat_embeddings WHERE user_id = 'user_385Pq5Wy3fKaxp3zb8sKXHFyGlX';
