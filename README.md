# NPM MCP Generator

Automatically generate Model Context Protocol (MCP) servers from NPM package documentation to enhance AI code assistance.

## 🎯 Problem Solved

AI assistants often lack knowledge of new, niche, or recently updated NPM packages, leading to generic or outdated code suggestions. This tool analyzes NPM packages and generates MCP servers that provide AI assistants with deep, package-specific context.

## 🚀 Features

- **Automatic Analysis**: Fetches package metadata, README, TypeScript definitions, and examples
- **Smart Generation**: Creates MCP servers with tools for package info, usage examples, and API reference
- **Version Awareness**: Handles breaking changes and version-specific patterns
- **TypeScript First**: Full type safety and modern development practices

## 📦 Installation

```bash
npm install -g npm-mcp-generator
```

## 🔧 Usage

### Generate MCP Server

```bash
# Generate for latest version
npm-mcp-generator generate @tanstack/react-query

# Generate for specific version
npm-mcp-generator generate @tanstack/react-query --version 5.0.0

# Custom output directory
npm-mcp-generator generate drizzle-orm --output ./my-servers
```

### List Generated Servers

```bash
npm-mcp-generator list
```

### Validate Server

```bash
npm-mcp-generator validate ./generated-servers/react-query-mcp-server
```

## 🏗️ Development Status

This project is currently under development for the Kiro Hackathon. Current status:

- ✅ **Task 1**: Project structure and core interfaces
- ⏳ **Task 2**: Data fetching layer (in progress)
- ⏳ **Task 3**: Analysis components
- ⏳ **Task 4**: MCP server generation
- ⏳ **Task 5**: CLI and integration
- ⏳ **Task 6**: Testing and validation

## 🧪 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev generate @tanstack/react-query

# Run tests
npm test

# Build for production
npm run build
```

## 📋 Target Packages

The generator is optimized for:

- **New packages** (< 6 months old) not in AI training data
- **Recently updated packages** with breaking changes
- **Niche/specialized packages** with domain-specific patterns
- **Enterprise/internal packages** with zero AI knowledge

## 🎥 Demo

A 3-minute demonstration video will be available showing:
- Complete workflow from package analysis to improved AI suggestions
- Before/after comparison with @tanstack/react-query v5
- How spec-driven development with Kiro improved the development process

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This project was developed using Kiro's spec-driven development approach. See [kiro-usage-log.md](kiro-usage-log.md) for details on how Kiro assisted throughout development.

---

**Built for the Kiro Hackathon 2024** 🏆