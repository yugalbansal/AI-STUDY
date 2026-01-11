-- Drop ALL UUID versions of search functions (keep only TEXT versions)
-- Using exact signatures from database

DROP FUNCTION IF EXISTS search_similar_chat_messages(query_embedding vector, user_id_param uuid, chat_id_param uuid, similarity_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS search_similar_document_chunks_filtered(query_embedding vector, user_id_param uuid, document_ids uuid[], similarity_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS search_similar_document_chunks_hybrid_filtered(query_text text, query_embedding vector, user_id_param uuid, document_ids uuid[], match_count integer, similarity_threshold double precision, text_rank_threshold double precision, vector_weight double precision, text_weight double precision);
DROP FUNCTION IF EXISTS search_similar_documents(query_embedding vector, user_id_param uuid, similarity_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS search_similar_documents_index(query_embedding vector, user_id_param uuid, similarity_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS search_similar_documents_index_hybrid(query_text text, query_embedding vector, user_id_param uuid, match_count integer, similarity_threshold double precision, text_rank_threshold double precision, vector_weight double precision, text_weight double precision);
