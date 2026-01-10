// Types for vector embedding functionality

export interface ChatEmbedding {
  id: string;
  chat_id: string;
  message_id: string;
  user_id: string;
  content: string;
  embedding?: number[]; // 1536-dimensional vector (text-embedding-3-small)
  message_type: 'user' | 'assistant';
  created_at: string;
}

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  user_id: string;
  content_chunk: string;
  embedding?: number[]; // 1536-dimensional vector
  chunk_index: number;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  chat_id: string;
  session_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface SimilarMessage {
  id: string;
  content: string;
  message_type: 'user' | 'assistant';
  similarity: number;
  created_at: string;
}

export interface SimilarDocument {
  id: string;
  document_id: string;
  content_chunk: string;
  chunk_index: number;
  similarity: number;
  created_at: string;
  document_title?: string;
  document_url?: string;
}

export interface EmbeddingRequest {
  text: string;
  user_id: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  text: string;
}

export interface ContextualResponse {
  response: string;
  relevant_context: {
    chat_history: SimilarMessage[];
    documents: SimilarDocument[];
  };
}

export interface ChatContext {
  recent_messages: Array<{
    message: string;
    response: string;
    created_at: string;
  }>;
  similar_conversations: SimilarMessage[];
  relevant_documents: SimilarDocument[];
}
