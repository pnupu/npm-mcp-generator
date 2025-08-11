# Troubleshooting Guide

This guide helps you resolve common issues when using the NPM MCP Generator.

## Common Issues

### 1. Package Not Found

**Error**: `Package 'package-name' not found in NPM registry`

**Causes**:
- Package name is misspelled
- Package is private or scoped incorrectly
- Package has been unpublished
- NPM registry is temporarily unavailable

**Solutions**:
```bash
# Verify package exists on npmjs.com
npm view package-name

# Check for typos in package name
npm search similar-package-name

# Try with explicit registry
npm-mcp-generator generate package-name --registry https://registry.npmjs.org

# For scoped packages, ensure correct format
npm-mcp-generator generate @scope/package-name
```

### 2. Version Not Found

**Error**: `Version '1.0.0' not found for package 'package-name'`

**Causes**:
- Version doesn't exist
- Version format is incorrect
- Package uses different versioning scheme

**Solutions**:
```bash
# List available versions
npm view package-name versions --json

# Use latest version
npm-mcp-generator generate package-name

# Use version range
npm-mcp-generator generate package-name --version "^1.0.0"

# Check version format
npm view package-name version
```

### 3. GitHub Rate Limiting

**Error**: `GitHub API rate limit exceeded`

**Causes**:
- Too many requests without authentication
- Shared IP hitting rate limits
- GitHub API is temporarily unavailable

**Solutions**:
```bash
# Provide GitHub token
export GITHUB_TOKEN=your_token_here
npm-mcp-generator generate package-name

# Or use CLI option
npm-mcp-generator generate package-name --github-token your_token

# Wait and retry
sleep 60 && npm-mcp-generator generate package-name

# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

### 4. Network Timeouts

**Error**: `Network timeout after 30000ms`

**Causes**:
- Slow internet connection
- Firewall blocking requests
- Service temporarily unavailable

**Solutions**:
```bash
# Check internet connectivity
ping registry.npmjs.org
ping api.github.com

# Try with verbose logging
npm-mcp-generator generate package-name --verbose

# Check firewall settings
# Ensure ports 80, 443 are open for outbound connections

# Retry with exponential backoff (automatic)
# The tool will retry automatically with increasing delays
```

### 5. TypeScript Definition Issues

**Error**: `Failed to parse TypeScript definitions`

**Causes**:
- Malformed .d.ts files
- Complex TypeScript features not supported
- Missing type dependencies

**Solutions**:
```bash
# Skip TypeScript analysis
npm-mcp-generator generate package-name --no-types

# Check if @types package exists
npm view @types/package-name

# Verify TypeScript definitions manually
npx tsc --noEmit node_modules/package-name/index.d.ts

# Use fallback analysis
# The tool will automatically fall back to README analysis
```

### 6. Memory Issues

**Error**: `JavaScript heap out of memory`

**Causes**:
- Large package with extensive documentation
- Memory leak in analysis process
- Insufficient system memory

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm-mcp-generator generate package-name

# Skip examples to reduce memory usage
npm-mcp-generator generate package-name --no-examples

# Process packages individually instead of batch
# Split large batch operations into smaller chunks

# Monitor memory usage
node --inspect npm-mcp-generator generate package-name
```

### 7. Permission Errors

**Error**: `EACCES: permission denied`

**Causes**:
- Insufficient permissions for output directory
- NPM global installation issues
- File system restrictions

**Solutions**:
```bash
# Check output directory permissions
ls -la ./generated-servers

# Create directory with proper permissions
mkdir -p ./generated-servers
chmod 755 ./generated-servers

# Use different output directory
npm-mcp-generator generate package-name --output ~/mcp-servers

# Fix NPM permissions (if globally installed)
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### 8. Generated Server Issues

**Error**: Generated MCP server fails to start

**Causes**:
- Missing dependencies in generated package.json
- TypeScript compilation errors
- Invalid MCP tool definitions

**Solutions**:
```bash
# Navigate to generated server directory
cd generated-servers/package-name-mcp-server

# Install dependencies
npm install

# Check for TypeScript errors
npm run build

# Validate MCP server
npm run validate

# Test server manually
node dist/index.js

# Check server logs
npm run start 2>&1 | tee server.log
```

## Debugging

### Enable Verbose Logging

```bash
# Enable detailed logging
npm-mcp-generator generate package-name --verbose

# Set log level via environment
export LOG_LEVEL=debug
npm-mcp-generator generate package-name

# Save logs to file
npm-mcp-generator generate package-name --verbose 2>&1 | tee analysis.log
```

### Analyze Error Logs

```bash
# Check for specific error patterns
grep -i "error\|failed\|timeout" analysis.log

# Look for network issues
grep -i "network\|fetch\|connection" analysis.log

# Check for parsing issues
grep -i "parse\|syntax\|invalid" analysis.log
```

### Test Individual Components

```bash
# Test NPM registry access
curl -s https://registry.npmjs.org/lodash | jq '.name'

# Test GitHub API access
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/lodash/lodash

# Test unpkg access
curl -s https://unpkg.com/lodash@4.17.21/package.json
```

## Performance Issues

### Slow Analysis

**Symptoms**: Analysis takes longer than expected (>60 seconds)

**Causes**:
- Large package with extensive documentation
- Network latency
- Rate limiting delays

**Solutions**:
```bash
# Skip time-consuming analysis steps
npm-mcp-generator generate package-name --no-examples --no-types

# Use caching for repeated analyses
# Caching is enabled by default, but can be verified:
ls ~/.npm-mcp-generator/cache

# Provide GitHub token to avoid rate limiting
export GITHUB_TOKEN=your_token

# Use specific version to avoid resolution overhead
npm-mcp-generator generate package-name --version 1.0.0
```

### High Memory Usage

**Symptoms**: Process uses excessive memory (>500MB)

**Solutions**:
```bash
# Monitor memory usage
top -p $(pgrep -f npm-mcp-generator)

# Reduce memory footprint
npm-mcp-generator generate package-name --no-examples

# Process packages sequentially
for pkg in lodash axios moment; do
  npm-mcp-generator generate $pkg
done
```

## Cache Issues

### Clear Cache

```bash
# Clear all cached data
rm -rf ~/.npm-mcp-generator/cache

# Clear specific package cache
rm -rf ~/.npm-mcp-generator/cache/lodash

# Disable cache temporarily
npm-mcp-generator generate package-name --no-cache
```

### Cache Location

```bash
# Default cache locations by OS:
# macOS: ~/Library/Caches/npm-mcp-generator
# Linux: ~/.cache/npm-mcp-generator
# Windows: %LOCALAPPDATA%\npm-mcp-generator\Cache

# Custom cache directory
export CACHE_DIR=/path/to/custom/cache
npm-mcp-generator generate package-name
```

## Integration Issues

### Kiro MCP Configuration

**Issue**: Generated MCP server doesn't work with Kiro

**Solutions**:
```json
// Verify MCP configuration in Kiro
{
  "mcpServers": {
    "package-name": {
      "command": "node",
      "args": ["/absolute/path/to/generated-servers/package-name-mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

```bash
# Test MCP server manually
cd generated-servers/package-name-mcp-server
npm run build
node dist/index.js

# Check if server responds to MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

### Path Issues

**Issue**: Kiro can't find the generated MCP server

**Solutions**:
```bash
# Use absolute paths in Kiro configuration
pwd # Get current directory
# Use full path: /Users/username/project/generated-servers/...

# Verify file exists and is executable
ls -la generated-servers/package-name-mcp-server/dist/index.js
chmod +x generated-servers/package-name-mcp-server/dist/index.js

# Test Node.js can execute the file
node generated-servers/package-name-mcp-server/dist/index.js --help
```

## Getting Help

### Collect Debug Information

Before reporting issues, collect the following information:

```bash
# System information
node --version
npm --version
uname -a  # or systeminfo on Windows

# Tool version
npm-mcp-generator --version

# Generate debug report
npm-mcp-generator generate package-name --verbose 2>&1 | tee debug-report.log

# Include package information
npm view package-name version description repository
```

### Report Issues

When reporting issues, include:

1. **System Information**: OS, Node.js version, npm version
2. **Command Used**: Exact command that failed
3. **Error Message**: Complete error output
4. **Debug Logs**: Output with `--verbose` flag
5. **Package Information**: Package name, version, repository
6. **Expected Behavior**: What you expected to happen
7. **Actual Behavior**: What actually happened

### Community Support

- 🐛 **GitHub Issues**: [Report bugs and request features](https://github.com/your-username/npm-mcp-generator/issues)
- 💬 **Discussions**: [Ask questions and share ideas](https://github.com/your-username/npm-mcp-generator/discussions)
- 📧 **Email Support**: support@npm-mcp-generator.com
- 📖 **Documentation**: [Full documentation](https://npm-mcp-generator.com/docs)

## FAQ

### Q: Why is analysis slow for some packages?

**A**: Large packages with extensive documentation, many examples, or complex TypeScript definitions take longer to analyze. Use `--no-examples` or `--no-types` to speed up analysis.

### Q: Can I analyze private packages?

**A**: The tool can analyze private packages if you have access, but it requires proper authentication setup for private registries.

### Q: How do I update generated MCP servers?

**A**: Re-run the generation command for the package. The tool will overwrite the existing server with updated information.

### Q: Why do some packages have low completeness scores?

**A**: Completeness depends on available documentation, TypeScript definitions, and examples. The graceful degradation system will still generate functional MCP servers.

### Q: Can I customize the generated MCP servers?

**A**: Yes, you can modify the generated code or use custom templates. See the [API documentation](API.md) for extension points.

### Q: How do I handle packages with no TypeScript definitions?

**A**: The tool automatically falls back to README analysis and generates basic type information. You can also use `--no-types` to skip TypeScript analysis entirely.

---

If you can't find a solution to your problem in this guide, please [open an issue](https://github.com/your-username/npm-mcp-generator/issues) with detailed information about your problem.