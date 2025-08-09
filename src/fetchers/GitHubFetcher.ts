/**
 * GitHub API fetcher for README files and repository content
 */

import { AnalysisResult, AnalysisError, CacheEntry, CacheOptions } from '../types/AnalysisResult.js';
import { ExampleAnalysis } from '../types/PackageInfo.js';

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
  type: 'file' | 'dir';
}

export interface GitHubRepository {
  owner: string;
  repo: string;
  branch: string;
}

export class GitHubFetcher {
  private readonly GITHUB_API_URL = 'https://api.github.com';
  private readonly GITHUB_RAW_URL = 'https://raw.githubusercontent.com';
  private cache = new Map<string, CacheEntry<any>>();
  private cacheOptions: CacheOptions;
  private authToken?: string;
  private rateLimitRemaining = 60; // GitHub's unauthenticated rate limit

  constructor(authToken?: string, cacheOptions: Partial<CacheOptions> = {}) {
    this.authToken = authToken;
    this.cacheOptions = {
      ttl: 10 * 60 * 1000, // 10 minutes default
      maxSize: 50,
      keyPrefix: 'github',
      ...cacheOptions
    };
  }

  /**
   * Get README content from GitHub repository
   */
  async getReadme(repositoryUrl?: string): Promise<AnalysisResult<string | null>> {
    if (!repositoryUrl) {
      return {
        success: true,
        data: null,
        warnings: ['No repository URL provided'],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }

    try {
      const repo = this.parseRepositoryUrl(repositoryUrl);
      if (!repo) {
        return {
          success: true,
          data: null,
          warnings: [`Could not parse repository URL: ${repositoryUrl}`],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'github'
          }
        };
      }

      const cacheKey = `${this.cacheOptions.keyPrefix}:readme:${repo.owner}:${repo.repo}`;
      
      // Check cache first
      const cached = this.getFromCache<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'github-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();

      // Try different README file names
      const readmeFiles = ['README.md', 'readme.md', 'README.rst', 'README.txt', 'README'];
      let readmeContent: string | null = null;
      const warnings: string[] = [];

      for (const filename of readmeFiles) {
        try {
          const content = await this.getFileContent(repo, filename);
          if (content.success && content.data) {
            readmeContent = content.data;
            break;
          }
        } catch (error) {
          warnings.push(`Failed to fetch ${filename}: ${error}`);
        }
      }

      if (readmeContent) {
        this.setCache(cacheKey, readmeContent);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: readmeContent,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch README: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }
  }

  /**
   * Get example files from repository
   */
  async getExamples(repositoryUrl?: string): Promise<AnalysisResult<ExampleAnalysis[]>> {
    if (!repositoryUrl) {
      return {
        success: true,
        data: [],
        warnings: ['No repository URL provided'],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }

    try {
      const repo = this.parseRepositoryUrl(repositoryUrl);
      if (!repo) {
        return {
          success: true,
          data: [],
          warnings: [`Could not parse repository URL: ${repositoryUrl}`],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'github'
          }
        };
      }

      const cacheKey = `${this.cacheOptions.keyPrefix}:examples:${repo.owner}:${repo.repo}`;
      
      // Check cache first
      const cached = this.getFromCache<ExampleAnalysis[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'github-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const examples: ExampleAnalysis[] = [];
      const warnings: string[] = [];

      // Look for example directories
      const exampleDirs = ['examples', 'example', 'demos', 'demo', 'samples'];
      
      for (const dir of exampleDirs) {
        try {
          const files = await this.getDirectoryContents(repo, dir);
          if (files.success && files.data) {
            for (const file of files.data) {
              if (file.type === 'file' && this.isCodeFile(file.name)) {
                const content = await this.getFileContent(repo, file.path);
                if (content.success && content.data) {
                  examples.push({
                    filePath: file.path,
                    content: content.data,
                    language: this.getLanguageFromExtension(file.name),
                    patterns: [], // Will be analyzed later
                    imports: this.extractImports(content.data),
                    category: this.categorizeExample(file.path)
                  });
                }
              }
            }
          }
        } catch (error) {
          warnings.push(`Failed to fetch examples from ${dir}: ${error}`);
        }
      }

      this.setCache(cacheKey, examples);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: examples,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch examples: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(repo: GitHubRepository, filePath: string): Promise<AnalysisResult<string | null>> {
    await this.checkRateLimit();

    try {
      // Use raw.githubusercontent.com for better performance
      const url = `${this.GITHUB_RAW_URL}/${repo.owner}/${repo.repo}/${repo.branch}/${filePath}`;
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: null,
            warnings: [`File not found: ${filePath}`],
            metadata: {
              processingTime: 0,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'github'
            }
          };
        }
        throw this.createError('NETWORK_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      return {
        success: true,
        data: content,
        warnings: [],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch file: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }
  }

  /**
   * Get directory contents
   */
  async getDirectoryContents(repo: GitHubRepository, path: string): Promise<AnalysisResult<GitHubFile[]>> {
    await this.checkRateLimit();

    try {
      const url = `${this.GITHUB_API_URL}/repos/${repo.owner}/${repo.repo}/contents/${path}`;
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      this.updateRateLimit(response);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: [],
            warnings: [`Directory not found: ${path}`],
            metadata: {
              processingTime: 0,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'github'
            }
          };
        }
        throw this.createError('NETWORK_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const files: GitHubFile[] = Array.isArray(data) ? data.map(item => ({
        name: item.name,
        path: item.path,
        content: '', // Content not included in directory listing
        size: item.size,
        type: item.type === 'dir' ? 'dir' : 'file'
      })) : [];

      return {
        success: true,
        data: files,
        warnings: [],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch directory: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'github'
        }
      };
    }
  }

  private parseRepositoryUrl(url: string): GitHubRepository | null {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
      /github\.com:([^\/]+)\/([^\/]+)(?:\.git)?$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          branch: 'main' // Default branch, could be made configurable
        };
      }
    }

    return null;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs', '.php', '.rb', '.swift', '.kt'];
    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private getLanguageFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    return languageMap[ext || ''] || 'text';
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    // JavaScript/TypeScript imports
    const jsImportRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    let match;
    while ((match = jsImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  private categorizeExample(filePath: string): ExampleAnalysis['category'] {
    const path = filePath.toLowerCase();
    
    if (path.includes('test') || path.includes('spec')) {
      return 'test';
    }
    if (path.includes('demo')) {
      return 'demo';
    }
    if (path.includes('integration')) {
      return 'integration';
    }
    return 'documentation';
  }

  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 1) {
      throw this.createError('RATE_LIMITED', 'GitHub API rate limit exceeded');
    }
  }

  private updateRateLimit(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'npm-mcp-generator/1.0.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (this.authToken) {
      headers['Authorization'] = `token ${this.authToken}`;
    }

    return headers;
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count
    entry.hits++;
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.cacheOptions.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      ttl: this.cacheOptions.ttl,
      hits: 0
    });
  }

  private createError(type: AnalysisError['type'], message: string): AnalysisError {
    return {
      type,
      message,
      recoverable: type === 'RATE_LIMITED' || type === 'NETWORK_ERROR',
      suggestions: this.getErrorSuggestions(type)
    };
  }

  private getErrorSuggestions(type: AnalysisError['type']): string[] {
    switch (type) {
      case 'RATE_LIMITED':
        return ['Wait for rate limit reset', 'Use GitHub authentication token'];
      case 'NETWORK_ERROR':
        return ['Check internet connection', 'Verify repository exists'];
      case 'AUTHENTICATION_ERROR':
        return ['Check GitHub token validity', 'Verify repository access permissions'];
      default:
        return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; authenticated: boolean } {
    return {
      remaining: this.rateLimitRemaining,
      authenticated: !!this.authToken
    };
  }

  private isAnalysisError(error: unknown): error is AnalysisError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'recoverable' in error
    );
  }
}