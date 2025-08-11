# API Documentation

This document provides detailed information about the NPM MCP Generator's API interfaces and extension points.

## Core Classes

### ApplicationOrchestrator

The main orchestrator class that coordinates the entire MCP server generation process.

```typescript
class ApplicationOrchestrator {
  constructor(options?: OrchestratorOptions)
  
  async generateMCPServer(request: GenerationRequest): Promise<GenerationResult>
  
  static createGenerationRequest(
    packageName: string,
    version?: string,
    outputDir?: string,
    options?: GenerationOptions
  ): GenerationRequest
}
```

#### Types

```typescript
interface GenerationRequest {
  packageName: string;
  version?: string;
  outputDirectory: string;
  options: GenerationOptions;
}

interface GenerationOptions {
  verbose?: boolean;
  dryRun?: boolean;
  noCache?: boolean;
  noExamples?: boolean;
  noTypes?: boolean;
  githubToken?: string;
  template?: 'basic' | 'enhanced' | 'minimal';
}

interface GenerationResult {
  success: boolean;
  analysis?: PackageAnalysis;
  serverDetails?: ServerDetails;
  generationTime?: number;
  warnings?: string[];
  error?: string;
}
```

#### Example Usage

```typescript
import { ApplicationOrchestrator } from 'npm-mcp-generator';

const orchestrator = new ApplicationOrchestrator();

const request = ApplicationOrchestrator.createGenerationRequest(
  'lodash',
  '4.17.21',
  './output',
  { verbose: true }
);

const result = await orchestrator.generateMCPServer(request);

if (result.success) {
  console.log(`Generated server with ${result.serverDetails?.tools} tools`);
} else {
  console.error(`Generation failed: ${result.error}`);
}
```

### PackageAnalyzer

Analyzes NPM packages and extracts comprehensive information.

```typescript
class PackageAnalyzer {
  constructor(options?: PackageAnalyzerOptions)
  
  async analyzePackage(
    packageName: string, 
    version?: string
  ): Promise<AnalysisResult<PackageAnalysis>>
}
```

#### Types

```typescript
interface PackageAnalyzerOptions {
  includeExamples?: boolean;
  includeTypeDefinitions?: boolean;
  maxRetries?: number;
  timeout?: number;
}

interface PackageAnalysis {
  packageInfo: PackageInfo;
  readme: ReadmeAnalysis;
  typeDefinitions: TypeDefinitionAnalysis;
  examples: ExampleAnalysis[];
  apiReference: APIReference;
  metadata: AnalysisMetadata;
}
```

#### Example Usage

```typescript
import { PackageAnalyzer } from 'npm-mcp-generator';

const analyzer = new PackageAnalyzer({
  includeExamples: true,
  includeTypeDefinitions: true
});

const result = await analyzer.analyzePackage('axios', '1.0.0');

if (result.success) {
  const analysis = result.data;
  console.log(`Package has ${analysis.apiReference.functions.length} functions`);
}
```

### MCPServerGenerator

Generates MCP server code from package analysis.

```typescript
class MCPServerGenerator {
  constructor(options?: ServerGeneratorOptions)
  
  async generateServer(
    analysis: PackageAnalysis,
    options?: ServerGenerationOptions
  ): Promise<GeneratedMCPServer>
}
```

#### Types

```typescript
interface ServerGeneratorOptions {
  template?: 'basic' | 'enhanced' | 'minimal';
  includeValidation?: boolean;
  includeErrorHandling?: boolean;
}

interface ServerGenerationOptions {
  outputDirectory: string;
  packageName: string;
  version: string;
}

interface GeneratedMCPServer {
  packageName: string;
  version: string;
  tools: MCPTool[];
  serverCode: string;
  packageJson: PackageJsonConfig;
  documentation: string;
}
```

## Data Fetchers

### NPMRegistryFetcher

Fetches package information from the NPM registry.

```typescript
class NPMRegistryFetcher {
  constructor(options?: FetcherOptions)
  
  async getPackageInfo(
    packageName: string, 
    version?: string
  ): Promise<AnalysisResult<PackageInfo>>
  
  async getPackageFiles(
    packageName: string, 
    version: string
  ): Promise<AnalysisResult<string[]>>
}
```

### GitHubFetcher

Fetches README files and examples from GitHub repositories.

```typescript
class GitHubFetcher {
  constructor(options?: GitHubFetcherOptions)
  
  async getReadme(repositoryUrl?: string): Promise<AnalysisResult<string>>
  
  async getExamples(repositoryUrl?: string): Promise<AnalysisResult<ExampleAnalysis[]>>
}
```

### UnpkgFetcher

Fetches TypeScript definitions and package files from unpkg.com.

```typescript
class UnpkgFetcher {
  constructor(options?: FetcherOptions)
  
  async getTypeDefinitions(
    packageName: string, 
    version: string
  ): Promise<AnalysisResult<string | null>>
  
  async getFileContent(
    packageName: string, 
    version: string, 
    filePath: string
  ): Promise<AnalysisResult<string>>
}
```

## Analyzers

### ReadmeAnalyzer

Analyzes README files and extracts structured information.

```typescript
class ReadmeAnalyzer {
  analyzeReadme(content: string): ReadmeAnalysis
}
```

#### Types

```typescript
interface ReadmeAnalysis {
  sections: ReadmeSection[];
  codeBlocks: CodeBlock[];
  installationInstructions: InstallationStep[];
  usageExamples: UsageExample[];
  configurationOptions: ConfigurationOption[];
}

interface ReadmeSection {
  title: string;
  level: number;
  content: string;
  subsections: ReadmeSection[];
}

interface CodeBlock {
  code: string;
  language: string;
  filename?: string;
  isExample: boolean;
}
```

### TypeDefinitionAnalyzer

Analyzes TypeScript definition files and extracts API structure.

```typescript
class TypeDefinitionAnalyzer {
  analyzeDefinitions(content: string): TypeDefinitionAnalysis
}
```

#### Types

```typescript
interface TypeDefinitionAnalysis {
  hasDefinitions: boolean;
  exports: ExportInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  types: TypeInfo[];
  enums: EnumInfo[];
}

interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  description?: string;
}
```

## Error Handling

### ErrorHandler

Comprehensive error handling with retry logic and recovery mechanisms.

```typescript
class ErrorHandler {
  constructor(retryOptions?: Partial<RetryOptions>)
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T>
  
  handleError(error: unknown, context: ErrorContext): AnalysisError
  
  getErrorStatistics(): Record<string, { count: number; lastError: Date }>
}
```

#### Types

```typescript
interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: AnalysisErrorType[];
}

interface ErrorContext {
  operation: string;
  packageName?: string;
  version?: string;
  attempt: number;
  maxAttempts: number;
  startTime: Date;
  metadata?: Record<string, any>;
}

interface AnalysisError {
  type: AnalysisErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestions?: string[];
}
```

### GracefulDegradation

Handles missing or incomplete data through fallback strategies.

```typescript
class GracefulDegradation {
  async applyDegradation(
    analysis: PackageAnalysis
  ): Promise<{ analysis: PackageAnalysis; result: DegradationResult }>
  
  generateFallbackTools(analysis: PackageAnalysis): MCPTool[]
  
  needsDegradation(analysis: PackageAnalysis): boolean
}
```

## Extension Points

### Custom Templates

Create custom server templates by implementing the `ServerTemplate` interface:

```typescript
interface ServerTemplate {
  name: string;
  description: string;
  generateServer(analysis: PackageAnalysis): string;
  generatePackageJson(packageName: string, version: string): PackageJsonConfig;
}

class CustomTemplate implements ServerTemplate {
  name = 'custom';
  description = 'Custom server template';
  
  generateServer(analysis: PackageAnalysis): string {
    // Your custom server generation logic
    return serverCode;
  }
  
  generatePackageJson(packageName: string, version: string): PackageJsonConfig {
    // Your custom package.json generation
    return packageConfig;
  }
}
```

### Custom Analyzers

Extend the analysis pipeline with custom analyzers:

```typescript
interface CustomAnalyzer {
  name: string;
  analyze(packageInfo: PackageInfo, content: string): CustomAnalysisResult;
}

class MyCustomAnalyzer implements CustomAnalyzer {
  name = 'my-analyzer';
  
  analyze(packageInfo: PackageInfo, content: string): CustomAnalysisResult {
    // Your custom analysis logic
    return result;
  }
}
```

### Custom Fetchers

Add support for additional data sources:

```typescript
interface DataFetcher<T> {
  name: string;
  fetch(packageName: string, version?: string): Promise<AnalysisResult<T>>;
}

class CustomFetcher implements DataFetcher<CustomData> {
  name = 'custom-fetcher';
  
  async fetch(packageName: string, version?: string): Promise<AnalysisResult<CustomData>> {
    // Your custom fetching logic
    return result;
  }
}
```

## Validation

### MCPServerValidator

Validates generated MCP servers for correctness and completeness.

```typescript
class MCPServerValidator {
  async validateServer(serverPath: string): Promise<ValidationResult>
  
  async validateTools(tools: MCPTool[]): Promise<ValidationResult>
  
  async testServerExecution(serverPath: string): Promise<ValidationResult>
}
```

#### Types

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}
```

## Utilities

### Logger

Enhanced logging system with operation tracking.

```typescript
class Logger {
  constructor(options?: LoggerOptions)
  
  debug(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, error?: Error, context?: Record<string, any>): void
  
  startOperation(operation: string, packageName?: string): string
  endOperation(operationId: string, success: boolean, duration: number): void
  
  getRecentEntries(count?: number): LogEntry[]
  exportLogs(): string
}
```

## Events

The system emits events during the analysis and generation process:

```typescript
type AnalysisEventType =
  | 'ANALYSIS_STARTED'
  | 'FETCHING_METADATA'
  | 'FETCHING_README'
  | 'FETCHING_TYPES'
  | 'PARSING_CONTENT'
  | 'GENERATING_TOOLS'
  | 'GENERATING_SERVER'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED';

interface AnalysisEvent {
  type: AnalysisEventType;
  packageName: string;
  timestamp: Date;
  data?: any;
}
```

### Event Handling

```typescript
import { EventEmitter } from 'events';

const orchestrator = new ApplicationOrchestrator();

orchestrator.on('ANALYSIS_STARTED', (event: AnalysisEvent) => {
  console.log(`Started analyzing ${event.packageName}`);
});

orchestrator.on('ANALYSIS_COMPLETED', (event: AnalysisEvent) => {
  console.log(`Completed analyzing ${event.packageName}`);
});
```

## Configuration

### Global Configuration

```typescript
interface GlobalConfig {
  cache: {
    enabled: boolean;
    directory: string;
    ttl: number;
  };
  github: {
    token?: string;
    apiUrl: string;
  };
  npm: {
    registry: string;
    timeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
}
```

### Environment Variables

- `GITHUB_TOKEN`: GitHub API token
- `NPM_REGISTRY`: Custom NPM registry URL
- `CACHE_DIR`: Custom cache directory
- `LOG_LEVEL`: Logging level
- `LOG_FILE`: Log file path

## Best Practices

### Performance Optimization

1. **Use caching** for repeated analyses
2. **Provide GitHub token** to avoid rate limiting
3. **Batch process** multiple packages when possible
4. **Use specific versions** to avoid resolution overhead

### Error Handling

1. **Always check result.success** before accessing data
2. **Handle network errors** gracefully with retries
3. **Provide meaningful error messages** to users
4. **Log errors** with sufficient context for debugging

### Memory Management

1. **Clear caches** periodically for long-running processes
2. **Limit concurrent analyses** to avoid memory pressure
3. **Stream large files** instead of loading into memory
4. **Dispose of resources** properly after use

### Security

1. **Validate all inputs** before processing
2. **Sanitize generated code** to prevent injection
3. **Use secure defaults** for all configurations
4. **Audit dependencies** regularly for vulnerabilities

---

For more examples and advanced usage patterns, see the [examples directory](../examples/) in the repository.