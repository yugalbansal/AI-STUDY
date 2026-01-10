-- ================================================================
-- CLERK MIGRATION - RLS POLICY TESTING SCRIPT
-- ================================================================
-- Use this script to test that RLS policies are working correctly
-- Run each section separately in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- TEST 1: Verify Tables Have RLS Enabled
-- ================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'chats', 'chat_messages', 'documents', 'chat_embeddings', 'document_embeddings')
ORDER BY tablename;

-- All tables should show rls_enabled = true

-- ================================================================
-- TEST 2: Verify Policies Use Clerk JWT (not auth.uid())
-- ================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check that USING clauses contain: auth.jwt()->>'sub'
-- NOT: auth.uid()

-- ================================================================
-- TEST 3: Simulate User A (Regular User)
-- ================================================================

-- Set JWT claim to simulate Clerk user ID
SELECT set_config('request.jwt.claims', '{"sub":"user_test_a", "role":"authenticated"}', true);

-- Try to read users table (should work - all users can read)
SELECT id, email, role FROM users LIMIT 5;

-- Try to insert user (should only work if id matches JWT sub)
INSERT INTO users (id, email, full_name, role) 
VALUES ('user_test_a', 'test-a@example.com', 'Test User A', 'user');

-- Try to insert as different user (should FAIL)
-- UNCOMMENT to test:
-- INSERT INTO users (id, email, full_name, role) 
-- VALUES ('user_test_b', 'test-b@example.com', 'Test User B', 'user');
-- Expected: RLS policy violation

-- Create a chat as user_test_a
INSERT INTO chats (id, title, user_id) 
VALUES ('chat_test_a', 'Test Chat A', 'user_test_a');

-- Query chats (should only see user_test_a's chats)
SELECT * FROM chats WHERE user_id = 'user_test_a';

-- Try to query another user's chats (should return empty)
SELECT * FROM chats WHERE user_id = 'user_test_b';

-- ================================================================
-- TEST 4: Simulate User B (Regular User)
-- ================================================================

-- Switch to user_test_b
SELECT set_config('request.jwt.claims', '{"sub":"user_test_b", "role":"authenticated"}', true);

-- Insert user_test_b
INSERT INTO users (id, email, full_name, role) 
VALUES ('user_test_b', 'test-b@example.com', 'Test User B', 'user')
ON CONFLICT (id) DO NOTHING;

-- Create a chat as user_test_b
INSERT INTO chats (id, title, user_id) 
VALUES ('chat_test_b', 'Test Chat B', 'user_test_b');

-- Query chats (should only see user_test_b's chats)
SELECT * FROM chats;

-- Try to access user_test_a's chat (should return empty or fail)
SELECT * FROM chats WHERE id = 'chat_test_a';

-- Try to update user_test_a's chat (should FAIL)
-- UNCOMMENT to test:
-- UPDATE chats SET title = 'Hacked Chat' WHERE id = 'chat_test_a';
-- Expected: RLS policy violation or 0 rows updated

-- ================================================================
-- TEST 5: Simulate Admin User
-- ================================================================

-- Create admin user first
SELECT set_config('request.jwt.claims', '{"sub":"user_admin", "role":"authenticated"}', true);

INSERT INTO users (id, email, full_name, role) 
VALUES ('user_admin', 'admin@example.com', 'Admin User', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Switch to admin context
SELECT set_config('request.jwt.claims', '{"sub":"user_admin", "role":"authenticated"}', true);

-- Admin should see ALL chats
SELECT * FROM chats;

-- Should see both user_test_a and user_test_b chats
-- Count should be >= 2

-- Admin should be able to update any chat
UPDATE chats SET title = 'Updated by Admin' WHERE id = 'chat_test_a';

-- Verify update worked
SELECT id, title, user_id FROM chats WHERE id = 'chat_test_a';
-- Should show "Updated by Admin"

-- Admin should be able to delete any chat
-- UNCOMMENT to test:
-- DELETE FROM chats WHERE id = 'chat_test_b';

-- ================================================================
-- TEST 6: Test Document RLS
-- ================================================================

-- As user_test_a
SELECT set_config('request.jwt.claims', '{"sub":"user_test_a", "role":"authenticated"}', true);

-- Insert document
INSERT INTO documents (id, title, content, user_id) 
VALUES ('doc_test_a', 'Test Document A', 'Content A', 'user_test_a');

-- Query documents (should only see user_test_a's documents)
SELECT * FROM documents WHERE user_id = 'user_test_a';

-- As user_test_b
SELECT set_config('request.jwt.claims', '{"sub":"user_test_b", "role":"authenticated"}', true);

-- Insert document
INSERT INTO documents (id, title, content, user_id) 
VALUES ('doc_test_b', 'Test Document B', 'Content B', 'user_test_b');

-- Query documents (should only see user_test_b's documents)
SELECT * FROM documents;

-- Try to access user_test_a's document (should return empty)
SELECT * FROM documents WHERE id = 'doc_test_a';

-- ================================================================
-- TEST 7: Test sync_clerk_user Function
-- ================================================================

-- Call sync function as authenticated user
SELECT set_config('request.jwt.claims', '{"sub":"user_clerk_test", "role":"authenticated"}', true);

SELECT sync_clerk_user(
  'user_clerk_test',
  'clerk-test@example.com',
  'Clerk Test User'
);

-- Verify user was created
SELECT * FROM users WHERE id = 'user_clerk_test';
-- Should show the new user

-- Call sync again (should update, not error)
SELECT sync_clerk_user(
  'user_clerk_test',
  'clerk-test-updated@example.com',
  'Clerk Test User Updated'
);

-- Verify user was updated
SELECT * FROM users WHERE id = 'user_clerk_test';
-- Should show updated email

-- ================================================================
-- TEST 8: Verify Foreign Key Constraints
-- ================================================================

-- Try to insert chat with non-existent user (should FAIL)
-- UNCOMMENT to test:
-- INSERT INTO chats (id, title, user_id) 
-- VALUES ('chat_invalid', 'Invalid Chat', 'user_nonexistent');
-- Expected: Foreign key violation

-- Try to insert document with non-existent user (should FAIL)
-- UNCOMMENT to test:
-- INSERT INTO documents (id, title, content, user_id) 
-- VALUES ('doc_invalid', 'Invalid Doc', 'Content', 'user_nonexistent');
-- Expected: Foreign key violation

-- ================================================================
-- TEST 9: Test Cascade Delete
-- ================================================================

-- Create test user and data
SELECT set_config('request.jwt.claims', '{"sub":"user_delete_test", "role":"authenticated"}', true);

INSERT INTO users (id, email, full_name, role) 
VALUES ('user_delete_test', 'delete-test@example.com', 'Delete Test User', 'user');

INSERT INTO chats (id, title, user_id) 
VALUES ('chat_delete_test', 'Delete Test Chat', 'user_delete_test');

INSERT INTO documents (id, title, content, user_id) 
VALUES ('doc_delete_test', 'Delete Test Doc', 'Content', 'user_delete_test');

-- Verify data exists
SELECT 'User' as type, COUNT(*) as count FROM users WHERE id = 'user_delete_test'
UNION ALL
SELECT 'Chats', COUNT(*) FROM chats WHERE user_id = 'user_delete_test'
UNION ALL
SELECT 'Docs', COUNT(*) FROM documents WHERE user_id = 'user_delete_test';

-- Delete user (should cascade delete chats and documents)
DELETE FROM users WHERE id = 'user_delete_test';

-- Verify all related data was deleted
SELECT 'User' as type, COUNT(*) as count FROM users WHERE id = 'user_delete_test'
UNION ALL
SELECT 'Chats', COUNT(*) FROM chats WHERE user_id = 'user_delete_test'
UNION ALL
SELECT 'Docs', COUNT(*) FROM documents WHERE user_id = 'user_delete_test';
-- All counts should be 0

-- ================================================================
-- CLEANUP: Remove Test Data
-- ================================================================

-- Remove test users and their data
DELETE FROM users WHERE id IN ('user_test_a', 'user_test_b', 'user_admin', 'user_clerk_test');
DELETE FROM chats WHERE id IN ('chat_test_a', 'chat_test_b');
DELETE FROM documents WHERE id IN ('doc_test_a', 'doc_test_b');

-- Clear JWT config
SELECT set_config('request.jwt.claims', NULL, true);

-- ================================================================
-- SUMMARY: What to Check
-- ================================================================

/*
✅ All tables have RLS enabled
✅ All policies use auth.jwt()->>'sub' (not auth.uid())
✅ Regular users can only see their own data
✅ Regular users cannot access other users' data
✅ Regular users cannot update/delete other users' data
✅ Admin users can see all data
✅ Admin users can update/delete all data
✅ Foreign key constraints work
✅ Cascade delete works
✅ sync_clerk_user function works
✅ sync_clerk_user handles conflicts (upsert)

If any test fails, review the migration SQL and RLS policies.
*/

-- ================================================================
-- BONUS: Quick RLS Status Check
-- ================================================================

-- Run this anytime to verify RLS status
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('users', 'chats', 'chat_messages', 'chat_history', 'documents', 'chat_embeddings', 'document_embeddings')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Expected:
-- users: rls_enabled = true, policy_count >= 3
-- chats: rls_enabled = true, policy_count >= 7
-- chat_messages: rls_enabled = true, policy_count >= 7
-- documents: rls_enabled = true, policy_count >= 7
-- chat_embeddings: rls_enabled = true, policy_count >= 7
-- document_embeddings: rls_enabled = true, policy_count >= 7
