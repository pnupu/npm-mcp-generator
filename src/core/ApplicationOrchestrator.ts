/**
 * Main application orchestrator that coordinates the entire MCP server generation pipeline
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { PackageAnalyzer } from '../analyzers/PackageAnalyzer.js';
import { MCPServerGenerator } from '../generators/MCPServerGenerator.js';
import { PackageAnalysis } from '../types/PackageInfo.js';
import { GeneratedMCPServer } from '../types/MCPTypes.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export interface GenerationRequest {
  packageName: string;
  version?: string;
  outputDirectory: string;
  options: GenerationOptions;
}

export interface GenerationOptions {
  // Analysis options
  includeExamples?: boolean;
  includeTypeDefinitions?: boolean;
  githubToken?: string;
  docsUrl?: string;
  openaiKey?: string;
  generateEmbeddings?: boolean;
  
  // Generation options
  serverName?: string;
  template?: string;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  
  // Behavior options
  useCache?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface GenerationResult {
  success: boolean;
  packageName: string;
  serverPath?: string;
  analysis?: PackageAnalysis;
  server?: GeneratedMCPServer;
  error?: string;
  warnings: string[];
  metrics: GenerationMetrics;
}

export interface GenerationMetrics {
  totalTime: number;
  analysisTime: number;
  generationTime: number;
  fileWriteTime: number;
  cacheHits: number;
  toolsGenerated: number;
  filesWritten: number;
}

export class ApplicationOrchestrator {
  private analyzer: PackageAnalyzer;
  private generator: MCPServerGenerator;

  constructor() {
    this.analyzer = new PackageAnalyzer();
    this.generator = new MCPServerGenerator();
  }

  /**
   * Generate an MCP server for a package
   */
  async generateMCPServer(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let analysis: PackageAnalysis | undefined;
    let server: GeneratedMCPServer | undefined;
    let serverPath: string | undefined;

    const metrics: GenerationMetrics = {
      totalTime: 0,
      analysisTime: 0,
      generationTime: 0,
      fileWriteTime: 0,
      cacheHits: 0,
      toolsGenerated: 0,
      filesWritten: 0
    };

    try {
      // Step 1: Initialize analyzer with options
      this.initializeAnalyzer(request.options);

      // Step 2: Analyze the package
      console.log(`📊 Analyzing package: ${request.packageName}${request.version ? `@${request.version}` : ''}`);
      const analysisStartTime = Date.now();
      
      const analysisResult = await this.analyzer.analyzePackage(
        request.packageName,
        request.version,
        this.buildAnalyzerOptions(request.options)
      );

      metrics.analysisTime = Date.now() - analysisStartTime;

      if (!analysisResult.success) {
        return {
          success: false,
          packageName: request.packageName,
          error: analysisResult.error?.message || 'Analysis failed',
          warnings: analysisResult.warnings || [],
          metrics: { ...metrics, totalTime: Date.now() - startTime }
        };
      }

      analysis = analysisResult.data!;
      warnings.push(...(analysisResult.warnings || []));

      // Collect cache statistics
      const cacheStats = this.analyzer.getCacheStats();
      metrics.cacheHits = cacheStats.npm.entries + cacheStats.unpkg.entries;

      // Step 3: Generate MCP server
      console.log(`🔧 Generating MCP server...`);
      const generationStartTime = Date.now();
      
      const serverResult = await this.generator.generateServer(
        analysis,
        this.buildGeneratorOptions(request.options)
      );

      metrics.generationTime = Date.now() - generationStartTime;

      if (!serverResult.success) {
        return {
          success: false,
          packageName: request.packageName,
          analysis,
          error: serverResult.error?.message || 'Server generation failed',
          warnings: [...warnings, ...(serverResult.warnings || [])],
          metrics: { ...metrics, totalTime: Date.now() - startTime }
        };
      }

      server = serverResult.data!;
      warnings.push(...(serverResult.warnings || []));
      metrics.toolsGenerated = server.tools.length;

      // Step 4: Write files to disk (unless dry run)
      if (!request.options.dryRun) {
        console.log(`💾 Writing server files...`);
        const writeStartTime = Date.now();
        
        const writeResult = await this.writeServerFiles(server, request.outputDirectory, analysis);
        
        metrics.fileWriteTime = Date.now() - writeStartTime;
        metrics.filesWritten = writeResult.filesWritten;
        serverPath = writeResult.serverPath;
        warnings.push(...writeResult.warnings);
      }

      metrics.totalTime = Date.now() - startTime;

      return {
        success: true,
        packageName: request.packageName,
        serverPath,
        analysis,
        server,
        warnings,
        metrics
      };

    } catch (error) {
      metrics.totalTime = Date.now() - startTime;
      
      return {
        success: false,
        packageName: request.packageName,
        analysis,
        server,
        error: error instanceof Error ? error.message : String(error),
        warnings,
        metrics
      };
    }
  }

  /**
   * Generate multiple MCP servers in batch
   */
  async generateBatch(requests: GenerationRequest[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    
    console.log(`🚀 Starting batch generation of ${requests.length} packages...`);
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      console.log(`\n[${i + 1}/${requests.length}] Processing ${request.packageName}...`);
      
      const result = await this.generateMCPServer(request);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${request.packageName} completed successfully`);
      } else {
        console.log(`❌ ${request.packageName} failed: ${result.error}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`\n📊 Batch Summary:`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total time: ${results.reduce((sum, r) => sum + r.metrics.totalTime, 0)}ms`);

    return results;
  }

  /**
   * Validate the environment and dependencies
   */
  async validateEnvironment(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        issues.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
      }

      // Check if we can write to the file system
      try {
        const testDir = join(process.cwd(), '.npm-mcp-generator-test');
        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(join(testDir, 'test.txt'), 'test');
        await fs.rm(testDir, { recursive: true });
      } catch (error) {
        issues.push('Cannot write to the current directory. Check permissions.');
      }

      // Check network connectivity
      try {
        const response = await fetch('https://registry.npmjs.org/lodash', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) {
          issues.push('Cannot connect to NPM registry. Check internet connection.');
        }
      } catch (error) {
        issues.push('Network connectivity issues detected.');
      }

    } catch (error) {
      issues.push(`Environment validation failed: ${error}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get application statistics
   */
  getStatistics(): any {
    const cacheStats = this.analyzer.getCacheStats();
    
    return {
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: {
        npm: {
          size: cacheStats.npm.size,
          hitRate: cacheStats.npm.hitRate,
          entries: cacheStats.npm.entries
        },
        github: {
          remaining: cacheStats.github.remaining,
          authenticated: cacheStats.github.authenticated
        },
        unpkg: {
          size: cacheStats.unpkg.size,
          hitRate: cacheStats.unpkg.hitRate,
          entries: cacheStats.unpkg.entries
        }
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.analyzer.clearCaches();
  }

  private initializeAnalyzer(options: GenerationOptions): void {
    // Reinitialize analyzer with new options if needed
    if (options.githubToken || !options.useCache) {
      this.analyzer = new PackageAnalyzer(options.githubToken);
      
      if (!options.useCache) {
        this.analyzer.clearCaches();
      }
    }
  }

  private buildAnalyzerOptions(options: GenerationOptions): any {
    return {
      includeExamples: options.includeExamples,
      includeTypeDefinitions: options.includeTypeDefinitions,
      docsUrl: options.docsUrl,
      openaiKey: options.openaiKey,
      generateEmbeddings: options.generateEmbeddings
    };
  }

  private buildGeneratorOptions(options: GenerationOptions): any {
    return {
      serverName: options.serverName,
      includeTests: options.includeTests,
      includeDocumentation: options.includeDocumentation
    };
  }

  private async writeServerFiles(
    server: GeneratedMCPServer, 
    outputDirectory: string, 
    analysis: PackageAnalysis
  ): Promise<{ serverPath: string; filesWritten: number; warnings: string[] }> {
    const warnings: string[] = [];
    let filesWritten = 0;

    // Create server directory
    const serverPath = join(resolve(outputDirectory), server.packageJson.name);
    await fs.mkdir(serverPath, { recursive: true });
    await fs.mkdir(join(serverPath, 'src'), { recursive: true });

    // Write main server file
    await fs.writeFile(join(serverPath, 'src', 'index.ts'), server.serverCode);
    filesWritten++;

    // Write embeddings file if available
    if (this.generator.hasEmbeddings()) {
      await fs.writeFile(join(serverPath, 'src', 'embeddings.js'), this.generator.generateEmbeddingsFile());
      filesWritten++;
      console.log(`📦 Wrote embeddings file with ${this.generator['embeddingsData'].length} chunks`);
    }

    // Write documentation markdown file if available
    if (this.generator.hasEmbeddings()) {
      await fs.writeFile(join(serverPath, 'documentation.md'), this.generator.generateDocumentationFile());
      filesWritten++;
      console.log(`📝 Wrote documentation.md with processed chunks`);
    }

    // Write package.json
    await fs.writeFile(join(serverPath, 'package.json'), JSON.stringify(server.packageJson, null, 2));
    filesWritten++;

    // Write documentation
    await fs.writeFile(join(serverPath, 'README.md'), server.documentation);
    filesWritten++;

    // Write additional files
    const additionalFiles = this.generator.generateAdditionalFiles(analysis);
    for (const [filename, content] of Object.entries(additionalFiles)) {
      await fs.writeFile(join(serverPath, filename), content);
      filesWritten++;
    }

    // Write metadata file for tracking
    const metadata = {
      generatedAt: new Date().toISOString(),
      generatorVersion: '1.0.0',
      sourcePackage: analysis.packageInfo.name,
      sourceVersion: analysis.packageInfo.version,
      toolCount: server.tools.length,
      completenessScore: analysis.metadata.completeness.overall
    };

    await fs.writeFile(join(serverPath, '.mcp-generator-metadata.json'), JSON.stringify(metadata, null, 2));
    filesWritten++;

    return {
      serverPath,
      filesWritten,
      warnings
    };
  }

  /**
   * Create a generation request from CLI options
   */
  static createGenerationRequest(
    packageName: string,
    version: string | undefined,
    outputDirectory: string,
    cliOptions: any
  ): GenerationRequest {
    return {
      packageName,
      version,
      outputDirectory: resolve(outputDirectory),
      options: {
        includeExamples: cliOptions.examples !== false,
        includeTypeDefinitions: cliOptions.types !== false,
        githubToken: cliOptions.githubToken || process.env.GITHUB_TOKEN,
        docsUrl: cliOptions.docsUrl,
        openaiKey: cliOptions.openaiKey || process.env.OPENAI_API_KEY,
        generateEmbeddings: cliOptions.embeddings !== false && process.env.DEFAULT_EMBEDDINGS !== 'false',
        serverName: cliOptions.serverName,
        template: cliOptions.template,
        includeTests: cliOptions.includeTests,
        includeDocumentation: cliOptions.includeDocumentation !== false,
        useCache: cliOptions.cache !== false,
        verbose: cliOptions.verbose,
        dryRun: cliOptions.dryRun
      }
    };
  }
}