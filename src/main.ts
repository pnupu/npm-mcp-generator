#!/usr/bin/env node

/**
 * Main entry point for the NPM MCP Generator
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ApplicationOrchestrator } from './core/ApplicationOrchestrator.js';
import { PackageAnalyzer } from './analyzers/PackageAnalyzer.js';
import { PackageInfo } from './types/PackageInfo.js';

const program = new Command();

program
  .name('npm-mcp-generator')
  .description('Generate MCP servers from NPM package documentation')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate an MCP server for an NPM package')
  .argument('<package-name>', 'NPM package name to analyze')
  .option('-v, --version <version>', 'Specific package version to analyze')
  .option('-o, --output <directory>', 'Output directory for generated server', './generated-servers')
  .option('--no-cache', 'Disable caching of analysis results')
  .option('--no-examples', 'Skip example analysis for faster generation')
  .option('--no-types', 'Skip TypeScript definition analysis')
  .option('--github-token <token>', 'GitHub API token for better rate limits')
  .option('--template <template>', 'Server template to use (basic, enhanced, minimal)')
  .option('--verbose', 'Enable verbose logging')
  .action(async (packageName: string, options) => {
    try {
      console.log(`🚀 NPM MCP Generator v1.0.0`);
      
      // Initialize orchestrator
      const orchestrator = new ApplicationOrchestrator();
      
      // Validate environment
      const validation = await orchestrator.validateEnvironment();
      if (!validation.valid) {
        console.error('❌ Environment validation failed:');
        for (const issue of validation.issues) {
          console.error(`   - ${issue}`);
        }
        process.exit(1);
      }

      // Create generation request
      const request = ApplicationOrchestrator.createGenerationRequest(
        packageName,
        options.version,
        options.output,
        options
      );

      // Generate MCP server
      const result = await orchestrator.generateMCPServer(request);

      if (!result.success) {
        console.error(`❌ Generation failed: ${result.error}`);
        if (result.warnings.length > 0) {
          console.error(`⚠️  Warnings:`);
          for (const warning of result.warnings) {
            console.error(`   - ${warning}`);
          }
        }
        process.exit(1);
      }

      // Display results
      const analysis = result.analysis!;
      const server = result.server!;

      console.log(`\n📋 Analysis Summary:`);
      console.log(`   Package: ${analysis.packageInfo.name}@${analysis.packageInfo.version}`);
      console.log(`   Description: ${analysis.packageInfo.description}`);
      console.log(`   Completeness: ${analysis.metadata.completeness.overall}%`);
      console.log(`   README sections: ${analysis.readme.sections.length}`);
      console.log(`   Usage examples: ${analysis.readme.usageExamples.length}`);
      console.log(`   Type definitions: ${analysis.typeDefinitions.hasDefinitions ? 'Yes' : 'No'}`);
      console.log(`   Repository examples: ${analysis.examples.length}`);

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        for (const warning of result.warnings) {
          console.log(`   - ${warning}`);
        }
      }

      console.log(`\n🎉 MCP server generated successfully!`);
      console.log(`\n📦 Server Details:`);
      console.log(`   Name: ${server.packageJson.name}`);
      console.log(`   Tools: ${server.tools.length}`);
      console.log(`   Location: ${result.serverPath}`);
      console.log(`   Features: ${server.metadata.features.filter(f => f.enabled).length}/${server.metadata.features.length} enabled`);

      console.log(`\n⏱️  Performance Metrics:`);
      console.log(`   Total time: ${result.metrics.totalTime}ms`);
      console.log(`   Analysis: ${result.metrics.analysisTime}ms`);
      console.log(`   Generation: ${result.metrics.generationTime}ms`);
      console.log(`   File writing: ${result.metrics.fileWriteTime}ms`);
      console.log(`   Files written: ${result.metrics.filesWritten}`);
      console.log(`   Cache hits: ${result.metrics.cacheHits}`);

      console.log(`\n🔧 Next Steps:`);
      console.log(`   1. cd ${result.serverPath}`);
      console.log(`   2. npm install`);
      console.log(`   3. npm run build`);
      console.log(`   4. Add to your Kiro MCP configuration:`);
      console.log(`\n   {`);
      console.log(`     "mcpServers": {`);
      console.log(`       "${analysis.packageInfo.name}": {`);
      console.log(`         "command": "node",`);
      console.log(`         "args": ["${join(result.serverPath!, 'dist', 'index.js')}"]`);
      console.log(`       }`);
      console.log(`     }`);
      console.log(`   }`);

      // Verbose statistics
      if (options.verbose) {
        const stats = orchestrator.getStatistics();
        console.log(`\n📊 Detailed Statistics:`);
        console.log(`   Memory usage: ${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB`);
        console.log(`   Cache stats:`, stats.cache);
      }

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      if (options.verbose && error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Generate MCP servers for multiple packages from a file')
  .argument('<packages-file>', 'JSON file containing package list')
  .option('-o, --output <directory>', 'Output directory for generated servers', './generated-servers')
  .option('--github-token <token>', 'GitHub API token for better rate limits')
  .option('--verbose', 'Enable verbose logging')
  .action(async (packagesFile: string, options) => {
    try {
      console.log(`🚀 NPM MCP Generator - Batch Mode`);
      
      // Read packages file
      const packagesData = JSON.parse(await fs.readFile(packagesFile, 'utf-8'));
      const packages = Array.isArray(packagesData) ? packagesData : packagesData.packages;
      
      if (!Array.isArray(packages)) {
        console.error('❌ Invalid packages file format. Expected array of package names or objects.');
        process.exit(1);
      }

      // Initialize orchestrator
      const orchestrator = new ApplicationOrchestrator();
      
      // Create generation requests
      const requests = packages.map(pkg => {
        const packageName = typeof pkg === 'string' ? pkg : pkg.name;
        const version = typeof pkg === 'object' ? pkg.version : undefined;
        
        return ApplicationOrchestrator.createGenerationRequest(
          packageName,
          version,
          options.output,
          options
        );
      });

      // Generate servers
      const results = await orchestrator.generateBatch(requests);
      
      // Summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`\n📊 Batch Generation Complete:`);
      console.log(`   Total packages: ${results.length}`);
      console.log(`   Successful: ${successful.length}`);
      console.log(`   Failed: ${failed.length}`);
      
      if (failed.length > 0) {
        console.log(`\n❌ Failed packages:`);
        for (const result of failed) {
          console.log(`   - ${result.packageName}: ${result.error}`);
        }
      }

      if (successful.length > 0) {
        console.log(`\n✅ Generated servers:`);
        for (const result of successful) {
          console.log(`   - ${result.packageName} (${result.metrics.toolsGenerated} tools)`);
        }
      }

    } catch (error) {
      console.error('❌ Batch generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available generated MCP servers')
  .option('-o, --output <directory>', 'Directory to search for servers', './generated-servers')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const outputDir = resolve(options.output);
      console.log(`📋 Scanning for MCP servers in: ${outputDir}`);

      const servers = await findMCPServers(outputDir);

      if (options.json) {
        console.log(JSON.stringify(servers, null, 2));
      } else {
        if (servers.length === 0) {
          console.log('No MCP servers found.');
        } else {
          console.log(`\nFound ${servers.length} MCP server(s):\n`);
          
          for (const server of servers) {
            console.log(`📦 ${server.name}`);
            console.log(`   Path: ${server.path}`);
            console.log(`   Package: ${server.sourcePackage}@${server.version}`);
            console.log(`   Tools: ${server.toolCount}`);
            console.log(`   Generated: ${server.generatedAt.toLocaleDateString()}`);
            console.log('');
          }
        }
      }

    } catch (error) {
      console.error('❌ Error listing servers:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a generated MCP server')
  .argument('<server-path>', 'Path to the MCP server to validate')
  .option('--fix', 'Attempt to fix validation issues')
  .action(async (serverPath: string, options) => {
    try {
      console.log(`🔍 Validating MCP server: ${serverPath}`);

      const validation = await validateMCPServer(serverPath);

      if (validation.valid) {
        console.log('✅ MCP server is valid!');
        console.log(`   Tools: ${validation.toolCount}`);
        console.log(`   Dependencies: ${validation.dependenciesOk ? 'OK' : 'Issues found'}`);
        console.log(`   TypeScript: ${validation.typescriptOk ? 'OK' : 'Issues found'}`);
      } else {
        console.log('❌ MCP server validation failed:');
        for (const error of validation.errors) {
          console.log(`   - ${error}`);
        }

        if (options.fix) {
          console.log('\n🔧 Attempting to fix issues...');
          // TODO: Implement fix logic
          console.log('⚠️  Fix functionality not yet implemented');
        }

        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error validating server:', error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean generated MCP servers and cache')
  .option('-o, --output <directory>', 'Directory containing generated servers', './generated-servers')
  .option('--cache-only', 'Only clear cache, keep generated servers')
  .action(async (options) => {
    try {
      if (!options.cacheOnly) {
        const outputDir = resolve(options.output);
        console.log(`🧹 Cleaning generated servers in: ${outputDir}`);
        
        try {
          await fs.rm(outputDir, { recursive: true, force: true });
          console.log('✅ Generated servers cleaned');
        } catch (error) {
          console.log('ℹ️  No generated servers to clean');
        }
      }

      // Clear analyzer caches
      console.log('🧹 Clearing analysis caches...');
      const analyzer = new PackageAnalyzer();
      analyzer.clearCaches();
      console.log('✅ Caches cleared');

    } catch (error) {
      console.error('❌ Error cleaning:', error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command. Use --help for available commands.');
  process.exit(1);
});

// Helper functions
async function findMCPServers(directory: string): Promise<any[]> {
  const servers: any[] = [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const serverPath = join(directory, entry.name);
        const packageJsonPath = join(serverPath, 'package.json');
        
        try {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          
          // Check if it looks like an MCP server
          if (packageJson.name?.includes('mcp-server') || 
              packageJson.dependencies?.['@modelcontextprotocol/sdk']) {
            
            // Try to read metadata
            let metadata = null;
            try {
              const readmePath = join(serverPath, 'README.md');
              const readme = await fs.readFile(readmePath, 'utf-8');
              const generatedMatch = readme.match(/Generated on: (.+)/);
              const packageMatch = readme.match(/Package: (.+)/);
              
              metadata = {
                generatedAt: generatedMatch ? new Date(generatedMatch[1]) : new Date(),
                sourcePackage: packageMatch ? packageMatch[1] : 'unknown'
              };
            } catch {
              // Ignore metadata read errors
            }

            servers.push({
              name: packageJson.name,
              path: serverPath,
              version: packageJson.version,
              sourcePackage: metadata?.sourcePackage || 'unknown',
              toolCount: 'unknown',
              generatedAt: metadata?.generatedAt || new Date()
            });
          }
        } catch {
          // Skip directories that don't have valid package.json
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return servers;
}

async function validateMCPServer(serverPath: string): Promise<any> {
  const errors: string[] = [];
  let toolCount = 0;
  let dependenciesOk = true;
  let typescriptOk = true;

  try {
    // Check package.json
    const packageJsonPath = join(serverPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    if (!packageJson.dependencies?.['@modelcontextprotocol/sdk']) {
      errors.push('Missing @modelcontextprotocol/sdk dependency');
      dependenciesOk = false;
    }

    // Check TypeScript files
    const srcPath = join(serverPath, 'src', 'index.ts');
    try {
      const serverCode = await fs.readFile(srcPath, 'utf-8');
      
      // Count tools (rough estimate)
      const toolMatches = serverCode.match(/case\s+['"][^'"]+['"]:/g);
      toolCount = toolMatches ? toolMatches.length : 0;
      
      // Check for basic MCP structure
      if (!serverCode.includes('Server') || !serverCode.includes('StdioServerTransport')) {
        errors.push('Invalid MCP server structure');
        typescriptOk = false;
      }
    } catch {
      errors.push('Missing or invalid src/index.ts file');
      typescriptOk = false;
    }

    // Check tsconfig.json
    const tsconfigPath = join(serverPath, 'tsconfig.json');
    try {
      await fs.access(tsconfigPath);
    } catch {
      errors.push('Missing tsconfig.json file');
      typescriptOk = false;
    }

  } catch (error) {
    errors.push(`Failed to validate server: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    toolCount,
    dependenciesOk,
    typescriptOk
  };
}

// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}