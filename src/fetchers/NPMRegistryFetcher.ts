/**
 * NPM Registry API fetcher with caching support
 */

import { PackageInfo } from '../types/PackageInfo.js';
import { AnalysisResult, AnalysisError, CacheEntry, CacheOptions } from '../types/AnalysisResult.js';

export class NPMRegistryFetcher {
  private readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org';
  private readonly UNPKG_URL = 'https://unpkg.com';
  private cache = new Map<string, CacheEntry<any>>();
  private cacheOptions: CacheOptions;

  constructor(cacheOptions: Partial<CacheOptions> = {}) {
    this.cacheOptions = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      keyPrefix: 'npm-registry',
      ...cacheOptions
    };
  }

  /**
   * Get package information from NPM registry
   */
  async getPackageInfo(packageName: string, version?: string): Promise<AnalysisResult<PackageInfo>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:package:${packageName}:${version || 'latest'}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<PackageInfo>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'npm-registry-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const url = `${this.NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError('INVALID_PACKAGE', `Package '${packageName}' not found in NPM registry`);
        }
        if (response.status === 429) {
          throw this.createError('RATE_LIMITED', 'NPM registry rate limit exceeded');
        }
        throw this.createError('NETWORK_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const versionToUse = version || data['dist-tags']?.latest;
      
      if (!versionToUse) {
        throw this.createError('INVALID_PACKAGE', `No version information found for '${packageName}'`);
      }

      const versionData = data.versions?.[versionToUse];
      if (!versionData) {
        throw this.createError('INVALID_PACKAGE', `Version '${versionToUse}' not found for package '${packageName}'`);
      }

      const packageInfo: PackageInfo = {
        name: versionData.name,
        version: versionToUse,
        description: versionData.description || '',
        repository: versionData.repository,
        homepage: versionData.homepage,
        keywords: versionData.keywords || [],
        dependencies: versionData.dependencies || {},
        peerDependencies: versionData.peerDependencies || {},
        devDependencies: versionData.devDependencies || {},
        maintainers: versionData.maintainers?.map((m: any) => m.name || m.email) || [],
        publishDate: data.time?.[versionToUse] || new Date().toISOString(),
        license: versionData.license
      };

      // Cache the result
      this.setCache(cacheKey, packageInfo);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: packageInfo,
        warnings: [],
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'npm-registry',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Unexpected error: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'npm-registry'
        }
      };
    }
  }

  /**
   * Get TypeScript definitions for a package
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
            source: 'npm-registry-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      let typeDefinitions: string | null = null;
      const warnings: string[] = [];

      // Try to get .d.ts files from the package itself
      const packageTypesUrl = `${this.UNPKG_URL}/${encodeURIComponent(packageName)}@${version}/index.d.ts`;
      
      try {
        const response = await fetch(packageTypesUrl);
        if (response.ok) {
          typeDefinitions = await response.text();
        } else {
          warnings.push(`Could not fetch TypeScript definitions from package: HTTP ${response.status}`);
        }
      } catch (error) {
        warnings.push(`Could not fetch TypeScript definitions from package: ${error}`);
      }

      // If no types in package, try @types package
      if (!typeDefinitions) {
        const typesPackageName = `@types/${packageName.replace('@', '').replace('/', '__')}`;
        const typesUrl = `${this.UNPKG_URL}/${encodeURIComponent(typesPackageName)}/index.d.ts`;
        
        try {
          const response = await fetch(typesUrl);
          if (response.ok) {
            typeDefinitions = await response.text();
          } else {
            warnings.push(`Could not fetch @types package: HTTP ${response.status}`);
          }
        } catch (error) {
          warnings.push(`Could not fetch @types package: ${error}`);
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
          source: 'npm-registry',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', `Failed to fetch TypeScript definitions: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'npm-registry'
        }
      };
    }
  }

  /**
   * Get package files list from unpkg
   */
  async getPackageFiles(packageName: string, version: string, path: string = ''): Promise<AnalysisResult<string[]>> {
    const cacheKey = `${this.cacheOptions.keyPrefix}:files:${packageName}:${version}:${path}`;
    
    try {
      const cached = this.getFromCache<string[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          warnings: [],
          metadata: {
            processingTime: 0,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'npm-registry-cache',
            cacheHit: true
          }
        };
      }

      const startTime = Date.now();
      const url = `${this.UNPKG_URL}/${encodeURIComponent(packageName)}@${version}/${path}?meta`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw this.createError('NETWORK_ERROR', `Failed to fetch package files: HTTP ${response.status}`);
      }

      const data = await response.json();
      const files = data.files?.map((file: any) => file.path) || [];

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
          source: 'npm-registry',
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.isAnalysisError(error) 
          ? error 
          : this.createError('UNKNOWN_ERROR', `Unexpected error: ${error}`),
        warnings: [],
        metadata: {
          processingTime: Date.now(),
          timestamp: new Date(),
          version: '1.0.0',
          source: 'npm-registry'
        }
      };
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
      case 'INVALID_PACKAGE':
        return ['Check package name spelling', 'Verify package exists on npmjs.com'];
      case 'RATE_LIMITED':
        return ['Wait a few minutes before retrying', 'Consider using authentication'];
      case 'NETWORK_ERROR':
        return ['Check internet connection', 'Try again later'];
      default:
        return [];
    }
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