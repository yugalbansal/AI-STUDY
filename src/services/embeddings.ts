import axios from 'axios';
import { EmbeddingRequest, EmbeddingResponse } from '../types/embeddings';

// Using Hugging Face's free Inference API for sentence-transformers/all-mpnet-base-v2
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-mpnet-base-v2';
const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || ''; // You'll need to add this to .env

export class EmbeddingService {
  private static instance: EmbeddingService;
  private apiKey: string;

  private constructor() {
    this.apiKey = HF_API_KEY;
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate embeddings for a single text using sentence-transformers/all-mpnet-base-v2
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.apiKey) {
        console.warn('Hugging Face API key not found, using fallback random embedding');
        return this.generateFallbackEmbedding(text);
      }

      const response = await axios.post(
        HF_API_URL,
        {
          inputs: text,
          options: {
            wait_for_model: true,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // Hugging Face API returns array of embeddings, we want the first one
      const embedding = Array.isArray(response.data[0]) ? response.data[0] : response.data;
      
      if (!Array.isArray(embedding) || embedding.length !== 768) {
        throw new Error('Invalid embedding format received from API');
      }

      return embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      
      // If API is loading or temporarily unavailable, use fallback
      if (error.response?.status === 503) {
        console.warn('Model is loading, using fallback embedding');
        return this.generateFallbackEmbedding(text);
      }
      
      // For other errors, still provide a fallback
      console.warn('Using fallback embedding due to API error');
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.apiKey) {
        console.warn('Hugging Face API key not found, using fallback embeddings');
        return texts.map(text => this.generateFallbackEmbedding(text));
      }

      const response = await axios.post(
        HF_API_URL,
        {
          inputs: texts,
          options: {
            wait_for_model: true,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout for batch
        }
      );

      const embeddings = response.data;
      
      if (!Array.isArray(embeddings)) {
        throw new Error('Invalid batch embedding format received from API');
      }

      return embeddings.map((embedding: any) => {
        if (!Array.isArray(embedding) || embedding.length !== 768) {
          return this.generateFallbackEmbedding('');
        }
        return embedding;
      });
    } catch (error: any) {
      console.error('Error generating batch embeddings:', error);
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
   * This is used when the API is unavailable
   */
  private generateFallbackEmbedding(text: string): number[] {
    // Generate a deterministic 768-dimensional embedding based on text content
    const embedding = new Array(768);
    const textBytes = new TextEncoder().encode(text.toLowerCase());
    
    // Use a simple hash-based approach for consistent embeddings
    for (let i = 0; i < 768; i++) {
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
