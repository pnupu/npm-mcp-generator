/**
 * Vector-based search system for embedded MCP servers
 */

export interface SearchResult {
  chunk: {
    id: string;
    markdown: string;
    metadata: {
      type: 'function' | 'class' | 'guide' | 'example';
      title: string;
      url?: string;
      category?: string;
      functionName?: string;
      parameters?: string[];
      priority: number;
      codeExample?: boolean;
      wordCount: number;
      sourceSection: string;
    };
    embedding: number[];
  };
  similarity: number;
  relevanceScore: number;
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  typeFilter?: ('function' | 'class' | 'guide' | 'example')[];
  categoryFilter?: string[];
  includeCode?: boolean;
}

export class VectorSearch {
  private chunks: Array<{
    id: string;
    markdown: string;
    metadata: any;
    embedding: number[];
  }>;

  constructor(chunks: Array<{
    id: string;
    markdown: string;
    metadata: any;
    embedding: number[];
  }>) {
    this.chunks = chunks;
  }

  /**
   * Perform semantic search using cosine similarity
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 5,
      minSimilarity = 0.1,
      typeFilter,
      categoryFilter,
      includeCode
    } = options;

    // Filter chunks based on criteria
    let filteredChunks = this.chunks;

    if (typeFilter && typeFilter.length > 0) {
      filteredChunks = filteredChunks.filter(chunk => 
        typeFilter.includes(chunk.metadata.type)
      );
    }

    if (categoryFilter && categoryFilter.length > 0) {
      filteredChunks = filteredChunks.filter(chunk => 
        categoryFilter.some(category => 
          chunk.metadata.category?.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    if (includeCode !== undefined) {
      filteredChunks = filteredChunks.filter(chunk => 
        chunk.metadata.codeExample === includeCode
      );
    }

    // Calculate similarities
    const similarities = filteredChunks.map(chunk => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      const relevanceScore = this.calculateRelevanceScore(similarity, chunk.metadata);
      
      return {
        chunk,
        similarity,
        relevanceScore
      };
    });

    // Filter by minimum similarity and sort by relevance score
    const results = similarities
      .filter(result => result.similarity >= minSimilarity)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Search for functions by name or description
   */
  async searchFunctions(
    queryEmbedding: number[],
    options: Omit<SearchOptions, 'typeFilter'> = {}
  ): Promise<SearchResult[]> {
    return this.semanticSearch(queryEmbedding, {
      ...options,
      typeFilter: ['function', 'class']
    });
  }

  /**
   * Search for code examples
   */
  async searchExamples(
    queryEmbedding: number[],
    options: Omit<SearchOptions, 'typeFilter' | 'includeCode'> = {}
  ): Promise<SearchResult[]> {
    return this.semanticSearch(queryEmbedding, {
      ...options,
      typeFilter: ['example'],
      includeCode: true
    });
  }

  /**
   * Search for guides and tutorials
   */
  async searchGuides(
    queryEmbedding: number[],
    options: Omit<SearchOptions, 'typeFilter'> = {}
  ): Promise<SearchResult[]> {
    return this.semanticSearch(queryEmbedding, {
      ...options,
      typeFilter: ['guide']
    });
  }

  /**
   * Get chunks by category
   */
  getChunksByCategory(category: string): Array<{
    id: string;
    markdown: string;
    metadata: any;
    embedding: number[];
  }> {
    return this.chunks.filter(chunk => 
      chunk.metadata.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.chunks.forEach(chunk => {
      if (chunk.metadata.category) {
        categories.add(chunk.metadata.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Get all available function names
   */
  getFunctionNames(): string[] {
    const functions = new Set<string>();
    this.chunks.forEach(chunk => {
      if (chunk.metadata.functionName) {
        functions.add(chunk.metadata.functionName);
      }
    });
    return Array.from(functions).sort();
  }

  /**
   * Get search statistics
   */
  getSearchStats(): {
    totalChunks: number;
    chunksByType: Record<string, number>;
    averageEmbeddingDimensions: number;
    categoriesCount: number;
    functionsCount: number;
  } {
    const chunksByType: Record<string, number> = {};
    let totalDimensions = 0;

    this.chunks.forEach(chunk => {
      chunksByType[chunk.metadata.type] = (chunksByType[chunk.metadata.type] || 0) + 1;
      totalDimensions += chunk.embedding.length;
    });

    return {
      totalChunks: this.chunks.length,
      chunksByType,
      averageEmbeddingDimensions: this.chunks.length > 0 ? totalDimensions / this.chunks.length : 0,
      categoriesCount: this.getCategories().length,
      functionsCount: this.getFunctionNames().length
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private calculateRelevanceScore(similarity: number, metadata: any): number {
    let score = similarity;

    // Boost score based on content type priority
    const typeBoosts = {
      function: 0.3,
      class: 0.25,
      example: 0.2,
      guide: 0.1
    };

    score += typeBoosts[metadata.type as keyof typeof typeBoosts] || 0;

    // Boost score for high-priority content
    if (metadata.priority > 0.7) {
      score += 0.1;
    }

    // Boost score for content with code examples
    if (metadata.codeExample) {
      score += 0.05;
    }

    // Boost score for functions with parameters
    if (metadata.functionName && metadata.parameters && metadata.parameters.length > 0) {
      score += 0.05;
    }

    return Math.min(1.0, score); // Cap at 1.0
  }
}