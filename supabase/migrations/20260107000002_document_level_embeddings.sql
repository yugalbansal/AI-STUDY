-- =========================================================
-- Document-level embeddings + layered retrieval RPCs
-- Adds a document embedding for fast "which doc?" routing,
-- then retrieves chunks only from the best docs.
-- =========================================================

-- Ensure pgvector is available
CREATE EXTENSION IF NOT EXISTS vector;

-- 1) Documents table: add embedding column (vector 1536)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'embedding'
  ) THEN
    ALTER TABLE public.documents
      ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- 2) Vector index for document routing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'documents_vector_idx'
  ) THEN
    CREATE INDEX documents_vector_idx
      ON public.documents
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;

-- 3) Doc-level search function
CREATE OR REPLACE FUNCTION public.search_similar_documents_index(
  query_embedding vector(1536),
  user_id_param uuid,
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  document_id uuid,
  title text,
  type text,
  url text,
  similarity float,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS document_id,
    d.title,
    d.type,
    d.url,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.updated_at
  FROM public.documents d
  WHERE d.user_id = user_id_param
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4) Chunk-level search function with optional document_id filter
CREATE OR REPLACE FUNCTION public.search_similar_document_chunks_filtered(
  query_embedding vector(1536),
  user_id_param uuid,
  document_ids uuid[] DEFAULT NULL,
  similarity_threshold float DEFAULT 0.3,
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
  FROM public.document_embeddings de
  WHERE de.user_id = user_id_param
    AND (document_ids IS NULL OR de.document_id = ANY(document_ids))
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
