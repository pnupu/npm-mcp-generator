/**
 * Types for analysis results and error handling
 */

import { PackageAnalysis } from './PackageInfo.js';

export interface AnalysisResult<T = any> {
  success: boolean;
  data?: T;
  error?: AnalysisError;
  warnings?: string[];
  metadata: ResultMetadata;
}

export interface AnalysisError {
  type: AnalysisErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestions?: string[];
}

export type AnalysisErrorType = 
  | 'NETWORK_ERROR'
  | 'PARSING_ERROR' 
  | 'MISSING_DATA'
  | 'INVALID_PACKAGE'
  | 'RATE_LIMITED'
  | 'AUTHENTICATION_ERROR'
  | 'GENERATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'HTTP_ERROR'
  | 'CRAWL_ERROR'
  | 'PROCESSING_ERROR'
  | 'UNKNOWN_ERROR';

export interface ResultMetadata {
  processingTime: number;
  timestamp: Date;
  version: string;
  source: string;
  cacheHit?: boolean;
  [key: string]: any; // Allow additional properties
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  keyPrefix?: string;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: AnalysisErrorType[];
}

export interface ProcessingStats {
  totalPackages: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  errorBreakdown: Record<AnalysisErrorType, number>;
}

// Utility types for better type safety
export type PartialAnalysis = Partial<PackageAnalysis>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event types for progress tracking
export interface AnalysisEvent {
  type: AnalysisEventType;
  packageName: string;
  timestamp: Date;
  data?: any;
}

export type AnalysisEventType =
  | 'ANALYSIS_STARTED'
  | 'FETCHING_METADATA'
  | 'FETCHING_README'
  | 'FETCHING_TYPES'
  | 'PARSING_CONTENT'
  | 'GENERATING_TOOLS'
  | 'GENERATING_SERVER'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED';