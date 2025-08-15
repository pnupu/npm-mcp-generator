/**
 * Comprehensive error handling system with retry logic and recovery mechanisms
 */

import { AnalysisError, AnalysisErrorType, RetryOptions } from '../types/AnalysisResult';
import { Logger, LogLevel } from './Logger.js';

export interface ErrorContext {
  operation: string;
  packageName?: string;
  version?: string;
  attempt: number;
  maxAttempts: number;
  startTime: Date;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryResult {
  recovered: boolean;
  newError?: AnalysisError;
  suggestion?: string;
  retryAfter?: number;
}

export class ErrorHandler {
  private retryOptions: RetryOptions;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();
  private logger: Logger;

  constructor(retryOptions: Partial<RetryOptions> = {}, logger?: Logger) {
    this.retryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableErrors: [
        'NETWORK_ERROR',
        'RATE_LIMITED',
        'TIMEOUT_ERROR',
        'UNKNOWN_ERROR'
      ],
      ...retryOptions
    };
    
    this.logger = logger || new Logger({ level: LogLevel.INFO });
  }

  /**
   * Execute an operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'attempt' | 'maxAttempts' | 'startTime'>
  ): Promise<T> {
    const operationId = this.logger.startOperation(context.operation, context.packageName, context.metadata);
    const startTime = Date.now();
    
    const fullContext: ErrorContext = {
      ...context,
      attempt: 1,
      maxAttempts: this.retryOptions.maxAttempts,
      startTime: new Date()
    };

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryOptions.maxAttempts; attempt++) {
      fullContext.attempt = attempt;

      try {
        const result = await operation();
        
        // Reset error count on success
        this.resetErrorCount(context.operation);
        
        const duration = Date.now() - startTime;
        this.logger.endOperation(operationId, context.operation, true, duration, {
          attempts: attempt,
          packageName: context.packageName
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const analysisError = this.normalizeError(lastError, fullContext);
        
        this.logger.error(`Operation ${context.operation} failed on attempt ${attempt}`, lastError, {
          operationId,
          attempt,
          maxAttempts: this.retryOptions.maxAttempts,
          packageName: context.packageName,
          errorType: analysisError.type,
          recoverable: analysisError.recoverable
        });
        
        // Check if error is retryable
        if (!this.isRetryableError(analysisError) || attempt >= this.retryOptions.maxAttempts) {
          // Try recovery before giving up
          const recovery = await this.attemptRecovery(analysisError, fullContext);
          if (recovery.recovered) {
            this.logger.logRecovery(context.operation, 'automatic', true, {
              operationId,
              suggestion: recovery.suggestion
            });
            continue; // Retry after recovery
          }
          
          this.recordError(context.operation, analysisError);
          
          const duration = Date.now() - startTime;
          this.logger.endOperation(operationId, context.operation, false, duration, {
            attempts: attempt,
            packageName: context.packageName,
            finalError: analysisError.type
          });
          
          throw analysisError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        
        this.logger.logRetry(context.operation, attempt, this.retryOptions.maxAttempts, lastError, delay);

        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    const finalError = this.normalizeError(lastError!, fullContext);
    const duration = Date.now() - startTime;
    this.logger.endOperation(operationId, context.operation, false, duration, {
      attempts: this.retryOptions.maxAttempts,
      packageName: context.packageName,
      finalError: finalError.type
    });
    
    throw finalError;
  }

  /**
   * Handle errors with context-aware recovery suggestions
   */
  handleError(error: unknown, context: ErrorContext): AnalysisError {
    const analysisError = this.normalizeError(error, context);
    
    // Add context-specific suggestions
    analysisError.suggestions = [
      ...analysisError.suggestions || [],
      ...this.getContextualSuggestions(analysisError, context)
    ];

    // Record error for pattern analysis
    this.recordError(context.operation, analysisError);
    
    // Log the error with full context
    this.logger.error(`Error in ${context.operation}`, error instanceof Error ? error : new Error(String(error)), {
      operation: context.operation,
      packageName: context.packageName,
      version: context.version,
      attempt: context.attempt,
      errorType: analysisError.type,
      recoverable: analysisError.recoverable,
      suggestions: analysisError.suggestions,
      metadata: context.metadata
    });

    return analysisError;
  }

  /**
   * Normalize any error into an AnalysisError
   */
  private normalizeError(error: unknown, context: ErrorContext): AnalysisError {
    if (this.isAnalysisError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return this.classifyError(error, context);
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: String(error),
      recoverable: false,
      suggestions: ['Check the error details and try again']
    };
  }

  /**
   * Classify a generic Error into an AnalysisError
   */
  private classifyError(error: Error, context: ErrorContext): AnalysisError {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('enotfound') || message.includes('econnrefused')) {
      return {
        type: 'NETWORK_ERROR',
        message: `Network error during ${context.operation}: ${error.message}`,
        recoverable: true,
        suggestions: [
          'Check your internet connection',
          'Verify the service is accessible',
          'Try again in a few moments'
        ]
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || 
        message.includes('too many requests')) {
      return {
        type: 'RATE_LIMITED',
        message: `Rate limited during ${context.operation}: ${error.message}`,
        recoverable: true,
        suggestions: [
          'Wait before retrying',
          'Use authentication tokens if available',
          'Reduce request frequency'
        ]
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: 'TIMEOUT_ERROR',
        message: `Timeout during ${context.operation}: ${error.message}`,
        recoverable: true,
        suggestions: [
          'Try again with a longer timeout',
          'Check network stability',
          'Verify the service is responding'
        ]
      };
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || 
        message.includes('forbidden') || message.includes('403')) {
      return {
        type: 'AUTHENTICATION_ERROR',
        message: `Authentication error during ${context.operation}: ${error.message}`,
        recoverable: false,
        suggestions: [
          'Check your authentication credentials',
          'Verify API token permissions',
          'Ensure the resource is accessible'
        ]
      };
    }

    // Package not found
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: 'INVALID_PACKAGE',
        message: `Resource not found during ${context.operation}: ${error.message}`,
        recoverable: false,
        suggestions: [
          'Verify the package name is correct',
          'Check if the package exists',
          'Try a different version'
        ]
      };
    }

    // Parsing errors
    if (message.includes('parse') || message.includes('syntax') || 
        message.includes('json') || message.includes('invalid')) {
      return {
        type: 'PARSING_ERROR',
        message: `Parsing error during ${context.operation}: ${error.message}`,
        recoverable: false,
        suggestions: [
          'Check the data format',
          'Verify the source is valid',
          'Report this as a potential bug'
        ]
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || 
        message.includes('required')) {
      return {
        type: 'VALIDATION_ERROR',
        message: `Validation error during ${context.operation}: ${error.message}`,
        recoverable: false,
        suggestions: [
          'Check the input parameters',
          'Verify required fields are provided',
          'Review the operation requirements'
        ]
      };
    }

    // Generation errors
    if (message.includes('generation') || message.includes('template') || 
        message.includes('compile')) {
      return {
        type: 'GENERATION_ERROR',
        message: `Generation error during ${context.operation}: ${error.message}`,
        recoverable: false,
        suggestions: [
          'Check the template configuration',
          'Verify the analysis data is complete',
          'Report this as a potential bug'
        ]
      };
    }

    // Default to unknown error
    return {
      type: 'UNKNOWN_ERROR',
      message: `Unexpected error during ${context.operation}: ${error.message}`,
      recoverable: true,
      suggestions: [
        'Try the operation again',
        'Check the system logs for more details',
        'Report this error if it persists'
      ]
    };
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: AnalysisError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    switch (error.type) {
      case 'RATE_LIMITED':
        return this.handleRateLimitRecovery(error, context);
      
      case 'NETWORK_ERROR':
        return this.handleNetworkRecovery(error, context);
      
      case 'TIMEOUT_ERROR':
        return this.handleTimeoutRecovery(error, context);
      
      case 'AUTHENTICATION_ERROR':
        return this.handleAuthRecovery(error, context);
      
      default:
        return { recovered: false };
    }
  }

  private async handleRateLimitRecovery(error: AnalysisError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // Extract retry-after header if available
    const retryAfter = this.extractRetryAfter(error.message);
    const delay = retryAfter || this.calculateBackoffDelay(context.operation);

    this.logger.warn(`Rate limited for ${context.operation}. Waiting ${delay}ms before retry...`, {
      operation: context.operation,
      packageName: context.packageName,
      delay,
      retryAfter,
      errorMessage: error.message
    });
    
    await this.sleep(delay);

    return {
      recovered: true,
      suggestion: `Waited ${delay}ms due to rate limiting`
    };
  }

  private async handleNetworkRecovery(error: AnalysisError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // For network errors, we can try a simple connectivity test
    this.logger.debug(`Attempting network recovery for ${context.operation}`, {
      operation: context.operation,
      packageName: context.packageName,
      errorMessage: error.message
    });
    
    try {
      // Simple connectivity test
      await fetch('https://www.google.com', { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(5000) 
      });
      
      this.logger.info(`Network connectivity restored for ${context.operation}`, {
        operation: context.operation,
        packageName: context.packageName
      });
      
      return {
        recovered: true,
        suggestion: 'Network connectivity restored'
      };
    } catch (connectivityError) {
      this.logger.warn(`Network connectivity still unavailable for ${context.operation}`, {
        operation: context.operation,
        packageName: context.packageName,
        connectivityError: connectivityError instanceof Error ? connectivityError.message : String(connectivityError)
      });
      
      return {
        recovered: false,
        suggestion: 'Network connectivity still unavailable'
      };
    }
  }

  private async handleTimeoutRecovery(error: AnalysisError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // For timeout errors, we can increase the timeout for the next attempt
    if (context.metadata) {
      context.metadata.timeout = (context.metadata.timeout || 10000) * 1.5;
    }

    return {
      recovered: true,
      suggestion: 'Increased timeout for next attempt'
    };
  }

  private async handleAuthRecovery(error: AnalysisError, context: ErrorContext): Promise<ErrorRecoveryResult> {
    // For auth errors, we generally can't recover automatically
    // But we can provide better guidance
    return {
      recovered: false,
      suggestion: 'Authentication errors require manual intervention'
    };
  }

  /**
   * Get contextual suggestions based on the error and operation context
   */
  private getContextualSuggestions(error: AnalysisError, context: ErrorContext): string[] {
    const suggestions: string[] = [];

    // Package-specific suggestions
    if (context.packageName) {
      if (error.type === 'INVALID_PACKAGE') {
        suggestions.push(`Verify that '${context.packageName}' exists on npmjs.com`);
        if (context.version) {
          suggestions.push(`Check if version '${context.version}' is available`);
        }
      }
    }

    // Operation-specific suggestions
    switch (context.operation) {
      case 'fetch-package-info':
        suggestions.push('Try using a different package registry');
        break;
      case 'fetch-readme':
        suggestions.push('Package may not have a README file');
        break;
      case 'fetch-types':
        suggestions.push('Package may not have TypeScript definitions');
        break;
      case 'generate-server':
        suggestions.push('Check if the analysis data is complete');
        break;
    }

    // Attempt-based suggestions
    if (context.attempt > 1) {
      suggestions.push(`This is attempt ${context.attempt} of ${context.maxAttempts}`);
    }

    return suggestions;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: AnalysisError): boolean {
    return this.retryOptions.retryableErrors.includes(error.type) && error.recoverable;
  }

  /**
   * Calculate delay for retry attempts
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryOptions.baseDelay * Math.pow(this.retryOptions.backoffFactor, attempt - 1);
    return Math.min(delay, this.retryOptions.maxDelay);
  }

  /**
   * Calculate backoff delay for specific operations
   */
  private calculateBackoffDelay(operation: string): number {
    const errorCount = this.errorCounts.get(operation) || 0;
    const baseDelay = 5000; // 5 seconds base
    return Math.min(baseDelay * Math.pow(2, errorCount), 300000); // Max 5 minutes
  }

  /**
   * Extract retry-after value from error message
   */
  private extractRetryAfter(message: string): number | null {
    const match = message.match(/retry[- ]after[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null; // Convert to milliseconds
  }

  /**
   * Record error for pattern analysis
   */
  private recordError(operation: string, error: AnalysisError): void {
    const count = this.errorCounts.get(operation) || 0;
    this.errorCounts.set(operation, count + 1);
    this.lastErrors.set(operation, new Date());
  }

  /**
   * Reset error count for successful operations
   */
  private resetErrorCount(operation: string): void {
    this.errorCounts.delete(operation);
    this.lastErrors.delete(operation);
  }

  /**
   * Check if error is an AnalysisError
   */
  private isAnalysisError(error: unknown): error is AnalysisError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'recoverable' in error
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, { count: number; lastError: Date }> {
    const stats: Record<string, { count: number; lastError: Date }> = {};
    
    for (const [operation, count] of this.errorCounts.entries()) {
      const lastError = this.lastErrors.get(operation);
      if (lastError) {
        stats[operation] = { count, lastError };
      }
    }
    
    return stats;
  }

  /**
   * Clear error statistics
   */
  clearErrorStatistics(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Get detailed debugging information
   */
  getDebugInfo(): {
    errorStatistics: Record<string, { count: number; lastError: Date }>;
    retryOptions: RetryOptions;
    recentLogs: any[];
    errorSummary: Record<string, number>;
    performanceSummary: Record<string, { count: number; avgDuration: number; totalDuration: number }>;
  } {
    return {
      errorStatistics: this.getErrorStatistics(),
      retryOptions: this.retryOptions,
      recentLogs: this.logger.getRecentEntries(20),
      errorSummary: this.logger.getErrorSummary(),
      performanceSummary: this.logger.getPerformanceSummary()
    };
  }

  /**
   * Export detailed error report
   */
  exportErrorReport(): string {
    const debugInfo = this.getDebugInfo();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      debugInfo,
      recommendations: this.generateRecommendations(debugInfo)
    }, null, 2);
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(debugInfo: any): string[] {
    const recommendations: string[] = [];
    
    // Check for high error rates
    const totalErrors = Object.values(debugInfo.errorStatistics).reduce((sum: number, stat: any) => sum + stat.count, 0);
    if (totalErrors > 10) {
      recommendations.push('High error rate detected. Consider checking network connectivity or API limits.');
    }
    
    // Check for specific error patterns
    const errorSummary = debugInfo.errorSummary;
    if (errorSummary['NetworkError'] > 5) {
      recommendations.push('Multiple network errors detected. Check internet connection and firewall settings.');
    }
    
    if (errorSummary['RateLimitError'] > 3) {
      recommendations.push('Rate limiting detected. Consider implementing longer delays or using authentication tokens.');
    }
    
    // Check performance issues
    const perfSummary = debugInfo.performanceSummary;
    for (const [operation, stats] of Object.entries(perfSummary)) {
      if ((stats as any).avgDuration > 30000) {
        recommendations.push(`Operation '${operation}' is taking longer than expected (${(stats as any).avgDuration}ms average). Consider optimizing or increasing timeouts.`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No specific issues detected. Error handling is working as expected.');
    }
    
    return recommendations;
  }

  /**
   * Get logger instance for external use
   */
  getLogger(): Logger {
    return this.logger;
  }
}