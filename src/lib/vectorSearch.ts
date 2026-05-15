import type { SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from '../services/embeddings';
import {
  SimilarMessage,
  SimilarDocument,
  ChatContext
} from '../types/embeddings';

export class VectorSearchService {
  private static instance: VectorSearchService;
  private supabase: SupabaseClient | null = null;

  // Cache for embeddings to avoid redundant generation
  private embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

  public setSupabaseClient(client: SupabaseClient | null) {
    this.supabase = client;
    embeddingService.setSupabaseClient(client);
  }

  private requireSupabase(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized (Clerk session missing)');
    }
    return this.supabase;
  }

  /**
   * Get cached embedding or generate and cache a new one
   */
  private async getCachedEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().substring(0, 500); // Normalize for cache
    const now = Date.now();

    const cached = this.embeddingCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.embedding;
    }

    const embedding = await embeddingService.generateEmbedding(text);
    this.embeddingCache.set(cacheKey, { embedding, timestamp: now });
    return embedding;
  }

  /**
   * Clear old cache entries periodically
   */
  private pruneCache(): void {
    const now = Date.now();
    for (const [key, value] of this.embeddingCache.entries()) {
      if ((now - value.timestamp) > this.CACHE_TTL_MS) {
        this.embeddingCache.delete(key);
      }
    }
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
      const supabase = this.requireSupabase();
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
          embedding: JSON.stringify(embedding),
          message_type: messageType
        });

      if (error) {
        console.warn('storeChatEmbedding error:', error);
      }
    } catch (error) {
      console.warn('storeChatEmbedding error:', error);
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
      const supabase = this.requireSupabase();
      // Remove old chunk embeddings to avoid duplicates when re-indexing
      await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId);

      // Store a document-level embedding for fast "which document?" routing
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
          console.warn('storeDocumentEmbeddings doc update error:', docUpdateError);
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
        console.warn('storeDocumentEmbeddings chunk insert error:', error);
      }
    } catch (error) {
      console.warn('storeDocumentEmbeddings error:', error);
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
      const supabase = this.requireSupabase();
      // Use cached embedding for better performance
      const queryEmbedding = await this.getCachedEmbedding(query);

      // Use the database function to search for similar messages
      const { data, error } = await supabase.rpc('search_similar_chat_messages', {
        query_embedding: JSON.stringify(queryEmbedding), // Pass as JSON string
        user_id_param: userId,
        chat_id_param: chatId || null,
        similarity_threshold: 0.3,
        match_count: limit
      });

      if (error) {
        console.warn('findSimilarChatMessages RPC error:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('findSimilarChatMessages error:', error);
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
      const supabase = this.requireSupabase();
      // Use cached embedding for better performance
      const queryEmbedding = await this.getCachedEmbedding(query);

      // Use the database function to search for similar documents
      const { data, error } = await supabase.rpc('search_similar_documents', {
        query_embedding: JSON.stringify(queryEmbedding), // Pass as JSON string
        user_id_param: userId,
        similarity_threshold: 0.15,
        match_count: limit
      });

      if (error) {
        console.warn('findSimilarDocuments RPC error:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('findSimilarDocuments error:', error);
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
      filterDocIds?: string[];  // Only search in these documents
      excludeDocIds?: string[]; // Exclude these documents from results
    }
  ): Promise<Array<SimilarDocument & { document_title?: string; document_url?: string }>> {
    const docLimit = options?.docLimit ?? 4;
    const chunkLimit = options?.chunkLimit ?? 6;
    const candidateChunkLimit = Math.max(chunkLimit * 4, 16);
    const docSimilarityThreshold = options?.docSimilarityThreshold ?? 0.25;
    const chunkSimilarityThreshold = options?.chunkSimilarityThreshold ?? 0.25;

    try {
      // Prune old cache entries periodically
      this.pruneCache();

      const supabase = this.requireSupabase();
      const queryEmbedding = await this.getCachedEmbedding(query);
      const queryText = this.sanitizeQueryForHybrid(query);

      // Prefer hybrid routing if available (dense + keyword)
      const { data: docMatchesHybrid, error: docHybridError } = await supabase.rpc(
        'search_similar_documents_index_hybrid',
        {
          query_text: queryText,
          query_embedding: JSON.stringify(queryEmbedding), // Pass as JSON string
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
            query_embedding: queryEmbedding, // Pass as array, not JSON string
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
        const fallbackResults = await this.findSimilarDocuments(query, userId, chunkLimit);
        return fallbackResults;
      }

      // Apply document filtering/exclusion
      if (options?.filterDocIds && options.filterDocIds.length > 0) {
        docs = docs.filter(d => options.filterDocIds!.includes(d.document_id));
      }
      if (options?.excludeDocIds && options.excludeDocIds.length > 0) {
        docs = docs.filter(d => !options.excludeDocIds!.includes(d.document_id));
      }

      if (docs.length === 0) {
        return [];
      }

      const docIds = docs.map(d => d.document_id);
      const docMetaById = new Map(docs.map(d => [d.document_id, d]));

      // Prefer hybrid chunk search if available
      const { data: chunkMatchesHybrid, error: chunkHybridError } = await supabase.rpc(
        'search_similar_document_chunks_hybrid_filtered',
        {
          query_text: queryText,
          query_embedding: JSON.stringify(queryEmbedding), // Pass as JSON string
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
        const { data: chunkMatches, error: chunkError } = await supabase.rpc(
          'search_similar_document_chunks_filtered',
          {
            query_embedding: JSON.stringify(queryEmbedding), // Pass as JSON string
            user_id_param: userId,
            document_ids: docIds,
            similarity_threshold: chunkSimilarityThreshold,
            match_count: candidateChunkLimit
          }
        );

        if (chunkError) {
          const fallbackResults = await this.findSimilarDocuments(query, userId, chunkLimit);
          return fallbackResults;
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
  ): Promise<Array<{ message: string; response: string; created_at: string; id: string }>> {
    try {
      const supabase = this.requireSupabase();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, message, response, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return (data || []).reverse() as Array<{ message: string; response: string; created_at: string; id: string }>;
    } catch (error) {
      return [];
    }
  }

  /**
   * Build comprehensive context for a chat message with timeout and error resilience
   * @param priorityDocIds - Optional array of document IDs to prioritize in search results
   */
  async buildChatContext(
    query: string,
    userId: string,
    chatId: string,
    timeoutMs: number = 15000, // Increased to 15 second timeout
    priorityDocIds?: string[]
  ): Promise<ChatContext> {
    // Helper to run with timeout - returns undefined on timeout instead of throwing
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | undefined> => {
      return Promise.race([
        promise,
        new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), ms))
      ]);
    };

    try {
      // Prune cache periodically
      this.pruneCache();

      // If priority documents are provided, search them first
      let relevantDocuments: any[] = [];

      if (priorityDocIds && priorityDocIds.length > 0) {
        // Search specifically in the priority documents - increased timeout to 5s
        const priorityResults = await withTimeout(
          this.findSimilarDocumentsLayered(query, userId, {
            docLimit: priorityDocIds.length,
            chunkLimit: 6,
            docSimilarityThreshold: 0.0,  // No threshold - get all chunks from priority docs
            chunkSimilarityThreshold: 0.0,  // No threshold for priority docs
            filterDocIds: priorityDocIds  // Only search in these documents
          }),
          5000
        );
        if (priorityResults) {
          relevantDocuments = priorityResults;
        }
      }

      // Also search general documents for broader context - increased timeout to 5s
      const generalResults = await withTimeout(
        this.findSimilarDocumentsLayered(query, userId, {
          docLimit: 3,
          chunkLimit: 4,
          docSimilarityThreshold: 0.15,
          chunkSimilarityThreshold: 0.15,
          excludeDocIds: priorityDocIds // Exclude priority docs to avoid duplication
        }),
        5000
      );

      // Combine and dedupe, prioritizing priority document content
      const allDocs = [...relevantDocuments];
      if (generalResults) {
        for (const doc of generalResults) {
          if (!allDocs.some(d => d.document_id === doc.document_id && d.id === doc.id)) {
            allDocs.push(doc);
          }
        }
      }

      // Fetch more messages to provide better context for short replies
      const results = await Promise.allSettled([
        withTimeout(this.getRecentChatHistory(chatId, userId, 6), 3000),
        withTimeout(this.findSimilarChatMessages(query, userId, undefined, 2), 3000),
        // Pass combined documents
        Promise.resolve(allDocs)
      ]);

      // Extract results, fallback to empty on failure
      const recentMessages = results[0].status === 'fulfilled' && results[0].value !== undefined
        ? results[0].value
        : [] as any[];
      const similarConversations = results[1].status === 'fulfilled' && results[1].value !== undefined
        ? results[1].value
        : [] as any[];
      const finalDocuments = results[2].status === 'fulfilled' && results[2].value !== undefined
        ? results[2].value
        : [] as any[];

      // Log any partial failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Context builder partial failure [${index}]:`, result.reason);
        }
      });

      return {
        recent_messages: recentMessages,
        similar_conversations: similarConversations,
        relevant_documents: finalDocuments
      };
    } catch (error) {
      console.warn('buildChatContext complete failure:', error);
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
      const supabase = this.requireSupabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean up old chat embeddings
      const { error: chatError } = await supabase
        .from('chat_embeddings')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (chatError) {
        console.warn('cleanupOldEmbeddings error:', chatError);
      }
    } catch (error) {
      console.warn('cleanupOldEmbeddings error:', error);
    }
  }

  /**
   * Delete embeddings when a chat or document is deleted
   */
  async deleteChatEmbeddings(chatId: string): Promise<void> {
    try {
      const supabase = this.requireSupabase();
      const { error } = await supabase
        .from('chat_embeddings')
        .delete()
        .eq('chat_id', chatId);

      if (error) {
        console.warn('deleteChatEmbeddings error:', error);
      }
    } catch (error) {
      console.warn('deleteChatEmbeddings error:', error);
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const supabase = this.requireSupabase();
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        console.warn('deleteDocumentEmbeddings error:', error);
      }
    } catch (error) {
      console.warn('deleteDocumentEmbeddings error:', error);
    }
  }
}

export const vectorSearchService = VectorSearchService.getInstance();
