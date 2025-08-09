/**
 * Tests for PackageInfo types and interfaces
 */

import { PackageInfo, ReadmeAnalysis, TypeDefinitionAnalysis } from '../../src/types/PackageInfo';

describe('PackageInfo Types', () => {
  describe('PackageInfo interface', () => {
    it('should accept valid package info', () => {
      const packageInfo: PackageInfo = {
        name: '@test/package',
        version: '1.0.0',
        description: 'Test package',
        publishDate: '2024-01-01T00:00:00.000Z',
        repository: {
          type: 'git',
          url: 'https://github.com/test/package.git'
        },
        keywords: ['test'],
        dependencies: {
          'react': '^18.0.0'
        }
      };

      expect(packageInfo.name).toBe('@test/package');
      expect(packageInfo.version).toBe('1.0.0');
      expect(packageInfo.repository?.type).toBe('git');
    });

    it('should work with minimal required fields', () => {
      const minimalPackage: PackageInfo = {
        name: 'simple-package',
        version: '1.0.0',
        description: 'Simple test package',
        publishDate: '2024-01-01T00:00:00.000Z'
      };

      expect(minimalPackage.name).toBe('simple-package');
      expect(minimalPackage.repository).toBeUndefined();
      expect(minimalPackage.keywords).toBeUndefined();
    });
  });

  describe('ReadmeAnalysis interface', () => {
    it('should structure readme analysis correctly', () => {
      const readmeAnalysis: ReadmeAnalysis = {
        sections: [
          {
            title: 'Installation',
            level: 2,
            content: 'npm install package',
            subsections: []
          }
        ],
        codeBlocks: [
          {
            language: 'bash',
            code: 'npm install package',
            isExample: false
          }
        ],
        installationInstructions: [
          {
            command: 'npm install package',
            description: 'Install via npm',
            packageManager: 'npm'
          }
        ],
        usageExamples: [
          {
            title: 'Basic Usage',
            description: 'Simple example',
            code: 'import pkg from "package";',
            language: 'typescript',
            imports: ['package'],
            category: 'basic'
          }
        ],
        configurationOptions: []
      };

      expect(readmeAnalysis.sections).toHaveLength(1);
      expect(readmeAnalysis.usageExamples[0].category).toBe('basic');
      expect(readmeAnalysis.installationInstructions[0].packageManager).toBe('npm');
    });
  });

  describe('TypeDefinitionAnalysis interface', () => {
    it('should structure type analysis correctly', () => {
      const typeAnalysis: TypeDefinitionAnalysis = {
        exports: [
          {
            name: 'testFunction',
            type: 'function',
            isDefault: false
          }
        ],
        interfaces: [
          {
            name: 'TestInterface',
            properties: [
              {
                name: 'value',
                type: 'string',
                optional: false
              }
            ]
          }
        ],
        functions: [
          {
            name: 'testFunction',
            parameters: [
              {
                name: 'input',
                type: 'string',
                optional: false
              }
            ],
            returnType: 'string',
            isAsync: false
          }
        ],
        classes: [],
        types: [],
        enums: [],
        hasDefinitions: true
      };

      expect(typeAnalysis.hasDefinitions).toBe(true);
      expect(typeAnalysis.functions).toHaveLength(1);
      expect(typeAnalysis.functions[0].name).toBe('testFunction');
      expect(typeAnalysis.interfaces[0].properties[0].optional).toBe(false);
    });
  });
});