/**
 * Content processor for converting and preparing crawled documentation
 */

import { CrawledContent } from '../fetchers/WebContentCrawler.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface ProcessedContent {
  url: string;
  title: string;
  markdown: string;
  sections: ContentSection[];
  metadata: {
    sitetype: string;
    wordCount: number;
    codeBlocks: number;
    apiReferences: number;
    lastModified?: Date;
  };
}

export interface ContentSection {
  id: string;
  title: string;
  level: number;
  content: string;
  type: 'text' | 'code' | 'api' | 'example' | 'guide';
  subsections: ContentSection[];
}

export interface ProcessorOptions {
  minSectionLength?: number;
  maxSectionLength?: number;
  preserveCodeBlocks?: boolean;
  extractApiReferences?: boolean;
}

export class ContentProcessor {
  private options: Required<ProcessorOptions>;

  constructor(options: ProcessorOptions = {}) {
    this.options = {
      minSectionLength: options.minSectionLength || 50,
      maxSectionLength: options.maxSectionLength || 2000,
      preserveCodeBlocks: options.preserveCodeBlocks !== false,
      extractApiReferences: options.extractApiReferences !== false
    };
  }

  /**
   * Process crawled content into structured sections
   */
  async processContent(crawledContent: CrawledContent): Promise<AnalysisResult<ProcessedContent>> {
    const startTime = Date.now();

    try {
      console.log(`📝 Processing content from: ${crawledContent.url}`);

      // Parse markdown into sections
      const sections = this.parseMarkdownSections(crawledContent.markdown);
      
      // Classify and enhance sections
      const enhancedSections = this.enhanceSections(sections, crawledContent.metadata.sitetype);
      
      // Extract API references if enabled
      const apiReferences = this.options.extractApiReferences 
        ? this.extractApiReferences(crawledContent.markdown)
        : 0;

      const processedContent: ProcessedContent = {
        url: crawledContent.url,
        title: crawledContent.title,
        markdown: crawledContent.markdown,
        sections: enhancedSections,
        metadata: {
          sitetype: crawledContent.metadata.sitetype,
          wordCount: crawledContent.metadata.wordCount,
          codeBlocks: crawledContent.metadata.codeBlocks,
          apiReferences,
          lastModified: crawledContent.metadata.lastModified
        }
      };

      return {
        success: true,
        data: processedContent,
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'content-processor'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Failed to process content: ${error}`,
          recoverable: true,
          suggestions: [
            'Check if the markdown content is valid',
            'Try with different processing options',
            'Verify the content structure'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'content-processor'
        }
      };
    }
  }

  /**
   * Process multiple crawled contents
   */
  async processMultipleContents(
    crawledContents: CrawledContent[]
  ): Promise<AnalysisResult<ProcessedContent[]>> {
    const processedContents: ProcessedContent[] = [];
    const warnings: string[] = [];

    for (const content of crawledContents) {
      const result = await this.processContent(content);
      
      if (result.success && result.data) {
        processedContents.push(result.data);
      } else {
        warnings.push(`Failed to process ${content.url}: ${result.error?.message}`);
      }
    }

    return {
      success: true,
      data: processedContents,
      warnings: warnings.length > 0 ? warnings : [],
      metadata: {
        processingTime: 0,
        timestamp: new Date(),
        version: '1.0.0',
        source: 'content-processor'
      }
    };
  }

  private parseMarkdownSections(markdown: string): ContentSection[] {
    const lines = markdown.split('\n');
    const sections: ContentSection[] = [];
    let currentSection: ContentSection | null = null;
    let sectionCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        // Save previous section if it exists and has content
        if (currentSection && currentSection.content.trim().length >= this.options.minSectionLength) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section-${++sectionCounter}`,
          title,
          level,
          content: '',
          type: this.classifySection(title, ''),
          subsections: []
        };
      } else if (currentSection) {
        // Add line to current section
        currentSection.content += line + '\n';
      } else {
        // Content before first heading - create a default section
        if (!currentSection) {
          currentSection = {
            id: `section-${++sectionCounter}`,
            title: 'Introduction',
            level: 1,
            content: line + '\n',
            type: 'text',
            subsections: []
          };
        }
      }
    }

    // Don't forget the last section
    if (currentSection && currentSection.content.trim().length >= this.options.minSectionLength) {
      sections.push(currentSection);
    }

    return sections;
  }

  private enhanceSections(sections: ContentSection[], sitetype: string): ContentSection[] {
    return sections.map(section => {
      // Re-classify section based on content
      const enhancedType = this.classifySection(section.title, section.content);
      
      // Split large sections if needed
      if (section.content.length > this.options.maxSectionLength) {
        const subsections = this.splitLargeSection(section);
        return {
          ...section,
          type: enhancedType,
          subsections
        };
      }

      return {
        ...section,
        type: enhancedType
      };
    });
  }

  private classifySection(title: string, content: string): ContentSection['type'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Check for API references
    if (titleLower.includes('api') || 
        titleLower.includes('reference') ||
        titleLower.includes('method') ||
        titleLower.includes('function') ||
        titleLower.includes('class') ||
        contentLower.includes('function(') ||
        contentLower.includes('class ') ||
        contentLower.includes('interface ')) {
      return 'api';
    }

    // Check for code examples
    if (titleLower.includes('example') ||
        titleLower.includes('usage') ||
        titleLower.includes('demo') ||
        content.includes('```') ||
        content.includes('`')) {
      return 'example';
    }

    // Check for code blocks
    if (content.includes('```') && content.split('```').length > 3) {
      return 'code';
    }

    // Check for guides/tutorials
    if (titleLower.includes('guide') ||
        titleLower.includes('tutorial') ||
        titleLower.includes('getting started') ||
        titleLower.includes('how to') ||
        titleLower.includes('quickstart')) {
      return 'guide';
    }

    return 'text';
  }

  private splitLargeSection(section: ContentSection): ContentSection[] {
    const paragraphs = section.content.split('\n\n').filter(p => p.trim());
    const subsections: ContentSection[] = [];
    let currentSubsection = '';
    let subsectionCounter = 0;

    for (const paragraph of paragraphs) {
      if (currentSubsection.length + paragraph.length > this.options.maxSectionLength) {
        if (currentSubsection.trim()) {
          subsections.push({
            id: `${section.id}-sub-${++subsectionCounter}`,
            title: `${section.title} (Part ${subsectionCounter})`,
            level: section.level + 1,
            content: currentSubsection.trim(),
            type: this.classifySection('', currentSubsection),
            subsections: []
          });
        }
        currentSubsection = paragraph + '\n\n';
      } else {
        currentSubsection += paragraph + '\n\n';
      }
    }

    // Add the last subsection
    if (currentSubsection.trim()) {
      subsections.push({
        id: `${section.id}-sub-${++subsectionCounter}`,
        title: `${section.title} (Part ${subsectionCounter})`,
        level: section.level + 1,
        content: currentSubsection.trim(),
        type: this.classifySection('', currentSubsection),
        subsections: []
      });
    }

    return subsections;
  }

  private extractApiReferences(markdown: string): number {
    let count = 0;
    
    // Count function definitions
    count += (markdown.match(/function\s+\w+\s*\(/g) || []).length;
    
    // Count class definitions
    count += (markdown.match(/class\s+\w+/g) || []).length;
    
    // Count interface definitions
    count += (markdown.match(/interface\s+\w+/g) || []).length;
    
    // Count method signatures (common patterns)
    count += (markdown.match(/\w+\s*\([^)]*\)\s*:/g) || []).length;
    
    // Count property definitions
    count += (markdown.match(/\w+\s*:\s*\w+/g) || []).length;

    return count;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(processedContents: ProcessedContent[]): {
    totalPages: number;
    totalSections: number;
    totalWords: number;
    totalCodeBlocks: number;
    totalApiReferences: number;
    siteTypes: Record<string, number>;
    sectionTypes: Record<string, number>;
  } {
    const stats = {
      totalPages: processedContents.length,
      totalSections: 0,
      totalWords: 0,
      totalCodeBlocks: 0,
      totalApiReferences: 0,
      siteTypes: {} as Record<string, number>,
      sectionTypes: {} as Record<string, number>
    };

    for (const content of processedContents) {
      stats.totalSections += content.sections.length;
      stats.totalWords += content.metadata.wordCount;
      stats.totalCodeBlocks += content.metadata.codeBlocks;
      stats.totalApiReferences += content.metadata.apiReferences;
      
      // Count site types
      stats.siteTypes[content.metadata.sitetype] = 
        (stats.siteTypes[content.metadata.sitetype] || 0) + 1;
      
      // Count section types
      for (const section of content.sections) {
        stats.sectionTypes[section.type] = 
          (stats.sectionTypes[section.type] || 0) + 1;
      }
    }

    return stats;
  }
}