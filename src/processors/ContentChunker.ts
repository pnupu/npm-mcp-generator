/**
 * Intelligent content chunking system for vector-based documentation
 */

import { ProcessedContent, ContentSection } from './ContentProcessor.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface DocumentChunk {
  id: string;
  markdown: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  type: 'function' | 'class' | 'guide' | 'example';
  title: string;
  url?: string;
  category?: string;
  functionName?: string;
  parameters?: string[];
  priority: number; // 0-1 scale
  codeExample?: boolean;
  wordCount: number;
  sourceSection: string;
}

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
  priorityWeights?: {
    function: number;
    example: number;
    guide: number;
    text: number;
  };
  maxChunksPerDocument?: number;
}

export interface ChunkingStats {
  totalChunks: number;
  chunksByType: Record<string, number>;
  averageChunkSize: number;
  priorityDistribution: {
    high: number; // 0.7-1.0
    medium: number; // 0.4-0.7
    low: number; // 0.0-0.4
  };
}

export class ContentChunker {
  private options: Required<ChunkingOptions>;

  constructor(options: ChunkingOptions = {}) {
    this.options = {
      maxChunkSize: options.maxChunkSize || 1500,
      minChunkSize: options.minChunkSize || 100,
      overlapSize: options.overlapSize || 100,
      priorityWeights: {
        function: 0.7,
        example: 0.2,
        guide: 0.1,
        text: 0.05,
        ...options.priorityWeights
      },
      maxChunksPerDocument: options.maxChunksPerDocument || 50
    };
  }

  /**
   * Chunk processed content into semantic chunks
   */
  async chunkContent(processedContent: ProcessedContent): Promise<AnalysisResult<DocumentChunk[]>> {
    const startTime = Date.now();

    try {
      console.log(`🧩 Chunking content from: ${processedContent.title}`);

      const chunks: DocumentChunk[] = [];
      let chunkCounter = 0;

      // Process each section
      for (const section of processedContent.sections) {
        const sectionChunks = await this.chunkSection(
          section,
          processedContent.url,
          chunkCounter
        );
        
        chunks.push(...sectionChunks);
        chunkCounter += sectionChunks.length;
      }

      // Apply prioritization
      const prioritizedChunks = this.prioritizeChunks(chunks);

      // Limit chunks if needed
      const finalChunks = prioritizedChunks.slice(0, this.options.maxChunksPerDocument);

      console.log(`📊 Created ${finalChunks.length} chunks from ${processedContent.sections.length} sections`);

      return {
        success: true,
        data: finalChunks,
        warnings: finalChunks.length === this.options.maxChunksPerDocument 
          ? [`Limited to ${this.options.maxChunksPerDocument} chunks`] 
          : [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'content-chunker'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Content chunking failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check if the processed content is valid',
            'Try with different chunking options',
            'Verify section structure'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'content-chunker'
        }
      };
    }
  }

  /**
   * Chunk multiple processed contents
   */
  async chunkMultipleContents(
    processedContents: ProcessedContent[]
  ): Promise<AnalysisResult<DocumentChunk[]>> {
    const allChunks: DocumentChunk[] = [];
    const warnings: string[] = [];
    let globalChunkCounter = 0;

    for (const content of processedContents) {
      const result = await this.chunkContent(content);
      
      if (result.success && result.data) {
        // Reassign chunk IDs to ensure global uniqueness
        const chunksWithUniqueIds = result.data.map(chunk => ({
          ...chunk,
          id: `chunk-${++globalChunkCounter}`
        }));
        
        allChunks.push(...chunksWithUniqueIds);
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } else {
        warnings.push(`Failed to chunk ${content.url}: ${result.error?.message}`);
      }
    }

    // Global prioritization across all documents
    const globallyPrioritized = this.prioritizeChunks(allChunks);

    return {
      success: true,
      data: globallyPrioritized,
      warnings: warnings.length > 0 ? warnings : [],
      metadata: {
        processingTime: 0,
        timestamp: new Date(),
        version: '1.0.0',
        source: 'content-chunker'
      }
    };
  }

  private async chunkSection(
    section: ContentSection,
    baseUrl: string,
    startCounter: number
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const content = section.content.trim();

    if (content.length < this.options.minChunkSize) {
      return []; // Skip very small sections
    }

    // For API sections, try to chunk by individual functions/methods
    if (section.type === 'api') {
      const apiChunks = this.chunkApiSection(section, baseUrl, startCounter);
      if (apiChunks.length > 0) {
        return apiChunks;
      }
    }

    // For code/example sections, try to keep code blocks intact
    if (section.type === 'code' || section.type === 'example') {
      const codeChunks = this.chunkCodeSection(section, baseUrl, startCounter);
      if (codeChunks.length > 0) {
        return codeChunks;
      }
    }

    // Default chunking strategy
    return this.chunkBySize(section, baseUrl, startCounter);
  }

  private chunkApiSection(
    section: ContentSection,
    baseUrl: string,
    startCounter: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = section.content;

    // Split by function/method patterns
    const functionPatterns = [
      /(?:^|\n)#{1,6}\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/gm,
      /(?:^|\n)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?:=>|{)/gm,
      /(?:^|\n)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm,
      /(?:^|\n)class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm
    ];

    let lastIndex = 0;
    const matches: Array<{ name: string; index: number; type: 'function' | 'class' }> = [];

    // Find all function/class matches
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          name: match[1],
          index: match.index,
          type: pattern.source.includes('class') ? 'class' : 'function'
        });
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // Create chunks for each function/class
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      const startIndex = Math.max(lastIndex, currentMatch.index - this.options.overlapSize);
      const endIndex = nextMatch 
        ? Math.min(nextMatch.index + this.options.overlapSize, content.length)
        : content.length;

      const chunkContent = content.slice(startIndex, endIndex).trim();
      
      if (chunkContent.length >= this.options.minChunkSize) {
        const parameters = this.extractParameters(chunkContent);
        
        chunks.push({
          id: `chunk-${startCounter + chunks.length}`,
          markdown: chunkContent,
          metadata: {
            type: currentMatch.type === 'class' ? 'class' : 'function',
            title: `${currentMatch.name}`,
            url: baseUrl,
            category: section.title,
            functionName: currentMatch.name,
            parameters,
            priority: this.calculatePriority('function', chunkContent),
            codeExample: this.hasCodeExample(chunkContent),
            wordCount: this.countWords(chunkContent),
            sourceSection: section.id
          }
        });
      }

      lastIndex = currentMatch.index;
    }

    return chunks;
  }

  private chunkCodeSection(
    section: ContentSection,
    baseUrl: string,
    startCounter: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = section.content;

    // Split by code blocks while keeping them intact
    const codeBlockPattern = /```[\s\S]*?```/g;
    const codeBlocks: Array<{ content: string; index: number }> = [];
    
    let match;
    while ((match = codeBlockPattern.exec(content)) !== null) {
      codeBlocks.push({
        content: match[0],
        index: match.index
      });
    }

    if (codeBlocks.length === 0) {
      // No code blocks, use regular chunking
      return this.chunkBySize(section, baseUrl, startCounter);
    }

    // Create chunks around code blocks
    let lastIndex = 0;
    
    for (let i = 0; i < codeBlocks.length; i++) {
      const codeBlock = codeBlocks[i];
      const nextCodeBlock = codeBlocks[i + 1];
      
      // Include some context before and after the code block
      const contextBefore = Math.max(0, codeBlock.index - 200);
      const contextAfter = nextCodeBlock 
        ? Math.min(nextCodeBlock.index, codeBlock.index + codeBlock.content.length + 200)
        : Math.min(content.length, codeBlock.index + codeBlock.content.length + 200);
      
      const chunkContent = content.slice(contextBefore, contextAfter).trim();
      
      if (chunkContent.length >= this.options.minChunkSize) {
        chunks.push({
          id: `chunk-${startCounter + chunks.length}`,
          markdown: chunkContent,
          metadata: {
            type: 'example',
            title: `${section.title} - Example ${i + 1}`,
            url: baseUrl,
            category: section.title,
            priority: this.calculatePriority('example', chunkContent),
            codeExample: true,
            wordCount: this.countWords(chunkContent),
            sourceSection: section.id
          }
        });
      }
      
      lastIndex = contextAfter;
    }

    return chunks;
  }

  private chunkBySize(
    section: ContentSection,
    baseUrl: string,
    startCounter: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = section.content;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + sentence + '.';
      
      if (potentialChunk.length > this.options.maxChunkSize && currentChunk.length > this.options.minChunkSize) {
        // Create chunk
        chunks.push({
          id: `chunk-${startCounter + chunkIndex}`,
          markdown: currentChunk.trim(),
          metadata: {
            type: this.mapSectionTypeToChunkType(section.type),
            title: `${section.title}${chunks.length > 0 ? ` (Part ${chunks.length + 1})` : ''}`,
            url: baseUrl,
            category: section.title,
            priority: this.calculatePriority(section.type, currentChunk),
            codeExample: this.hasCodeExample(currentChunk),
            wordCount: this.countWords(currentChunk),
            sourceSection: section.id
          }
        });
        
        // Start new chunk with overlap
        const overlapSentences = sentences.slice(Math.max(0, sentences.indexOf(sentence) - 2));
        currentChunk = overlapSentences.slice(0, 2).join('.') + '.';
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length >= this.options.minChunkSize) {
      chunks.push({
        id: `chunk-${startCounter + chunkIndex}`,
        markdown: currentChunk.trim(),
        metadata: {
          type: this.mapSectionTypeToChunkType(section.type),
          title: `${section.title}${chunks.length > 0 ? ` (Part ${chunks.length + 1})` : ''}`,
          url: baseUrl,
          category: section.title,
          priority: this.calculatePriority(section.type, currentChunk),
          codeExample: this.hasCodeExample(currentChunk),
          wordCount: this.countWords(currentChunk),
          sourceSection: section.id
        }
      });
    }

    return chunks;
  }

  private prioritizeChunks(chunks: DocumentChunk[]): DocumentChunk[] {
    return chunks.sort((a, b) => {
      // Primary sort by priority
      if (a.metadata.priority !== b.metadata.priority) {
        return b.metadata.priority - a.metadata.priority;
      }
      
      // Secondary sort by type importance
      const typeOrder = { function: 4, class: 3, example: 2, guide: 1 };
      const aTypeScore = typeOrder[a.metadata.type] || 0;
      const bTypeScore = typeOrder[b.metadata.type] || 0;
      
      if (aTypeScore !== bTypeScore) {
        return bTypeScore - aTypeScore;
      }
      
      // Tertiary sort by word count (longer content often more valuable)
      return b.metadata.wordCount - a.metadata.wordCount;
    });
  }

  private calculatePriority(sectionType: string, content: string): number {
    const baseWeight = this.options.priorityWeights[sectionType as keyof typeof this.options.priorityWeights] || 0.1;
    
    let multiplier = 1.0;
    
    // Boost priority for content with function signatures
    if (content.includes('(') && content.includes(')')) {
      multiplier += 0.2;
    }
    
    // Boost priority for content with code examples
    if (content.includes('```') || content.includes('`')) {
      multiplier += 0.1;
    }
    
    // Boost priority for content with parameter descriptions
    if (content.includes('@param') || content.includes('parameter') || content.includes('argument')) {
      multiplier += 0.1;
    }
    
    // Boost priority for content with return type information
    if (content.includes('@return') || content.includes('returns') || content.includes('=>')) {
      multiplier += 0.1;
    }
    
    return Math.min(1.0, baseWeight * multiplier);
  }

  private extractParameters(content: string): string[] {
    const parameters: string[] = [];
    
    // Extract from function signatures
    const functionMatch = content.match(/\(([^)]*)\)/);
    if (functionMatch) {
      const paramString = functionMatch[1];
      const params = paramString.split(',').map(p => p.trim().split(/[:\s]/)[0]).filter(p => p);
      parameters.push(...params);
    }
    
    // Extract from @param documentation
    const paramMatches = content.matchAll(/@param\s+(?:\{[^}]*\}\s+)?(\w+)/g);
    for (const match of paramMatches) {
      if (!parameters.includes(match[1])) {
        parameters.push(match[1]);
      }
    }
    
    return parameters;
  }

  private hasCodeExample(content: string): boolean {
    return content.includes('```') || 
           content.includes('`') || 
           /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/m.test(content);
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private mapSectionTypeToChunkType(sectionType: string): ChunkMetadata['type'] {
    switch (sectionType) {
      case 'api': return 'function';
      case 'code': return 'example';
      case 'example': return 'example';
      case 'guide': return 'guide';
      default: return 'guide';
    }
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(chunks: DocumentChunk[]): ChunkingStats {
    const stats: ChunkingStats = {
      totalChunks: chunks.length,
      chunksByType: {},
      averageChunkSize: 0,
      priorityDistribution: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    let totalWordCount = 0;

    for (const chunk of chunks) {
      // Count by type
      stats.chunksByType[chunk.metadata.type] = 
        (stats.chunksByType[chunk.metadata.type] || 0) + 1;
      
      // Sum word counts
      totalWordCount += chunk.metadata.wordCount;
      
      // Count priority distribution
      if (chunk.metadata.priority >= 0.7) {
        stats.priorityDistribution.high++;
      } else if (chunk.metadata.priority >= 0.4) {
        stats.priorityDistribution.medium++;
      } else {
        stats.priorityDistribution.low++;
      }
    }

    stats.averageChunkSize = chunks.length > 0 ? totalWordCount / chunks.length : 0;

    return stats;
  }

  /**
   * Select top chunks based on priority and type distribution
   */
  selectTopChunks(chunks: DocumentChunk[], maxChunks: number): DocumentChunk[] {
    if (chunks.length <= maxChunks) {
      return chunks;
    }

    // Ensure we get a good distribution of types
    const targetDistribution = {
      function: Math.floor(maxChunks * 0.7),
      example: Math.floor(maxChunks * 0.2),
      guide: Math.floor(maxChunks * 0.1)
    };

    const selected: DocumentChunk[] = [];
    const chunksByType = chunks.reduce((acc, chunk) => {
      if (!acc[chunk.metadata.type]) acc[chunk.metadata.type] = [];
      acc[chunk.metadata.type].push(chunk);
      return acc;
    }, {} as Record<string, DocumentChunk[]>);

    // Sort each type by priority
    Object.values(chunksByType).forEach(typeChunks => {
      typeChunks.sort((a, b) => b.metadata.priority - a.metadata.priority);
    });

    // Select chunks according to target distribution
    for (const [type, target] of Object.entries(targetDistribution)) {
      const availableChunks = chunksByType[type] || [];
      selected.push(...availableChunks.slice(0, target));
    }

    // Fill remaining slots with highest priority chunks
    const remaining = maxChunks - selected.length;
    if (remaining > 0) {
      const unselected = chunks.filter(chunk => !selected.includes(chunk));
      unselected.sort((a, b) => b.metadata.priority - a.metadata.priority);
      selected.push(...unselected.slice(0, remaining));
    }

    return selected.sort((a, b) => b.metadata.priority - a.metadata.priority);
  }
}