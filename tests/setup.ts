/**
 * Test setup and configuration
 */

// Global test configuration
jest.setTimeout(30000); // 30 seconds for integration tests

// Mock console methods in tests to reduce noise
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Test utilities
export const mockPackageInfo = {
  name: '@test/package',
  version: '1.0.0',
  description: 'Test package for unit tests',
  publishDate: '2024-01-01T00:00:00.000Z',
  keywords: ['test', 'mock'],
  dependencies: {
    'react': '^18.0.0'
  }
};

export const mockReadmeContent = `# Test Package

A test package for unit testing.

## Installation

\`\`\`bash
npm install @test/package
\`\`\`

## Usage

\`\`\`typescript
import { testFunction } from '@test/package';

const result = testFunction('hello');
console.log(result);
\`\`\`

## API

### testFunction(input: string): string

Returns the input string with "test" appended.
`;

export const mockTypeDefinitions = `
export declare function testFunction(input: string): string;

export interface TestInterface {
  name: string;
  value: number;
}

export class TestClass {
  constructor(options: TestInterface);
  getName(): string;
  getValue(): number;
}
`;

// Helper functions for tests
export function createMockFetch(responses: Record<string, any>) {
  return jest.fn((url: string) => {
    const response = responses[url];
    if (!response) {
      return Promise.reject(new Error(`No mock response for ${url}`));
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(typeof response === 'string' ? response : JSON.stringify(response)),
    });
  });
}

export function expectAnalysisResult<T>(result: any): jest.Matchers<T> {
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('warnings');
  expect(result).toHaveProperty('metadata');
  return expect(result);
}