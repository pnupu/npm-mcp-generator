/**
 * Example code analyzer for extracting patterns and usage information from code examples
 */

import { ExampleAnalysis, CodePattern } from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export class ExampleAnalyzer {
  /**
   * Analyze example code and extract patterns and usage information
   */
  async analyze(examples: ExampleAnalysis[]): Promise<AnalysisResult<ExampleAnalysis[]>> {
    const startTime = Date.now();

    if (!examples || examples.length === 0) {
      return {
        success: true,
        data: [],
        warnings: ['No examples provided for analysis'],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'example-analyzer'
        }
      };
    }

    try {
      const warnings: string[] = [];
      const analyzedExamples: ExampleAnalysis[] = [];

      for (const example of examples) {
        const patterns = await this.extractPatterns(example);
        const enhancedImports = this.enhanceImports(example.content, example.language);
        const improvedCategory = this.refineCategory(example);

        analyzedExamples.push({
          ...example,
          patterns,
          imports: enhancedImports,
          category: improvedCategory
        });
      }

      // Analyze pattern frequencies across all examples
      this.calculatePatternFrequencies(analyzedExamples);

      if (analyzedExamples.every(ex => ex.patterns.length === 0)) {
        warnings.push('No meaningful patterns found in examples');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: analyzedExamples,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'example-analyzer'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PARSING_ERROR',
          message: `Failed to analyze examples: ${error}`,
          recoverable: false,
          suggestions: ['Check example code syntax', 'Verify language detection']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'example-analyzer'
        }
      };
    }
  }

  private async extractPatterns(example: ExampleAnalysis): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const { content, language } = example;

    // Extract patterns based on language
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        patterns.push(...this.extractJavaScriptPatterns(content));
        break;
      case 'python':
      case 'py':
        patterns.push(...this.extractPythonPatterns(content));
        break;
      case 'json':
        patterns.push(...this.extractJsonPatterns(content));
        break;
      default:
        patterns.push(...this.extractGenericPatterns(content));
    }

    return patterns;
  }

  private extractJavaScriptPatterns(content: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Initialization patterns
    if (content.includes('new ')) {
      const constructorMatches = content.match(/new\s+(\w+)\s*\([^)]*\)/g);
      if (constructorMatches) {
        for (const match of constructorMatches) {
          patterns.push({
            type: 'initialization',
            pattern: match,
            description: 'Object instantiation pattern',
            frequency: 1
          });
        }
      }
    }

    // Configuration patterns
    const configPatterns = [
      /\{\s*[\w\s:,'"]+\}/g, // Object literals
      /\.config\s*\([^)]+\)/g, // .config() calls
      /options\s*[:=]\s*\{[^}]+\}/g // options objects
    ];

    for (const pattern of configPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          patterns.push({
            type: 'configuration',
            pattern: match,
            description: 'Configuration object pattern',
            frequency: 1
          });
        }
      }
    }

    // Usage patterns
    const usagePatterns = [
      /\w+\.\w+\([^)]*\)/g, // Method calls
      /await\s+\w+\.[^;]+/g, // Async usage
      /\w+\s*=>\s*[^;]+/g, // Arrow functions
      /\.then\s*\([^)]+\)/g, // Promise chains
      /\.catch\s*\([^)]+\)/g // Error handling
    ];

    for (const pattern of usagePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          patterns.push({
            type: 'usage',
            pattern: match,
            description: 'API usage pattern',
            frequency: 1
          });
        }
      }
    }

    // Error handling patterns
    const errorPatterns = [
      /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
      /\.catch\s*\([^)]+\)/g,
      /throw\s+new\s+\w+/g
    ];

    for (const pattern of errorPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          patterns.push({
            type: 'error-handling',
            pattern: match,
            description: 'Error handling pattern',
            frequency: 1
          });
        }
      }
    }

    return patterns;
  }

  private extractPythonPatterns(content: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Import patterns
    const importMatches = content.match(/(?:from\s+\w+\s+)?import\s+[\w\s,]+/g);
    if (importMatches) {
      for (const match of importMatches) {
        patterns.push({
          type: 'initialization',
          pattern: match,
          description: 'Import pattern',
          frequency: 1
        });
      }
    }

    // Class instantiation
    const classMatches = content.match(/\w+\s*=\s*\w+\([^)]*\)/g);
    if (classMatches) {
      for (const match of classMatches) {
        patterns.push({
          type: 'initialization',
          pattern: match,
          description: 'Class instantiation pattern',
          frequency: 1
        });
      }
    }

    // Method calls
    const methodMatches = content.match(/\w+\.\w+\([^)]*\)/g);
    if (methodMatches) {
      for (const match of methodMatches) {
        patterns.push({
          type: 'usage',
          pattern: match,
          description: 'Method call pattern',
          frequency: 1
        });
      }
    }

    return patterns;
  }

  private extractJsonPatterns(content: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    try {
      const parsed = JSON.parse(content);
      
      // Configuration structure patterns
      const keys = Object.keys(parsed);
      for (const key of keys) {
        patterns.push({
          type: 'configuration',
          pattern: `"${key}": ${typeof parsed[key]}`,
          description: `Configuration key: ${key}`,
          frequency: 1
        });
      }

    } catch (error) {
      // If JSON parsing fails, extract basic patterns
      const keyValueMatches = content.match(/"(\w+)"\s*:\s*[^,}]+/g);
      if (keyValueMatches) {
        for (const match of keyValueMatches) {
          patterns.push({
            type: 'configuration',
            pattern: match,
            description: 'JSON configuration pattern',
            frequency: 1
          });
        }
      }
    }

    return patterns;
  }

  private extractGenericPatterns(content: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Look for common programming constructs
    const commonPatterns = [
      { regex: /function\s+\w+\s*\([^)]*\)/g, type: 'usage', desc: 'Function definition' },
      { regex: /\w+\s*=\s*[^;]+/g, type: 'initialization', desc: 'Variable assignment' },
      { regex: /if\s*\([^)]+\)/g, type: 'usage', desc: 'Conditional statement' },
      { regex: /for\s*\([^)]+\)/g, type: 'usage', desc: 'Loop construct' },
      { regex: /while\s*\([^)]+\)/g, type: 'usage', desc: 'While loop' }
    ];

    for (const { regex, type, desc } of commonPatterns) {
      const matches = content.match(regex);
      if (matches) {
        for (const match of matches) {
          patterns.push({
            type: type as CodePattern['type'],
            pattern: match,
            description: desc,
            frequency: 1
          });
        }
      }
    }

    return patterns;
  }

  private enhanceImports(content: string, language: string): string[] {
    const imports: string[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        // ES6 imports
        const esImports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
        if (esImports) {
          for (const imp of esImports) {
            const match = imp.match(/from\s+['"]([^'"]+)['"]/);
            if (match) imports.push(match[1]);
          }
        }

        // CommonJS requires
        const cjsImports = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        if (cjsImports) {
          for (const imp of cjsImports) {
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match) imports.push(match[1]);
          }
        }

        // Dynamic imports
        const dynamicImports = content.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        if (dynamicImports) {
          for (const imp of dynamicImports) {
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match) imports.push(match[1]);
          }
        }
        break;

      case 'python':
      case 'py':
        // Python imports
        const pyImports = content.match(/(?:from\s+(\w+(?:\.\w+)*)\s+)?import\s+[\w\s,]+/g);
        if (pyImports) {
          for (const imp of pyImports) {
            const fromMatch = imp.match(/from\s+(\w+(?:\.\w+)*)/);
            if (fromMatch) {
              imports.push(fromMatch[1]);
            } else {
              const importMatch = imp.match(/import\s+([\w\s,]+)/);
              if (importMatch) {
                const modules = importMatch[1].split(',').map(m => m.trim());
                imports.push(...modules);
              }
            }
          }
        }
        break;
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  private refineCategory(example: ExampleAnalysis): ExampleAnalysis['category'] {
    const { content, filePath } = example;

    // Check file path for category hints
    if (filePath.includes('test') || filePath.includes('spec')) {
      return 'test';
    }

    if (filePath.includes('demo') || filePath.includes('example')) {
      return 'demo';
    }

    if (filePath.includes('integration') || filePath.includes('e2e')) {
      return 'integration';
    }

    // Check content for category hints
    if (content.includes('describe(') || content.includes('it(') || content.includes('test(')) {
      return 'test';
    }

    if (content.includes('express') || content.includes('server') || content.includes('app.listen')) {
      return 'integration';
    }

    if (content.includes('config') || content.includes('options') || content.includes('settings')) {
      return 'demo'; // Configuration examples are often demos
    }

    // Default to documentation if no clear category
    return 'documentation';
  }

  private calculatePatternFrequencies(examples: ExampleAnalysis[]): void {
    const patternCounts = new Map<string, number>();

    // Count pattern occurrences across all examples
    for (const example of examples) {
      for (const pattern of example.patterns) {
        const key = `${pattern.type}:${pattern.pattern}`;
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
      }
    }

    // Update frequencies
    for (const example of examples) {
      for (const pattern of example.patterns) {
        const key = `${pattern.type}:${pattern.pattern}`;
        pattern.frequency = patternCounts.get(key) || 1;
      }
    }
  }
}