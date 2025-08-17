/**
 * MCP server code generator that creates complete MCP server packages
 */

import { PackageAnalysis } from '../types/PackageInfo.js';
import { GeneratedMCPServer, MCPTool, PackageJsonConfig, MCPServerMetadata } from '../types/MCPTypes.js';
import { AnalysisResult } from '../types/AnalysisResult.js';
import { ToolGenerator } from './ToolGenerator.js';

export interface MCPServerGeneratorOptions {
  outputDirectory?: string;
  serverName?: string;
  includeTests?: boolean;
  includeDocumentation?: boolean;
}

export class MCPServerGenerator {
  private toolGenerator: ToolGenerator;
  private embeddingsData: any[] = [];
  private markdownContent: string = '';

  constructor() {
    this.toolGenerator = new ToolGenerator();
  }

  /**
   * Generate a complete MCP server from package analysis
   */
  async generateServer(
    analysis: PackageAnalysis, 
    options: MCPServerGeneratorOptions = {}
  ): Promise<AnalysisResult<GeneratedMCPServer>> {
    const startTime = Date.now();

    try {
      console.log(`🔧 Generating MCP server for ${analysis.packageInfo.name}...`);

      // Generate MCP tools
      const toolsResult = await this.toolGenerator.generateTools(analysis);
      if (!toolsResult.success) {
        return {
          success: false,
          error: toolsResult.error!,
          warnings: [],
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'mcp-server-generator'
          }
        };
      }

      const tools = toolsResult.data!;
      const warnings = toolsResult.warnings || [];

      // Generate server name
      const serverName = options.serverName || this.generateServerName(analysis.packageInfo.name);

      // Generate server code (with vector search if available)
      const serverCode = this.generateServerCode(serverName, analysis, tools);

      // Generate package.json
      const packageJson = this.generatePackageJson(serverName, analysis);

      // Generate documentation
      const documentation = this.generateDocumentation(analysis, tools);

      // Create metadata
      const metadata: MCPServerMetadata = {
        generatedAt: new Date(),
        sourcePackage: analysis.packageInfo.name,
        sourceVersion: analysis.packageInfo.version,
        generatorVersion: '1.0.0',
        toolCount: tools.length,
        features: this.identifyFeatures(analysis, tools)
      };

      const generatedServer: GeneratedMCPServer = {
        packageName: analysis.packageInfo.name,
        version: analysis.packageInfo.version,
        tools,
        serverCode,
        packageJson,
        documentation,
        metadata
      };

      const processingTime = Date.now() - startTime;
      console.log(`✅ MCP server generated successfully in ${processingTime}ms`);

      return {
        success: true,
        data: generatedServer,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'mcp-server-generator'
        }
      };

    } catch (error) {
      console.error('❌ MCP server generation failed:', error);
      
      return {
        success: false,
        error: {
          type: 'GENERATION_ERROR',
          message: `Failed to generate MCP server: ${error}`,
          recoverable: false,
          suggestions: ['Check package analysis data', 'Verify server generation templates']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'mcp-server-generator'
        }
      };
    }
  }

  private generateServerName(packageName: string): string {
    // Convert package name to a valid server name
    return packageName
      .replace(/[@\/]/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '')
      .toLowerCase() + '-mcp-server';
  }

  private generateServerCode(serverName: string, analysis: PackageAnalysis, tools: MCPTool[]): string {
    const className = this.toPascalCase(serverName.replace('-mcp-server', ''));
    const toolImplementations = tools.map(tool => 
      this.toolGenerator.generateToolImplementation(tool, analysis)
    ).join('\n');

    // Check if we have vector embeddings
    const hasVectorSearch = analysis.comprehensiveDocumentation?.embeddedChunks && 
                           analysis.comprehensiveDocumentation.embeddedChunks.length > 0;

    const vectorSearchImports = hasVectorSearch ? `
// Vector search system (embedded)
${this.generateVectorSearchCode(analysis.comprehensiveDocumentation!)}` : '';

    const vectorSearchInit = hasVectorSearch ? `
    // Initialize vector search
    this.vectorSearch = new VectorSearch(EMBEDDED_CHUNKS);` : '';

    return `#!/usr/bin/env node

/**
 * MCP Server for ${analysis.packageInfo.name}
 * Generated automatically from package analysis
 * 
 * Package: ${analysis.packageInfo.name}@${analysis.packageInfo.version}
 * Description: ${analysis.packageInfo.description}
 * Generated: ${new Date().toISOString()}
 * Vector Search: ${hasVectorSearch ? 'Enabled' : 'Disabled'}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';${vectorSearchImports}

class ${className}MCPServer {
  private server: Server;${hasVectorSearch ? '\n  private vectorSearch: VectorSearch;' : ''}

  constructor() {
    this.server = new Server({
      name: '${serverName}',
      version: '1.0.0',
      capabilities: {
        tools: {},
      },
    });${vectorSearchInit}

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  // Helper method for enhanced search functionality
  basicDocumentationSearch(query: string, type: string, limit: number) {
    // This method will be added to servers that don't have vector search
    const searchTerm = query.toLowerCase();
    let results = [];
    
    // Basic text-based search implementation
    // (This would be populated with the package's actual data)
    
    return {
      content: [
        {
          type: "text",
          text: \`Basic search results for "\${query}" (vector search not available)\`
        }
      ]
    };
  }

  calculateRelevance(text: string, term: string) {
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let score = 0;
    
    if (lowerText.includes(lowerTerm)) score += 1;
    if (lowerText.startsWith(lowerTerm)) score += 0.5;
    
    const words = lowerTerm.split(' ');
    words.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    return score;
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ${JSON.stringify(tools, null, 8)}
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          ${tools.map(tool => `case '${tool.name}':
            return await this.${this.toCamelCase(tool.name)}(args || {});`).join('\n          ')}
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              \`Unknown tool: \${name}\`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          \`Error executing tool \${name}: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\\nShutting down MCP server...');
      await this.server.close();
      process.exit(0);
    });
  }

  // Tool implementations
  ${tools.map(tool => `
  private async ${this.toCamelCase(tool.name)}(args: any) {
    ${this.toolGenerator.generateToolImplementation(tool, analysis)}
  }`).join('')}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(\`${analysis.packageInfo.name} MCP server running on stdio\`);
    console.error(\`Available tools: \${${JSON.stringify(tools.map(t => t.name))}}\`);
    console.error(\`Package version: ${analysis.packageInfo.version}\`);
    console.error(\`Generated: ${new Date().toISOString()}\`);
  }
}

// Start the server
const server = new ${className}MCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});`;
  }

  private generateVectorSearchCode(comprehensiveDocumentation: any): string {
    const { embeddedChunks } = comprehensiveDocumentation;

    // Optimization controls (env-driven)
    const maxChunks = parseInt(process.env.EMBEDDINGS_MAX_CHUNKS || process.env.DEFAULT_MAX_EMBEDDED_CHUNKS || '400', 10);
    const roundDecimals = Math.max(0, Math.min(6, parseInt(process.env.EMBEDDINGS_ROUND_DECIMALS || '3', 10)));
    const maxMarkdownChars = parseInt(process.env.EMBEDDINGS_MAX_MARKDOWN_CHARS || '1200', 10);

    // 1) Select top-priority chunks (stable sort by priority desc, then by wordCount desc)
    const selectedChunks = [...embeddedChunks]
      .sort((a, b) => {
        const pa = (a.metadata?.priority ?? 0);
        const pb = (b.metadata?.priority ?? 0);
        if (pb !== pa) return pb - pa;
        const wa = (a.metadata?.wordCount ?? 0);
        const wb = (b.metadata?.wordCount ?? 0);
        return wb - wa;
      })
      .slice(0, Math.min(maxChunks, embeddedChunks.length));

    // 2) Round embeddings and truncate markdown for size
    const round = (x: number) => Number(x.toFixed(roundDecimals));

    const compressedChunks = selectedChunks.map((chunk: any) => ({
      id: chunk.id,
      markdown: typeof chunk.markdown === 'string' && chunk.markdown.length > maxMarkdownChars
        ? chunk.markdown.slice(0, maxMarkdownChars) + '...'
        : chunk.markdown,
      metadata: chunk.metadata,
      embedding: Array.from(chunk.embedding as Iterable<number>, (v) => round(v))
    }));

    // Store embeddings data for separate file generation
    this.embeddingsData = compressedChunks;
    
    // Store markdown content for documentation file
    this.markdownContent = this.generateMarkdownDocumentation(compressedChunks);

    return `
// Import embedded documentation chunks
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS without types
import { EMBEDDED_CHUNKS } from './embeddings.js';

// Vector search system with proper TypeScript types
interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  typeFilter?: string[];
}

interface SearchResult {
  chunk: any;
  similarity: number;
  relevanceScore: number;
}

class VectorSearch {
  private chunks: any[];

  constructor(chunks: any[]) {
    this.chunks = chunks;
  }

  async semanticSearch(queryEmbedding: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 5, minSimilarity = 0.1, typeFilter } = options;
    
    let filteredChunks = this.chunks;
    if (typeFilter && typeFilter.length > 0) {
      filteredChunks = filteredChunks.filter(chunk => 
        typeFilter.includes(chunk.metadata.type)
      );
    }

    const similarities = filteredChunks.map(chunk => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      const relevanceScore = this.calculateRelevanceScore(similarity, chunk.metadata);
      
      return { chunk, similarity, relevanceScore };
    });

    return similarities
      .filter(result => result.similarity >= minSimilarity)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  calculateRelevanceScore(similarity: number, metadata: any): number {
    let score = similarity;
    
    const typeBoosts: Record<string, number> = { function: 0.3, class: 0.25, example: 0.2, guide: 0.1 };
    score += typeBoosts[metadata.type] || 0;
    
    if (metadata.priority > 0.7) score += 0.1;
    if (metadata.codeExample) score += 0.05;
    if (metadata.functionName && metadata.parameters?.length > 0) score += 0.05;
    
    return Math.min(1.0, score);
  }

  getStats(): { totalChunks: number; chunksByType: Record<string, number>; embeddingDimensions: number } {
    const chunksByType: Record<string, number> = {};
    this.chunks.forEach(chunk => {
      chunksByType[chunk.metadata.type] = (chunksByType[chunk.metadata.type] || 0) + 1;
    });
    
    return {
      totalChunks: this.chunks.length,
      chunksByType,
      embeddingDimensions: this.chunks[0]?.embedding.length || 0
    };
  }
}

// Helper method for hybrid text + semantic search
function performHybridSearch(vectorSearch: VectorSearch, query: string, type: string, limit: number, minSimilarity: number): SearchResult[] {
  const searchTerms = query.toLowerCase().split(' ');
  const results: SearchResult[] = [];
  
  // Create a simple query vector based on term frequency in chunks
  const queryVector = createQueryVector(searchTerms, (vectorSearch as any).chunks);
  
  for (const chunk of (vectorSearch as any).chunks) {
    if (type !== 'all' && chunk.metadata.type !== type) continue;
    
    // Text-based similarity
    const content = (chunk.markdown + ' ' + chunk.metadata.title).toLowerCase();
    let textScore = 0;
    
    for (const term of searchTerms) {
      if (content.includes(term)) {
        textScore += 1 / searchTerms.length;
      }
    }
    
    // Vector-based similarity (if we have a query vector)
    let vectorScore = 0;
    if (queryVector && chunk.embedding) {
      vectorScore = vectorSearch.cosineSimilarity(queryVector, chunk.embedding);
    }
    
    // Combine scores (60% vector, 40% text)
    const combinedScore = (vectorScore * 0.6) + (textScore * 0.4);
    
    if (combinedScore >= minSimilarity) {
      results.push({
        chunk,
        similarity: combinedScore,
        relevanceScore: vectorSearch.calculateRelevanceScore(combinedScore, chunk.metadata)
      });
    }
  }
  
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// Create a simple query vector based on term frequency
function createQueryVector(searchTerms: string[], chunks: any[]): number[] | null {
  if (!chunks || chunks.length === 0) return null;
  
  const embeddingDim = chunks[0].embedding?.length;
  if (!embeddingDim) return null;
  
  // Create a simple query vector by averaging embeddings of chunks that contain search terms
  const matchingChunks: { embedding: number[]; weight: number }[] = [];
  
  for (const chunk of chunks) {
    const content = (chunk.markdown + ' ' + chunk.metadata.title).toLowerCase();
    let matches = 0;
    
    for (const term of searchTerms) {
      if (content.includes(term)) {
        matches++;
      }
    }
    
    if (matches > 0) {
      matchingChunks.push({
        embedding: chunk.embedding,
        weight: matches / searchTerms.length
      });
    }
  }
  
  if (matchingChunks.length === 0) return null;
  
  // Create weighted average vector
  const queryVector = new Array(embeddingDim).fill(0);
  let totalWeight = 0;
  
  for (const match of matchingChunks) {
    for (let i = 0; i < embeddingDim; i++) {
      queryVector[i] += match.embedding[i] * match.weight;
    }
    totalWeight += match.weight;
  }
  
  // Normalize
  if (totalWeight > 0) {
    for (let i = 0; i < embeddingDim; i++) {
      queryVector[i] /= totalWeight;
    }
  }
  
  return queryVector;
}`;
  }

  private generateMarkdownDocumentation(chunks: any[]): string {
    let markdown = `# Documentation Chunks\n\n`;
    markdown += `This file contains all the processed documentation chunks used for vector search.\n\n`;
    markdown += `**Total Chunks:** ${chunks.length}\n`;
    
    const chunksByType = chunks.reduce((acc, chunk) => {
      acc[chunk.metadata.type] = (acc[chunk.metadata.type] || 0) + 1;
      return acc;
    }, {});
    
    markdown += `**Chunks by Type:**\n`;
    Object.entries(chunksByType).forEach(([type, count]) => {
      markdown += `- ${type}: ${count}\n`;
    });
    
    markdown += `\n---\n\n`;
    
    chunks.forEach((chunk, index) => {
      markdown += `## Chunk ${index + 1}: ${chunk.metadata.title}\n\n`;
      markdown += `**Type:** ${chunk.metadata.type} | **Priority:** ${chunk.metadata.priority} | **Words:** ${chunk.metadata.wordCount}\n`;
      
      if (chunk.metadata.functionName) {
        markdown += `**Function:** ${chunk.metadata.functionName}`;
        if (chunk.metadata.parameters && chunk.metadata.parameters.length > 0) {
          markdown += `(${chunk.metadata.parameters.join(', ')})`;
        }
        markdown += `\n`;
      }
      
      markdown += `**Has Code:** ${chunk.metadata.codeExample ? 'Yes' : 'No'}\n\n`;
      markdown += `${chunk.markdown}\n\n---\n\n`;
    });
    
    return markdown;
  }

  /**
   * Generate embeddings.js file content
   */
  generateEmbeddingsFile(): string {
    return `// Embedded documentation chunks with vector embeddings
// Generated automatically - do not edit manually

export const EMBEDDED_CHUNKS = ${JSON.stringify(this.embeddingsData, null, 2)};

export const EMBEDDINGS_STATS = {
  totalChunks: ${this.embeddingsData.length},
  embeddingDimensions: ${this.embeddingsData[0]?.embedding?.length || 0},
  chunksByType: ${JSON.stringify(this.embeddingsData.reduce((acc, chunk) => {
    acc[chunk.metadata.type] = (acc[chunk.metadata.type] || 0) + 1;
    return acc;
  }, {}), null, 2)},
  generatedAt: "${new Date().toISOString()}"
};
`;
  }

  /**
   * Generate documentation.md file content
   */
  generateDocumentationFile(): string {
    return this.markdownContent;
  }

  /**
   * Check if embeddings are available
   */
  hasEmbeddings(): boolean {
    return this.embeddingsData.length > 0;
  }

  private generatePackageJson(serverName: string, analysis: PackageAnalysis): PackageJsonConfig {
    const scripts: Record<string, string> = {
      build: 'tsc',
      start: 'node dist/index.js',
      dev: 'tsx src/index.ts'
    };
    if (this.hasEmbeddings()) {
      scripts.build = 'tsc && cp src/embeddings.js dist/embeddings.js';
    }

    return {
      name: serverName,
      version: '1.0.0',
      type: 'module',
      bin: {
        [serverName]: './dist/index.js'
      },
      scripts,
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.4.0',
        [analysis.packageInfo.name]: analysis.packageInfo.version
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
        'tsx': '^4.0.0'
      }
    };
  }

  private generateDocumentation(analysis: PackageAnalysis, tools: MCPTool[]): string {
    return `# ${analysis.packageInfo.name} MCP Server

An MCP server providing AI assistants with comprehensive knowledge about the ${analysis.packageInfo.name} package.

## Package Information

- **Name:** ${analysis.packageInfo.name}
- **Version:** ${analysis.packageInfo.version}
- **Description:** ${analysis.packageInfo.description}
- **Repository:** ${analysis.packageInfo.repository?.url || 'N/A'}
- **License:** ${analysis.packageInfo.license || 'Unknown'}

## Available Tools

${tools.map(tool => `### ${tool.name}

${tool.description}

**Input Schema:**
\`\`\`json
${JSON.stringify(tool.inputSchema, null, 2)}
\`\`\`
`).join('\n')}

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the server:
   \`\`\`bash
   npm run build
   \`\`\`

3. Run the server:
   \`\`\`bash
   npm start
   \`\`\`

## Usage with Kiro

Add this server to your Kiro MCP configuration:

\`\`\`json
{
  "mcpServers": {
    "${analysis.packageInfo.name}": {
      "command": "node",
      "args": ["path/to/${this.generateServerName(analysis.packageInfo.name)}/dist/index.js"]
    }
  }
}
\`\`\`

## Generated Features

${this.identifyFeatures(analysis, tools).map(feature => 
  `- **${feature.name}**: ${feature.description} ${feature.enabled ? '✅' : '❌'}`
).join('\n')}

## Analysis Quality

- **Overall Completeness:** ${analysis.metadata.completeness.overall}%
- **README Quality:** ${analysis.metadata.completeness.readme}%
- **Type Definitions:** ${analysis.metadata.completeness.typeDefinitions}%
- **Examples Available:** ${analysis.metadata.completeness.examples}%
- **API Reference:** ${analysis.metadata.completeness.apiReference}%

---

*Generated automatically by NPM MCP Generator*
*Generated on: ${new Date().toISOString()}*`;
  }

  private identifyFeatures(analysis: PackageAnalysis, tools: MCPTool[]): any[] {
    const features = [
      {
        name: 'Package Information',
        description: 'Basic package metadata and information',
        enabled: true
      },
      {
        name: 'Usage Examples',
        description: 'Code examples and usage patterns',
        enabled: tools.some(t => t.name === 'get_usage_examples')
      },
      {
        name: 'API Reference',
        description: 'TypeScript API documentation',
        enabled: tools.some(t => t.name === 'get_api_reference')
      },
      {
        name: 'Documentation Search',
        description: 'Search through package documentation',
        enabled: tools.some(t => t.name === 'search_package_docs')
      },
      {
        name: 'Configuration Guide',
        description: 'Setup and configuration instructions',
        enabled: tools.some(t => t.name === 'get_configuration_guide')
      },
      {
        name: 'TypeScript Support',
        description: 'Full TypeScript definitions and types',
        enabled: analysis.typeDefinitions.hasDefinitions
      },
      {
        name: 'Multiple Languages',
        description: 'Examples in multiple programming languages',
        enabled: this.hasMultipleLanguages(analysis)
      },
      {
        name: 'Installation Instructions',
        description: 'Package manager installation commands',
        enabled: analysis.readme.installationInstructions.length > 0
      }
    ];

    return features;
  }

  private hasMultipleLanguages(analysis: PackageAnalysis): boolean {
    const languages = new Set<string>();
    
    for (const example of analysis.readme.usageExamples) {
      languages.add(example.language);
    }
    
    for (const block of analysis.readme.codeBlocks) {
      languages.add(block.language);
    }
    
    return languages.size > 1;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[@\/\-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Generate additional files for the MCP server package
   */
  generateAdditionalFiles(analysis: PackageAnalysis): Record<string, string> {
    const files: Record<string, string> = {};

    // TypeScript configuration
    files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        sourceMap: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    }, null, 2);

    // .gitignore
    files['.gitignore'] = `node_modules/
dist/
*.log
.env
.DS_Store`;

    // README template
    files['README.md'] = this.generateDocumentation(analysis, []);

    return files;
  }
}