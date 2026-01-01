-- =========================================================
-- PRODUCTION FIX
-- Reset embeddings to vector(1536) for openai/text-embedding-3-small
-- =========================================================

-- -------------------------------
-- 1. DROP DEPENDENT TRIGGERS FIRST
-- -------------------------------
DROP TRIGGER IF EXISTS update_session_summary_trigger ON user_sessions;

-- -------------------------------
-- 2. DROP FUNCTIONS
-- -------------------------------
DROP FUNCTION IF EXISTS search_similar_chat_messages(vector(768), uuid, uuid, float, int);
DROP FUNCTION IF EXISTS search_similar_documents(vector(768), uuid, float, int);
DROP FUNCTION IF EXISTS update_session_summary();

-- -------------------------------
-- 3. DROP TABLES
-- -------------------------------
DROP TABLE IF EXISTS chat_embeddings CASCADE;
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- -------------------------------
-- 4. RECREATE TABLES
-- -------------------------------

-- user_sessions (no vector dependency)
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  session_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- chat_embeddings (vector 1536)
CREATE TABLE chat_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now()
);

-- document_embeddings (vector 1536)
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content_chunk text NOT NULL,
  embedding vector(1536),
  chunk_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- -------------------------------
-- 5. VECTOR INDEXES
-- -------------------------------
CREATE INDEX chat_embeddings_vector_idx
ON chat_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX document_embeddings_vector_idx
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- -------------------------------
-- 6. STANDARD INDEXES
-- -------------------------------
CREATE INDEX chat_embeddings_user_id_idx ON chat_embeddings(user_id);
CREATE INDEX chat_embeddings_chat_id_idx ON chat_embeddings(chat_id);
CREATE INDEX document_embeddings_user_id_idx ON document_embeddings(user_id);
CREATE INDEX document_embeddings_document_id_idx ON document_embeddings(document_id);

-- -------------------------------
-- 7. ENABLE RLS
-- -------------------------------
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- -------------------------------
-- 8. RLS POLICIES
-- -------------------------------

-- user_sessions
CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- chat_embeddings
CREATE POLICY "Users can read own chat embeddings"
  ON chat_embeddings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat embeddings"
  ON chat_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- document_embeddings
CREATE POLICY "Users can read own document embeddings"
  ON document_embeddings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own document embeddings"
  ON document_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- -------------------------------
-- 9. SEARCH FUNCTIONS (vector 1536)
-- -------------------------------

CREATE OR REPLACE FUNCTION search_similar_chat_messages(
  query_embedding vector(1536),
  user_id_param uuid,
  chat_id_param uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  message_type text,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.content,
    ce.message_type,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.created_at
  FROM chat_embeddings ce
  WHERE ce.user_id = user_id_param
    AND (chat_id_param IS NULL OR ce.chat_id = chat_id_param)
    AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_documents(
  query_embedding vector(1536),
  user_id_param uuid,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content_chunk text,
  chunk_index integer,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content_chunk,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.created_at
  FROM document_embeddings de
  WHERE de.user_id = user_id_param
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- -------------------------------
-- 10. UPDATE TRIGGER
-- -------------------------------
CREATE OR REPLACE FUNCTION update_session_summary()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_summary_trigger
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_summary();
