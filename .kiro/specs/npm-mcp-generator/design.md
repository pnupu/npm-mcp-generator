# Design Document

## Overview

The NPM Package MCP Generator is a TypeScript-based system that automatically analyzes NPM packages and generates Model Context Protocol (MCP) servers. The system follows a pipeline architecture: fetch package data from multiple sources, analyze and extract meaningful information, then generate a complete MCP server with tools that provide package-specific context to AI assistants.

The design prioritizes modularity, type safety, and extensibility to handle the diverse landscape of NPM packages, from new releases to specialized domain libraries.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│   Analyzers      │───▶│   Generators    │
│                 │    │                  │    │                 │
│ • NPM Registry  │    │ • Package Info   │    │ • MCP Server    │
│ • GitHub API    │    │ • README Parser  │    │ • Tool Defs     │
│ • unpkg.com     │    │ • TypeScript     │    │ • Vector Store  │
│ • Docs Sites    │    │ • Examples       │    │ • Server Code   │
│ • Web Crawler   │    │ • Web Content    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Enhanced Vector-Based Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Documentation  │───▶│   Processing     │───▶│  Vector Storage │
│   Discovery     │    │   Pipeline       │    │   & Search      │
│                 │    │                  │    │                 │
│ • Auto-detect   │    │ • HTML→Markdown  │    │ • OpenAI Embed  │
│ • Manual URLs   │    │ • Content Chunk  │    │ • Cosine Search │
│ • Site Crawling │    │ • Prioritization │    │ • Offline Query │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

#### 1. Data Fetching Layer
- **NPMRegistryFetcher**: Retrieves package metadata, versions, and dependencies
- **GitHubFetcher**: Accesses README files, examples, and repository structure
- **UnpkgFetcher**: Downloads TypeScript definitions and package files
- **DocumentationCrawler**: Discovers and fetches comprehensive documentation sites
- **CacheManager**: Implements intelligent caching to avoid redundant API calls

#### 2. Analysis Layer
- **PackageAnalyzer**: Orchestrates the analysis process and combines results
- **ReadmeAnalyzer**: Parses README files to extract usage examples and documentation
- **TypeDefinitionAnalyzer**: Processes TypeScript definitions to understand API structure
- **ExampleAnalyzer**: Analyzes example code to identify common patterns
- **DocumentationProcessor**: Converts HTML to Markdown and chunks content for vector storage
- **ContentChunker**: Intelligently splits documentation into semantic chunks

#### 3. Generation Layer
- **MCPServerGenerator**: Creates complete MCP server packages with embedded vector storage
- **ToolGenerator**: Generates specific MCP tools with semantic search capabilities
- **VectorEmbedder**: Generates OpenAI embeddings for all content chunks
- **TemplateEngine**: Uses templates to ensure consistent server structure

## Components and Interfaces

### Core Data Types

```typescript
interface PackageAnalysis {
  packageInfo: PackageInfo;
  readme: ReadmeAnalysis;
  typeDefinitions: TypeDefinitionAnalysis;
  examples: ExampleAnalysis[];
  apiReference: APIReference;
  metadata: AnalysisMetadata;
}

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  repository?: RepositoryInfo;
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  maintainers?: string[];
  publishDate: string;
}

interface ReadmeAnalysis {
  sections: ReadmeSection[];
  codeBlocks: CodeBlock[];
  installationInstructions: InstallationStep[];
  usageExamples: UsageExample[];
  configurationOptions: ConfigurationOption[];
}

interface TypeDefinitionAnalysis {
  exports: ExportInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  types: TypeInfo[];
  enums: EnumInfo[];
}
```

### Enhanced MCP Tool Interfaces

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: ToolHandler;
}

interface VectorEnhancedMCPServer {
  packageName: string;
  version: string;
  tools: MCPTool[];
  vectorSearch: VectorSearch;        // Embedded vector search system
  documentChunks: DocumentChunk[];   // Pre-computed embeddings
  serverCode: string;
  packageJson: PackageJsonConfig;
  documentation: string;
  bundleSize: {
    totalSize: number;
    embeddingsSize: number;
    chunkCount: number;
  };
}

// Enhanced tool capabilities
interface EnhancedSearchTool extends MCPTool {
  capabilities: {
    semanticSearch: boolean;         // Natural language queries
    functionSearch: boolean;         // API function discovery
    exampleSearch: boolean;          // Code example retrieval
    guideSearch: boolean;           // Tutorial and guide search
    categoryFiltering: boolean;      // Filter by content type
  };
}
```

### Analysis Pipeline

#### Stage 1: Data Collection
1. **Package Metadata Fetching**
   - Query NPM registry for package information
   - Resolve repository URLs and documentation links
   - Fetch version history and dependency information

2. **Documentation Retrieval**
   - Download README files from GitHub
   - Access TypeScript definition files
   - Collect example code from repository

3. **Caching Strategy**
   - Cache API responses with TTL based on package update frequency
   - Store parsed results to avoid re-analysis
   - Implement cache invalidation for package updates

#### Stage 2: Content Analysis
1. **README Processing**
   - Parse markdown structure and extract sections
   - Identify code blocks and categorize by language
   - Extract installation and configuration instructions
   - Parse usage examples with context

2. **TypeScript Analysis**
   - Parse .d.ts files using TypeScript compiler API
   - Extract function signatures, interfaces, and types
   - Build API reference with parameter information
   - Identify deprecated or experimental APIs

3. **Example Code Analysis**
   - Analyze code patterns and common usage
   - Extract import statements and dependencies
   - Identify configuration patterns and best practices

#### Stage 3: MCP Server Generation
1. **Tool Definition Creation**
   - Generate `get_package_info` tool with metadata
   - Create `get_usage_examples` tool with categorized examples
   - Build `get_api_reference` tool with searchable API documentation
   - Implement `search_package_docs` tool for content search
   - Add `get_configuration_guide` tool for setup instructions

2. **Server Code Generation**
   - Use template engine to create consistent server structure
   - Implement tool handlers with proper error handling
   - Generate TypeScript code with full type safety
   - Include package-specific imports and dependencies

## Vector-Based Documentation System

### Documentation Discovery and Processing

#### Phase 1: Simple Documentation Discovery
```typescript
interface DocumentationDiscovery {
  // Automatic discovery patterns
  tryCommonPatterns(packageInfo: PackageInfo): string[];
  
  // Manual override support
  useProvidedUrl(url: string): boolean;
  
  // Fallback to existing sources
  fallbackToGitHub(repositoryUrl: string): string;
}

// Simple heuristic approach
const docUrls = [
  packageInfo.homepage + '/docs',
  packageInfo.homepage + '/api', 
  `https://${packageName}.com/docs`,
  // Manual override: --docs-url flag
];
```

#### Phase 2: Content Processing Pipeline
```typescript
interface ContentProcessor {
  // HTML to Markdown conversion
  convertToMarkdown(html: string): string;
  
  // Intelligent content chunking
  chunkContent(markdown: string): DocumentChunk[];
  
  // Content prioritization
  prioritizeChunks(chunks: DocumentChunk[]): DocumentChunk[];
}

interface DocumentChunk {
  id: string;                    // unique identifier
  markdown: string;              // clean markdown content
  embedding: Float32Array;       // OpenAI embedding (1536 dimensions)
  metadata: {
    type: 'function' | 'class' | 'guide' | 'example';
    title: string;
    url?: string;
    category?: string;
    functionName?: string;       // for API functions
    parameters?: string[];       // for functions
    priority: number;           // for chunk selection (0-1)
    codeExample?: boolean;      // if chunk contains code
  };
}
```

### Vector Storage and Search

#### Embedding Strategy
- **Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Generation**: During MCP server creation (one-time cost)
- **Storage**: Pre-computed embeddings embedded in generated server
- **Bundle Size**: ~6KB per chunk, target 1000-2000 chunks (6-12MB)

#### Search Implementation
```typescript
class VectorSearch {
  private chunks: DocumentChunk[];
  
  async semanticSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(query);
    
    // Calculate cosine similarity
    const similarities = this.chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by relevance and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
  
  // Content type filtering
  async searchByType(query: string, type: 'function' | 'guide' | 'example'): Promise<SearchResult[]> {
    const results = await this.semanticSearch(query, 20);
    return results.filter(r => r.chunk.metadata.type === type);
  }
}
```

#### Content Prioritization Strategy
```typescript
const contentPriority = {
  'function': 0.7,    // 70% - API functions (highest value for code generation)
  'example': 0.2,     // 20% - Code examples (show real usage)
  'guide': 0.1        // 10% - Guides and tutorials (provide context)
};

// Chunk selection algorithm
function selectChunks(allChunks: DocumentChunk[], maxChunks: number): DocumentChunk[] {
  return allChunks
    .sort((a, b) => b.metadata.priority - a.metadata.priority)
    .slice(0, maxChunks);
}
```

## Data Models

### Package Information Model
```typescript
class PackageInfo {
  constructor(
    public name: string,
    public version: string,
    public description: string,
    public repository?: RepositoryInfo,
    public dependencies?: DependencyMap
  ) {}

  isRecentlyUpdated(): boolean {
    // Logic to determine if package was updated recently
  }

  hasBreakingChanges(previousVersion: string): boolean {
    // Logic to detect breaking changes between versions
  }
}
```

### Analysis Result Model
```typescript
class AnalysisResult {
  constructor(
    public packageInfo: PackageInfo,
    public apiStructure: APIStructure,
    public usagePatterns: UsagePattern[],
    public examples: CodeExample[]
  ) {}

  generateToolDefinitions(): MCPTool[] {
    // Convert analysis results into MCP tool definitions
  }
}
```

## Error Handling

### Error Categories
1. **Network Errors**: API timeouts, rate limiting, connectivity issues
2. **Parsing Errors**: Malformed documentation, invalid TypeScript definitions
3. **Generation Errors**: Template processing failures, code generation issues
4. **Validation Errors**: Invalid package names, missing required data

### Error Handling Strategy
- **Graceful Degradation**: Continue processing with available data when some sources fail
- **Retry Logic**: Implement exponential backoff for transient network errors
- **Detailed Logging**: Provide specific error messages for debugging
- **Fallback Mechanisms**: Use alternative data sources when primary sources fail

### Error Recovery
```typescript
class ErrorHandler {
  async handleAnalysisError(error: AnalysisError, context: AnalysisContext): Promise<PartialAnalysis> {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return this.retryWithBackoff(context);
      case 'PARSING_ERROR':
        return this.useAlternativeParser(context);
      case 'MISSING_DATA':
        return this.generateFromAvailableData(context);
      default:
        throw error;
    }
  }
}
```

## Testing Strategy

### Unit Testing
- **Analyzer Tests**: Verify correct parsing of different documentation formats
- **Generator Tests**: Ensure generated MCP servers have correct structure
- **Fetcher Tests**: Mock API responses and test error handling
- **Integration Tests**: Test complete pipeline with real packages

### Test Package Selection
- **New Packages**: `@tanstack/react-query` v5, `drizzle-orm`
- **Complex Packages**: `@tensorflow/tfjs`, `three`
- **Simple Packages**: `date-fns`, `lodash` (for baseline comparison)
- **Edge Cases**: Packages with minimal documentation, TypeScript-only packages

### Validation Criteria
1. Generated MCP servers compile without errors
2. Tool responses contain accurate, actionable information
3. Code examples in responses actually work with the target package
4. Performance meets requirements (< 60 seconds generation time)

### Testing Framework
```typescript
describe('PackageAnalyzer', () => {
  it('should analyze react-query v5 and detect breaking changes', async () => {
    const analyzer = new PackageAnalyzer();
    const result = await analyzer.analyzePackage('@tanstack/react-query', '5.0.0');
    
    expect(result.apiReference.exports).toContain('useQuery');
    expect(result.usageExamples).toHaveLength(greaterThan(0));
    expect(result.packageInfo.hasBreakingChanges('4.0.0')).toBe(true);
  });
});
```

## Performance Considerations

### Vector Storage Optimization
1. **Bundle Size Management**: Target 1000-2000 chunks (6-12MB embeddings)
2. **Compression**: Use Float32Array for embeddings, compress markdown content
3. **Lazy Loading**: Consider streaming embeddings for very large packages
4. **Chunk Selection**: Prioritize high-value content (API functions > examples > guides)

### Search Performance
1. **Pre-computed Embeddings**: No runtime embedding generation for search
2. **Efficient Similarity**: Optimized cosine similarity calculations
3. **Result Caching**: Cache common search queries during generation
4. **Memory Management**: Efficient vector storage and retrieval

### Generation Optimization
1. **Parallel Processing**: Fetch data from multiple sources concurrently
2. **Intelligent Caching**: Cache analysis results and embeddings with appropriate TTL
3. **Incremental Updates**: Only re-analyze changed parts of packages
4. **Resource Limits**: Implement timeouts and memory limits for large packages

### Scalability Design
- **Stateless Architecture**: Enable horizontal scaling of analysis workers
- **Queue-Based Processing**: Handle multiple package requests efficiently
- **Resource Monitoring**: Track memory usage, processing time, and embedding costs
- **Rate Limiting**: Respect API limits of external services and OpenAI

This design provides a robust foundation for generating high-quality MCP servers that significantly improve AI assistance for NPM package usage.