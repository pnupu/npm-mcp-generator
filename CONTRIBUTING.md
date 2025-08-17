# Contributing to NPM MCP Generator

Thank you for your interest in contributing to the NPM MCP Generator! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

We welcome contributions in many forms:
- 🐛 Bug reports and fixes
- ✨ New features and enhancements
- 📖 Documentation improvements
- 🧪 Test coverage improvements
- 🎨 UI/UX improvements
- 🌐 Translations and internationalization

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git
- TypeScript knowledge (for code contributions)

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/pnupu/npm-mcp-generator.git
   cd npm-mcp-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development**
   ```bash
   npm run dev  # Watch mode for development
   ```

### Project Structure

```
npm-mcp-generator/
├── src/                    # Source code
│   ├── analyzers/         # Package analysis components
│   ├── core/             # Core orchestration and error handling
│   ├── fetchers/         # Data fetching from various sources
│   ├── generators/       # MCP server and tool generation
│   ├── templates/        # Server templates
│   ├── types/           # TypeScript type definitions
│   └── validation/      # Generated server validation
├── tests/               # Test suites
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test data and fixtures
├── docs/               # Documentation
├── demo/               # Demonstration scripts
├── scripts/            # Build and utility scripts
└── .kiro/             # Kiro spec-driven development files
```

## 📝 Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide explicit types for public APIs
- Use interfaces for object shapes
- Use type guards for runtime type checking
- Document complex types with JSDoc comments

```typescript
// Good: Explicit interface with documentation
/**
 * Configuration options for package analysis
 */
interface AnalysisOptions {
  /** Include example code analysis */
  includeExamples: boolean;
  /** Include TypeScript definition analysis */
  includeTypes: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
}

// Good: Type guard with proper error handling
function isPackageInfo(obj: unknown): obj is PackageInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'version' in obj
  );
}
```

### Error Handling

- Use the `ErrorHandler` class for consistent error handling
- Provide meaningful error messages with context
- Include suggestions for error resolution
- Use appropriate error types from `AnalysisErrorType`

```typescript
// Good: Comprehensive error handling
try {
  const result = await this.fetchPackageInfo(packageName);
  return result;
} catch (error) {
  return this.errorHandler.handleError(error, {
    operation: 'fetch-package-info',
    packageName,
    attempt: 1,
    maxAttempts: 3,
    startTime: new Date()
  });
}
```

### Testing Guidelines

- Write tests for all new functionality
- Use descriptive test names
- Include both positive and negative test cases
- Test error scenarios and edge cases
- Use fixtures for consistent test data

```typescript
// Good: Descriptive test with proper setup
describe('PackageAnalyzer', () => {
  let analyzer: PackageAnalyzer;
  
  beforeEach(() => {
    analyzer = new PackageAnalyzer({
      includeExamples: true,
      includeTypes: true
    });
  });

  it('should analyze package with complete documentation', async () => {
    const result = await analyzer.analyzePackage('lodash', '4.17.21');
    
    expect(result.success).toBe(true);
    expect(result.data?.packageInfo.name).toBe('lodash');
    expect(result.data?.readme.sections.length).toBeGreaterThan(0);
  });

  it('should handle non-existent package gracefully', async () => {
    const result = await analyzer.analyzePackage('non-existent-package');
    
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('INVALID_PACKAGE');
    expect(result.error?.suggestions).toContain('Verify the package name is correct');
  });
});
```

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write code following the style guidelines
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

We use conventional commits for clear commit messages:

```bash
# Feature commits
git commit -m "feat: add support for custom templates"

# Bug fix commits
git commit -m "fix: handle network timeouts in GitHub fetcher"

# Documentation commits
git commit -m "docs: add troubleshooting guide for rate limiting"

# Test commits
git commit -m "test: add integration tests for error scenarios"
```

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### 4. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
# Include description of changes and link to any related issues
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/analyzers

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete workflows
4. **Error Scenario Tests**: Test error handling and recovery

### Writing Tests

- Place tests in the `tests/` directory
- Mirror the source directory structure
- Use `.test.ts` suffix for test files
- Include both success and failure scenarios

```typescript
// Example test structure
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test normal operation
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

## 📖 Documentation

### Documentation Types

1. **API Documentation**: Document all public interfaces
2. **User Guides**: Help users accomplish tasks
3. **Developer Guides**: Help contributors understand the codebase
4. **Troubleshooting**: Help users resolve common issues

### Writing Documentation

- Use clear, concise language
- Include code examples
- Provide step-by-step instructions
- Update documentation with code changes

### JSDoc Comments

```typescript
/**
 * Analyzes an NPM package and extracts comprehensive information
 * 
 * @param packageName - The name of the NPM package to analyze
 * @param version - Optional specific version to analyze
 * @returns Promise resolving to analysis result with package information
 * 
 * @example
 * ```typescript
 * const analyzer = new PackageAnalyzer();
 * const result = await analyzer.analyzePackage('lodash', '4.17.21');
 * 
 * if (result.success) {
 *   console.log(`Found ${result.data.apiReference.functions.length} functions`);
 * }
 * ```
 */
async analyzePackage(
  packageName: string, 
  version?: string
): Promise<AnalysisResult<PackageAnalysis>> {
  // Implementation
}
```

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues to avoid duplicates
2. Try the latest version
3. Collect debug information
4. Create a minimal reproduction case

### Bug Report Template

```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Run command: `npm-mcp-generator generate package-name`
2. See error: ...

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.0.0]
- npm: [e.g., 8.0.0]
- Tool version: [e.g., 1.0.0]

## Debug Information
```bash
# Include output with --verbose flag
npm-mcp-generator generate package-name --verbose
```

## Additional Context
Any other context about the problem.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
## Feature Description
A clear description of the feature you'd like to see.

## Use Case
Describe the problem this feature would solve.

## Proposed Solution
Describe how you envision this feature working.

## Alternatives Considered
Other approaches you've considered.

## Additional Context
Any other context or screenshots about the feature request.
```

## 🔍 Code Review Process

### For Contributors

1. **Self-review**: Review your own code before submitting
2. **Test thoroughly**: Ensure all tests pass
3. **Update documentation**: Keep docs in sync with code changes
4. **Address feedback**: Respond to review comments promptly

### Review Criteria

- **Functionality**: Does the code work as intended?
- **Code Quality**: Is the code clean, readable, and maintainable?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security concerns?
- **Testing**: Is the code adequately tested?
- **Documentation**: Is the code properly documented?

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build and test distribution
5. Create release tag
6. Publish to npm
7. Create GitHub release

## 🎯 Areas for Contribution

### High Priority

- 🐛 Bug fixes for reported issues
- 📊 Performance optimizations
- 🧪 Test coverage improvements
- 📖 Documentation enhancements

### Medium Priority

- ✨ New analyzer types
- 🎨 Custom template system
- 🌐 Internationalization
- 📱 Web interface

### Low Priority

- 🔧 Developer tooling improvements
- 📈 Analytics and metrics
- 🎬 Video tutorials
- 🎨 Logo and branding

## 💬 Communication

### Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code review and collaboration
- **Email**: Direct contact for sensitive issues

### Guidelines

- Be respectful and constructive
- Provide context and examples
- Search existing discussions before posting
- Use appropriate channels for different types of communication

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes for significant contributions
- Special mentions in documentation

## ❓ Questions?

If you have questions about contributing:

1. Check the [documentation](docs/)
2. Search [existing discussions](https://github.com/pnupu/npm-mcp-generator/discussions)
3. Open a new discussion
4. Contact maintainers directly

Thank you for contributing to the NPM MCP Generator! 🎉