# @tanstack/react-query MCP Server

An MCP server providing AI assistants with comprehensive knowledge about the @tanstack/react-query package.

## Package Information

- **Name:** @tanstack/react-query
- **Version:** 5.0.0
- **Description:** Hooks for managing, caching and syncing asynchronous and remote data in React
- **Repository:** git+https://github.com/TanStack/query.git
- **License:** MIT

## Available Tools



## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the server:
   ```bash
   npm run build
   ```

3. Run the server:
   ```bash
   npm start
   ```

## Usage with Kiro

Add this server to your Kiro MCP configuration:

```json
{
  "mcpServers": {
    "@tanstack/react-query": {
      "command": "node",
      "args": ["path/to/-tanstack-react-query-mcp-server/dist/index.js"]
    }
  }
}
```

## Generated Features

- **Package Information**: Basic package metadata and information ✅
- **Usage Examples**: Code examples and usage patterns ❌
- **API Reference**: TypeScript API documentation ❌
- **Documentation Search**: Search through package documentation ❌
- **Configuration Guide**: Setup and configuration instructions ❌
- **TypeScript Support**: Full TypeScript definitions and types ✅
- **Multiple Languages**: Examples in multiple programming languages ❌
- **Installation Instructions**: Package manager installation commands ✅

## Analysis Quality

- **Overall Completeness:** 30%
- **README Quality:** 80%
- **Type Definitions:** 40%
- **Examples Available:** 0%
- **API Reference:** 0%

---

*Generated automatically by NPM MCP Generator*
*Generated on: 2025-08-11T09:10:27.709Z*