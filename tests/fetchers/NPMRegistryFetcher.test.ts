/**
 * Tests for NPMRegistryFetcher
 */

import { NPMRegistryFetcher } from '../../src/fetchers/NPMRegistryFetcher';
import { createMockFetch } from '../setup';

// Mock fetch globally
global.fetch = jest.fn();

describe('NPMRegistryFetcher', () => {
  let fetcher: NPMRegistryFetcher;

  beforeEach(() => {
    fetcher = new NPMRegistryFetcher({ ttl: 1000, maxSize: 10 });
    jest.clearAllMocks();
  });

  describe('getPackageInfo', () => {
    it('should fetch package info successfully', async () => {
      const mockResponse = {
        name: '@test/package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: '@test/package',
            version: '1.0.0',
            description: 'Test package',
            repository: {
              type: 'git',
              url: 'https://github.com/test/package.git'
            },
            keywords: ['test'],
            dependencies: { react: '^18.0.0' }
          }
        },
        time: {
          '1.0.0': '2024-01-01T00:00:00.000Z'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fetcher.getPackageInfo('@test/package');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('@test/package');
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.description).toBe('Test package');
      expect(result.metadata.source).toBe('npm-registry');
      expect(result.metadata.cacheHit).toBe(false);
    });

    it('should handle package not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await fetcher.getPackageInfo('nonexistent-package');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('INVALID_PACKAGE');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const result = await fetcher.getPackageInfo('@test/package');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RATE_LIMITED');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should use cache on second request', async () => {
      const mockResponse = {
        name: '@test/package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: '@test/package',
            version: '1.0.0',
            description: 'Test package'
          }
        },
        time: { '1.0.0': '2024-01-01T00:00:00.000Z' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      // First request
      const result1 = await fetcher.getPackageInfo('@test/package');
      expect(result1.metadata.cacheHit).toBe(false);

      // Second request should use cache
      const result2 = await fetcher.getPackageInfo('@test/package');
      expect(result2.metadata.cacheHit).toBe(true);
      expect(result2.success).toBe(true);

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle specific version requests', async () => {
      const mockResponse = {
        name: '@test/package',
        'dist-tags': { latest: '2.0.0' },
        versions: {
          '1.0.0': {
            name: '@test/package',
            version: '1.0.0',
            description: 'Test package v1'
          },
          '2.0.0': {
            name: '@test/package',
            version: '2.0.0',
            description: 'Test package v2'
          }
        },
        time: {
          '1.0.0': '2024-01-01T00:00:00.000Z',
          '2.0.0': '2024-02-01T00:00:00.000Z'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fetcher.getPackageInfo('@test/package', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.description).toBe('Test package v1');
    });
  });

  describe('getTypeDefinitions', () => {
    it('should fetch TypeScript definitions from package', async () => {
      const mockTypeDefinitions = `
        export declare function testFunction(input: string): string;
        export interface TestInterface {
          name: string;
          value: number;
        }
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockTypeDefinitions)
      });

      const result = await fetcher.getTypeDefinitions('@test/package', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockTypeDefinitions);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fallback to @types package', async () => {
      const mockTypeDefinitions = `export declare function testFunction(): void;`;

      // First call fails (no types in package)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        // Second call succeeds (@types package)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockTypeDefinitions)
        });

      const result = await fetcher.getTypeDefinitions('test-package', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockTypeDefinitions);
      expect(result.warnings).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return null when no definitions found', async () => {
      // Both calls fail
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await fetcher.getTypeDefinitions('test-package', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = fetcher.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('entries');
    });

    it('should clear cache', () => {
      fetcher.clearCache();
      const stats = fetcher.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});