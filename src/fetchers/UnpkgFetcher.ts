/**
 * Unpkg.com fetcher for direct package file access and TypeScript definitions
 */

import { AnalysisResult, AnalysisError, CacheEntry, CacheOptions } from '../types/AnalysisResult.js';

export interface UnpkgFile {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mtime?: string;
}

export interface UnpkgMetadata {
  files: UnpkgFile[];
  packageJson: any;
}

export class UnpkgFetcher {
  private readonly UNPKG_URL = 'https://unpkg.com';
  private cache = new Map<string, CacheEntry<any>>();
  private cacheOptions: CacheOptions;

  constructor(cacheOptions: Partial<CacheOptions> = {}) {
    this.cacheOptions = {
      ttl: 15 * 60 * 1000, // 15 minutes default (unpkg content is immutable per version)
      maxSize: 200,
      keyPrefix: 'unpkg',
      ...cacheOptions
    };
  }

  /**
   * Get TypeScript definitions with fallback to @types packages
   */
  async getTypeDefinitions(packageName: string, version: string): Promise<AnalysisResult<string | null>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:types:${packageName}:${version}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<string | null>(cacheKey);
      if (cached !== undefined) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'unpkg-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      let typeDefinitions: string | null = null;
      const warnings: string[] = [];

      // Strategy 1: Look for index.d.ts in the package root
      const indexDtsResult = await this.getFileContent(packageName, version, 'index.d.ts');
      if (indexDtsResult.success && indexDtsResult.data) {
        typeDefinitions = indexDtsResult.data;
      } else if (indexDtsResult.warnings) {
        warnings.push(...indexDtsResult.warnings);
      }

      // Strategy 2: Look for types field in package.json
      if (!typeDefinitions) {
        const packageJsonResult = await this.getPackageJson(packageName, version);
        if (packageJsonResult.success && packageJsonResult.data) {
          const typesPath = packageJsonResult.data.types || packageJsonResult.data.typings;
          if (typesPath) {
            const typesResult = await this.getFileContent(packageName, version, typesPath);
            if (typesResult.success && typesResult.data) {
              typeDefinitions = typesResult.data;
            } else {
              warnings.push(`Types file specified in package.json not found: ${typesPath}`);
            }
          }
        }
      }

      // Strategy 3: Look for common TypeScript definition files
      if (!typeDefinitions) {
        const commonTypeFiles = [
          'lib/index.d.ts',
          'dist/index.d.ts',
          'build/index.d.ts',
          'src/index.d.ts',
          `${packageName.split('/').pop()}.d.ts`
        ];

        for (const filePath of commonTypeFiles) {
          const result = await this.getFileContent(packageName, version, filePath);
          if (result.success && result.data) {
            typeDefinitions = result.data;
            break;
          }
        }
      }

      // Strategy 4: Try @types package
      if (!typeDefinitions) {
        const typesPackageName = this.getTypesPackageName(packageName);
        const typesResult = await this.getTypeDefinitionsFromTypesPackage(typesPackageName);
        
        if (typesResult.success && typesResult.data) {
          typeDefinitions = typesResult.data;
        } else {
          warnings.push(`No @types package found for ${packageName}`);
        }
      }

      // Cache the result (even if null)
      this.setCache(cacheKey, typeDefinitions);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: typeDefinitions,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch TypeScript definitions: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg'
        }
      };
    }
  }

  /**
   * Get file content from unpkg
   */
  async getFileContent(packageName: string, version: string, filePath: string): Promise<AnalysisResult<string | null>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:file:${packageName}:${version}:${filePath}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<string | null>(cacheKey);
      if (cached !== undefined) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'unpkg-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const url = `${this.UNPKG_URL}/${encodeURIComponent(packageName)}@${version}/${filePath}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          this.setCache(cacheKey, null);
          return {
            success: true,
            data: null,
            warnings: [`File not found: ${filePath}`],
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'unpkg'
            }
          };
        }
        throw this.createError('NETWORK_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Cache the result
      this.setCache(cacheKey, content);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: content,
        warnings: [],
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg',
          cacheHit: false
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
          source: 'unpkg'
        }
      };
    }
  }

  /**
   * Get package.json from unpkg
   */
  async getPackageJson(packageName: string, version: string): Promise<AnalysisResult<any>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:package-json:${packageName}:${version}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'unpkg-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const url = `${this.UNPKG_URL}/${encodeURIComponent(packageName)}@${version}/package.json`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw this.createError('NETWORK_ERROR', `Failed to fetch package.json: HTTP ${response.status}`);
      }

      const packageJson = await response.json();
      
      // Cache the result
      this.setCache(cacheKey, packageJson);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: packageJson,
        warnings: [],
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch package.json: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg'
        }
      };
    }
  }

  /**
   * Get directory listing from unpkg
   */
  async getDirectoryListing(packageName: string, version: string, path: string = ''): Promise<AnalysisResult<UnpkgFile[]>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:dir:${packageName}:${version}:${path}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<UnpkgFile[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'unpkg-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const url = `${this.UNPKG_URL}/${encodeURIComponent(packageName)}@${version}/${path}?meta`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: [],
            warnings: [`Directory not found: ${path}`],
            metadata: {
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
              version: '1.0.0',
              source: 'unpkg'
            }
          };
        }
        throw this.createError('NETWORK_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      const files: UnpkgFile[] = metadata.files?.map((file: any) => ({
        path: file.path,
        type: file.type,
        size: file.size,
        mtime: file.mtime
      })) || [];

      // Cache the result
      this.setCache(cacheKey, files);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: files,
        warnings: [],
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Failed to fetch directory listing: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg'
        }
      };
    }
  }

  /**
   * Find TypeScript definition files in package
   */
  async findTypeScriptFiles(packageName: string, version: string): Promise<AnalysisResult<string[]>> {
    try {
      const dirResult = await this.getDirectoryListing(packageName, version);
      
      if (!dirResult.success || !dirResult.data) {
        return {
          success: true,
          data: [],
          warnings: ['Could not get directory listing'],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'unpkg'
          }
        };
      }

      const typeFiles = dirResult.data
        .filter(file => file.type === 'file' && file.path.endsWith('.d.ts'))
        .map(file => file.path);

      return {
        success: true,
        data: typeFiles,
        warnings: [],
        metadata: dirResult.metadata
      };

    } catch (error) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', `Failed to find TypeScript files: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg'
        }
      };
    }
  }

  private async getTypeDefinitionsFromTypesPackage(typesPackageName: string): Promise<AnalysisResult<string | null>> {
    try {
      // Try to get the latest version of the @types package
      const indexResult = await this.getFileContent(typesPackageName, 'latest', 'index.d.ts');
      return indexResult;
    } catch (error) {
      return {
        success: true,
        data: null,
        warnings: [`@types package not found: ${typesPackageName}`],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'unpkg'
        }
      };
    }
  }

  private getTypesPackageName(packageName: string): string {
    // Convert package name to @types format
    // @scope/package -> @types/scope__package
    // package -> @types/package
    if (packageName.startsWith('@')) {
      const [scope, name] = packageName.slice(1).split('/');
      return `@types/${scope}__${name}`;
    }
    return `@types/${packageName}`;
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
      recoverable: type === 'NETWORK_ERROR',
      suggestions: this.getErrorSuggestions(type)
    };
  }

  private getErrorSuggestions(type: AnalysisError['type']): string[] {
    switch (type) {
      case 'NETWORK_ERROR':
        return ['Check internet connection', 'Verify package exists', 'Try again later'];
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
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; entries: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = entries.length;
    
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      entries: totalRequests
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