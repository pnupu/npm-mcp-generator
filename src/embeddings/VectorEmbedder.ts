/**
 * OpenAI embeddings integration for vector-based documentation search
 */

import OpenAI from 'openai';
import { DocumentChunk } from '../processors/ContentChunker.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface EmbeddedChunk extends DocumentChunk {
  embedding: Float32Array;
}

export interface EmbeddingOptions {
  apiKey?: string;
  model?: string;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface EmbeddingStats {
  totalChunks: number;
  totalTokens: number;
  embeddingDimensions: number;
  processingTime: number;
  estimatedCost: number;
  batchCount: number;
}

export class VectorEmbedder {
  private openai: OpenAI;
  private model: string;
  private batchSize: number;
  private maxRetries: number;
  private timeout: number;

  constructor(options: EmbeddingOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey option.');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: options.timeout || 30000
    });
    
    this.model = options.model || 'text-embedding-3-small';
    this.batchSize = options.batchSize || 100; // OpenAI allows up to 2048 inputs per request
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Generate embeddings for document chunks
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<AnalysisResult<EmbeddedChunk[]>> {
    const startTime = Date.now();
    let totalTokens = 0;
    let batchCount = 0;

    try {
      console.log(`🔮 Generating embeddings for ${chunks.length} chunks using ${this.model}...`);

      const embeddedChunks: EmbeddedChunk[] = [];
      
      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batch = chunks.slice(i, i + this.batchSize);
        batchCount++;
        
        console.log(`📦 Processing batch ${batchCount}/${Math.ceil(chunks.length / this.batchSize)} (${batch.length} chunks)...`);
        
        const batchResult = await this.embedBatch(batch);
        
        if (!batchResult.success || !batchResult.data) {
          return {
            success: false,
            error: batchResult.error || {
              type: 'PROCESSING_ERROR',
              message: 'Failed to embed batch',
              recoverable: true,
              suggestions: ['Check OpenAI API key', 'Verify network connectivity', 'Try with smaller batch size']
            },
            warnings: batchResult.warnings,
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'vector-embedder'
            }
          };
        }
        
        embeddedChunks.push(...batchResult.data.embeddedChunks);
        totalTokens += batchResult.data.tokensUsed;
        
        // Small delay between batches to respect rate limits
        if (i + this.batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const processingTime = Date.now() - startTime;
      const estimatedCost = this.calculateCost(totalTokens);
      
      console.log(`✅ Generated ${embeddedChunks.length} embeddings in ${processingTime}ms`);
      console.log(`📊 Total tokens: ${totalTokens}, Estimated cost: $${estimatedCost.toFixed(4)}`);

      const stats: EmbeddingStats = {
        totalChunks: embeddedChunks.length,
        totalTokens,
        embeddingDimensions: embeddedChunks.length > 0 ? embeddedChunks[0].embedding.length : 0,
        processingTime,
        estimatedCost,
        batchCount
      };

      return {
        success: true,
        data: embeddedChunks,
        warnings: [],
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'vector-embedder',
          stats
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Embedding generation failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check OpenAI API key and quota',
            'Verify network connectivity',
            'Try with smaller batch size',
            'Check if the model is available'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'vector-embedder'
        }
      };
    }
  }

  private async embedBatch(chunks: DocumentChunk[]): Promise<AnalysisResult<{
    embeddedChunks: EmbeddedChunk[];
    tokensUsed: number;
  }>> {
    let attempt = 0;
    
    while (attempt < this.maxRetries) {
      try {
        // Prepare input texts for embedding
        const inputTexts = chunks.map(chunk => this.prepareTextForEmbedding(chunk));
        
        // Call OpenAI API
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: inputTexts,
          encoding_format: 'float'
        });

        // Process response
        const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, index) => ({
          ...chunk,
          embedding: new Float32Array(response.data[index].embedding)
        }));

        return {
          success: true,
          data: {
            embeddedChunks,
            tokensUsed: response.usage.total_tokens
          },
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'vector-embedder'
          }
        };

      } catch (error) {
        attempt++;
        
        if (attempt >= this.maxRetries) {
          return {
            success: false,
            error: {
              type: 'NETWORK_ERROR',
              message: `OpenAI API call failed after ${this.maxRetries} attempts: ${error}`,
              recoverable: true,
              suggestions: [
                'Check OpenAI API key',
                'Verify API quota and billing',
                'Check network connectivity',
                'Try again later if rate limited'
              ]
            },
            metadata: {
              processingTime: 0,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'vector-embedder'
            }
          };
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⚠️ Embedding attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: {
        type: 'UNKNOWN_ERROR',
        message: 'Unexpected error in embedBatch',
        recoverable: false,
        suggestions: []
      },
      metadata: {
        processingTime: 0,
        timestamp: new Date(),
        version: '1.0.0',
        source: 'vector-embedder'
      }
    };
  }

  private prepareTextForEmbedding(chunk: DocumentChunk): string {
    // Create a rich text representation for better embeddings
    let text = '';
    
    // Add title with context
    if (chunk.metadata.title) {
      text += `Title: ${chunk.metadata.title}\n`;
    }
    
    // Add type information
    text += `Type: ${chunk.metadata.type}\n`;
    
    // Add function information if available
    if (chunk.metadata.functionName) {
      text += `Function: ${chunk.metadata.functionName}`;
      if (chunk.metadata.parameters && chunk.metadata.parameters.length > 0) {
        text += `(${chunk.metadata.parameters.join(', ')})`;
      }
      text += '\n';
    }
    
    // Add category if available
    if (chunk.metadata.category) {
      text += `Category: ${chunk.metadata.category}\n`;
    }
    
    // Add the main content
    text += `Content: ${chunk.markdown}`;
    
    // Truncate if too long (OpenAI has token limits)
    const maxLength = 8000; // Conservative limit for text-embedding-3-small
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }

  private calculateCost(tokens: number): number {
    // text-embedding-3-small pricing: $0.00002 per 1K tokens
    return (tokens / 1000) * 0.00002;
  }

  /**
   * Compress embeddings for storage
   */
  compressEmbeddings(embeddedChunks: EmbeddedChunk[]): {
    chunks: Array<{
      id: string;
      markdown: string;
      metadata: any;
      embedding: number[]; // Regular array for JSON serialization
    }>;
    compressionStats: {
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
    };
  } {
    const originalSize = embeddedChunks.length * embeddedChunks[0]?.embedding.length * 4; // 4 bytes per float32
    
    const compressedChunks = embeddedChunks.map(chunk => ({
      id: chunk.id,
      markdown: chunk.markdown,
      metadata: chunk.metadata,
      embedding: Array.from(chunk.embedding) // Convert Float32Array to regular array
    }));
    
    const compressedSize = JSON.stringify(compressedChunks).length;
    
    return {
      chunks: compressedChunks,
      compressionStats: {
        originalSize,
        compressedSize,
        compressionRatio: originalSize / compressedSize
      }
    };
  }

  /**
   * Test OpenAI API connection
   */
  async testConnection(): Promise<AnalysisResult<boolean>> {
    try {
      console.log('🔌 Testing OpenAI API connection...');
      
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: ['test connection'],
        encoding_format: 'float'
      });
      
      if (response.data && response.data.length > 0) {
        console.log(`✅ OpenAI API connection successful (${response.data[0].embedding.length} dimensions)`);
        return {
          success: true,
          data: true,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'vector-embedder'
          }
        };
      } else {
        return {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'OpenAI API returned empty response',
            recoverable: true,
            suggestions: ['Check API key', 'Verify model availability']
          },
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'vector-embedder'
          }
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: `OpenAI API connection failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check OpenAI API key',
            'Verify network connectivity',
            'Check API quota and billing'
          ]
        },
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'vector-embedder'
        }
      };
    }
  }
}