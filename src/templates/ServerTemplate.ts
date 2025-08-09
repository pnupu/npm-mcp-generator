/**
 * Template engine for generating consistent MCP server structures
 */

import { PackageAnalysis } from '../types/PackageInfo.js';
import { MCPTool, ServerTemplate, TemplateVariable, GenerationOptions } from '../types/MCPTypes.js';

export class TemplateEngine {
  private templates: Map<string, ServerTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Render a template with provided variables
   */
  render(templateName: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let rendered = template.template;

    // Replace template variables
    for (const variable of template.variables) {
      const value = variables[variable.name] ?? variable.defaultValue;
      if (value === undefined && variable.required) {
        throw new Error(`Required template variable '${variable.name}' not provided`);
      }

      const placeholder = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
      rendered = rendered.replace(placeholder, String(value || ''));
    }

    // Handle conditional blocks
    rendered = this.processConditionals(rendered, variables);

    // Handle loops
    rendered = this.processLoops(rendered, variables);

    return rendered;
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: ServerTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Generate server code using templates
   */
  generateServerCode(
    analysis: PackageAnalysis, 
    tools: MCPTool[], 
    options: GenerationOptions = {}
  ): string {
    const templateName = this.selectTemplate(analysis, tools);
    
    const variables = {
      packageName: analysis.packageInfo.name,
      packageVersion: analysis.packageInfo.version,
      packageDescription: analysis.packageInfo.description,
      serverName: options.serverName || this.generateServerName(analysis.packageInfo.name),
      className: this.toPascalCase(analysis.packageInfo.name),
      tools: tools,
      toolImplementations: tools.map(tool => ({
        name: tool.name,
        camelCaseName: this.toCamelCase(tool.name),
        implementation: this.generateToolImplementation(tool, analysis)
      })),
      generatedAt: new Date().toISOString(),
      hasTypeDefinitions: analysis.typeDefinitions.hasDefinitions,
      hasExamples: analysis.readme.usageExamples.length > 0 || analysis.examples.length > 0,
      hasConfiguration: analysis.readme.configurationOptions.length > 0,
      completenessScore: analysis.metadata.completeness.overall
    };

    return this.render(templateName, variables);
  }

  private initializeDefaultTemplates(): void {
    // Basic MCP server template
    this.registerTemplate({
      name: 'basic-server',
      description: 'Basic MCP server with standard tools',
      template: `#!/usr/bin/env node

/**
 * MCP Server for {{ packageName }}
 * Generated automatically from package analysis
 * 
 * Package: {{ packageName }}@{{ packageVersion }}
 * Description: {{ packageDescription }}
 * Generated: {{ generatedAt }}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class {{ className }}MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '{{ serverName }}',
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: {{ toolsJson }}
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
{{#each toolImplementations}}
          case '{{ name }}':
            return await this.{{ camelCaseName }}(args || {});
{{/each}}
          
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

{{#each toolImplementations}}
  private async {{ camelCaseName }}(args: any) {
{{ implementation }}
  }

{{/each}}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(\`{{ packageName }} MCP server running on stdio\`);
    console.error(\`Available tools: {{ toolNames }}\`);
    console.error(\`Package version: {{ packageVersion }}\`);
    console.error(\`Generated: {{ generatedAt }}\`);
  }
}

// Start the server
const server = new {{ className }}MCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});`,
      variables: [
        { name: 'packageName', type: 'string', description: 'NPM package name', required: true },
        { name: 'packageVersion', type: 'string', description: 'Package version', required: true },
        { name: 'packageDescription', type: 'string', description: 'Package description', required: true },
        { name: 'serverName', type: 'string', description: 'MCP server name', required: true },
        { name: 'className', type: 'string', description: 'Server class name', required: true },
        { name: 'tools', type: 'array', description: 'MCP tools array', required: true },
        { name: 'toolImplementations', type: 'array', description: 'Tool implementations', required: true },
        { name: 'generatedAt', type: 'string', description: 'Generation timestamp', required: true }
      ]
    });

    // Enhanced server template with additional features
    this.registerTemplate({
      name: 'enhanced-server',
      description: 'Enhanced MCP server with advanced features',
      template: `#!/usr/bin/env node

/**
 * Enhanced MCP Server for {{ packageName }}
 * Generated automatically from package analysis
 * 
 * Package: {{ packageName }}@{{ packageVersion }}
 * Description: {{ packageDescription }}
 * Generated: {{ generatedAt }}
 * Completeness Score: {{ completenessScore }}%
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

interface ServerStats {
  startTime: Date;
  toolCalls: Record<string, number>;
  totalCalls: number;
}

class {{ className }}MCPServer {
  private server: Server;
  private stats: ServerStats;

  constructor() {
    this.server = new Server(
      {
        name: '{{ serverName }}',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.stats = {
      startTime: new Date(),
      toolCalls: {},
      totalCalls: 0
    };

    this.setupToolHandlers();
    this.setupErrorHandling();
    this.setupLogging();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: {{ toolsJson }}
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Update statistics
      this.stats.toolCalls[name] = (this.stats.toolCalls[name] || 0) + 1;
      this.stats.totalCalls++;

      console.error(\`[Tool Call] \${name} (call #\${this.stats.totalCalls})\`);

      try {
        const startTime = Date.now();
        let result;

        switch (name) {
{{#each toolImplementations}}
          case '{{ name }}':
            result = await this.{{ camelCaseName }}(args || {});
            break;
{{/each}}
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              \`Unknown tool: \${name}\`
            );
        }

        const duration = Date.now() - startTime;
        console.error(\`[Tool Complete] \${name} completed in \${duration}ms\`);
        
        return result;
      } catch (error) {
        console.error(\`[Tool Error] \${name}:\`, error);
        
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
      this.logStats();
      console.log('\\nShutting down MCP server...');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupLogging() {
    // Log stats every 10 minutes
    setInterval(() => {
      this.logStats();
    }, 10 * 60 * 1000);
  }

  private logStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const uptimeMinutes = Math.floor(uptime / (1000 * 60));
    
    console.error(\`[Stats] Uptime: \${uptimeMinutes}m, Total calls: \${this.stats.totalCalls}\`);
    console.error(\`[Stats] Tool usage:\`, this.stats.toolCalls);
  }

{{#each toolImplementations}}
  private async {{ camelCaseName }}(args: any) {
{{ implementation }}
  }

{{/each}}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(\`{{ packageName }} Enhanced MCP server running on stdio\`);
    console.error(\`Available tools: {{ toolNames }}\`);
    console.error(\`Package version: {{ packageVersion }}\`);
    console.error(\`Completeness score: {{ completenessScore }}%\`);
    console.error(\`Generated: {{ generatedAt }}\`);
  }
}

// Start the server
const server = new {{ className }}MCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});`,
      variables: [
        { name: 'packageName', type: 'string', description: 'NPM package name', required: true },
        { name: 'packageVersion', type: 'string', description: 'Package version', required: true },
        { name: 'packageDescription', type: 'string', description: 'Package description', required: true },
        { name: 'serverName', type: 'string', description: 'MCP server name', required: true },
        { name: 'className', type: 'string', description: 'Server class name', required: true },
        { name: 'tools', type: 'array', description: 'MCP tools array', required: true },
        { name: 'toolImplementations', type: 'array', description: 'Tool implementations', required: true },
        { name: 'generatedAt', type: 'string', description: 'Generation timestamp', required: true },
        { name: 'completenessScore', type: 'number', description: 'Documentation completeness score', required: true }
      ]
    });

    // Minimal server template for simple packages
    this.registerTemplate({
      name: 'minimal-server',
      description: 'Minimal MCP server for packages with limited documentation',
      template: `#!/usr/bin/env node

/**
 * Minimal MCP Server for {{ packageName }}
 * Generated for package with limited documentation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class {{ className }}MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '{{ serverName }}',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: {{ toolsJson }}
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
{{#each toolImplementations}}
        case '{{ name }}':
          return await this.{{ camelCaseName }}(args || {});
{{/each}}
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            \`Unknown tool: \${name}\`
          );
      }
    });
  }

{{#each toolImplementations}}
  private async {{ camelCaseName }}(args: any) {
{{ implementation }}
  }

{{/each}}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(\`{{ packageName }} MCP server running\`);
  }
}

const server = new {{ className }}MCPServer();
server.run().catch(console.error);`,
      variables: [
        { name: 'packageName', type: 'string', description: 'NPM package name', required: true },
        { name: 'serverName', type: 'string', description: 'MCP server name', required: true },
        { name: 'className', type: 'string', description: 'Server class name', required: true },
        { name: 'tools', type: 'array', description: 'MCP tools array', required: true },
        { name: 'toolImplementations', type: 'array', description: 'Tool implementations', required: true }
      ]
    });
  }

  private selectTemplate(analysis: PackageAnalysis, tools: MCPTool[]): string {
    const completeness = analysis.metadata.completeness.overall;
    const toolCount = tools.length;

    // Select template based on package completeness and features
    if (completeness >= 70 && toolCount >= 4) {
      return 'enhanced-server';
    } else if (completeness >= 40 && toolCount >= 2) {
      return 'basic-server';
    } else {
      return 'minimal-server';
    }
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    // Process {{#if condition}} blocks
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(ifRegex, (match, condition, content) => {
      const value = variables[condition];
      return value ? content : '';
    });
  }

  private processLoops(template: string, variables: Record<string, any>): string {
    // Process {{#each array}} blocks
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return template.replace(eachRegex, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map(item => {
        let itemContent = content;
        
        // Replace item properties
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            itemContent = itemContent.replace(placeholder, String(value));
          }
        }
        
        return itemContent;
      }).join('');
    });
  }

  private generateServerName(packageName: string): string {
    return packageName
      .replace(/[@\/]/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '')
      .toLowerCase() + '-mcp-server';
  }

  private generateToolImplementation(tool: MCPTool, analysis: PackageAnalysis): string {
    // This would be implemented by the ToolGenerator
    return `    return {
      content: [
        {
          type: "text",
          text: "Implementation for ${tool.name}"
        }
      ]
    };`;
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
}