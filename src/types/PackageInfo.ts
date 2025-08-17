/**
 * Core types for NPM package information and analysis results
 */

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  repository?: RepositoryInfo;
  homepage?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  maintainers?: string[];
  publishDate: string;
  license?: string;
}

export interface RepositoryInfo {
  type: string;
  url: string;
  directory?: string;
}

export interface PackageAnalysis {
  packageInfo: PackageInfo;
  readme: ReadmeAnalysis;
  typeDefinitions: TypeDefinitionAnalysis;
  examples: ExampleAnalysis[];
  apiReference: APIReference;
  comprehensiveDocumentation?: {
    chunks: any[];
    embeddedChunks?: any[];
    embeddingStats?: any;
  };
  metadata: AnalysisMetadata;
}

export interface ReadmeAnalysis {
  sections: ReadmeSection[];
  codeBlocks: CodeBlock[];
  installationInstructions: InstallationStep[];
  usageExamples: UsageExample[];
  configurationOptions: ConfigurationOption[];
}

export interface ReadmeSection {
  title: string;
  level: number;
  content: string;
  subsections: ReadmeSection[];
}

export interface CodeBlock {
  language: string;
  code: string;
  context?: string;
  isExample: boolean;
}

export interface InstallationStep {
  command: string;
  description: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

export interface UsageExample {
  title: string;
  description: string;
  code: string;
  language: string;
  imports: string[];
  category: 'basic' | 'advanced' | 'configuration' | 'integration';
}

export interface ConfigurationOption {
  name: string;
  type: string;
  description: string;
  defaultValue?: any;
  required: boolean;
  examples: string[];
}

export interface TypeDefinitionAnalysis {
  exports: ExportInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  types: TypeInfo[];
  enums: EnumInfo[];
  hasDefinitions: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum';
  isDefault: boolean;
  description?: string;
}

export interface InterfaceInfo {
  name: string;
  properties: PropertyInfo[];
  extends?: string[];
  description?: string;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  description?: string;
  isAsync: boolean;
  examples?: string[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  defaultValue?: string;
}

export interface ClassInfo {
  name: string;
  constructor?: FunctionInfo;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  description?: string;
}

export interface TypeInfo {
  name: string;
  definition: string;
  description?: string;
}

export interface EnumInfo {
  name: string;
  values: EnumValue[];
  description?: string;
}

export interface EnumValue {
  name: string;
  value: string | number;
  description?: string;
}

export interface ExampleAnalysis {
  filePath: string;
  content: string;
  language: string;
  patterns: CodePattern[];
  imports: string[];
  category: 'demo' | 'test' | 'documentation' | 'integration';
}

export interface CodePattern {
  type: 'initialization' | 'configuration' | 'usage' | 'error-handling';
  pattern: string;
  description: string;
  frequency: number;
}

export interface APIReference {
  functions: APIFunction[];
  classes: APIClass[];
  interfaces: APIInterface[];
  types: APIType[];
  constants: APIConstant[];
}

export interface APIFunction {
  name: string;
  signature: string;
  description: string;
  parameters: APIParameter[];
  returnType: string;
  examples: string[];
  category: string;
}

export interface APIParameter {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

export interface APIClass {
  name: string;
  description: string;
  constructor: APIFunction;
  methods: APIFunction[];
  properties: APIProperty[];
  examples: string[];
}

export interface APIProperty {
  name: string;
  type: string;
  description: string;
  readonly: boolean;
}

export interface APIInterface {
  name: string;
  description: string;
  properties: APIProperty[];
  methods: APIFunction[];
}

export interface APIType {
  name: string;
  definition: string;
  description: string;
  examples: string[];
}

export interface APIConstant {
  name: string;
  type: string;
  value: string;
  description: string;
}

export interface AnalysisMetadata {
  analyzedAt: Date;
  analysisVersion: string;
  sources: DataSource[];
  warnings: string[];
  errors: string[];
  completeness: CompletenessScore;
}

export interface DataSource {
  type: 'npm-registry' | 'github' | 'unpkg' | 'types' | 'documentation-site';
  url: string;
  lastModified?: Date;
  success: boolean;
  error?: string;
}

export interface CompletenessScore {
  overall: number; // 0-100
  readme: number;
  typeDefinitions: number;
  examples: number;
  apiReference: number;
}