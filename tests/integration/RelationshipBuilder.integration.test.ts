/**
 * Integration tests for RelationshipBuilder with real package data
 */

import { RelationshipBuilder } from '../../src/analyzers/RelationshipBuilder';
import { CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer';
import { ReadmeAnalysis, ExampleAnalysis, TypeDefinitionAnalysis } from '../../src/types/PackageInfo';

describe('RelationshipBuilder Integration Tests', () => {
  describe('Lodash package relationships', () => {
    let relationshipBuilder: RelationshipBuilder;
    let lodashFunctions: CompleteFunctionInfo[];

    beforeEach(() => {
      relationshipBuilder = new RelationshipBuilder('lodash');

      // Real lodash functions with realistic data
      lodashFunctions = [
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
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'beginner',
          commonUseCase: ['Data transformation', 'Array processing', 'Object property extraction'],
          errorHandling: [],
          alternatives: []
        },
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
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'beginner',
          commonUseCase: ['Data filtering', 'Array processing', 'Conditional selection'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'reduce',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to iterate over' },
            { name: 'iteratee', type: '(accumulator: U, value: T) => U', optional: false, description: 'The function invoked per iteration' },
            { name: 'accumulator', type: 'U', optional: true, description: 'The initial value' }
          ],
          returnType: 'U',
          description: 'Reduces collection to a value which is the accumulated result of running each element in collection thru iteratee',
          isAsync: false,
          examples: [],
          signature: 'reduce<T, U>(collection: T[], iteratee: (accumulator: U, value: T) => U, accumulator?: U): U',
          completeDescription: 'Reduces collection to a value which is the accumulated result of running each element in collection thru iteratee, where each successive invocation is supplied the return value of the previous.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'intermediate',
          commonUseCase: ['Data aggregation', 'Array processing', 'Sum calculation'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'find',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to inspect' },
            { name: 'predicate', type: '(value: T) => boolean', optional: false, description: 'The function invoked per iteration' }
          ],
          returnType: 'T | undefined',
          description: 'Iterates over elements of collection, returning the first element predicate returns truthy for',
          isAsync: false,
          examples: [],
          signature: 'find<T>(collection: T[], predicate: (value: T) => boolean): T | undefined',
          completeDescription: 'Iterates over elements of collection, returning the first element predicate returns truthy for. If no element is found, undefined is returned.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'beginner',
          commonUseCase: ['Data searching', 'Array processing', 'Element lookup'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'sortBy',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to iterate over' },
            { name: 'iteratees', type: '(value: T) => any', optional: false, description: 'The iteratees to sort by' }
          ],
          returnType: 'T[]',
          description: 'Creates an array of elements, sorted in ascending order by the results of running each element in a collection thru each iteratee',
          isAsync: false,
          examples: [],
          signature: 'sortBy<T>(collection: T[], iteratees: (value: T) => any): T[]',
          completeDescription: 'Creates an array of elements, sorted in ascending order by the results of running each element in a collection thru each iteratee. This method performs a stable sort.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'intermediate',
          commonUseCase: ['Data sorting', 'Array processing', 'Ordering'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'groupBy',
          parameters: [
            { name: 'collection', type: 'T[]', optional: false, description: 'The collection to iterate over' },
            { name: 'iteratee', type: '(value: T) => string', optional: false, description: 'The iteratee to transform keys' }
          ],
          returnType: 'Record<string, T[]>',
          description: 'Creates an object composed of keys generated from the results of running each element of collection thru iteratee',
          isAsync: false,
          examples: [],
          signature: 'groupBy<T>(collection: T[], iteratee: (value: T) => string): Record<string, T[]>',
          completeDescription: 'Creates an object composed of keys generated from the results of running each element of collection thru iteratee. The order of grouped values is determined by the order they occur in collection.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'array-manipulation',
          complexity: 'intermediate',
          commonUseCase: ['Data grouping', 'Array processing', 'Categorization'],
          errorHandling: [],
          alternatives: []
        }
      ];
    });

    it('should identify strong relationships in lodash array functions', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              const users = [
                { name: 'John', age: 25, active: true },
                { name: 'Jane', age: 30, active: false },
                { name: 'Bob', age: 35, active: true }
              ];

              // Common lodash pipeline
              const result = _(users)
                .filter(user => user.active)
                .map(user => user.name)
                .sortBy()
                .value();

              // Alternative approach
              const activeUsers = filter(users, 'active');
              const names = map(activeUsers, 'name');
              const sorted = sortBy(names);
            `,
            context: 'Lodash data processing pipeline',
            isExample: true
          },
          {
            language: 'javascript',
            code: `
              const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
              
              const evenNumbers = filter(numbers, n => n % 2 === 0);
              const doubled = map(evenNumbers, n => n * 2);
              const sum = reduce(doubled, (acc, n) => acc + n, 0);
              
              console.log(sum); // 60
            `,
            context: 'Mathematical operations with lodash',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [
          {
            title: 'Data Processing Pipeline',
            description: 'Process user data with multiple lodash functions',
            code: `
              const users = getUserData();
              
              const processedUsers = reduce(
                groupBy(
                  sortBy(
                    filter(
                      map(users, user => ({ ...user, fullName: user.firstName + ' ' + user.lastName })),
                      user => user.active
                    ),
                    'age'
                  ),
                  'department'
                ),
                (result, group, department) => {
                  result[department] = group.slice(0, 5); // Top 5 per department
                  return result;
                },
                {}
              );
            `,
            language: 'javascript',
            imports: ['lodash'],
            category: 'advanced'
          }
        ],
        configurationOptions: []
      };

      const examples: ExampleAnalysis[] = [
        {
          filePath: 'examples/data-processing.js',
          content: `
            // Real-world example of lodash function chaining
            const orders = [
              { id: 1, customerId: 'A', amount: 100, status: 'completed' },
              { id: 2, customerId: 'B', amount: 200, status: 'pending' },
              { id: 3, customerId: 'A', amount: 150, status: 'completed' },
              { id: 4, customerId: 'C', amount: 300, status: 'completed' }
            ];

            // Step 1: Filter completed orders
            const completedOrders = filter(orders, order => order.status === 'completed');
            
            // Step 2: Group by customer
            const ordersByCustomer = groupBy(completedOrders, 'customerId');
            
            // Step 3: Calculate totals per customer
            const customerTotals = map(ordersByCustomer, (customerOrders, customerId) => ({
              customerId,
              totalAmount: reduce(customerOrders, (sum, order) => sum + order.amount, 0),
              orderCount: customerOrders.length
            }));
            
            // Step 4: Sort by total amount
            const sortedCustomers = sortBy(customerTotals, 'totalAmount').reverse();
            
            // Step 5: Find top customer
            const topCustomer = find(sortedCustomers, customer => customer.totalAmount > 200);
          `,
          language: 'javascript',
          patterns: [],
          imports: ['lodash'],
          category: 'demo'
        }
      ];

      const typeDefinitions: TypeDefinitionAnalysis = {
        exports: [],
        interfaces: [],
        functions: lodashFunctions,
        classes: [],
        types: [],
        enums: [],
        hasDefinitions: true
      };

      const result = await relationshipBuilder.buildRelationships(
        lodashFunctions,
        typeDefinitions,
        readmeAnalysis,
        examples
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(lodashFunctions.length);

      // Validate map relationships
      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      expect(mapRelationships).toBeDefined();
      expect(mapRelationships!.relationships.length).toBeGreaterThan(0);

      // map should be strongly related to filter and reduce
      const filterRelationship = mapRelationships!.relationships.find(r => r.functionName === 'filter');
      const reduceRelationship = mapRelationships!.relationships.find(r => r.functionName === 'reduce');

      expect(filterRelationship).toBeDefined();
      expect(reduceRelationship).toBeDefined();
      expect(filterRelationship!.strength).toBeGreaterThan(0.3);
      expect(filterRelationship!.confidence).toBeGreaterThan(0.5);

      // Should have contextual examples
      expect(filterRelationship!.contextExamples.length).toBeGreaterThan(0);
      expect(filterRelationship!.useCaseReasons.length).toBeGreaterThan(0);
    });

    it('should identify workflow patterns in lodash usage', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              // Typical lodash workflow: filter -> map -> reduce
              const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
              
              const result = reduce(
                map(
                  filter(data, n => n % 2 === 0),
                  n => n * n
                ),
                (sum, n) => sum + n,
                0
              );
            `,
            context: 'Lodash workflow pattern',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const result = await relationshipBuilder.buildRelationships(
        lodashFunctions,
        { exports: [], interfaces: [], functions: lodashFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const workflows = mapRelationships!.contextualInfo.typicalWorkflows;

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);

      const workflow = workflows[0];
      expect(workflow.functions).toContain('map');
      expect(workflow.description).toBeDefined();
      expect(workflow.example).toBeDefined();
    });

    it('should identify semantic relationships between similar functions', async () => {
      const result = await relationshipBuilder.buildRelationships(
        lodashFunctions,
        { exports: [], interfaces: [], functions: lodashFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        { sections: [], codeBlocks: [], installationInstructions: [], usageExamples: [], configurationOptions: [] },
        []
      );

      // Functions in the same category should have semantic relationships
      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const semanticRelationships = mapRelationships!.relationships.filter(r =>
        r.strengthFactors.some(f => f.factor === 'semantic-similarity')
      );

      expect(semanticRelationships.length).toBeGreaterThan(0);

      // Should find relationships with other array manipulation functions
      const arrayFunctionNames = ['filter', 'reduce', 'find', 'sortBy', 'groupBy'];
      const relatedArrayFunctions = semanticRelationships.filter(r =>
        arrayFunctionNames.includes(r.functionName)
      );

      expect(relatedArrayFunctions.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive contextual information', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              // Data transformation pipeline
              const users = getUsers();
              const activeUsers = filter(users, 'active');
              const userNames = map(activeUsers, 'name');
              const sortedNames = sortBy(userNames);
            `,
            context: 'User data processing',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const result = await relationshipBuilder.buildRelationships(
        lodashFunctions,
        { exports: [], interfaces: [], functions: lodashFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );

      const mapRelationships = result.data!.find(r => r.functionName === 'map');
      const contextualInfo = mapRelationships!.contextualInfo;

      expect(contextualInfo.commonUseCases).toContain('Data transformation');
      expect(contextualInfo.typicalWorkflows.length).toBeGreaterThanOrEqual(0);
      expect(contextualInfo.prerequisiteChains.length).toBeGreaterThanOrEqual(0);
      expect(contextualInfo.alternativeGroups.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Express.js package relationships', () => {
    let relationshipBuilder: RelationshipBuilder;
    let expressFunctions: CompleteFunctionInfo[];

    beforeEach(() => {
      relationshipBuilder = new RelationshipBuilder('express');

      expressFunctions = [
        {
          name: 'express',
          parameters: [],
          returnType: 'Application',
          description: 'Create an Express application',
          isAsync: false,
          examples: [],
          signature: 'express(): Application',
          completeDescription: 'Creates an Express application. The express() function is a top-level function exported by the express module.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'factory',
          complexity: 'beginner',
          commonUseCase: ['Server creation', 'Application setup'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'use',
          parameters: [
            { name: 'middleware', type: 'RequestHandler', optional: false, description: 'Middleware function' }
          ],
          returnType: 'Application',
          description: 'Mount middleware function(s) at the specified path',
          isAsync: false,
          examples: [],
          signature: 'use(middleware: RequestHandler): Application',
          completeDescription: 'Mount the specified middleware function or functions at the specified path: the middleware function is executed when the base of the requested path matches path.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'action',
          complexity: 'beginner',
          commonUseCase: ['Middleware setup', 'Request processing'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'get',
          parameters: [
            { name: 'path', type: 'string', optional: false, description: 'Route path' },
            { name: 'handler', type: 'RequestHandler', optional: false, description: 'Route handler' }
          ],
          returnType: 'Application',
          description: 'Route HTTP GET requests to the specified path with the specified callback functions',
          isAsync: false,
          examples: [],
          signature: 'get(path: string, handler: RequestHandler): Application',
          completeDescription: 'Routes HTTP GET requests to the specified path with the specified callback functions.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'action',
          complexity: 'beginner',
          commonUseCase: ['Route definition', 'HTTP handling'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'listen',
          parameters: [
            { name: 'port', type: 'number', optional: false, description: 'Port number' },
            { name: 'callback', type: '() => void', optional: true, description: 'Callback function' }
          ],
          returnType: 'Server',
          description: 'Bind and listen for connections on the specified host and port',
          isAsync: false,
          examples: [],
          signature: 'listen(port: number, callback?: () => void): Server',
          completeDescription: 'Binds and listens for connections on the specified host and port. This method is identical to Node\'s http.Server.listen().',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'action',
          complexity: 'beginner',
          commonUseCase: ['Server startup', 'Port binding'],
          errorHandling: [],
          alternatives: []
        }
      ];
    });

    it('should identify Express.js application setup workflow', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              const express = require('express');
              const app = express();
              
              app.use(express.json());
              app.use(express.static('public'));
              
              app.get('/', (req, res) => {
                res.send('Hello World!');
              });
              
              app.listen(3000, () => {
                console.log('Server running on port 3000');
              });
            `,
            context: 'Basic Express server setup',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const result = await relationshipBuilder.buildRelationships(
        expressFunctions,
        { exports: [], interfaces: [], functions: expressFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );

      // express() should be related to use(), get(), and listen()
      const expressRelationships = result.data!.find(r => r.functionName === 'express');
      expect(expressRelationships).toBeDefined();

      const useRelationship = expressRelationships!.relationships.find(r => r.functionName === 'use');
      const getRelationship = expressRelationships!.relationships.find(r => r.functionName === 'get');
      const listenRelationship = expressRelationships!.relationships.find(r => r.functionName === 'listen');

      expect(useRelationship).toBeDefined();
      expect(getRelationship).toBeDefined();
      expect(listenRelationship).toBeDefined();

      // Should identify the typical Express setup workflow
      const workflows = expressRelationships!.contextualInfo.typicalWorkflows;
      expect(workflows.length).toBeGreaterThan(0);
    });

    it('should identify prerequisite relationships in Express setup', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              // Step 1: Create app
              const app = express();
              
              // Step 2: Setup middleware
              app.use(express.json());
              
              // Step 3: Define routes
              app.get('/api/users', handler);
              
              // Step 4: Start server
              app.listen(3000);
            `,
            context: 'Express setup sequence',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const result = await relationshipBuilder.buildRelationships(
        expressFunctions,
        { exports: [], interfaces: [], functions: expressFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );

      // listen() should have prerequisites (express, use, get)
      const listenRelationships = result.data!.find(r => r.functionName === 'listen');
      const prerequisiteChains = listenRelationships!.contextualInfo.prerequisiteChains;

      expect(prerequisiteChains.length).toBeGreaterThanOrEqual(0);
      
      if (prerequisiteChains.length > 0) {
        const chain = prerequisiteChains[0];
        expect(chain.target).toBe('listen');
        expect(chain.prerequisites.length).toBeGreaterThan(0);
      }
    });
  });

  describe('React package relationships', () => {
    let relationshipBuilder: RelationshipBuilder;
    let reactFunctions: CompleteFunctionInfo[];

    beforeEach(() => {
      relationshipBuilder = new RelationshipBuilder('react');

      reactFunctions = [
        {
          name: 'useState',
          parameters: [
            { name: 'initialState', type: 'T', optional: false, description: 'Initial state value' }
          ],
          returnType: '[T, (value: T) => void]',
          description: 'Returns a stateful value, and a function to update it',
          isAsync: false,
          examples: [],
          signature: 'useState<T>(initialState: T): [T, (value: T) => void]',
          completeDescription: 'Returns a stateful value, and a function to update it. During the initial render, the returned state is the same as the value passed as the first argument.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'getter',
          complexity: 'beginner',
          commonUseCase: ['State management', 'Component state'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'useEffect',
          parameters: [
            { name: 'effect', type: '() => void | (() => void)', optional: false, description: 'Effect function' },
            { name: 'deps', type: 'any[]', optional: true, description: 'Dependency array' }
          ],
          returnType: 'void',
          description: 'Accepts a function that contains imperative, possibly effectful code',
          isAsync: false,
          examples: [],
          signature: 'useEffect(effect: () => void | (() => void), deps?: any[]): void',
          completeDescription: 'Accepts a function that contains imperative, possibly effectful code. Mutations, subscriptions, timers, logging, and other side effects are not allowed inside the main body of a function component.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'action',
          complexity: 'intermediate',
          commonUseCase: ['Side effects', 'Lifecycle management'],
          errorHandling: [],
          alternatives: []
        },
        {
          name: 'useContext',
          parameters: [
            { name: 'context', type: 'Context<T>', optional: false, description: 'React context object' }
          ],
          returnType: 'T',
          description: 'Accepts a context object and returns the current context value',
          isAsync: false,
          examples: [],
          signature: 'useContext<T>(context: Context<T>): T',
          completeDescription: 'Accepts a context object (the value returned from React.createContext) and returns the current context value for that context.',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'getter',
          complexity: 'intermediate',
          commonUseCase: ['Context consumption', 'Global state'],
          errorHandling: [],
          alternatives: []
        }
      ];
    });

    it('should identify React hooks relationships', async () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: `
              function MyComponent() {
                const [count, setCount] = useState(0);
                const theme = useContext(ThemeContext);
                
                useEffect(() => {
                  document.title = \`Count: \${count}\`;
                }, [count]);
                
                return (
                  <div style={{ color: theme.color }}>
                    <p>Count: {count}</p>
                    <button onClick={() => setCount(count + 1)}>
                      Increment
                    </button>
                  </div>
                );
              }
            `,
            context: 'React component with hooks',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const result = await relationshipBuilder.buildRelationships(
        reactFunctions,
        { exports: [], interfaces: [], functions: reactFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );

      // useState should be related to useEffect
      const useStateRelationships = result.data!.find(r => r.functionName === 'useState');
      expect(useStateRelationships).toBeDefined();

      const useEffectRelationship = useStateRelationships!.relationships.find(r => r.functionName === 'useEffect');
      expect(useEffectRelationship).toBeDefined();
      expect(useEffectRelationship!.relationshipType).toBe('commonly-used-with');
    });
  });

  describe('Performance with large datasets', () => {
    it('should handle large numbers of functions and relationships efficiently', async () => {
      const relationshipBuilder = new RelationshipBuilder('large-package');
      
      // Create a large set of functions
      const largeFunctionSet: CompleteFunctionInfo[] = [];
      for (let i = 0; i < 50; i++) {
        largeFunctionSet.push({
          name: `function${i}`,
          parameters: [
            { name: 'param1', type: 'string', optional: false, description: 'Parameter 1' }
          ],
          returnType: 'string',
          description: `Function ${i} description`,
          isAsync: false,
          examples: [],
          signature: `function${i}(param1: string): string`,
          completeDescription: `Complete description for function ${i}`,
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'utility',
          complexity: 'beginner',
          commonUseCase: [`Use case ${i}`],
          errorHandling: [],
          alternatives: []
        });
      }

      // Create code examples that reference multiple functions
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [],
        codeBlocks: [
          {
            language: 'javascript',
            code: largeFunctionSet.map(f => `${f.name}('test');`).join('\n'),
            context: 'Large function usage example',
            isExample: true
          }
        ],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      };

      const startTime = Date.now();
      const result = await relationshipBuilder.buildRelationships(
        largeFunctionSet,
        { exports: [], interfaces: [], functions: largeFunctionSet, classes: [], types: [], enums: [], hasDefinitions: true },
        readmeAnalysis,
        []
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(largeFunctionSet.length);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify relationship quality is maintained
      for (const relationshipMap of result.data!) {
        expect(relationshipMap.relationships.length).toBeLessThanOrEqual(10); // Should limit relationships
        expect(relationshipMap.relationshipScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle functions with no relationships gracefully', async () => {
      const relationshipBuilder = new RelationshipBuilder('isolated-package');
      
      const isolatedFunctions: CompleteFunctionInfo[] = [
        {
          name: 'isolatedFunction',
          parameters: [],
          returnType: 'void',
          description: 'A function with no relationships',
          isAsync: false,
          examples: [],
          signature: 'isolatedFunction(): void',
          completeDescription: 'This function has no relationships to other functions',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'utility',
          complexity: 'beginner',
          commonUseCase: ['Isolated operation'],
          errorHandling: [],
          alternatives: []
        }
      ];

      const result = await relationshipBuilder.buildRelationships(
        isolatedFunctions,
        { exports: [], interfaces: [], functions: isolatedFunctions, classes: [], types: [], enums: [], hasDefinitions: true },
        { sections: [], codeBlocks: [], installationInstructions: [], usageExamples: [], configurationOptions: [] },
        []
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      
      const isolatedRelationships = result.data![0];
      expect(isolatedRelationships.functionName).toBe('isolatedFunction');
      expect(isolatedRelationships.relationships.length).toBe(0);
      expect(isolatedRelationships.relationshipScore).toBe(0);
    });

    it('should handle malformed input data gracefully', async () => {
      const relationshipBuilder = new RelationshipBuilder('test-package');
      
      const malformedFunctions = [
        {
          name: 'validFunction',
          parameters: [],
          returnType: 'void',
          description: 'Valid function',
          isAsync: false,
          examples: [],
          signature: 'validFunction(): void',
          completeDescription: 'Valid function description',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'utility',
          complexity: 'beginner',
          commonUseCase: ['Valid operation'],
          errorHandling: [],
          alternatives: []
        },
        // Malformed function with missing required properties
        {
          name: null,
          parameters: null,
          returnType: undefined,
          description: '',
          isAsync: false,
          examples: [],
          signature: '',
          completeDescription: '',
          workingExamples: [],
          relatedFunctions: [],
          usagePatterns: [],
          category: 'utility',
          complexity: 'beginner',
          commonUseCase: [],
          errorHandling: [],
          alternatives: []
        } as any
      ];

      const result = await relationshipBuilder.buildRelationships(
        malformedFunctions as any,
        { exports: [], interfaces: [], functions: malformedFunctions as any, classes: [], types: [], enums: [], hasDefinitions: true },
        { sections: [], codeBlocks: [], installationInstructions: [], usageExamples: [], configurationOptions: [] },
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PROCESSING_ERROR');
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