# TypeScript Implementation Plan

## Project Structure

```
npm-mcp-generator/
├── src/
│   ├── analyzers/
│   │   ├── PackageAnalyzer.ts
│   │   ├── ReadmeAnalyzer.ts
│   │   ├── TypeDefinitionAnalyzer.ts
│   │   └── ExampleAnalyzer.ts
│   ├── generators/
│   │   ├── MCPServerGenerator.ts
│   │   └── ToolGenerator.ts
│   ├── fetchers/
│   │   ├── NPMRegistryFetcher.ts
│   │   ├── GitHubFetcher.ts
│   │   └── UnpkgFetcher.ts
│   ├── types/
│   │   ├── PackageInfo.ts
│   │   ├── MCPTypes.ts
│   │   └── AnalysisResult.ts
│   ├── templates/
│   │   └── mcp-server-template.ts
│   └── main.ts
├── generated-servers/
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

## Core Types

### PackageInfo.ts
```typescript
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface PackageAnalysis {
  packageInfo: PackageInfo;
  readme: ReadmeAnalysis;
  typeDefinitions: TypeDefinitionAnalysis;
  examples: ExampleAnalysis[];
  apiReference: APIReference;
}

export interface ReadmeAnalysis {
  sections: ReadmeSection[];
  codeBlocks: CodeBlock[];
  installationInstructions: string[];
  usageExamples: UsageExample[];
}

export interface TypeDefinitionAnalysis {
  exports: ExportInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export interface UsageExample {
  title: string;
  description: string;
  code: string;
  language: string;
  imports: string[];
}
```

### MCPTypes.ts
```typescript
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GeneratedMCPServer {
  packageName: string;
  version: string;
  tools: MCPTool[];
  serverCode: string;
  packageJson: any;
}
```

## Core Implementation Classes

### 1. PackageAnalyzer.ts
```typescript
import { PackageInfo, PackageAnalysis } from '../types/PackageInfo';
import { NPMRegistryFetcher } from '../fetchers/NPMRegistryFetcher';
import { GitHubFetcher } from '../fetchers/GitHubFetcher';
import { ReadmeAnalyzer } from './ReadmeAnalyzer';
import { TypeDefinitionAnalyzer } from './TypeDefinitionAnalyzer';

export class PackageAnalyzer {
  constructor(
    private npmFetcher: NPMRegistryFetcher,
    private githubFetcher: GitHubFetcher,
    private readmeAnalyzer: ReadmeAnalyzer,
    private typeAnalyzer: TypeDefinitionAnalyzer
  ) {}

  async analyzePackage(packageName: string, version?: string): Promise<PackageAnalysis> {
    // 1. Fetch package info from NPM registry
    const packageInfo = await this.npmFetcher.getPackageInfo(packageName, version);
    
    // 2. Fetch README from GitHub
    const readme = await this.githubFetcher.getReadme(packageInfo.repository?.url);
    const readmeAnalysis = await this.readmeAnalyzer.analyze(readme);
    
    // 3. Fetch and analyze TypeScript definitions
    const typeDefinitions = await this.npmFetcher.getTypeDefinitions(packageName, version);
    const typeAnalysis = await this.typeAnalyzer.analyze(typeDefinitions);
    
    // 4. Fetch examples
    const examples = await this.githubFetcher.getExamples(packageInfo.repository?.url);
    
    return {
      packageInfo,
      readme: readmeAnalysis,
      typeDefinitions: typeAnalysis,
      examples,
      apiReference: this.buildAPIReference(typeAnalysis, readmeAnalysis)
    };
  }

  private buildAPIReference(typeAnalysis: TypeDefinitionAnalysis, readmeAnalysis: ReadmeAnalysis) {
    // Combine type info with README examples to build comprehensive API reference
    // This is where the magic happens - connecting types with usage examples
  }
}
```

### 2. NPMRegistryFetcher.ts
```typescript
export class NPMRegistryFetcher {
  private readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org';
  private readonly UNPKG_URL = 'https://unpkg.com';

  async getPackageInfo(packageName: string, version?: string): Promise<PackageInfo> {
    const url = `${this.NPM_REGISTRY_URL}/${packageName}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const versionToUse = version || data['dist-tags'].latest;
    const versionData = data.versions[versionToUse];
    
    return {
      name: versionData.name,
      version: versionToUse,
      description: versionData.description,
      repository: versionData.repository,
      homepage: versionData.homepage,
      keywords: versionData.keywords,
      dependencies: versionData.dependencies,
      peerDependencies: versionData.peerDependencies
    };
  }

  async getTypeDefinitions(packageName: string, version: string): Promise<string | null> {
    // Try to get .d.ts files from the package
    const typesUrl = `${this.UNPKG_URL}/${packageName}@${version}/index.d.ts`;
    
    try {
      const response = await fetch(typesUrl);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`No TypeScript definitions found for ${packageName}`);
    }
    
    // Try @types package
    const typesPackageUrl = `${this.UNPKG_URL}/@types/${packageName.replace('@', '').replace('/', '__')}/index.d.ts`;
    try {
      const response = await fetch(typesPackageUrl);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`No @types package found for ${packageName}`);
    }
    
    return null;
  }
}
```

### 3. MCPServerGenerator.ts
```typescript
import { PackageAnalysis } from '../types/PackageInfo';
import { GeneratedMCPServer, MCPTool } from '../types/MCPTypes';
import { ToolGenerator } from './ToolGenerator';

export class MCPServerGenerator {
  constructor(private toolGenerator: ToolGenerator) {}

  async generateServer(analysis: PackageAnalysis): Promise<GeneratedMCPServer> {
    // Generate MCP tools based on package analysis
    const tools = await this.toolGenerator.generateTools(analysis);
    
    // Generate the server code
    const serverCode = this.generateServerCode(analysis.packageInfo.name, tools);
    
    // Generate package.json for the MCP server
    const packageJson = this.generatePackageJson(analysis.packageInfo.name);
    
    return {
      packageName: analysis.packageInfo.name,
      version: analysis.packageInfo.version,
      tools,
      serverCode,
      packageJson
    };
  }

  private generateServerCode(packageName: string, tools: MCPTool[]): string {
    return `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class ${this.toPascalCase(packageName)}MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '${packageName}-mcp-server',
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
        tools: ${JSON.stringify(tools, null, 2)}
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        ${tools.map(tool => `
        case '${tool.name}':
          return await this.${this.toCamelCase(tool.name)}(args);
        `).join('')}
        default:
          throw new Error(\`Unknown tool: \${name}\`);
      }
    });
  }

  ${tools.map(tool => `
  private async ${this.toCamelCase(tool.name)}(args: any) {
    // Implementation for ${tool.name}
    // This would contain the actual logic for each tool
    return {
      content: [
        {
          type: "text",
          text: "Tool implementation here"
        }
      ]
    };
  }
  `).join('')}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('${packageName} MCP server running on stdio');
  }
}

const server = new ${this.toPascalCase(packageName)}MCPServer();
server.run().catch(console.error);
`;
  }

  private generatePackageJson(packageName: string) {
    return {
      name: `${packageName}-mcp-server`,
      version: '1.0.0',
      type: 'module',
      bin: {
        [`${packageName}-mcp-server`]: './dist/index.js'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.4.0',
        [packageName]: 'latest'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0'
      }
    };
  }

  private toPascalCase(str: string): string {
    return str.replace(/[@\/\-_]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .replace(/\s/g, '');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}
```

## Main Entry Point

### main.ts
```typescript
import { PackageAnalyzer } from './analyzers/PackageAnalyzer';
import { MCPServerGenerator } from './generators/MCPServerGenerator';
import { NPMRegistryFetcher } from './fetchers/NPMRegistryFetcher';
import { GitHubFetcher } from './fetchers/GitHubFetcher';
// ... other imports

async function generateMCPServer(packageName: string, version?: string) {
  const analyzer = new PackageAnalyzer(
    new NPMRegistryFetcher(),
    new GitHubFetcher(),
    new ReadmeAnalyzer(),
    new TypeDefinitionAnalyzer()
  );

  const generator = new MCPServerGenerator(new ToolGenerator());

  console.log(`Analyzing package: ${packageName}`);
  const analysis = await analyzer.analyzePackage(packageName, version);

  console.log(`Generating MCP server...`);
  const mcpServer = await generator.generateServer(analysis);

  console.log(`Generated MCP server for ${packageName}`);
  return mcpServer;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const packageName = process.argv[2];
  if (!packageName) {
    console.error('Usage: npm run generate <package-name> [version]');
    process.exit(1);
  }

  generateMCPServer(packageName, process.argv[3])
    .then(server => {
      console.log('MCP Server generated successfully!');
      // Write files to disk
    })
    .catch(console.error);
}
```

## Key Technical Decisions

### 1. TypeScript-First
- Full type safety throughout
- Leverage existing TypeScript definitions from packages
- Generate type-safe MCP servers

### 2. Modular Architecture
- Separate concerns (fetching, analyzing, generating)
- Easy to test individual components
- Extensible for new package types

### 3. Multiple Data Sources
- NPM Registry API for package metadata
- GitHub API for README and examples
- unpkg.com for direct file access
- TypeScript definitions for exact API structure

### 4. Template-Based Generation
- Consistent MCP server structure
- Easy to maintain and update
- Customizable per package type

This implementation gives us a solid foundation to build and test with the example packages we identified!