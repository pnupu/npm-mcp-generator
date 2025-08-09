/**
 * Enhanced logging system for error handling and debugging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  operation?: string;
  packageName?: string;
  duration?: number;
}

export interface LoggerOptions {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  maxEntries: number;
  includeStackTrace: boolean;
}

export class Logger {
  private entries: LogEntry[] = [];
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      maxEntries: 1000,
      includeStackTrace: true,
      ...options
    };
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log operation start
   */
  startOperation(operation: string, packageName?: string, context?: Record<string, any>): string {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.info(`🚀 Starting operation: ${operation}`, {
      operationId,
      packageName,
      ...context
    });

    return operationId;
  }

  /**
   * Log operation completion
   */
  endOperation(operationId: string, operation: string, success: boolean, duration: number, context?: Record<string, any>): void {
    const emoji = success ? '✅' : '❌';
    const status = success ? 'completed' : 'failed';
    
    this.info(`${emoji} Operation ${operation} ${status} in ${duration}ms`, {
      operationId,
      success,
      duration,
      ...context
    });
  }

  /**
   * Log retry attempt
   */
  logRetry(operation: string, attempt: number, maxAttempts: number, error: Error, delay: number): void {
    this.warn(`🔄 Retry ${attempt}/${maxAttempts} for ${operation} after ${delay}ms`, {
      operation,
      attempt,
      maxAttempts,
      delay,
      error: error.message,
      errorType: error.constructor.name
    });
  }

  /**
   * Log error recovery attempt
   */
  logRecovery(operation: string, recoveryType: string, success: boolean, context?: Record<string, any>): void {
    const emoji = success ? '🔧' : '⚠️';
    const status = success ? 'successful' : 'failed';
    
    this.info(`${emoji} Recovery attempt (${recoveryType}) for ${operation} was ${status}`, {
      operation,
      recoveryType,
      success,
      ...context
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, metrics: Record<string, number>, context?: Record<string, any>): void {
    this.info(`📊 Performance metrics for ${operation}`, {
      operation,
      metrics,
      ...context
    });
  }

  /**
   * Log cache hit/miss
   */
  logCache(operation: string, hit: boolean, key: string, context?: Record<string, any>): void {
    const emoji = hit ? '🎯' : '💾';
    const status = hit ? 'HIT' : 'MISS';
    
    this.debug(`${emoji} Cache ${status} for ${operation}`, {
      operation,
      cacheHit: hit,
      cacheKey: key,
      ...context
    });
  }

  /**
   * Log degradation strategy application
   */
  logDegradation(strategy: string, success: boolean, improvement: number, context?: Record<string, any>): void {
    const emoji = success ? '🛠️' : '⚠️';
    const status = success ? 'applied' : 'failed';
    
    this.info(`${emoji} Degradation strategy '${strategy}' ${status}`, {
      strategy,
      success,
      improvement,
      ...context
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.options.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error
    };

    // Add to entries
    this.entries.push(entry);

    // Trim entries if needed
    if (this.entries.length > this.options.maxEntries) {
      this.entries = this.entries.slice(-this.options.maxEntries);
    }

    // Console output
    if (this.options.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName}:`;

    let output = `${prefix} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      
      if (this.options.includeStackTrace && entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * Get recent log entries
   */
  getRecentEntries(count: number = 50): LogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(entry => entry.level === level);
  }

  /**
   * Get entries by operation
   */
  getEntriesByOperation(operation: string): LogEntry[] {
    return this.entries.filter(entry => 
      entry.context?.operation === operation || 
      entry.message.includes(operation)
    );
  }

  /**
   * Get error summary
   */
  getErrorSummary(): Record<string, number> {
    const errorEntries = this.getEntriesByLevel(LogLevel.ERROR);
    const summary: Record<string, number> = {};

    for (const entry of errorEntries) {
      const errorType = entry.error?.constructor.name || 'Unknown';
      summary[errorType] = (summary[errorType] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, { count: number; avgDuration: number; totalDuration: number }> {
    const performanceEntries = this.entries.filter(entry => 
      entry.context?.duration !== undefined
    );

    const summary: Record<string, { count: number; avgDuration: number; totalDuration: number }> = {};

    for (const entry of performanceEntries) {
      const operation = entry.context?.operation || 'unknown';
      const duration = entry.context?.duration || 0;

      if (!summary[operation]) {
        summary[operation] = { count: 0, avgDuration: 0, totalDuration: 0 };
      }

      summary[operation].count++;
      summary[operation].totalDuration += duration;
      summary[operation].avgDuration = summary[operation].totalDuration / summary[operation].count;
    }

    return summary;
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      options: this.options,
      entries: this.entries,
      summary: {
        totalEntries: this.entries.length,
        errorCount: this.getEntriesByLevel(LogLevel.ERROR).length,
        warnCount: this.getEntriesByLevel(LogLevel.WARN).length,
        errorSummary: this.getErrorSummary(),
        performanceSummary: this.getPerformanceSummary()
      }
    }, null, 2);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Enable/disable console output
   */
  setConsoleOutput(enabled: boolean): void {
    this.options.enableConsole = enabled;
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience functions
export const debug = (message: string, context?: Record<string, any>) => logger.debug(message, context);
export const info = (message: string, context?: Record<string, any>) => logger.info(message, context);
export const warn = (message: string, context?: Record<string, any>) => logger.warn(message, context);
export const error = (message: string, err?: Error, context?: Record<string, any>) => logger.error(message, err, context);