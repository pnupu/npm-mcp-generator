/**
 * Integration tests for CapabilityMapper with real package data
 */

import { CapabilityMapper } from '../../src/analyzers/CapabilityMapper';
import { CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer';

describe('CapabilityMapper Integration Tests', () => {
  describe('Lodash package capabilities', () => {
    let capabilityMapper: CapabilityMapper;
    let lodashFunctions: CompleteFunctionInfo[];

    beforeEach(() => {
      capabilityMapper = new CapabilityMapper('lodash');

      // Real lodash functions with realistic data
      lodashFunctions = [
        {
          name: 'filter',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to iterate over' },
            { name: 'predicate', type: '(value: T) => boolean', optional: false, description: 'The function invoked per iteration' }
          ],
          returnType: 'T[]',
          description: 'Iterates over elements of collection, returning an array of all elements predicate returns truthy for',
          isAsync: false,
          examples: [],
          signature: 'filter<T>(collection: T[], predicate: (value: T) => boolean): T[]',
          completeDescription: 'Iterates over elements of collection, returning an array of all elements predicate returns truthy for. The predicate is invoked with three arguments: (value, index|key, collection).',
          workingExamples: [
            {
              title: 'Filter Active Users',
              code: 'const activeUsers = filter(users, user => user.active);',
              language: 'javascript',
              imports: ['lodash'],
              setup: [],
              context: 'Filter active users from array',
              explanation: 'Get only active users from the users array',
              runnable: true
            }
          ],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'beginner',
          commonUseCase: ['Data filtering', 'Array processing', 'Conditional selection'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'map',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to iterate over' },
            { name: 'iteratee', type: '(value: T) => U', optional: false, description: 'The function invoked per iteration' }
          ],
          returnType: 'U[]',
          description: 'Creates an array of values by running each element in collection thru iteratee',
          isAsync: false,
          examples: [],
          signature: 'map<T, U>(collection: T[], iteratee: (value: T) => U): U[]',
          completeDescription: 'Creates an array of values by running each element in collection thru iteratee. The iteratee is invoked with three arguments: (value, index|key, collection).',
          workingExamples: [
            {
              title: 'Transform User Names',
              code: 'const names = map(users, user => user.name.toUpperCase());',
              language: 'javascript',
              imports: ['lodash'],
              setup: [],
              context: 'Transform user objects to uppercase names',
              explanation: 'Extract and transform user names to uppercase',
              runnable: true
            }
          ],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'beginner',
          commonUseCase: ['Data transformation', 'Array processing', 'Object property extraction'],
          errorHandling: [],
          alternatives: []
        }
      ];
    });

    it('should build comprehensive capability index for lodash functions', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(lodashFunctions);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const index = result.data!;
      expect(index.capabilities.length).toBeGreaterThan(0);
      expect(index.metadata.packageName).toBe('lodash');
      expect(index.metadata.totalFunctions).toBe(lodashFunctions.length);

      // Should identify filtering and transformation capabilities
      const capabilityNames = index.capabilities.map(c => c.primaryCapability);
      expect(capabilityNames.some(name => name.includes('filter') || name.includes('filtering'))).toBe(true);
      expect(capabilityNames.some(name => name.includes('transform') || name.includes('transformation'))).toBe(true);
    });

    it('should find lodash functions by natural language queries', async () => {
      const result = await capabilityMapper.buildCapabilityIndex(lodashFunctions);
      const index = result.data!;

      // Test various natural language queries
      const queries = [
        'filter array items',
        'select elements that match condition',
        'transform data',
        'convert array elements',
        'process collection items'
      ];

      for (const query of queries) {
        const searchResult = await capabilityMapper.searchByCapability(query, index);
        expect(searchResult.matches.length).toBeGreaterThan(0);
        expect(searchResult.searchMetadata.originalQuery).toBe(query);
      }
    });
  });
});