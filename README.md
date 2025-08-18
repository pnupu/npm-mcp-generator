# NPM MCP Generator

> Automatically generate Model Context Protocol (MCP) servers for any NPM package, transforming AI assistance with accurate, up-to-date context.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

##  Problem Statement

AI assistants struggle with NPM packages because they:

- Provide outdated API suggestions (especially for packages with breaking changes)
- Give generic examples that don't match specific package patterns
- Lack context for new or niche packages
- Cannot access current documentation and TypeScript definitions

**Example**: @tanstack/react-query v5 has breaking changes from v4, but AI assistants still suggest the old API patterns.

##  Solution

The NPM MCP Generator automatically:

1. **Analyzes any NPM package** in under 60 seconds
2. **Generates MCP servers** with 5 specialized tools per package
3. **Provides AI assistants** with accurate, current context through the Model Context Protocol
4. **Handles missing data gracefully** through intelligent degradation strategies

##  Key Features

-  **Multi-source Analysis**: Fetches data from NPM Registry, GitHub, and unpkg.com
-  **5 MCP Tools per Package**: Comprehensive context for AI assistants
-  **Fast Generation**: Sub-60-second MCP server creation
-  **Graceful Degradation**: Works even with incomplete package data
-  **Robust Error Handling**: 10 error types handled with retry logic
-  **TypeScript Support**: Full type safety and definition analysis
-  **Real-world Tested**: Validated with popular packages like React Query, Drizzle ORM

##  Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Install from Source

```bash
git clone https://github.com/pnupu/npm-mcp-generator.git
cd npm-mcp-generator
npm install
npm run build
```

### Environment Setup

1. **Copy the environment template:**
```bash
cp .env.example .env
```

2. **Configure your API keys in `.env`:**
```bash
# OpenAI API Key (required for vector embeddings)
OPENAI_API_KEY=sk-your-openai-api-key-here

# GitHub API Token (optional, for better rate limits)
GITHUB_TOKEN=ghp_your-github-token-here
```

3. **Get your API keys:**
   - **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **GitHub Token**: Get from [GitHub Settings](https://github.com/settings/tokens) (optional, but recommended for better rate limits)

```bash
npm install
npm link
```

### Direct Usage (No Installation)

```bash
# Clone and run directly
git clone https://github.com/pnupu/npm-mcp-generator.git
cd npm-mcp-generator
npm install
npx tsx src/main.ts generate <package-name>
```

##  Quick Start

### Generate an MCP Server

```bash
# Basic generation (uses environment variables if available)
npm-mcp-generator generate lodash

# Generate for a specific version
npm-mcp-generator generate @tanstack/react-query --pkg-version 5.0.0

# With enhanced vector search (requires OpenAI API key)
npm-mcp-generator generate lodash --openai-key sk-your-key-here

# Using environment variables (recommended)
export OPENAI_API_KEY=sk-your-key-here
export GITHUB_TOKEN=ghp-your-token-here
npm-mcp-generator generate lodash --verbose

# Specify output directory
npm-mcp-generator generate drizzle-orm --output ./my-servers

# Use a specific docs URL (e.g., versioned docs)
npm-mcp-generator generate lodash --docs-url https://lodash.com/docs/4.17.21

# Use a local Markdown file as docs input
npm-mcp-generator generate lodash --docs-file ./docs/lodash-notes.md
```

### Environment Variables

| Environment Variable | CLI Option | Purpose |
|----------------------|------------|---------|
| `OPENAI_API_KEY`     | `--openai-key` | Enable vector embeddings for enhanced search |
| `GITHUB_TOKEN`       | `--github-token` | Better rate limits (5000/hr vs 60/hr) |
| `DEFAULT_OUTPUT_DIR` | `--output` | Default output directory |


### Use with Kiro

After generating an MCP server, add it to your Kiro configuration:

```json
{
  "mcpServers": {
    "lodash": {
      "command": "node",
      "args": ["./generated-servers/lodash-mcp-server/dist/index.js"]
    }
  }
}
```

### Use in Cursor

Add the generated server to Cursor via a workspace config file:

1. Build the generated server so `dist/index.js` exists.

```bash
cd ./generated-servers/<your-server>
npm install
npm run build
```

2. In your project root, create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "node",
      "args": [
        "./generated-servers/<your-server>/dist/index.js"
      ]
    }
  }
}
```

3. In Cursor: Settings → MCP → enable “Load config from workspace”, then Reload Window.

**Note:** You may need to start a new chat in Cursor for the MCP tools to appear.

4. Open the MCP panel, select your server, and try tools like `search_package_docs` or `semantic_search`.

##  Usage Examples

### Basic Usage

```bash
# Analyze and generate MCP server for a package
npm-mcp-generator generate axios

# Output:
#  MCP server generated successfully!
#  Server Details:
#    Name: axios-mcp-server
#    Tools: 5
#    Location: ./generated-servers/axios-mcp-server
```

### Advanced Options

```bash
# Commonly used flags
npm-mcp-generator generate @prisma/client \
  --pkg-version 5.0.0 \
  --output ./custom-output \
  --docs-url https://www.prisma.io/docs \
  --github-token your-token \
  --verbose
```

##  Generated MCP Tools

Each generated MCP server includes 5 specialized tools:

### 1. `get_package_info`

Get comprehensive package information including metadata, dependencies, and repository details.

```typescript
// Example usage in AI context
const info = await tools.get_package_info({
  includeMetadata: true,
});
```

### 2. `get_usage_examples`

Retrieve code examples and usage patterns with proper imports and TypeScript types.

```typescript
const examples = await tools.get_usage_examples({
  category: "basic",
  format: "typescript",
});
```

### 3. `get_api_reference`

Access detailed API documentation including functions, classes, interfaces, and types.

```typescript
const api = await tools.get_api_reference({
  includeExamples: true,
  format: "markdown",
});
```

### 4. `search_package_docs`

Search through package documentation, examples, and API references.

```typescript
const results = await tools.search_package_docs({
  query: "authentication",
  includeExamples: true,
});
```

### 5. `get_configuration_guide`

Get setup instructions, configuration options, and integration guides.

```typescript
const config = await tools.get_configuration_guide({
  format: "markdown",
  includeExamples: true,
});
```

### CLI Options

```bash
npm-mcp-generator generate <package-name> [options]

Options:
  --pkg-version <version>     Specific package version
  -o, --output <directory>    Output directory (default: ./generated-servers)
  --no-cache                  Disable caching
  --no-examples              Skip example analysis
  --no-types                 Skip TypeScript definitions
  --docs-url <url>            Override documentation URL used for crawling/embeddings
  --docs-file <path>          Use a local Markdown file as documentation
  --github-token <token>     GitHub API token for better rate limits
  --verbose                  Enable verbose logging
```

### Options Matrix

| Option | Env var | Default | Applies to | Description |
|--------|---------|---------|------------|-------------|
| `--pkg-version <version>` | n/a | latest | generate | Analyze a specific package version (affects NPM metadata and unpkg type definitions) |
| `--output <dir>` | `DEFAULT_OUTPUT_DIR` | `./generated-servers` | generate | Output directory for generated servers |
| `--docs-url <url>` | n/a | discovered | generate | Override documentation URL used for crawling/embeddings |
| `--docs-file <path>` | n/a | none | generate | Use a local Markdown file as the docs source |
| `--openai-key <key>` | `OPENAI_API_KEY` | from env | generate | Enable vector embeddings generation |
| `--no-embeddings` | n/a | enabled | generate | Disable embeddings (smaller server, text search only) |
| `--no-cache` | n/a | cache on | generate | Disable analysis caches |
| `--no-examples` | n/a | include | generate | Skip example analysis |
| `--no-types` | n/a | include | generate | Skip TypeScript definition analysis |
| `--github-token <token>` | `GITHUB_TOKEN` | from env | generate | Increases GitHub API rate limits |
| `--verbose` | n/a | off | generate | Verbose logging |

Server generation (embeddings) env tuning:

| Env var | Default | Effect |
|---------|---------|--------|
| `EMBEDDINGS_MAX_CHUNKS` | `400` | Cap number of embedded chunks (top-priority first) |
| `EMBEDDINGS_ROUND_DECIMALS` | `3` | Round embedding values to N decimals (size vs precision) |
| `EMBEDDINGS_MAX_MARKDOWN_CHARS` | `1200` | Truncate chunk markdown for smaller bundles |

### Docs version behavior

- Package version (`--pkg-version`) controls NPM metadata and unpkg TypeScript definitions (version-pinned).
- README and documentation site are not automatically version-pinned:
  - README is fetched from the repo’s default branch.
  - The docs site is discovered (or overridden) and typically points to the latest docs.
- To use versioned docs, pass a version-specific `--docs-url` (if the project hosts versioned documentation).

##  Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- tests/analyzers
npm test -- tests/integration

# Run with coverage
npm run test:coverage
```

### E2E Test for Generated Servers

```bash
# Generate lodash server
npm run generate -- generate lodash --output ./generated-servers

# Run automated stdio tests against the server
tsx scripts/test-lodash-server.ts
```

### TODO

- Reduce embeddings bundle size in generated servers
  - Consider: vector quantization (e.g., 8-bit) and/or externalizing embeddings with lazy load

- Enhance semantic search
  - Optional: runtime query-embedding path (flag/env) for higher relevance when an API key is available
  - Add a control to tune hybrid weights (vector vs text) per server/template

##  Development

### Setup Development Environment

```bash
git clone https://github.com/pnupu/npm-mcp-generator.git
cd npm-mcp-generator
npm install
npm run build
```

### Development Scripts

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Project Structure

```
npm-mcp-generator/
├── src/
│   ├── analyzers/          # Package analysis components
│   ├── core/              # Core orchestration and error handling
│   ├── fetchers/          # Data fetching from various sources
│   ├── generators/        # MCP server and tool generation
│   ├── templates/         # Server templates (experimental)
│   ├── types/            # TypeScript type definitions
│   └── validation/       # Generated server validation
├── tests/                # Test suites
├── demo/                 # Demonstration scripts
├── docs/                 # Additional documentation
└── .kiro/               # Kiro spec-driven development files
```

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

