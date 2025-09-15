/**
 * Integration tests for FunctionAnalyzer with real packages (lodash, react-query)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FunctionAnalyzer, CompleteFunctionInfo } from '../../src/analyzers/FunctionAnalyzer.js';
import { PackageAnalyzer } from '../../src/analyzers/PackageAnalyzer.js';
import { TypeDefinitionAnalyzer } from '../../src/analyzers/TypeDefinitionAnalyzer.js';
import { ReadmeAnalyzer } from '../../src/analyzers/ReadmeAnalyzer.js';
import { ExampleAnalyzer } from '../../src/analyzers/ExampleAnalyzer.js';
import { NPMRegistryFetcher } from '../../src/fetchers/NPMRegistryFetcher.js';
import { GitHubFetcher } from '../../src/fetchers/GitHubFetcher.js';
import { UnpkgFetcher } from '../../src/fetchers/UnpkgFetcher.js';

describe('FunctionAnalyzer Integration Tests', () => {
  let functionAnalyzer: FunctionAnalyzer;
  let packageAnalyzer: PackageAnalyzer;
  let typeAnalyzer: TypeDefinitionAnalyzer;
  let readmeAnalyzer: ReadmeAnalyzer;
  let exampleAnalyzer: ExampleAnalyzer;
  let npmFetcher: NPMRegistryFetcher;
  let githubFetcher: GitHubFetcher;
  let unpkgFetcher: UnpkgFetcher;

  beforeAll(() => {
    functionAnalyzer = new FunctionAnalyzer();
    packageAnalyzer = new PackageAnalyzer();
    typeAnalyzer = new TypeDefinitionAnalyzer();
    readmeAnalyzer = new ReadmeAnalyzer();
    exampleAnalyzer = new ExampleAnalyzer();
    npmFetcher = new NPMRegistryFetcher();
    githubFetcher = new GitHubFetcher();
    unpkgFetcher = new UnpkgFetcher();
  });

  afterAll(() => {
    // Clean up any resources
    npmFetcher.clearCache();
    githubFetcher.clearCache();
    unpkgFetcher.clearCache();
  });

  describe('Lodash Integration', () => {
    let lodashAnalysis: any;
    let lodashFunctions: CompleteFunctionInfo[];

    beforeAll(async () => {
      // This test might take a while, so increase timeout
      jest.setTimeout(60000);

      try {
        // Get lodash package info
        const packageInfoResult = await npmFetcher.getPackageInfo('lodash');
        expect(packageInfoResult.success).toBe(true);

        // Get README
        const readmeResult = await githubFetcher.getReadme(packageInfoResult.data!.repository?.url);
        const readmeAnalysisResult = await readmeAnalyzer.analyze(readmeResult.data || null);

        // Get type definitions
        const typeDefsResult = await unpkgFetcher.getTypeDefinitions('lodash', packageInfoResult.data!.version);
        const typeAnalysisResult = await typeAnalyzer.analyze(typeDefsResult.data || null);

        // Get examples
        const examplesResult = await githubFetcher.getExamples(packageInfoResult.data!.repository?.url);
        const exampleAnalysisResult = await exampleAnalyzer.analyze(examplesResult.data || []);

        // Analyze functions
        const functionAnalysisResult = await functionAnalyzer.analyze(
          typeAnalysisResult.data!,
          readmeAnalysisResult.data!,
          exampleAnalysisResult.data!
        );

        expect(functionAnalysisResult.success).toBe(true);
        lodashFunctions = functionAnalysisResult.data!;
        
        console.log(`✅ Analyzed ${lodashFunctions.length} lodash functions`);
      } catch (error) {
        console.warn('⚠️ Lodash integration test failed, skipping:', error);
        lodashFunctions = [];
      }
    }, 60000);

    it('should analyze lodash functions successfully', () => {
      expect(lodashFunctions.length).toBeGreaterThan(0);
    });

    it('should identify common lodash functions', () => {
      if (lodashFunctions.length === 0) {
        console.warn('⚠️ Skipping lodash function identification test - no functions analyzed');
        return;
      }

      const commonFunctions = ['map', 'filter', 'reduce', 'forEach', 'find', 'includes'];
      const foundFunctions = lodashFunctions.filter(f => 
        commonFunctions.includes(f.name)
      );

      expect(foundFunctions.length).toBeGreaterThan(0);
      console.log(`✅ Found ${foundFunctions.length} common lodash functions:`, 
        foundFunctions.map(f => f.name));
    });

    it('should categorize lodash functions correctly', () => {
      if (lodashFunctions.length === 0) {
        console.warn('⚠️ Skipping lodash categorization test - no functions analyzed');
        return;
      }

      const arrayFunctions = lodashFunctions.filter(f => f.category === 'array-manipulation');
      const objectFunctions = lodashFunctions.filter(f => f.category === 'object-manipulation');
      const utilityFunctions = lodashFunctions.filter(f => f.category === 'utility');

      expect(arrayFunctions.length + objectFunctions.length + utilityFunctions.length).toBeGreaterThan(0);
      
      console.log(`✅ Lodash function categories:
        - Array manipulation: ${arrayFunctions.length}
        - Object manipulation: ${objectFunctions.length}
        - Utility: ${utilityFunctions.length}`);
    });

    it('should extract working examples for lodash functions', () => {
      if (lodashFunctions.length === 0) {
        console.warn('⚠️ Skipping lodash examples test - no functions analyzed');
        return;
      }

      const functionsWithExamples = lodashFunctions.filter(f => f.workingExamples.length > 0);
      expect(functionsWithExamples.length).toBeGreaterThan(0);

      // Check example quality
      const exampleFunction = functionsWithExamples[0];
      const firstExample = exampleFunction.workingExamples[0];
      
      expect(firstExample.code).toBeDefined();
      expect(firstExample.code.length).toBeGreaterThan(0);
      expect(firstExample.language).toBeDefined();
      expect(firstExample.explanation).toBeDefined();

      console.log(`✅ ${functionsWithExamples.length} lodash functions have working examples`);
    });

    it('should identify usage patterns for lodash functions', () => {
      if (lodashFunctions.length === 0) {
        console.warn('⚠️ Skipping lodash patterns test - no functions analyzed');
        return;
      }

      const functionsWithPatterns = lodashFunctions.filter(f => f.usagePatterns.length > 0);
      expect(functionsWithPatterns.length).toBeGreaterThan(0);

      // Check pattern types
      const allPatterns = functionsWithPatterns.flatMap(f => f.usagePatterns);
      const patternTypes = [...new Set(allPatterns.map(p => p.type))];
      
      expect(patternTypes.length).toBeGreaterThan(0);
      expect(patternTypes).toContain('basic-usage');

      console.log(`✅ Found ${patternTypes.length} pattern types in lodash:`, patternTypes);
    });

    it('should build relationships between lodash functions', () => {
      if (lodashFunctions.length < 2) {
        console.warn('⚠️ Skipping lodash relationships test - insufficient functions analyzed');
        return;
      }

      const functionsWithRelationships = lodashFunctions.filter(f => f.relatedFunctions.length > 0);
      expect(functionsWithRelationships.length).toBeGreaterThan(0);

      // Check relationship quality
      const functionWithRelationships = functionsWithRelationships[0];
      const firstRelationship = functionWithRelationships.relatedFunctions[0];
      
      expect(firstRelationship.functionName).toBeDefined();
      expect(firstRelationship.relationshipType).toBeDefined();
      expect(firstRelationship.strength).toBeGreaterThan(0);
      expect(firstRelationship.strength).toBeLessThanOrEqual(1);

      console.log(`✅ ${functionsWithRelationships.length} lodash functions have relationships`);
    });

    it('should assess complexity correctly for lodash functions', () => {
      if (lodashFunctions.length === 0) {
        console.warn('⚠️ Skipping lodash complexity test - no functions analyzed');
        return;
      }

      const complexityLevels = lodashFunctions.reduce((acc, f) => {
        acc[f.complexity] = (acc[f.complexity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(Object.keys(complexityLevels).length).toBeGreaterThan(0);
      
      // Should have a mix of complexity levels
      const totalFunctions = lodashFunctions.length;
      expect(complexityLevels.beginner || 0).toBeGreaterThan(0);

      console.log(`✅ Lodash complexity distribution:`, complexityLevels);
    });
  });

  describe('React Query Integration', () => {
    let reactQueryFunctions: CompleteFunctionInfo[];

    beforeAll(async () => {
      jest.setTimeout(60000);

      try {
        // Get @tanstack/react-query package info
        const packageInfoResult = await npmFetcher.getPackageInfo('@tanstack/react-query');
        expect(packageInfoResult.success).toBe(true);

        // Get README
        const readmeResult = await githubFetcher.getReadme(packageInfoResult.data!.repository?.url);
        const readmeAnalysisResult = await readmeAnalyzer.analyze(readmeResult.data || null);

        // Get type definitions
        const typeDefsResult = await unpkgFetcher.getTypeDefinitions('@tanstack/react-query', packageInfoResult.data!.version);
        const typeAnalysisResult = await typeAnalyzer.analyze(typeDefsResult.data || null);

        // Get examples
        const examplesResult = await githubFetcher.getExamples(packageInfoResult.data!.repository?.url);
        const exampleAnalysisResult = await exampleAnalyzer.analyze(examplesResult.data || []);

        // Analyze functions
        const functionAnalysisResult = await functionAnalyzer.analyze(
          typeAnalysisResult.data!,
          readmeAnalysisResult.data!,
          exampleAnalysisResult.data!
        );

        expect(functionAnalysisResult.success).toBe(true);
        reactQueryFunctions = functionAnalysisResult.data!;
        
        console.log(`✅ Analyzed ${reactQueryFunctions.length} react-query functions`);
      } catch (error) {
        console.warn('⚠️ React Query integration test failed, skipping:', error);
        reactQueryFunctions = [];
      }
    }, 60000);

    it('should analyze react-query functions successfully', () => {
      expect(reactQueryFunctions.length).toBeGreaterThan(0);
    });

    it('should identify common react-query hooks', () => {
      if (reactQueryFunctions.length === 0) {
        console.warn('⚠️ Skipping react-query hooks test - no functions analyzed');
        return;
      }

      const commonHooks = ['useQuery', 'useMutation', 'useQueryClient', 'useInfiniteQuery'];
      const foundHooks = reactQueryFunctions.filter(f => 
        commonHooks.some(hook => f.name.includes(hook))
      );

      expect(foundHooks.length).toBeGreaterThan(0);
      console.log(`✅ Found ${foundHooks.length} common react-query hooks:`, 
        foundHooks.map(f => f.name));
    });

    it('should categorize react-query functions correctly', () => {
      if (reactQueryFunctions.length === 0) {
        console.warn('⚠️ Skipping react-query categorization test - no functions analyzed');
        return;
      }

      const asyncFunctions = reactQueryFunctions.filter(f => f.category === 'async');
      const utilityFunctions = reactQueryFunctions.filter(f => f.category === 'utility');

      // React Query should have many async functions
      expect(asyncFunctions.length + utilityFunctions.length).toBeGreaterThan(0);
      
      console.log(`✅ React Query function categories:
        - Async: ${asyncFunctions.length}
        - Utility: ${utilityFunctions.length}`);
    });

    it('should identify async patterns in react-query', () => {
      if (reactQueryFunctions.length === 0) {
        console.warn('⚠️ Skipping react-query async patterns test - no functions analyzed');
        return;
      }

      const asyncFunctions = reactQueryFunctions.filter(f => f.isAsync || f.returnType.includes('Promise'));
      expect(asyncFunctions.length).toBeGreaterThan(0);

      console.log(`✅ Found ${asyncFunctions.length} async react-query functions`);
    });

    it('should extract error handling patterns from react-query', () => {
      if (reactQueryFunctions.length === 0) {
        console.warn('⚠️ Skipping react-query error handling test - no functions analyzed');
        return;
      }

      const functionsWithErrorHandling = reactQueryFunctions.filter(f => f.errorHandling.length > 0);
      
      if (functionsWithErrorHandling.length > 0) {
        const errorHandlingExample = functionsWithErrorHandling[0].errorHandling[0];
        expect(errorHandlingExample.errorType).toBeDefined();
        expect(errorHandlingExample.solution).toBeDefined();
        
        console.log(`✅ Found error handling patterns in ${functionsWithErrorHandling.length} react-query functions`);
      } else {
        console.log('ℹ️ No explicit error handling patterns found in react-query analysis');
      }
    });
  });

  describe('Cross-Package Comparison', () => {
    it('should demonstrate different analysis results between packages', async () => {
      // This test compares the analysis results between different types of packages
      
      // Simple utility package analysis
      const packageInfoResult = await npmFetcher.getPackageInfo('lodash');
      if (!packageInfoResult.success) {
        console.warn('⚠️ Skipping cross-package comparison - lodash not available');
        return;
      }

      const readmeResult = await githubFetcher.getReadme(packageInfoResult.data!.repository?.url);
      const readmeAnalysisResult = await readmeAnalyzer.analyze(readmeResult.data || null);

      const typeDefsResult = await unpkgFetcher.getTypeDefinitions('lodash', packageInfoResult.data!.version);
      const typeAnalysisResult = await typeAnalyzer.analyze(typeDefsResult.data || null);

      const functionAnalysisResult = await functionAnalyzer.analyze(
        typeAnalysisResult.data!,
        readmeAnalysisResult.data!,
        []
      );

      if (functionAnalysisResult.success && functionAnalysisResult.data!.length > 0) {
        const lodashFunctions = functionAnalysisResult.data!;
        
        // Analyze characteristics
        const avgComplexity = calculateAverageComplexity(lodashFunctions);
        const categoryDistribution = getCategoryDistribution(lodashFunctions);
        const avgExamplesPerFunction = lodashFunctions.reduce((sum, f) => sum + f.workingExamples.length, 0) / lodashFunctions.length;
        
        console.log(`✅ Lodash Analysis Summary:
          - Functions analyzed: ${lodashFunctions.length}
          - Average complexity: ${avgComplexity}
          - Category distribution: ${JSON.stringify(categoryDistribution)}
          - Average examples per function: ${avgExamplesPerFunction.toFixed(2)}`);

        // Verify analysis quality
        expect(lodashFunctions.length).toBeGreaterThan(0);
        expect(Object.keys(categoryDistribution).length).toBeGreaterThan(0);
      }
    });
  });

});

// Helper functions for analysis
function calculateAverageComplexity(functions: CompleteFunctionInfo[]): number {
  const complexityScores = functions.map(f => {
    switch (f.complexity) {
      case 'beginner': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      default: return 1;
    }
  });
  
  return complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
}

function getCategoryDistribution(functions: CompleteFunctionInfo[]): Record<string, number> {
  return functions.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}