-- =========================================================
-- Hybrid Retrieval Upgrade (Dense + Sparse)
-- Adds tsvector indexes and hybrid RPCs for:
-- 1) Document routing (documents)
-- 2) Chunk retrieval (document_embeddings) with optional doc filter
-- =========================================================

-- NOTE: We intentionally avoid adding STORED generated tsvector columns here.
-- On larger tables this can trigger a full table rewrite and may exceed
-- maintenance_work_mem on Supabase. Instead, we create expression GIN indexes.

-- 1) Documents: keyword index (expression)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'documents_search_tsv_idx'
  ) THEN
    CREATE INDEX documents_search_tsv_idx
      ON public.documents
      USING gin (
        to_tsvector(
          'simple',
          coalesce(title,'') || ' ' || left(coalesce(content,''), 20000)
        )
      );
  END IF;
END $$;

-- 2) Document embeddings: keyword index for chunks (expression)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'document_embeddings_search_tsv_idx'
  ) THEN
    CREATE INDEX document_embeddings_search_tsv_idx
      ON public.document_embeddings
      USING gin (
        to_tsvector('simple', coalesce(content_chunk,''))
      );
  END IF;
END $$;

-- 3) Hybrid doc routing
-- Combines vector similarity and full-text rank.
CREATE OR REPLACE FUNCTION public.search_similar_documents_index_hybrid(
  query_text text,
  query_embedding vector(1536),
  user_id_param uuid,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.2,
  text_rank_threshold float DEFAULT 0.05,
  vector_weight float DEFAULT 0.75,
  text_weight float DEFAULT 0.25
)
RETURNS TABLE (
  document_id uuid,
  title text,
  type text,
  url text,
  similarity float,
  text_rank float,
  score float,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  tsq tsquery;
BEGIN
  IF query_text IS NULL OR btrim(query_text) = '' THEN
    tsq := NULL;
  ELSE
    tsq := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  SELECT
    d.id AS document_id,
    d.title,
    d.type,
    d.url,
    (CASE WHEN d.embedding IS NULL THEN 0 ELSE 1 - (d.embedding <=> query_embedding) END) AS similarity,
    (CASE WHEN tsq IS NULL THEN 0::double precision ELSE ts_rank_cd(
      to_tsvector('simple', coalesce(d.title,'') || ' ' || left(coalesce(d.content,''), 20000)),
      tsq
    )::double precision END) AS text_rank,
    (
      vector_weight * (CASE WHEN d.embedding IS NULL THEN 0 ELSE 1 - (d.embedding <=> query_embedding) END)
      +
      text_weight * (CASE WHEN tsq IS NULL THEN 0::double precision ELSE ts_rank_cd(
        to_tsvector('simple', coalesce(d.title,'') || ' ' || left(coalesce(d.content,''), 20000)),
        tsq
      )::double precision END)
    ) AS score,
    d.updated_at
  FROM public.documents d
  WHERE d.user_id = user_id_param
    AND (
      (d.embedding IS NOT NULL AND 1 - (d.embedding <=> query_embedding) > similarity_threshold)
      OR (
        tsq IS NOT NULL
        AND ts_rank_cd(
          to_tsvector('simple', coalesce(d.title,'') || ' ' || left(coalesce(d.content,''), 20000)),
          tsq
        ) > text_rank_threshold
      )
    )
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- 4) Hybrid chunk retrieval with optional document_ids filter
CREATE OR REPLACE FUNCTION public.search_similar_document_chunks_hybrid_filtered(
  query_text text,
  query_embedding vector(1536),
  user_id_param uuid,
  document_ids uuid[] DEFAULT NULL,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.2,
  text_rank_threshold float DEFAULT 0.05,
  vector_weight float DEFAULT 0.8,
  text_weight float DEFAULT 0.2
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content_chunk text,
  chunk_index integer,
  similarity float,
  text_rank float,
  score float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  tsq tsquery;
BEGIN
  IF query_text IS NULL OR btrim(query_text) = '' THEN
    tsq := NULL;
  ELSE
    tsq := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content_chunk,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    (CASE WHEN tsq IS NULL THEN 0::double precision ELSE ts_rank_cd(
      to_tsvector('simple', coalesce(de.content_chunk,'')),
      tsq
    )::double precision END) AS text_rank,
    (
      vector_weight * (1 - (de.embedding <=> query_embedding))
      +
      text_weight * (CASE WHEN tsq IS NULL THEN 0::double precision ELSE ts_rank_cd(
        to_tsvector('simple', coalesce(de.content_chunk,'')),
        tsq
      )::double precision END)
    ) AS score,
    de.created_at
  FROM public.document_embeddings de
  WHERE de.user_id = user_id_param
    AND (document_ids IS NULL OR de.document_id = ANY(document_ids))
    AND (
      1 - (de.embedding <=> query_embedding) > similarity_threshold
      OR (
        tsq IS NOT NULL
        AND ts_rank_cd(to_tsvector('simple', coalesce(de.content_chunk,'')), tsq) > text_rank_threshold
      )
    )
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
