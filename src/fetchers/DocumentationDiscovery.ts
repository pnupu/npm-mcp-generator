/**
 * Documentation discovery system for finding comprehensive package documentation
 */

import { PackageInfo } from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';
import { WebContentCrawler, CrawledContent } from './WebContentCrawler.js';
import { ContentProcessor, ProcessedContent } from '../processors/ContentProcessor.js';
import { ContentChunker, DocumentChunk } from '../processors/ContentChunker.js';
import { VectorEmbedder, EmbeddedChunk } from '../embeddings/VectorEmbedder.js';

export interface DocumentationUrl {
  url: string;
  type: 'official' | 'community' | 'generated' | 'manual';
  confidence: number; // 0-1 score of how likely this is the main docs
  source: string; // where we found this URL
}

export interface DocumentationDiscoveryOptions {
  manualUrl?: string;
  includeCommonPatterns?: boolean;
  includeReadmeLinks?: boolean;
  timeout?: number;
  generateEmbeddings?: boolean;
  openaiApiKey?: string;
}

export class DocumentationDiscovery {
  private timeout: number;
  private webCrawler: WebContentCrawler;
  private contentProcessor: ContentProcessor;

  constructor(options: DocumentationDiscoveryOptions = {}) {
    this.timeout = options.timeout || 10000;
    this.webCrawler = new WebContentCrawler({
      timeout: this.timeout,
      maxPages: 5
    });
    this.contentProcessor = new ContentProcessor({
      minSectionLength: 50,
      maxSectionLength: 2000,
      extractApiReferences: true
    });
  }

  /**
   * Discover documentation URLs for a package
   */
  async discoverDocumentationUrls(
    packageInfo: PackageInfo,
    readmeContent?: string,
    options: DocumentationDiscoveryOptions = {}
  ): Promise<AnalysisResult<DocumentationUrl[]>> {
    const startTime = Date.now();
    const urls: DocumentationUrl[] = [];
    const warnings: string[] = [];

    try {
      // 1. Manual override (highest priority)
      if (options.manualUrl) {
        const isValid = await this.validateUrl(options.manualUrl);
        if (isValid) {
          urls.push({
            url: options.manualUrl,
            type: 'manual',
            confidence: 1.0,
            source: 'manual-override'
          });
        } else {
          warnings.push(`Manual URL ${options.manualUrl} is not accessible`);
        }
      }

      // 2. Package.json homepage and documentation fields
      if (packageInfo.homepage) {
        const homepageUrls = await this.generateHomepageVariations(packageInfo.homepage);
        for (const url of homepageUrls) {
          const isValid = await this.validateUrl(url.url);
          if (isValid) {
            urls.push(url);
          }
        }
      }

      // 3. Common documentation patterns
      if (options.includeCommonPatterns !== false) {
        const patternUrls = this.generateCommonPatterns(packageInfo.name);
        for (const url of patternUrls) {
          const isValid = await this.validateUrl(url.url);
          if (isValid) {
            urls.push(url);
          }
        }
      }

      // 4. README link extraction
      if (options.includeReadmeLinks !== false && readmeContent) {
        const readmeUrls = this.extractReadmeLinks(readmeContent, packageInfo.name);
        for (const url of readmeUrls) {
          const isValid = await this.validateUrl(url.url);
          if (isValid) {
            urls.push(url);
          }
        }
      }

      // 5. Repository-based URLs
      if (packageInfo.repository?.url) {
        const repoUrls = this.generateRepositoryUrls(packageInfo.repository.url);
        for (const url of repoUrls) {
          const isValid = await this.validateUrl(url.url);
          if (isValid) {
            urls.push(url);
          }
        }
      }

      // Sort by confidence and remove duplicates
      const uniqueUrls = this.deduplicateUrls(urls);
      const sortedUrls = uniqueUrls.sort((a, b) => b.confidence - a.confidence);

      return {
        success: true,
        data: sortedUrls,
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Documentation discovery failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Try providing a manual documentation URL with --docs-url',
            'Check if the package has a homepage or repository URL',
            'Verify network connectivity'
          ]
        },
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
    }
  }

  /**
   * Generate homepage-based documentation URL variations
   */
  private async generateHomepageVariations(homepage: string): Promise<DocumentationUrl[]> {
    const baseUrl = homepage.replace(/\/$/, ''); // Remove trailing slash
    
    return [
      {
        url: `${baseUrl}/docs`,
        type: 'official',
        confidence: 0.9,
        source: 'homepage-docs'
      },
      {
        url: `${baseUrl}/api`,
        type: 'official', 
        confidence: 0.8,
        source: 'homepage-api'
      },
      {
        url: `${baseUrl}/documentation`,
        type: 'official',
        confidence: 0.7,
        source: 'homepage-documentation'
      },
      {
        url: `${baseUrl}/reference`,
        type: 'official',
        confidence: 0.6,
        source: 'homepage-reference'
      }
    ];
  }

  /**
   * Generate common documentation site patterns
   */
  private generateCommonPatterns(packageName: string): DocumentationUrl[] {
    const cleanName = packageName.replace(/[@\/]/g, '').toLowerCase();
    
    return [
      {
        url: `https://${cleanName}.com/docs`,
        type: 'official',
        confidence: 0.8,
        source: 'pattern-domain-docs'
      },
      {
        url: `https://docs.${cleanName}.com`,
        type: 'official',
        confidence: 0.8,
        source: 'pattern-docs-subdomain'
      },
      {
        url: `https://${cleanName}.github.io`,
        type: 'official',
        confidence: 0.7,
        source: 'pattern-github-pages'
      },
      {
        url: `https://${cleanName}.readthedocs.io`,
        type: 'community',
        confidence: 0.6,
        source: 'pattern-readthedocs'
      },
      {
        url: `https://${cleanName}.gitbook.io`,
        type: 'community',
        confidence: 0.5,
        source: 'pattern-gitbook'
      }
    ];
  }

  /**
   * Extract documentation links from README content
   */
  private extractReadmeLinks(readmeContent: string, packageName: string): DocumentationUrl[] {
    const urls: DocumentationUrl[] = [];
    
    // Look for markdown links with documentation keywords
    const linkRegex = /\[([^\]]*(?:docs?|documentation|api|reference|guide)[^\]]*)\]\(([^)]+)\)/gi;
    let match;
    
    while ((match = linkRegex.exec(readmeContent)) !== null) {
      const linkText = match[1].toLowerCase();
      const url = match[2];
      
      // Skip relative links and non-HTTP URLs
      if (!url.startsWith('http')) continue;
      
      let confidence = 0.5;
      if (linkText.includes('docs')) confidence = 0.8;
      if (linkText.includes('api')) confidence = 0.7;
      if (linkText.includes('documentation')) confidence = 0.6;
      
      urls.push({
        url,
        type: 'official',
        confidence,
        source: 'readme-link'
      });
    }

    // Look for badge links (often point to documentation)
    const badgeRegex = /\[!\[([^\]]*)\]\([^)]+\)\]\(([^)]+)\)/gi;
    while ((match = badgeRegex.exec(readmeContent)) !== null) {
      const badgeText = match[1].toLowerCase();
      const url = match[2];
      
      if (badgeText.includes('docs') || badgeText.includes('documentation')) {
        urls.push({
          url,
          type: 'official',
          confidence: 0.6,
          source: 'readme-badge'
        });
      }
    }

    return urls;
  }

  /**
   * Generate repository-based documentation URLs
   */
  private generateRepositoryUrls(repositoryUrl: string): DocumentationUrl[] {
    // Extract GitHub repo info
    const githubMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!githubMatch) return [];
    
    const [, owner, repo] = githubMatch;
    const cleanRepo = repo.replace(/\.git$/, '');
    
    return [
      {
        url: `https://${owner}.github.io/${cleanRepo}`,
        type: 'official',
        confidence: 0.7,
        source: 'github-pages'
      },
      {
        url: `https://github.com/${owner}/${cleanRepo}/wiki`,
        type: 'community',
        confidence: 0.4,
        source: 'github-wiki'
      }
    ];
  }

  /**
   * Validate if a URL is accessible and contains documentation
   */
  private async validateUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'npm-mcp-generator/1.0.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is successful and content type suggests documentation
      if (!response.ok) return false;
      
      const contentType = response.headers.get('content-type') || '';
      return contentType.includes('text/html') || contentType.includes('application/json');
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove duplicate URLs and merge confidence scores
   */
  private deduplicateUrls(urls: DocumentationUrl[]): DocumentationUrl[] {
    const urlMap = new Map<string, DocumentationUrl>();
    
    for (const url of urls) {
      const existing = urlMap.get(url.url);
      if (existing) {
        // Keep the one with higher confidence
        if (url.confidence > existing.confidence) {
          urlMap.set(url.url, url);
        }
      } else {
        urlMap.set(url.url, url);
      }
    }
    
    return Array.from(urlMap.values());
  }

  /**
   * Get the best documentation URL for a package
   */
  async getBestDocumentationUrl(
    packageInfo: PackageInfo,
    readmeContent?: string,
    options: DocumentationDiscoveryOptions = {}
  ): Promise<DocumentationUrl | null> {
    const result = await this.discoverDocumentationUrls(packageInfo, readmeContent, options);
    
    if (result.success && result.data && result.data.length > 0) {
      return result.data[0]; // Highest confidence URL
    }
    
    return null;
  }

  /**
   * Crawl and process comprehensive documentation
   */
  async crawlComprehensiveDocumentation(
    url: string,
    options: { maxPages?: number } = {}
  ): Promise<AnalysisResult<ProcessedContent[]>> {
    const startTime = Date.now();
    
    try {
      console.log(`🕷️ Crawling comprehensive documentation from: ${url}`);
      
      // Crawl the documentation site
      const crawlResult = await this.webCrawler.crawlSite(url, {
        maxPages: options.maxPages || 5,
        followLinks: true
      });
      
      if (!crawlResult.success || !crawlResult.data) {
        return {
          success: false,
          error: crawlResult.error || {
            type: 'CRAWL_ERROR',
            message: 'Failed to crawl documentation site',
            recoverable: true,
            suggestions: ['Check if the URL is accessible', 'Try with a different URL']
          },
          warnings: crawlResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
      // Deduplicate crawled content based on title and content similarity
      const deduplicatedContent = this.deduplicateCrawledContent(crawlResult.data);
      console.log(`🔄 Deduplicated ${crawlResult.data.length} pages to ${deduplicatedContent.length} unique pages`);
      
      // Process the crawled content
      const processResult = await this.contentProcessor.processMultipleContents(deduplicatedContent);
      
      if (!processResult.success || !processResult.data) {
        return {
          success: false,
          error: processResult.error || {
            type: 'PROCESSING_ERROR',
            message: 'Failed to process crawled documentation',
            recoverable: true,
            suggestions: ['Try with different processing options']
          },
          warnings: processResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
      const stats = this.contentProcessor.getProcessingStats(processResult.data);
      console.log(`📊 Crawled ${stats.totalPages} pages, extracted ${stats.totalSections} sections`);
      
      return {
        success: true,
        data: processResult.data,
        warnings: [...(crawlResult.warnings || []), ...(processResult.warnings || [])],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Documentation crawling failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check internet connectivity',
            'Verify the documentation URL is accessible',
            'Try with a simpler URL'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
    }
  }

  /**
   * Get chunked documentation ready for vector embedding
   */
  async getChunkedDocumentation(
    url: string,
    options: { maxPages?: number; maxChunks?: number } = {}
  ): Promise<AnalysisResult<DocumentChunk[]>> {
    const startTime = Date.now();
    
    try {
      console.log(`🧩 Getting chunked documentation from: ${url}`);
      
      // First crawl and process the documentation
      const processedResult = await this.crawlComprehensiveDocumentation(url, {
        maxPages: options.maxPages || parseInt(process.env.DEFAULT_MAX_PAGES || '5')
      });
      
      if (!processedResult.success || !processedResult.data) {
        return {
          success: false,
          error: processedResult.error,
          warnings: processedResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
      // Then chunk the processed content
      const contentChunker = new ContentChunker({
        maxChunkSize: 1500,
        minChunkSize: 100,
        priorityWeights: {
          function: 0.7,
          example: 0.2,
          guide: 0.1,
          text: 0.05
        },
        maxChunksPerDocument: options.maxChunks || parseInt(process.env.DEFAULT_MAX_CHUNKS || '1000')
      });
      
      const chunkResult = await contentChunker.chunkMultipleContents(processedResult.data);
      
      if (!chunkResult.success || !chunkResult.data) {
        return {
          success: false,
          error: chunkResult.error,
          warnings: chunkResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
      // Select top chunks based on priority
      const topChunks = contentChunker.selectTopChunks(
        chunkResult.data, 
        options.maxChunks || parseInt(process.env.DEFAULT_MAX_CHUNKS || '1000')
      );
      
      const stats = contentChunker.getChunkingStats(topChunks);
      console.log(`📊 Created ${stats.totalChunks} prioritized chunks:`);
      console.log(`   Functions: ${stats.chunksByType.function || 0} (${((stats.chunksByType.function || 0) / stats.totalChunks * 100).toFixed(1)}%)`);
      console.log(`   Examples: ${stats.chunksByType.example || 0} (${((stats.chunksByType.example || 0) / stats.totalChunks * 100).toFixed(1)}%)`);
      console.log(`   Guides: ${stats.chunksByType.guide || 0} (${((stats.chunksByType.guide || 0) / stats.totalChunks * 100).toFixed(1)}%)`);
      
      return {
        success: true,
        data: topChunks,
        warnings: [...(processedResult.warnings || []), ...(chunkResult.warnings || [])],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Documentation chunking failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check internet connectivity',
            'Verify the documentation URL is accessible',
            'Try with different chunking options'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
    }
  }

  /**
   * Get embedded documentation ready for vector-based MCP server
   */
  async getEmbeddedDocumentation(
    url: string,
    options: { 
      maxPages?: number; 
      maxChunks?: number; 
      generateEmbeddings?: boolean;
      openaiApiKey?: string;
    } = {}
  ): Promise<AnalysisResult<{
    chunks: DocumentChunk[];
    embeddedChunks?: EmbeddedChunk[];
    embeddingStats?: any;
  }>> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Getting embedded documentation from: ${url}`);
      
      // First get chunked documentation
      const chunkedResult = await this.getChunkedDocumentation(url, {
        maxPages: options.maxPages || parseInt(process.env.DEFAULT_MAX_PAGES || '5'),
        maxChunks: options.maxChunks || parseInt(process.env.DEFAULT_MAX_CHUNKS || '1000')
      });
      
      if (!chunkedResult.success || !chunkedResult.data) {
        return {
          success: false,
          error: chunkedResult.error,
          warnings: chunkedResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
      const chunks = chunkedResult.data;
      
      // Generate embeddings if requested and API key is available
      if (options.generateEmbeddings !== false && (options.openaiApiKey || process.env.OPENAI_API_KEY)) {
        console.log('🔮 Generating vector embeddings...');
        
        const vectorEmbedder = new VectorEmbedder({
          apiKey: options.openaiApiKey,
          batchSize: 50, // Smaller batches for better reliability
          maxRetries: 3
        });
        
        // Test connection first
        const connectionTest = await vectorEmbedder.testConnection();
        if (!connectionTest.success) {
          console.warn('⚠️ OpenAI API connection failed, proceeding without embeddings');
          return {
            success: true,
            data: { chunks },
            warnings: [
              ...(chunkedResult.warnings || []),
              'OpenAI API connection failed - MCP server will be generated without vector search capabilities'
            ],
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'documentation-discovery'
            }
          };
        }
        
        const embeddingResult = await vectorEmbedder.embedChunks(chunks);
        
        if (embeddingResult.success && embeddingResult.data) {
          console.log('✅ Vector embeddings generated successfully');
          
          return {
            success: true,
            data: {
              chunks,
              embeddedChunks: embeddingResult.data,
              embeddingStats: embeddingResult.metadata?.stats
            },
            warnings: [...(chunkedResult.warnings || []), ...(embeddingResult.warnings || [])],
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'documentation-discovery'
            }
          };
        } else {
          console.warn('⚠️ Embedding generation failed, proceeding without embeddings');
          return {
            success: true,
            data: { chunks },
            warnings: [
              ...(chunkedResult.warnings || []),
              `Embedding generation failed: ${embeddingResult.error?.message || 'Unknown error'}`
            ],
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'documentation-discovery'
            }
          };
        }
      } else {
        console.log('📝 Skipping embedding generation (no API key or disabled)');
        return {
          success: true,
          data: { chunks },
          warnings: chunkedResult.warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'documentation-discovery'
          }
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Embedded documentation generation failed: ${error}`,
          recoverable: true,
          suggestions: [
            'Check internet connectivity',
            'Verify OpenAI API key if using embeddings',
            'Try with different options'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'documentation-discovery'
        }
      };
    }
  }

  /**
   * Deduplicate crawled content based on title and content similarity
   */
  private deduplicateCrawledContent(crawledContents: CrawledContent[]): CrawledContent[] {
    const uniqueContent: CrawledContent[] = [];
    const seenTitles = new Set<string>();
    
    for (const content of crawledContents) {
      const titleKey = content.title.toLowerCase().trim();
      
      // Skip if we've seen this exact title before
      if (seenTitles.has(titleKey)) {
        console.log(`🔄 Skipping duplicate content: "${content.title}" from ${content.url}`);
        continue;
      }
      
      // Check for content similarity with existing content
      let isDuplicate = false;
      for (const existing of uniqueContent) {
        if (this.isContentSimilar(content, existing)) {
          console.log(`🔄 Skipping similar content: "${content.title}" (similar to "${existing.title}")`);
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueContent.push(content);
        seenTitles.add(titleKey);
      }
    }
    
    return uniqueContent;
  }

  /**
   * Check if two crawled contents are similar enough to be considered duplicates
   */
  private isContentSimilar(content1: CrawledContent, content2: CrawledContent): boolean {
    // If titles are the same, they're likely duplicates
    if (content1.title.toLowerCase() === content2.title.toLowerCase()) {
      return true;
    }
    
    // If markdown content is very similar (>90% overlap), they're duplicates
    const similarity = this.calculateContentSimilarity(content1.markdown, content2.markdown);
    return similarity > 0.9;
  }

  /**
   * Calculate similarity between two markdown contents
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple similarity based on shared words
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Check if a URL looks like comprehensive API documentation
   */
  async isComprehensiveDocumentation(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers: {
          'User-Agent': 'npm-mcp-generator/1.0.0'
        }
      });
      
      if (!response.ok) return false;
      
      const html = await response.text();
      
      // Look for indicators of comprehensive documentation
      const indicators = [
        /api\s+reference/i,
        /function\s+reference/i,
        /method\s+documentation/i,
        /<code[^>]*>/gi, // Multiple code blocks
        /class="[^"]*function[^"]*"/i,
        /class="[^"]*method[^"]*"/i
      ];
      
      let score = 0;
      for (const indicator of indicators) {
        if (indicator.test(html)) score++;
      }
      
      // Consider it comprehensive if it matches multiple indicators
      return score >= 2;
      
    } catch (error) {
      return false;
    }
  }
}