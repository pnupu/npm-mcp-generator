/**
 * Validation framework for generated MCP servers
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { GeneratedMCPServer } from '../types/MCPTypes.js';

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  file?: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  fixable: boolean;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface ValidationMetrics {
  filesChecked: number;
  linesOfCode: number;
  toolCount: number;
  dependencyCount: number;
  testCoverage?: number;
}

export type ValidationErrorType = 
  | 'MISSING_FILE'
  | 'INVALID_SYNTAX'
  | 'MISSING_DEPENDENCY'
  | 'INVALID_MCP_STRUCTURE'
  | 'TYPE_ERROR'
  | 'RUNTIME_ERROR'
  | 'PERFORMANCE_ISSUE'
  | 'SECURITY_ISSUE';

export class MCPServerValidator {
  /**
   * Validate a generated MCP server
   */
  async validateServer(serverPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const metrics: ValidationMetrics = {
      filesChecked: 0,
      linesOfCode: 0,
      toolCount: 0,
      dependencyCount: 0
    };

    try {
      // 1. Validate file structure
      await this.validateFileStructure(serverPath, errors, warnings, metrics);

      // 2. Validate package.json
      await this.validatePackageJson(serverPath, errors, warnings, metrics);

      // 3. Validate TypeScript code
      await this.validateTypeScriptCode(serverPath, errors, warnings, metrics);

      // 4. Validate MCP protocol compliance
      await this.validateMCPCompliance(serverPath, errors, warnings, metrics);

      // 5. Validate runtime behavior (if possible)
      await this.validateRuntimeBehavior(serverPath, errors, warnings, metrics);

      // 6. Performance validation
      await this.validatePerformance(serverPath, errors, warnings, metrics);

    } catch (error) {
      errors.push({
        type: 'RUNTIME_ERROR',
        message: `Validation failed: ${error}`,
        severity: 'error',
        fixable: false
      });
    }

    // Calculate overall score
    const score = this.calculateValidationScore(errors, warnings, metrics);

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      score,
      errors,
      warnings,
      metrics
    };
  }

  /**
   * Validate generated server against expected structure
   */
  async validateGeneratedServer(server: GeneratedMCPServer, serverPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const metrics: ValidationMetrics = {
      filesChecked: 0,
      linesOfCode: 0,
      toolCount: server.tools.length,
      dependencyCount: Object.keys(server.packageJson.dependencies || {}).length
    };

    try {
      // Validate that generated content matches expected structure
      await this.validateGeneratedContent(server, serverPath, errors, warnings, metrics);

      // Validate tool implementations
      await this.validateToolImplementations(server, serverPath, errors, warnings, metrics);

      // Validate documentation quality
      await this.validateDocumentation(server, serverPath, errors, warnings, metrics);

    } catch (error) {
      errors.push({
        type: 'RUNTIME_ERROR',
        message: `Generated server validation failed: ${error}`,
        severity: 'error',
        fixable: false
      });
    }

    const score = this.calculateValidationScore(errors, warnings, metrics);

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      score,
      errors,
      warnings,
      metrics
    };
  }

  private async validateFileStructure(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    const requiredFiles = [
      'package.json',
      'src/index.ts',
      'tsconfig.json',
      'README.md'
    ];

    const optionalFiles = [
      '.gitignore',
      'src/types.ts',
      'tests/'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(join(serverPath, file));
        metrics.filesChecked++;
      } catch {
        errors.push({
          type: 'MISSING_FILE',
          message: `Required file missing: ${file}`,
          file,
          severity: 'error',
          fixable: true
        });
      }
    }

    for (const file of optionalFiles) {
      try {
        await fs.access(join(serverPath, file));
        metrics.filesChecked++;
      } catch {
        warnings.push({
          type: 'MISSING_OPTIONAL_FILE',
          message: `Optional file missing: ${file}`,
          suggestion: `Consider adding ${file} for better development experience`
        });
      }
    }
  }

  private async validatePackageJson(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const packageJsonPath = join(serverPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Required fields
      const requiredFields = ['name', 'version', 'type', 'dependencies'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          errors.push({
            type: 'INVALID_SYNTAX',
            message: `Missing required field in package.json: ${field}`,
            file: 'package.json',
            severity: 'error',
            fixable: true
          });
        }
      }

      // Check for MCP SDK dependency
      if (!packageJson.dependencies?.['@modelcontextprotocol/sdk']) {
        errors.push({
          type: 'MISSING_DEPENDENCY',
          message: 'Missing required dependency: @modelcontextprotocol/sdk',
          file: 'package.json',
          severity: 'error',
          fixable: true
        });
      }

      // Check module type
      if (packageJson.type !== 'module') {
        errors.push({
          type: 'INVALID_SYNTAX',
          message: 'Package type should be "module" for ESM compatibility',
          file: 'package.json',
          severity: 'error',
          fixable: true
        });
      }

      // Count dependencies
      metrics.dependencyCount = Object.keys(packageJson.dependencies || {}).length;

      // Check for development dependencies
      if (!packageJson.devDependencies?.typescript) {
        warnings.push({
          type: 'MISSING_DEV_DEPENDENCY',
          message: 'Missing TypeScript in devDependencies',
          suggestion: 'Add TypeScript for better development experience'
        });
      }

    } catch (error) {
      errors.push({
        type: 'INVALID_SYNTAX',
        message: `Invalid package.json: ${error}`,
        file: 'package.json',
        severity: 'error',
        fixable: false
      });
    }
  }

  private async validateTypeScriptCode(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const indexPath = join(serverPath, 'src', 'index.ts');
      const code = await fs.readFile(indexPath, 'utf-8');
      
      metrics.linesOfCode = code.split('\n').length;

      // Basic syntax checks
      if (!code.includes('import')) {
        errors.push({
          type: 'INVALID_SYNTAX',
          message: 'No import statements found',
          file: 'src/index.ts',
          severity: 'error',
          fixable: false
        });
      }

      if (!code.includes('class')) {
        errors.push({
          type: 'INVALID_MCP_STRUCTURE',
          message: 'No class definition found',
          file: 'src/index.ts',
          severity: 'error',
          fixable: false
        });
      }

      // MCP-specific checks
      const mcpImports = [
        'Server',
        'StdioServerTransport',
        'ListToolsRequestSchema',
        'CallToolRequestSchema'
      ];

      for (const importName of mcpImports) {
        if (!code.includes(importName)) {
          errors.push({
            type: 'INVALID_MCP_STRUCTURE',
            message: `Missing required MCP import: ${importName}`,
            file: 'src/index.ts',
            severity: 'error',
            fixable: true
          });
        }
      }

      // Check for error handling
      if (!code.includes('try') || !code.includes('catch')) {
        warnings.push({
          type: 'MISSING_ERROR_HANDLING',
          message: 'No error handling found',
          suggestion: 'Add try-catch blocks for better error handling'
        });
      }

      // Check for proper async/await usage
      const asyncCount = (code.match(/async/g) || []).length;
      const awaitCount = (code.match(/await/g) || []).length;
      
      if (asyncCount > 0 && awaitCount === 0) {
        warnings.push({
          type: 'ASYNC_USAGE',
          message: 'Async functions found but no await statements',
          suggestion: 'Ensure proper async/await usage'
        });
      }

    } catch (error) {
      errors.push({
        type: 'MISSING_FILE',
        message: `Cannot read TypeScript code: ${error}`,
        file: 'src/index.ts',
        severity: 'error',
        fixable: false
      });
    }
  }

  private async validateMCPCompliance(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const indexPath = join(serverPath, 'src', 'index.ts');
      const code = await fs.readFile(indexPath, 'utf-8');

      // Count tools
      const toolMatches = code.match(/case\s+['"][^'"]+['"]:/g);
      metrics.toolCount = toolMatches ? toolMatches.length : 0;

      if (metrics.toolCount === 0) {
        errors.push({
          type: 'INVALID_MCP_STRUCTURE',
          message: 'No MCP tools found in server',
          file: 'src/index.ts',
          severity: 'error',
          fixable: false
        });
      }

      // Check for required MCP methods
      const requiredMethods = [
        'setRequestHandler',
        'ListToolsRequestSchema',
        'CallToolRequestSchema'
      ];

      for (const method of requiredMethods) {
        if (!code.includes(method)) {
          errors.push({
            type: 'INVALID_MCP_STRUCTURE',
            message: `Missing required MCP method: ${method}`,
            file: 'src/index.ts',
            severity: 'error',
            fixable: true
          });
        }
      }

      // Check for proper tool response format
      if (!code.includes('content') || !code.includes('type: "text"')) {
        warnings.push({
          type: 'MCP_RESPONSE_FORMAT',
          message: 'Tool responses may not follow MCP format',
          suggestion: 'Ensure tools return proper MCP response format'
        });
      }

    } catch (error) {
      errors.push({
        type: 'RUNTIME_ERROR',
        message: `MCP compliance check failed: ${error}`,
        severity: 'error',
        fixable: false
      });
    }
  }

  private async validateRuntimeBehavior(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    // This would require actually running the server, which is complex
    // For now, we'll do static analysis
    
    try {
      const indexPath = join(serverPath, 'src', 'index.ts');
      const code = await fs.readFile(indexPath, 'utf-8');

      // Check for potential runtime issues
      if (code.includes('process.exit(0)')) {
        warnings.push({
          type: 'RUNTIME_BEHAVIOR',
          message: 'Server calls process.exit(0) which may cause issues',
          suggestion: 'Consider graceful shutdown instead'
        });
      }

      // Check for console.log usage (should use console.error for MCP)
      if (code.includes('console.log')) {
        warnings.push({
          type: 'LOGGING',
          message: 'Using console.log instead of console.error',
          suggestion: 'Use console.error for MCP server logging'
        });
      }

    } catch (error) {
      // Runtime validation is optional
    }
  }

  private async validatePerformance(
    serverPath: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const indexPath = join(serverPath, 'src', 'index.ts');
      const code = await fs.readFile(indexPath, 'utf-8');

      // Check for potential performance issues
      if (code.includes('JSON.parse') && !code.includes('try')) {
        warnings.push({
          type: 'PERFORMANCE',
          message: 'JSON.parse without error handling may cause performance issues',
          suggestion: 'Wrap JSON.parse in try-catch blocks'
        });
      }

      // Check for synchronous file operations
      if (code.includes('readFileSync') || code.includes('writeFileSync')) {
        warnings.push({
          type: 'PERFORMANCE',
          message: 'Synchronous file operations may block the event loop',
          suggestion: 'Use asynchronous file operations'
        });
      }

      // Check code size
      if (metrics.linesOfCode > 1000) {
        warnings.push({
          type: 'CODE_SIZE',
          message: 'Generated server is quite large',
          suggestion: 'Consider splitting into multiple files'
        });
      }

    } catch (error) {
      // Performance validation is optional
    }
  }

  private async validateGeneratedContent(
    server: GeneratedMCPServer,
    serverPath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    metrics: ValidationMetrics
  ): Promise<void> {
    // Validate that the generated server matches the specification
    if (server.tools.length === 0) {
      errors.push({
        type: 'INVALID_MCP_STRUCTURE',
        message: 'Generated server has no tools',
        severity: 'error',
        fixable: false
      });
    }

    // Check that all tools have proper schemas
    for (const tool of server.tools) {
      if (!tool.inputSchema || !tool.inputSchema.type) {
        errors.push({
          type: 'INVALID_MCP_STRUCTURE',
          message: `Tool ${tool.name} has invalid input schema`,
          severity: 'error',
          fixable: true
        });
      }
    }

    // Validate metadata
    if (!server.metadata.generatedAt || !server.metadata.sourcePackage) {
      warnings.push({
        type: 'MISSING_METADATA',
        message: 'Generated server missing metadata',
        suggestion: 'Ensure metadata is properly generated'
      });
    }
  }

  private async validateToolImplementations(
    server: GeneratedMCPServer,
    serverPath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const indexPath = join(serverPath, 'src', 'index.ts');
      const code = await fs.readFile(indexPath, 'utf-8');

      // Check that each tool has an implementation
      for (const tool of server.tools) {
        const methodName = this.toCamelCase(tool.name);
        if (!code.includes(methodName)) {
          errors.push({
            type: 'MISSING_DEPENDENCY',
            message: `Tool ${tool.name} missing implementation method ${methodName}`,
            file: 'src/index.ts',
            severity: 'error',
            fixable: true
          });
        }
      }

    } catch (error) {
      errors.push({
        type: 'RUNTIME_ERROR',
        message: `Tool implementation validation failed: ${error}`,
        severity: 'error',
        fixable: false
      });
    }
  }

  private async validateDocumentation(
    server: GeneratedMCPServer,
    serverPath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    metrics: ValidationMetrics
  ): Promise<void> {
    try {
      const readmePath = join(serverPath, 'README.md');
      const readme = await fs.readFile(readmePath, 'utf-8');

      // Check for required documentation sections
      const requiredSections = ['Installation', 'Usage', 'Tools'];
      for (const section of requiredSections) {
        if (!readme.includes(section)) {
          warnings.push({
            type: 'DOCUMENTATION',
            message: `README missing section: ${section}`,
            suggestion: `Add ${section} section to README`
          });
        }
      }

      // Check that all tools are documented
      for (const tool of server.tools) {
        if (!readme.includes(tool.name)) {
          warnings.push({
            type: 'DOCUMENTATION',
            message: `Tool ${tool.name} not documented in README`,
            suggestion: `Add documentation for ${tool.name}`
          });
        }
      }

    } catch (error) {
      warnings.push({
        type: 'DOCUMENTATION',
        message: 'Cannot validate documentation',
        suggestion: 'Ensure README.md exists and is readable'
      });
    }
  }

  private calculateValidationScore(
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    metrics: ValidationMetrics
  ): number {
    let score = 100;

    // Deduct points for errors
    for (const error of errors) {
      switch (error.severity) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    // Deduct points for warnings
    score -= warnings.length * 2;

    // Bonus points for good metrics
    if (metrics.toolCount > 3) score += 5;
    if (metrics.linesOfCode > 100 && metrics.linesOfCode < 500) score += 5;
    if (metrics.dependencyCount < 10) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Attempt to fix common validation issues
   */
  async fixValidationIssues(serverPath: string, errors: ValidationError[]): Promise<{ fixed: number; remaining: ValidationError[] }> {
    let fixed = 0;
    const remaining: ValidationError[] = [];

    for (const error of errors) {
      if (error.fixable) {
        try {
          await this.fixError(serverPath, error);
          fixed++;
        } catch {
          remaining.push(error);
        }
      } else {
        remaining.push(error);
      }
    }

    return { fixed, remaining };
  }

  private async fixError(serverPath: string, error: ValidationError): Promise<void> {
    switch (error.type) {
      case 'MISSING_FILE':
        if (error.file === '.gitignore') {
          await fs.writeFile(join(serverPath, '.gitignore'), 'node_modules/\ndist/\n*.log\n');
        }
        break;
      
      case 'INVALID_SYNTAX':
        if (error.file === 'package.json' && error.message.includes('type')) {
          const packageJsonPath = join(serverPath, 'package.json');
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          packageJson.type = 'module';
          await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
        break;
      
      // Add more fix implementations as needed
    }
  }
}