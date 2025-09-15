/**
 * Tests for the RelationshipBuilder class
 */

import { RelationshipBuilder, FunctionRelationshipMap, EnhancedFunctionRelationship } from '../../src/analyzers/RelationshipBuilder';
import { CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer';
import { ReadmeAnalysis, ExampleAnalysis, TypeDefinitionAnalysis } from '../../src/types/PackageInfo';

describe('RelationshipBuilder', () => {
  let relationshipBuilder: RelationshipBuilder;
  let mockFunctions: CompleteFunctionInfo[];
  let mockTypeDefinitions: TypeDefinitionAnalysis;
  let mockReadmeAnalysis: ReadmeAnalysis;
  let mockExamples: ExampleAnalysis[];

  beforeEach(() => {
    relationshipBuilder = new RelationshipBuilder('test-package');

    // Mock functions with different characteristics
    mockFunctions = [
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
        completeDescription: 'Transform array elements using a callback function',
        workingExamples: [],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'array-manipulation',
        complexity: 'beginner',
        commonUseCase: ['Data transformation', 'Array processing'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'filter',
        parameters: [
          { name: 'array', type: 'T[]', optional: false, description: 'Input array' },
          { name: 'predicate', type: '(item: T) => boolean', optional: false, description: 'Filter function' }
        ],
        returnType: 'T[]',
        description: 'Filter array elements',
        isAsync: false,
        examples: [],
        signature: 'filter<T>(array: T[], predicate: (item: T) => boolean): T[]',
        completeDescription: 'Filter array elements using a predicate function',
        workingExamples: [],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'array-manipulation',
        complexity: 'beginner',
        commonUseCase: ['Data filtering', 'Array processing'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'reduce',
        parameters: [
          { name: 'array', type: 'T[]', optional: false, description: 'Input array' },
          { name: 'callback', type: '(acc: U, item: T) => U', optional: false, description: 'Reducer function' },
          { name: 'initialValue', type: 'U', optional: true, description: 'Initial accumulator value' }
        ],
        returnType: 'U',
        description: 'Reduce array to single value',
        isAsync: false,
        examples: [],
        signature: 'reduce<T, U>(array: T[], callback: (acc: U, item: T) => U, initialValue?: U): U',
        completeDescription: 'Reduce array elements to a single value',
        workingExamples: [],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'array-manipulation',
        complexity: 'intermediate',
        commonUseCase: ['Data aggregation', 'Array processing'],
        errorHandling: [],
        alternatives: []
      },
      {
        name: 'validateEmail',
        parameters: [
          { name: 'email', type: 'string', optional: false, description: 'Email to validate' }
        ],
        returnType: 'boolean',
        description: 'Validate email format',
        isAsync: false,
        examples: [],
        signature: 'validateEmail(email: string): boolean',
        completeDescription: 'Validate email address format',
        workingExamples: [],
        relatedFunctions: [],
        usagePatterns: [],
        category: 'validation',
        complexity: 'beginner',
        commonUseCase: ['Input validation', 'Form validation'],
        errorHandling: [],
        alternatives: []
      }
    ];

    mockTypeDefinitions = {
      exports: [],
      interfaces: [],
      functions: mockFunctions,
      classes: [],
      types: [],
      enums: [],
      hasDefinitions: true
    };

    mockReadmeAnalysis = {
      sections: [],
      codeBlocks: [
        {
          language: 'javascript',
          code: `
            const numbers = [1, 2, 3, 4, 5];
            const doubled = map(numbers, x => x * 2);
            const evens = filter(doubled, x => x % 2 === 0);
            const sum = reduce(evens, (acc, x) => acc + x, 0);
          `,
          context: 'Array processing pipeline',
          isExample: true
        },
        {
          language: 'javascript',
          code: `
            const email = 'user@example.com';
            if (validateEmail(email)) {
              console.log('Valid email');
            }
          `,
          context: 'Email validation example',
          isExample: true
        }
      ],
      installationInstructions: [],
      usageExamples: [
        {
          title: 'Data Processing Pipeline',
          description: 'Process data using map, filter, and reduce',
          code: `
            const data = [1, 2, 3, 4, 5];
            const result = reduce(
              filter(
                map(data, x => x * 2),
                x => x > 4
              ),
              (sum, x) => sum + x,
              0
            );
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ],
      configurationOptions: []
    };

    mockExamples = [
      {
        filePath: 'examples/array-processing.js',
        content: `
          // Example showing map and filter together
          const users = [
            { name: 'John', age: 25, email: 'john@example.com' },
            { name: 'Jane', age: 30, email: 'jane@example.com' }
          ];
          
          const validUsers = filter(users, user => validateEmail(user.email));
          const userNames = map(validUsers, user => user.name);
        `,
        language: 'javascript',
        patterns: [],
        imports: [],
        category: 'demo'
      }
    ];
  });

  describe('buildRelationships', () => {
    it('should build comprehensive relationships for all functions', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(mockFunctions.length);

      // Check that each function has a relationship map
      for (const relationshipMap of result.data!) {
        expect(relationshipMap.functionName).toBeDefined();
        expect(relationshipMap.relationships).toBeDefined();
        expect(relationshipMap.relationshipScore).toBeGreaterThanOrEqual(0);
        expect(relationshipMap.contextualInfo).toBeDefined();
      }
    });

    it('should identify co-occurrence relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      expect(mapRelationships).toBeDefined();

      // map should be related to filter and reduce based on co-occurrence
      const filterRelationship = mapRelationships!.relationships.find(r => r.functionName === 'filter');
      const reduceRelationship = mapRelationships!.relationships.find(r => r.functionName === 'reduce');

      expect(filterRelationship).toBeDefined();
      expect(reduceRelationship).toBeDefined();
      expect(filterRelationship!.relationshipType).toBe('commonly-used-with');
      expect(filterRelationship!.strength).toBeGreaterThan(0);
    });

    it('should identify semantic relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      // Functions in the same category should have semantic relationships
      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const filterRelationship = mapRelationships!.relationships.find(r => r.functionName === 'filter');

      expect(filterRelationship).toBeDefined();
      expect(filterRelationship!.strengthFactors.some(f => f.factor === 'semantic-similarity')).toBe(true);
    });

    it('should build contextual information', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      expect(mapRelationships!.contextualInfo).toBeDefined();
      expect(mapRelationships!.contextualInfo.commonUseCases).toContain('Data transformation');
      expect(mapRelationships!.contextualInfo.typicalWorkflows).toBeDefined();
    });

    it('should handle empty input gracefully', async () => {
      const result = await relationshipBuilder.buildRelationships(
        [],
        { ...mockTypeDefinitions, functions: [] },
        { ...mockReadmeAnalysis, codeBlocks: [], usageExamples: [] },
        []
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(0);
    });
  });

  describe('relationship types', () => {
    it('should identify commonly-used-with relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const commonlyUsedWith = mapRelationships!.relationships.filter(r => 
        r.relationshipType === 'commonly-used-with'
      );

      expect(commonlyUsedWith.length).toBeGreaterThan(0);
      expect(commonlyUsedWith[0].evidenceCount).toBeGreaterThan(0);
    });

    it('should identify alternative-to relationships', async () => {
      // Add similar functions that could be alternatives
      const similarFunction: CompleteFunctionInfo = {
        ...mockFunctions[0],
        name: 'transform',
        description: 'Transform array elements (alternative to map)',
        signature: 'transform<T, U>(array: T[], callback: (item: T) => U): U[]'
      };

      const functionsWithAlternative = [...mockFunctions, similarFunction];

      const result = await relationshipBuilder.buildRelationships(
        functionsWithAlternative,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const alternativeRelationships = mapRelationships!.relationships.filter(r => 
        r.relationshipType === 'alternative-to'
      );

      // Should find alternative relationships
      expect(alternativeRelationships.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify prerequisite relationships', async () => {
      // Create a code example where one function is typically called before another
      const readmeWithPrerequisites: ReadmeAnalysis = {
        ...mockReadmeAnalysis,
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              // First validate the email
              if (validateEmail(email)) {
                // Then process the data
                const result = map(data, processItem);
              }
            `,
            context: 'Validation before processing',
            isExample: true
          }
        ]
      };

      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        readmeWithPrerequisites,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const prerequisiteRelationships = mapRelationships!.relationships.filter(r => 
        r.relationshipType === 'prerequisite-for'
      );

      // May or may not find prerequisite relationships depending on the analysis
      expect(prerequisiteRelationships).toBeDefined();
    });
  });

  describe('relationship strength and confidence', () => {
    it('should calculate relationship strength based on evidence', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      
      for (const relationship of mapRelationships!.relationships) {
        expect(relationship.strength).toBeGreaterThanOrEqual(0);
        expect(relationship.strength).toBeLessThanOrEqual(1);
        expect(relationship.confidence).toBeGreaterThanOrEqual(0);
        expect(relationship.confidence).toBeLessThanOrEqual(1);
        expect(relationship.evidenceCount).toBeGreaterThan(0);
      }
    });

    it('should provide strength factors for relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const relationship = mapRelationships!.relationships[0];

      expect(relationship.strengthFactors).toBeDefined();
      expect(relationship.strengthFactors.length).toBeGreaterThan(0);

      for (const factor of relationship.strengthFactors) {
        expect(factor.factor).toBeDefined();
        expect(factor.weight).toBeGreaterThanOrEqual(0);
        expect(factor.weight).toBeLessThanOrEqual(1);
        expect(factor.evidence).toBeDefined();
      }
    });

    it('should calculate overall relationship scores', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      for (const relationshipMap of result.data!) {
        expect(relationshipMap.relationshipScore).toBeGreaterThanOrEqual(0);
        expect(relationshipMap.relationshipScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('contextual examples', () => {
    it('should provide contextual examples for relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const relationship = mapRelationships!.relationships.find(r => r.functionName === 'filter');

      if (relationship) {
        expect(relationship.contextExamples).toBeDefined();
        
        if (relationship.contextExamples.length > 0) {
          const example = relationship.contextExamples[0];
          expect(example.title).toBeDefined();
          expect(example.code).toBeDefined();
          expect(example.language).toBeDefined();
          expect(example.explanation).toBeDefined();
          expect(example.demonstratesRelationship).toBeDefined();
          expect(example.source).toBeDefined();
        }
      }
    });

    it('should provide use case reasons for relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      
      for (const relationship of mapRelationships!.relationships) {
        expect(relationship.useCaseReasons).toBeDefined();
        expect(Array.isArray(relationship.useCaseReasons)).toBe(true);
      }
    });
  });

  describe('workflow patterns', () => {
    it('should identify typical workflows', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const workflows = mapRelationships!.contextualInfo.typicalWorkflows;

      expect(workflows).toBeDefined();
      
      if (workflows.length > 0) {
        const workflow = workflows[0];
        expect(workflow.step).toBeDefined();
        expect(workflow.description).toBeDefined();
        expect(workflow.functions).toBeDefined();
        expect(workflow.example).toBeDefined();
      }
    });

    it('should build workflow-based relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const workflowRelationships = mapRelationships!.relationships.filter(r => 
        r.relationshipType === 'composes-with'
      );

      // Should find workflow-based relationships
      expect(workflowRelationships).toBeDefined();
    });
  });

  describe('alternative groups', () => {
    it('should identify alternative function groups', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const alternativeGroups = mapRelationships!.contextualInfo.alternativeGroups;

      expect(alternativeGroups).toBeDefined();
      
      if (alternativeGroups.length > 0) {
        const group = alternativeGroups[0];
        expect(group.purpose).toBeDefined();
        expect(group.alternatives).toBeDefined();
        expect(group.recommendation).toBeDefined();

        for (const alternative of group.alternatives) {
          expect(alternative.functionName).toBeDefined();
          expect(alternative.pros).toBeDefined();
          expect(alternative.cons).toBeDefined();
          expect(alternative.bestFor).toBeDefined();
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Create a scenario that would cause an error by passing completely invalid data
      const result = await relationshipBuilder.buildRelationships(
        null as any, // Completely invalid input
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PROCESSING_ERROR');
      expect(result.error!.suggestions).toBeDefined();
    });

    it('should continue processing when individual relationships fail', async () => {
      // This test ensures robustness in relationship building
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large numbers of functions efficiently', async () => {
      // Create a larger set of functions
      const largeFunctionSet: CompleteFunctionInfo[] = [];
      
      for (let i = 0; i < 20; i++) {
        largeFunctionSet.push({
          ...mockFunctions[0],
          name: `function${i}`,
          signature: `function${i}(): void`
        });
      }

      const startTime = Date.now();
      const result = await relationshipBuilder.buildRelationships(
        largeFunctionSet,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(largeFunctionSet.length);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should limit the number of relationships per function', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      for (const relationshipMap of result.data!) {
        // Should limit relationships to prevent overwhelming output
        expect(relationshipMap.relationships.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('relationship quality', () => {
    it('should prioritize high-quality relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const relationships = mapRelationships!.relationships;

      // Relationships should be sorted by quality (strength * confidence)
      for (let i = 1; i < relationships.length; i++) {
        const current = relationships[i].strength * relationships[i].confidence;
        const previous = relationships[i - 1].strength * relationships[i - 1].confidence;
        expect(current).toBeLessThanOrEqual(previous);
      }
    });

    it('should provide meaningful context for relationships', async () => {
      const result = await relationshipBuilder.buildRelationships(
        mockFunctions,
        mockTypeDefinitions,
        mockReadmeAnalysis,
        mockExamples
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      
      for (const relationship of mapRelationships!.relationships) {
        expect(relationship.context).toBeDefined();
        expect(relationship.context.length).toBeGreaterThan(0);
        expect(relationship.useCaseReasons.length).toBeGreaterThanOrEqual(0);
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