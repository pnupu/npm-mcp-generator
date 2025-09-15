/**
 * Integration tests for ExampleExtractor with real package data
 */

import { ExampleExtractor } from '../../src/analyzers/ExampleExtractor';
import { UsageExample } from '../../src/types/PackageInfo';

describe('ExampleExtractor Integration Tests', () => {
  describe('Lodash package examples', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('lodash', '4.17.21');
    });

    it('should extract and enhance real lodash examples', async () => {
      const realLodashExamples: UsageExample[] = [
        {
          title: 'Array Manipulation',
          description: 'Using lodash for array operations',
          code: `
            const users = [
              { 'user': 'barney', 'age': 36, 'active': true },
              { 'user': 'fred', 'age': 40, 'active': false }
            ];
            
            const result = _.filter(users, function(o) { return !o.active; });
            console.log(result);
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Object Utilities',
          description: 'Working with objects using lodash',
          code: `
            const object = { 'a': [{ 'b': { 'c': 3 } }] };
            const result = _.get(object, 'a[0].b.c');
            console.log(result); // => 3
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Async Operations with Lodash',
          description: 'Using lodash in async contexts',
          code: `
            async function processUsers(users) {
              try {
                const activeUsers = _.filter(users, 'active');
                const userNames = _.map(activeUsers, 'name');
                return await Promise.all(
                  userNames.map(name => fetchUserDetails(name))
                );
              } catch (error) {
                console.error('Failed to process users:', error);
                throw error;
              }
            }
          `,
          language: 'javascript',
          imports: [],
          category: 'advanced'
        }
      ];

      const result = await extractor.extractExamples(realLodashExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(3);

      // Validate first example (basic)
      const arrayExample = result.data!.find(e => e.title === 'Array Manipulation');
      expect(arrayExample).toBeDefined();
      expect(arrayExample!.complexity).toBe('beginner');
      expect(arrayExample!.useCase).toBe('basic-usage');
      expect(arrayExample!.imports.some(imp => imp.module === 'lodash')).toBe(true);
      expect(arrayExample!.enhancedCode).toContain('lodash');
      expect(arrayExample!.validation.score).toBeGreaterThan(70);

      // Validate second example (intermediate)
      const objectExample = result.data!.find(e => e.title === 'Object Utilities');
      expect(objectExample).toBeDefined();
      expect(objectExample!.complexity).toBeOneOf(['beginner', 'intermediate']);
      expect(objectExample!.patterns.some(p => p.type === 'usage')).toBe(true);

      // Validate third example (advanced)
      const asyncExample = result.data!.find(e => e.title === 'Async Operations with Lodash');
      expect(asyncExample).toBeDefined();
      expect(asyncExample!.complexity).toBeOneOf(['intermediate', 'advanced']);
      expect(asyncExample!.useCase).toBe('error-handling');
      expect(asyncExample!.validation.hasErrorHandling).toBe(true);
      expect(asyncExample!.patterns.some(p => p.type === 'error-handling')).toBe(true);
    });

    it('should handle TypeScript lodash examples', async () => {
      const typescriptExamples: UsageExample[] = [
        {
          title: 'TypeScript Lodash Usage',
          description: 'Using lodash with TypeScript',
          code: `
            interface User {
              id: number;
              name: string;
              email: string;
              active: boolean;
            }
            
            const users: User[] = [
              { id: 1, name: 'John', email: 'john@example.com', active: true },
              { id: 2, name: 'Jane', email: 'jane@example.com', active: false }
            ];
            
            const activeUsers: User[] = _.filter(users, (user: User) => user.active);
            const userNames: string[] = _.map(activeUsers, 'name');
          `,
          language: 'typescript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(typescriptExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);

      const tsExample = result.data![0];
      expect(tsExample.language).toBe('typescript');
      expect(tsExample.imports.some(imp => imp.module === 'lodash')).toBe(true);
      expect(tsExample.enhancedCode).toContain('import');
      expect(tsExample.patterns.some(p => p.type === 'usage')).toBe(true);
      expect(tsExample.validation.syntaxValid).toBe(true);
    });
  });

  describe('Express.js package examples', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('express', '4.18.2');
    });

    it('should extract and enhance Express server examples', async () => {
      const expressExamples: UsageExample[] = [
        {
          title: 'Basic Express Server',
          description: 'Simple Express.js server setup',
          code: `
            const app = express();
            
            app.get('/', (req, res) => {
              res.send('Hello World!');
            });
            
            app.listen(3000, () => {
              console.log('Server running on port 3000');
            });
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Express with Middleware',
          description: 'Express server with middleware and error handling',
          code: `
            const app = express();
            
            app.use(express.json());
            app.use(express.static('public'));
            
            app.get('/api/users', async (req, res) => {
              try {
                const users = await getUsersFromDatabase();
                res.json(users);
              } catch (error) {
                console.error('Database error:', error);
                res.status(500).json({ error: 'Internal server error' });
              }
            });
            
            app.use((err, req, res, next) => {
              console.error(err.stack);
              res.status(500).send('Something broke!');
            });
          `,
          language: 'javascript',
          imports: [],
          category: 'advanced'
        }
      ];

      const result = await extractor.extractExamples(expressExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);

      // Validate basic server example
      const basicExample = result.data!.find(e => e.title === 'Basic Express Server');
      expect(basicExample).toBeDefined();
      expect(basicExample!.imports.some(imp => imp.module === 'express')).toBe(true);
      expect(basicExample!.setupCode.some(setup => setup.includes('express'))).toBe(true);
      expect(basicExample!.useCase).toBe('basic-usage');
      expect(basicExample!.complexity).toBeOneOf(['beginner', 'intermediate']);

      // Validate middleware example
      const middlewareExample = result.data!.find(e => e.title === 'Express with Middleware');
      expect(middlewareExample).toBeDefined();
      expect(middlewareExample!.complexity).toBeOneOf(['intermediate', 'advanced']);
      expect(middlewareExample!.validation.hasErrorHandling).toBe(true);
      expect(middlewareExample!.patterns.some(p => p.type === 'error-handling')).toBe(true);
      expect(middlewareExample!.useCase).toBe('error-handling');
    });
  });

  describe('React package examples', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('react', '18.2.0');
    });

    it('should extract and enhance React component examples', async () => {
      const reactExamples: UsageExample[] = [
        {
          title: 'Functional Component',
          description: 'Basic React functional component',
          code: `
            function Welcome(props) {
              return <h1>Hello, {props.name}!</h1>;
            }
            
            function App() {
              return (
                <div>
                  <Welcome name="Sara" />
                  <Welcome name="Cahal" />
                  <Welcome name="Edite" />
                </div>
              );
            }
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Component with Hooks',
          description: 'React component using hooks',
          code: `
            function Counter() {
              const [count, setCount] = useState(0);
              
              useEffect(() => {
                document.title = \`Count: \${count}\`;
              }, [count]);
              
              return (
                <div>
                  <p>You clicked {count} times</p>
                  <button onClick={() => setCount(count + 1)}>
                    Click me
                  </button>
                </div>
              );
            }
          `,
          language: 'javascript',
          imports: [],
          category: 'advanced'
        }
      ];

      const result = await extractor.extractExamples(reactExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);

      // Validate functional component
      const functionalExample = result.data!.find(e => e.title === 'Functional Component');
      expect(functionalExample).toBeDefined();
      expect(functionalExample!.imports.some(imp => imp.module === 'react')).toBe(true);
      expect(functionalExample!.complexity).toBeOneOf(['beginner', 'intermediate']);

      // Validate hooks example
      const hooksExample = result.data!.find(e => e.title === 'Component with Hooks');
      expect(hooksExample).toBeDefined();
      expect(hooksExample!.complexity).toBeOneOf(['beginner', 'intermediate', 'advanced']);
      expect(hooksExample!.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration-heavy packages', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('webpack', '5.88.0');
    });

    it('should extract and enhance configuration examples', async () => {
      const configExamples: UsageExample[] = [
        {
          title: 'Basic Webpack Config',
          description: 'Simple webpack configuration',
          code: `
            module.exports = {
              entry: './src/index.js',
              output: {
                filename: 'bundle.js',
                path: path.resolve(__dirname, 'dist'),
              },
              module: {
                rules: [
                  {
                    test: /\\.css$/i,
                    use: ['style-loader', 'css-loader'],
                  },
                ],
              },
            };
          `,
          language: 'javascript',
          imports: [],
          category: 'configuration'
        }
      ];

      const result = await extractor.extractExamples(configExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);

      const configExample = result.data![0];
      expect(configExample.useCase).toBe('configuration');
      expect(configExample.configuration.length).toBeGreaterThanOrEqual(0);
      expect(configExample.imports.some(imp => imp.module === 'path')).toBe(true);
      expect(configExample.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Testing framework examples', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('jest', '29.5.0');
    });

    it('should extract and enhance testing examples', async () => {
      const testExamples: UsageExample[] = [
        {
          title: 'Basic Jest Test',
          description: 'Simple Jest test case',
          code: `
            describe('Math operations', () => {
              test('adds 1 + 2 to equal 3', () => {
                expect(1 + 2).toBe(3);
              });
              
              test('multiplies 3 * 4 to equal 12', () => {
                expect(3 * 4).toBe(12);
              });
            });
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Async Test with Jest',
          description: 'Testing async functions',
          code: `
            describe('Async operations', () => {
              test('async function resolves correctly', async () => {
                const data = await fetchData();
                expect(data).toBeDefined();
                expect(data.status).toBe('success');
              });
              
              test('handles async errors', async () => {
                await expect(fetchInvalidData()).rejects.toThrow('Invalid data');
              });
            });
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(testExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);

      // Validate basic test
      const basicTest = result.data!.find(e => e.title === 'Basic Jest Test');
      expect(basicTest).toBeDefined();
      expect(basicTest!.useCase).toBe('testing');
      expect(basicTest!.patterns.length).toBeGreaterThanOrEqual(0);

      // Validate async test
      const asyncTest = result.data!.find(e => e.title === 'Async Test with Jest');
      expect(asyncTest).toBeDefined();
      expect(asyncTest!.useCase).toBe('testing');
      expect(asyncTest!.complexity).toBeOneOf(['beginner', 'intermediate', 'advanced']);
      expect(asyncTest!.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and edge cases', () => {
    let extractor: ExampleExtractor;

    beforeEach(() => {
      extractor = new ExampleExtractor('test-package', '1.0.0');
    });

    it('should handle large numbers of examples efficiently', async () => {
      const manyExamples: UsageExample[] = [];
      
      // Generate 50 examples
      for (let i = 0; i < 50; i++) {
        manyExamples.push({
          title: `Example ${i}`,
          description: `Test example number ${i}`,
          code: `console.log("Example ${i}"); const result${i} = process(data${i});`,
          language: 'javascript',
          imports: [],
          category: 'basic'
        });
      }

      const startTime = Date.now();
      const result = await extractor.extractExamples(manyExamples, [], []);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle examples with special characters and unicode', async () => {
      const specialExamples: UsageExample[] = [
        {
          title: 'Unicode Example 🚀',
          description: 'Example with unicode characters',
          code: `
            const message = "Hello 世界! 🌍";
            const emoji = "🎉🎊✨";
            console.log(\`\${message} \${emoji}\`);
          `,
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(specialExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toContain('🚀');
      expect(result.data![0].enhancedCode).toContain('世界');
    });

    it('should handle malformed or incomplete examples gracefully', async () => {
      const problematicExamples: UsageExample[] = [
        {
          title: 'Good Example',
          description: 'This should work',
          code: 'console.log("Hello");',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Empty Code',
          description: 'This has no code',
          code: '',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Whitespace Only',
          description: 'Only whitespace',
          code: '   \n\t  \n  ',
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(problematicExamples, [], []);

      expect(result.success).toBe(true);
      // Should filter out the problematic examples but keep the good one
      expect(result.data!.length).toBe(1);
      expect(result.data![0].title).toBe('Good Example');
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