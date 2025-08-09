/**
 * README analyzer for extracting structured information from markdown documentation
 */

import MarkdownIt from 'markdown-it';
import { 
  ReadmeAnalysis, 
  ReadmeSection, 
  CodeBlock, 
  InstallationStep, 
  UsageExample, 
  ConfigurationOption 
} from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export class ReadmeAnalyzer {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
  }

  /**
   * Analyze README content and extract structured information
   */
  async analyze(readmeContent: string | null): Promise<AnalysisResult<ReadmeAnalysis>> {
    const startTime = Date.now();

    if (!readmeContent) {
      return {
        success: true,
        data: this.createEmptyAnalysis(),
        warnings: ['No README content provided'],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'readme-analyzer'
        }
      };
    }

    try {
      const tokens = this.md.parse(readmeContent, {});
      const warnings: string[] = [];

      // Extract sections
      const sections = this.extractSections(tokens);
      
      // Extract code blocks
      const codeBlocks = this.extractCodeBlocks(tokens);
      
      // Extract installation instructions
      const installationInstructions = this.extractInstallationInstructions(sections, codeBlocks);
      
      // Extract usage examples
      const usageExamples = this.extractUsageExamples(sections, codeBlocks);
      
      // Extract configuration options
      const configurationOptions = this.extractConfigurationOptions(sections);

      if (sections.length === 0) {
        warnings.push('No structured sections found in README');
      }

      if (codeBlocks.length === 0) {
        warnings.push('No code examples found in README');
      }

      const analysis: ReadmeAnalysis = {
        sections,
        codeBlocks,
        installationInstructions,
        usageExamples,
        configurationOptions
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: analysis,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'readme-analyzer'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PARSING_ERROR',
          message: `Failed to parse README: ${error}`,
          recoverable: false,
          suggestions: ['Check README markdown syntax', 'Verify file encoding']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'readme-analyzer'
        }
      };
    }
  }

  private extractSections(tokens: any[]): ReadmeSection[] {
    const sections: ReadmeSection[] = [];
    let currentSection: ReadmeSection | null = null;
    let sectionStack: ReadmeSection[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1)); // h1 -> 1, h2 -> 2, etc.
        const titleToken = tokens[i + 1];
        const title = titleToken?.content || '';

        const section: ReadmeSection = {
          title,
          level,
          content: '',
          subsections: []
        };

        // Handle section hierarchy
        if (level === 1) {
          sections.push(section);
          currentSection = section;
          sectionStack = [section];
        } else {
          // Find the appropriate parent section
          while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
            sectionStack.pop();
          }

          if (sectionStack.length > 0) {
            sectionStack[sectionStack.length - 1].subsections.push(section);
          } else {
            sections.push(section);
          }

          sectionStack.push(section);
          currentSection = section;
        }
      } else if (currentSection && this.isContentToken(token)) {
        // Add content to current section
        const content = this.extractTokenContent(token);
        if (content) {
          currentSection.content += content + '\n';
        }
      }
    }

    return sections;
  }

  private extractCodeBlocks(tokens: any[]): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];

    for (const token of tokens) {
      if (token.type === 'fence' || token.type === 'code_block') {
        const language = token.info?.trim() || 'text';
        const code = token.content || '';
        
        codeBlocks.push({
          language,
          code: code.trim(),
          context: this.inferCodeContext(code, language),
          isExample: this.isExampleCode(code, language)
        });
      }
    }

    return codeBlocks;
  }

  private extractInstallationInstructions(sections: ReadmeSection[], codeBlocks: CodeBlock[]): InstallationStep[] {
    const instructions: InstallationStep[] = [];
    
    // Look for installation sections
    const installSections = sections.filter(section => 
      /install|setup|getting.started/i.test(section.title)
    );

    // Extract installation commands from code blocks
    for (const block of codeBlocks) {
      if (block.language === 'bash' || block.language === 'sh' || block.language === 'shell') {
        const lines = block.code.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('npm install')) {
            instructions.push({
              command: trimmed,
              description: 'Install via npm',
              packageManager: 'npm'
            });
          } else if (trimmed.startsWith('yarn add')) {
            instructions.push({
              command: trimmed,
              description: 'Install via yarn',
              packageManager: 'yarn'
            });
          } else if (trimmed.startsWith('pnpm add')) {
            instructions.push({
              command: trimmed,
              description: 'Install via pnpm',
              packageManager: 'pnpm'
            });
          } else if (trimmed.startsWith('bun add')) {
            instructions.push({
              command: trimmed,
              description: 'Install via bun',
              packageManager: 'bun'
            });
          }
        }
      }
    }

    return instructions;
  }

  private extractUsageExamples(sections: ReadmeSection[], codeBlocks: CodeBlock[]): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for usage/example sections
    const usageSections = sections.filter(section => 
      /usage|example|quick.start|getting.started/i.test(section.title)
    );

    // Extract examples from code blocks in usage sections
    for (const block of codeBlocks) {
      if (this.isExampleCode(block.code, block.language)) {
        const imports = this.extractImports(block.code, block.language);
        
        examples.push({
          title: block.context || 'Code Example',
          description: `${block.language} example`,
          code: block.code,
          language: block.language,
          imports,
          category: this.categorizeExample(block.code, block.context)
        });
      }
    }

    return examples;
  }

  private extractConfigurationOptions(sections: ReadmeSection[]): ConfigurationOption[] {
    const options: ConfigurationOption[] = [];
    
    // Look for configuration/options sections
    const configSections = sections.filter(section => 
      /config|option|setting|parameter/i.test(section.title)
    );

    // This is a simplified implementation - could be enhanced with more sophisticated parsing
    for (const section of configSections) {
      const lines = section.content.split('\n');
      
      for (const line of lines) {
        // Look for option patterns like "- `optionName`: description"
        const optionMatch = line.match(/[-*]\s*`([^`]+)`\s*:?\s*(.+)/);
        if (optionMatch) {
          options.push({
            name: optionMatch[1],
            type: 'unknown',
            description: optionMatch[2].trim(),
            required: false,
            examples: []
          });
        }
      }
    }

    return options;
  }

  private isContentToken(token: any): boolean {
    return ['paragraph_open', 'inline', 'text', 'list_item_open'].includes(token.type);
  }

  private extractTokenContent(token: any): string {
    if (token.type === 'inline' && token.content) {
      return token.content;
    }
    if (token.children) {
      return token.children
        .filter((child: any) => child.type === 'text')
        .map((child: any) => child.content)
        .join('');
    }
    return '';
  }

  private inferCodeContext(code: string, language: string): string | undefined {
    if (language === 'bash' || language === 'sh') {
      if (code.includes('install')) return 'Installation';
      if (code.includes('run') || code.includes('start')) return 'Running';
    }
    
    if (language === 'javascript' || language === 'typescript') {
      if (code.includes('import') || code.includes('require')) return 'Import Example';
      if (code.includes('function') || code.includes('=>')) return 'Function Example';
      if (code.includes('const') || code.includes('let')) return 'Usage Example';
    }

    return undefined;
  }

  private isExampleCode(code: string, language: string): boolean {
    // Skip installation commands
    if (language === 'bash' && (code.includes('npm install') || code.includes('yarn add'))) {
      return false;
    }

    // Consider JavaScript/TypeScript code as examples
    if (['javascript', 'typescript', 'js', 'ts'].includes(language)) {
      return true;
    }

    // Consider JSON configuration as examples
    if (language === 'json' && code.includes('{')) {
      return true;
    }

    return false;
  }

  private extractImports(code: string, language: string): string[] {
    const imports: string[] = [];

    if (['javascript', 'typescript', 'js', 'ts'].includes(language)) {
      // ES6 imports
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }

      // CommonJS requires
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(code)) !== null) {
        imports.push(match[1]);
      }
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  private categorizeExample(code: string, context?: string): UsageExample['category'] {
    if (context?.toLowerCase().includes('config')) {
      return 'configuration';
    }

    if (code.includes('async') || code.includes('await') || code.includes('Promise')) {
      return 'advanced';
    }

    if (code.includes('import') && code.split('\n').length <= 5) {
      return 'basic';
    }

    if (code.includes('express') || code.includes('server') || code.includes('app.')) {
      return 'integration';
    }

    return 'basic';
  }

  private createEmptyAnalysis(): ReadmeAnalysis {
    return {
      sections: [],
      codeBlocks: [],
      installationInstructions: [],
      usageExamples: [],
      configurationOptions: []
    };
  }
}