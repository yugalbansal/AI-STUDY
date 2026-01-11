-- Fix RPC functions to use correct column names from actual schema

-- Drop functions first since return types are changing
DROP FUNCTION IF EXISTS search_similar_chat_messages(vector, text, uuid, double precision, integer);
DROP FUNCTION IF EXISTS search_similar_documents(vector, text, double precision, integer);
DROP FUNCTION IF EXISTS search_similar_documents_index_hybrid(text, vector, text, integer, double precision);

-- Fix search_similar_chat_messages to use 'content' and 'message_type' columns
CREATE OR REPLACE FUNCTION search_similar_chat_messages(
  query_embedding vector(1536),
  user_id_param text,
  chat_id_param uuid DEFAULT NULL,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
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
    CASE WHEN ce.message_type = 'user' THEN ce.content ELSE '' END AS message,
    CASE WHEN ce.message_type = 'assistant' THEN ce.content ELSE '' END AS response,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.created_at
  FROM chat_embeddings ce
  JOIN chats c ON ce.chat_id = c.id
  WHERE c.user_id = user_id_param
    AND (chat_id_param IS NULL OR ce.chat_id = chat_id_param)
    AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix search_similar_documents to use 'content_chunk' column and return correct field names
CREATE OR REPLACE FUNCTION search_similar_documents(
  query_embedding vector(1536),
  user_id_param text,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content_chunk text,
  chunk_index integer,
  similarity double precision,
  document_title text,
  document_url text,
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
    d.title AS document_title,
    d.url AS document_url,
    de.created_at
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE d.user_id = user_id_param
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix search_similar_documents_index_hybrid - remove ORDER BY from subquery with DISTINCT
CREATE OR REPLACE FUNCTION search_similar_documents_index_hybrid(
  query_text text,
  query_embedding vector(1536),
  user_id_param text,
  match_count integer DEFAULT 4,
  similarity_threshold double precision DEFAULT 0.25
)
RETURNS TABLE (
  document_id uuid,
  title text,
  url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT DISTINCT ON (d.id)
      d.id AS doc_id,
      d.title AS doc_title,
      d.url AS doc_url,
      (1 - (d.embedding <=> query_embedding))::double precision AS similarity
    FROM documents d
    WHERE d.user_id = user_id_param
      AND d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> query_embedding))::double precision > similarity_threshold
    ORDER BY d.id, d.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword_results AS (
    SELECT DISTINCT
      d.id AS doc_id,
      d.title AS doc_title,
      d.url AS doc_url
    FROM documents d
    WHERE d.user_id = user_id_param
      AND (d.content ILIKE '%' || query_text || '%' OR d.title ILIKE '%' || query_text || '%')
    LIMIT match_count
  )
  SELECT s.doc_id, s.doc_title, s.doc_url
  FROM semantic_results s
  UNION
  SELECT k.doc_id, k.doc_title, k.doc_url
  FROM keyword_results k
  WHERE NOT EXISTS (SELECT 1 FROM semantic_results WHERE doc_id = k.doc_id);
END;
$$;
