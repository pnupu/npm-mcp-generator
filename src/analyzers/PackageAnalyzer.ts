/**
 * Main package analyzer that orchestrates all analysis components
 */

import { PackageAnalysis, APIReference, AnalysisMetadata, DataSource, CompletenessScore } from '../types/PackageInfo.js';
import { AnalysisResult, AnalysisError } from '../types/AnalysisResult.js';
import { NPMRegistryFetcher } from '../fetchers/NPMRegistryFetcher.js';
import { GitHubFetcher } from '../fetchers/GitHubFetcher.js';
import { UnpkgFetcher } from '../fetchers/UnpkgFetcher.js';
import { ReadmeAnalyzer } from './ReadmeAnalyzer.js';
import { TypeDefinitionAnalyzer } from './TypeDefinitionAnalyzer.js';
import { ExampleAnalyzer } from './ExampleAnalyzer.js';

export interface PackageAnalyzerOptions {
  includeExamples?: boolean;
  includeTypeDefinitions?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export class PackageAnalyzer {
  private npmFetcher: NPMRegistryFetcher;
  private githubFetcher: GitHubFetcher;
  private unpkgFetcher: UnpkgFetcher;
  private readmeAnalyzer: ReadmeAnalyzer;
  private typeAnalyzer: TypeDefinitionAnalyzer;
  private exampleAnalyzer: ExampleAnalyzer;

  constructor(
    githubToken?: string,
    options: Partial<PackageAnalyzerOptions> = {}
  ) {
    this.npmFetcher = new NPMRegistryFetcher();
    this.githubFetcher = new GitHubFetcher(githubToken);
    this.unpkgFetcher = new UnpkgFetcher();
    this.readmeAnalyzer = new ReadmeAnalyzer();
    this.typeAnalyzer = new TypeDefinitionAnalyzer();
    this.exampleAnalyzer = new ExampleAnalyzer();
  }

  /**
   * Analyze a package comprehensively
   */
  async analyzePackage(
    packageName: string, 
    version?: string,
    options: PackageAnalyzerOptions = {}
  ): Promise<AnalysisResult<PackageAnalysis>> {
    const startTime = Date.now();
    const analysisVersion = '1.0.0';
    const sources: DataSource[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log(`🔍 Starting analysis of ${packageName}${version ? `@${version}` : ''}`);

      // Step 1: Fetch package metadata
      console.log('📦 Fetching package metadata...');
      const packageInfoResult = await this.npmFetcher.getPackageInfo(packageName, version);
      
      if (!packageInfoResult.success) {
        return {
          success: false,
          error: packageInfoResult.error!,
          warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: analysisVersion,
            source: 'package-analyzer'
          }
        };
      }

      const packageInfo = packageInfoResult.data!;
      sources.push({
        type: 'npm-registry',
        url: `https://registry.npmjs.org/${packageName}`,
        success: true
      });

      if (packageInfoResult.warnings) {
        warnings.push(...packageInfoResult.warnings);
      }

      // Step 2: Fetch and analyze README
      console.log('📖 Fetching and analyzing README...');
      const readmeResult = await this.githubFetcher.getReadme(packageInfo.repository?.url);
      
      sources.push({
        type: 'github',
        url: packageInfo.repository?.url || 'N/A',
        success: readmeResult.success
      });

      if (readmeResult.warnings) {
        warnings.push(...readmeResult.warnings);
      }

      const readmeAnalysisResult = await this.readmeAnalyzer.analyze(readmeResult.data || null);
      const readmeAnalysis = readmeAnalysisResult.success ? readmeAnalysisResult.data! : this.readmeAnalyzer['createEmptyAnalysis']();

      if (readmeAnalysisResult.warnings) {
        warnings.push(...readmeAnalysisResult.warnings);
      }

      // Step 3: Fetch and analyze TypeScript definitions
      console.log('🔧 Fetching and analyzing TypeScript definitions...');
      let typeDefinitionAnalysis;
      
      if (options.includeTypeDefinitions !== false) {
        const typeDefsResult = await this.unpkgFetcher.getTypeDefinitions(packageName, packageInfo.version);
        
        sources.push({
          type: 'unpkg',
          url: `https://unpkg.com/${packageName}@${packageInfo.version}`,
          success: typeDefsResult.success
        });

        if (typeDefsResult.warnings) {
          warnings.push(...typeDefsResult.warnings);
        }

        const typeAnalysisResult = await this.typeAnalyzer.analyze(typeDefsResult.data || null);
        typeDefinitionAnalysis = typeAnalysisResult.success ? typeAnalysisResult.data! : this.typeAnalyzer['createEmptyAnalysis']();

        if (typeAnalysisResult.warnings) {
          warnings.push(...typeAnalysisResult.warnings);
        }
      } else {
        typeDefinitionAnalysis = this.typeAnalyzer['createEmptyAnalysis']();
      }

      // Step 4: Fetch and analyze examples
      console.log('💡 Fetching and analyzing examples...');
      let exampleAnalysis: any[] = [];
      
      if (options.includeExamples !== false) {
        const examplesResult = await this.githubFetcher.getExamples(packageInfo.repository?.url);
        
        if (examplesResult.warnings) {
          warnings.push(...examplesResult.warnings);
        }

        const exampleAnalysisResult = await this.exampleAnalyzer.analyze(examplesResult.data || []);
        exampleAnalysis = exampleAnalysisResult.success ? exampleAnalysisResult.data! : [];

        if (exampleAnalysisResult.warnings) {
          warnings.push(...exampleAnalysisResult.warnings);
        }
      }

      // Step 5: Build comprehensive API reference
      console.log('🔗 Building API reference...');
      const apiReference = this.buildAPIReference(typeDefinitionAnalysis, readmeAnalysis);

      // Step 6: Calculate completeness score
      const completeness = this.calculateCompletenessScore(
        packageInfo,
        readmeAnalysis,
        typeDefinitionAnalysis,
        exampleAnalysis,
        apiReference
      );

      // Step 7: Create analysis metadata
      const metadata: AnalysisMetadata = {
        analyzedAt: new Date(),
        analysisVersion,
        sources,
        warnings,
        errors,
        completeness
      };

      const analysis: PackageAnalysis = {
        packageInfo,
        readme: readmeAnalysis,
        typeDefinitions: typeDefinitionAnalysis,
        examples: exampleAnalysis,
        apiReference,
        metadata
      };

      const processingTime = Date.now() - startTime;
      console.log(`✅ Analysis complete in ${processingTime}ms`);

      return {
        success: true,
        data: analysis,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: analysisVersion,
          source: 'package-analyzer'
        }
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Package analysis failed: ${error}`,
          recoverable: false,
          suggestions: ['Check package name and version', 'Verify network connectivity']
        },
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: analysisVersion,
          source: 'package-analyzer'
        }
      };
    }
  }

  private buildAPIReference(typeDefinitionAnalysis: any, readmeAnalysis: any): APIReference {
    const apiReference: APIReference = {
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      constants: []
    };

    // Convert TypeScript definitions to API reference format
    if (typeDefinitionAnalysis.functions) {
      apiReference.functions = typeDefinitionAnalysis.functions.map((func: any) => ({
        name: func.name,
        signature: this.buildFunctionSignature(func),
        description: func.description || '',
        parameters: func.parameters.map((param: any) => ({
          name: param.name,
          type: param.type,
          description: param.description || '',
          optional: param.optional,
          defaultValue: param.defaultValue
        })),
        returnType: func.returnType,
        examples: this.findExamplesForFunction(func.name, readmeAnalysis),
        category: this.categorizeFunction(func.name, func.returnType)
      }));
    }

    if (typeDefinitionAnalysis.classes) {
      apiReference.classes = typeDefinitionAnalysis.classes.map((cls: any) => ({
        name: cls.name,
        description: cls.description || '',
        constructor: cls.constructor ? {
          name: 'constructor',
          signature: this.buildFunctionSignature(cls.constructor),
          description: cls.constructor.description || '',
          parameters: cls.constructor.parameters || [],
          returnType: cls.name,
          examples: [],
          category: 'constructor'
        } : undefined,
        methods: cls.methods.map((method: any) => ({
          name: method.name,
          signature: this.buildFunctionSignature(method),
          description: method.description || '',
          parameters: method.parameters || [],
          returnType: method.returnType,
          examples: [],
          category: 'method'
        })),
        properties: cls.properties.map((prop: any) => ({
          name: prop.name,
          type: prop.type,
          description: prop.description || '',
          readonly: false // Could be enhanced to detect readonly
        })),
        examples: this.findExamplesForClass(cls.name, readmeAnalysis)
      }));
    }

    if (typeDefinitionAnalysis.interfaces) {
      apiReference.interfaces = typeDefinitionAnalysis.interfaces.map((iface: any) => ({
        name: iface.name,
        description: iface.description || '',
        properties: iface.properties.map((prop: any) => ({
          name: prop.name,
          type: prop.type,
          description: prop.description || '',
          readonly: false
        })),
        methods: [] // Interfaces don't have method implementations
      }));
    }

    if (typeDefinitionAnalysis.types) {
      apiReference.types = typeDefinitionAnalysis.types.map((type: any) => ({
        name: type.name,
        definition: type.definition,
        description: type.description || '',
        examples: []
      }));
    }

    // Extract constants from exports
    if (typeDefinitionAnalysis.exports) {
      apiReference.constants = typeDefinitionAnalysis.exports
        .filter((exp: any) => exp.type === 'constant')
        .map((constant: any) => ({
          name: constant.name,
          type: 'unknown', // Could be enhanced to infer type
          value: 'unknown', // Could be enhanced to extract value
          description: constant.description || ''
        }));
    }

    return apiReference;
  }

  private buildFunctionSignature(func: any): string {
    const params = func.parameters?.map((p: any) => 
      `${p.name}${p.optional ? '?' : ''}: ${p.type}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`
    ).join(', ') || '';
    
    return `${func.name}(${params}): ${func.returnType}`;
  }

  private findExamplesForFunction(functionName: string, readmeAnalysis: any): string[] {
    const examples: string[] = [];
    
    if (readmeAnalysis.usageExamples) {
      for (const example of readmeAnalysis.usageExamples) {
        if (example.code.includes(functionName)) {
          examples.push(example.code);
        }
      }
    }

    return examples;
  }

  private findExamplesForClass(className: string, readmeAnalysis: any): string[] {
    const examples: string[] = [];
    
    if (readmeAnalysis.usageExamples) {
      for (const example of readmeAnalysis.usageExamples) {
        if (example.code.includes(`new ${className}`) || example.code.includes(className)) {
          examples.push(example.code);
        }
      }
    }

    return examples;
  }

  private categorizeFunction(name: string, returnType: string): string {
    if (name.startsWith('get') || name.startsWith('fetch')) return 'getter';
    if (name.startsWith('set') || name.startsWith('update')) return 'setter';
    if (name.startsWith('create') || name.startsWith('make')) return 'factory';
    if (name.startsWith('is') || name.startsWith('has')) return 'predicate';
    if (returnType.includes('Promise')) return 'async';
    if (returnType === 'void') return 'action';
    return 'utility';
  }

  private calculateCompletenessScore(
    packageInfo: any,
    readmeAnalysis: any,
    typeDefinitionAnalysis: any,
    exampleAnalysis: any[],
    apiReference: APIReference
  ): CompletenessScore {
    let readmeScore = 0;
    let typeDefinitionsScore = 0;
    let examplesScore = 0;
    let apiReferenceScore = 0;

    // README completeness (0-100)
    if (readmeAnalysis.sections.length > 0) readmeScore += 30;
    if (readmeAnalysis.installationInstructions.length > 0) readmeScore += 20;
    if (readmeAnalysis.usageExamples.length > 0) readmeScore += 30;
    if (readmeAnalysis.codeBlocks.length > 0) readmeScore += 20;

    // TypeScript definitions completeness (0-100)
    if (typeDefinitionAnalysis.hasDefinitions) {
      typeDefinitionsScore += 40;
      if (typeDefinitionAnalysis.functions.length > 0) typeDefinitionsScore += 20;
      if (typeDefinitionAnalysis.interfaces.length > 0) typeDefinitionsScore += 20;
      if (typeDefinitionAnalysis.classes.length > 0) typeDefinitionsScore += 20;
    }

    // Examples completeness (0-100)
    if (exampleAnalysis.length > 0) {
      examplesScore += 50;
      if (exampleAnalysis.some(ex => ex.category === 'demo')) examplesScore += 25;
      if (exampleAnalysis.some(ex => ex.patterns.length > 0)) examplesScore += 25;
    }

    // API reference completeness (0-100)
    const totalApiItems = apiReference.functions.length + 
                         apiReference.classes.length + 
                         apiReference.interfaces.length + 
                         apiReference.types.length;
    
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
   * Clear all caches
   */
  clearCaches(): void {
    this.npmFetcher.clearCache();
    this.githubFetcher.clearCache();
    this.unpkgFetcher.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      npm: this.npmFetcher.getCacheStats(),
      github: this.githubFetcher.getRateLimitStatus(),
      unpkg: this.unpkgFetcher.getCacheStats()
    };
  }
}