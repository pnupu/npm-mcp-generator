/**
 * Tests for ReadmeAnalyzer
 */

import { ReadmeAnalyzer } from '../../src/analyzers/ReadmeAnalyzer';

describe('ReadmeAnalyzer', () => {
  let analyzer: ReadmeAnalyzer;

  beforeEach(() => {
    analyzer = new ReadmeAnalyzer();
  });

  describe('analyze', () => {
    it('should handle null README content', async () => {
      const result = await analyzer.analyze(null);

      expect(result.success).toBe(true);
      expect(result.data?.sections).toHaveLength(0);
      expect(result.data?.codeBlocks).toHaveLength(0);
      expect(result.warnings).toContain('No README content provided');
    });

    it('should extract sections from markdown', async () => {
      const readme = `
# Main Title

This is the main section.

## Installation

Install the package:

\`\`\`bash
npm install test-package
\`\`\`

## Usage

Use it like this:

\`\`\`javascript
const pkg = require('test-package');
pkg.doSomething();
\`\`\`
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.sections).toHaveLength(1); // Main Title with Installation, Usage as subsections
      expect(result.data?.sections[0].title).toBe('Main Title');
      expect(result.data?.sections[0].subsections).toHaveLength(2);
      expect(result.data?.sections[0].subsections[0].title).toBe('Installation');
      expect(result.data?.sections[0].subsections[1].title).toBe('Usage');
    });

    it('should extract code blocks', async () => {
      const readme = `
# Test Package

## Installation

\`\`\`bash
npm install test-package
\`\`\`

## Usage

\`\`\`javascript
const test = require('test-package');
console.log(test.version);
\`\`\`

\`\`\`json
{
  "name": "config",
  "value": true
}
\`\`\`
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.codeBlocks).toHaveLength(3);
      expect(result.data?.codeBlocks[0].language).toBe('bash');
      expect(result.data?.codeBlocks[1].language).toBe('javascript');
      expect(result.data?.codeBlocks[2].language).toBe('json');
    });

    it('should extract installation instructions', async () => {
      const readme = `
# Package

## Installation

\`\`\`bash
npm install my-package
yarn add my-package
pnpm add my-package
bun add my-package
\`\`\`
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.installationInstructions).toHaveLength(4);
      expect(result.data?.installationInstructions[0].packageManager).toBe('npm');
      expect(result.data?.installationInstructions[1].packageManager).toBe('yarn');
      expect(result.data?.installationInstructions[2].packageManager).toBe('pnpm');
      expect(result.data?.installationInstructions[3].packageManager).toBe('bun');
    });

    it('should extract usage examples', async () => {
      const readme = `
# Package

## Usage

\`\`\`javascript
import { myFunction } from 'my-package';

const result = myFunction('hello');
console.log(result);
\`\`\`

\`\`\`typescript
import { MyClass } from 'my-package';

const instance = new MyClass();
instance.doSomething();
\`\`\`
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.usageExamples).toHaveLength(2);
      expect(result.data?.usageExamples[0].language).toBe('javascript');
      expect(result.data?.usageExamples[0].imports).toContain('my-package');
      expect(result.data?.usageExamples[1].language).toBe('typescript');
      expect(result.data?.usageExamples[1].imports).toContain('my-package');
    });

    it('should handle malformed markdown gracefully', async () => {
      const readme = `
# Broken Markdown

This has some [broken link](
And unclosed code block:
\`\`\`javascript
const broken = 
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.sections).toHaveLength(1);
      expect(result.data?.sections[0].title).toBe('Broken Markdown');
    });

    it('should categorize examples correctly', async () => {
      const readme = `
# Package

## Basic Usage

\`\`\`javascript
import pkg from 'my-package';
pkg.simple();
\`\`\`

## Advanced Usage

\`\`\`javascript
import pkg from 'my-package';
async function advanced() {
  const result = await pkg.complexOperation();
  return result;
}
\`\`\`

## Configuration

\`\`\`javascript
const config = {
  option1: true,
  option2: 'value'
};
pkg.configure(config);
\`\`\`
      `;

      const result = await analyzer.analyze(readme);

      expect(result.success).toBe(true);
      expect(result.data?.usageExamples).toHaveLength(3);
      
      const categories = result.data?.usageExamples?.map(ex => ex.category) || [];
      expect(categories).toContain('basic');
      expect(categories).toContain('advanced');
      // The third example should be basic since it doesn't have async/await and context doesn't include 'config'
      expect(categories.filter(c => c === 'basic')).toHaveLength(2);
    });
  });
});