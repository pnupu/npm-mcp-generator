/**
 * Web content crawler for documentation sites
 */

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface CrawledContent {
  url: string;
  title: string;
  markdown: string;
  rawHtml: string;
  links: string[];
  metadata: {
    sitetype: 'jsdoc' | 'gitbook' | 'docusaurus' | 'vuepress' | 'generic';
    sections: string[];
    codeBlocks: number;
    wordCount: number;
    lastModified?: Date;
  };
}

export interface CrawlerOptions {
  maxPages?: number;
  timeout?: number;
  followLinks?: boolean;
  respectRobots?: boolean;
  userAgent?: string;
}

export class WebContentCrawler {
  private turndownService: TurndownService;
  private timeout: number;
  private userAgent: string;

  constructor(options: CrawlerOptions = {}) {
    this.timeout = options.timeout || 30000;
    this.userAgent = options.userAgent || 'npm-mcp-generator/1.0.0';
    
    // Configure Turndown service for better markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full'
    });

    // Add custom rules for better code handling
    this.setupTurndownRules();
  }

  /**
   * Crawl a single documentation page
   */
  async crawlPage(url: string): Promise<AnalysisResult<CrawledContent>> {
    const startTime = Date.now();

    try {
      console.log(`🕷️ Crawling documentation page: ${url}`);

      // Fetch the page
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            type: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            recoverable: response.status >= 500,
            suggestions: [
              'Check if the URL is accessible',
              'Verify the documentation site is online',
              response.status >= 500 ? 'Try again later (server error)' : 'Check the URL format'
            ]
          },
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'web-content-crawler'
          }
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract basic information
      const title = this.extractTitle($);
      const sitetype = this.detectSiteType($, url);
      
      // Clean and process the HTML
      const cleanedHtml = this.cleanHtml($, sitetype);
      
      // Convert to markdown
      const markdown = this.turndownService.turndown(cleanedHtml);
      
      // Extract links
      const links = this.extractLinks($, url);
      
      // Extract metadata
      const sections = this.extractSections($);
      const codeBlocks = this.countCodeBlocks($);
      const wordCount = this.countWords(markdown);
      const lastModified = this.extractLastModified($, response);

      const content: CrawledContent = {
        url,
        title,
        markdown,
        rawHtml: html,
        links,
        metadata: {
          sitetype,
          sections,
          codeBlocks,
          wordCount,
          lastModified
        }
      };

      return {
        success: true,
        data: content,
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'web-content-crawler'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'CRAWL_ERROR',
          message: `Failed to crawl ${url}: ${error}`,
          recoverable: true,
          suggestions: [
            'Check internet connectivity',
            'Verify the URL is accessible',
            'Try increasing the timeout value'
          ]
        },
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'web-content-crawler'
        }
      };
    }
  }

  /**
   * Crawl multiple pages from a documentation site
   */
  async crawlSite(
    startUrl: string, 
    options: CrawlerOptions = {}
  ): Promise<AnalysisResult<CrawledContent[]>> {
    const maxPages = options.maxPages || 10;
    const followLinks = options.followLinks !== false;
    
    const crawledPages: CrawledContent[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit = [startUrl];
    
    console.log(`🕷️ Starting site crawl from: ${startUrl} (max ${maxPages} pages)`);

    while (urlsToVisit.length > 0 && crawledPages.length < maxPages) {
      const currentUrl = urlsToVisit.shift()!;
      
      // Normalize URL to avoid duplicates (remove trailing # and normalize)
      const normalizedUrl = this.normalizeUrl(currentUrl);
      
      if (visitedUrls.has(normalizedUrl)) {
        continue;
      }
      
      visitedUrls.add(normalizedUrl);
      
      // Use the normalized URL for crawling to avoid duplicates
      const pageResult = await this.crawlPage(normalizedUrl);
      
      if (pageResult.success && pageResult.data) {
        crawledPages.push(pageResult.data);
        
        // Add related links if following links is enabled
        if (followLinks && crawledPages.length < maxPages) {
          const relevantLinks = this.filterRelevantLinks(
            pageResult.data.links, 
            startUrl, 
            visitedUrls
          );
          
          urlsToVisit.push(...relevantLinks.slice(0, maxPages - crawledPages.length));
        }
      } else {
        console.warn(`⚠️ Failed to crawl ${currentUrl}: ${pageResult.error?.message}`);
      }
    }

    return {
      success: true,
      data: crawledPages,
      warnings: crawledPages.length === 0 ? ['No pages were successfully crawled'] : [],
      metadata: {
        processingTime: 0, // Will be calculated by caller
        timestamp: new Date(),
        version: '1.0.0',
        source: 'web-content-crawler'
      }
    };
  }

  private setupTurndownRules(): void {
    // Preserve code blocks with language information
    this.turndownService.addRule('codeBlocks', {
      filter: ['pre'],
      replacement: (content, node) => {
        const codeElement = node.querySelector('code');
        if (codeElement) {
          const className = codeElement.getAttribute('class') || '';
          const languageMatch = className.match(/language-(\w+)/);
          const language = languageMatch ? languageMatch[1] : '';
          
          return `\n\n\`\`\`${language}\n${codeElement.textContent || content}\n\`\`\`\n\n`;
        }
        return `\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    });

    // Better handling of inline code
    this.turndownService.addRule('inlineCode', {
      filter: ['code'],
      replacement: (content) => {
        return `\`${content}\``;
      }
    });

    // Remove navigation and sidebar elements
    this.turndownService.addRule('removeNavigation', {
      filter: (node) => {
        if (node.nodeName === 'NAV') return true;
        if (node.nodeName === 'DIV') {
          const className = node.getAttribute('class') || '';
          return /nav|sidebar|menu|breadcrumb|toc/i.test(className);
        }
        return false;
      },
      replacement: () => ''
    });
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors for title
    const titleSelectors = [
      'h1',
      '.page-title',
      '.content-title',
      '.main-title',
      'title'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return 'Documentation Page';
  }

  private detectSiteType($: cheerio.CheerioAPI, url: string): CrawledContent['metadata']['sitetype'] {
    // Check for JSDoc
    if ($('.jsdoc').length > 0 || url.includes('jsdoc') || $('.namespace-member').length > 0) {
      return 'jsdoc';
    }

    // Check for GitBook
    if ($('.gitbook').length > 0 || url.includes('gitbook') || $('.book').length > 0) {
      return 'gitbook';
    }

    // Check for Docusaurus
    if ($('[data-theme="docusaurus"]').length > 0 || $('.docusaurus').length > 0 || url.includes('docusaurus')) {
      return 'docusaurus';
    }

    // Check for VuePress
    if ($('.vuepress').length > 0 || $('#app').length > 0 && $('.theme-container').length > 0) {
      return 'vuepress';
    }

    return 'generic';
  }

  private cleanHtml($: cheerio.CheerioAPI, sitetype: CrawledContent['metadata']['sitetype']): string {
    // Remove common unwanted elements
    $('script, style, nav, .nav, .navbar, .sidebar, .menu, .breadcrumb, .footer, .header').remove();
    $('.advertisement, .ads, .social-share, .comments').remove();
    
    // Site-specific cleaning
    switch (sitetype) {
      case 'jsdoc':
        $('.navigation, .nav-list, .nav-item').remove();
        break;
      case 'gitbook':
        $('.book-summary, .book-header, .navigation').remove();
        break;
      case 'docusaurus':
        $('.navbar, .sidebar, .pagination-nav, .theme-doc-sidebar-container').remove();
        break;
      case 'vuepress':
        $('.sidebar, .navbar, .page-nav').remove();
        break;
    }

    // Get the main content area
    const contentSelectors = [
      'main',
      '.content',
      '.main-content',
      '.page-content',
      '.documentation',
      '.docs',
      'article',
      '.article',
      '#content',
      '.container'
    ];

    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length && content.text().trim().length > 100) {
        return content.html() || '';
      }
    }

    // Fallback to body content
    $('head').remove();
    return $('body').html() || '';
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          // Only include links from the same domain
          const linkUrl = new URL(absoluteUrl);
          if (linkUrl.hostname === baseUrlObj.hostname) {
            links.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    return [...new Set(links)]; // Remove duplicates
  }

  private extractSections($: cheerio.CheerioAPI): string[] {
    const sections: string[] = [];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        sections.push(text);
      }
    });

    return sections;
  }

  private countCodeBlocks($: cheerio.CheerioAPI): number {
    return $('pre, code').length;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractLastModified($: cheerio.CheerioAPI, response: Response): Date | undefined {
    // Try to get last modified from HTTP headers
    const lastModifiedHeader = response.headers.get('last-modified');
    if (lastModifiedHeader) {
      return new Date(lastModifiedHeader);
    }

    // Try to find it in meta tags
    const metaModified = $('meta[name="last-modified"], meta[property="article:modified_time"]').attr('content');
    if (metaModified) {
      return new Date(metaModified);
    }

    return undefined;
  }

  private filterRelevantLinks(links: string[], baseUrl: string, visitedUrls: Set<string>): string[] {
    const baseUrlObj = new URL(baseUrl);
    
    return links.filter(link => {
      if (visitedUrls.has(link)) return false;
      
      try {
        const linkUrl = new URL(link);
        
        // Must be same domain
        if (linkUrl.hostname !== baseUrlObj.hostname) return false;
        
        // Skip non-documentation links
        const path = linkUrl.pathname.toLowerCase();
        if (path.includes('/api/') || 
            path.includes('/docs/') || 
            path.includes('/guide/') ||
            path.includes('/reference/') ||
            path.includes('/tutorial/')) {
          return true;
        }
        
        // Skip obvious non-content links
        if (path.includes('/search') ||
            path.includes('/login') ||
            path.includes('/contact') ||
            path.includes('/about') ||
            path.endsWith('.pdf') ||
            path.endsWith('.zip')) {
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove fragment (hash)
      urlObj.hash = '';
      
      // Remove trailing slash from pathname
      if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      
      // Remove common query parameters that don't affect content
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }
}