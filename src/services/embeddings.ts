import { EmbeddingRequest, EmbeddingResponse } from '../types/embeddings';
import type { SupabaseClient } from '@supabase/supabase-js';

// Use Supabase Edge Function for embeddings (avoids CORS + hides API key)
const EMBEDDING_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`;
const EXPECTED_EMBEDDING_DIMS = Number(import.meta.env.VITE_EMBEDDING_DIMS ?? 1536);

export class EmbeddingService {
  private static instance: EmbeddingService;

  private supabase: SupabaseClient | null = null;

  private readonly MAX_CONCURRENT_EMBEDDINGS = 6;

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
   * Generate embeddings for a single text via Supabase Edge Function
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Skip short text
      const cleanText = this.prepareTextForEmbedding(text);
      if (cleanText.length < 15) {
        return this.generateFallbackEmbedding(cleanText);
      }

      if (!this.supabase) {
        throw new Error('Supabase client not initialized (Clerk session missing)');
      }

      const { data, error } = await this.supabase.functions.invoke('generate-embedding', {
        body: { text: cleanText },
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      const embedding = (data as any)?.embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format from Edge Function');
      }

      if (Number.isFinite(EXPECTED_EMBEDDING_DIMS) && EXPECTED_EMBEDDING_DIMS > 0) {
        if (embedding.length !== EXPECTED_EMBEDDING_DIMS) {
          throw new Error(
            `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMS}, got ${embedding.length}`
          );
        }
      }

      return embedding;
    } catch (error: any) {
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Note: Calls Edge Function sequentially (batch not implemented to keep it simple)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const results: number[][] = new Array(texts.length);
      const queue = texts.map((text, index) => ({ text, index }));

      const workers = Array.from({ length: Math.min(this.MAX_CONCURRENT_EMBEDDINGS, texts.length) })
        .map(async () => {
          while (queue.length > 0) {
            const item = queue.shift();
            if (!item) return;
            results[item.index] = await this.generateEmbedding(item.text);
          }
        });

      await Promise.all(workers);
      return results;
    } catch (error: any) {
      return texts.map(text => this.generateFallbackEmbedding(text));
    }
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
   * Chunk large text into smaller pieces for embedding
   */
  chunkText(text: string, maxTokens: number = 500): string[] {
    // Simple word-based chunking (you can make this more sophisticated)
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxTokens) {
      const chunk = words.slice(i, i + maxTokens).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks.length > 0 ? chunks : [text];
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
