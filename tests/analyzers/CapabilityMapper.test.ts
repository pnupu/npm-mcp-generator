/**
 * Tests for the CapabilityMapper class
 */

import { CapabilityMapper, CapabilityIndex, CapabilitySearchResult } from '../../src/analyzers/CapabilityMapper';
import { CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer';

describe('CapabilityMapper', () => {
  let capabilityMapper: CapabilityMapper;
  let mockFunctions: CompleteFunctionInfo[];

  beforeEach(() => {
    capabilityMapper = new CapabilityMapper('test-package');

    // Mock functions with different capabilities
    mockFunctions = [
      {
        name: 'filter',
        parameters: [
          { name: 'array', type: 'T[]', optional: false, description: 'Input array' },
          { name: 'predicate', type: '(item: T) => boolean', optional: false, description: 'Filter function' }
        ],
        returnType: 'T[]',
        description: 'Filter array elements based on predicate',
        isAsync: false,
        examples: [],
        signature: 'filter<T>(array: T[], predicate: (item: T) => boolean): T[]',
        completeDescription: 'Iterates over elements of collection, returning an array of all elements predicate returns truthy for',
        workingExamples: [
          {
            title: 'Filter Example',
            code: 'const evens = filter([1, 2, 3, 4], n => n % 2 === 0);',
            language: 'javascript',
            imports: [],
            setup: [],
            context: 'Filter even numbers',
            explanation: 'Filter array to get even numbers',
            runnable: true
          }
        ],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'array-manipulation',
        complexity: 'beginner',
        commonUseCase: ['Data filtering', 'Array processing'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'map',
        parameters: [
          { name: 'array', type: 'T[]', optional: false, description: 'Input array' },
          { name: 'callback', type: '(item: T) => U', optional: false, description: 'Transform function' }
        ],
        returnType: 'U[]',
        description: 'Transform array elements',
        isAsync: false,
        examples: [],
        signature: 'map<T, U>(array: T[], callback: (item: T) => U): U[]',
        completeDescription: 'Creates an array of values by running each element through iteratee',
        workingExamples: [
          {
            title: 'Map Example',
            code: 'const doubled = map([1, 2, 3], n => n * 2);',
            language: 'javascript',
            imports: [],
            setup: [],
            context: 'Transform numbers',
            explanation: 'Double each number in array',
            runnable: true
          }
        ],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'array-manipulation',
        complexity: 'beginner',
        commonUseCase: ['Data transformation', 'Array processing'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'isValid',
        parameters: [
          { name: 'value', type: 'any', optional: false, description: 'Value to validate' }
        ],
        returnType: 'boolean',
        description: 'Check if value is valid',
        isAsync: false,
        examples: [],
        signature: 'isValid(value: any): boolean',
        completeDescription: 'Validates input value according to predefined rules',
        workingExamples: [
          {
            title: 'Validation Example',
            code: 'const valid = isValid(userInput);',
            language: 'javascript',
            imports: [],
            setup: [],
            context: 'Validate user input',
            explanation: 'Check if user input is valid',
            runnable: true
          }
        ],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'validation',
        complexity: 'beginner',
        commonUseCase: ['Input validation', 'Data verification'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'fetchData',
        parameters: [
          { name: 'url', type: 'string', optional: false, description: 'Data URL' }
        ],
        returnType: 'Promise<any>',
        description: 'Fetch data from URL',
        isAsync: true,
        examples: [],
        signature: 'fetchData(url: string): Promise<any>',
        completeDescription: 'Asynchronously fetches data from the specified URL',
        workingExamples: [
          {
            title: 'Fetch Example',
            code: 'const data = await fetchData("/api/users");',
            language: 'javascript',
            imports: [],
            setup: [],
            context: 'Fetch user data',
            explanation: 'Retrieve user data from API',
            runnable: true
          }
        ],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'async',
        complexity: 'intermediate',
        commonUseCase: ['Data retrieval', 'API calls'],
        errorHandling: [],
        alternatives: []
      }
    ];
  });

  describe('buildCapabilityIndex', () => {
    it('should build comprehensive capability index', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const index = result.data!;
      expect(index.capabilities.length).toBeGreaterThan(0);
      expect(index.synonymMap).toBeDefined();
      expect(index.categoryMap).toBeDefined();
      expect(index.conceptHierarchy).toBeDefined();
      expect(index.metadata).toBeDefined();

      // Check metadata
      expect(index.metadata.totalFunctions).toBe(mockFunctions.length);
      expect(index.metadata.packageName).toBe('test-package');
      expect(index.metadata.totalCapabilities).toBeGreaterThan(0);
    });

    it('should extract capabilities from function names', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      // Should find filtering capability from 'filter' function
      const filteringCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('filtering') || c.primaryCapability.includes('filter')
      );
      expect(filteringCapability).toBeDefined();

      // Should find validation capability from 'isValid' function
      const validationCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('validation') || c.primaryCapability.includes('valid')
      );
      expect(validationCapability).toBeDefined();
    });

    it('should categorize capabilities correctly', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      // Check that capabilities are properly categorized
      expect(index.categoryMap.size).toBeGreaterThan(0);
      
      for (const [category, capabilities] of index.categoryMap.entries()) {
        expect(capabilities.length).toBeGreaterThan(0);
        for (const capability of capabilities) {
          expect(capability.category).toBe(category);
        }
      }
    });

    it('should handle empty function list', async () => {
      const result = await capabilityMapper.buildCapabilityIndex([]);

      expect(result.success).toBe(true);
      expect(result.data!.capabilities.length).toBe(0);
      expect(result.data!.metadata.totalFunctions).toBe(0);
    });

    it('should assign complexity levels to capabilities', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        expect(['beginner', 'intermediate', 'advanced']).toContain(capability.complexity);
      }
    });

    it('should generate use cases for capabilities', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        expect(capability.useCases).toBeDefined();
        expect(capability.useCases.length).toBeGreaterThan(0);
      }
    });
  });

  describe('searchByCapability', () => {
    let capabilityIndex: CapabilityIndex;

    beforeEach(async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      capabilityIndex = result.data!;
    });

    it('should find functions by capability description', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'filter data',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBeGreaterThan(0);
      expect(searchResult.searchMetadata.originalQuery).toBe('filter data');
      expect(searchResult.searchMetadata.totalMatches).toBeGreaterThan(0);

      // Should find filtering-related capabilities
      const hasFilteringMatch = searchResult.matches.some(match =>
        match.capability.primaryCapability.includes('filter') ||
        match.capability.synonyms.some(s => s.includes('filter'))
      );
      expect(hasFilteringMatch).toBe(true);
    });

    it('should understand synonyms', async () => {
      const selectResult = await capabilityMapper.searchByCapability(
        'select items',
        capabilityIndex
      );

      const filterResult = await capabilityMapper.searchByCapability(
        'filter items',
        capabilityIndex
      );

      // 'select' and 'filter' should return similar results due to synonyms
      expect(selectResult.matches.length).toBeGreaterThan(0);
      expect(filterResult.matches.length).toBeGreaterThan(0);
      
      // Should have applied synonyms
      expect(selectResult.searchMetadata.appliedSynonyms.length).toBeGreaterThan(0);
    });

    it('should rank results by relevance', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'transform data',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBeGreaterThan(0);

      // Results should be sorted by overall score (descending)
      for (let i = 1; i < searchResult.matches.length; i++) {
        expect(searchResult.matches[i].overallScore).toBeLessThanOrEqual(
          searchResult.matches[i - 1].overallScore
        );
      }
    });

    it('should provide matching reasons', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'validate input',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBeGreaterThan(0);

      for (const match of searchResult.matches) {
        expect(match.matchingReasons).toBeDefined();
        expect(match.matchingReasons.length).toBeGreaterThan(0);
      }
    });

    it('should respect minimum relevance score', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'completely unrelated query xyz',
        capabilityIndex,
        { minRelevanceScore: 0.5 }
      );

      // Should return fewer or no results due to high minimum score
      for (const match of searchResult.matches) {
        expect(match.overallScore).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should limit results when maxResults is specified', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'data',
        capabilityIndex,
        { maxResults: 2 }
      );

      expect(searchResult.matches.length).toBeLessThanOrEqual(2);
    });

    it('should handle queries with multiple terms', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'filter and transform data',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBeGreaterThan(0);
      expect(searchResult.searchMetadata.expandedTerms.length).toBeGreaterThan(1);
    });

    it('should provide search metadata', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'process data',
        capabilityIndex
      );

      const metadata = searchResult.searchMetadata;
      expect(metadata.originalQuery).toBe('process data');
      expect(metadata.normalizedQuery).toBeDefined();
      expect(metadata.expandedTerms).toBeDefined();
      expect(metadata.searchTime).toBeGreaterThan(0);
      expect(metadata.totalMatches).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty queries gracefully', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        '',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBe(0);
      expect(searchResult.searchMetadata.originalQuery).toBe('');
    });

    it('should find async operations', async () => {
      const searchResult = await capabilityMapper.searchByCapability(
        'fetch data asynchronously',
        capabilityIndex
      );

      expect(searchResult.matches.length).toBeGreaterThan(0);

      // Should find async-related capabilities
      const hasAsyncMatch = searchResult.matches.some(match =>
        match.capability.primaryCapability.includes('async') ||
        match.matchingFunctions.some(f => f.function.isAsync)
      );
      expect(hasAsyncMatch).toBe(true);
    });
  });

  describe('synonym and concept understanding', () => {
    it('should build comprehensive synonym map', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const synonymMap = result.data!.synonymMap;

      expect(synonymMap.size).toBeGreaterThan(0);

      // Check some expected synonyms
      expect(synonymMap.has('filter')).toBe(true);
      expect(synonymMap.has('transform')).toBe(true);
      expect(synonymMap.has('validate')).toBe(true);

      // Check bidirectional mapping
      const filterSynonyms = synonymMap.get('filter');
      if (filterSynonyms) {
        expect(filterSynonyms).toContain('select');
        expect(filterSynonyms).toContain('where');
      }
    });

    it('should build concept hierarchy', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const hierarchy = result.data!.conceptHierarchy;

      expect(hierarchy.rootConcepts.length).toBeGreaterThan(0);
      expect(hierarchy.conceptMap.size).toBeGreaterThan(0);

      // Check hierarchy structure
      for (const rootConcept of hierarchy.rootConcepts) {
        expect(rootConcept.abstractionLevel).toBe(0);
        expect(rootConcept.children.length).toBeGreaterThan(0);
      }
    });

    it('should understand related concepts', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        expect(capability.relatedConcepts).toBeDefined();
        // Related concepts can be empty for some capabilities
      }
    });
  });

  describe('capability extraction from different sources', () => {
    it('should extract capabilities from function descriptions', async () => {
      const functionsWithDescriptions: CompleteFunctionInfo[] = [
        {
          ...mockFunctions[0],
          name: 'processData',
          description: 'Filter and transform data based on criteria',
          completeDescription: 'This function filters the input data and then transforms it according to the specified criteria'
        }
      ];

      const result = await capabilityMapper.buildCapabilityIndex(functionsWithDescriptions);
      const index = result.data!;

      // Should extract both filtering and transformation capabilities from description
      const capabilities = index.capabilities.map(c => c.primaryCapability);
      expect(capabilities.some(c => c.includes('filter') || c.includes('filtering'))).toBe(true);
      expect(capabilities.some(c => c.includes('transform') || c.includes('transformation'))).toBe(true);
    });

    it('should extract capabilities from return types', async () => {
      const functionsWithSpecificReturnTypes: CompleteFunctionInfo[] = [
        {
          ...mockFunctions[0],
          name: 'checkCondition',
          returnType: 'boolean',
          description: 'Check some condition'
        },
        {
          ...mockFunctions[0],
          name: 'getItems',
          returnType: 'Promise<Item[]>',
          description: 'Get items asynchronously'
        }
      ];

      const result = await capabilityMapper.buildCapabilityIndex(functionsWithSpecificReturnTypes);
      const index = result.data!;

      // Should extract validation capability from boolean return type
      const validationCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('validation')
      );
      expect(validationCapability).toBeDefined();

      // Should extract async capability from Promise return type
      const asyncCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('async')
      );
      expect(asyncCapability).toBeDefined();
    });

    it('should extract capabilities from parameter types', async () => {
      const functionsWithSpecificParams: CompleteFunctionInfo[] = [
        {
          ...mockFunctions[0],
          name: 'processWithPredicate',
          parameters: [
            { name: 'data', type: 'any[]', optional: false, description: 'Input data' },
            { name: 'predicate', type: '(item: any) => boolean', optional: false, description: 'Filter predicate' }
          ]
        }
      ];

      const result = await capabilityMapper.buildCapabilityIndex(functionsWithSpecificParams);
      const index = result.data!;

      // Should extract filtering capability from predicate parameter
      const filteringCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('filter') || c.primaryCapability.includes('filtering')
      );
      expect(filteringCapability).toBeDefined();
    });

    it('should extract capabilities from working examples', async () => {
      const functionsWithExamples: CompleteFunctionInfo[] = [
        {
          ...mockFunctions[0],
          name: 'processArray',
          workingExamples: [
            {
              title: 'Filter Example',
              code: 'const result = data.filter(item => item.active);',
              language: 'javascript',
              imports: [],
              setup: [],
              context: 'Filter active items',
              explanation: 'Filter array for active items',
              runnable: true
            }
          ]
        }
      ];

      const result = await capabilityMapper.buildCapabilityIndex(functionsWithExamples);
      const index = result.data!;

      // Should extract filtering capability from example code
      const filteringCapability = index.capabilities.find(c => 
        c.primaryCapability.includes('filter') || c.primaryCapability.includes('filtering')
      );
      expect(filteringCapability).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle capability extraction errors gracefully', async () => {
      // Mock functions with problematic data
      const problematicFunctions = [
        {
          ...mockFunctions[0],
          name: null as any, // Invalid name
          description: undefined as any
        }
      ];

      const result = await capabilityMapper.buildCapabilityIndex(problematicFunctions as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PROCESSING_ERROR');
    });

    it('should handle search with invalid capability index', async () => {
      const invalidIndex = {
        capabilities: [],
        synonymMap: new Map(),
        categoryMap: new Map(),
        conceptHierarchy: { rootConcepts: [], conceptMap: new Map() },
        metadata: {
          totalCapabilities: 0,
          totalFunctions: 0,
          averageRelevanceScore: 0,
          createdAt: new Date(),
          packageName: 'test',
          version: '1.0.0'
        }
      };

      const searchResult = await capabilityMapper.searchByCapability(
        'test query',
        invalidIndex
      );

      expect(searchResult.matches.length).toBe(0);
      expect(searchResult.searchMetadata.totalMatches).toBe(0);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large numbers of functions efficiently', async () => {
      // Create a large set of functions
      const largeFunctionSet: CompleteFunctionInfo[] = [];
      
      for (let i = 0; i < 100; i++) {
        largeFunctionSet.push({
          ...mockFunctions[0],
          name: `function${i}`,
          description: `Function ${i} for data processing`,
          signature: `function${i}(): void`
        });
      }

      const startTime = Date.now();
      const result = await capabilityMapper.buildCapabilityIndex(largeFunctionSet);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data!.metadata.totalFunctions).toBe(largeFunctionSet.length);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should perform searches efficiently', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      const startTime = Date.now();
      const searchResult = await capabilityMapper.searchByCapability(
        'complex query with multiple terms and synonyms',
        index
      );
      const searchTime = Date.now() - startTime;

      expect(searchResult.searchMetadata.searchTime).toBeLessThan(1000); // Should complete within 1 second
      expect(searchTime).toBeLessThan(1000);
    });
  });

  describe('capability quality and relevance', () => {
    it('should assign appropriate relevance scores', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        for (const funcMapping of capability.functions) {
          expect(funcMapping.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(funcMapping.relevanceScore).toBeLessThanOrEqual(1);
          expect(funcMapping.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(funcMapping.confidenceScore).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should provide meaningful matching reasons', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        for (const funcMapping of capability.functions) {
          expect(funcMapping.matchingReasons).toBeDefined();
          expect(funcMapping.matchingReasons.length).toBeGreaterThan(0);
          
          for (const reason of funcMapping.matchingReasons) {
            expect(reason.type).toBeDefined();
            expect(reason.evidence).toBeDefined();
            expect(reason.weight).toBeGreaterThanOrEqual(0);
            expect(reason.weight).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should generate useful usage contexts and examples', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(mockFunctions);
      const index = result.data!;

      for (const capability of index.capabilities) {
        for (const funcMapping of capability.functions) {
          expect(funcMapping.usageContext).toBeDefined();
          expect(funcMapping.usageContext.length).toBeGreaterThan(0);
          expect(funcMapping.exampleUsage).toBeDefined();
          expect(funcMapping.exampleUsage.length).toBeGreaterThan(0);
        }
      }
    });
  });
});

// Helper function for test expectations
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}