#!/usr/bin/env node

/**
 * MCP Server for drizzle-orm
 * Generated automatically from package analysis
 * 
 * Package: drizzle-orm@0.44.4
 * Description: Drizzle ORM package for SQL databases
 * Generated: 2025-08-11T12:00:34.395Z
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class DrizzleOrmMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'drizzle-orm-mcp-server',
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
        tools: [
        {
                "name": "get_package_info",
                "description": "Get comprehensive information about the drizzle-orm package",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "includeMetadata": {
                                        "type": "boolean",
                                        "description": "Include analysis metadata and completeness scores",
                                        "default": false
                                },
                                "includeDependencies": {
                                        "type": "boolean",
                                        "description": "Include package dependencies information",
                                        "default": false
                                }
                        },
                        "additionalProperties": false
                }
        },
        {
                "name": "get_usage_examples",
                "description": "Get usage examples and code samples for drizzle-orm",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "category": {
                                        "type": "string",
                                        "description": "Filter examples by category",
                                        "enum": [
                                                "basic"
                                        ],
                                        "examples": [
                                                "basic"
                                        ]
                                },
                                "language": {
                                        "type": "string",
                                        "description": "Filter examples by programming language",
                                        "enum": [
                                                "javascript"
                                        ],
                                        "examples": [
                                                "javascript"
                                        ]
                                },
                                "limit": {
                                        "type": "number",
                                        "description": "Maximum number of examples to return",
                                        "default": 10,
                                        "examples": [
                                                5,
                                                10,
                                                20
                                        ]
                                }
                        },
                        "additionalProperties": false
                }
        },
        {
                "name": "get_api_reference",
                "description": "Get API reference documentation for drizzle-orm",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "type": {
                                        "type": "string",
                                        "description": "Type of API elements to retrieve",
                                        "enum": [
                                                "functions",
                                                "classes",
                                                "interfaces",
                                                "types",
                                                "all"
                                        ],
                                        "default": "all",
                                        "examples": []
                                },
                                "search": {
                                        "type": "string",
                                        "description": "Search for specific API elements by name",
                                        "examples": [
                                                "create",
                                                "get",
                                                "set",
                                                "config"
                                        ]
                                },
                                "includeExamples": {
                                        "type": "boolean",
                                        "description": "Include usage examples for API elements",
                                        "default": true
                                }
                        },
                        "additionalProperties": false
                }
        },
        {
                "name": "search_package_docs",
                "description": "Search through drizzle-orm documentation and examples",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "query": {
                                        "type": "string",
                                        "description": "Search query for documentation content",
                                        "examples": [
                                                "installation",
                                                "configuration",
                                                "error handling",
                                                "async"
                                        ]
                                },
                                "type": {
                                        "type": "string",
                                        "description": "Type of documentation to search",
                                        "enum": [
                                                "readme",
                                                "examples",
                                                "types",
                                                "all"
                                        ],
                                        "default": "all"
                                },
                                "limit": {
                                        "type": "number",
                                        "description": "Maximum number of results to return",
                                        "default": 5,
                                        "examples": [
                                                3,
                                                5,
                                                10
                                        ]
                                }
                        },
                        "required": [
                                "query"
                        ],
                        "additionalProperties": false
                }
        },
        {
                "name": "get_configuration_guide",
                "description": "Get configuration options and setup guide for drizzle-orm",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "format": {
                                        "type": "string",
                                        "description": "Format for configuration information",
                                        "enum": [
                                                "markdown",
                                                "json",
                                                "typescript"
                                        ],
                                        "default": "markdown"
                                },
                                "includeExamples": {
                                        "type": "boolean",
                                        "description": "Include configuration examples",
                                        "default": true
                                }
                        },
                        "additionalProperties": false
                }
        }
]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_package_info':
            return await this.getPackageInfo(args || {});
          case 'get_usage_examples':
            return await this.getUsageExamples(args || {});
          case 'get_api_reference':
            return await this.getApiReference(args || {});
          case 'search_package_docs':
            return await this.searchPackageDocs(args || {});
          case 'get_configuration_guide':
            return await this.getConfigurationGuide(args || {});
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\nShutting down MCP server...');
      await this.server.close();
      process.exit(0);
    });
  }

  // Tool implementations
  
  private async getPackageInfo(args: any) {
    
    const { includeMetadata = false, includeDependencies = false } = args;
    
    const packageInfo = {
      name: "drizzle-orm",
      version: "0.44.4",
      description: "Drizzle ORM package for SQL databases",
      homepage: "https://orm.drizzle.team",
      repository: "git+https://github.com/drizzle-team/drizzle-orm.git",
      keywords: ["drizzle","orm","pg","mysql","singlestore","postgresql","postgres","sqlite","database","sql","typescript","ts","drizzle-orm"],
      license: "Apache-2.0"
    };

    if (includeDependencies) {
      packageInfo.dependencies = {};
      packageInfo.peerDependencies = {"pg":">=8","gel":">=2","knex":"*","kysely":"*","mysql2":">=2","sql.js":">=1","sqlite3":">=5","postgres":">=3","@types/pg":"*","bun-types":"*","expo-sqlite":">=14.0.0","@types/sql.js":"*","@libsql/client":">=0.10.0","@prisma/client":"*","@upstash/redis":">=1.34.7","better-sqlite3":">=7","@xata.io/client":"*","@vercel/postgres":">=0.8.0","@opentelemetry/api":"^1.4.1","@libsql/client-wasm":">=0.10.0","@electric-sql/pglite":">=0.2.0","@planetscale/database":">=1.13","@tidbcloud/serverless":"*","@types/better-sqlite3":"*","@aws-sdk/client-rds-data":">=3","@neondatabase/serverless":">=0.10.0","@cloudflare/workers-types":">=4","@op-engineering/op-sqlite":">=2"};
    }

    let response = `# ${packageInfo.name} v${packageInfo.version}

${packageInfo.description}

**Repository:** ${packageInfo.repository}
**License:** ${packageInfo.license}
**Keywords:** ${packageInfo.keywords.join(', ')}`;

    if (includeMetadata) {
      const completeness = {"overall":30,"readme":80,"typeDefinitions":40,"examples":0,"apiReference":0};
      response += `

## Analysis Metadata
- **Overall Completeness:** ${completeness.overall}%
- **README Quality:** ${completeness.readme}%
- **Type Definitions:** ${completeness.typeDefinitions}%
- **Examples Available:** ${completeness.examples}%
- **API Reference:** ${completeness.apiReference}%`;
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
  private async getUsageExamples(args: any) {
    
    const { category, language, limit = 10 } = args;
    
    let examples = [];
    
    // Collect examples from README
    const readmeExamples = [{"title":"Basic Usage","description":"Basic usage of drizzle-orm","code":"import drizzleorm from 'drizzle-orm';\n\n// Basic usage\nconst result = drizzleorm();","language":"javascript","imports":["drizzle-orm"],"category":"basic"}];
    examples.push(...readmeExamples);
    
    // Collect examples from repository
    const repoExamples = [];
    examples.push(...repoExamples);

    // Apply filters
    if (category) {
      examples = examples.filter(ex => ex.category === category);
    }
    
    if (language) {
      examples = examples.filter(ex => ex.language === language);
    }
    
    // Limit results
    examples = examples.slice(0, limit);

    if (examples.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No examples found matching the specified criteria."
          }
        ]
      };
    }

    const response = examples.map(ex => `## ${ex.title}

${ex.description}

\`\`\`${ex.language}
${ex.code}
\`\`\`
`).join('\n\n');

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
  private async getApiReference(args: any) {
    
    const { type = 'all', search, includeExamples = true } = args;
    
    const apiRef = {"functions":[],"classes":[],"interfaces":[],"types":[],"constants":[]};
    let sections = [];

    if (type === 'all' || type === 'functions') {
      if (apiRef.functions.length > 0) {
        let functions = apiRef.functions;
        if (search) {
          functions = functions.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        if (functions.length > 0) {
          sections.push('# Functions\n\n' + functions.map(f => 
            `## ${f.name}\n\n${f.description}\n\n**Signature:** \`${f.signature}\`\n\n**Parameters:**\n${f.parameters.map(p => `- \`${p.name}\` (${p.type}): ${p.description}`).join('\n')}`
          ).join('\n\n'));
        }
      }
    }

    if (type === 'all' || type === 'classes') {
      if (apiRef.classes.length > 0) {
        let classes = apiRef.classes;
        if (search) {
          classes = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        if (classes.length > 0) {
          sections.push('# Classes\n\n' + classes.map(c => 
            `## ${c.name}\n\n${c.description}\n\n**Methods:**\n${c.methods.map(m => `- \`${m.signature}\``).join('\n')}`
          ).join('\n\n'));
        }
      }
    }

    if (type === 'all' || type === 'interfaces') {
      if (apiRef.interfaces.length > 0) {
        let interfaces = apiRef.interfaces;
        if (search) {
          interfaces = interfaces.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        if (interfaces.length > 0) {
          sections.push('# Interfaces\n\n' + interfaces.map(i => 
            `## ${i.name}\n\n${i.description}\n\n**Properties:**\n${i.properties.map(p => `- \`${p.name}\` (${p.type}): ${p.description}`).join('\n')}`
          ).join('\n\n'));
        }
      }
    }

    if (sections.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No API reference information found matching the specified criteria."
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: sections.join('\n\n---\n\n')
        }
      ]
    };
  }
  private async searchPackageDocs(args: any) {
    
    const { query, type = 'all', limit = 5 } = args;
    const searchTerm = query.toLowerCase();
    let results = [];

    if (type === 'all' || type === 'readme') {
      // Search README sections
      const sections = [{"title":"What's Drizzle?","level":3,"content":"What's Drizzle?\nDrizzle is a modern TypeScript ORM developers [wanna use in their next project](https://stateofdb.com/tools/drizzle). \nIt is [lightweight](https://bundlephobia.com/package/drizzle-orm) at only ~7.4kb minified+gzipped, and it's tree shakeable with exactly 0 dependencies.\n**Drizzle supports every PostgreSQL, MySQL and SQLite database**, including serverless ones like [Turso](https://orm.drizzle.team/docs/get-started-sqlite#turso), [Neon](https://orm.drizzle.team/docs/get-started-postgresql#neon), [Xata](xata.io), [PlanetScale](https://orm.drizzle.team/docs/get-started-mysql#planetscale), [Cloudflare D1](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1), [FlyIO LiteFS](https://fly.io/docs/litefs/), [Vercel Postgres](https://orm.drizzle.team/docs/get-started-postgresql#vercel-postgres), [Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase) and [AWS Data API](https://orm.drizzle.team/docs/get-started-postgresql#aws-data-api). No bells and whistles, no Rust binaries, no serverless adapters, everything just works out of the box.\n**Drizzle is serverless-ready by design**. It works in every major JavaScript runtime like NodeJS, Bun, Deno, Cloudflare Workers, Supabase functions, any Edge runtime, and even in browsers.  \nWith Drizzle you can be [**fast out of the box**](https://orm.drizzle.team/benchmarks) and save time and costs while never introducing any data proxies into your infrastructure.\nWhile you can use Drizzle as a JavaScript library, it shines with TypeScript. It lets you [**declare SQL schemas**](https://orm.drizzle.team/docs/sql-schema-declaration) and build both [**relational**](https://orm.drizzle.team/docs/rqb) and [**SQL-like queries**](https://orm.drizzle.team/docs/select), while keeping the balance between type-safety and extensibility for toolmakers to build on top.\n","subsections":[]},{"title":"Ecosystem","level":3,"content":"Ecosystem\nWhile Drizzle ORM remains a thin typed layer on top of SQL, we made a set of tools for people to have best possible developer experience.\nDrizzle comes with a powerful [**Drizzle Kit**](https://orm.drizzle.team/kit-docs/overview) CLI companion for you to have hassle-free migrations. It can generate SQL migration files for you or apply schema changes directly to the database.\nWe also have [**Drizzle Studio**](https://orm.drizzle.team/drizzle-studio/overview) for you to effortlessly browse and manipulate data in your database of choice.\n","subsections":[]},{"title":"Documentation","level":3,"content":"Documentation\nCheck out the full documentation on [the website](https://orm.drizzle.team/docs/overview).\n","subsections":[]},{"title":"Our sponsors ❤️","level":3,"content":"Our sponsors ❤️\n","subsections":[]}];
      for (const section of sections) {
        if (section.title.toLowerCase().includes(searchTerm) || 
            section.content.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'README Section',
            title: section.title,
            content: section.content.substring(0, 200) + '...',
            relevance: this.calculateRelevance(section.title + ' ' + section.content, searchTerm)
          });
        }
      }
    }

    if (type === 'all' || type === 'examples') {
      // Search usage examples
      const examples = [{"title":"Basic Usage","description":"Basic usage of drizzle-orm","code":"import drizzleorm from 'drizzle-orm';\n\n// Basic usage\nconst result = drizzleorm();","language":"javascript","imports":["drizzle-orm"],"category":"basic"}];
      for (const example of examples) {
        if (example.title.toLowerCase().includes(searchTerm) || 
            example.code.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'Usage Example',
            title: example.title,
            content: example.code.substring(0, 200) + '...',
            relevance: this.calculateRelevance(example.title + ' ' + example.code, searchTerm)
          });
        }
      }
    }

    if (type === 'all' || type === 'types') {
      // Search API reference
      const apiRef = {"functions":[],"classes":[],"interfaces":[],"types":[],"constants":[]};
      [...apiRef.functions, ...apiRef.classes].forEach(item => {
        if (item.name.toLowerCase().includes(searchTerm) || 
            item.description.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'API Reference',
            title: item.name,
            content: item.description,
            relevance: this.calculateRelevance(item.name + ' ' + item.description, searchTerm)
          });
        }
      });
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevance - a.relevance);
    results = results.slice(0, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No documentation found matching "${query}"`
          }
        ]
      };
    }

    const response = `# Search Results for "${query}"\n\n` + 
      results.map(r => `## ${r.title} (${r.type})\n\n${r.content}`).join('\n\n');

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };

    function calculateRelevance(text, term) {
      const lowerText = text.toLowerCase();
      const lowerTerm = term.toLowerCase();
      let score = 0;
      
      // Exact match in title gets highest score
      if (lowerText.startsWith(lowerTerm)) score += 10;
      
      // Count occurrences
      const matches = (lowerText.match(new RegExp(lowerTerm, 'g')) || []).length;
      score += matches * 2;
      
      return score;
    }
  }
  private async getConfigurationGuide(args: any) {
    
    const { format = 'markdown', includeExamples = true } = args;
    
    const configOptions = [{"name":"options","type":"object","description":"Configuration options (refer to documentation)","required":false,"examples":["{}"]}];
    const installInstructions = [{"command":"npm install drizzle-orm","description":"Install via npm","packageManager":"npm"},{"command":"yarn add drizzle-orm","description":"Install via yarn","packageManager":"yarn"}];
    
    let response = '';

    if (format === 'markdown') {
      response = `# Configuration Guide for drizzle-orm\n\n`;
      
      if (installInstructions.length > 0) {
        response += `## Installation\n\n`;
        response += installInstructions.map(inst => `\`\`\`bash\n${inst.command}\n\`\`\``).join('\n\n');
        response += '\n\n';
      }
      
      if (configOptions.length > 0) {
        response += `## Configuration Options\n\n`;
        response += configOptions.map(opt => 
          `### ${opt.name}\n\n${opt.description}\n\n- **Type:** ${opt.type}\n- **Required:** ${opt.required ? 'Yes' : 'No'}`
        ).join('\n\n');
      } else {
        response += `## Configuration\n\nNo specific configuration options documented. Check the package documentation for setup instructions.`;
      }
    } else if (format === 'json') {
      response = JSON.stringify({
        installation: installInstructions,
        configuration: configOptions
      }, null, 2);
    } else if (format === 'typescript') {
      response = `// Configuration interface for drizzle-orm\n\n`;
      if (configOptions.length > 0) {
        response += `interface drizzleormConfig {\n`;
        response += configOptions.map(opt => 
          `  ${opt.name}${opt.required ? '' : '?'}: ${opt.type}; // ${opt.description}`
        ).join('\n');
        response += '\n}';
      }
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(`drizzle-orm MCP server running on stdio`);
    console.error(`Available tools: ${["get_package_info","get_usage_examples","get_api_reference","search_package_docs","get_configuration_guide"]}`);
    console.error(`Package version: 0.44.4`);
    console.error(`Generated: 2025-08-11T12:00:34.395Z`);
  }
}

// Start the server
const server = new DrizzleOrmMCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});