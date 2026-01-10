-- ================================================================
-- CLERK MIGRATION - CRITICAL SCHEMA CHANGES
-- ================================================================
-- This migration converts your auth system from Supabase Auth to Clerk
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS
-- ================================================================

-- ⚠️ WARNING: This migration will modify your users table and all related tables
-- ⚠️ Make sure you have a backup before running this migration

-- Increase memory limit for this session (for column type conversions)
SET maintenance_work_mem = '128MB';

-- ================================================================
-- STEP 0: Drop all existing RLS policies FIRST
-- ================================================================
-- PostgreSQL won't let you alter column types if policies depend on them

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Now disable RLS (after policies are dropped)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 1: Create new users table with Clerk user ID
-- ================================================================

-- Rename old users table
ALTER TABLE users RENAME TO users_old;

-- Create new users table with text ID (Clerk user ID)
CREATE TABLE users (
  id text PRIMARY KEY, -- Clerk user ID (user_xxx)
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  last_seen timestamptz,
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ================================================================
-- STEP 2: Drop all foreign key constraints FIRST
-- ================================================================
-- Must drop constraints before altering column types to avoid validation errors

ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE chat_history DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE chat_embeddings DROP CONSTRAINT IF EXISTS chat_embeddings_user_id_fkey;
ALTER TABLE document_embeddings DROP CONSTRAINT IF EXISTS document_embeddings_user_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    EXECUTE 'ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey';
  END IF;
END $$;

-- ================================================================
-- STEP 3: Alter column types to TEXT (for Clerk user IDs)
-- ================================================================

-- CHATS table
ALTER TABLE chats ALTER COLUMN user_id TYPE text USING user_id::text;

-- CHAT_MESSAGES table
ALTER TABLE chat_messages ALTER COLUMN user_id TYPE text USING user_id::text;

-- CHAT_HISTORY table
ALTER TABLE chat_history ALTER COLUMN user_id TYPE text USING user_id::text;

-- DOCUMENTS table
ALTER TABLE documents ALTER COLUMN user_id TYPE text USING user_id::text;

-- CHAT_EMBEDDINGS table
ALTER TABLE chat_embeddings ALTER COLUMN user_id TYPE text USING user_id::text;

-- DOCUMENT_EMBEDDINGS table
ALTER TABLE document_embeddings ALTER COLUMN user_id TYPE text USING user_id::text;

-- USER_SESSIONS table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    EXECUTE 'ALTER TABLE user_sessions ALTER COLUMN user_id TYPE text USING user_id::text';
  END IF;
END $$;

-- ================================================================
-- STEP 4: Recreate foreign key constraints (NOT VALID for existing data)
-- ================================================================
-- NOT VALID means constraints won't check existing data (old UUIDs)
-- Only new inserts will be validated

ALTER TABLE chats ADD CONSTRAINT chats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE chat_history ADD CONSTRAINT chat_history_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE chat_embeddings ADD CONSTRAINT chat_embeddings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE document_embeddings ADD CONSTRAINT document_embeddings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    EXECUTE 'ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID';
  END IF;
END $$;

-- ================================================================
-- STEP 5: Drop old Supabase Auth trigger and function
-- ================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ================================================================
-- STEP 6: Create new RLS policies using Clerk JWT
-- ================================================================
-- Note: Policies were already dropped in STEP 0

-- ================================================================
-- USERS TABLE POLICIES
-- ================================================================
-- Note: Using auth.jwt()->>'sub' to get Clerk user ID

CREATE POLICY "users_select_all"
  ON users FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = id)
  WITH CHECK ((auth.jwt()->>'sub')::text = id);

-- ================================================================
-- CHATS TABLE POLICIES
-- ================================================================

CREATE POLICY "chats_select_own"
  ON chats FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chats_select_admin"
  ON chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chats_insert_own"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chats_update_own"
  ON chats FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chats_update_admin"
  ON chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chats_delete_own"
  ON chats FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chats_delete_admin"
  ON chats FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- CHAT_MESSAGES TABLE POLICIES
-- ================================================================

CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_messages_select_admin"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_messages_update_own"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_messages_update_admin"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_messages_delete_admin"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- CHAT_HISTORY TABLE POLICIES
-- ================================================================

CREATE POLICY "chat_history_select_own"
  ON chat_history FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_history_select_admin"
  ON chat_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_history_insert_own"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_history_update_own"
  ON chat_history FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_history_update_admin"
  ON chat_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_history_delete_own"
  ON chat_history FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_history_delete_admin"
  ON chat_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- DOCUMENTS TABLE POLICIES
-- ================================================================

CREATE POLICY "documents_select_own"
  ON documents FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "documents_select_admin"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "documents_insert_own"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "documents_update_own"
  ON documents FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "documents_update_admin"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "documents_delete_own"
  ON documents FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "documents_delete_admin"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- CHAT_EMBEDDINGS TABLE POLICIES
-- ================================================================

CREATE POLICY "chat_embeddings_select_own"
  ON chat_embeddings FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_embeddings_select_admin"
  ON chat_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_embeddings_insert_own"
  ON chat_embeddings FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_embeddings_update_own"
  ON chat_embeddings FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_embeddings_update_admin"
  ON chat_embeddings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "chat_embeddings_delete_own"
  ON chat_embeddings FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "chat_embeddings_delete_admin"
  ON chat_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- DOCUMENT_EMBEDDINGS TABLE POLICIES
-- ================================================================

CREATE POLICY "document_embeddings_select_own"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "document_embeddings_select_admin"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "document_embeddings_insert_own"
  ON document_embeddings FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "document_embeddings_update_own"
  ON document_embeddings FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "document_embeddings_update_admin"
  ON document_embeddings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

CREATE POLICY "document_embeddings_delete_own"
  ON document_embeddings FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'sub')::text = user_id);

CREATE POLICY "document_embeddings_delete_admin"
  ON document_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (auth.jwt()->>'sub')::text 
      AND role = 'admin'
    )
  );

-- ================================================================
-- USER_SESSIONS TABLE POLICIES (if exists)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    EXECUTE '
      CREATE POLICY "user_sessions_select_own"
        ON user_sessions FOR SELECT
        TO authenticated
        USING ((auth.jwt()->>''sub'')::text = user_id);

      CREATE POLICY "user_sessions_select_admin"
        ON user_sessions FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = (auth.jwt()->>''sub'')::text 
            AND role = ''admin''
          )
        );

      CREATE POLICY "user_sessions_insert_own"
        ON user_sessions FOR INSERT
        TO authenticated
        WITH CHECK ((auth.jwt()->>''sub'')::text = user_id);

      CREATE POLICY "user_sessions_update_own"
        ON user_sessions FOR UPDATE
        TO authenticated
        USING ((auth.jwt()->>''sub'')::text = user_id);

      CREATE POLICY "user_sessions_update_admin"
        ON user_sessions FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = (auth.jwt()->>''sub'')::text 
            AND role = ''admin''
          )
        );

      CREATE POLICY "user_sessions_delete_own"
        ON user_sessions FOR DELETE
        TO authenticated
        USING ((auth.jwt()->>''sub'')::text = user_id);

      CREATE POLICY "user_sessions_delete_admin"
        ON user_sessions FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = (auth.jwt()->>''sub'')::text 
            AND role = ''admin''
          )
        );
    ';
  END IF;
END $$;

-- ================================================================
-- STEP 7: Re-enable RLS
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    EXECUTE 'ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ================================================================
-- STEP 8: Create helper function to sync user from Clerk
-- ================================================================

CREATE OR REPLACE FUNCTION public.sync_clerk_user(
  clerk_user_id text,
  user_email text,
  user_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Determine role (customize this for your admin user)
  DECLARE
    user_role text := CASE 
      WHEN user_email = 'studyai.platform@gmail.com' THEN 'admin' 
      ELSE 'user' 
    END;
  BEGIN
    INSERT INTO public.users (id, email, full_name, role, last_seen, is_online)
    VALUES (
      clerk_user_id,
      user_email,
      COALESCE(user_name, split_part(user_email, '@', 1)),
      user_role,
      NOW(),
      true
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = COALESCE(EXCLUDED.email, users.email),
      full_name = COALESCE(EXCLUDED.full_name, users.full_name),
      last_seen = NOW(),
      is_online = true;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_clerk_user TO authenticated, anon;

-- ================================================================
-- STEP 9: Drop old users table (ONLY after confirming everything works)
-- ================================================================

-- UNCOMMENT THIS AFTER TESTING:
-- DROP TABLE users_old;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- Next steps:
-- 1. Test user sync by signing in with Clerk
-- 2. Verify RLS policies work correctly
-- 3. Test all CRUD operations
-- 4. Monitor for errors for 24-48 hours
-- 5. Drop users_old table after confirming everything works
