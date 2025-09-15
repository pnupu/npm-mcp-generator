/**
 * Tests for FunctionAnalyzer class
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FunctionAnalyzer, CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer';
import { 
  TypeDefinitionAnalysis, 
  ReadmeAnalysis, 
  ExampleAnalysis,
  FunctionInfo,
  ParameterInfo
} from '../../src/types/PackageInfo';

describe('FunctionAnalyzer', () => {
  let analyzer: FunctionAnalyzer;
  let mockTypeDefinitions: TypeDefinitionAnalysis;
  let mockReadmeAnalysis: ReadmeAnalysis;
  let mockExamples: ExampleAnalysis[];

  beforeEach(() => {
    analyzer = new FunctionAnalyzer();

    // Mock function for testing
    const mockFunction: FunctionInfo = {
      name: 'map',
      parameters: [
        {
          name: 'array',
          type: 'T[]',
          optional: false,
          description: 'The array to iterate over'
        },
        {
          name: 'iteratee',
          type: '(value: T, index: number, array: T[]) => U',
          optional: false,
          description: 'The function invoked per iteration'
        }
      ],
      returnType: 'U[]',
      description: 'Creates an array of values by running each element through iteratee',
      isAsync: false,
      examples: []
    };

    mockTypeDefinitions = {
      exports: [],
      interfaces: [],
      functions: [mockFunction],
      classes: [],
      types: [],
      enums: [],
      hasDefinitions: true
    };

    mockReadmeAnalysis = {
      sections: [
        {
          title: 'Usage',
          level: 2,
          content: 'The map function creates a new array with the results of calling a provided function on every element.',
          subsections: []
        }
      ],
      codeBlocks: [
        {
          language: 'javascript',
          code: `import { map } from 'lodash';

const numbers = [1, 2, 3, 4];
const doubled = map(numbers, n => n * 2);
console.log(doubled); // [2, 4, 6, 8]`,
          context: 'Basic usage example',
          isExample: true
        }
      ],
      installationInstructions: [],
      usageExamples: [
        {
          title: 'Basic Map Example',
          description: 'Transform array elements',
          code: `const result = map([1, 2, 3], x => x * 2);`,
          language: 'javascript',
          imports: ['map'],
          category: 'basic'
        }
      ],
      configurationOptions: []
    };

    mockExamples = [
      {
        filePath: 'examples/map-demo.js',
        content: `const { map } = require('lodash');

// Transform user objects
const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];

const names = map(users, user => user.name);
console.log(names); // ['John', 'Jane']`,
        language: 'javascript',
        patterns: [],
        imports: ['lodash'],
        category: 'demo'
      }
    ];
  });

  describe('analyze', () => {
    it('should analyze functions successfully', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('map');
    });

    it('should handle empty function list', async () => {
      const emptyTypeDefinitions = {
        ...mockTypeDefinitions,
        functions: []
      };

      const result = await analyzer.analyze(emptyTypeDefinitions, mockReadmeAnalysis, mockExamples);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.warnings).toContain('No functions found in type definitions');
    });

    it('should handle analysis errors gracefully', async () => {
      // Create invalid type definitions that would cause an error
      const invalidTypeDefinitions = null as any;

      const result = await analyzer.analyze(invalidTypeDefinitions, mockReadmeAnalysis, mockExamples);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PROCESSING_ERROR');
    });
  });

  describe('function analysis', () => {
    let completeFunction: CompleteFunctionInfo;

    beforeEach(async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      completeFunction = result.data![0];
    });

    it('should build complete signature', () => {
      expect(completeFunction.signature).toBe('map(array: T[], iteratee: (value: T, index: number, array: T[]) => U): U[]');
    });

    it('should extract complete description', () => {
      expect(completeFunction.completeDescription).toContain('creates a new array');
    });

    it('should extract working examples', () => {
      expect(completeFunction.workingExamples).toHaveLength(3); // README code block + usage example + example file
      
      const firstExample = completeFunction.workingExamples[0];
      expect(firstExample.code).toContain('map');
      expect(firstExample.language).toBe('javascript');
      expect(firstExample.runnable).toBe(true);
    });

    it('should identify usage patterns', () => {
      expect(completeFunction.usagePatterns.length).toBeGreaterThan(0);
      
      const hasImportPattern = completeFunction.usagePatterns.some(p => p.type === 'import');
      const hasUsagePattern = completeFunction.usagePatterns.some(p => p.type === 'basic-usage' || p.type === 'advanced-usage');
      
      expect(hasImportPattern).toBe(true);
      expect(hasUsagePattern).toBe(true);
    });

    it('should categorize function correctly', () => {
      expect(completeFunction.category).toBe('array-manipulation');
    });

    it('should assess complexity', () => {
      expect(['beginner', 'intermediate', 'advanced']).toContain(completeFunction.complexity);
    });

    it('should identify common use cases', () => {
      expect(completeFunction.commonUseCase.length).toBeGreaterThan(0);
    });
  });

  describe('function categorization', () => {
    it('should categorize array manipulation functions', async () => {
      const arrayFunc: FunctionInfo = {
        name: 'filter',
        parameters: [],
        returnType: 'T[]',
        isAsync: false,
        description: 'Filters array elements'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [arrayFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].category).toBe('array-manipulation');
    });

    it('should categorize async functions', async () => {
      const asyncFunc: FunctionInfo = {
        name: 'fetchData',
        parameters: [],
        returnType: 'Promise<Data>',
        isAsync: true,
        description: 'Fetches data asynchronously'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [asyncFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].category).toBe('async');
    });

    it('should categorize validation functions', async () => {
      const validationFunc: FunctionInfo = {
        name: 'isString',
        parameters: [],
        returnType: 'boolean',
        isAsync: false,
        description: 'Checks if value is a string'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [validationFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].category).toBe('validation');
    });

    it('should categorize getter functions', async () => {
      const getterFunc: FunctionInfo = {
        name: 'getValue',
        parameters: [],
        returnType: 'any',
        isAsync: false,
        description: 'Gets a value'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [getterFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].category).toBe('getter');
    });
  });

  describe('complexity assessment', () => {
    it('should assess beginner complexity for simple functions', async () => {
      const simpleFunc: FunctionInfo = {
        name: 'add',
        parameters: [
          { name: 'a', type: 'number', optional: false },
          { name: 'b', type: 'number', optional: false }
        ],
        returnType: 'number',
        isAsync: false,
        description: 'Adds two numbers'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [simpleFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].complexity).toBe('beginner');
    });

    it('should assess advanced complexity for complex functions', async () => {
      const complexFunc: FunctionInfo = {
        name: 'complexTransform',
        parameters: [
          { name: 'data', type: 'T[]', optional: false },
          { name: 'transformer', type: '(item: T, index: number) => U | Promise<U>', optional: false },
          { name: 'options', type: 'TransformOptions & { parallel?: boolean }', optional: true },
          { name: 'callback', type: '(error: Error | null, result?: U[]) => void', optional: true }
        ],
        returnType: 'Promise<U[]>',
        isAsync: true,
        description: 'Complex data transformation with options'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [complexFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      expect(result.data![0].complexity).toBe('advanced');
    });
  });

  describe('relationship building', () => {
    it('should identify commonly used together functions', async () => {
      const mapFunc: FunctionInfo = {
        name: 'map',
        parameters: [],
        returnType: 'T[]',
        isAsync: false,
        description: 'Maps array elements'
      };

      const filterFunc: FunctionInfo = {
        name: 'filter',
        parameters: [],
        returnType: 'T[]',
        isAsync: false,
        description: 'Filters array elements'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [mapFunc, filterFunc]
      };

      // Add code that uses both functions together
      const readmeWithBothFunctions = {
        ...mockReadmeAnalysis,
        codeBlocks: [
          {
            language: 'javascript',
            code: `const result = map(filter(data, x => x.active), x => x.name);`,
            context: 'Chaining example',
            isExample: true
          }
        ]
      };

      const result = await analyzer.analyze(typeDefinitions, readmeWithBothFunctions, []);
      
      const mapFunction = result.data!.find(f => f.name === 'map')!;
      expect(mapFunction.relatedFunctions.length).toBeGreaterThan(0);
      
      const filterRelationship = mapFunction.relatedFunctions.find(r => r.functionName === 'filter');
      expect(filterRelationship).toBeDefined();
      expect(filterRelationship!.relationshipType).toBe('commonly-used-with');
    });
  });

  describe('alternative identification', () => {
    it('should identify alternative functions', async () => {
      const mapFunc: FunctionInfo = {
        name: 'map',
        parameters: [],
        returnType: 'T[]',
        isAsync: false,
        description: 'Maps array elements'
      };

      const forEachFunc: FunctionInfo = {
        name: 'forEach',
        parameters: [],
        returnType: 'void',
        isAsync: false,
        description: 'Iterates over array elements'
      };

      const typeDefinitions = {
        ...mockTypeDefinitions,
        functions: [mapFunc, forEachFunc]
      };

      const result = await analyzer.analyze(typeDefinitions, mockReadmeAnalysis, []);
      
      // Both functions should have alternatives identified (though they serve different purposes)
      const mapFunction = result.data!.find(f => f.name === 'map')!;
      expect(mapFunction.alternatives).toBeDefined();
    });
  });

  describe('pattern extraction', () => {
    it('should extract import patterns', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      const func = result.data![0];
      
      const importPattern = func.usagePatterns.find(p => p.type === 'import');
      expect(importPattern).toBeDefined();
      expect(importPattern!.pattern).toContain('import');
    });

    it('should extract usage patterns', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      const func = result.data![0];
      
      const usagePattern = func.usagePatterns.find(p => p.type === 'basic-usage' || p.type === 'advanced-usage');
      expect(usagePattern).toBeDefined();
      expect(usagePattern!.pattern).toContain('map(');
    });

    it('should extract error handling patterns', async () => {
      const readmeWithErrorHandling = {
        ...mockReadmeAnalysis,
        codeBlocks: [
          {
            language: 'javascript',
            code: `try {
  const result = map(data, transform);
  console.log(result);
} catch (error) {
  console.error('Map failed:', error);
}`,
            context: 'Error handling example',
            isExample: true
          }
        ]
      };

      const result = await analyzer.analyze(mockTypeDefinitions, readmeWithErrorHandling, []);
      const func = result.data![0];
      
      const errorPattern = func.usagePatterns.find(p => p.type === 'error-handling');
      expect(errorPattern).toBeDefined();
    });
  });

  describe('working examples enhancement', () => {
    it('should enhance examples with missing imports', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      const func = result.data![0];
      
      // All examples should have some form of import information
      func.workingExamples.forEach(example => {
        expect(example.imports.length).toBeGreaterThan(0);
      });
    });

    it('should mark examples as runnable when appropriate', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      const func = result.data![0];
      
      // Examples with imports should be marked as runnable
      const runnableExamples = func.workingExamples.filter(ex => ex.runnable);
      expect(runnableExamples.length).toBeGreaterThan(0);
    });

    it('should provide explanations for examples', async () => {
      const result = await analyzer.analyze(mockTypeDefinitions, mockReadmeAnalysis, mockExamples);
      const func = result.data![0];
      
      func.workingExamples.forEach(example => {
        expect(example.explanation).toBeDefined();
        expect(example.explanation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should extract error handling information', async () => {
      const readmeWithErrors = {
        ...mockReadmeAnalysis,
        codeBlocks: [
          {
            language: 'javascript',
            code: `map(data, item => {
  if (!item) {
    throw new Error('Invalid item');
  }
  return item.value;
}).catch(error => {
  console.error('Processing failed:', error);
});`,
            context: 'Error handling',
            isExample: true
          }
        ]
      };

      const result = await analyzer.analyze(mockTypeDefinitions, readmeWithErrors, []);
      const func = result.data![0];
      
      expect(func.errorHandling.length).toBeGreaterThan(0);
      
      const errorInfo = func.errorHandling[0];
      expect(errorInfo.errorType).toBeDefined();
      expect(errorInfo.description).toBeDefined();
      expect(errorInfo.solution).toBeDefined();
      expect(errorInfo.example).toBeDefined();
    });
  });
});