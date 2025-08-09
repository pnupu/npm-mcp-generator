/**
 * Types for MCP server generation and tool definitions
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: any;
  examples?: any[];
}

export interface GeneratedMCPServer {
  packageName: string;
  version: string;
  tools: MCPTool[];
  serverCode: string;
  packageJson: PackageJsonConfig;
  documentation: string;
  metadata: MCPServerMetadata;
}

export interface PackageJsonConfig {
  name: string;
  version: string;
  type: string;
  bin: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface MCPServerMetadata {
  generatedAt: Date;
  sourcePackage: string;
  sourceVersion: string;
  generatorVersion: string;
  toolCount: number;
  features: MCPServerFeature[];
}

export interface MCPServerFeature {
  name: string;
  description: string;
  enabled: boolean;
}

export interface ToolHandler {
  (args: any): Promise<ToolResponse>;
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolContent {
  type: 'text' | 'resource' | 'image';
  text?: string;
  resource?: ResourceContent;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
}

// MCP Tool-specific types
export interface PackageInfoToolArgs {
  includeMetadata?: boolean;
  includeDependencies?: boolean;
}

export interface UsageExamplesToolArgs {
  category?: 'basic' | 'advanced' | 'configuration' | 'integration';
  language?: string;
  limit?: number;
}

export interface APIReferenceToolArgs {
  type?: 'functions' | 'classes' | 'interfaces' | 'types' | 'all';
  search?: string;
  includeExamples?: boolean;
}

export interface SearchDocsToolArgs {
  query: string;
  type?: 'readme' | 'examples' | 'types' | 'all';
  limit?: number;
}

export interface ConfigurationGuideToolArgs {
  format?: 'markdown' | 'json' | 'typescript';
  includeExamples?: boolean;
}

// Template types for server generation
export interface ServerTemplate {
  name: string;
  description: string;
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface GenerationOptions {
  outputDirectory?: string;
  serverName?: string;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  templateOverrides?: Record<string, string>;
}