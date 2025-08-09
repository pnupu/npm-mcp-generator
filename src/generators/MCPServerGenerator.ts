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

      // Generate server code
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

    return `#!/usr/bin/env node

/**
 * MCP Server for ${analysis.packageInfo.name}
 * Generated automatically from package analysis
 * 
 * Package: ${analysis.packageInfo.name}@${analysis.packageInfo.version}
 * Description: ${analysis.packageInfo.description}
 * Generated: ${new Date().toISOString()}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class ${className}MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '${serverName}',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
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

  private generatePackageJson(serverName: string, analysis: PackageAnalysis): PackageJsonConfig {
    return {
      name: serverName,
      version: '1.0.0',
      type: 'module',
      bin: {
        [serverName]: './dist/index.js'
      },
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'tsx src/index.ts'
      },
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