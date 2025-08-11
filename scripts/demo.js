#!/usr/bin/env node

/**
 * Simple demonstration script for the hackathon
 */

import { ApplicationOrchestrator } from '../dist/core/ApplicationOrchestrator.js';
import { promises as fs } from 'fs';
import { join } from 'path';

const DEMO_PACKAGES = [
  { name: '@tanstack/react-query', version: '5.0.0' },
  { name: 'drizzle-orm', version: undefined },
  { name: '@ai-sdk/core', version: undefined }
];

async function runDemo() {
  console.log('\n🎯 NPM MCP Generator - Hackathon Demo\n');
  
  const orchestrator = new ApplicationOrchestrator();
  const demoDir = join(process.cwd(), 'demo-output');
  
  // Ensure demo directory exists
  await fs.mkdir(demoDir, { recursive: true });
  
  const results = [];
  
  for (const pkg of DEMO_PACKAGES) {
    console.log(`\n📦 Analyzing ${pkg.name}${pkg.version ? `@${pkg.version}` : ''}...`);
    
    const startTime = Date.now();
    
    try {
      const request = ApplicationOrchestrator.createGenerationRequest(
        pkg.name,
        pkg.version,
        demoDir,
        { verbose: false, dryRun: false }
      );
      
      const result = await orchestrator.generateMCPServer(request);
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ Success! Generated in ${duration}ms`);
        console.log(`   Completeness: ${result.analysis?.metadata.completeness.overall}%`);
        console.log(`   Tools: ${result.serverDetails?.tools || 0}`);
        
        results.push({
          package: pkg.name,
          version: pkg.version || 'latest',
          success: true,
          duration,
          completeness: result.analysis?.metadata.completeness.overall || 0,
          tools: result.serverDetails?.tools || 0,
          warnings: result.warnings?.length || 0
        });
      } else {
        console.log(`❌ Failed: ${result.error}`);
        results.push({
          package: pkg.name,
          version: pkg.version || 'latest',
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        package: pkg.name,
        version: pkg.version || 'latest',
        success: false,
        error: error.message
      });
    }
  }
  
  // Generate summary
  console.log('\n📊 Demo Summary:');
  console.log('================');
  
  const successful = results.filter(r => r.success);
  const avgCompleteness = successful.reduce((sum, r) => sum + r.completeness, 0) / successful.length;
  const totalTools = successful.reduce((sum, r) => sum + r.tools, 0);
  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  
  console.log(`Packages analyzed: ${results.length}`);
  console.log(`Success rate: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
  console.log(`Average completeness: ${avgCompleteness.toFixed(1)}%`);
  console.log(`Total tools generated: ${totalTools}`);
  console.log(`Average generation time: ${avgDuration.toFixed(0)}ms`);
  
  // Save results
  await fs.writeFile(
    join(demoDir, 'demo-results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  
  console.log(`\n📁 Results saved to: ${demoDir}/demo-results.json`);
  console.log('\n🎉 Demo completed successfully!');
}

runDemo().catch(console.error);