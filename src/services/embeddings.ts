import type { SupabaseClient } from '@supabase/supabase-js';

// Use Supabase Edge Function for embeddings (avoids CORS + hides API key)
const EMBEDDING_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`;
const EXPECTED_EMBEDDING_DIMS = Number(import.meta.env.VITE_EMBEDDING_DIMS ?? 1536);

export class EmbeddingService {
  private static instance: EmbeddingService;

  private supabase: SupabaseClient | null = null;

  private readonly MAX_CONCURRENT_EMBEDDINGS = 4; // Reduced to avoid rate limiting
  private readonly EMBEDDING_TIMEOUT_MS = 10000; // 10 second timeout

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public setSupabaseClient(client: SupabaseClient | null) {
    this.supabase = client;
  }

  /**
   * Generate embeddings for a single text via Supabase Edge Function with timeout
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Skip short text - use fallback
    const cleanText = this.prepareTextForEmbedding(text);
    if (cleanText.length < 15) {
      return this.generateFallbackEmbedding(cleanText);
    }

    if (!this.supabase) {
      console.warn('EmbeddingService: Supabase not initialized, using fallback');
      return this.generateFallbackEmbedding(text);
    }

    // Create timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Embedding generation timeout')), this.EMBEDDING_TIMEOUT_MS);
    });

    try {
      const invokePromise = this.supabase.functions.invoke('generate-embedding', {
        body: { text: cleanText },
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) {
        console.warn('Embedding edge function error:', error.message);
        return this.generateFallbackEmbedding(text);
      }

      const embedding = (data as any)?.embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.warn('Invalid embedding format from Edge Function');
        return this.generateFallbackEmbedding(text);
      }

      // Validate dimensions
      if (Number.isFinite(EXPECTED_EMBEDDING_DIMS) && EXPECTED_EMBEDDING_DIMS > 0) {
        if (embedding.length !== EXPECTED_EMBEDDING_DIMS) {
          console.warn(`Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMS}, got ${embedding.length}`);
          return this.generateFallbackEmbedding(text);
        }
      }

      return embedding;
    } catch (error: any) {
      console.warn('Embedding generation failed, using fallback:', error.message);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch with better concurrency control
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = new Array(texts.length);

    // Process in batches to avoid overwhelming the edge function
    const batchSize = this.MAX_CONCURRENT_EMBEDDINGS;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (text, batchIdx) => {
        const globalIdx = i + batchIdx;
        try {
          results[globalIdx] = await this.generateEmbedding(text);
        } catch (error) {
          console.warn(`Batch embedding ${globalIdx} failed, using fallback`);
          results[globalIdx] = this.generateFallbackEmbedding(text);
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return isNaN(similarity) ? 0 : similarity;
  }

  /**
   * Fallback embedding generation using simple text hashing
   * This is used when the API is unavailable or text is too short
   */
  private generateFallbackEmbedding(text: string): number[] {
    // Generate a deterministic 1536-dimensional embedding based on text content
    const embedding = new Array(1536);
    const textBytes = new TextEncoder().encode(text.toLowerCase());

    if (textBytes.length === 0) {
      // Return a tiny non-zero normalized vector to avoid NaNs in cosine similarity
      embedding.fill(0);
      embedding[0] = 1;
      return embedding;
    }
    
    // Use a simple hash-based approach for consistent embeddings
    for (let i = 0; i < 1536; i++) {
      let hash = 0;
      const seed = i * 31 + (textBytes[i % textBytes.length] || 0);
      
      for (let j = 0; j < textBytes.length; j++) {
        hash = ((hash << 5) - hash + textBytes[j] + seed) & 0xffffffff;
      }
      
      // Normalize to [-1, 1] range
      embedding[i] = (hash / 0x7fffffff) * 0.1; // Reduce magnitude
    }
    
    // Normalize the vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  /**
   * Chunk large text into smaller pieces for embedding with overlapping windows
   */
  chunkText(text: string, maxTokens: number = 500, overlap: number = 100): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    if (words.length === 0) return [text];
    if (words.length <= maxTokens) return [text.trim()];

    const step = maxTokens - overlap > 0 ? maxTokens - overlap : maxTokens;
    
    for (let i = 0; i < words.length; i += step) {
      const chunk = words.slice(i, i + maxTokens).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Clean and prepare text for embedding
   */
  prepareTextForEmbedding(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters but keep basic punctuation
      .trim()
      .substring(0, 5000); // Limit text length
  }
}

export const embeddingService = EmbeddingService.getInstance();
