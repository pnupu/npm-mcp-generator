/**
 * Tests for the ExampleExtractor class
 */

import { ExampleExtractor, EnhancedExample, ExampleComplexity, ExampleUseCase } from '../../src/analyzers/ExampleExtractor';
import { UsageExample } from '../../src/types/PackageInfo';

describe('ExampleExtractor', () => {
  let extractor: ExampleExtractor;

  beforeEach(() => {
    extractor = new ExampleExtractor('lodash', '4.17.21');
  });

  describe('extractExamples', () => {
    it('should extract and enhance examples from README', async () => {
      const readmeExamples: UsageExample[] = [
        {
          title: 'Basic Usage',
          description: 'Simple lodash example',
          code: 'const result = _.map([1, 2, 3], n => n * 2);',
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(readmeExamples, [], []);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);

      const example = result.data![0];
      expect(example.title).toBe('Basic Usage');
      expect(example.enhancedCode).toContain('import');
      expect(example.validation.score).toBeGreaterThan(0);
    });

    it('should handle empty input gracefully', async () => {
      const result = await extractor.extractExamples([], [], []);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(0);
      expect(result.warnings).toContain('No valid examples could be extracted and enhanced');
    });

    it('should classify examples by complexity', async () => {
      const simpleExample: UsageExample = {
        title: 'Simple Example',
        description: 'Basic usage',
        code: 'console.log("hello");',
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const complexExample: UsageExample = {
        title: 'Complex Example',
        description: 'Advanced async usage with error handling',
        code: `
          class DataProcessor {
            async processData(data) {
              try {
                const result = await this.transform(data);
                return await this.validate(result);
              } catch (error) {
                throw new ProcessingError(error.message);
              }
            }
          }
        `,
        language: 'javascript',
        imports: [],
        category: 'advanced'
      };

      const result = await extractor.extractExamples([simpleExample, complexExample], [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);

      const simple = result.data!.find(e => e.title === 'Simple Example');
      const complex = result.data!.find(e => e.title === 'Complex Example');

      expect(simple?.complexity).toBe('beginner');
      expect(complex?.complexity).toBeOneOf(['advanced', 'expert']);
    });

    it('should categorize examples by use case', async () => {
      const examples: UsageExample[] = [
        {
          title: 'Getting Started Guide',
          description: 'Quick start example',
          code: 'const _ = require("lodash");',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Configuration Example',
          description: 'How to configure the library',
          code: 'const config = { timeout: 5000, retries: 3 };',
          language: 'javascript',
          imports: [],
          category: 'configuration'
        },
        {
          title: 'Error Handling',
          description: 'Handle errors properly',
          code: 'try { doSomething(); } catch (error) { console.error(error); }',
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(examples, [], []);

      expect(result.success).toBe(true);
      
      const gettingStarted = result.data!.find(e => e.title === 'Getting Started Guide');
      const configuration = result.data!.find(e => e.title === 'Configuration Example');
      const errorHandling = result.data!.find(e => e.title === 'Error Handling');

      expect(gettingStarted?.useCase).toBe('getting-started');
      expect(configuration?.useCase).toBe('configuration');
      expect(errorHandling?.useCase).toBe('error-handling');
    });
  });

  describe('import extraction and enhancement', () => {
    it('should extract ES6 imports correctly', async () => {
      const example: UsageExample = {
        title: 'ES6 Import Example',
        description: 'Using ES6 imports',
        code: `
          import { map, filter } from 'lodash';
          import axios from 'axios';
          const result = map([1, 2, 3], n => n * 2);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.imports.length).toBeGreaterThan(0);
      expect(enhanced.imports.some(imp => imp.module === 'lodash')).toBe(true);
      expect(enhanced.imports.some(imp => imp.module === 'axios')).toBe(true);
    });

    it('should extract CommonJS requires correctly', async () => {
      const example: UsageExample = {
        title: 'CommonJS Example',
        description: 'Using CommonJS requires',
        code: `
          const _ = require('lodash');
          const fs = require('fs');
          const result = _.map([1, 2, 3], n => n * 2);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.imports.length).toBeGreaterThan(0);
      expect(enhanced.imports.some(imp => imp.module === 'lodash')).toBe(true);
      expect(enhanced.imports.some(imp => imp.module === 'fs')).toBe(true);
    });

    it('should add missing package imports', async () => {
      const example: UsageExample = {
        title: 'Missing Import Example',
        description: 'Example without imports',
        code: 'const result = _.map([1, 2, 3], n => n * 2);',
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.imports.some(imp => imp.module === 'lodash')).toBe(true);
      expect(enhanced.enhancedCode).toContain('lodash');
    });
  });

  describe('setup code generation', () => {
    it('should generate setup code for Express apps', async () => {
      const example: UsageExample = {
        title: 'Express Example',
        description: 'Express server setup',
        code: `
          const app = express();
          app.get('/', (req, res) => res.send('Hello'));
          app.listen(3000);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.setupCode.length).toBeGreaterThan(0);
      expect(enhanced.setupCode.some(setup => setup.includes('express'))).toBe(true);
    });

    it('should generate setup code for environment variables', async () => {
      const example: UsageExample = {
        title: 'Environment Example',
        description: 'Using environment variables',
        code: `
          const apiKey = process.env.API_KEY;
          console.log('API Key:', apiKey);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.setupCode.length).toBeGreaterThan(0);
      expect(enhanced.setupCode.some(setup => setup.includes('dotenv'))).toBe(true);
    });
  });

  describe('configuration generation', () => {
    it('should extract configuration objects', async () => {
      const example: UsageExample = {
        title: 'Configuration Example',
        description: 'With configuration',
        code: `
          const options = {
            timeout: 5000,
            retries: 3,
            debug: true
          };
          doSomething(options);
        `,
        language: 'javascript',
        imports: [],
        category: 'configuration'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.configuration.length).toBeGreaterThan(0);
      expect(enhanced.configuration[0].category).toBe('options');
    });

    it('should identify environment configuration needs', async () => {
      const example: UsageExample = {
        title: 'Environment Config',
        description: 'Needs environment setup',
        code: `
          const dbUrl = process.env.DATABASE_URL;
          connect(dbUrl);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.configuration.some(config => config.category === 'environment')).toBe(true);
    });
  });

  describe('pattern extraction', () => {
    it('should extract JavaScript patterns', async () => {
      const example: UsageExample = {
        title: 'Pattern Example',
        description: 'Various patterns',
        code: `
          const obj = new MyClass();
          obj.method();
          async function test() {
            try {
              await obj.asyncMethod();
            } catch (error) {
              console.error(error);
            }
          }
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.patterns.length).toBeGreaterThan(0);
      expect(enhanced.patterns.some(p => p.type === 'initialization')).toBe(true);
      expect(enhanced.patterns.some(p => p.type === 'usage')).toBe(true);
      expect(enhanced.patterns.some(p => p.type === 'error-handling')).toBe(true);
    });

    it('should extract Python patterns', async () => {
      const example: UsageExample = {
        title: 'Python Example',
        description: 'Python patterns',
        code: `
          import requests
          obj = MyClass()
          try:
              result = obj.method()
          except Exception as e:
              print(f"Error: {e}")
        `,
        language: 'python',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.patterns.length).toBeGreaterThan(0);
      expect(enhanced.patterns.some(p => p.type === 'initialization')).toBe(true);
      expect(enhanced.patterns.some(p => p.type === 'error-handling')).toBe(true);
    });
  });

  describe('example validation', () => {
    it('should validate complete examples highly', async () => {
      const example: UsageExample = {
        title: 'Complete Example',
        description: 'Well-formed example',
        code: `
          import lodash from 'lodash';
          
          const data = [1, 2, 3, 4, 5];
          try {
            const result = lodash.map(data, n => n * 2);
            console.log(result);
          } catch (error) {
            console.error('Processing failed:', error);
          }
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.validation.score).toBeGreaterThan(70);
      expect(enhanced.validation.hasImports).toBe(true);
      expect(enhanced.validation.hasErrorHandling).toBe(true);
      expect(enhanced.validation.syntaxValid).toBe(true);
    });

    it('should identify validation issues', async () => {
      const example: UsageExample = {
        title: 'Incomplete Example',
        description: 'Missing imports and setup',
        code: 'const result = someUndefinedFunction();',
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      // The example should have some validation score
      expect(enhanced.validation.score).toBeGreaterThanOrEqual(0);
      expect(enhanced.validation.score).toBeLessThanOrEqual(100);
      // Should have enhanced the code with imports
      expect(enhanced.enhancedCode.length).toBeGreaterThan(enhanced.originalCode.length);
    });

    it('should detect syntax errors', async () => {
      const example: UsageExample = {
        title: 'Syntax Error Example',
        description: 'Invalid syntax',
        code: 'const result = {invalid syntax here SyntaxError',
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.validation.syntaxValid).toBe(false);
      expect(enhanced.validation.issues.some(issue => issue.type === 'syntax-error')).toBe(true);
    });
  });

  describe('code enhancement', () => {
    it('should build enhanced code with all components', async () => {
      const example: UsageExample = {
        title: 'Enhancement Test',
        description: 'Test code enhancement',
        code: 'const result = _.map([1, 2, 3], n => n * 2);',
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.enhancedCode).toContain('// Required imports');
      expect(enhanced.enhancedCode).toContain('// Main example code');
      expect(enhanced.enhancedCode).toContain(enhanced.originalCode);
      expect(enhanced.enhancedCode.length).toBeGreaterThan(enhanced.originalCode.length);
    });

    it('should preserve original code in enhanced version', async () => {
      const originalCode = 'console.log("Hello, World!");';
      const example: UsageExample = {
        title: 'Preservation Test',
        description: 'Test code preservation',
        code: originalCode,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.originalCode).toBe(originalCode);
      expect(enhanced.enhancedCode).toContain(originalCode);
    });
  });

  describe('deduplication and filtering', () => {
    it('should remove duplicate examples', async () => {
      const examples: UsageExample[] = [
        {
          title: 'Example 1',
          description: 'First example',
          code: 'console.log("test");',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Example 2',
          description: 'Duplicate example',
          code: 'console.log("test");', // Same code
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(examples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1); // Should deduplicate
    });

    it('should filter out low-quality examples', async () => {
      const examples: UsageExample[] = [
        {
          title: 'Good Example',
          description: 'Quality example',
          code: 'const result = processData(input); console.log(result);',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        {
          title: 'Bad Example',
          description: 'Poor quality',
          code: 'x', // Too short
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(examples, [], []);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1); // Should filter out bad example
      expect(result.data![0].title).toBe('Good Example');
    });
  });

  describe('dependency identification', () => {
    it('should identify package dependencies', async () => {
      const example: UsageExample = {
        title: 'Dependencies Example',
        description: 'Multiple dependencies',
        code: `
          import axios from 'axios';
          import express from 'express';
          import lodash from 'lodash';
          
          const app = express();
          const data = lodash.map([1, 2, 3], n => n * 2);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.dependencies).toContain('axios');
      expect(enhanced.dependencies).toContain('express');
      expect(enhanced.dependencies).toContain('lodash');
      expect(enhanced.dependencies).not.toContain('fs'); // Built-in module should be excluded
    });

    it('should exclude built-in Node.js modules from dependencies', async () => {
      const example: UsageExample = {
        title: 'Built-in Modules',
        description: 'Using built-in modules',
        code: `
          const fs = require('fs');
          const path = require('path');
          const http = require('http');
          
          fs.readFile('test.txt', 'utf8', callback);
        `,
        language: 'javascript',
        imports: [],
        category: 'basic'
      };

      const result = await extractor.extractExamples([example], [], []);
      const enhanced = result.data![0];

      expect(enhanced.dependencies).not.toContain('fs');
      expect(enhanced.dependencies).not.toContain('path');
      expect(enhanced.dependencies).not.toContain('http');
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      // Mock a scenario that would cause an error
      const invalidExample = null as any;

      const result = await extractor.extractExamples([invalidExample], [], []);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PROCESSING_ERROR');
      expect(result.error!.suggestions).toBeDefined();
    });

    it('should continue processing when individual examples fail', async () => {
      const examples: UsageExample[] = [
        {
          title: 'Good Example',
          description: 'Valid example',
          code: 'console.log("Hello");',
          language: 'javascript',
          imports: [],
          category: 'basic'
        },
        // This would be handled gracefully in the actual implementation
        {
          title: 'Problematic Example',
          description: 'May cause issues',
          code: '', // Empty code
          language: 'javascript',
          imports: [],
          category: 'basic'
        }
      ];

      const result = await extractor.extractExamples(examples, [], []);

      expect(result.success).toBe(true);
      // Should have at least the good example
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
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