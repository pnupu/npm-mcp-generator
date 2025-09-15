/**
 * Comprehensive function relationship analysis and mapping system
 */

import { 
  CompleteFunctionInfo, 
  FunctionRelationship, 
  UsagePattern, 
  WorkingExample 
} from './FunctionAnalyzer.js';
import { 
  ReadmeAnalysis, 
  ExampleAnalysis, 
  TypeDefinitionAnalysis 
} from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface FunctionRelationshipMap {
  functionName: string;
  relationships: EnhancedFunctionRelationship[];
  relationshipScore: number;
  contextualInfo: RelationshipContext;
}

export interface EnhancedFunctionRelationship extends FunctionRelationship {
  confidence: number; // 0-1 confidence in the relationship
  evidenceCount: number; // Number of pieces of evidence supporting this relationship
  contextExamples: RelationshipExample[];
  useCaseReasons: string[];
  strengthFactors: RelationshipStrengthFactor[];
}

export interface RelationshipExample {
  title: string;
  code: string;
  language: string;
  explanation: string;
  demonstratesRelationship: string;
  source: 'readme' | 'examples' | 'documentation' | 'type-definitions';
}

export interface RelationshipStrengthFactor {
  factor: 'co-occurrence' | 'parameter-compatibility' | 'return-type-compatibility' | 'semantic-similarity' | 'documentation-mention' | 'usage-pattern-similarity';
  weight: number; // 0-1
  evidence: string;
}

export interface RelationshipContext {
  commonUseCases: string[];
  typicalWorkflows: WorkflowStep[];
  prerequisiteChains: PrerequisiteChain[];
  alternativeGroups: AlternativeGroup[];
}

export interface WorkflowStep {
  step: number;
  description: string;
  functions: string[];
  example: string;
}

export interface PrerequisiteChain {
  target: string;
  prerequisites: string[];
  reason: string;
  example: string;
}

export interface AlternativeGroup {
  purpose: string;
  alternatives: AlternativeOption[];
  recommendation: string;
}

export interface AlternativeOption {
  functionName: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  performanceNotes?: string;
}

export type RelationshipType = 
  | 'commonly-used-with'
  | 'alternative-to'
  | 'prerequisite-for'
  | 'extends'
  | 'replaces'
  | 'composes-with'
  | 'transforms-output-of'
  | 'validates-input-for'
  | 'error-handler-for'
  | 'configuration-for';

export class RelationshipBuilder {
  private packageName: string;

  constructor(packageName: string) {
    this.packageName = packageName;
  }

  /**
   * Build comprehensive function relationships with context and examples
   */
  async buildRelationships(
    functions: CompleteFunctionInfo[],
    typeDefinitions: TypeDefinitionAnalysis,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<AnalysisResult<FunctionRelationshipMap[]>> {
    const startTime = Date.now();

    try {
      console.log(`🔗 Building relationships for ${functions.length} functions...`);

      const relationshipMaps: FunctionRelationshipMap[] = [];

      // Build co-occurrence matrix
      const coOccurrenceMatrix = this.buildCoOccurrenceMatrix(functions, readmeAnalysis, examples);

      // Analyze semantic relationships
      const semanticRelationships = this.analyzeSemanticRelationships(functions, typeDefinitions);

      // Extract workflow patterns
      const workflowPatterns = this.extractWorkflowPatterns(functions, readmeAnalysis, examples);

      // Build prerequisite chains
      const prerequisiteChains = this.buildPrerequisiteChains(functions, readmeAnalysis, examples);

      // Identify alternative groups
      const alternativeGroups = this.identifyAlternativeGroups(functions);

      // Process each function
      for (const func of functions) {
        const relationshipMap = await this.buildFunctionRelationshipMap(
          func,
          functions,
          coOccurrenceMatrix,
          semanticRelationships,
          workflowPatterns,
          prerequisiteChains,
          alternativeGroups,
          readmeAnalysis,
          examples
        );

        relationshipMaps.push(relationshipMap);
      }

      // Calculate relationship scores
      this.calculateRelationshipScores(relationshipMaps);

      console.log(`✅ Relationship building complete for ${relationshipMaps.length} functions`);

      return {
        success: true,
        data: relationshipMaps,
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'relationship-builder'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Relationship building failed: ${error}`,
          recoverable: false,
          suggestions: ['Check function data format', 'Verify analysis inputs']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'relationship-builder'
        }
      };
    }
  }

  /**
   * Build co-occurrence matrix for functions
   */
  private buildCoOccurrenceMatrix(
    functions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    // Initialize matrix
    for (const func of functions) {
      matrix.set(func.name, new Map());
    }

    // Collect all code sources
    const codeSources = [
      ...readmeAnalysis.codeBlocks.map(cb => ({ code: cb.code, source: 'readme-block' })),
      ...readmeAnalysis.usageExamples.map(ue => ({ code: ue.code, source: 'readme-example' })),
      ...examples.map(ex => ({ code: ex.content, source: ex.filePath }))
    ];

    // Analyze co-occurrence in each code source
    for (const source of codeSources) {
      const functionsInCode = functions.filter(f => source.code.includes(f.name));
      
      // Record co-occurrences with higher weight for closer proximity
      for (let i = 0; i < functionsInCode.length; i++) {
        for (let j = i + 1; j < functionsInCode.length; j++) {
          const func1 = functionsInCode[i].name;
          const func2 = functionsInCode[j].name;
          
          // Calculate proximity weight
          const proximity = this.calculateProximity(source.code, func1, func2);
          const weight = proximity > 0 ? Math.max(1, 3 - proximity / 100) : 1;
          
          const map1 = matrix.get(func1)!;
          const map2 = matrix.get(func2)!;
          
          map1.set(func2, (map1.get(func2) || 0) + weight);
          map2.set(func1, (map2.get(func1) || 0) + weight);
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate proximity between two functions in code
   */
  private calculateProximity(code: string, func1: string, func2: string): number {
    const index1 = code.indexOf(func1);
    const index2 = code.indexOf(func2);
    
    if (index1 === -1 || index2 === -1) return -1;
    
    return Math.abs(index1 - index2);
  }

  /**
   * Analyze semantic relationships based on function signatures and types
   */
  private analyzeSemanticRelationships(
    functions: CompleteFunctionInfo[],
    typeDefinitions: TypeDefinitionAnalysis
  ): Map<string, SemanticRelationship[]> {
    const relationships = new Map<string, SemanticRelationship[]>();

    for (const func of functions) {
      const semanticRels: SemanticRelationship[] = [];

      for (const otherFunc of functions) {
        if (func.name === otherFunc.name) continue;

        // Check parameter compatibility
        const paramCompatibility = this.checkParameterCompatibility(func, otherFunc);
        if (paramCompatibility.compatible) {
          semanticRels.push({
            targetFunction: otherFunc.name,
            type: 'parameter-compatible',
            strength: paramCompatibility.strength,
            reason: paramCompatibility.reason
          });
        }

        // Check return type compatibility
        const returnCompatibility = this.checkReturnTypeCompatibility(func, otherFunc);
        if (returnCompatibility.compatible) {
          semanticRels.push({
            targetFunction: otherFunc.name,
            type: 'return-compatible',
            strength: returnCompatibility.strength,
            reason: returnCompatibility.reason
          });
        }

        // Check name similarity
        const nameSimilarity = this.calculateNameSimilarity(func.name, otherFunc.name);
        if (nameSimilarity > 0.6) {
          semanticRels.push({
            targetFunction: otherFunc.name,
            type: 'name-similar',
            strength: nameSimilarity,
            reason: `Similar function names suggest related functionality`
          });
        }

        // Check category similarity
        if (func.category === otherFunc.category) {
          semanticRels.push({
            targetFunction: otherFunc.name,
            type: 'category-similar',
            strength: 0.7,
            reason: `Both functions belong to ${func.category} category`
          });
        }
      }

      relationships.set(func.name, semanticRels);
    }

    return relationships;
  }

  /**
   * Extract workflow patterns from code examples
   */
  private extractWorkflowPatterns(
    functions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): WorkflowStep[] {
    const workflows: WorkflowStep[] = [];

    // Analyze code blocks for sequential function usage
    const codeSources = [
      ...readmeAnalysis.codeBlocks.map(cb => cb.code),
      ...readmeAnalysis.usageExamples.map(ue => ue.code),
      ...examples.map(ex => ex.content)
    ];

    for (const code of codeSources) {
      const workflow = this.extractWorkflowFromCode(code, functions);
      if (workflow.length > 1) {
        workflows.push(...workflow);
      }
    }

    return this.consolidateWorkflows(workflows);
  }

  /**
   * Extract workflow steps from a single code block
   */
  private extractWorkflowFromCode(code: string, functions: CompleteFunctionInfo[]): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    const lines = code.split('\n').filter(line => line.trim().length > 0);

    let stepNumber = 1;
    for (const line of lines) {
      const functionsInLine = functions.filter(f => line.includes(f.name));
      
      if (functionsInLine.length > 0) {
        steps.push({
          step: stepNumber++,
          description: this.generateStepDescription(line, functionsInLine),
          functions: functionsInLine.map(f => f.name),
          example: line.trim()
        });
      }
    }

    return steps;
  }

  /**
   * Build prerequisite chains
   */
  private buildPrerequisiteChains(
    functions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): PrerequisiteChain[] {
    const chains: PrerequisiteChain[] = [];

    // Analyze patterns to identify prerequisites
    for (const func of functions) {
      const prerequisites = this.identifyPrerequisites(func, functions, readmeAnalysis, examples);
      
      if (prerequisites.length > 0) {
        chains.push({
          target: func.name,
          prerequisites: prerequisites.map(p => p.functionName),
          reason: prerequisites.map(p => p.reason).join('; '),
          example: this.findPrerequisiteExample(func.name, prerequisites, readmeAnalysis, examples)
        });
      }
    }

    return chains;
  }

  /**
   * Identify alternative function groups
   */
  private identifyAlternativeGroups(functions: CompleteFunctionInfo[]): AlternativeGroup[] {
    const groups: AlternativeGroup[] = [];
    const processed = new Set<string>();

    for (const func of functions) {
      if (processed.has(func.name)) continue;

      const alternatives = functions.filter(f => 
        f.name !== func.name && 
        !processed.has(f.name) &&
        this.areAlternatives(func, f)
      );

      if (alternatives.length > 0) {
        const group: AlternativeGroup = {
          purpose: this.generateGroupPurpose(func, alternatives),
          alternatives: [
            this.createAlternativeOption(func),
            ...alternatives.map(alt => this.createAlternativeOption(alt))
          ],
          recommendation: this.generateRecommendation(func, alternatives)
        };

        groups.push(group);
        processed.add(func.name);
        alternatives.forEach(alt => processed.add(alt.name));
      }
    }

    return groups;
  }

  /**
   * Build comprehensive relationship map for a single function
   */
  private async buildFunctionRelationshipMap(
    func: CompleteFunctionInfo,
    allFunctions: CompleteFunctionInfo[],
    coOccurrenceMatrix: Map<string, Map<string, number>>,
    semanticRelationships: Map<string, SemanticRelationship[]>,
    workflowPatterns: WorkflowStep[],
    prerequisiteChains: PrerequisiteChain[],
    alternativeGroups: AlternativeGroup[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<FunctionRelationshipMap> {
    const relationships: EnhancedFunctionRelationship[] = [];

    // Build relationships from co-occurrence
    const coOccurrences = coOccurrenceMatrix.get(func.name) || new Map();
    for (const [relatedFunc, count] of coOccurrences.entries()) {
      if (count > 0) {
        const relationship = await this.buildCoOccurrenceRelationship(
          func,
          relatedFunc,
          count,
          allFunctions,
          readmeAnalysis,
          examples
        );
        relationships.push(relationship);
      }
    }

    // Build relationships from semantic analysis
    const semanticRels = semanticRelationships.get(func.name) || [];
    for (const semanticRel of semanticRels) {
      const relationship = await this.buildSemanticRelationship(
        func,
        semanticRel,
        allFunctions,
        readmeAnalysis,
        examples
      );
      relationships.push(relationship);
    }

    // Build relationships from workflow patterns
    const workflowRels = this.buildWorkflowRelationships(func, workflowPatterns);
    relationships.push(...workflowRels);

    // Build prerequisite relationships
    const prerequisiteRels = this.buildPrerequisiteRelationships(func, prerequisiteChains);
    relationships.push(...prerequisiteRels);

    // Build alternative relationships
    const alternativeRels = this.buildAlternativeRelationships(func, alternativeGroups);
    relationships.push(...alternativeRels);

    // Deduplicate and merge similar relationships
    const mergedRelationships = this.mergeRelationships(relationships);

    // Build contextual information
    const contextualInfo = this.buildContextualInfo(
      func,
      workflowPatterns,
      prerequisiteChains,
      alternativeGroups
    );

    return {
      functionName: func.name,
      relationships: mergedRelationships,
      relationshipScore: this.calculateFunctionRelationshipScore(mergedRelationships),
      contextualInfo
    };
  }

  /**
   * Build relationship from co-occurrence data
   */
  private async buildCoOccurrenceRelationship(
    func: CompleteFunctionInfo,
    relatedFuncName: string,
    count: number,
    allFunctions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<EnhancedFunctionRelationship> {
    const relatedFunc = allFunctions.find(f => f.name === relatedFuncName);
    const strength = Math.min(count / 10, 1); // Normalize to 0-1
    
    const contextExamples = this.findRelationshipExamples(
      func.name,
      relatedFuncName,
      readmeAnalysis,
      examples
    );

    const strengthFactors: RelationshipStrengthFactor[] = [
      {
        factor: 'co-occurrence',
        weight: strength,
        evidence: `Functions appear together ${count} times in examples`
      }
    ];

    return {
      functionName: relatedFuncName,
      relationshipType: 'commonly-used-with',
      strength,
      context: `Functions are commonly used together in examples`,
      examples: contextExamples.map(ex => ex.code),
      confidence: Math.min(count / 5, 1),
      evidenceCount: count,
      contextExamples,
      useCaseReasons: this.generateUseCaseReasons(func, relatedFunc),
      strengthFactors
    };
  }

  /**
   * Build relationship from semantic analysis
   */
  private async buildSemanticRelationship(
    func: CompleteFunctionInfo,
    semanticRel: SemanticRelationship,
    allFunctions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): Promise<EnhancedFunctionRelationship> {
    const relatedFunc = allFunctions.find(f => f.name === semanticRel.targetFunction);
    
    const relationshipType = this.mapSemanticTypeToRelationshipType(semanticRel.type);
    
    const contextExamples = this.findRelationshipExamples(
      func.name,
      semanticRel.targetFunction,
      readmeAnalysis,
      examples
    );

    const strengthFactors: RelationshipStrengthFactor[] = [
      {
        factor: this.mapSemanticTypeToStrengthFactor(semanticRel.type),
        weight: semanticRel.strength,
        evidence: semanticRel.reason
      }
    ];

    return {
      functionName: semanticRel.targetFunction,
      relationshipType,
      strength: semanticRel.strength,
      context: semanticRel.reason,
      examples: contextExamples.map(ex => ex.code),
      confidence: semanticRel.strength,
      evidenceCount: 1,
      contextExamples,
      useCaseReasons: this.generateUseCaseReasons(func, relatedFunc),
      strengthFactors
    };
  }

  /**
   * Calculate relationship scores for all functions
   */
  private calculateRelationshipScores(relationshipMaps: FunctionRelationshipMap[]): void {
    for (const map of relationshipMaps) {
      let totalScore = 0;
      let relationshipCount = 0;

      for (const rel of map.relationships) {
        totalScore += rel.strength * rel.confidence;
        relationshipCount++;
      }

      map.relationshipScore = relationshipCount > 0 ? totalScore / relationshipCount : 0;
    }
  }

  // Helper methods for relationship analysis

  private checkParameterCompatibility(
    func1: CompleteFunctionInfo,
    func2: CompleteFunctionInfo
  ): { compatible: boolean; strength: number; reason: string } {
    // Check if func1's return type matches any of func2's parameter types
    for (const param of func2.parameters) {
      if (this.typesAreCompatible(func1.returnType, param.type)) {
        return {
          compatible: true,
          strength: 0.8,
          reason: `${func1.name} returns ${func1.returnType} which can be used as ${param.name} parameter in ${func2.name}`
        };
      }
    }

    return { compatible: false, strength: 0, reason: '' };
  }

  private checkReturnTypeCompatibility(
    func1: CompleteFunctionInfo,
    func2: CompleteFunctionInfo
  ): { compatible: boolean; strength: number; reason: string } {
    if (this.typesAreCompatible(func1.returnType, func2.returnType)) {
      return {
        compatible: true,
        strength: 0.6,
        reason: `Both functions return compatible types: ${func1.returnType} and ${func2.returnType}`
      };
    }

    return { compatible: false, strength: 0, reason: '' };
  }

  private typesAreCompatible(type1: string, type2: string): boolean {
    // Normalize types
    const normalized1 = type1.replace(/\s/g, '').toLowerCase();
    const normalized2 = type2.replace(/\s/g, '').toLowerCase();

    // Exact match
    if (normalized1 === normalized2) return true;

    // Check for array compatibility
    if (normalized1.includes('[]') && normalized2.includes('[]')) {
      const baseType1 = normalized1.replace('[]', '');
      const baseType2 = normalized2.replace('[]', '');
      return baseType1 === baseType2;
    }

    // Check for generic compatibility
    if (normalized1.includes('<') && normalized2.includes('<')) {
      const base1 = normalized1.split('<')[0];
      const base2 = normalized2.split('<')[0];
      return base1 === base2;
    }

    return false;
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
    const maxLength = Math.max(name1.length, name2.length);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private generateStepDescription(line: string, functions: CompleteFunctionInfo[]): string {
    if (functions.length === 1) {
      return `Use ${functions[0].name} to process data`;
    } else {
      return `Apply ${functions.map(f => f.name).join(', ')} in sequence`;
    }
  }

  private identifyPrerequisites(
    func: CompleteFunctionInfo,
    allFunctions: CompleteFunctionInfo[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): { functionName: string; reason: string }[] {
    const prerequisites: { functionName: string; reason: string }[] = [];

    // Look for functions that are commonly called before this function
    const codeSources = [
      ...readmeAnalysis.codeBlocks.map(cb => cb.code),
      ...readmeAnalysis.usageExamples.map(ue => ue.code),
      ...examples.map(ex => ex.content)
    ];

    for (const code of codeSources) {
      if (code.includes(func.name)) {
        const lines = code.split('\n');
        const funcLineIndex = lines.findIndex(line => line.includes(func.name));
        
        if (funcLineIndex > 0) {
          // Look at previous lines for function calls
          for (let i = Math.max(0, funcLineIndex - 3); i < funcLineIndex; i++) {
            const line = lines[i];
            const prerequisiteFunc = allFunctions.find(f => 
              f.name !== func.name && line.includes(f.name)
            );
            
            if (prerequisiteFunc) {
              prerequisites.push({
                functionName: prerequisiteFunc.name,
                reason: `${prerequisiteFunc.name} is typically called before ${func.name}`
              });
            }
          }
        }
      }
    }

    return prerequisites;
  }

  private findPrerequisiteExample(
    funcName: string,
    prerequisites: { functionName: string; reason: string }[],
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): string {
    const codeSources = [
      ...readmeAnalysis.codeBlocks.map(cb => cb.code),
      ...readmeAnalysis.usageExamples.map(ue => ue.code),
      ...examples.map(ex => ex.content)
    ];

    for (const code of codeSources) {
      if (code.includes(funcName) && prerequisites.some(p => code.includes(p.functionName))) {
        return code.substring(0, 200) + (code.length > 200 ? '...' : '');
      }
    }

    return `// Example showing ${funcName} with prerequisites`;
  }

  private areAlternatives(func1: CompleteFunctionInfo, func2: CompleteFunctionInfo): boolean {
    // Functions are alternatives if they have similar purpose but different approaches
    return func1.category === func2.category &&
           func1.returnType === func2.returnType &&
           Math.abs(func1.parameters.length - func2.parameters.length) <= 1;
  }

  private generateGroupPurpose(func: CompleteFunctionInfo, alternatives: CompleteFunctionInfo[]): string {
    return `Functions for ${func.category} operations`;
  }

  private createAlternativeOption(func: CompleteFunctionInfo): AlternativeOption {
    return {
      functionName: func.name,
      pros: this.generatePros(func),
      cons: this.generateCons(func),
      bestFor: func.commonUseCase,
      performanceNotes: this.generatePerformanceNotes(func)
    };
  }

  private generateRecommendation(func: CompleteFunctionInfo, alternatives: CompleteFunctionInfo[]): string {
    return `Use ${func.name} for most common cases, consider alternatives based on specific requirements`;
  }

  private generatePros(func: CompleteFunctionInfo): string[] {
    const pros: string[] = [];
    
    if (func.complexity === 'beginner') pros.push('Easy to use');
    if (func.parameters.length <= 2) pros.push('Simple parameter structure');
    if (func.workingExamples.length > 2) pros.push('Well documented with examples');
    
    return pros;
  }

  private generateCons(func: CompleteFunctionInfo): string[] {
    const cons: string[] = [];
    
    if (func.complexity === 'advanced') cons.push('Complex to use');
    if (func.parameters.length > 4) cons.push('Many parameters to configure');
    
    return cons;
  }

  private generatePerformanceNotes(func: CompleteFunctionInfo): string {
    if (func.isAsync) return 'Asynchronous operation - consider performance implications';
    if (func.parameters.some(p => p.type.includes('[]'))) return 'Performance depends on array size';
    return 'Generally good performance for typical use cases';
  }

  private buildWorkflowRelationships(
    func: CompleteFunctionInfo,
    workflowPatterns: WorkflowStep[]
  ): EnhancedFunctionRelationship[] {
    const relationships: EnhancedFunctionRelationship[] = [];

    for (const step of workflowPatterns) {
      if (step.functions.includes(func.name)) {
        const otherFunctions = step.functions.filter(f => f !== func.name);
        
        for (const otherFunc of otherFunctions) {
          relationships.push({
            functionName: otherFunc,
            relationshipType: 'composes-with',
            strength: 0.7,
            context: `Used together in workflow: ${step.description}`,
            examples: [step.example],
            confidence: 0.8,
            evidenceCount: 1,
            contextExamples: [{
              title: `Workflow Step ${step.step}`,
              code: step.example,
              language: 'javascript',
              explanation: step.description,
              demonstratesRelationship: 'Functions used in sequence',
              source: 'documentation'
            }],
            useCaseReasons: [`Part of ${step.description} workflow`],
            strengthFactors: [{
              factor: 'usage-pattern-similarity',
              weight: 0.7,
              evidence: `Functions appear in same workflow step`
            }]
          });
        }
      }
    }

    return relationships;
  }

  private buildPrerequisiteRelationships(
    func: CompleteFunctionInfo,
    prerequisiteChains: PrerequisiteChain[]
  ): EnhancedFunctionRelationship[] {
    const relationships: EnhancedFunctionRelationship[] = [];

    for (const chain of prerequisiteChains) {
      if (chain.target === func.name) {
        for (const prerequisite of chain.prerequisites) {
          relationships.push({
            functionName: prerequisite,
            relationshipType: 'prerequisite-for',
            strength: 0.8,
            context: chain.reason,
            examples: [chain.example],
            confidence: 0.9,
            evidenceCount: 1,
            contextExamples: [{
              title: `Prerequisite for ${func.name}`,
              code: chain.example,
              language: 'javascript',
              explanation: chain.reason,
              demonstratesRelationship: 'Prerequisite relationship',
              source: 'documentation'
            }],
            useCaseReasons: [chain.reason],
            strengthFactors: [{
              factor: 'usage-pattern-similarity',
              weight: 0.8,
              evidence: 'Function typically called before target function'
            }]
          });
        }
      }
    }

    return relationships;
  }

  private buildAlternativeRelationships(
    func: CompleteFunctionInfo,
    alternativeGroups: AlternativeGroup[]
  ): EnhancedFunctionRelationship[] {
    const relationships: EnhancedFunctionRelationship[] = [];

    for (const group of alternativeGroups) {
      const funcOption = group.alternatives.find(alt => alt.functionName === func.name);
      if (funcOption) {
        const otherAlternatives = group.alternatives.filter(alt => alt.functionName !== func.name);
        
        for (const alternative of otherAlternatives) {
          relationships.push({
            functionName: alternative.functionName,
            relationshipType: 'alternative-to',
            strength: 0.6,
            context: `Alternative for ${group.purpose}`,
            examples: [],
            confidence: 0.7,
            evidenceCount: 1,
            contextExamples: [],
            useCaseReasons: [`Alternative approach for ${group.purpose}`],
            strengthFactors: [{
              factor: 'semantic-similarity',
              weight: 0.6,
              evidence: 'Functions serve similar purpose with different approaches'
            }]
          });
        }
      }
    }

    return relationships;
  }

  private mergeRelationships(relationships: EnhancedFunctionRelationship[]): EnhancedFunctionRelationship[] {
    const merged = new Map<string, EnhancedFunctionRelationship>();

    for (const rel of relationships) {
      const key = `${rel.functionName}:${rel.relationshipType}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.strength = Math.max(existing.strength, rel.strength);
        existing.confidence = Math.max(existing.confidence, rel.confidence);
        existing.evidenceCount += rel.evidenceCount;
        existing.examples.push(...rel.examples);
        existing.contextExamples.push(...rel.contextExamples);
        existing.useCaseReasons.push(...rel.useCaseReasons);
        existing.strengthFactors.push(...rel.strengthFactors);
      } else {
        merged.set(key, rel);
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence))
      .slice(0, 10); // Keep top 10 relationships
  }

  private buildContextualInfo(
    func: CompleteFunctionInfo,
    workflowPatterns: WorkflowStep[],
    prerequisiteChains: PrerequisiteChain[],
    alternativeGroups: AlternativeGroup[]
  ): RelationshipContext {
    const commonUseCases = func.commonUseCase;
    
    const typicalWorkflows = workflowPatterns.filter(step => 
      step.functions.includes(func.name)
    );

    const prerequisiteChain = prerequisiteChains.find(chain => 
      chain.target === func.name
    );

    const alternativeGroup = alternativeGroups.find(group =>
      group.alternatives.some(alt => alt.functionName === func.name)
    );

    return {
      commonUseCases,
      typicalWorkflows,
      prerequisiteChains: prerequisiteChain ? [prerequisiteChain] : [],
      alternativeGroups: alternativeGroup ? [alternativeGroup] : []
    };
  }

  private calculateFunctionRelationshipScore(relationships: EnhancedFunctionRelationship[]): number {
    if (relationships.length === 0) return 0;

    const totalScore = relationships.reduce((sum, rel) => 
      sum + (rel.strength * rel.confidence), 0
    );

    return totalScore / relationships.length;
  }

  private findRelationshipExamples(
    func1: string,
    func2: string,
    readmeAnalysis: ReadmeAnalysis,
    examples: ExampleAnalysis[]
  ): RelationshipExample[] {
    const relationshipExamples: RelationshipExample[] = [];

    // Search in README code blocks
    for (const codeBlock of readmeAnalysis.codeBlocks) {
      if (codeBlock.code.includes(func1) && codeBlock.code.includes(func2)) {
        relationshipExamples.push({
          title: codeBlock.context || `${func1} and ${func2} example`,
          code: codeBlock.code,
          language: codeBlock.language,
          explanation: `Example showing ${func1} and ${func2} used together`,
          demonstratesRelationship: 'Co-occurrence in code example',
          source: 'readme'
        });
      }
    }

    // Search in usage examples
    for (const usageExample of readmeAnalysis.usageExamples) {
      if (usageExample.code.includes(func1) && usageExample.code.includes(func2)) {
        relationshipExamples.push({
          title: usageExample.title,
          code: usageExample.code,
          language: usageExample.language,
          explanation: usageExample.description,
          demonstratesRelationship: 'Co-occurrence in usage example',
          source: 'readme'
        });
      }
    }

    // Search in example files
    for (const example of examples) {
      if (example.content.includes(func1) && example.content.includes(func2)) {
        relationshipExamples.push({
          title: `Example from ${example.filePath}`,
          code: example.content.substring(0, 500) + (example.content.length > 500 ? '...' : ''),
          language: example.language,
          explanation: `Example from ${example.filePath} showing both functions`,
          demonstratesRelationship: 'Co-occurrence in example file',
          source: 'examples'
        });
      }
    }

    return relationshipExamples.slice(0, 3); // Limit to top 3 examples
  }

  private generateUseCaseReasons(
    func1?: CompleteFunctionInfo,
    func2?: CompleteFunctionInfo
  ): string[] {
    const reasons: string[] = [];

    if (func1 && func2) {
      if (func1.category === func2.category) {
        reasons.push(`Both functions are used for ${func1.category} operations`);
      }

      const commonUseCases = func1.commonUseCase.filter(useCase => 
        func2.commonUseCase.includes(useCase)
      );

      if (commonUseCases.length > 0) {
        reasons.push(`Both functions are commonly used for: ${commonUseCases.join(', ')}`);
      }
    }

    return reasons;
  }

  private consolidateWorkflows(workflows: WorkflowStep[]): WorkflowStep[] {
    // Group similar workflows and consolidate
    const consolidated = new Map<string, WorkflowStep>();

    for (const workflow of workflows) {
      const key = workflow.functions.sort().join(',');
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.example += `\n// Alternative: ${workflow.example}`;
      } else {
        consolidated.set(key, workflow);
      }
    }

    return Array.from(consolidated.values());
  }

  private mapSemanticTypeToRelationshipType(semanticType: string): RelationshipType {
    switch (semanticType) {
      case 'parameter-compatible':
        return 'transforms-output-of';
      case 'return-compatible':
        return 'alternative-to';
      case 'name-similar':
        return 'alternative-to';
      case 'category-similar':
        return 'commonly-used-with';
      default:
        return 'commonly-used-with';
    }
  }

  private mapSemanticTypeToStrengthFactor(semanticType: string): RelationshipStrengthFactor['factor'] {
    switch (semanticType) {
      case 'parameter-compatible':
        return 'parameter-compatibility';
      case 'return-compatible':
        return 'return-type-compatibility';
      case 'name-similar':
        return 'semantic-similarity';
      case 'category-similar':
        return 'semantic-similarity';
      default:
        return 'semantic-similarity';
    }
  }
}

// Supporting interfaces
interface SemanticRelationship {
  targetFunction: string;
  type: 'parameter-compatible' | 'return-compatible' | 'name-similar' | 'category-similar';
  strength: number;
  reason: string;
}