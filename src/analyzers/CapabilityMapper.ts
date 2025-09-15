/**
 * Capability-based function discovery system that maps user descriptions to function capabilities
 */

import { CompleteFunctionInfo } from './FunctionAnalyzer.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface CapabilityIndex {
  capabilities: CapabilityEntry[];
  synonymMap: Map<string, string[]>;
  categoryMap: Map<string, CapabilityEntry[]>;
  conceptHierarchy: ConceptHierarchy;
  metadata: CapabilityIndexMetadata;
}

export interface CapabilityEntry {
  id: string;
  primaryCapability: string;
  synonyms: string[];
  relatedConcepts: string[];
  functions: FunctionCapabilityMapping[];
  category: CapabilityCategory;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  useCases: string[];
  examples: CapabilityExample[];
}

export interface FunctionCapabilityMapping {
  functionName: string;
  relevanceScore: number; // 0-1
  confidenceScore: number; // 0-1
  matchingReasons: MatchingReason[];
  usageContext: string;
  exampleUsage: string;
}

export interface MatchingReason {
  type: 'name-match' | 'description-match' | 'parameter-match' | 'return-type-match' | 'example-match' | 'category-match';
  evidence: string;
  weight: number; // 0-1
}

export interface CapabilityExample {
  title: string;
  description: string;
  code: string;
  language: string;
  functionName: string;
  demonstratesCapability: string;
}

export interface ConceptHierarchy {
  rootConcepts: ConceptNode[];
  conceptMap: Map<string, ConceptNode>;
}

export interface ConceptNode {
  concept: string;
  parent?: string;
  children: string[];
  synonyms: string[];
  relatedConcepts: string[];
  abstractionLevel: number; // 0 = most abstract, higher = more specific
}

export interface CapabilityIndexMetadata {
  totalCapabilities: number;
  totalFunctions: number;
  averageRelevanceScore: number;
  createdAt: Date;
  packageName: string;
  version: string;
}

export interface CapabilitySearchResult {
  query: string;
  matches: RankedCapabilityMatch[];
  searchMetadata: SearchMetadata;
}

export interface RankedCapabilityMatch {
  capability: CapabilityEntry;
  overallScore: number; // 0-1
  matchingFunctions: RankedFunctionMatch[];
  matchingReasons: string[];
  confidence: number; // 0-1
}

export interface RankedFunctionMatch {
  function: CompleteFunctionInfo;
  relevanceScore: number;
  matchingReasons: MatchingReason[];
  usageExample: string;
  whyRelevant: string;
}

export interface SearchMetadata {
  originalQuery: string;
  normalizedQuery: string;
  expandedTerms: string[];
  searchTime: number;
  totalMatches: number;
  appliedSynonyms: string[];
}

export type CapabilityCategory = 
  | 'data-manipulation'
  | 'data-validation'
  | 'data-transformation'
  | 'data-filtering'
  | 'data-aggregation'
  | 'string-processing'
  | 'array-operations'
  | 'object-operations'
  | 'async-operations'
  | 'utility-functions'
  | 'mathematical-operations'
  | 'date-time-operations'
  | 'file-operations'
  | 'network-operations'
  | 'error-handling'
  | 'testing-utilities'
  | 'configuration'
  | 'factory-functions'
  | 'predicates';

export class CapabilityMapper {
  private packageName: string;
  private synonymMap: Map<string, string[]>;
  private conceptHierarchy: ConceptHierarchy;

  constructor(packageName: string) {
    this.packageName = packageName;
    this.synonymMap = this.buildSynonymMap();
    this.conceptHierarchy = this.buildConceptHierarchy();
  }

  /**
   * Extract capabilities from functions and build comprehensive capability index
   */
  async buildCapabilityIndex(functions: CompleteFunctionInfo[]): Promise<AnalysisResult<CapabilityIndex>> {
    const startTime = Date.now();

    try {
      console.log(`🎯 Building capability index for ${functions.length} functions...`);

      const capabilities: CapabilityEntry[] = [];
      const categoryMap = new Map<string, CapabilityEntry[]>();
      const processedCapabilities = new Set<string>();

      // Extract capabilities from each function
      for (const func of functions) {
        const extractedCapabilities = await this.extractFunctionCapabilities(func, functions);
        
        for (const capabilityMapping of extractedCapabilities) {
          // Extract capability name from the mapping (we need to determine this from the mapping)
          const capabilityName = this.inferCapabilityFromMapping(capabilityMapping);
          
          if (!processedCapabilities.has(capabilityName)) {
            // Find or create capability entry
            let capabilityEntry = capabilities.find(c => c.primaryCapability === capabilityName);
            
            if (!capabilityEntry) {
              capabilityEntry = await this.createCapabilityEntry(capabilityName, functions);
              capabilities.push(capabilityEntry);
              processedCapabilities.add(capabilityName);
            }

            // Add function mapping to capability
            const existingMapping = capabilityEntry.functions.find(f => f.functionName === func.name);
            if (!existingMapping) {
              capabilityEntry.functions.push(capabilityMapping);
            }
          }
        }
      }

      // Build category map
      for (const capability of capabilities) {
        const category = capability.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(capability);
      }

      // Calculate metadata
      const metadata: CapabilityIndexMetadata = {
        totalCapabilities: capabilities.length,
        totalFunctions: functions.length,
        averageRelevanceScore: this.calculateAverageRelevanceScore(capabilities),
        createdAt: new Date(),
        packageName: this.packageName,
        version: '1.0.0'
      };

      const capabilityIndex: CapabilityIndex = {
        capabilities,
        synonymMap: this.synonymMap,
        categoryMap,
        conceptHierarchy: this.conceptHierarchy,
        metadata
      };

      console.log(`✅ Capability index built: ${capabilities.length} capabilities`);

      return {
        success: true,
        data: capabilityIndex,
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'capability-mapper'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PROCESSING_ERROR',
          message: `Capability index building failed: ${error}`,
          recoverable: false,
          suggestions: ['Check function data format', 'Verify capability extraction logic']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'capability-mapper'
        }
      };
    }
  }

  /**
   * Search for functions by capability description
   */
  async searchByCapability(
    query: string,
    capabilityIndex: CapabilityIndex,
    options: {
      maxResults?: number;
      minRelevanceScore?: number;
      includeExamples?: boolean;
      expandSynonyms?: boolean;
    } = {}
  ): Promise<CapabilitySearchResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || 10;
    const minRelevanceScore = options.minRelevanceScore || 0.3;
    const expandSynonyms = options.expandSynonyms !== false;

    // Normalize and expand query
    const normalizedQuery = this.normalizeQuery(query);
    const expandedTerms = expandSynonyms ? this.expandQueryWithSynonyms(normalizedQuery) : [normalizedQuery];
    const appliedSynonyms = expandedTerms.filter(term => term !== normalizedQuery);

    console.log(`🔍 Searching capabilities for: "${query}" (expanded: ${expandedTerms.length} terms)`);

    const matches: RankedCapabilityMatch[] = [];

    // Search through capabilities
    for (const capability of capabilityIndex.capabilities) {
      const matchScore = this.calculateCapabilityMatchScore(capability, expandedTerms);
      
      if (matchScore.score >= minRelevanceScore) {
        const rankedFunctions = this.rankFunctionsForCapability(capability, expandedTerms);
        
        matches.push({
          capability,
          overallScore: matchScore.score,
          matchingFunctions: rankedFunctions,
          matchingReasons: matchScore.reasons,
          confidence: matchScore.confidence
        });
      }
    }

    // Sort by overall score and limit results
    matches.sort((a, b) => b.overallScore - a.overallScore);
    const topMatches = matches.slice(0, maxResults);

    const searchMetadata: SearchMetadata = {
      originalQuery: query,
      normalizedQuery,
      expandedTerms,
      searchTime: Date.now() - startTime,
      totalMatches: matches.length,
      appliedSynonyms
    };

    return {
      query,
      matches: topMatches,
      searchMetadata
    };
  }

  /**
   * Extract capabilities from a single function
   */
  private async extractFunctionCapabilities(
    func: CompleteFunctionInfo,
    allFunctions: CompleteFunctionInfo[]
  ): Promise<FunctionCapabilityMapping[]> {
    const capabilities: FunctionCapabilityMapping[] = [];

    // Extract from function name
    const nameCapabilities = this.extractCapabilitiesFromName(func.name);
    
    // Extract from description
    const descriptionCapabilities = this.extractCapabilitiesFromDescription(func.description || func.completeDescription);
    
    // Extract from parameters and return type
    const signatureCapabilities = this.extractCapabilitiesFromSignature(func);
    
    // Extract from examples
    const exampleCapabilities = this.extractCapabilitiesFromExamples(func.workingExamples);
    
    // Extract from category
    const categoryCapabilities = this.extractCapabilitiesFromCategory(func.category);

    // Combine all capabilities
    const allCapabilities = [
      ...nameCapabilities,
      ...descriptionCapabilities,
      ...signatureCapabilities,
      ...exampleCapabilities,
      ...categoryCapabilities
    ];

    // Create capability mappings
    for (const capability of allCapabilities) {
      const mapping: FunctionCapabilityMapping = {
        functionName: func.name,
        relevanceScore: capability.relevanceScore,
        confidenceScore: capability.confidenceScore,
        matchingReasons: capability.matchingReasons,
        usageContext: this.generateUsageContext(func, capability.capability),
        exampleUsage: this.generateExampleUsage(func, capability.capability)
      };

      capabilities.push(mapping);
    }

    return capabilities;
  }

  /**
   * Infer capability name from function capability mapping
   */
  private inferCapabilityFromMapping(mapping: FunctionCapabilityMapping): string {
    // Use the first matching reason to infer the capability
    if (mapping.matchingReasons.length > 0) {
      const evidence = mapping.matchingReasons[0].evidence;
      
      // Extract capability from evidence text
      const capabilityMatch = evidence.match(/for ([a-z-]+)/);
      if (capabilityMatch) {
        return capabilityMatch[1];
      }
      
      // Fallback: extract from evidence patterns
      if (evidence.includes('filtering')) return 'data-filtering';
      if (evidence.includes('transformation')) return 'data-transformation';
      if (evidence.includes('validation')) return 'validation';
      if (evidence.includes('aggregation')) return 'data-aggregation';
      if (evidence.includes('async')) return 'async-operation';
    }
    
    // Default fallback
    return 'general-utility';
  }

  /**
   * Create a capability entry for a specific capability
   */
  private async createCapabilityEntry(
    primaryCapability: string,
    allFunctions: CompleteFunctionInfo[]
  ): Promise<CapabilityEntry> {
    const synonyms = this.getSynonymsForCapability(primaryCapability);
    const relatedConcepts = this.getRelatedConcepts(primaryCapability);
    const category = this.categorizeCapability(primaryCapability);
    const complexity = this.assessCapabilityComplexity(primaryCapability);
    const useCases = this.generateUseCases(primaryCapability);
    const examples = this.generateCapabilityExamples(primaryCapability, allFunctions);

    return {
      id: this.generateCapabilityId(primaryCapability),
      primaryCapability,
      synonyms,
      relatedConcepts,
      functions: [], // Will be populated by caller
      category,
      complexity,
      useCases,
      examples
    };
  }

  /**
   * Extract capabilities from function name
   */
  private extractCapabilitiesFromName(name: string): ExtractedCapability[] {
    const capabilities: ExtractedCapability[] = [];
    const normalizedName = name.toLowerCase();

    // Common capability patterns in function names
    const patterns = [
      { pattern: /^(get|fetch|retrieve|find|search|query)/, capability: 'data-retrieval', score: 0.9 },
      { pattern: /^(set|update|modify|change|edit)/, capability: 'data-modification', score: 0.9 },
      { pattern: /^(create|make|build|generate|construct)/, capability: 'data-creation', score: 0.9 },
      { pattern: /^(delete|remove|destroy|clear)/, capability: 'data-deletion', score: 0.9 },
      { pattern: /^(is|has|can|should|check|verify|validate)/, capability: 'validation', score: 0.8 },
      { pattern: /(filter|select|where)/, capability: 'data-filtering', score: 0.8 },
      { pattern: /(map|transform|convert|parse)/, capability: 'data-transformation', score: 0.8 },
      { pattern: /(sort|order|arrange)/, capability: 'data-sorting', score: 0.8 },
      { pattern: /(group|categorize|classify)/, capability: 'data-grouping', score: 0.8 },
      { pattern: /(reduce|aggregate|sum|count|calculate)/, capability: 'data-aggregation', score: 0.8 },
      { pattern: /(merge|combine|join|concat)/, capability: 'data-combination', score: 0.8 },
      { pattern: /(split|divide|separate|extract)/, capability: 'data-separation', score: 0.8 },
      { pattern: /(format|stringify|serialize)/, capability: 'data-formatting', score: 0.7 },
      { pattern: /(clone|copy|duplicate)/, capability: 'data-duplication', score: 0.7 },
      { pattern: /(compare|diff|equal|match)/, capability: 'data-comparison', score: 0.7 }
    ];

    for (const { pattern, capability, score } of patterns) {
      if (pattern.test(normalizedName)) {
        capabilities.push({
          capability,
          relevanceScore: score,
          confidenceScore: 0.8,
          matchingReasons: [{
            type: 'name-match',
            evidence: `Function name "${name}" matches pattern for ${capability}`,
            weight: score
          }]
        });
      }
    }

    return capabilities;
  }

  /**
   * Extract capabilities from function description
   */
  private extractCapabilitiesFromDescription(description: string): ExtractedCapability[] {
    const capabilities: ExtractedCapability[] = [];
    
    if (!description) return capabilities;

    const normalizedDesc = description.toLowerCase();

    // Capability keywords in descriptions
    const keywordMap = [
      { keywords: ['filter', 'select', 'where', 'find matching'], capability: 'data-filtering' },
      { keywords: ['transform', 'convert', 'map', 'change'], capability: 'data-transformation' },
      { keywords: ['validate', 'check', 'verify', 'test'], capability: 'validation' },
      { keywords: ['sort', 'order', 'arrange', 'rank'], capability: 'data-sorting' },
      { keywords: ['group', 'categorize', 'organize'], capability: 'data-grouping' },
      { keywords: ['reduce', 'aggregate', 'sum', 'calculate'], capability: 'data-aggregation' },
      { keywords: ['merge', 'combine', 'join'], capability: 'data-combination' },
      { keywords: ['split', 'divide', 'separate'], capability: 'data-separation' },
      { keywords: ['format', 'stringify', 'serialize'], capability: 'data-formatting' },
      { keywords: ['clone', 'copy', 'duplicate'], capability: 'data-duplication' },
      { keywords: ['compare', 'diff', 'equal'], capability: 'data-comparison' }
    ];

    for (const { keywords, capability } of keywordMap) {
      for (const keyword of keywords) {
        if (normalizedDesc.includes(keyword)) {
          capabilities.push({
            capability,
            relevanceScore: 0.7,
            confidenceScore: 0.6,
            matchingReasons: [{
              type: 'description-match',
              evidence: `Description contains keyword "${keyword}" for ${capability}`,
              weight: 0.7
            }]
          });
          break; // Only add once per capability
        }
      }
    }

    return capabilities;
  }

  /**
   * Extract capabilities from function signature
   */
  private extractCapabilitiesFromSignature(func: CompleteFunctionInfo): ExtractedCapability[] {
    const capabilities: ExtractedCapability[] = [];

    // Analyze return type
    const returnType = func.returnType.toLowerCase();
    
    if (returnType.includes('boolean')) {
      capabilities.push({
        capability: 'validation',
        relevanceScore: 0.8,
        confidenceScore: 0.9,
        matchingReasons: [{
          type: 'return-type-match',
          evidence: 'Boolean return type indicates validation/predicate function',
          weight: 0.8
        }]
      });
    }

    if (returnType.includes('promise')) {
      capabilities.push({
        capability: 'async-operation',
        relevanceScore: 0.7,
        confidenceScore: 0.9,
        matchingReasons: [{
          type: 'return-type-match',
          evidence: 'Promise return type indicates async operation',
          weight: 0.7
        }]
      });
    }

    if (returnType.includes('[]') || returnType.includes('array')) {
      capabilities.push({
        capability: 'array-operation',
        relevanceScore: 0.6,
        confidenceScore: 0.8,
        matchingReasons: [{
          type: 'return-type-match',
          evidence: 'Array return type indicates array operation',
          weight: 0.6
        }]
      });
    }

    // Analyze parameters
    for (const param of func.parameters) {
      const paramType = param.type.toLowerCase();
      
      if (paramType.includes('predicate') || paramType.includes('=> boolean')) {
        capabilities.push({
          capability: 'data-filtering',
          relevanceScore: 0.8,
          confidenceScore: 0.9,
          matchingReasons: [{
            type: 'parameter-match',
            evidence: `Parameter "${param.name}" with predicate type indicates filtering capability`,
            weight: 0.8
          }]
        });
      }

      if (paramType.includes('=> ') && !paramType.includes('=> boolean')) {
        capabilities.push({
          capability: 'data-transformation',
          relevanceScore: 0.7,
          confidenceScore: 0.8,
          matchingReasons: [{
            type: 'parameter-match',
            evidence: `Parameter "${param.name}" with transform function type indicates transformation capability`,
            weight: 0.7
          }]
        });
      }
    }

    return capabilities;
  }

  /**
   * Extract capabilities from working examples
   */
  private extractCapabilitiesFromExamples(examples: any[]): ExtractedCapability[] {
    const capabilities: ExtractedCapability[] = [];

    for (const example of examples) {
      const code = example.code?.toLowerCase() || '';
      
      // Look for capability patterns in example code
      if (code.includes('.filter(') || code.includes('.where(')) {
        capabilities.push({
          capability: 'data-filtering',
          relevanceScore: 0.9,
          confidenceScore: 0.8,
          matchingReasons: [{
            type: 'example-match',
            evidence: 'Example code shows filtering usage',
            weight: 0.9
          }]
        });
      }

      if (code.includes('.map(') || code.includes('.transform(')) {
        capabilities.push({
          capability: 'data-transformation',
          relevanceScore: 0.9,
          confidenceScore: 0.8,
          matchingReasons: [{
            type: 'example-match',
            evidence: 'Example code shows transformation usage',
            weight: 0.9
          }]
        });
      }

      if (code.includes('.reduce(') || code.includes('.aggregate(')) {
        capabilities.push({
          capability: 'data-aggregation',
          relevanceScore: 0.9,
          confidenceScore: 0.8,
          matchingReasons: [{
            type: 'example-match',
            evidence: 'Example code shows aggregation usage',
            weight: 0.9
          }]
        });
      }
    }

    return capabilities;
  }

  /**
   * Extract capabilities from function category
   */
  private extractCapabilitiesFromCategory(category: string): ExtractedCapability[] {
    const capabilities: ExtractedCapability[] = [];

    const categoryMap: Record<string, string> = {
      'array-manipulation': 'array-operation',
      'object-manipulation': 'object-operation',
      'string-processing': 'string-operation',
      'validation': 'validation',
      'transformation': 'data-transformation',
      'filtering': 'data-filtering',
      'aggregation': 'data-aggregation',
      'factory': 'data-creation',
      'predicate': 'validation',
      'getter': 'data-retrieval',
      'setter': 'data-modification',
      'action': 'operation-execution',
      'async': 'async-operation'
    };

    const capability = categoryMap[category];
    if (capability) {
      capabilities.push({
        capability,
        relevanceScore: 0.6,
        confidenceScore: 0.7,
        matchingReasons: [{
          type: 'category-match',
          evidence: `Function category "${category}" maps to ${capability}`,
          weight: 0.6
        }]
      });
    }

    return capabilities;
  }

  /**
   * Build synonym map for capability matching
   */
  private buildSynonymMap(): Map<string, string[]> {
    const synonymMap = new Map<string, string[]>();

    // Data operations
    synonymMap.set('filter', ['select', 'where', 'find', 'search', 'match', 'pick']);
    synonymMap.set('transform', ['map', 'convert', 'change', 'modify', 'process']);
    synonymMap.set('reduce', ['aggregate', 'fold', 'accumulate', 'combine', 'sum']);
    synonymMap.set('sort', ['order', 'arrange', 'rank', 'organize']);
    synonymMap.set('group', ['categorize', 'classify', 'organize', 'partition']);
    synonymMap.set('merge', ['combine', 'join', 'unite', 'concat']);
    synonymMap.set('split', ['divide', 'separate', 'break', 'partition']);
    synonymMap.set('validate', ['check', 'verify', 'test', 'confirm']);
    synonymMap.set('create', ['make', 'build', 'generate', 'construct', 'produce']);
    synonymMap.set('remove', ['delete', 'destroy', 'clear', 'eliminate']);
    synonymMap.set('get', ['fetch', 'retrieve', 'obtain', 'access']);
    synonymMap.set('set', ['update', 'modify', 'change', 'assign']);
    synonymMap.set('format', ['stringify', 'serialize', 'render', 'display']);
    synonymMap.set('parse', ['decode', 'deserialize', 'interpret', 'analyze']);
    synonymMap.set('clone', ['copy', 'duplicate', 'replicate']);
    synonymMap.set('compare', ['diff', 'equal', 'match', 'contrast']);

    // Reverse mapping for bidirectional lookup
    const reverseMap = new Map<string, string[]>();
    for (const [primary, synonyms] of synonymMap.entries()) {
      for (const synonym of synonyms) {
        if (!reverseMap.has(synonym)) {
          reverseMap.set(synonym, []);
        }
        reverseMap.get(synonym)!.push(primary);
      }
    }

    // Merge reverse mappings
    for (const [synonym, primaries] of reverseMap.entries()) {
      if (!synonymMap.has(synonym)) {
        synonymMap.set(synonym, primaries);
      }
    }

    return synonymMap;
  }

  /**
   * Build concept hierarchy for semantic understanding
   */
  private buildConceptHierarchy(): ConceptHierarchy {
    const concepts: ConceptNode[] = [
      // Root concepts
      {
        concept: 'data-operation',
        children: ['data-retrieval', 'data-modification', 'data-analysis'],
        synonyms: ['data-processing', 'data-handling'],
        relatedConcepts: [],
        abstractionLevel: 0
      },
      {
        concept: 'data-retrieval',
        parent: 'data-operation',
        children: ['data-filtering', 'data-searching', 'data-selection'],
        synonyms: ['data-access', 'data-fetching'],
        relatedConcepts: ['data-querying'],
        abstractionLevel: 1
      },
      {
        concept: 'data-modification',
        parent: 'data-operation',
        children: ['data-transformation', 'data-creation', 'data-deletion'],
        synonyms: ['data-mutation', 'data-updating'],
        relatedConcepts: ['data-editing'],
        abstractionLevel: 1
      },
      {
        concept: 'data-analysis',
        parent: 'data-operation',
        children: ['data-aggregation', 'data-comparison', 'data-validation'],
        synonyms: ['data-processing', 'data-computation'],
        relatedConcepts: ['data-calculation'],
        abstractionLevel: 1
      }
    ];

    const conceptMap = new Map<string, ConceptNode>();
    for (const concept of concepts) {
      conceptMap.set(concept.concept, concept);
    }

    return {
      rootConcepts: concepts.filter(c => c.abstractionLevel === 0),
      conceptMap
    };
  }

  /**
   * Calculate capability match score for search
   */
  private calculateCapabilityMatchScore(
    capability: CapabilityEntry,
    searchTerms: string[]
  ): { score: number; confidence: number; reasons: string[] } {
    let totalScore = 0;
    let matchCount = 0;
    const reasons: string[] = [];

    // Check primary capability
    for (const term of searchTerms) {
      if (capability.primaryCapability.includes(term)) {
        totalScore += 1.0;
        matchCount++;
        reasons.push(`Primary capability matches "${term}"`);
      }
    }

    // Check synonyms
    for (const synonym of capability.synonyms) {
      for (const term of searchTerms) {
        if (synonym.includes(term)) {
          totalScore += 0.8;
          matchCount++;
          reasons.push(`Synonym "${synonym}" matches "${term}"`);
        }
      }
    }

    // Check related concepts
    for (const concept of capability.relatedConcepts) {
      for (const term of searchTerms) {
        if (concept.includes(term)) {
          totalScore += 0.6;
          matchCount++;
          reasons.push(`Related concept "${concept}" matches "${term}"`);
        }
      }
    }

    // Check use cases
    for (const useCase of capability.useCases) {
      for (const term of searchTerms) {
        if (useCase.toLowerCase().includes(term)) {
          totalScore += 0.4;
          matchCount++;
          reasons.push(`Use case "${useCase}" matches "${term}"`);
        }
      }
    }

    const score = matchCount > 0 ? totalScore / searchTerms.length : 0;
    const confidence = Math.min(matchCount / searchTerms.length, 1.0);

    return { score, confidence, reasons };
  }

  /**
   * Rank functions within a capability for search results
   */
  private rankFunctionsForCapability(
    capability: CapabilityEntry,
    searchTerms: string[]
  ): RankedFunctionMatch[] {
    const rankedFunctions: RankedFunctionMatch[] = [];

    for (const funcMapping of capability.functions) {
      // For now, we'll create a placeholder function object
      // In a real implementation, this would reference the actual CompleteFunctionInfo
      const placeholderFunction: CompleteFunctionInfo = {
        name: funcMapping.functionName,
        parameters: [],
        returnType: 'unknown',
        description: '',
        isAsync: false,
        examples: [],
        signature: `${funcMapping.functionName}()`,
        completeDescription: '',
        workingExamples: [],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'utility',
        complexity: 'beginner',
        commonUseCase: [],
        errorHandling: [],
        alternatives: []
      };

      rankedFunctions.push({
        function: placeholderFunction,
        relevanceScore: funcMapping.relevanceScore,
        matchingReasons: funcMapping.matchingReasons,
        usageExample: funcMapping.exampleUsage,
        whyRelevant: funcMapping.usageContext
      });
    }

    return rankedFunctions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Helper methods

  private normalizeQuery(query: string): string {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private expandQueryWithSynonyms(query: string): string[] {
    const terms = query.split(' ');
    const expandedTerms = new Set([query]);

    for (const term of terms) {
      const synonyms = this.synonymMap.get(term);
      if (synonyms) {
        for (const synonym of synonyms) {
          expandedTerms.add(synonym);
          // Also add the synonym in context of the full query
          expandedTerms.add(query.replace(term, synonym));
        }
      }
    }

    return Array.from(expandedTerms);
  }

  private getSynonymsForCapability(capability: string): string[] {
    return this.synonymMap.get(capability) || [];
  }

  private getRelatedConcepts(capability: string): string[] {
    const concept = this.conceptHierarchy.conceptMap.get(capability);
    return concept?.relatedConcepts || [];
  }

  private categorizeCapability(capability: string): CapabilityCategory {
    const categoryMap: Record<string, CapabilityCategory> = {
      'data-filtering': 'data-filtering',
      'data-transformation': 'data-transformation',
      'data-aggregation': 'data-aggregation',
      'validation': 'data-validation',
      'array-operation': 'array-operations',
      'object-operation': 'object-operations',
      'string-operation': 'string-processing',
      'async-operation': 'async-operations',
      'data-creation': 'factory-functions',
      'data-modification': 'data-manipulation',
      'data-retrieval': 'data-manipulation'
    };

    return categoryMap[capability] || 'utility-functions';
  }

  private assessCapabilityComplexity(capability: string): 'beginner' | 'intermediate' | 'advanced' {
    const complexityMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'data-filtering': 'beginner',
      'data-transformation': 'intermediate',
      'data-aggregation': 'intermediate',
      'validation': 'beginner',
      'async-operation': 'advanced',
      'data-creation': 'beginner',
      'data-modification': 'intermediate'
    };

    return complexityMap[capability] || 'intermediate';
  }

  private generateUseCases(capability: string): string[] {
    const useCaseMap: Record<string, string[]> = {
      'data-filtering': ['Remove unwanted items', 'Find matching elements', 'Select by criteria'],
      'data-transformation': ['Convert data format', 'Apply function to elements', 'Change structure'],
      'data-aggregation': ['Calculate totals', 'Combine values', 'Generate statistics'],
      'validation': ['Check data validity', 'Verify conditions', 'Test requirements'],
      'data-creation': ['Generate new data', 'Build objects', 'Initialize structures']
    };

    return useCaseMap[capability] || ['General utility operations'];
  }

  private generateCapabilityExamples(
    capability: string,
    functions: CompleteFunctionInfo[]
  ): CapabilityExample[] {
    // Find functions that match this capability
    const matchingFunctions = functions.filter(f => 
      f.name.toLowerCase().includes(capability.split('-')[1]) ||
      f.category.includes(capability.split('-')[1])
    ).slice(0, 2);

    return matchingFunctions.map(func => ({
      title: `${func.name} Example`,
      description: `Example showing ${capability} with ${func.name}`,
      code: func.workingExamples[0]?.code || `${func.name}(data)`,
      language: 'javascript',
      functionName: func.name,
      demonstratesCapability: capability
    }));
  }

  private generateUsageContext(func: CompleteFunctionInfo, capability: string): string {
    return `Use ${func.name} when you need to ${capability.replace('-', ' ')} in your application`;
  }

  private generateExampleUsage(func: CompleteFunctionInfo, capability: string): string {
    return func.workingExamples[0]?.code || `${func.name}(data)`;
  }

  private generateCapabilityId(capability: string): string {
    return capability.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  private calculateAverageRelevanceScore(capabilities: CapabilityEntry[]): number {
    if (capabilities.length === 0) return 0;

    const totalScore = capabilities.reduce((sum, cap) => {
      const avgFunctionScore = cap.functions.reduce((fSum, f) => fSum + f.relevanceScore, 0) / cap.functions.length;
      return sum + avgFunctionScore;
    }, 0);

    return totalScore / capabilities.length;
  }
}

// Supporting interfaces
interface ExtractedCapability {
  capability: string;
  relevanceScore: number;
  confidenceScore: number;
  matchingReasons: MatchingReason[];
}