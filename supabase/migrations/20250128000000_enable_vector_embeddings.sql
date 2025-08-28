/*
  # Enable Vector Embeddings for AI Chat Memory
  
  1. Enable pgvector extension
  2. New Tables:
    - chat_embeddings: Store embeddings for chat messages to enable semantic search
    - document_embeddings: Store embeddings for document content
    - user_sessions: Track conversation sessions for context
  
  3. Security:
    - Enable RLS on all new tables
    - Add policies for user access control
*/

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_sessions table to track conversation contexts
-- Note: Using existing users and chats tables
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  session_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_embeddings table for message embeddings
CREATE TABLE chat_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(768), -- 768 dimensions for all-mpnet-base-v2
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now()
);

-- Create document_embeddings table for document content embeddings
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content_chunk text NOT NULL,
  embedding vector(768), -- 768 dimensions for all-mpnet-base-v2
  chunk_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for vector similarity search
CREATE INDEX chat_embeddings_vector_idx ON chat_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX document_embeddings_vector_idx ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create indexes for filtering
CREATE INDEX chat_embeddings_user_id_idx ON chat_embeddings(user_id);
CREATE INDEX chat_embeddings_chat_id_idx ON chat_embeddings(chat_id);
CREATE INDEX document_embeddings_user_id_idx ON document_embeddings(user_id);
CREATE INDEX document_embeddings_document_id_idx ON document_embeddings(document_id);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
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

-- RLS Policies for chat_embeddings
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

-- RLS Policies for document_embeddings
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

-- Function to search similar chat messages
CREATE OR REPLACE FUNCTION search_similar_chat_messages(
  query_embedding vector(768),
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

-- Function to search similar document content
CREATE OR REPLACE FUNCTION search_similar_documents(
  query_embedding vector(768),
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

-- Function to update session summary
CREATE OR REPLACE FUNCTION update_session_summary()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating session timestamp
CREATE TRIGGER update_session_summary_trigger
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_summary();
