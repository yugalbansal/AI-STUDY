-- Recreate search functions with TEXT user_id parameters
-- Matching the exact signatures expected by the TypeScript code

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
    ce.message,
    ce.response,
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

CREATE OR REPLACE FUNCTION search_similar_documents(
  query_embedding vector(1536),
  user_id_param text,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
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
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_documents_index(
  query_embedding vector(1536),
  user_id_param text,
  similarity_threshold double precision DEFAULT 0.25,
  match_count integer DEFAULT 4
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
  SELECT
    d.id AS document_id,
    d.title,
    d.url
  FROM documents d
  WHERE d.user_id = user_id_param
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

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
    SELECT DISTINCT
      d.id AS document_id,
      d.title,
      d.url,
      (1 - (d.embedding <=> query_embedding))::double precision AS similarity
    FROM documents d
    WHERE d.user_id = user_id_param
      AND d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> query_embedding))::double precision > similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword_results AS (
    SELECT DISTINCT
      d.id AS document_id,
      d.title,
      d.url,
      0.5::double precision AS similarity
    FROM documents d
    WHERE d.user_id = user_id_param
      AND (d.content ILIKE '%' || query_text || '%' OR d.title ILIKE '%' || query_text || '%')
    LIMIT match_count
  )
  SELECT s.document_id, s.title, s.url
  FROM semantic_results s
  UNION
  SELECT k.document_id, k.title, k.url
  FROM keyword_results k
  WHERE NOT EXISTS (SELECT 1 FROM semantic_results WHERE document_id = k.document_id);
END;
$$;
