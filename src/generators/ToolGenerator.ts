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
    return {
      name: 'search_package_docs',
      description: `Search through ${analysis.packageInfo.name} documentation and examples`,
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
    
    const packageInfo = {
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
    
    let examples = [];
    
    // Collect examples from README
    const readmeExamples = ${JSON.stringify(analysis.readme.usageExamples)};
    examples.push(...readmeExamples);
    
    // Collect examples from repository
    const repoExamples = ${JSON.stringify(analysis.examples.map(ex => ({
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
    const { type = 'all', search, includeExamples = true } = args;
    
    const apiRef = ${JSON.stringify(analysis.apiReference)};
    let sections = [];

    if (type === 'all' || type === 'functions') {
      if (apiRef.functions.length > 0) {
        let functions = apiRef.functions;
        if (search) {
          functions = functions.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        if (functions.length > 0) {
          sections.push('# Functions\\n\\n' + functions.map(f => 
            \`## \$\{f.name\}\\n\\n\$\{f.description\}\\n\\n**Signature:** \\\`\$\{f.signature\}\\\`\\n\\n**Parameters:**\\n\$\{f.parameters.map(p => \`- \\\`\$\{p.name\}\\\` (\$\{p.type\}): \$\{p.description\}\`).join('\\n')\}\`
          ).join('\\n\\n'));
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
          sections.push('# Classes\\n\\n' + classes.map(c => 
            \`## \$\{c.name\}\\n\\n\$\{c.description\}\\n\\n**Methods:**\\n\$\{c.methods.map(m => \`- \\\`\$\{m.signature\}\\\`\`).join('\\n')\}\`
          ).join('\\n\\n'));
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
          sections.push('# Interfaces\\n\\n' + interfaces.map(i => 
            \`## \$\{i.name\}\\n\\n\$\{i.description\}\\n\\n**Properties:**\\n\$\{i.properties.map(p => \`- \\\`\$\{p.name\}\\\` (\$\{p.type\}): \$\{p.description\}\`).join('\\n')\}\`
          ).join('\\n\\n'));
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
          text: sections.join('\\n\\n---\\n\\n')
        }
      ]
    };`;
  }

  private generateSearchDocsImplementation(analysis: PackageAnalysis): string {
    return `
    const { query, type = 'all', limit = 5 } = args;
    const searchTerm = query.toLowerCase();
    let results = [];

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
      const examples = ${JSON.stringify(analysis.readme.usageExamples)};
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
      const apiRef = ${JSON.stringify(analysis.apiReference)};
      [...apiRef.functions, ...apiRef.classes].forEach(item => {
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
}