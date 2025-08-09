/**
 * Tests for graceful degradation system
 */

import { GracefulDegradation, DegradationStrategy } from '../../dist/core/GracefulDegradation.js';
import { PackageAnalysis } from '../../dist/types/PackageInfo.js';

describe('GracefulDegradation', () => {
  let gracefulDegradation: GracefulDegradation;
  let mockAnalysis: PackageAnalysis;

  beforeEach(() => {
    gracefulDegradation = new GracefulDegradation();
    
    // Create a minimal analysis with missing data
    mockAnalysis = {
      packageInfo: {
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package for demonstration',
        keywords: ['utility', 'helper', 'parse'],
        dependencies: { 'lodash': '^4.0.0' },
        peerDependencies: {},
        maintainers: ['test-maintainer'],
        publishDate: '2023-01-01',
        repository: {
          type: 'git',
          url: 'https://github.com/test/test-package'
        },
        homepage: 'https://test-package.com'
      },
      readme: {
        sections: [],
        codeBlocks: [],
        installationInstructions: [],
        usageExamples: [],
        configurationOptions: []
      },
      typeDefinitions: {
        hasDefinitions: false,
        exports: [],
        interfaces: [],
        functions: [],
        classes: [],
        types: [],
        enums: []
      },
      examples: [],
      apiReference: {
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        enums: [],
        constants: []
      },
      metadata: {
        completeness: {
          overall: 20,
          readme: 10,
          typeDefinitions: 0,
          examples: 0,
          apiReference: 0
        },
        processingTime: 1000,
        timestamp: new Date(),
        version: '1.0.0',
        source: 'test'
      }
    };
  });

  describe('applyDegradation', () => {
    it('should improve analysis completeness', async () => {
      const originalCompleteness = mockAnalysis.metadata.completeness.overall;
      
      const { analysis, result } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.metadata.completeness.overall).toBeGreaterThan(originalCompleteness);
      expect(result.completenessImprovement).toBeGreaterThan(0);
      expect(result.applied.length).toBeGreaterThan(0);
    });

    it('should enhance README from package description', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.readme.sections.length).toBeGreaterThan(0);
      expect(analysis.readme.sections[0].title).toBe('test-package');
      expect(analysis.readme.sections[0].content).toBe('A test package for demonstration');
    });

    it('should generate installation instructions', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.readme.installationInstructions.length).toBeGreaterThan(0);
      expect(analysis.readme.installationInstructions).toContainEqual({
        command: 'npm install test-package',
        description: 'Install via npm',
        packageManager: 'npm'
      });
      expect(analysis.readme.installationInstructions).toContainEqual({
        command: 'yarn add test-package',
        description: 'Install via yarn',
        packageManager: 'yarn'
      });
    });

    it('should infer API structure from keywords', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.apiReference.functions.length).toBeGreaterThan(0);
      const parseFunction = analysis.apiReference.functions.find(f => f.name === 'parse');
      expect(parseFunction).toBeDefined();
      expect(parseFunction?.description).toContain('inferred from package keywords');
    });

    it('should generate common usage patterns', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.readme.usageExamples.length).toBeGreaterThan(0);
      const basicExample = analysis.readme.usageExamples.find(ex => ex.title === 'Basic Usage');
      expect(basicExample).toBeDefined();
      expect(basicExample?.code).toContain('test-package');
    });

    it('should enhance from dependencies', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      // Should not add React integration since lodash is not React-related
      const reactExample = analysis.readme.usageExamples.find(ex => ex.title === 'React Integration');
      expect(reactExample).toBeUndefined();
    });

    it('should create minimal TypeScript definitions', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.typeDefinitions.hasDefinitions).toBe(true);
      expect(analysis.typeDefinitions.exports.length).toBeGreaterThan(0);
      expect(analysis.typeDefinitions.functions.length).toBeGreaterThan(0);
    });

    it('should track applied strategies', async () => {
      const { result } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(result.applied.length).toBeGreaterThan(0);
      expect(result.applied.every(strategy => strategy.name && strategy.description)).toBe(true);
    });

    it('should handle strategy failures gracefully', async () => {
      // Create a custom degradation instance with a failing strategy
      const customDegradation = new GracefulDegradation();
      
      // Mock a strategy that will fail
      const failingStrategy: DegradationStrategy = {
        name: 'failing-strategy',
        description: 'A strategy that always fails',
        priority: 100,
        canApply: () => true,
        apply: async () => {
          throw new Error('Strategy failed');
        }
      };
      
      // Add the failing strategy (we need to access private property for testing)
      (customDegradation as any).strategies.unshift(failingStrategy);
      
      const { result } = await customDegradation.applyDegradation(mockAnalysis);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Failed to apply strategy failing-strategy');
    });
  });

  describe('generateFallbackTools', () => {
    it('should always provide basic package info tool', () => {
      const tools = gracefulDegradation.generateFallbackTools(mockAnalysis);
      
      const packageInfoTool = tools.find(tool => tool.name === 'get_package_info');
      expect(packageInfoTool).toBeDefined();
      expect(packageInfoTool?.description).toContain('test-package');
    });

    it('should provide search tool when description exists', () => {
      const tools = gracefulDegradation.generateFallbackTools(mockAnalysis);
      
      const searchTool = tools.find(tool => tool.name === 'search_basic_info');
      expect(searchTool).toBeDefined();
      expect(searchTool?.inputSchema.properties?.query).toBeDefined();
    });

    it('should provide installation help tool', () => {
      const tools = gracefulDegradation.generateFallbackTools(mockAnalysis);
      
      const installTool = tools.find(tool => tool.name === 'get_installation_help');
      expect(installTool).toBeDefined();
      expect(installTool?.inputSchema.properties?.packageManager).toBeDefined();
    });

    it('should not provide search tool when no description or sections', () => {
      const emptyAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo,
          description: ''
        },
        readme: {
          ...mockAnalysis.readme,
          sections: []
        }
      };
      
      const tools = gracefulDegradation.generateFallbackTools(emptyAnalysis);
      
      const searchTool = tools.find(tool => tool.name === 'search_basic_info');
      expect(searchTool).toBeUndefined();
    });
  });

  describe('needsDegradation', () => {
    it('should return true for low completeness', () => {
      const needsDegradation = gracefulDegradation.needsDegradation(mockAnalysis);
      expect(needsDegradation).toBe(true);
    });

    it('should return true for empty README', () => {
      const highCompletenessAnalysis = {
        ...mockAnalysis,
        metadata: {
          ...mockAnalysis.metadata,
          completeness: {
            ...mockAnalysis.metadata.completeness,
            overall: 80
          }
        }
      };
      
      const needsDegradation = gracefulDegradation.needsDegradation(highCompletenessAnalysis);
      expect(needsDegradation).toBe(true); // Still true because README is empty
    });

    it('should return true for missing type definitions and API reference', () => {
      const analysisWithReadme = {
        ...mockAnalysis,
        readme: {
          ...mockAnalysis.readme,
          sections: [{ title: 'Test', level: 1, content: 'Content', subsections: [] }]
        },
        metadata: {
          ...mockAnalysis.metadata,
          completeness: {
            ...mockAnalysis.metadata.completeness,
            overall: 80
          }
        }
      };
      
      const needsDegradation = gracefulDegradation.needsDegradation(analysisWithReadme);
      expect(needsDegradation).toBe(true); // Still true because no types or API reference
    });

    it('should return false for complete analysis', () => {
      const completeAnalysis = {
        ...mockAnalysis,
        readme: {
          ...mockAnalysis.readme,
          sections: [{ title: 'Test', level: 1, content: 'Content', subsections: [] }]
        },
        typeDefinitions: {
          ...mockAnalysis.typeDefinitions,
          hasDefinitions: true
        },
        apiReference: {
          ...mockAnalysis.apiReference,
          functions: [{ 
            name: 'test', 
            signature: 'test()', 
            description: 'Test function',
            parameters: [],
            returnType: 'void',
            examples: [],
            category: 'utility'
          }]
        },
        metadata: {
          ...mockAnalysis.metadata,
          completeness: {
            ...mockAnalysis.metadata.completeness,
            overall: 80
          }
        }
      };
      
      const needsDegradation = gracefulDegradation.needsDegradation(completeAnalysis);
      expect(needsDegradation).toBe(false);
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return applicable strategies', () => {
      const strategies = gracefulDegradation.getAvailableStrategies(mockAnalysis);
      
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every(strategy => strategy.canApply(mockAnalysis))).toBe(true);
    });

    it('should not return non-applicable strategies', () => {
      const completeAnalysis = {
        ...mockAnalysis,
        readme: {
          ...mockAnalysis.readme,
          sections: [{ title: 'Test', level: 1, content: 'Content', subsections: [] }],
          installationInstructions: [{ command: 'npm install', description: 'Install', packageManager: 'npm' }],
          usageExamples: [{ 
            title: 'Example', 
            description: 'Test', 
            code: 'test()', 
            language: 'javascript',
            imports: [],
            category: 'basic'
          }]
        },
        typeDefinitions: {
          ...mockAnalysis.typeDefinitions,
          hasDefinitions: true
        },
        apiReference: {
          ...mockAnalysis.apiReference,
          functions: [{ 
            name: 'test', 
            signature: 'test()', 
            description: 'Test function',
            parameters: [],
            returnType: 'void',
            examples: [],
            category: 'utility'
          }]
        }
      };
      
      const strategies = gracefulDegradation.getAvailableStrategies(completeAnalysis);
      
      // Should have fewer applicable strategies for a more complete analysis
      expect(strategies.length).toBeLessThan(gracefulDegradation.getAvailableStrategies(mockAnalysis).length);
    });
  });

  describe('package type inference', () => {
    it('should detect React packages', async () => {
      const reactAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo,
          keywords: ['react', 'component'],
          dependencies: { 'react': '^18.0.0' }
        }
      };
      
      const { analysis } = await gracefulDegradation.applyDegradation(reactAnalysis);
      
      const reactExample = analysis.readme.usageExamples.find(ex => ex.title === 'React Integration');
      expect(reactExample).toBeDefined();
      expect(reactExample?.code).toContain('React');
      expect(reactExample?.language).toBe('jsx');
    });

    it('should detect CLI packages', async () => {
      const cliAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo,
          keywords: ['cli', 'command-line']
        }
      };
      
      const { analysis } = await gracefulDegradation.applyDegradation(cliAnalysis);
      
      const cliExample = analysis.readme.usageExamples.find(ex => ex.title === 'Command Line Usage');
      expect(cliExample).toBeDefined();
      expect(cliExample?.code).toContain('npx');
      expect(cliExample?.language).toBe('bash');
    });

    it('should detect API packages', async () => {
      const apiAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo,
          keywords: ['api', 'rest']
        }
      };
      
      const { analysis } = await gracefulDegradation.applyDegradation(apiAnalysis);
      
      const apiExample = analysis.readme.usageExamples.find(ex => ex.title === 'API Usage');
      expect(apiExample).toBeDefined();
      expect(apiExample?.code).toContain('baseURL');
      expect(apiExample?.code).toContain('await');
    });
  });

  describe('completeness calculation', () => {
    it('should calculate completeness correctly', async () => {
      const { analysis } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(analysis.metadata.completeness.overall).toBeGreaterThan(0);
      expect(analysis.metadata.completeness.readme).toBeGreaterThan(0);
      expect(analysis.metadata.completeness.typeDefinitions).toBeGreaterThan(0);
      expect(analysis.metadata.completeness.apiReference).toBeGreaterThan(0);
    });

    it('should give higher scores for more complete data', async () => {
      const richAnalysis = {
        ...mockAnalysis,
        readme: {
          ...mockAnalysis.readme,
          sections: [
            { title: 'Introduction', level: 1, content: 'Intro', subsections: [] },
            { title: 'Usage', level: 2, content: 'Usage info', subsections: [] }
          ],
          codeBlocks: [
            { code: 'example()', language: 'javascript', filename: 'example.js' }
          ]
        },
        apiReference: {
          ...mockAnalysis.apiReference,
          functions: Array.from({ length: 15 }, (_, i) => ({
            name: `func${i}`,
            signature: `func${i}()`,
            description: `Function ${i}`,
            parameters: [],
            returnType: 'void',
            examples: [],
            category: 'utility'
          }))
        }
      };
      
      const { analysis: enhanced } = await gracefulDegradation.applyDegradation(richAnalysis);
      const { analysis: basic } = await gracefulDegradation.applyDegradation(mockAnalysis);
      
      expect(enhanced.metadata.completeness.overall).toBeGreaterThan(basic.metadata.completeness.overall);
      expect(enhanced.metadata.completeness.readme).toBeGreaterThan(basic.metadata.completeness.readme);
      expect(enhanced.metadata.completeness.apiReference).toBeGreaterThan(basic.metadata.completeness.apiReference);
    });
  });
});