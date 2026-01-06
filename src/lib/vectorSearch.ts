import { supabase } from './supabase';
import { embeddingService } from '../services/embeddings';
import {
  ChatEmbedding,
  DocumentEmbedding,
  SimilarMessage,
  SimilarDocument,
  ChatContext
} from '../types/embeddings';

export class VectorSearchService {
  private static instance: VectorSearchService;

  private constructor() {}

  public static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  /**
   * Store chat message embedding in the database
   */
  async storeChatEmbedding(
    chatId: string,
    messageId: string,
    userId: string,
    content: string,
    messageType: 'user' | 'assistant'
  ): Promise<void> {
    try {
      // Generate embedding for the content
      const cleanContent = embeddingService.prepareTextForEmbedding(content);
      const embedding = await embeddingService.generateEmbedding(cleanContent);

      // Store in database
      const { error } = await supabase
        .from('chat_embeddings')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          user_id: userId,
          content: cleanContent,
          embedding: JSON.stringify(embedding), // Store as JSON string
          message_type: messageType
        });

      if (error) {
        console.error('Error storing chat embedding:', error);
      }
    } catch (error) {
      console.error('Error in storeChatEmbedding:', error);
    }
  }

  /**
   * Store document embedding in the database
   */
  async storeDocumentEmbeddings(
    documentId: string,
    userId: string,
    content: string
  ): Promise<void> {
    try {
      // Chunk the document content (larger chunks = better context)
      const chunks = embeddingService.chunkText(content, 800);
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = embeddingService.prepareTextForEmbedding(chunks[i]);
        const embedding = await embeddingService.generateEmbedding(chunk);

        // Store chunk embedding
        const { error } = await supabase
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            user_id: userId,
            content_chunk: chunk,
            embedding: JSON.stringify(embedding),
            chunk_index: i
          });

        if (error) {
          console.error(`Error storing document embedding for chunk ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in storeDocumentEmbeddings:', error);
    }
  }

  /**
   * Find similar chat messages for context
   */
  async findSimilarChatMessages(
    query: string,
    userId: string,
    chatId?: string,
    limit: number = 5
  ): Promise<SimilarMessage[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Use the database function to search for similar messages
      const { data, error } = await supabase.rpc('search_similar_chat_messages', {
        query_embedding: JSON.stringify(queryEmbedding),
        user_id_param: userId,
        chat_id_param: chatId || null,
        similarity_threshold: 0.3,
        match_count: limit
      });

      if (error) {
        console.error('Error searching similar chat messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in findSimilarChatMessages:', error);
      return [];
    }
  }

  /**
   * Find similar document content for context
   */
  async findSimilarDocuments(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<SimilarDocument[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Use the database function to search for similar documents
      const { data, error } = await supabase.rpc('search_similar_documents', {
        query_embedding: JSON.stringify(queryEmbedding),
        user_id_param: userId,
        similarity_threshold: 0.3,
        match_count: limit
      });

      if (error) {
        console.error('Error searching similar documents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in findSimilarDocuments:', error);
      return [];
    }
  }

  /**
   * Get recent chat history for context
   */
  async getRecentChatHistory(
    chatId: string,
    userId: string,
    limit: number = 10
  ): Promise<Array<{ message: string; response: string; created_at: string }>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('message, response, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent chat history:', error);
        return [];
      }

      return (data || []).reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error in getRecentChatHistory:', error);
      return [];
    }
  }

  /**
   * Build comprehensive context for a chat message
   */
  async buildChatContext(
    query: string,
    userId: string,
    chatId: string
  ): Promise<ChatContext> {
    try {
      // REDUCED LIMITS to prevent context overflow (was causing 253k token error)
      const [recentMessages, similarConversations, relevantDocuments] = await Promise.all([
        this.getRecentChatHistory(chatId, userId, 3), // Only last 3 messages (was 5)
        this.findSimilarChatMessages(query, userId, undefined, 2), // Only 2 similar (was 3)
        this.findSimilarDocuments(query, userId, 2) // Only 2 docs (was 3)
      ]);

      return {
        recent_messages: recentMessages,
        similar_conversations: similarConversations,
        relevant_documents: relevantDocuments
      };
    } catch (error) {
      console.error('Error in buildChatContext:', error);
      return {
        recent_messages: [],
        similar_conversations: [],
        relevant_documents: []
      };
    }
  }

  /**
   * Format context for AI prompt
   */
  formatContextForPrompt(context: ChatContext): string {
    let formattedContext = '';

    // Recent conversation history
    if (context.recent_messages.length > 0) {
      formattedContext += '\n=== RECENT CONVERSATION ===\n';
      context.recent_messages.forEach((msg, index) => {
        formattedContext += `Message ${index + 1}:\n`;
        formattedContext += `User: ${msg.message}\n`;
        formattedContext += `Assistant: ${msg.response}\n\n`;
      });
    }

    // Similar conversations from other chats
    if (context.similar_conversations.length > 0) {
      formattedContext += '\n=== SIMILAR CONVERSATIONS ===\n';
      context.similar_conversations.forEach((conv, index) => {
        formattedContext += `${index + 1}. [${conv.message_type}] (${(conv.similarity * 100).toFixed(1)}% similar): ${conv.content}\n`;
      });
      formattedContext += '\n';
    }

    // Relevant documents
    if (context.relevant_documents.length > 0) {
      formattedContext += '\n=== RELEVANT DOCUMENTS ===\n';
      context.relevant_documents.forEach((doc, index) => {
        formattedContext += `${index + 1}. (${(doc.similarity * 100).toFixed(1)}% relevant): ${doc.content_chunk}\n`;
      });
      formattedContext += '\n';
    }

    return formattedContext;
  }

  /**
   * Clean up old embeddings to manage storage
   */
  async cleanupOldEmbeddings(userId: string, daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean up old chat embeddings
      const { error: chatError } = await supabase
        .from('chat_embeddings')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (chatError) {
        console.error('Error cleaning up chat embeddings:', chatError);
      }

      console.log(`Cleaned up chat embeddings older than ${daysOld} days`);
    } catch (error) {
      console.error('Error in cleanupOldEmbeddings:', error);
    }
  }

  /**
   * Delete embeddings when a chat or document is deleted
   */
  async deleteChatEmbeddings(chatId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_embeddings')
        .delete()
        .eq('chat_id', chatId);

      if (error) {
        console.error('Error deleting chat embeddings:', error);
      }
    } catch (error) {
      console.error('Error in deleteChatEmbeddings:', error);
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        console.error('Error deleting document embeddings:', error);
      }
    } catch (error) {
      console.error('Error in deleteDocumentEmbeddings:', error);
    }
  }
}

export const vectorSearchService = VectorSearchService.getInstance();
