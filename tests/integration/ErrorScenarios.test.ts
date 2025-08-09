/**
 * Integration tests for error scenarios and recovery mechanisms
 */

import { ApplicationOrchestrator } from '../../dist/core/ApplicationOrchestrator.js';
import { ErrorHandler } from '../../dist/core/ErrorHandler.js';
import { Logger, LogLevel } from '../../dist/core/Logger.js';
import { NPMRegistryFetcher } from '../../dist/fetchers/NPMRegistryFetcher.js';
import { GitHubFetcher } from '../../dist/fetchers/GitHubFetcher.js';
import { UnpkgFetcher } from '../../dist/fetchers/UnpkgFetcher.js';
import path from 'path';
import fs from 'fs/promises';

describe('Error Scenarios Integration Tests', () => {
  let orchestrator: ApplicationOrchestrator;
  let testOutputDir: string;
  let errorHandler: ErrorHandler;
  let logger: Logger;

  beforeAll(async () => {
    testOutputDir = path.join(process.cwd(), 'test-output', 'error-scenarios');
    await fs.mkdir(testOutputDir, { recursive: true });
    
    // Create logger with debug level for detailed testing
    logger = new Logger({ level: LogLevel.DEBUG });
    errorHandler = new ErrorHandler({
      maxAttempts: 2, // Shorter for testing
      baseDelay: 100,
      maxDelay: 1000
    }, logger);
    
    orchestrator = new ApplicationOrchestrator();
  });

  afterAll(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    logger.clear();
    errorHandler.clearErrorStatistics();
  });

  describe('Package Not Found Scenarios', () => {
    it('should handle non-existent package gracefully', async () => {
      const request = ApplicationOrchestrator.createGenerationRequest(
        'this-package-definitely-does-not-exist-12345',
        undefined,
        testOutputDir,
        { verbose: true, dryRun: true }
      );

      const result = await orchestrator.generateMCPServer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
      
      // Check error logging
      const errorLogs = logger.getEntriesByLevel(LogLevel.ERROR);
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].message).toContain('fetch-package-info');
      
      // Check error statistics
      const stats = errorHandler.getErrorStatistics();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it('should handle invalid package version gracefully', async () => {
      const request = ApplicationOrchestrator.createGenerationRequest(
        'lodash',
        '999.999.999',
        testOutputDir,
        { verbose: true, dryRun: true }
      );

      const result = await orchestrator.generateMCPServer(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Check that error contains version information
      const errorLogs = logger.getEntriesByLevel(LogLevel.ERROR);
      const versionError = errorLogs.find(log => 
        log.context?.version === '999.999.999'
      );
      expect(versionError).toBeDefined();
    });

    it('should provide helpful suggestions for package not found', async () => {
      const request = ApplicationOrchestrator.createGenerationRequest(
        'react-querry', // Common typo
        undefined,
        testOutputDir,
        { verbose: true, dryRun: true }
      );

      const result = await orchestrator.generateMCPServer(request);

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.some(s => s.includes('npmjs.com'))).toBe(true);
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle network timeouts with retry', async () => {
      // Create a custom fetcher that simulates network issues
      const mockFetcher = new NPMRegistryFetcher();
      const originalFetch = global.fetch;
      
      let attemptCount = 0;
      global.fetch = jest.fn().mockImplementation(async (url) => {
        attemptCount++;
        if (attemptCount <= 1) {
          throw new Error('Network timeout');
        }
        // Restore original fetch for subsequent calls
        return originalFetch(url);
      });

      try {
        const result = await mockFetcher.getPackageInfo('lodash');
        
        // Should eventually succeed after retry
        expect(result.success).toBe(true);
        expect(attemptCount).toBeGreaterThan(1);
        
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should log retry attempts properly', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(mockOperation, {
        operation: 'test-network-retry',
        packageName: 'test-package'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      
      // Check retry logging
      const warnLogs = logger.getEntriesByLevel(LogLevel.WARN);
      const retryLog = warnLogs.find(log => log.message.includes('Retry'));
      expect(retryLog).toBeDefined();
      expect(retryLog?.context?.attempt).toBe(1);
      expect(retryLog?.context?.maxAttempts).toBe(2);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle rate limiting with backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('HTTP 429: Too Many Requests'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await errorHandler.executeWithRetry(mockOperation, {
        operation: 'test-rate-limit',
        packageName: 'test-package'
      });
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      
      // Should have waited due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(100);
      
      // Check rate limit logging
      const warnLogs = logger.getEntriesByLevel(LogLevel.WARN);
      const rateLimitLog = warnLogs.find(log => log.message.includes('Rate limited'));
      expect(rateLimitLog).toBeDefined();
    });

    it('should extract retry-after header from error message', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded. Retry after 5 seconds'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await errorHandler.executeWithRetry(mockOperation, {
        operation: 'test-retry-after',
        packageName: 'test-package'
      });
      const endTime = Date.now();

      // Should have waited at least 5 seconds (5000ms)
      expect(endTime - startTime).toBeGreaterThan(4900);
    });
  });

  describe('Parsing Error Scenarios', () => {
    it('should handle JSON parsing errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('JSON.parse: unexpected token at position 0'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'parse-package-json',
          packageName: 'test-package'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.type).toBe('PARSING_ERROR');
        expect(error.recoverable).toBe(false);
        expect(error.suggestions).toContain('Check the data format');
      }
    });

    it('should not retry parsing errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Invalid JSON syntax'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'parse-readme',
          packageName: 'test-package'
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Should not retry parsing errors
        expect(mockOperation).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle GitHub authentication errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('HTTP 401: Unauthorized'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'fetch-github-readme',
          packageName: 'test-package'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.type).toBe('AUTHENTICATION_ERROR');
        expect(error.recoverable).toBe(false);
        expect(error.suggestions).toContain('Check your authentication credentials');
      }
    });

    it('should not retry authentication errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('HTTP 403: Forbidden'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'fetch-private-repo',
          packageName: 'test-package'
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Should not retry auth errors
        expect(mockOperation).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should attempt network recovery', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ENOTFOUND'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(mockOperation, {
        operation: 'fetch-with-recovery',
        packageName: 'test-package'
      });

      expect(result).toBe('success');
      
      // Check recovery logging
      const infoLogs = logger.getEntriesByLevel(LogLevel.INFO);
      const recoveryLog = infoLogs.find(log => log.message.includes('Network connectivity restored'));
      expect(recoveryLog).toBeDefined();
    });

    it('should handle failed recovery attempts', async () => {
      // Mock fetch to always fail connectivity test
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network unavailable'));

      try {
        const mockOperation = jest.fn()
          .mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(errorHandler.executeWithRetry(mockOperation, {
          operation: 'fetch-with-failed-recovery',
          packageName: 'test-package'
        })).rejects.toThrow();

        // Check failed recovery logging
        const warnLogs = logger.getEntriesByLevel(LogLevel.WARN);
        const failedRecoveryLog = warnLogs.find(log => 
          log.message.includes('Network connectivity still unavailable')
        );
        expect(failedRecoveryLog).toBeDefined();

      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Error Statistics and Debugging', () => {
    it('should track error statistics correctly', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Test error'));

      // Generate multiple errors
      for (let i = 0; i < 3; i++) {
        try {
          await errorHandler.executeWithRetry(mockOperation, {
            operation: 'test-stats',
            packageName: 'test-package'
          });
        } catch (error) {
          // Expected to fail
        }
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats['test-stats']).toBeDefined();
      expect(stats['test-stats'].count).toBe(3);
      expect(stats['test-stats'].lastError).toBeInstanceOf(Date);
    });

    it('should generate debug information', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Debug test error'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'debug-test',
          packageName: 'debug-package'
        });
      } catch (error) {
        // Expected to fail
      }

      const debugInfo = errorHandler.getDebugInfo();
      
      expect(debugInfo.errorStatistics).toBeDefined();
      expect(debugInfo.retryOptions).toBeDefined();
      expect(debugInfo.recentLogs).toBeDefined();
      expect(debugInfo.errorSummary).toBeDefined();
      expect(debugInfo.performanceSummary).toBeDefined();
      
      expect(debugInfo.recentLogs.length).toBeGreaterThan(0);
    });

    it('should export detailed error report', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Report test error'));

      try {
        await errorHandler.executeWithRetry(mockOperation, {
          operation: 'report-test',
          packageName: 'report-package'
        });
      } catch (error) {
        // Expected to fail
      }

      const report = errorHandler.exportErrorReport();
      const parsedReport = JSON.parse(report);
      
      expect(parsedReport.timestamp).toBeDefined();
      expect(parsedReport.version).toBeDefined();
      expect(parsedReport.debugInfo).toBeDefined();
      expect(parsedReport.recommendations).toBeDefined();
      expect(Array.isArray(parsedReport.recommendations)).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      // Generate multiple network errors to trigger recommendations
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network error'));

      for (let i = 0; i < 6; i++) {
        try {
          await errorHandler.executeWithRetry(mockOperation, {
            operation: 'network-test',
            packageName: 'test-package'
          });
        } catch (error) {
          // Expected to fail
        }
      }

      const report = errorHandler.exportErrorReport();
      const parsedReport = JSON.parse(report);
      
      expect(parsedReport.recommendations).toContain(
        expect.stringContaining('network errors detected')
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation performance', async () => {
      const mockOperation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'success';
      });

      await errorHandler.executeWithRetry(mockOperation, {
        operation: 'performance-test',
        packageName: 'test-package'
      });

      const debugInfo = errorHandler.getDebugInfo();
      const perfSummary = debugInfo.performanceSummary;
      
      expect(perfSummary['performance-test']).toBeDefined();
      expect(perfSummary['performance-test'].count).toBe(1);
      expect(perfSummary['performance-test'].avgDuration).toBeGreaterThan(100);
    });

    it('should log performance metrics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      await errorHandler.executeWithRetry(mockOperation, {
        operation: 'metrics-test',
        packageName: 'test-package'
      });

      const infoLogs = logger.getEntriesByLevel(LogLevel.INFO);
      const endOperationLog = infoLogs.find(log => 
        log.message.includes('Operation metrics-test completed')
      );
      
      expect(endOperationLog).toBeDefined();
      expect(endOperationLog?.context?.duration).toBeGreaterThan(0);
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle GitHub API rate limiting', async () => {
      // This test would ideally use a real GitHub API call that hits rate limits
      // For now, we'll simulate it
      const githubFetcher = new GitHubFetcher();
      
      // Mock the rate limit check
      const originalCheckRateLimit = (githubFetcher as any).checkRateLimit;
      (githubFetcher as any).checkRateLimit = jest.fn()
        .mockRejectedValueOnce(new Error('GitHub API rate limit exceeded'))
        .mockResolvedValue(undefined);

      try {
        const result = await githubFetcher.getReadme('https://github.com/lodash/lodash');
        
        // Should handle rate limiting gracefully
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('RATE_LIMITED');
        
      } finally {
        (githubFetcher as any).checkRateLimit = originalCheckRateLimit;
      }
    });

    it('should handle unpkg.com service unavailability', async () => {
      const unpkgFetcher = new UnpkgFetcher();
      
      // Mock fetch to simulate service unavailability
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Service Unavailable'));

      try {
        const result = await unpkgFetcher.getTypeScriptDefinitions('lodash');
        
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('NETWORK_ERROR');
        
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});