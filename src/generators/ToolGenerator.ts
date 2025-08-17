/**
 * Tool generator for creating MCP tools from package analysis
 */

import { PackageAnalysis } from '../types/PackageInfo.js';
import { MCPTool, JSONSchema, PackageInfoToolArgs, UsageExamplesToolArgs, APIReferenceToolArgs, SearchDocsToolArgs, ConfigurationGuideToolArgs } from '../types/MCPTypes.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export class ToolGenerator {
  /**
   * Generate MCP tools based on package analysis
   */
  async generateTools(analysis: PackageAnalysis): Promise<AnalysisResult<MCPTool[]>> {
    const startTime = Date.now();

    try {
      const tools: MCPTool[] = [];
      const warnings: string[] = [];

      // Always generate basic package info tool
      tools.push(this.generatePackageInfoTool(analysis));

      // Generate usage examples tool if we have examples
      if (analysis.readme.usageExamples.length > 0 || analysis.examples.length > 0) {
        tools.push(this.generateUsageExamplesTool(analysis));
      } else {
        warnings.push('No usage examples found - skipping usage examples tool');
      }

      // Generate API reference tool if we have type definitions
      if (analysis.typeDefinitions.hasDefinitions || analysis.apiReference.functions.length > 0) {
        tools.push(this.generateAPIReferenceTool(analysis));
      } else {
        warnings.push('No API definitions found - skipping API reference tool');
      }

      // Generate search docs tool if we have substantial documentation
      if (analysis.readme.sections.length > 0 || analysis.typeDefinitions.hasDefinitions) {
        tools.push(this.generateSearchDocsTool(analysis));
      } else {
        warnings.push('Insufficient documentation for search tool');
      }

      // Generate configuration guide tool if we have configuration info
      if (analysis.readme.configurationOptions.length > 0 || this.hasConfigurationExamples(analysis)) {
        tools.push(this.generateConfigurationGuideTool(analysis));
      } else {
        warnings.push('No configuration information found - skipping configuration tool');
      }

      // Generate vector search tools if we have embeddings
      if (analysis.comprehensiveDocumentation?.embeddedChunks && 
          analysis.comprehensiveDocumentation.embeddedChunks.length > 0) {
        tools.push(this.generateSemanticSearchTool(analysis));
        console.log(`🔮 Added semantic search tool with ${analysis.comprehensiveDocumentation.embeddedChunks.length} embedded chunks`);
      }

      if (tools.length === 1) {
        warnings.push('Only basic package info tool generated - limited package documentation');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: tools,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'tool-generator'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'GENERATION_ERROR',
          message: `Failed to generate MCP tools: ${error}`,
          recoverable: false,
          suggestions: ['Check package analysis data', 'Verify tool generation logic']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'tool-generator'
        }
      };
    }
  }

  private generatePackageInfoTool(analysis: PackageAnalysis): MCPTool {
    return {
      name: 'get_package_info',
      description: `Get comprehensive information about the ${analysis.packageInfo.name} package`,
      inputSchema: {
        type: 'object',
        properties: {
          includeMetadata: {
            type: 'boolean',
            description: 'Include analysis metadata and completeness scores',
            default: false
          },
          includeDependencies: {
            type: 'boolean', 
            description: 'Include package dependencies information',
            default: false
          }
        },
        additionalProperties: false
      }
    };
  }

  private generateUsageExamplesTool(analysis: PackageAnalysis): MCPTool {
    const categories = this.getAvailableCategories(analysis);
    const languages = this.getAvailableLanguages(analysis);

    return {
      name: 'get_usage_examples',
      description: `Get usage examples and code samples for ${analysis.packageInfo.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter examples by category',
            enum: categories.length > 0 ? categories : ['basic', 'advanced', 'configuration', 'integration'],
            examples: categories
          },
          language: {
            type: 'string',
            description: 'Filter examples by programming language',
            enum: languages.length > 0 ? languages : ['javascript', 'typescript'],
            examples: languages
          },
          limit: {
            type: 'number',
            description: 'Maximum number of examples to return',
            default: 10,
            examples: [5, 10, 20]
          }
        },
        additionalProperties: false
      }
    };
  }

  private generateAPIReferenceTool(analysis: PackageAnalysis): MCPTool {
    const availableTypes = this.getAvailableAPITypes(analysis);

    return {
      name: 'get_api_reference',
      description: `Get API reference documentation for ${analysis.packageInfo.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Type of API elements to retrieve',
            enum: availableTypes.length > 0 ? availableTypes : ['functions', 'classes', 'interfaces', 'types', 'all'],
            default: 'all',
            examples: availableTypes
          },
          search: {
            type: 'string',
            description: 'Search for specific API elements by name',
            examples: ['create', 'get', 'set', 'config']
          },
          includeExamples: {
            type: 'boolean',
            description: 'Include usage examples for API elements',
            default: true
          }
        },
        additionalProperties: false
      }
    };
  }

  private generateSearchDocsTool(analysis: PackageAnalysis): MCPTool {
    const hasVectorSearch = analysis.comprehensiveDocumentation?.embeddedChunks && 
                           analysis.comprehensiveDocumentation.embeddedChunks.length > 0;
    
    return {
      name: 'search_package_docs',
      description: `Search through ${analysis.packageInfo.name} documentation and examples${hasVectorSearch ? ' using advanced semantic search with vector embeddings' : ''}`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for documentation content',
            examples: ['installation', 'configuration', 'error handling', 'async']
          },
          type: {
            type: 'string',
            description: 'Type of documentation to search',
            enum: ['readme', 'examples', 'types', 'all'],
            default: 'all'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5,
            examples: [3, 5, 10]
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    };
  }

  private generateConfigurationGuideTool(analysis: PackageAnalysis): MCPTool {
    return {
      name: 'get_configuration_guide',
      description: `Get configuration options and setup guide for ${analysis.packageInfo.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Format for configuration information',
            enum: ['markdown', 'json', 'typescript'],
            default: 'markdown'
          },
          includeExamples: {
            type: 'boolean',
            description: 'Include configuration examples',
            default: true
          }
        },
        additionalProperties: false
      }
    };
  }

  private getAvailableCategories(analysis: PackageAnalysis): string[] {
    const categories = new Set<string>();
    
    // From README examples
    for (const example of analysis.readme.usageExamples) {
      categories.add(example.category);
    }
    
    // From repository examples
    for (const example of analysis.examples) {
      categories.add(example.category);
    }

    return Array.from(categories).sort();
  }

  private getAvailableLanguages(analysis: PackageAnalysis): string[] {
    const languages = new Set<string>();
    
    // From README code blocks
    for (const block of analysis.readme.codeBlocks) {
      if (block.isExample) {
        languages.add(block.language);
      }
    }
    
    // From README examples
    for (const example of analysis.readme.usageExamples) {
      languages.add(example.language);
    }
    
    // From repository examples
    for (const example of analysis.examples) {
      languages.add(example.language);
    }

    return Array.from(languages).sort();
  }

  private getAvailableAPITypes(analysis: PackageAnalysis): string[] {
    const types: string[] = [];
    
    if (analysis.apiReference.functions.length > 0) types.push('functions');
    if (analysis.apiReference.classes.length > 0) types.push('classes');
    if (analysis.apiReference.interfaces.length > 0) types.push('interfaces');
    if (analysis.apiReference.types.length > 0) types.push('types');
    if (analysis.apiReference.constants.length > 0) types.push('constants');
    
    if (types.length > 0) types.push('all');
    
    return types;
  }

  private hasConfigurationExamples(analysis: PackageAnalysis): boolean {
    // Check if any examples contain configuration patterns
    for (const example of analysis.readme.usageExamples) {
      if (example.category === 'configuration' || 
          example.code.includes('config') || 
          example.code.includes('options')) {
        return true;
      }
    }

    for (const example of analysis.examples) {
      if (example.category === 'demo' && 
          (example.content.includes('config') || example.content.includes('options'))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate tool implementation code for a specific tool
   */
  generateToolImplementation(tool: MCPTool, analysis: PackageAnalysis): string {
    switch (tool.name) {
      case 'get_package_info':
        return this.generatePackageInfoImplementation(analysis);
      case 'get_usage_examples':
        return this.generateUsageExamplesImplementation(analysis);
      case 'get_api_reference':
        return this.generateAPIReferenceImplementation(analysis);
      case 'search_package_docs':
        return this.generateSearchDocsImplementation(analysis);
      case 'get_configuration_guide':
        return this.generateConfigurationGuideImplementation(analysis);
      case 'semantic_search':
        return this.generateSemanticSearchImplementation(analysis);
      default:
        return `
    // Implementation for ${tool.name}
    return {
      content: [
        {
          type: "text",
          text: "Tool implementation not yet generated"
        }
      ]
    };`;
    }
  }

  private generatePackageInfoImplementation(analysis: PackageAnalysis): string {
    return `
    const { includeMetadata = false, includeDependencies = false } = args;
    
    const packageInfo: any = {
      name: "${analysis.packageInfo.name}",
      version: "${analysis.packageInfo.version}",
      description: "${analysis.packageInfo.description}",
      homepage: "${analysis.packageInfo.homepage || ''}",
      repository: "${analysis.packageInfo.repository?.url || ''}",
      keywords: ${JSON.stringify(analysis.packageInfo.keywords || [])},
      license: "${analysis.packageInfo.license || 'Unknown'}"
    };

    if (includeDependencies) {
      packageInfo.dependencies = ${JSON.stringify(analysis.packageInfo.dependencies || {})};
      packageInfo.peerDependencies = ${JSON.stringify(analysis.packageInfo.peerDependencies || {})};
    }

    let response = \`# \$\{packageInfo.name\} v\$\{packageInfo.version\}

\$\{packageInfo.description\}

**Repository:** \$\{packageInfo.repository\}
**License:** \$\{packageInfo.license\}
**Keywords:** \$\{packageInfo.keywords.join(', ')\}\`;

    if (includeMetadata) {
      const completeness = ${JSON.stringify(analysis.metadata.completeness)};
      response += \`

## Analysis Metadata
- **Overall Completeness:** \$\{completeness.overall\}%
- **README Quality:** \$\{completeness.readme\}%
- **Type Definitions:** \$\{completeness.typeDefinitions\}%
- **Examples Available:** \$\{completeness.examples\}%
- **API Reference:** \$\{completeness.apiReference\}%\`;
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };`;
  }

  private generateUsageExamplesImplementation(analysis: PackageAnalysis): string {
    return `
    const { category, language, limit = 10 } = args;
    
    let examples: any[] = [];
    
    // Collect examples from README
    const readmeExamples = ${JSON.stringify(analysis.readme.usageExamples)};
    examples.push(...readmeExamples);
    
    // Collect examples from repository
    const repoExamples: any[] = ${JSON.stringify(analysis.examples.map(ex => ({
      title: ex.filePath,
      description: `Example from ${ex.filePath}`,
      code: ex.content,
      language: ex.language,
      category: ex.category
    })))};
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

    const response = examples.map(ex => \`## \$\{ex.title\}

\$\{ex.description\}

\\\`\\\`\\\`\$\{ex.language\}
\$\{ex.code\}
\\\`\\\`\\\`
\`).join('\\n\\n');

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };`;
  }

  private generateAPIReferenceImplementation(analysis: PackageAnalysis): string {
    return `
    const { type = 'all', search } = args;
    const apiRef = ${JSON.stringify(analysis.apiReference)};
    const sections: string[] = [];

    const matches = (s: string) => !search || String(s || '').toLowerCase().includes(String(search).toLowerCase());

    if (type === 'all' || type === 'functions') {
      const functions = (apiRef.functions || []);
      if (functions.length > 0) {
        const blocks = functions
          .filter((f: any) => matches(f.name))
          .map((f: any) => {
            const params = Array.isArray(f.parameters)
              ? f.parameters.map((p: any) => '- ' + p.name + ' (' + p.type + '): ' + String(p.description || '')).join('\\n')
              : '';
            return [
              '## ' + f.name,
              '',
              String(f.description || ''),
              '',
              'Signature: ' + String(f.signature || ''),
              '',
              'Parameters:',
              params
            ].join('\\n');
          });
        if (blocks.length) sections.push('# Functions\\n\\n' + blocks.join('\\n\\n'));
      }
    }

    if (type === 'all' || type === 'classes') {
      const classes = (apiRef.classes || []);
      if (classes.length > 0) {
        const blocks = classes
          .filter((c: any) => matches(c.name))
          .map((c: any) => {
            const methods = Array.isArray(c.methods)
              ? c.methods.map((m: any) => '- ' + String(m.signature || '')).join('\\n')
              : '';
            return [
              '## ' + c.name,
              '',
              String(c.description || ''),
              '',
              'Methods:',
              methods
            ].join('\\n');
          });
        if (blocks.length) sections.push('# Classes\\n\\n' + blocks.join('\\n\\n'));
      }
    }

    if (type === 'all' || type === 'interfaces') {
      const interfaces = (apiRef.interfaces || []);
      if (interfaces.length > 0) {
        const blocks = interfaces
          .filter((i: any) => matches(i.name))
          .map((i: any) => {
            const props = Array.isArray(i.properties)
              ? i.properties.map((p: any) => '- ' + p.name + ' (' + p.type + '): ' + String(p.description || '')).join('\\n')
              : '';
            return [
              '## ' + i.name,
              '',
              String(i.description || ''),
              '',
              'Properties:',
              props
            ].join('\\n');
          });
        if (blocks.length) sections.push('# Interfaces\\n\\n' + blocks.join('\\n\\n'));
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
          text: sections.join('\\n\\n---\\n\\n')
        }
      ]
    };
    `;
  }

  private generateSearchDocsImplementation(analysis: PackageAnalysis): string {
    return `
    const { query, type = 'all', limit = 5 } = args;
    const searchTerm = query.toLowerCase();
    let results: any[] = [];

    // Prefer hybrid vector search if available
    if (this.vectorSearch && typeof performHybridSearch === 'function') {
      try {
        const hybrid = performHybridSearch(this.vectorSearch, query, type === 'all' ? 'all' : type, limit, 0.1);
        if (hybrid && hybrid.length > 0) {
          let response = \`# Search Results for "\${query}"\n\nFound \${hybrid.length} relevant result(s):\n\n\`;
          hybrid.forEach((result, index) => {
            const chunk = result.chunk;
            response += \`## \${index + 1}. \${chunk.metadata.title}\n\`;
            response += \`**Type:** \${chunk.metadata.type} | **Relevance:** \${(result.relevanceScore * 100).toFixed(1)}%\n\n\`;
            let content = chunk.markdown;
            if (content.length > 500) content = content.substring(0, 500) + '...';
            response += \`\${content}\n\n---\n\n\`;
          });
          response += \`\n*Powered by vector embeddings with \${this.vectorSearch.getStats().totalChunks} indexed chunks*\`;
          return { content: [{ type: "text", text: response }] };
        }
      } catch {}
    }

    if (type === 'all' || type === 'readme') {
      // Search README sections
      const sections = ${JSON.stringify(analysis.readme.sections)};
      for (const section of sections) {
        if (section.title.toLowerCase().includes(searchTerm) || 
            section.content.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'README Section',
            title: section.title,
            content: section.content.substring(0, 200) + '...',
            relevance: calculateRelevance(section.title + ' ' + section.content, searchTerm)
          });
        }
      }
    }

    if (type === 'all' || type === 'examples') {
      // Search usage examples
      const examples = ${JSON.stringify(analysis.readme.usageExamples)} as any[];
      for (const example of examples) {
        if (example.title.toLowerCase().includes(searchTerm) || 
            example.code.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'Usage Example',
            title: example.title,
            content: example.code.substring(0, 200) + '...',
            relevance: calculateRelevance(example.title + ' ' + example.code, searchTerm)
          });
        }
      }
    }

    if (type === 'all' || type === 'types') {
      // Search API reference
      const apiRef: any = ${JSON.stringify(analysis.apiReference)};
      [...apiRef.functions, ...apiRef.classes].forEach((item: any) => {
        if (item.name.toLowerCase().includes(searchTerm) || 
            item.description.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'API Reference',
            title: item.name,
            content: item.description,
            relevance: calculateRelevance(item.name + ' ' + item.description, searchTerm)
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
            text: \`No documentation found matching "\$\{query\}"\`
          }
        ]
      };
    }

    const response = \`# Search Results for "\$\{query\}"\\n\\n\` + 
      results.map(r => \`## \$\{r.title\} (\$\{r.type\})\\n\\n\$\{r.content\}\`).join('\\n\\n');

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };

    function calculateRelevance(text: string, term: string) {
      const lowerText = text.toLowerCase();
      const lowerTerm = term.toLowerCase();
      let score = 0;
      
      // Exact match in title gets highest score
      if (lowerText.startsWith(lowerTerm)) score += 10;
      
      // Count occurrences
      const matches = (lowerText.match(new RegExp(lowerTerm, 'g')) || []).length;
      score += matches * 2;
      
      return score;
    }`;
  }

  private generateConfigurationGuideImplementation(analysis: PackageAnalysis): string {
    return `
    const { format = 'markdown', includeExamples = true } = args;
    
    const configOptions = ${JSON.stringify(analysis.readme.configurationOptions)};
    const installInstructions = ${JSON.stringify(analysis.readme.installationInstructions)};
    
    let response = '';

    if (format === 'markdown') {
      response = \`# Configuration Guide for ${analysis.packageInfo.name}\\n\\n\`;
      
      if (installInstructions.length > 0) {
        response += \`## Installation\\n\\n\`;
        response += installInstructions.map(inst => \`\\\`\\\`\\\`bash\\n\$\{inst.command\}\\n\\\`\\\`\\\`\`).join('\\n\\n');
        response += '\\n\\n';
      }
      
      if (configOptions.length > 0) {
        response += \`## Configuration Options\\n\\n\`;
        response += configOptions.map(opt => 
          \`### \$\{opt.name\}\\n\\n\$\{opt.description\}\\n\\n- **Type:** \$\{opt.type\}\\n- **Required:** \$\{opt.required ? 'Yes' : 'No'\}\`
        ).join('\\n\\n');
      } else {
        response += \`## Configuration\\n\\nNo specific configuration options documented. Check the package documentation for setup instructions.\`;
      }
    } else if (format === 'json') {
      response = JSON.stringify({
        installation: installInstructions,
        configuration: configOptions
      }, null, 2);
    } else if (format === 'typescript') {
      response = \`// Configuration interface for ${analysis.packageInfo.name}\\n\\n\`;
      if (configOptions.length > 0) {
        response += \`interface ${analysis.packageInfo.name.replace(/[^a-zA-Z0-9]/g, '')}Config {\\n\`;
        response += configOptions.map(opt => 
          \`  \$\{opt.name\}\$\{opt.required ? '' : '?'\}: \$\{opt.type\}; // \$\{opt.description\}\`
        ).join('\\n');
        response += '\\n}';
      }
    }

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };`;
  }

  private generateSemanticSearchTool(analysis: PackageAnalysis): MCPTool {
    return {
      name: 'semantic_search',
      description: `Perform semantic search through ${analysis.packageInfo.name} documentation using vector embeddings. Find relevant functions, examples, and guides based on natural language queries.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query (e.g., "how to filter arrays", "authentication setup", "error handling")'
          },
          type: {
            type: 'string',
            enum: ['function', 'example', 'guide', 'all'],
            description: 'Filter results by content type',
            default: 'all'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (1-20)',
            default: 5
          },
          minSimilarity: {
            type: 'number',
            description: 'Minimum similarity score (0.0-1.0)',
            default: 0.1
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    };
  }

  private generateSemanticSearchImplementation(analysis: PackageAnalysis): string {
    return `
    const { query, type = 'all', limit = 5, minSimilarity = 0.1 } = args;
    
    if (!this.vectorSearch) {
      return {
        content: [
          {
            type: "text",
            text: "Vector search is not available for this package. This tool requires comprehensive documentation with embeddings."
          }
        ]
      };
    }
    
    try {
      // Use hybrid text + vector search to approximate semantic matching without runtime embedding generation
      const results = performHybridSearch(this.vectorSearch, query, type, limit, minSimilarity);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: \`No results found for "\${query}". Try a different search term or lower the similarity threshold.\`
            }
          ]
        };
      }
      
      let response = \`# Search Results for "\${query}"\n\nFound \${results.length} relevant result(s):\n\n\`;
      
      results.forEach((result, index) => {
        const chunk = result.chunk;
        response += \`## \${index + 1}. \${chunk.metadata.title}\n\`;
        response += \`**Type:** \${chunk.metadata.type} | **Relevance:** \${(result.relevanceScore * 100).toFixed(1)}%\n\n\`;
        
        if (chunk.metadata.functionName) {
          response += \`**Function:** \${chunk.metadata.functionName}\`;
          if (chunk.metadata.parameters && chunk.metadata.parameters.length > 0) {
            response += \`(\${chunk.metadata.parameters.join(', ')})\`;
          }
          response += \`\n\n\`;
        }
        
        // Truncate content if too long
        let content = chunk.markdown;
        if (content.length > 500) {
          content = content.substring(0, 500) + '...';
        }
        
        response += \`\${content}\n\n---\n\n\`;
      });
      
      response += \`\n*Powered by vector embeddings with \${this.vectorSearch.getStats().totalChunks} indexed chunks*\`;
      
      return {
        content: [
          {
            type: "text",
            text: response
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: \`Search failed: \${error instanceof Error ? error.message : String(error)}\`
          }
        ]
      };
    }`;
  }


}