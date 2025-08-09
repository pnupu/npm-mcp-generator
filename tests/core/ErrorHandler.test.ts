/**
 * Comprehensive tests for error handling system
 */

import { ErrorHandler, ErrorContext } from '../../dist/core/ErrorHandler.js';
import { AnalysisError, AnalysisErrorType } from '../../dist/types/AnalysisResult.js';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler({
      maxAttempts: 3,
      baseDelay: 100, // Shorter delays for testing
      maxDelay: 1000,
      backoffFactor: 2
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      const result = await errorHandler.executeWithRetry(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValue('success');

      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'fetch-package-info',
        packageName: 'test-package'
      };

      const result = await errorHandler.executeWithRetry(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Package not found'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'fetch-package-info',
        packageName: 'invalid-package'
      };

      await expect(errorHandler.executeWithRetry(operation, context)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'fetch-readme',
        packageName: 'test-package'
      };

      await expect(errorHandler.executeWithRetry(operation, context)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // maxAttempts
    });

    it('should apply exponential backoff delays', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValue('success');

      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'fetch-types',
        packageName: 'test-package'
      };

      const startTime = Date.now();
      const result = await errorHandler.executeWithRetry(operation, context);
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });
  });

  describe('error classification', () => {
    it('should classify network errors correctly', () => {
      const context: ErrorContext = {
        operation: 'fetch-package-info',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const networkError = new Error('fetch failed: ENOTFOUND');
      const analysisError = errorHandler.handleError(networkError, context);

      expect(analysisError.type).toBe('NETWORK_ERROR');
      expect(analysisError.recoverable).toBe(true);
      expect(analysisError.suggestions).toContain('Check your internet connection');
    });

    it('should classify rate limit errors correctly', () => {
      const context: ErrorContext = {
        operation: 'fetch-readme',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const rateLimitError = new Error('HTTP 429: Too Many Requests');
      const analysisError = errorHandler.handleError(rateLimitError, context);

      expect(analysisError.type).toBe('RATE_LIMITED');
      expect(analysisError.recoverable).toBe(true);
      expect(analysisError.suggestions).toContain('Wait before retrying');
    });

    it('should classify authentication errors correctly', () => {
      const context: ErrorContext = {
        operation: 'fetch-readme',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const authError = new Error('HTTP 401: Unauthorized');
      const analysisError = errorHandler.handleError(authError, context);

      expect(analysisError.type).toBe('AUTHENTICATION_ERROR');
      expect(analysisError.recoverable).toBe(false);
      expect(analysisError.suggestions).toContain('Check your authentication credentials');
    });

    it('should classify package not found errors correctly', () => {
      const context: ErrorContext = {
        operation: 'fetch-package-info',
        packageName: 'invalid-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const notFoundError = new Error('HTTP 404: Not Found');
      const analysisError = errorHandler.handleError(notFoundError, context);

      expect(analysisError.type).toBe('INVALID_PACKAGE');
      expect(analysisError.recoverable).toBe(false);
      expect(analysisError.suggestions).toContain('Verify the package name is correct');
    });

    it('should classify parsing errors correctly', () => {
      const context: ErrorContext = {
        operation: 'parse-readme',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const parseError = new Error('JSON.parse: unexpected token');
      const analysisError = errorHandler.handleError(parseError, context);

      expect(analysisError.type).toBe('PARSING_ERROR');
      expect(analysisError.recoverable).toBe(false);
      expect(analysisError.suggestions).toContain('Check the data format');
    });

    it('should classify timeout errors correctly', () => {
      const context: ErrorContext = {
        operation: 'fetch-types',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const timeoutError = new Error('Request timeout after 30000ms');
      const analysisError = errorHandler.handleError(timeoutError, context);

      expect(analysisError.type).toBe('TIMEOUT_ERROR');
      expect(analysisError.recoverable).toBe(true);
      expect(analysisError.suggestions).toContain('Try again with a longer timeout');
    });
  });

  describe('error recovery', () => {
    it('should handle rate limit recovery', async () => {
      const rateLimitError: AnalysisError = {
        type: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Retry after 2 seconds',
        recoverable: true
      };

      const context: ErrorContext = {
        operation: 'fetch-readme',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      // Mock the private method by testing through executeWithRetry
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('HTTP 429: Rate limit exceeded'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(operation, context);
      expect(result).toBe('success');
    });

    it('should handle network recovery', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ENOTFOUND'))
        .mockResolvedValue('success');

      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'fetch-package-info',
        packageName: 'test-package'
      };

      const result = await errorHandler.executeWithRetry(operation, context);
      expect(result).toBe('success');
    });
  });

  describe('contextual suggestions', () => {
    it('should provide package-specific suggestions', () => {
      const context: ErrorContext = {
        operation: 'fetch-package-info',
        packageName: 'invalid-package-name',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const error = new Error('Package not found');
      const analysisError = errorHandler.handleError(error, context);

      expect(analysisError.suggestions).toContain("Verify that 'invalid-package-name' exists on npmjs.com");
    });

    it('should provide version-specific suggestions', () => {
      const context: ErrorContext = {
        operation: 'fetch-package-info',
        packageName: 'test-package',
        version: '999.999.999',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const error = new Error('Version not found');
      const analysisError = errorHandler.handleError(error, context);

      expect(analysisError.suggestions).toContain("Check if version '999.999.999' is available");
    });

    it('should provide operation-specific suggestions', () => {
      const context: ErrorContext = {
        operation: 'fetch-readme',
        packageName: 'test-package',
        attempt: 1,
        maxAttempts: 3,
        startTime: new Date()
      };

      const error = new Error('File not found');
      const analysisError = errorHandler.handleError(error, context);

      expect(analysisError.suggestions).toContain('Package may not have a README file');
    });

    it('should provide attempt-based suggestions', () => {
      const context: ErrorContext = {
        operation: 'fetch-types',
        packageName: 'test-package',
        attempt: 2,
        maxAttempts: 3,
        startTime: new Date()
      };

      const error = new Error('Network error');
      const analysisError = errorHandler.handleError(error, context);

      expect(analysisError.suggestions).toContain('This is attempt 2 of 3');
    });
  });

  describe('error statistics', () => {
    it('should track error counts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      try {
        await errorHandler.executeWithRetry(operation, context);
      } catch (error) {
        // Expected to fail
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats['test-operation']).toBeDefined();
      expect(stats['test-operation'].count).toBe(1);
      expect(stats['test-operation'].lastError).toBeInstanceOf(Date);
    });

    it('should reset error counts on success', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      await errorHandler.executeWithRetry(operation, context);

      const stats = errorHandler.getErrorStatistics();
      expect(stats['test-operation']).toBeUndefined();
    });

    it('should clear error statistics', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      try {
        await errorHandler.executeWithRetry(operation, context);
      } catch (error) {
        // Expected to fail
      }

      errorHandler.clearErrorStatistics();
      const stats = errorHandler.getErrorStatistics();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe('custom retry options', () => {
    it('should respect custom retry options', async () => {
      const customErrorHandler = new ErrorHandler({
        maxAttempts: 5,
        baseDelay: 50,
        maxDelay: 500,
        backoffFactor: 1.5
      });

      const operation = jest.fn().mockRejectedValue(new Error('Network error'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      await expect(customErrorHandler.executeWithRetry(operation, context)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(5); // Custom maxAttempts
    });

    it('should respect custom retryable errors', async () => {
      const customErrorHandler = new ErrorHandler({
        retryableErrors: ['NETWORK_ERROR'] // Only network errors are retryable
      });

      const operation = jest.fn().mockRejectedValue(new Error('Rate limited'));
      const context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'> = {
        operation: 'test-operation',
        packageName: 'test-package'
      };

      await expect(customErrorHandler.executeWithRetry(operation, context)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1); // Should not retry rate limit errors
    });
  });
});