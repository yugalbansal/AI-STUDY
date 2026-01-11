-- Migration: Convert user_id from UUID to TEXT for Clerk compatibility
-- This updates all RPC functions to accept TEXT user IDs instead of UUIDs

-- Drop existing functions (will recreate with TEXT params)
DROP FUNCTION IF EXISTS search_similar_documents(vector(1536), uuid, integer, double precision);
DROP FUNCTION IF EXISTS search_similar_chat_messages(vector(1536), uuid, integer, double precision);
DROP FUNCTION IF EXISTS search_similar_documents_index(vector(1536), uuid, integer, double precision);
DROP FUNCTION IF EXISTS search_similar_documents_index_hybrid(text, vector(1536), uuid, integer, integer, double precision);

-- Recreate search_similar_documents with TEXT user_id
CREATE OR REPLACE FUNCTION search_similar_documents(
  query_embedding vector(1536),
  user_id_param text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity double precision,
  document_title text,
  document_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    d.type AS document_type
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE d.user_id = user_id_param
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate search_similar_chat_messages with TEXT user_id
CREATE OR REPLACE FUNCTION search_similar_chat_messages(
  query_embedding vector(1536),
  user_id_param text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  chat_id uuid,
  message text,
  response text,
  similarity double precision,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.chat_id,
    ce.message,
    ce.response,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.created_at
  FROM chat_embeddings ce
  JOIN chats c ON ce.chat_id = c.id
  WHERE c.user_id = user_id_param
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate search_similar_documents_index with TEXT user_id
CREATE OR REPLACE FUNCTION search_similar_documents_index(
  query_embedding vector(1536),
  user_id_param text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
  document_id uuid,
  title text,
  type text,
  similarity double precision,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.document_id,
    di.title,
    di.type,
    1 - (di.embedding <=> query_embedding) AS similarity,
    di.created_at
  FROM document_index di
  JOIN documents d ON di.document_id = d.id
  WHERE d.user_id = user_id_param
    AND 1 - (di.embedding <=> query_embedding) > match_threshold
  ORDER BY di.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate search_similar_documents_index_hybrid with TEXT user_id
CREATE OR REPLACE FUNCTION search_similar_documents_index_hybrid(
  query_text text,
  query_embedding vector(1536),
  user_id_param text,
  match_count_semantic integer DEFAULT 5,
  match_count_keyword integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE (
  document_id uuid,
  title text,
  type text,
  similarity double precision,
  created_at timestamptz,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT
      di.document_id,
      di.title,
      di.type,
      (1 - (di.embedding <=> query_embedding))::double precision AS similarity,
      di.created_at,
      'semantic'::text AS match_type
    FROM document_index di
    JOIN documents d ON di.document_id = d.id
    WHERE d.user_id = user_id_param
      AND (1 - (di.embedding <=> query_embedding))::double precision > match_threshold
    ORDER BY di.embedding <=> query_embedding
    LIMIT match_count_semantic
  ),
  keyword_results AS (
    SELECT
      di.document_id,
      di.title,
      di.type,
      ts_rank(di.fts, plainto_tsquery('english', query_text))::double precision AS similarity,
      di.created_at,
      'keyword'::text AS match_type
    FROM document_index di
    JOIN documents d ON di.document_id = d.id
    WHERE d.user_id = user_id_param
      AND di.fts @@ plainto_tsquery('english', query_text)
    ORDER BY ts_rank(di.fts, plainto_tsquery('english', query_text)) DESC
    LIMIT match_count_keyword
  )
  SELECT * FROM semantic_results
  UNION ALL
  SELECT * FROM keyword_results
  ORDER BY similarity DESC;
END;
$$;
