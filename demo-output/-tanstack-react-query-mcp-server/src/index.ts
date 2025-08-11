#!/usr/bin/env node

/**
 * MCP Server for @tanstack/react-query
 * Generated automatically from package analysis
 * 
 * Package: @tanstack/react-query@5.0.0
 * Description: Hooks for managing, caching and syncing asynchronous and remote data in React
 * Generated: 2025-08-11T09:10:27.690Z
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class TanstackReactQueryMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '-tanstack-react-query-mcp-server',
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
                "description": "Get comprehensive information about the @tanstack/react-query package",
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
                "description": "Get usage examples and code samples for @tanstack/react-query",
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
                "description": "Get API reference documentation for @tanstack/react-query",
                "inputSchema": {
                        "type": "object",
                        "properties": {
                                "type": {
                                        "type": "string",
                                        "description": "Type of API elements to retrieve",
                                        "enum": [
                                                "constants",
                                                "all"
                                        ],
                                        "default": "all",
                                        "examples": [
                                                "constants",
                                                "all"
                                        ]
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
                "description": "Search through @tanstack/react-query documentation and examples",
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
                "description": "Get configuration options and setup guide for @tanstack/react-query",
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
      name: "@tanstack/react-query",
      version: "5.0.0",
      description: "Hooks for managing, caching and syncing asynchronous and remote data in React",
      homepage: "https://tanstack.com/query",
      repository: "git+https://github.com/TanStack/query.git",
      keywords: [],
      license: "MIT"
    };

    if (includeDependencies) {
      packageInfo.dependencies = {"@tanstack/query-core":"5.0.0"};
      packageInfo.peerDependencies = {"react":"^18.0.0","react-dom":"^18.0.0","react-native":"*"};
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
    const readmeExamples = [{"title":"Basic Usage","description":"Basic usage of @tanstack/react-query","code":"import tanstackreactquery from '@tanstack/react-query';\n\n// Basic usage\nconst result = tanstackreactquery();","language":"javascript","imports":["@tanstack/react-query"],"category":"basic"}];
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
    
    const apiRef = {"functions":[],"classes":[],"interfaces":[],"types":[],"constants":[{"name":"DefinedUseInfiniteQueryResult, DefinedUseQueryResult, UseBaseMutationResult, UseBaseQueryOptions, UseBaseQueryResult, UseInfiniteQueryOptions, UseInfiniteQueryResult, UseMutateAsyncFunction, UseMutateFunction, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult, UseSuspenseInfiniteQueryOptions, UseSuspenseInfiniteQueryResult, UseSuspenseQueryOptions, UseSuspenseQueryResult ","type":"unknown","value":"unknown","description":""},{"name":"QueriesOptions, QueriesResults, useQueries ","type":"unknown","value":"unknown","description":""},{"name":"useQuery ","type":"unknown","value":"unknown","description":""},{"name":"useSuspenseQuery ","type":"unknown","value":"unknown","description":""},{"name":"useSuspenseInfiniteQuery ","type":"unknown","value":"unknown","description":""},{"name":"SuspenseQueriesOptions, SuspenseQueriesResults, useSuspenseQueries ","type":"unknown","value":"unknown","description":""},{"name":"DefinedInitialDataOptions, UndefinedInitialDataOptions, queryOptions ","type":"unknown","value":"unknown","description":""},{"name":"DefinedInitialDataInfiniteOptions, UndefinedInitialDataInfiniteOptions, infiniteQueryOptions ","type":"unknown","value":"unknown","description":""},{"name":"QueryClientContext, QueryClientProvider, QueryClientProviderProps, useQueryClient ","type":"unknown","value":"unknown","description":""},{"name":"QueryErrorResetBoundary, QueryErrorResetBoundaryProps, useQueryErrorResetBoundary ","type":"unknown","value":"unknown","description":""},{"name":"HydrationBoundary, HydrationBoundaryProps ","type":"unknown","value":"unknown","description":""},{"name":"useIsFetching ","type":"unknown","value":"unknown","description":""},{"name":"useIsMutating, useMutationState ","type":"unknown","value":"unknown","description":""},{"name":"useMutation ","type":"unknown","value":"unknown","description":""},{"name":"useInfiniteQuery ","type":"unknown","value":"unknown","description":""},{"name":"IsRestoringProvider, useIsRestoring ","type":"unknown","value":"unknown","description":""}]};
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
      const sections = [{"title":"Visit [tanstack.com/query](https://tanstack.com/query) for docs, guides, API and more!","level":2,"content":"Visit [tanstack.com/query](https://tanstack.com/query) for docs, guides, API and more!\nStill on **React Query v2**? No problem! Check out the v2 docs here: https://github.com/TanStack/query/tree/2.x/docs/src/pages/docs.<br />\nStill on **React Query v3**? No problem! Check out the v3 docs here: https://tanstack.com/query/v3/docs/.<br />\nStill on **React Query v4**? No problem! Check out the v4 docs here: https://tanstack.com/query/v4/docs/.\n","subsections":[]},{"title":"Quick Features","level":2,"content":"Quick Features\nTransport/protocol/backend agnostic data fetching (REST, GraphQL, promises, whatever!)\nAuto Caching + Refetching (stale-while-revalidate, Window Refocus, Polling/Realtime)\nParallel + Dependent Queries\nMutations + Reactive Query Refetching\nMulti-layer Cache + Automatic Garbage Collection\nPaginated + Cursor-based Queries\nLoad-More + Infinite Scroll Queries w/ Scroll Recovery\nRequest Cancellation\n[React Suspense](https://react.dev/reference/react/Suspense) + Fetch-As-You-Render Query Prefetching\nDedicated Devtools\n","subsections":[]},{"title":"Partners","level":2,"content":"Partners\n","subsections":[]},{"title":"Contributing","level":2,"content":"Contributing\nView the contributing guidelines [here](/CONTRIBUTING.md)\n","subsections":[{"title":"[Become a Sponsor!](https://github.com/sponsors/tannerlinsley/)","level":3,"content":"[Become a Sponsor!](https://github.com/sponsors/tannerlinsley/)\n","subsections":[]}]}];
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
      const examples = [{"title":"Basic Usage","description":"Basic usage of @tanstack/react-query","code":"import tanstackreactquery from '@tanstack/react-query';\n\n// Basic usage\nconst result = tanstackreactquery();","language":"javascript","imports":["@tanstack/react-query"],"category":"basic"}];
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
      const apiRef = {"functions":[],"classes":[],"interfaces":[],"types":[],"constants":[{"name":"DefinedUseInfiniteQueryResult, DefinedUseQueryResult, UseBaseMutationResult, UseBaseQueryOptions, UseBaseQueryResult, UseInfiniteQueryOptions, UseInfiniteQueryResult, UseMutateAsyncFunction, UseMutateFunction, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult, UseSuspenseInfiniteQueryOptions, UseSuspenseInfiniteQueryResult, UseSuspenseQueryOptions, UseSuspenseQueryResult ","type":"unknown","value":"unknown","description":""},{"name":"QueriesOptions, QueriesResults, useQueries ","type":"unknown","value":"unknown","description":""},{"name":"useQuery ","type":"unknown","value":"unknown","description":""},{"name":"useSuspenseQuery ","type":"unknown","value":"unknown","description":""},{"name":"useSuspenseInfiniteQuery ","type":"unknown","value":"unknown","description":""},{"name":"SuspenseQueriesOptions, SuspenseQueriesResults, useSuspenseQueries ","type":"unknown","value":"unknown","description":""},{"name":"DefinedInitialDataOptions, UndefinedInitialDataOptions, queryOptions ","type":"unknown","value":"unknown","description":""},{"name":"DefinedInitialDataInfiniteOptions, UndefinedInitialDataInfiniteOptions, infiniteQueryOptions ","type":"unknown","value":"unknown","description":""},{"name":"QueryClientContext, QueryClientProvider, QueryClientProviderProps, useQueryClient ","type":"unknown","value":"unknown","description":""},{"name":"QueryErrorResetBoundary, QueryErrorResetBoundaryProps, useQueryErrorResetBoundary ","type":"unknown","value":"unknown","description":""},{"name":"HydrationBoundary, HydrationBoundaryProps ","type":"unknown","value":"unknown","description":""},{"name":"useIsFetching ","type":"unknown","value":"unknown","description":""},{"name":"useIsMutating, useMutationState ","type":"unknown","value":"unknown","description":""},{"name":"useMutation ","type":"unknown","value":"unknown","description":""},{"name":"useInfiniteQuery ","type":"unknown","value":"unknown","description":""},{"name":"IsRestoringProvider, useIsRestoring ","type":"unknown","value":"unknown","description":""}]};
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
    const installInstructions = [{"command":"npm install @tanstack/react-query","description":"Install via npm","packageManager":"npm"},{"command":"yarn add @tanstack/react-query","description":"Install via yarn","packageManager":"yarn"}];
    
    let response = '';

    if (format === 'markdown') {
      response = `# Configuration Guide for @tanstack/react-query\n\n`;
      
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
      response = `// Configuration interface for @tanstack/react-query\n\n`;
      if (configOptions.length > 0) {
        response += `interface tanstackreactqueryConfig {\n`;
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
    
    console.error(`@tanstack/react-query MCP server running on stdio`);
    console.error(`Available tools: ${["get_package_info","get_usage_examples","get_api_reference","search_package_docs","get_configuration_guide"]}`);
    console.error(`Package version: 5.0.0`);
    console.error(`Generated: 2025-08-11T09:10:27.690Z`);
  }
}

// Start the server
const server = new TanstackReactQueryMCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});