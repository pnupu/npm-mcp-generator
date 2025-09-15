/**
 * Advanced function analyzer for comprehensive function analysis with relationships and usage patterns
 */

import { 
  FunctionInfo, 
  TypeDefinitionAnalysis, 
  ReadmeAnalysis, 
  ExampleAnalysis,
  UsageExample,
  CodeBlock
} from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface CompleteFunctionInfo extends FunctionInfo {
  signature: string;
  completeDescription: string;
  workingExamples: WorkingExample[];
  relatedFunctions: FunctionRelationship[];
  usagePatterns: UsagePattern[];
  category: FunctionCategory;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  commonUseCase: string[];
  errorHandling: ErrorHandlingInfo[];
  alternatives: AlternativeFunction[];
}

export interface WorkingExample {
  title: string;
  code: string;
  language: string;
  imports: string[];
  setup: string[];
  context: string;
  explanation: string;
  runnable: boolean;
}

export interface FunctionRelationship {
  functionName: string;
  relationshipType: 'commonly-used-with' | 'alternative-to' | 'prerequisite-for' | 'extends' | 'replaces' | 'composes-with' | 'transforms-output-of' | 'validates-input-for' | 'error-handler-for' | 'configuration-for';
  strength: number; // 0-1
  context: string;
  examples: string[];
}

export interface UsagePattern {
  type: 'import' | 'configuration' | 'basic-usage' | 'advanced-usage' | 'error-handling' | 'testing';
  pattern: string;
  frequency: number;
  context: string;
  relatedFunctions: string[];
  prerequisites: string[];
  examples: WorkingExample[];
  bestPractices: string[];
}

export interface ErrorHandlingInfo {
  errorType: string;
  description: string;
  solution: string;
  example: string;
}

export interface AlternativeFunction {
  name: string;
  reason: string;
  whenToUse: string;
  performanceComparison?: string;
  featureComparison: string[];
}

export type FunctionCategory = 
  | 'array-manipulation' 
  | 'object-manipulation' 
  | 'string-processing' 
  | 'utility' 
  | 'async' 
  | 'validation' 
  | 'transformation' 
  | 'filtering' 
  | 'aggregation' 
  | 'factory' 
  | 'predicate' 
  | 'getter' 
  | 'setter' 
  | 'action';

export class FunctionAnalyzer {
  /**
   * Analyze functions comprehensively with relationships and usage patterns
   */
  async analyze(
    typeDefinitions: TypeDefinitionAnalysis,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<AnalysisResult<CompleteFunctionInfo[]>> {
    const startTime = Date.now();

    try {
      const warnings: string[] = [];
      const completeFunctions: CompleteFunctionInfo[] = [];

      if (!typeDefinitions.functions || typeDefinitions.functions.length === 0) {
        warnings.push('No functions found in type definitions');
        return {
          success: true,
          data: [],
          warnings,
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
            version: '1.0.0',
            source: 'function-analyzer'
          }
        };
      }

      console.log(`🔍 Analyzing ${typeDefinitions.functions.length} functions...`);

      // Process each function
      for (const func of typeDefinitions.functions) {
        const completeFunction = await this.analyzeFunction(
          func,
          typeDefinitions,
          readmeAnalysis,
          examples
        );
        completeFunctions.push(completeFunction);
      }

      // Build relationships between functions
      console.log('🔗 Building function relationships...');
      this.buildFunctionRelationships(completeFunctions, readmeAnalysis, examples);

      // Identify alternatives
      console.log('🔄 Identifying alternative functions...');
      this.identifyAlternatives(completeFunctions);

      // Calculate usage pattern frequencies
      console.log('📊 Calculating usage pattern frequencies...');
      this.calculatePatternFrequencies(completeFunctions);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Function analysis complete in ${processingTime}ms`);

      return {
        success: true,
        data: completeFunctions,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'function-analyzer'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Function analysis failed: ${error}`,
          recoverable: false,
          suggestions: ['Check type definitions format', 'Verify function signatures']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'function-analyzer'
        }
      };
    }
  }

  private async analyzeFunction(
    func: FunctionInfo,
    typeDefinitions: TypeDefinitionAnalysis,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<CompleteFunctionInfo> {
    // Build complete signature
    const signature = this.buildCompleteSignature(func);

    // Extract complete description
    const completeDescription = this.extractCompleteDescription(func, readmeAnalysis);

    // Extract working examples
    const workingExamples = this.extractWorkingExamples(func, readmeAnalysis, examples);

    // Identify usage patterns
    const usagePatterns = this.identifyUsagePatterns(func, readmeAnalysis, examples);

    // Categorize function
    const category = this.categorizeFunction(func);

    // Assess complexity
    const complexity = this.assessComplexity(func, usagePatterns);

    // Identify common use cases
    const commonUseCase = this.identifyCommonUseCases(func, readmeAnalysis, examples);

    // Extract error handling information
    const errorHandling = this.extractErrorHandling(func, readmeAnalysis, examples);

    return {
      ...func,
      signature,
      completeDescription,
      workingExamples,
      relatedFunctions: [], // Will be populated by buildFunctionRelationships
      usagePatterns,
      category,
      complexity,
      commonUseCase,
      errorHandling,
      alternatives: [] // Will be populated by identifyAlternatives
    };
  }

  private buildCompleteSignature(func: FunctionInfo): string {
    const params = func.parameters
      .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`)
      .join(', ');

    const asyncPrefix = func.isAsync ? 'async ' : '';
    return `${asyncPrefix}${func.name}(${params}): ${func.returnType}`;
  }

  private extractCompleteDescription(func: FunctionInfo, readmeAnalysis: ReadmeAnalysis): string {
    // Start with function description from type definitions
    let description = func.description || '';

    // Look for additional description in README sections
    for (const section of readmeAnalysis.sections) {
      if (this.sectionMentionsFunction(section, func.name)) {
        const functionContext = this.extractFunctionContext(section.content, func.name);
        if (functionContext && functionContext.length > description.length) {
          description = functionContext;
        }
      }
    }

    // Look in usage examples for additional context
    for (const example of readmeAnalysis.usageExamples) {
      if (example.code.includes(func.name) && example.description) {
        if (!description.includes(example.description)) {
          description += description ? ` ${example.description}` : example.description;
        }
      }
    }

    return description || `Function ${func.name} with ${func.parameters.length} parameters`;
  }

  private extractWorkingExamples(
    func: FunctionInfo,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): WorkingExample[] {
    const workingExamples: WorkingExample[] = [];

    // Extract from README usage examples
    for (const example of readmeAnalysis.usageExamples) {
      if (example.code.includes(func.name)) {
        workingExamples.push({
          title: example.title || `${func.name} Example`,
          code: example.code,
          language: example.language,
          imports: example.imports,
          setup: this.extractSetupCode(example.code),
          context: example.description,
          explanation: this.generateExplanation(func, example.code),
          runnable: this.isRunnableExample(example.code, example.language)
        });
      }
    }

    // Extract from README code blocks
    for (const codeBlock of readmeAnalysis.codeBlocks) {
      if (codeBlock.code.includes(func.name) && codeBlock.isExample) {
        const imports = this.extractImports(codeBlock.code, codeBlock.language);
        workingExamples.push({
          title: codeBlock.context || `${func.name} Code Example`,
          code: codeBlock.code,
          language: codeBlock.language,
          imports,
          setup: this.extractSetupCode(codeBlock.code),
          context: codeBlock.context || '',
          explanation: this.generateExplanation(func, codeBlock.code),
          runnable: this.isRunnableExample(codeBlock.code, codeBlock.language)
        });
      }
    }

    // Extract from example files
    for (const example of examples) {
      if (example.content.includes(func.name)) {
        workingExamples.push({
          title: `${func.name} from ${example.filePath}`,
          code: example.content,
          language: example.language,
          imports: example.imports,
          setup: this.extractSetupCode(example.content),
          context: `Example from ${example.filePath}`,
          explanation: this.generateExplanation(func, example.content),
          runnable: this.isRunnableExample(example.content, example.language)
        });
      }
    }

    // Enhance examples with missing imports and setup
    return workingExamples.map(example => this.enhanceExample(example, func));
  }

  private identifyUsagePatterns(
    func: FunctionInfo,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): UsagePattern[] {
    const patterns: UsagePattern[] = [];
    const patternMap = new Map<string, UsagePattern>();

    // Analyze patterns from all sources
    const allCodeSources = [
      ...readmeAnalysis.codeBlocks.map(cb => ({ code: cb.code, language: cb.language, source: 'readme' })),
      ...readmeAnalysis.usageExamples.map(ue => ({ code: ue.code, language: ue.language, source: 'readme' })),
      ...examples.map(ex => ({ code: ex.content, language: ex.language, source: 'examples' }))
    ];

    for (const source of allCodeSources) {
      if (source.code.includes(func.name)) {
        const extractedPatterns = this.extractPatternsFromCode(func, source.code, source.language);
        
        for (const pattern of extractedPatterns) {
          const key = `${pattern.type}:${pattern.pattern}`;
          if (patternMap.has(key)) {
            const existing = patternMap.get(key)!;
            existing.frequency++;
            existing.examples.push(...pattern.examples);
          } else {
            patternMap.set(key, pattern);
          }
        }
      }
    }

    return Array.from(patternMap.values());
  }

  private extractPatternsFromCode(func: FunctionInfo, code: string, language: string): UsagePattern[] {
    const patterns: UsagePattern[] = [];

    // Import patterns
    const importPattern = this.extractImportPattern(func, code, language);
    if (importPattern) patterns.push(importPattern);

    // Basic usage patterns
    const usagePatterns = this.extractUsagePatterns(func, code, language);
    patterns.push(...usagePatterns);

    // Error handling patterns
    const errorPattern = this.extractErrorHandlingPattern(func, code, language);
    if (errorPattern) patterns.push(errorPattern);

    // Configuration patterns
    const configPattern = this.extractConfigurationPattern(func, code, language);
    if (configPattern) patterns.push(configPattern);

    return patterns;
  }

  private extractImportPattern(func: FunctionInfo, code: string, language: string): UsagePattern | null {
    if (!['javascript', 'typescript', 'js', 'ts'].includes(language)) return null;

    const importRegex = new RegExp(`import.*${func.name}.*from.*`, 'g');
    const requireRegex = new RegExp(`.*require.*${func.name}.*`, 'g');
    
    const importMatch = code.match(importRegex) || code.match(requireRegex);
    if (importMatch) {
      return {
        type: 'import',
        pattern: importMatch[0].trim(),
        frequency: 1,
        context: 'Function import',
        relatedFunctions: [],
        prerequisites: [],
        examples: [{
          title: `Import ${func.name}`,
          code: importMatch[0].trim(),
          language,
          imports: [],
          setup: [],
          context: 'Import statement',
          explanation: `Import the ${func.name} function`,
          runnable: false
        }],
        bestPractices: [`Import ${func.name} at the top of your file`]
      };
    }

    return null;
  }

  private extractUsagePatterns(func: FunctionInfo, code: string, language: string): UsagePattern[] {
    const patterns: UsagePattern[] = [];
    
    // Find function calls with more flexible regex
    const callRegex = new RegExp(`\\b${func.name}\\s*\\([^)]*\\)`, 'g');
    const calls = code.match(callRegex);
    
    if (calls) {
      for (const call of calls) {
        const complexity = this.assessCallComplexity(call);
        const type = complexity === 'advanced' ? 'advanced-usage' : 'basic-usage';
        
        patterns.push({
          type,
          pattern: call,
          frequency: 1,
          context: `${func.name} function call`,
          relatedFunctions: this.extractRelatedFunctionsFromCall(code, call),
          prerequisites: this.extractPrerequisites(code, call),
          examples: [{
            title: `${func.name} Usage`,
            code: this.extractCallContext(code, call),
            language,
            imports: this.extractImports(code, language),
            setup: this.extractSetupCode(code),
            context: 'Function usage',
            explanation: this.generateCallExplanation(func, call),
            runnable: this.isRunnableExample(code, language)
          }],
          bestPractices: this.generateBestPractices(func, call)
        });
      }
    }

    return patterns;
  }

  private extractErrorHandlingPattern(func: FunctionInfo, code: string, language: string): UsagePattern | null {
    if (!code.includes(func.name)) return null;

    const errorPatterns = [
      /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g,
      /\.catch\s*\([^)]+\)/g,
      /throw\s+new\s+\w+/g
    ];

    for (const pattern of errorPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.some(match => match.includes(func.name))) {
        const errorHandlingCode = matches.find(match => match.includes(func.name))!;
        
        return {
          type: 'error-handling',
          pattern: errorHandlingCode,
          frequency: 1,
          context: 'Error handling',
          relatedFunctions: [],
          prerequisites: [],
          examples: [{
            title: `${func.name} Error Handling`,
            code: errorHandlingCode,
            language,
            imports: this.extractImports(code, language),
            setup: [],
            context: 'Error handling example',
            explanation: `Error handling for ${func.name}`,
            runnable: false
          }],
          bestPractices: [`Always handle errors when using ${func.name}`]
        };
      }
    }

    return null;
  }

  private extractConfigurationPattern(func: FunctionInfo, code: string, language: string): UsagePattern | null {
    if (!code.includes(func.name)) return null;

    // Look for configuration objects passed to the function
    const configRegex = new RegExp(`${func.name}\\s*\\([^)]*\\{[^}]*\\}[^)]*\\)`, 'g');
    const configCalls = code.match(configRegex);

    if (configCalls) {
      return {
        type: 'configuration',
        pattern: configCalls[0],
        frequency: 1,
        context: 'Configuration usage',
        relatedFunctions: [],
        prerequisites: [],
        examples: [{
          title: `${func.name} Configuration`,
          code: configCalls[0],
          language,
          imports: [],
          setup: [],
          context: 'Configuration example',
          explanation: `Configuration options for ${func.name}`,
          runnable: false
        }],
        bestPractices: [`Configure ${func.name} with appropriate options`]
      };
    }

    return null;
  }

  private categorizeFunction(func: FunctionInfo): FunctionCategory {
    const name = func.name.toLowerCase();
    const returnType = func.returnType.toLowerCase();

    // Validation (check before string processing)
    if (name.startsWith('is') || name.startsWith('has') || name.includes('valid')) {
      return 'validation';
    }

    // Array manipulation
    if (name.includes('map') || name.includes('filter') || name.includes('reduce') || 
        name.includes('sort') || name.includes('slice') || name.includes('splice')) {
      return 'array-manipulation';
    }

    // Object manipulation
    if (name.includes('merge') || name.includes('assign') || name.includes('clone') || 
        name.includes('pick') || name.includes('omit')) {
      return 'object-manipulation';
    }

    // Async operations
    if (func.isAsync || returnType.includes('promise')) {
      return 'async';
    }

    // Getters
    if (name.startsWith('get') || name.startsWith('fetch')) {
      return 'getter';
    }

    // Setters
    if (name.startsWith('set') || name.startsWith('update')) {
      return 'setter';
    }

    // Factory functions
    if (name.startsWith('create') || name.startsWith('make') || name.startsWith('build')) {
      return 'factory';
    }

    // Predicates
    if (returnType.includes('boolean')) {
      return 'predicate';
    }

    // Actions (void return)
    if (returnType === 'void') {
      return 'action';
    }

    // String processing
    if (name.includes('string') || name.includes('text') || name.includes('format') ||
        returnType.includes('string')) {
      return 'string-processing';
    }

    return 'utility';
  }

  private assessComplexity(func: FunctionInfo, patterns: UsagePattern[]): 'beginner' | 'intermediate' | 'advanced' {
    let complexityScore = 0;

    // Parameter complexity
    if (func.parameters.length > 3) complexityScore += 1;
    if (func.parameters.some(p => p.type.includes('|') || p.type.includes('&'))) complexityScore += 1;
    if (func.parameters.some(p => p.type.includes('function') || p.type.includes('=>'))) complexityScore += 2;

    // Return type complexity
    if (func.returnType.includes('Promise')) complexityScore += 1;
    if (func.returnType.includes('|') || func.returnType.includes('&')) complexityScore += 1;

    // Usage pattern complexity
    const hasAdvancedPatterns = patterns.some(p => p.type === 'advanced-usage');
    if (hasAdvancedPatterns) complexityScore += 2;

    const hasErrorHandling = patterns.some(p => p.type === 'error-handling');
    if (hasErrorHandling) complexityScore += 1;

    if (complexityScore >= 4) return 'advanced';
    if (complexityScore >= 2) return 'intermediate';
    return 'beginner';
  }

  private identifyCommonUseCases(
    func: FunctionInfo,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): string[] {
    const useCases: string[] = [];

    // Extract from function description
    if (func.description) {
      const description = func.description.toLowerCase();
      if (description.includes('filter')) useCases.push('Data filtering');
      if (description.includes('transform')) useCases.push('Data transformation');
      if (description.includes('validate')) useCases.push('Input validation');
      if (description.includes('format')) useCases.push('Data formatting');
      if (description.includes('parse')) useCases.push('Data parsing');
    }

    // Extract from usage examples
    for (const example of readmeAnalysis.usageExamples) {
      if (example.code.includes(func.name)) {
        if (example.description) {
          useCases.push(example.description);
        }
        if (example.title && !useCases.includes(example.title)) {
          useCases.push(example.title);
        }
      }
    }

    return [...new Set(useCases)].slice(0, 5); // Limit to top 5 use cases
  }

  private extractErrorHandling(
    func: FunctionInfo,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): ErrorHandlingInfo[] {
    const errorHandling: ErrorHandlingInfo[] = [];

    // Look for error handling in examples
    const allCode = [
      ...readmeAnalysis.codeBlocks.map(cb => cb.code),
      ...readmeAnalysis.usageExamples.map(ue => ue.code),
      ...examples.map(ex => ex.content)
    ];

    for (const code of allCode) {
      if (code.includes(func.name)) {
        // Look for try-catch blocks
        const tryCatchRegex = /try\s*{[\s\S]*?}\s*catch\s*\(([^)]*)\)\s*{([\s\S]*?)}/g;
        let match;
        while ((match = tryCatchRegex.exec(code)) !== null) {
          if (match[0].includes(func.name)) {
            errorHandling.push({
              errorType: match[1] || 'Error',
              description: `Error handling for ${func.name}`,
              solution: 'Use try-catch block',
              example: match[0]
            });
          }
        }

        // Look for .catch() calls
        const catchRegex = /\.catch\s*\(\s*([^)]+)\s*\)/g;
        while ((match = catchRegex.exec(code)) !== null) {
          if (code.substring(0, match.index).includes(func.name)) {
            errorHandling.push({
              errorType: 'Promise rejection',
              description: `Promise error handling for ${func.name}`,
              solution: 'Use .catch() method',
              example: match[0]
            });
          }
        }
      }
    }

    return errorHandling;
  }

  private buildFunctionRelationships(
    functions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): void {
    // Build co-occurrence matrix
    const coOccurrence = new Map<string, Map<string, number>>();
    
    // Initialize matrix
    for (const func of functions) {
      coOccurrence.set(func.name, new Map());
    }

    // Analyze co-occurrence in all code sources
    const allCode = [
      ...readmeAnalysis.codeBlocks.map(cb => cb.code),
      ...readmeAnalysis.usageExamples.map(ue => ue.code),
      ...examples.map(ex => ex.content)
    ];

    for (const code of allCode) {
      const functionsInCode = functions.filter(f => code.includes(f.name));
      
      // Record co-occurrences
      for (let i = 0; i < functionsInCode.length; i++) {
        for (let j = i + 1; j < functionsInCode.length; j++) {
          const func1 = functionsInCode[i].name;
          const func2 = functionsInCode[j].name;
          
          const map1 = coOccurrence.get(func1)!;
          const map2 = coOccurrence.get(func2)!;
          
          map1.set(func2, (map1.get(func2) || 0) + 1);
          map2.set(func1, (map2.get(func1) || 0) + 1);
        }
      }
    }

    // Build relationships based on co-occurrence
    for (const func of functions) {
      const relationships: FunctionRelationship[] = [];
      const coOccurrenceMap = coOccurrence.get(func.name)!;
      
      for (const [relatedFunc, count] of coOccurrenceMap.entries()) {
        if (count > 0) {
          const strength = Math.min(count / 10, 1); // Normalize to 0-1
          
          relationships.push({
            functionName: relatedFunc,
            relationshipType: 'commonly-used-with',
            strength,
            context: `Often used together in examples`,
            examples: this.findRelationshipExamples(func.name, relatedFunc, allCode)
          });
        }
      }

      // Sort by strength and keep top relationships
      func.relatedFunctions = relationships
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5);
    }
  }

  private identifyAlternatives(functions: CompleteFunctionInfo[]): void {
    for (const func of functions) {
      const alternatives: AlternativeFunction[] = [];

      // Find functions with similar categories and purposes
      const similarFunctions = functions.filter(f => 
        f.name !== func.name && 
        f.category === func.category &&
        this.haveSimilarPurpose(func, f)
      );

      for (const similar of similarFunctions) {
        alternatives.push({
          name: similar.name,
          reason: `Alternative ${func.category} function`,
          whenToUse: this.generateWhenToUse(func, similar),
          featureComparison: this.compareFeatures(func, similar)
        });
      }

      func.alternatives = alternatives.slice(0, 3); // Keep top 3 alternatives
    }
  }

  private calculatePatternFrequencies(functions: CompleteFunctionInfo[]): void {
    const patternCounts = new Map<string, number>();

    // Count pattern occurrences across all functions
    for (const func of functions) {
      for (const pattern of func.usagePatterns) {
        const key = `${pattern.type}:${pattern.pattern}`;
        patternCounts.set(key, (patternCounts.get(key) || 0) + pattern.frequency);
      }
    }

    // Update frequencies
    for (const func of functions) {
      for (const pattern of func.usagePatterns) {
        const key = `${pattern.type}:${pattern.pattern}`;
        pattern.frequency = patternCounts.get(key) || 1;
      }
    }
  }

  // Helper methods
  private sectionMentionsFunction(section: any, functionName: string): boolean {
    return section.content.toLowerCase().includes(functionName.toLowerCase()) ||
           section.title.toLowerCase().includes(functionName.toLowerCase());
  }

  private extractFunctionContext(content: string, functionName: string): string {
    const lines = content.split('\n');
    const functionLine = lines.findIndex(line => line.includes(functionName));
    
    if (functionLine !== -1) {
      // Get surrounding context
      const start = Math.max(0, functionLine - 2);
      const end = Math.min(lines.length, functionLine + 3);
      return lines.slice(start, end).join(' ').trim();
    }
    
    return '';
  }

  private extractSetupCode(code: string): string[] {
    const setup: string[] = [];
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
        setup.push(trimmed);
      }
    }
    
    return setup;
  }

  private generateExplanation(func: FunctionInfo, code: string): string {
    return `Example showing how to use ${func.name} with ${func.parameters.length} parameters`;
  }

  private isRunnableExample(code: string, language: string): boolean {
    if (!['javascript', 'typescript', 'js', 'ts'].includes(language)) return false;
    
    // Check if it has imports and actual function calls, or if it's a simple standalone example
    return code.includes('import') || code.includes('require') || 
           (code.includes('(') && code.includes(')') && code.length > 10);
  }

  private enhanceExample(example: WorkingExample, func: FunctionInfo): WorkingExample {
    // Add missing imports if needed
    if (example.imports.length === 0 && example.code.includes(func.name)) {
      example.imports = [`// Import ${func.name} from your package`];
    }

    // Add setup code if missing
    if (example.setup.length === 0) {
      example.setup = [`// Setup for ${func.name} example`];
    }

    return example;
  }

  private extractImports(code: string, language: string): string[] {
    const imports: string[] = [];
    
    if (['javascript', 'typescript', 'js', 'ts'].includes(language)) {
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
      while ((match = requireRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return [...new Set(imports)];
  }

  private assessCallComplexity(call: string): 'basic' | 'advanced' {
    // Simple heuristics for complexity
    if (call.includes('=>') || call.includes('function') || call.includes('{')) {
      return 'advanced';
    }
    return 'basic';
  }

  private extractRelatedFunctionsFromCall(code: string, call: string): string[] {
    // Look for other function calls in the same context
    const context = this.extractCallContext(code, call);
    const functionCalls = context.match(/\w+\s*\(/g) || [];
    
    return functionCalls
      .map(match => match.replace(/\s*\($/, ''))
      .filter(name => name !== call.split('(')[0]);
  }

  private extractPrerequisites(code: string, call: string): string[] {
    const prerequisites: string[] = [];
    const context = this.extractCallContext(code, call);
    
    // Look for variable declarations that might be prerequisites
    const varDeclarations = context.match(/(?:const|let|var)\s+\w+/g) || [];
    prerequisites.push(...varDeclarations);
    
    return prerequisites;
  }

  private extractCallContext(code: string, call: string): string {
    const callIndex = code.indexOf(call);
    if (callIndex === -1) return call;
    
    // Get surrounding context (100 characters before and after)
    const start = Math.max(0, callIndex - 100);
    const end = Math.min(code.length, callIndex + call.length + 100);
    
    return code.substring(start, end);
  }

  private generateCallExplanation(func: FunctionInfo, call: string): string {
    return `This example shows how to call ${func.name} with the provided parameters`;
  }

  private generateBestPractices(func: FunctionInfo, call: string): string[] {
    const practices: string[] = [];
    
    if (func.isAsync) {
      practices.push('Use await or .then() for async functions');
    }
    
    if (func.parameters.some(p => !p.optional)) {
      practices.push('Ensure all required parameters are provided');
    }
    
    practices.push(`Check the return type: ${func.returnType}`);
    
    return practices;
  }

  private findRelationshipExamples(func1: string, func2: string, allCode: string[]): string[] {
    const examples: string[] = [];
    
    for (const code of allCode) {
      if (code.includes(func1) && code.includes(func2)) {
        // Extract a small snippet showing both functions
        const lines = code.split('\n');
        const relevantLines = lines.filter(line => 
          line.includes(func1) || line.includes(func2)
        );
        
        if (relevantLines.length > 0) {
          examples.push(relevantLines.join('\n'));
        }
      }
    }
    
    return examples.slice(0, 2); // Keep top 2 examples
  }

  private haveSimilarPurpose(func1: CompleteFunctionInfo, func2: CompleteFunctionInfo): boolean {
    // Simple similarity check based on name patterns and return types
    const name1 = func1.name.toLowerCase();
    const name2 = func2.name.toLowerCase();
    
    // Check for similar prefixes or suffixes
    const prefixes = ['get', 'set', 'is', 'has', 'create', 'make', 'find', 'filter'];
    const func1Prefix = prefixes.find(p => name1.startsWith(p));
    const func2Prefix = prefixes.find(p => name2.startsWith(p));
    
    if (func1Prefix && func2Prefix && func1Prefix === func2Prefix) {
      return true;
    }
    
    // Check return type similarity
    return func1.returnType === func2.returnType;
  }

  private generateWhenToUse(func1: CompleteFunctionInfo, func2: CompleteFunctionInfo): string {
    if (func1.complexity !== func2.complexity) {
      return func1.complexity === 'beginner' 
        ? `Use ${func1.name} for simpler cases, ${func2.name} for more complex scenarios`
        : `Use ${func2.name} for simpler cases, ${func1.name} for more complex scenarios`;
    }
    
    return `Both functions serve similar purposes, choose based on your specific requirements`;
  }

  private compareFeatures(func1: CompleteFunctionInfo, func2: CompleteFunctionInfo): string[] {
    const features: string[] = [];
    
    if (func1.parameters.length !== func2.parameters.length) {
      features.push(`${func1.name} has ${func1.parameters.length} parameters, ${func2.name} has ${func2.parameters.length}`);
    }
    
    if (func1.isAsync !== func2.isAsync) {
      const asyncFunc = func1.isAsync ? func1.name : func2.name;
      const syncFunc = func1.isAsync ? func2.name : func1.name;
      features.push(`${asyncFunc} is async, ${syncFunc} is synchronous`);
    }
    
    if (func1.returnType !== func2.returnType) {
      features.push(`${func1.name} returns ${func1.returnType}, ${func2.name} returns ${func2.returnType}`);
    }
    
    return features;
  }
}