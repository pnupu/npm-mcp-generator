/**
 * Tests for MCP Server Validator
 */

import { MCPServerValidator } from '../../src/validation/MCPServerValidator';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('MCPServerValidator', () => {
  let validator: MCPServerValidator;
  const testServerPath = './test-validation-server';

  beforeAll(async () => {
    validator = new MCPServerValidator();
    
    // Create a test server structure
    await fs.mkdir(testServerPath, { recursive: true });
    await fs.mkdir(join(testServerPath, 'src'), { recursive: true });
  });

  afterAll(async () => {
    // Clean up test server
    try {
      await fs.rm(testServerPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up any existing test files
    try {
      const files = await fs.readdir(testServerPath);
      for (const file of files) {
        if (file !== 'src') {
          await fs.rm(join(testServerPath, file), { recursive: true, force: true });
        }
      }
      
      const srcFiles = await fs.readdir(join(testServerPath, 'src'));
      for (const file of srcFiles) {
        await fs.rm(join(testServerPath, 'src', file), { force: true });
      }
    } catch {
      // Directory might not exist
    }
  });

  describe('validateServer', () => {
    it('should validate a complete valid server', async () => {
      // Create valid server files
      await createValidServerFiles(testServerPath);

      const result = await validator.validateServer(testServerPath);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      expect(result.metrics.filesChecked).toBeGreaterThan(0);
      expect(result.metrics.toolCount).toBeGreaterThan(0);
    });

    it('should detect missing required files', async () => {
      // Create incomplete server (missing package.json)
      await fs.writeFile(join(testServerPath, 'src', 'index.ts'), 'console.log("test");');

      const result = await validator.validateServer(testServerPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_FILE' && e.file === 'package.json')).toBe(true);
      expect(result.score).toBeLessThan(80);
    });

    it('should detect invalid package.json', async () => {
      // Create invalid package.json
      await fs.writeFile(join(testServerPath, 'package.json'), '{ "name": "test" }'); // Missing required fields
      await fs.writeFile(join(testServerPath, 'src', 'index.ts'), 'console.log("test");');

      const result = await validator.validateServer(testServerPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_DEPENDENCY')).toBe(true);
    });

    it('should detect invalid TypeScript code', async () => {
      await createValidPackageJson(testServerPath);
      
      // Create invalid TypeScript code (no MCP imports)
      await fs.writeFile(join(testServerPath, 'src', 'index.ts'), 'console.log("hello");');

      const result = await validator.validateServer(testServerPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_MCP_STRUCTURE')).toBe(true);
    });

    it('should detect missing MCP compliance', async () => {
      await createValidPackageJson(testServerPath);
      
      // Create code with imports but no MCP structure
      const code = `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

class TestServer {
  constructor() {
    console.log("test");
  }
}
`;
      await fs.writeFile(join(testServerPath, 'src', 'index.ts'), code);

      const result = await validator.validateServer(testServerPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_MCP_STRUCTURE')).toBe(true);
    });

    it('should provide warnings for optional improvements', async () => {
      await createValidServerFiles(testServerPath);
      
      // Remove optional file
      try {
        await fs.rm(join(testServerPath, '.gitignore'));
      } catch {
        // File might not exist
      }

      const result = await validator.validateServer(testServerPath);

      expect(result.warnings.some(w => w.type === 'MISSING_OPTIONAL_FILE')).toBe(true);
    });

    it('should calculate appropriate validation scores', async () => {
      // Test with perfect server
      await createValidServerFiles(testServerPath);
      const perfectResult = await validator.validateServer(testServerPath);
      
      // Test with problematic server
      await fs.writeFile(join(testServerPath, 'package.json'), '{ "name": "test" }');
      const problematicResult = await validator.validateServer(testServerPath);

      expect(perfectResult.score).toBeGreaterThan(problematicResult.score);
      expect(perfectResult.score).toBeGreaterThan(80);
      expect(problematicResult.score).toBeLessThan(60);
    });
  });

  describe('fixValidationIssues', () => {
    it('should fix fixable validation issues', async () => {
      // Create server with fixable issues
      await fs.writeFile(join(testServerPath, 'package.json'), JSON.stringify({
        name: 'test-server',
        version: '1.0.0'
        // Missing type: 'module'
      }, null, 2));

      const initialResult = await validator.validateServer(testServerPath);
      const fixableErrors = initialResult.errors.filter(e => e.fixable);
      
      if (fixableErrors.length > 0) {
        const fixResult = await validator.fixValidationIssues(testServerPath, fixableErrors);
        
        expect(fixResult.fixed).toBeGreaterThan(0);
        expect(fixResult.remaining.length).toBeLessThan(fixableErrors.length);
      }
    });
  });

  describe('performance validation', () => {
    it('should complete validation within reasonable time', async () => {
      await createValidServerFiles(testServerPath);

      const startTime = Date.now();
      const result = await validator.validateServer(testServerPath);
      const validationTime = Date.now() - startTime;

      expect(result.valid).toBe(true);
      expect(validationTime).toBeLessThan(5000); // 5 seconds
    });
  });
});

// Helper functions
async function createValidServerFiles(serverPath: string): Promise<void> {
  await createValidPackageJson(serverPath);
  await createValidTypeScriptCode(serverPath);
  await createValidTsConfig(serverPath);
  await createValidReadme(serverPath);
  await createValidGitignore(serverPath);
}

async function createValidPackageJson(serverPath: string): Promise<void> {
  const packageJson = {
    name: 'test-mcp-server',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      '@modelcontextprotocol/sdk': '^0.4.0',
      'test-package': '1.0.0'
    },
    devDependencies: {
      'typescript': '^5.0.0',
      '@types/node': '^20.0.0'
    },
    scripts: {
      build: 'tsc',
      start: 'node dist/index.js'
    }
  };

  await fs.writeFile(join(serverPath, 'package.json'), JSON.stringify(packageJson, null, 2));
}

async function createValidTypeScriptCode(serverPath: string): Promise<void> {
  const code = `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class TestMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'test-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_package_info',
            description: 'Get package information',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_package_info':
            return await this.getPackageInfo(args || {});
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              \`Unknown tool: \${name}\`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          \`Error executing tool \${name}: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });
  }

  private async getPackageInfo(args: any) {
    return {
      content: [
        {
          type: "text",
          text: "Test package information"
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Test MCP server running on stdio');
  }
}

const server = new TestMCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});`;

  await fs.writeFile(join(serverPath, 'src', 'index.ts'), code);
}

async function createValidTsConfig(serverPath: string): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      sourceMap: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };

  await fs.writeFile(join(serverPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
}

async function createValidReadme(serverPath: string): Promise<void> {
  const readme = `# Test MCP Server

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm run build
npm start
\`\`\`

## Tools

### get_package_info

Get package information.
`;

  await fs.writeFile(join(serverPath, 'README.md'), readme);
}

async function createValidGitignore(serverPath: string): Promise<void> {
  const gitignore = `node_modules/
dist/
*.log
.env
.DS_Store`;

  await fs.writeFile(join(serverPath, '.gitignore'), gitignore);
}