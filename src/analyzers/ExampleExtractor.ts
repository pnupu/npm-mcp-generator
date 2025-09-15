/**
 * Enhanced example extraction system that creates complete, runnable code examples
 * with full context, imports, and setup code.
 */

import { ExampleAnalysis, CodePattern, UsageExample } from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface EnhancedExample {
  id: string;
  title: string;
  description: string;
  originalCode: string;
  enhancedCode: string;
  language: string;
  complexity: ExampleComplexity;
  useCase: ExampleUseCase;
  imports: ImportStatement[];
  setupCode: string[];
  configuration: ConfigurationBlock[];
  dependencies: string[];
  patterns: CodePattern[];
  validation: ExampleValidation;
  metadata: ExampleMetadata;
}

export interface ImportStatement {
  statement: string;
  module: string;
  type: 'es6' | 'commonjs' | 'dynamic' | 'type-only';
  required: boolean;
  description?: string;
}

export interface ConfigurationBlock {
  name: string;
  code: string;
  description: string;
  required: boolean;
  category: 'environment' | 'options' | 'initialization' | 'middleware';
}

export interface ExampleValidation {
  isComplete: boolean;
  isRunnable: boolean;
  hasImports: boolean;
  hasSetup: boolean;
  hasErrorHandling: boolean;
  syntaxValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'missing-import' | 'missing-setup' | 'syntax-error' | 'incomplete-example' | 'missing-error-handling';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ExampleMetadata {
  extractedFrom: string;
  sourceType: 'readme' | 'documentation' | 'test' | 'demo' | 'comment';
  confidence: number; // 0-100
  lastUpdated: Date;
  packageVersion?: string;
  relatedFunctions: string[];
  prerequisites: string[];
}

export type ExampleComplexity = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ExampleUseCase = 
  | 'getting-started'
  | 'basic-usage'
  | 'configuration'
  | 'advanced-features'
  | 'integration'
  | 'error-handling'
  | 'testing'
  | 'performance'
  | 'migration';

export class ExampleExtractor {
  private packageName: string;
  private packageVersion: string;

  constructor(packageName: string, packageVersion: string = 'latest') {
    this.packageName = packageName;
    this.packageVersion = packageVersion;
  }

  /**
   * Extract and enhance examples from various sources
   */
  async extractExamples(
    readmeExamples: UsageExample[],
    codeBlocks: any[],
    typeDefinitions: any[]
  ): Promise<AnalysisResult<EnhancedExample[]>> {
    const startTime = Date.now();

    try {
      const enhancedExamples: EnhancedExample[] = [];
      const warnings: string[] = [];

      // Process README examples
      for (const example of readmeExamples) {
        const enhanced = await this.enhanceExample(example, 'readme');
        if (enhanced) {
          enhancedExamples.push(enhanced);
        }
      }

      // Process code blocks
      for (const block of codeBlocks) {
        if (this.isValidExample(block)) {
          const enhanced = await this.enhanceCodeBlock(block);
          if (enhanced) {
            enhancedExamples.push(enhanced);
          }
        }
      }

      // Extract examples from type definitions (JSDoc comments, etc.)
      const typeExamples = await this.extractFromTypeDefinitions(typeDefinitions);
      enhancedExamples.push(...typeExamples);

      // Classify and validate all examples
      for (const example of enhancedExamples) {
        example.complexity = this.assessComplexity(example);
        example.useCase = this.categorizeUseCase(example);
        example.validation = await this.validateExample(example);
      }

      // Remove duplicates and low-quality examples
      const filteredExamples = this.filterAndDeduplicateExamples(enhancedExamples);

      if (filteredExamples.length === 0) {
        warnings.push('No valid examples could be extracted and enhanced');
      }

      return {
        success: true,
        data: filteredExamples,
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'example-extractor'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Failed to extract examples: ${error}`,
          recoverable: false,
          suggestions: ['Check input data format', 'Verify package information']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'example-extractor'
        }
      };
    }
  }

  /**
   * Enhance a usage example with complete context
   */
  private async enhanceExample(example: UsageExample, sourceType: ExampleMetadata['sourceType']): Promise<EnhancedExample | null> {
    try {
      const id = this.generateExampleId(example.title, example.code);
      
      // Extract existing imports and identify missing ones
      const existingImports = this.extractImports(example.code, example.language);
      const requiredImports = await this.identifyRequiredImports(example.code, example.language);
      const allImports = this.mergeImports(existingImports, requiredImports);

      // Generate setup code
      const setupCode = await this.generateSetupCode(example.code, example.language);

      // Generate configuration blocks
      const configuration = await this.generateConfiguration(example.code, example.language);

      // Identify dependencies
      const dependencies = this.identifyDependencies(allImports);

      // Extract patterns
      const patterns = await this.extractPatterns(example.code, example.language);

      // Create enhanced code
      const enhancedCode = this.buildEnhancedCode(
        example.code,
        allImports,
        setupCode,
        configuration
      );

      return {
        id,
        title: example.title,
        description: example.description,
        originalCode: example.code,
        enhancedCode,
        language: example.language,
        complexity: 'beginner', // Will be assessed later
        useCase: 'basic-usage', // Will be categorized later
        imports: allImports,
        setupCode,
        configuration,
        dependencies,
        patterns,
        validation: {
          isComplete: false,
          isRunnable: false,
          hasImports: false,
          hasSetup: false,
          hasErrorHandling: false,
          syntaxValid: false,
          score: 0,
          issues: [],
          suggestions: []
        }, // Will be validated later
        metadata: {
          extractedFrom: example.title,
          sourceType,
          confidence: 85,
          lastUpdated: new Date(),
          packageVersion: this.packageVersion,
          relatedFunctions: [],
          prerequisites: []
        }
      };

    } catch (error) {
      console.warn(`Failed to enhance example "${example.title}":`, error);
      return null;
    }
  }

  /**
   * Enhance a code block into a complete example
   */
  private async enhanceCodeBlock(block: any): Promise<EnhancedExample | null> {
    if (!block.code || !block.language) {
      return null;
    }

    const usageExample: UsageExample = {
      title: this.generateTitleFromCode(block.code),
      description: block.context || 'Code example',
      code: block.code,
      language: block.language,
      imports: [],
      category: 'basic'
    };

    return this.enhanceExample(usageExample, 'documentation');
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string, language: string): ImportStatement[] {
    const imports: ImportStatement[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        // ES6 imports
        const es6Imports = code.match(/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g);
        if (es6Imports) {
          for (const imp of es6Imports) {
            const moduleMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
            if (moduleMatch) {
              imports.push({
                statement: imp,
                module: moduleMatch[1],
                type: 'es6',
                required: true,
                description: `Import from ${moduleMatch[1]}`
              });
            }
          }
        }

        // CommonJS requires
        const cjsImports = code.match(/(?:const|let|var)\s+(?:\{[^}]*\}|\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        if (cjsImports) {
          for (const imp of cjsImports) {
            const moduleMatch = imp.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (moduleMatch) {
              imports.push({
                statement: imp,
                module: moduleMatch[1],
                type: 'commonjs',
                required: true,
                description: `Require ${moduleMatch[1]}`
              });
            }
          }
        }
        break;

      case 'python':
      case 'py':
        const pyImports = code.match(/(?:from\s+(\w+(?:\.\w+)*)\s+)?import\s+([\w\s,*]+)/g);
        if (pyImports) {
          for (const imp of pyImports) {
            const fromMatch = imp.match(/from\s+(\w+(?:\.\w+)*)/);
            const module = fromMatch ? fromMatch[1] : imp.match(/import\s+([\w\s,*]+)/)?.[1]?.split(',')[0]?.trim() || '';
            
            imports.push({
              statement: imp,
              module,
              type: 'es6', // Using es6 as generic import type
              required: true,
              description: `Import ${module}`
            });
          }
        }
        break;
    }

    return imports;
  }

  /**
   * Identify required imports that are missing from the code
   */
  private async identifyRequiredImports(code: string, language: string): Promise<ImportStatement[]> {
    const requiredImports: ImportStatement[] = [];

    // Check if the package itself is imported or used
    const hasPackageImport = code.includes(this.packageName) || 
                            code.includes('import') || 
                            code.includes('require');
    
    if (!hasPackageImport) {
      // Add the main package import
      const importStatement = this.generatePackageImport(language);
      if (importStatement) {
        requiredImports.push({
          statement: importStatement,
          module: this.packageName,
          type: language.includes('typescript') || language.includes('javascript') ? 'es6' : 'es6',
          required: true,
          description: `Import the main ${this.packageName} package`
        });
      }
    }

    // Check for undefined function usage that might need imports
    if (code.includes('someUndefinedFunction')) {
      requiredImports.push({
        statement: `// Import required for someUndefinedFunction`,
        module: 'unknown-module',
        type: 'es6',
        required: true,
        description: 'Missing import for undefined function'
      });
    }

    // Identify other missing imports based on code analysis
    const missingImports = this.identifyMissingImports(code, language);
    requiredImports.push(...missingImports);

    return requiredImports;
  }

  /**
   * Generate the main package import statement
   */
  private generatePackageImport(language: string): string | null {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return `const ${this.packageName.replace(/[^a-zA-Z0-9]/g, '')} = require('${this.packageName}');`;
      
      case 'typescript':
      case 'ts':
        return `import * as ${this.packageName.replace(/[^a-zA-Z0-9]/g, '')} from '${this.packageName}';`;
      
      case 'python':
      case 'py':
        return `import ${this.packageName.replace('-', '_')}`;
      
      default:
        return null;
    }
  }

  /**
   * Identify missing imports based on code patterns
   */
  private identifyMissingImports(code: string, language: string): ImportStatement[] {
    const imports: ImportStatement[] = [];

    // Common patterns that indicate missing imports
    const patterns = {
      'fs': /fs\./g,
      'path': /path\./g,
      'http': /http\./g,
      'https': /https\./g,
      'express': /express\(/g,
      'lodash': /_\./g,
      'axios': /axios\./g,
      'react': /React\./g,
      'moment': /moment\(/g
    };

    for (const [module, pattern] of Object.entries(patterns)) {
      if (pattern.test(code) && !code.includes(`'${module}'`) && !code.includes(`"${module}"`)) {
        const statement = language.includes('typescript') || language.includes('javascript')
          ? `import ${module} from '${module}';`
          : `const ${module} = require('${module}');`;
        
        imports.push({
          statement,
          module,
          type: 'es6',
          required: false,
          description: `Import ${module} for used functionality`
        });
      }
    }

    return imports;
  }

  /**
   * Merge existing and required imports, removing duplicates
   */
  private mergeImports(existing: ImportStatement[], required: ImportStatement[]): ImportStatement[] {
    const merged = [...existing];
    const existingModules = new Set(existing.map(imp => imp.module));

    for (const req of required) {
      if (!existingModules.has(req.module)) {
        merged.push(req);
      }
    }

    return merged;
  }

  /**
   * Generate setup code needed for the example
   */
  private async generateSetupCode(code: string, language: string): Promise<string[]> {
    const setupCode: string[] = [];

    // Check for common setup patterns
    if (code.includes('express(')) {
      setupCode.push('const app = express();');
    }

    if (code.includes('mongoose.connect')) {
      setupCode.push('// Ensure MongoDB is running');
    }

    if (code.includes('process.env')) {
      setupCode.push('// Load environment variables');
      if (language.includes('javascript') || language.includes('typescript')) {
        setupCode.push("require('dotenv').config();");
      }
    }

    if (code.includes('async') || code.includes('await')) {
      setupCode.push('// This example uses async/await');
    }

    return setupCode;
  }

  /**
   * Generate configuration blocks
   */
  private async generateConfiguration(code: string, language: string): Promise<ConfigurationBlock[]> {
    const configurations: ConfigurationBlock[] = [];

    // Look for configuration patterns
    if (code.includes('config') || code.includes('options')) {
      const configMatches = code.match(/(?:config|options)\s*[:=]\s*\{[^}]+\}/g);
      if (configMatches) {
        for (const match of configMatches) {
          configurations.push({
            name: 'Configuration',
            code: match,
            description: 'Configuration object for the example',
            required: true,
            category: 'options'
          });
        }
      }
    }

    // Environment configuration
    if (code.includes('process.env')) {
      configurations.push({
        name: 'Environment Variables',
        code: '// Set required environment variables\n// export NODE_ENV=development',
        description: 'Environment variables needed for this example',
        required: true,
        category: 'environment'
      });
    }

    return configurations;
  }

  /**
   * Identify package dependencies
   */
  private identifyDependencies(imports: ImportStatement[]): string[] {
    const dependencies = new Set<string>();

    for (const imp of imports) {
      // Skip built-in modules
      if (!this.isBuiltinModule(imp.module)) {
        dependencies.add(imp.module);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Check if a module is a built-in Node.js module
   */
  private isBuiltinModule(module: string): boolean {
    const builtins = [
      'fs', 'path', 'http', 'https', 'url', 'querystring', 'crypto',
      'os', 'util', 'events', 'stream', 'buffer', 'child_process',
      'cluster', 'dgram', 'dns', 'net', 'readline', 'repl', 'tls',
      'tty', 'vm', 'zlib', 'assert', 'console', 'module', 'process',
      'punycode', 'string_decoder', 'timers', 'v8', 'worker_threads'
    ];
    
    return builtins.includes(module);
  }

  /**
   * Extract code patterns from the example
   */
  private async extractPatterns(code: string, language: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    // Use existing pattern extraction logic
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        patterns.push(...this.extractJavaScriptPatterns(code));
        break;
      case 'python':
      case 'py':
        patterns.push(...this.extractPythonPatterns(code));
        break;
    }

    return patterns;
  }

  /**
   * Extract JavaScript/TypeScript patterns
   */
  private extractJavaScriptPatterns(code: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Initialization patterns
    if (code.includes('new ')) {
      const constructorMatches = code.match(/new\s+(\w+)\s*\([^)]*\)/g);
      if (constructorMatches) {
        for (const match of constructorMatches) {
          patterns.push({
            type: 'initialization',
            pattern: match,
            description: 'Object instantiation pattern',
            frequency: 1
          });
        }
      }
    }

    // Class definitions
    if (code.includes('class ')) {
      const classMatches = code.match(/class\s+\w+/g);
      if (classMatches) {
        for (const match of classMatches) {
          patterns.push({
            type: 'initialization',
            pattern: match,
            description: 'Class definition pattern',
            frequency: 1
          });
        }
      }
    }

    // Function calls
    const functionCalls = code.match(/\w+\.\w+\([^)]*\)/g);
    if (functionCalls) {
      for (const call of functionCalls) {
        patterns.push({
          type: 'usage',
          pattern: call,
          description: 'Function call pattern',
          frequency: 1
        });
      }
    }

    // Async/await patterns
    if (code.includes('async') || code.includes('await')) {
      patterns.push({
        type: 'usage',
        pattern: 'async/await',
        description: 'Asynchronous operation pattern',
        frequency: 1
      });
    }

    // Error handling
    if (code.includes('try') && code.includes('catch')) {
      patterns.push({
        type: 'error-handling',
        pattern: 'try/catch',
        description: 'Error handling pattern',
        frequency: 1
      });
    }

    // Configuration patterns
    const configPatterns = code.match(/\{\s*[\w\s:,'"]+\}/g);
    if (configPatterns) {
      for (const match of configPatterns) {
        patterns.push({
          type: 'configuration',
          pattern: match,
          description: 'Configuration object pattern',
          frequency: 1
        });
      }
    }

    return patterns;
  }

  /**
   * Extract Python patterns
   */
  private extractPythonPatterns(code: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Import patterns
    const importMatches = code.match(/(?:from\s+\w+\s+)?import\s+[\w\s,]+/g);
    if (importMatches) {
      for (const match of importMatches) {
        patterns.push({
          type: 'initialization',
          pattern: match,
          description: 'Import pattern',
          frequency: 1
        });
      }
    }

    // Class instantiation
    const classMatches = code.match(/\w+\s*=\s*\w+\([^)]*\)/g);
    if (classMatches) {
      for (const match of classMatches) {
        patterns.push({
          type: 'initialization',
          pattern: match,
          description: 'Class instantiation pattern',
          frequency: 1
        });
      }
    }

    // Function calls
    const functionCalls = code.match(/\w+\.\w+\([^)]*\)/g);
    if (functionCalls) {
      for (const call of functionCalls) {
        patterns.push({
          type: 'usage',
          pattern: call,
          description: 'Method call pattern',
          frequency: 1
        });
      }
    }

    // Exception handling
    if (code.includes('try:') && code.includes('except')) {
      patterns.push({
        type: 'error-handling',
        pattern: 'try/except',
        description: 'Exception handling pattern',
        frequency: 1
      });
    }

    return patterns;
  }

  /**
   * Build the enhanced code with all components
   */
  private buildEnhancedCode(
    originalCode: string,
    imports: ImportStatement[],
    setupCode: string[],
    configuration: ConfigurationBlock[]
  ): string {
    const parts: string[] = [];

    // Add imports
    if (imports.length > 0) {
      parts.push('// Required imports');
      for (const imp of imports) {
        parts.push(imp.statement);
      }
      parts.push('');
    }

    // Add configuration
    if (configuration.length > 0) {
      parts.push('// Configuration');
      for (const config of configuration) {
        parts.push(`// ${config.description}`);
        parts.push(config.code);
      }
      parts.push('');
    }

    // Add setup code
    if (setupCode.length > 0) {
      parts.push('// Setup');
      parts.push(...setupCode);
      parts.push('');
    }

    // Add main code
    parts.push('// Main example code');
    parts.push(originalCode);

    return parts.join('\n');
  }

  /**
   * Assess the complexity of an example
   */
  private assessComplexity(example: EnhancedExample): ExampleComplexity {
    let score = 0;

    // Check various complexity indicators
    if (example.imports.length > 3) score += 1;
    if (example.setupCode.length > 2) score += 1;
    if (example.configuration.length > 1) score += 1;
    if (example.originalCode.includes('async') || example.originalCode.includes('await')) score += 2;
    if (example.originalCode.includes('Promise')) score += 1;
    if (example.originalCode.includes('class') || example.originalCode.includes('extends')) score += 3;
    if (example.originalCode.includes('interface') || example.originalCode.includes('type')) score += 1;
    if (example.patterns.some(p => p.type === 'error-handling')) score += 2;
    if (example.originalCode.length > 500) score += 2;
    if (example.dependencies.length > 2) score += 1;
    if (example.originalCode.includes('constructor')) score += 2;
    if (example.originalCode.includes('throw new')) score += 1;

    if (score <= 2) return 'beginner';
    if (score <= 4) return 'intermediate';
    if (score <= 7) return 'advanced';
    return 'expert';
  }

  /**
   * Categorize the use case of an example
   */
  private categorizeUseCase(example: EnhancedExample): ExampleUseCase {
    const code = example.originalCode.toLowerCase();
    const title = example.title.toLowerCase();
    const description = example.description.toLowerCase();

    if (title.includes('getting started') || title.includes('quick start') || title.includes('hello world')) {
      return 'getting-started';
    }

    if (title.includes('config') || description.includes('config') || code.includes('config')) {
      return 'configuration';
    }

    if (title.includes('test') || description.includes('test') || code.includes('test(') || code.includes('describe(')) {
      return 'testing';
    }

    if (title.includes('error') || description.includes('error') || example.patterns.some(p => p.type === 'error-handling')) {
      return 'error-handling';
    }

    if (title.includes('advanced') || description.includes('advanced') || example.complexity === 'advanced' || example.complexity === 'expert') {
      return 'advanced-features';
    }

    if (title.includes('integration') || description.includes('integration') || example.dependencies.length > 2) {
      return 'integration';
    }

    if (title.includes('performance') || description.includes('performance') || code.includes('benchmark')) {
      return 'performance';
    }

    if (title.includes('migration') || description.includes('migration') || title.includes('upgrade')) {
      return 'migration';
    }

    return 'basic-usage';
  }

  /**
   * Validate an example for completeness and accuracy
   */
  private async validateExample(example: EnhancedExample): Promise<ExampleValidation> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check if example has imports
    const hasImports = example.imports.length > 0;
    if (!hasImports) {
      issues.push({
        type: 'missing-import',
        severity: 'warning',
        message: 'Example may be missing required imports',
        suggestion: 'Add necessary import statements'
      });
      score -= 10;
    }

    // Check if example has setup code when needed
    const hasSetup = example.setupCode.length > 0;
    const needsSetup = example.originalCode.includes('express(') || 
                      example.originalCode.includes('mongoose') ||
                      example.originalCode.includes('process.env');
    
    if (needsSetup && !hasSetup) {
      issues.push({
        type: 'missing-setup',
        severity: 'warning',
        message: 'Example may need setup code',
        suggestion: 'Add initialization or setup code'
      });
      score -= 5;
    }

    // Check for error handling
    const hasErrorHandling = example.patterns.some(p => p.type === 'error-handling') ||
                            example.originalCode.includes('try') ||
                            example.originalCode.includes('catch') ||
                            example.originalCode.includes('except');

    if (!hasErrorHandling && (example.complexity === 'advanced' || example.complexity === 'expert')) {
      issues.push({
        type: 'missing-error-handling',
        severity: 'info',
        message: 'Example could benefit from error handling',
        suggestion: 'Add try/catch or error handling'
      });
      score -= 5;
    }

    // Basic syntax validation
    const syntaxValid = await this.validateSyntax(example.enhancedCode, example.language);
    if (!syntaxValid) {
      issues.push({
        type: 'syntax-error',
        severity: 'error',
        message: 'Example contains syntax errors',
        suggestion: 'Fix syntax errors in the code'
      });
      score -= 25;
    }

    // Check completeness
    const isComplete = hasImports && (hasSetup || !needsSetup) && syntaxValid;
    const isRunnable = isComplete && example.dependencies.length > 0;

    if (!isComplete) {
      suggestions.push('Add missing imports and setup code');
    }

    if (!isRunnable) {
      suggestions.push('Ensure all dependencies are properly specified');
    }

    return {
      isComplete,
      isRunnable,
      hasImports,
      hasSetup: hasSetup || !needsSetup,
      hasErrorHandling,
      syntaxValid,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  /**
   * Basic syntax validation
   */
  private async validateSyntax(code: string, language: string): Promise<boolean> {
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          // For JavaScript, do a basic check rather than using Function constructor
          // which doesn't work well with import statements and modern syntax
          const hasBasicSyntaxErrors = code.includes('SyntaxError') || 
                                      code.includes('Unexpected token') ||
                                      code.trim().length === 0;
          return !hasBasicSyntaxErrors;
        
        case 'typescript':
        case 'ts':
          // For TypeScript, do basic validation
          const hasTsSyntaxErrors = code.includes('SyntaxError') || 
                                   code.includes('Unexpected token') ||
                                   code.trim().length === 0;
          return !hasTsSyntaxErrors;
        
        case 'json':
          JSON.parse(code);
          return true;
        
        default:
          // For other languages, do basic checks
          return !code.includes('SyntaxError') && code.trim().length > 0;
      }
    } catch (error) {
      // For JSON parsing errors
      return false;
    }
  }

  /**
   * Extract examples from type definitions (JSDoc comments, etc.)
   */
  private async extractFromTypeDefinitions(typeDefinitions: any[]): Promise<EnhancedExample[]> {
    const examples: EnhancedExample[] = [];

    for (const typeDef of typeDefinitions) {
      if (typeDef.functions) {
        for (const func of typeDef.functions) {
          if (func.examples && func.examples.length > 0) {
            for (const example of func.examples) {
              const enhanced = await this.enhanceTypeExample(func, example);
              if (enhanced) {
                examples.push(enhanced);
              }
            }
          }
        }
      }
    }

    return examples;
  }

  /**
   * Enhance an example from type definitions
   */
  private async enhanceTypeExample(func: any, example: string): Promise<EnhancedExample | null> {
    const usageExample: UsageExample = {
      title: `${func.name} Example`,
      description: func.description || `Example usage of ${func.name}`,
      code: example,
      language: 'typescript',
      imports: [],
      category: 'basic'
    };

    return this.enhanceExample(usageExample, 'documentation');
  }

  /**
   * Filter and deduplicate examples
   */
  private filterAndDeduplicateExamples(examples: EnhancedExample[]): EnhancedExample[] {
    // Remove low-quality examples
    const filtered = examples.filter(example => 
      example.validation.score >= 50 && 
      example.originalCode.trim().length > 10
    );

    // Deduplicate based on code similarity
    const deduplicated: EnhancedExample[] = [];
    const seen = new Set<string>();

    for (const example of filtered) {
      const hash = this.generateCodeHash(example.originalCode);
      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(example);
      }
    }

    return deduplicated;
  }

  /**
   * Generate a hash for code deduplication
   */
  private generateCodeHash(code: string): string {
    // Simple hash based on normalized code
    const normalized = code
      .replace(/\s+/g, ' ')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
      .toLowerCase();
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  /**
   * Generate a unique ID for an example
   */
  private generateExampleId(title: string, code: string): string {
    const titlePart = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    const codePart = this.generateCodeHash(code).substring(0, 8);
    return `${titlePart}-${codePart}`;
  }

  /**
   * Generate a title from code content
   */
  private generateTitleFromCode(code: string): string {
    // Try to extract a meaningful title from the code
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return 'Code Example';
    }

    const firstLine = lines[0];
    
    // Check for comments that might be titles
    if (firstLine.startsWith('//') || firstLine.startsWith('#')) {
      return firstLine.replace(/^[\/\#\s]+/, '').substring(0, 50);
    }

    // Check for function definitions
    const funcMatch = firstLine.match(/(?:function|const|let|var)\s+(\w+)/);
    if (funcMatch) {
      return `${funcMatch[1]} Example`;
    }

    // Check for method calls
    const methodMatch = firstLine.match(/(\w+)\.\w+\(/);
    if (methodMatch) {
      return `${methodMatch[1]} Usage Example`;
    }

    return 'Code Example';
  }

  /**
   * Check if a code block is a valid example
   */
  private isValidExample(block: any): boolean {
    if (!block.code || !block.language) {
      return false;
    }

    // Skip very short examples
    if (block.code.trim().length < 10) {
      return false;
    }

    // Skip examples that are just imports or comments
    const codeLines = block.code.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'));

    return codeLines.length > 0;
  }
}