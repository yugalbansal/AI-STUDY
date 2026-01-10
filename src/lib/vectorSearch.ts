import { supabase } from './supabase';
import { embeddingService } from '../services/embeddings';
import {
  SimilarMessage,
  SimilarDocument,
  ChatContext
} from '../types/embeddings';

export class VectorSearchService {
  private static instance: VectorSearchService;

  private constructor() {}

  private sanitizeQueryForHybrid(query: string): string {
    // Keep it conservative: avoid control chars / huge inputs that can break tsquery parsing.
    return (query || '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 512);
  }

  private selectDiverseChunks<T extends { content_chunk: string; similarity: number; document_id: string }>(
    candidates: T[],
    limit: number
  ): T[] {
    if (candidates.length <= limit) return candidates;

    const tokenize = (text: string) =>
      new Set(
        (text || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 3)
          .slice(0, 300)
      );

    const overlapScore = (a: Set<string>, b: Set<string>) => {
      if (a.size === 0 || b.size === 0) return 0;
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      // Use overlap coefficient: intersection / min(|A|,|B|)
      return inter / Math.min(a.size, b.size);
    };

    const tokensCache = new Map<number, Set<string>>();
    const getTokens = (idx: number) => {
      const existing = tokensCache.get(idx);
      if (existing) return existing;
      const t = tokenize(candidates[idx].content_chunk);
      tokensCache.set(idx, t);
      return t;
    };

    // Greedy MMR-like selection: relevance - lambda * redundancy
    const lambda = 0.65;
    const picked: number[] = [];
    const usedDocs = new Set<string>();

    // Always start with the top candidate
    picked.push(0);
    usedDocs.add(candidates[0].document_id);

    while (picked.length < limit) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 1; i < candidates.length; i++) {
        if (picked.includes(i)) continue;

        const relevance = candidates[i].similarity;
        const tokensI = getTokens(i);

        let maxRedundancy = 0;
        for (const p of picked) {
          const tokensP = getTokens(p);
          maxRedundancy = Math.max(maxRedundancy, overlapScore(tokensI, tokensP));
        }

        // Small bonus to cover multiple docs early
        const docBonus = usedDocs.has(candidates[i].document_id) ? 0 : 0.03;
        const score = lambda * relevance - (1 - lambda) * maxRedundancy + docBonus;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;
      picked.push(bestIdx);
      usedDocs.add(candidates[bestIdx].document_id);
    }

    return picked.map(i => candidates[i]);
  }

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
    content: string,
    title: string = ''
  ): Promise<void> {
    try {
      // Remove old chunk embeddings to avoid duplicates when re-indexing
      await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId);

      // Store a document-level embedding for fast "which document?" routing
      // (Uses title + a clipped preview to keep it cheap but representative)
      const docRoutingTextRaw = [title, content.slice(0, 4000)].filter(Boolean).join('\n\n');
      const docRoutingText = embeddingService.prepareTextForEmbedding(docRoutingTextRaw);
      if (docRoutingText.trim().length >= 15) {
        const docEmbedding = await embeddingService.generateEmbedding(docRoutingText);
        const { error: docUpdateError } = await supabase
          .from('documents')
          .update({ embedding: JSON.stringify(docEmbedding) })
          .eq('id', documentId)
          .eq('user_id', userId);

        if (docUpdateError) {
          console.error('Error storing document index embedding:', docUpdateError);
        }
      }

      // Chunk the document content (larger chunks = better context)
      const chunks = embeddingService.chunkText(content, 800);

      // Generate embeddings for each chunk (include title to help retrieval)
      const preparedChunks = chunks.map((c) => {
        const withTitle = title ? `Title: ${title}\n\n${c}` : c;
        return embeddingService.prepareTextForEmbedding(withTitle);
      });

      const embeddings = await embeddingService.generateBatchEmbeddings(preparedChunks);

      // Store chunk embeddings (bulk insert)
      const rows = preparedChunks.map((chunk, i) => ({
        document_id: documentId,
        user_id: userId,
        content_chunk: chunk,
        embedding: JSON.stringify(embeddings[i]),
        chunk_index: i
      }));

      const { error } = await supabase
        .from('document_embeddings')
        .insert(rows);

      if (error) {
        console.error('Error storing document embeddings:', error);
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
   * Layered document retrieval:
   * 1) Find best documents (doc-level embedding)
   * 2) Search chunks only inside those documents
   *
   * Falls back to legacy chunk-only search if the new RPCs aren't deployed yet.
   */
  async findSimilarDocumentsLayered(
    query: string,
    userId: string,
    options?: {
      docLimit?: number;
      chunkLimit?: number;
      docSimilarityThreshold?: number;
      chunkSimilarityThreshold?: number;
    }
  ): Promise<Array<SimilarDocument & { document_title?: string; document_url?: string }>> {
    const docLimit = options?.docLimit ?? 4;
    const chunkLimit = options?.chunkLimit ?? 6;
    const candidateChunkLimit = Math.max(chunkLimit * 4, 16);
    const docSimilarityThreshold = options?.docSimilarityThreshold ?? 0.25;
    const chunkSimilarityThreshold = options?.chunkSimilarityThreshold ?? 0.25;

    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const queryText = this.sanitizeQueryForHybrid(query);

      // Prefer hybrid routing if available (dense + keyword)
      const { data: docMatchesHybrid, error: docHybridError } = await supabase.rpc(
        'search_similar_documents_index_hybrid',
        {
          query_text: queryText,
          query_embedding: JSON.stringify(queryEmbedding),
          user_id_param: userId,
          match_count: docLimit,
          similarity_threshold: docSimilarityThreshold
        }
      );

      let docs: Array<{ document_id: string; title: string; url: string | null }> = [];

      if (!docHybridError) {
        docs = (docMatchesHybrid || []) as Array<{
          document_id: string;
          title: string;
          url: string | null;
        }>;
      } else {
        console.warn('Hybrid doc routing failed (falling back):', {
          message: docHybridError.message,
          details: (docHybridError as any).details,
          hint: (docHybridError as any).hint,
          code: (docHybridError as any).code
        });
        // Fallback to vector-only routing (older RPC)
        const { data: docMatches, error: docError } = await supabase.rpc(
          'search_similar_documents_index',
          {
            query_embedding: JSON.stringify(queryEmbedding),
            user_id_param: userId,
            similarity_threshold: docSimilarityThreshold,
            match_count: docLimit
          }
        );

        if (docError) {
          console.warn('Doc-level search unavailable, falling back:', docError);
          return await this.findSimilarDocuments(query, userId, chunkLimit);
        }

        docs = (docMatches || []) as Array<{
          document_id: string;
          title: string;
          url: string | null;
        }>;
      }

      if (docs.length === 0) {
        return await this.findSimilarDocuments(query, userId, chunkLimit);
      }

      const docIds = docs.map(d => d.document_id);
      const docMetaById = new Map(docs.map(d => [d.document_id, d]));

      // Prefer hybrid chunk search if available
      const { data: chunkMatchesHybrid, error: chunkHybridError } = await supabase.rpc(
        'search_similar_document_chunks_hybrid_filtered',
        {
          query_text: queryText,
          query_embedding: JSON.stringify(queryEmbedding),
          user_id_param: userId,
          document_ids: docIds,
          match_count: candidateChunkLimit,
          similarity_threshold: chunkSimilarityThreshold
        }
      );

      let chunks: SimilarDocument[] = [];

      if (!chunkHybridError) {
        chunks = (chunkMatchesHybrid || []) as SimilarDocument[];
      } else {
        console.warn('Hybrid chunk search failed (falling back):', {
          message: chunkHybridError.message,
          details: (chunkHybridError as any).details,
          hint: (chunkHybridError as any).hint,
          code: (chunkHybridError as any).code
        });
        const { data: chunkMatches, error: chunkError } = await supabase.rpc(
          'search_similar_document_chunks_filtered',
          {
            query_embedding: JSON.stringify(queryEmbedding),
            user_id_param: userId,
            document_ids: docIds,
            similarity_threshold: chunkSimilarityThreshold,
            match_count: candidateChunkLimit
          }
        );

        if (chunkError) {
          console.warn('Chunk search with doc filter unavailable, falling back:', chunkError);
          return await this.findSimilarDocuments(query, userId, chunkLimit);
        }

        chunks = (chunkMatches || []) as SimilarDocument[];
      }

      // De-duplicate and select diverse chunks (reduces repetitive / random jumps)
      const unique = chunks.filter((c, idx, arr) => {
        const key = `${c.document_id}:${c.chunk_index}`;
        return arr.findIndex(x => `${x.document_id}:${x.chunk_index}` === key) === idx;
      });
      const selected = this.selectDiverseChunks(unique as any, chunkLimit);

      return selected.map((c) => {
        const meta = docMetaById.get(c.document_id);
        return {
          id: c.id || '',
          chunk_index: c.chunk_index || 0,
          created_at: c.created_at || new Date().toISOString(),
          document_id: c.document_id,
          content_chunk: c.content_chunk,
          similarity: c.similarity,
          document_title: meta?.title,
          document_url: meta?.url ?? undefined
        };
      });
    } catch (error) {
      console.error('Error in findSimilarDocumentsLayered:', error);
      return await this.findSimilarDocuments(query, userId, chunkLimit);
    }
  }

  /*_*
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
        this.findSimilarDocumentsLayered(query, userId, {
          docLimit: 3,
          chunkLimit: 4,
          docSimilarityThreshold: 0.25,
          chunkSimilarityThreshold: 0.25
        })
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
      const truncate = (text: string, maxChars: number) =>
        text.length <= maxChars ? text : text.slice(0, maxChars) + '…';

      context.relevant_documents.forEach((doc: any, index) => {
        const title = doc.document_title ? ` | ${doc.document_title}` : '';
        const link = doc.document_url ? ` | ${doc.document_url}` : '';
        formattedContext += `${index + 1}. (${(doc.similarity * 100).toFixed(1)}% relevant)${title}${link}: ${truncate(doc.content_chunk, 650)}\n`;
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
