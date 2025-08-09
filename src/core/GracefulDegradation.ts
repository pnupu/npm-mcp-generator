/**
 * Graceful degradation system for handling missing or incomplete data
 */

import { PackageAnalysis, ReadmeAnalysis, TypeDefinitionAnalysis, ExampleAnalysis } from '../types/PackageInfo.js';
import { MCPTool } from '../types/MCPTypes.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface DegradationStrategy {
  name: string;
  description: string;
  priority: number;
  canApply: (analysis: PackageAnalysis) => boolean;
  apply: (analysis: PackageAnalysis) => Promise<PackageAnalysis>;
}

export interface DegradationResult {
  applied: DegradationStrategy[];
  warnings: string[];
  fallbacksUsed: string[];
  completenessImprovement: number;
}

export class GracefulDegradation {
  private strategies: DegradationStrategy[] = [];

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Apply graceful degradation to improve incomplete analysis
   */
  async applyDegradation(analysis: PackageAnalysis): Promise<{ analysis: PackageAnalysis; result: DegradationResult }> {
    const result: DegradationResult = {
      applied: [],
      warnings: [],
      fallbacksUsed: [],
      completenessImprovement: 0
    };

    const originalCompleteness = analysis.metadata.completeness.overall;
    let improvedAnalysis = { ...analysis };

    // Sort strategies by priority
    const applicableStrategies = this.strategies
      .filter(strategy => strategy.canApply(improvedAnalysis))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        console.log(`Applying degradation strategy: ${strategy.name}`);
        
        improvedAnalysis = await strategy.apply(improvedAnalysis);
        result.applied.push(strategy);
        
        console.log(`✅ Applied: ${strategy.description}`);
      } catch (error) {
        result.warnings.push(`Failed to apply strategy ${strategy.name}: ${error}`);
        console.warn(`⚠️ Strategy failed: ${strategy.name} - ${error}`);
      }
    }

    // Recalculate completeness
    const newCompleteness = this.calculateCompleteness(improvedAnalysis);
    improvedAnalysis.metadata.completeness = newCompleteness;
    
    result.completenessImprovement = newCompleteness.overall - originalCompleteness;

    return { analysis: improvedAnalysis, result };
  }

  /**
   * Generate fallback tools when primary tools can't be created
   */
  generateFallbackTools(analysis: PackageAnalysis): MCPTool[] {
    const fallbackTools: MCPTool[] = [];

    // Always provide basic package info
    fallbackTools.push({
      name: 'get_package_info',
      description: `Get basic information about ${analysis.packageInfo.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          includeMetadata: {
            type: 'boolean',
            description: 'Include analysis metadata',
            default: false
          }
        },
        additionalProperties: false
      }
    });

    // Provide search tool even with minimal data
    if (analysis.readme.sections.length > 0 || analysis.packageInfo.description) {
      fallbackTools.push({
        name: 'search_basic_info',
        description: `Search basic information about ${analysis.packageInfo.name}`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query'],
          additionalProperties: false
        }
      });
    }

    // Provide installation help if we have any package info
    if (analysis.packageInfo.name) {
      fallbackTools.push({
        name: 'get_installation_help',
        description: `Get installation instructions for ${analysis.packageInfo.name}`,
        inputSchema: {
          type: 'object',
          properties: {
            packageManager: {
              type: 'string',
              description: 'Package manager to use for installation',
              enum: ['npm', 'yarn', 'pnpm', 'bun'],
              default: 'npm'
            }
          },
          additionalProperties: false
        }
      });
    }

    return fallbackTools;
  }

  private initializeStrategies(): void {
    // Strategy 1: Enhance README from package description
    this.strategies.push({
      name: 'enhance-readme-from-description',
      description: 'Create basic README content from package description',
      priority: 10,
      canApply: (analysis) => 
        analysis.readme.sections.length === 0 && 
        analysis.packageInfo.description.length > 0,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        
        enhanced.readme.sections = [{
          title: analysis.packageInfo.name,
          level: 1,
          content: analysis.packageInfo.description,
          subsections: []
        }];

        enhanced.readme.usageExamples = [{
          title: 'Basic Usage',
          description: `Basic usage example for ${analysis.packageInfo.name}`,
          code: `import ${this.generateImportName(analysis.packageInfo.name)} from '${analysis.packageInfo.name}';\n\n// Use ${analysis.packageInfo.name} here`,
          language: 'javascript',
          imports: [analysis.packageInfo.name],
          category: 'basic'
        }];

        return enhanced;
      }
    });

    // Strategy 2: Generate installation instructions from package info
    this.strategies.push({
      name: 'generate-installation-instructions',
      description: 'Generate standard installation instructions',
      priority: 9,
      canApply: (analysis) => 
        analysis.readme.installationInstructions.length === 0,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        
        enhanced.readme.installationInstructions = [
          {
            command: `npm install ${analysis.packageInfo.name}`,
            description: 'Install via npm',
            packageManager: 'npm'
          },
          {
            command: `yarn add ${analysis.packageInfo.name}`,
            description: 'Install via yarn',
            packageManager: 'yarn'
          }
        ];

        return enhanced;
      }
    });

    // Strategy 3: Infer API structure from package name and keywords
    this.strategies.push({
      name: 'infer-api-from-keywords',
      description: 'Infer basic API structure from package keywords',
      priority: 8,
      canApply: (analysis) => 
        !analysis.typeDefinitions.hasDefinitions && 
        Boolean(analysis.packageInfo.keywords) && 
        (analysis.packageInfo.keywords?.length || 0) > 0,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        const keywords = analysis.packageInfo.keywords || [];
        
        // Generate basic API reference based on keywords
        enhanced.apiReference.functions = keywords
          .filter(keyword => this.isLikelyFunction(keyword))
          .map(keyword => ({
            name: keyword,
            signature: `${keyword}(...args)`,
            description: `${keyword} function (inferred from package keywords)`,
            parameters: [],
            returnType: 'any',
            examples: [],
            category: 'utility'
          }));

        return enhanced;
      }
    });

    // Strategy 4: Create basic examples from common patterns
    this.strategies.push({
      name: 'generate-common-patterns',
      description: 'Generate common usage patterns based on package type',
      priority: 7,
      canApply: (analysis) => 
        analysis.readme.usageExamples.length === 0 && 
        analysis.examples.length === 0,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        const packageType = this.inferPackageType(analysis);
        
        enhanced.readme.usageExamples = this.generateCommonExamples(analysis.packageInfo.name, packageType);
        
        return enhanced;
      }
    });

    // Strategy 5: Enhance from dependencies
    this.strategies.push({
      name: 'enhance-from-dependencies',
      description: 'Infer functionality from package dependencies',
      priority: 6,
      canApply: (analysis) => 
        analysis.apiReference.functions.length === 0 && 
        Boolean(analysis.packageInfo.dependencies) && 
        Object.keys(analysis.packageInfo.dependencies || {}).length > 0,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        const deps = Object.keys(analysis.packageInfo.dependencies || {});
        
        // Infer configuration options from common dependencies
        if (deps.includes('typescript')) {
          enhanced.readme.configurationOptions.push({
            name: 'typescript',
            type: 'boolean',
            description: 'TypeScript support enabled',
            required: false,
            examples: ['true', 'false']
          });
        }

        if (deps.includes('react')) {
          enhanced.readme.usageExamples.push({
            title: 'React Integration',
            description: 'Using with React',
            code: `import React from 'react';\nimport ${this.generateImportName(analysis.packageInfo.name)} from '${analysis.packageInfo.name}';\n\nfunction App() {\n  return <div>React app with ${analysis.packageInfo.name}</div>;\n}`,
            language: 'jsx',
            imports: ['react', analysis.packageInfo.name],
            category: 'integration'
          });
        }

        return enhanced;
      }
    });

    // Strategy 6: Create minimal TypeScript definitions
    this.strategies.push({
      name: 'create-minimal-types',
      description: 'Create minimal TypeScript definitions when none exist',
      priority: 5,
      canApply: (analysis) => !analysis.typeDefinitions.hasDefinitions,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        
        enhanced.typeDefinitions.hasDefinitions = true;
        enhanced.typeDefinitions.exports = [{
          name: 'default',
          type: 'function',
          isDefault: true,
          description: `Default export for ${analysis.packageInfo.name}`
        }];

        enhanced.typeDefinitions.functions = [{
          name: 'default',
          parameters: [],
          returnType: 'any',
          isAsync: false,
          description: `Main function for ${analysis.packageInfo.name}`
        }];

        return enhanced;
      }
    });

    // Strategy 7: Enhance completeness scores
    this.strategies.push({
      name: 'boost-completeness',
      description: 'Apply final completeness improvements',
      priority: 1,
      canApply: (analysis) => analysis.metadata.completeness.overall < 30,
      apply: async (analysis) => {
        const enhanced = { ...analysis };
        
        // Add generic configuration help
        if (enhanced.readme.configurationOptions.length === 0) {
          enhanced.readme.configurationOptions.push({
            name: 'options',
            type: 'object',
            description: 'Configuration options (refer to documentation)',
            required: false,
            examples: ['{}']
          });
        }

        return enhanced;
      }
    });
  }

  private generateImportName(packageName: string): string {
    // Convert package name to a reasonable import name
    return packageName
      .replace(/[@\/\-]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private isLikelyFunction(keyword: string): boolean {
    const functionKeywords = [
      'parse', 'format', 'validate', 'transform', 'convert',
      'create', 'generate', 'build', 'compile', 'process',
      'fetch', 'get', 'set', 'update', 'delete', 'save',
      'render', 'draw', 'animate', 'calculate', 'compute'
    ];
    
    return functionKeywords.some(func => keyword.toLowerCase().includes(func));
  }

  private inferPackageType(analysis: PackageAnalysis): string {
    const keywords = analysis.packageInfo.keywords || [];
    const deps = Object.keys(analysis.packageInfo.dependencies || {});
    
    if (keywords.includes('react') || deps.includes('react')) return 'react';
    if (keywords.includes('vue') || deps.includes('vue')) return 'vue';
    if (keywords.includes('angular') || deps.includes('@angular/core')) return 'angular';
    if (keywords.includes('cli') || keywords.includes('command-line')) return 'cli';
    if (keywords.includes('api') || keywords.includes('rest')) return 'api';
    if (keywords.includes('utility') || keywords.includes('utils')) return 'utility';
    if (keywords.includes('parser') || keywords.includes('parse')) return 'parser';
    
    return 'generic';
  }

  private generateCommonExamples(packageName: string, packageType: string): any[] {
    const importName = this.generateImportName(packageName);
    
    const examples: any[] = [{
      title: 'Basic Usage',
      description: `Basic usage of ${packageName}`,
      code: `import ${importName} from '${packageName}';\n\n// Basic usage\nconst result = ${importName}();`,
      language: 'javascript',
      imports: [packageName],
      category: 'basic'
    }];

    switch (packageType) {
      case 'react':
        examples.push({
          title: 'React Component',
          description: 'Using in a React component',
          code: `import React from 'react';\nimport ${importName} from '${packageName}';\n\nfunction MyComponent() {\n  const data = ${importName}();\n  return <div>{data}</div>;\n}`,
          language: 'jsx',
          imports: ['react', packageName],
          category: 'integration'
        });
        break;
      
      case 'cli':
        examples.push({
          title: 'Command Line Usage',
          description: 'Using from command line',
          code: `npx ${packageName} --help`,
          language: 'bash',
          imports: [],
          category: 'basic'
        });
        break;
      
      case 'api':
        examples.push({
          title: 'API Usage',
          description: 'Making API calls',
          code: `import ${importName} from '${packageName}';\n\nconst api = ${importName}({\n  baseURL: 'https://api.example.com'\n});\n\nconst data = await api.get('/endpoint');`,
          language: 'javascript',
          imports: [packageName],
          category: 'advanced'
        });
        break;
    }

    return examples;
  }

  private calculateCompleteness(analysis: PackageAnalysis): any {
    let readmeScore = 0;
    let typeDefinitionsScore = 0;
    let examplesScore = 0;
    let apiReferenceScore = 0;

    // README completeness
    if (analysis.readme.sections.length > 0) readmeScore += 30;
    if (analysis.readme.installationInstructions.length > 0) readmeScore += 20;
    if (analysis.readme.usageExamples.length > 0) readmeScore += 30;
    if (analysis.readme.codeBlocks.length > 0) readmeScore += 20;

    // TypeScript definitions completeness
    if (analysis.typeDefinitions.hasDefinitions) {
      typeDefinitionsScore += 40;
      if (analysis.typeDefinitions.functions.length > 0) typeDefinitionsScore += 20;
      if (analysis.typeDefinitions.interfaces.length > 0) typeDefinitionsScore += 20;
      if (analysis.typeDefinitions.classes.length > 0) typeDefinitionsScore += 20;
    }

    // Examples completeness
    if (analysis.examples.length > 0) {
      examplesScore += 50;
      if (analysis.examples.some(ex => ex.category === 'demo')) examplesScore += 25;
      if (analysis.examples.some(ex => ex.patterns.length > 0)) examplesScore += 25;
    }

    // API reference completeness
    const totalApiItems = analysis.apiReference.functions.length + 
                         analysis.apiReference.classes.length + 
                         analysis.apiReference.interfaces.length + 
                         analysis.apiReference.types.length;
    
    if (totalApiItems > 0) apiReferenceScore += 40;
    if (totalApiItems > 5) apiReferenceScore += 30;
    if (totalApiItems > 10) apiReferenceScore += 30;

    const overall = Math.round((readmeScore + typeDefinitionsScore + examplesScore + apiReferenceScore) / 4);

    return {
      overall,
      readme: readmeScore,
      typeDefinitions: typeDefinitionsScore,
      examples: examplesScore,
      apiReference: apiReferenceScore
    };
  }

  /**
   * Check if analysis needs degradation
   */
  needsDegradation(analysis: PackageAnalysis): boolean {
    return analysis.metadata.completeness.overall < 50 ||
           analysis.readme.sections.length === 0 ||
           (!analysis.typeDefinitions.hasDefinitions && analysis.apiReference.functions.length === 0);
  }

  /**
   * Get available degradation strategies for an analysis
   */
  getAvailableStrategies(analysis: PackageAnalysis): DegradationStrategy[] {
    return this.strategies.filter(strategy => strategy.canApply(analysis));
  }
}