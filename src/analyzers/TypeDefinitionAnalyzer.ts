/**
 * TypeScript definition analyzer for extracting API structure from .d.ts files
 */

import { 
  TypeDefinitionAnalysis, 
  ExportInfo, 
  InterfaceInfo, 
  FunctionInfo, 
  ClassInfo, 
  TypeInfo, 
  EnumInfo,
  PropertyInfo,
  ParameterInfo,
  EnumValue
} from '../types/PackageInfo.js';
import { AnalysisResult } from '../types/AnalysisResult.js';

export class TypeDefinitionAnalyzer {
  /**
   * Analyze TypeScript definition content and extract API structure
   */
  async analyze(typeDefinitions: string | null): Promise<AnalysisResult<TypeDefinitionAnalysis>> {
    const startTime = Date.now();

    if (!typeDefinitions) {
      return {
        success: true,
        data: this.createEmptyAnalysis(),
        warnings: ['No TypeScript definitions provided'],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'type-definition-analyzer'
        }
      };
    }

    try {
      const warnings: string[] = [];

      // Clean and normalize the content
      const cleanContent = this.cleanTypeDefinitions(typeDefinitions);
      
      // Extract different types of declarations
      const exports = this.extractExports(cleanContent);
      const interfaces = this.extractInterfaces(cleanContent);
      const functions = this.extractFunctions(cleanContent);
      const classes = this.extractClasses(cleanContent);
      const types = this.extractTypes(cleanContent);
      const enums = this.extractEnums(cleanContent);

      if (exports.length === 0) {
        warnings.push('No exports found in TypeScript definitions');
      }

      const analysis: TypeDefinitionAnalysis = {
        exports,
        interfaces,
        functions,
        classes,
        types,
        enums,
        hasDefinitions: true
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: analysis,
        warnings,
        metadata: {
          processingTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'type-definition-analyzer'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PARSING_ERROR',
          message: `Failed to parse TypeScript definitions: ${error}`,
          recoverable: false,
          suggestions: ['Check TypeScript definition syntax', 'Verify file is valid .d.ts']
        },
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          version: '1.0.0',
          source: 'type-definition-analyzer'
        }
      };
    }
  }

  private cleanTypeDefinitions(content: string): string {
    // Remove comments
    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/;\s*}/g, '; }');
    
    return cleaned.trim();
  }

  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    // Export patterns
    const patterns = [
      // export declare function
      /export\s+declare\s+function\s+(\w+)/g,
      // export function
      /export\s+function\s+(\w+)/g,
      // export declare class
      /export\s+declare\s+class\s+(\w+)/g,
      // export class
      /export\s+class\s+(\w+)/g,
      // export interface
      /export\s+interface\s+(\w+)/g,
      // export type
      /export\s+type\s+(\w+)/g,
      // export enum
      /export\s+enum\s+(\w+)/g,
      // export const/let/var
      /export\s+(?:const|let|var)\s+(\w+)/g,
      // export default
      /export\s+default\s+(?:function\s+)?(\w+)?/g,
      // export { ... }
      /export\s*{\s*([^}]+)\s*}/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (name && name !== 'default') {
          const type = this.inferExportType(content, name);
          exports.push({
            name,
            type,
            isDefault: false,
            description: this.extractDescription(content, name)
          });
        }
      }
    }

    // Handle export default separately
    const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)?/);
    if (defaultExportMatch) {
      exports.push({
        name: defaultExportMatch[1] || 'default',
        type: 'function',
        isDefault: true
      });
    }

    return this.deduplicateExports(exports);
  }

  private extractInterfaces(content: string): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{([^}]*)}/g;
    
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const extendsClause = match[2]?.trim();
      const body = match[3];
      
      const properties = this.extractProperties(body);
      const extendsArray = extendsClause ? extendsClause.split(',').map(s => s.trim()) : undefined;
      
      interfaces.push({
        name,
        properties,
        extends: extendsArray,
        description: this.extractDescription(content, name)
      });
    }

    return interfaces;
  }

  private extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    // Function patterns
    const patterns = [
      // declare function
      /(?:export\s+)?declare\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g,
      // export function
      /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;{]+)/g,
      // function in interface/type
      /(\w+)\s*\(([^)]*)\)\s*:\s*([^;,}]+)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        const paramsStr = match[2];
        const returnType = match[3]?.trim() || 'void';
        
        const parameters = this.extractParameters(paramsStr);
        const isAsync = returnType.includes('Promise');
        
        functions.push({
          name,
          parameters,
          returnType,
          isAsync,
          description: this.extractDescription(content, name)
        });
      }
    }

    return functions;
  }

  private extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classRegex = /(?:export\s+)?(?:declare\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{([^}]*)}/g;
    
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const extendsClass = match[2];
      const implementsClause = match[3];
      const body = match[4];
      
      const methods = this.extractMethods(body);
      const properties = this.extractProperties(body);
      const constructor = this.extractConstructor(body);
      const implementsArray = implementsClause ? implementsClause.split(',').map(s => s.trim()) : undefined;
      
      classes.push({
        name,
        constructor,
        methods,
        properties,
        extends: extendsClass,
        implements: implementsArray,
        description: this.extractDescription(content, name)
      });
    }

    return classes;
  }

  private extractTypes(content: string): TypeInfo[] {
    const types: TypeInfo[] = [];
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*([^;]+);/g;
    
    let match;
    while ((match = typeRegex.exec(content)) !== null) {
      const name = match[1];
      const definition = match[2].trim();
      
      types.push({
        name,
        definition,
        description: this.extractDescription(content, name)
      });
    }

    return types;
  }

  private extractEnums(content: string): EnumInfo[] {
    const enums: EnumInfo[] = [];
    const enumRegex = /(?:export\s+)?enum\s+(\w+)\s*{([^}]*)}/g;
    
    let match;
    while ((match = enumRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      
      const values = this.extractEnumValues(body);
      
      enums.push({
        name,
        values,
        description: this.extractDescription(content, name)
      });
    }

    return enums;
  }

  private extractProperties(body: string): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    
    // Property patterns: name: type; or name?: type;
    const propertyRegex = /(\w+)(\?)?:\s*([^;,}]+)/g;
    
    let match;
    while ((match = propertyRegex.exec(body)) !== null) {
      const name = match[1];
      const optional = !!match[2];
      const type = match[3].trim();
      
      // Skip if it looks like a method (has parentheses)
      if (!type.includes('(')) {
        properties.push({
          name,
          type,
          optional,
          description: this.extractDescription(body, name)
        });
      }
    }

    return properties;
  }

  private extractParameters(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];
    
    const parameters: ParameterInfo[] = [];
    const params = this.splitParameters(paramsStr);
    
    for (const param of params) {
      const match = param.match(/(\w+)(\?)?:\s*([^=]+)(?:\s*=\s*(.+))?/);
      if (match) {
        const name = match[1];
        const optional = !!match[2];
        const type = match[3].trim();
        const defaultValue = match[4]?.trim();
        
        parameters.push({
          name,
          type,
          optional,
          defaultValue
        });
      }
    }

    return parameters;
  }

  private extractMethods(body: string): FunctionInfo[] {
    const methods: FunctionInfo[] = [];
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*:\s*([^;,}]+)/g;
    
    let match;
    while ((match = methodRegex.exec(body)) !== null) {
      const name = match[1];
      const paramsStr = match[2];
      const returnType = match[3].trim();
      
      const parameters = this.extractParameters(paramsStr);
      const isAsync = returnType.includes('Promise');
      
      methods.push({
        name,
        parameters,
        returnType,
        isAsync,
        description: this.extractDescription(body, name)
      });
    }

    return methods;
  }

  private extractConstructor(body: string): FunctionInfo | undefined {
    const constructorMatch = body.match(/constructor\s*\(([^)]*)\)/);
    if (constructorMatch) {
      const paramsStr = constructorMatch[1];
      const parameters = this.extractParameters(paramsStr);
      
      return {
        name: 'constructor',
        parameters,
        returnType: 'void',
        isAsync: false
      };
    }
    
    return undefined;
  }

  private extractEnumValues(body: string): EnumValue[] {
    const values: EnumValue[] = [];
    const valueRegex = /(\w+)\s*(?:=\s*([^,}]+))?/g;
    
    let match;
    while ((match = valueRegex.exec(body)) !== null) {
      const name = match[1];
      const value = match[2]?.trim() || name;
      
      values.push({
        name,
        value: this.parseEnumValue(value),
        description: this.extractDescription(body, name)
      });
    }

    return values;
  }

  private splitParameters(paramsStr: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    
    for (const char of paramsStr) {
      if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
      } else {
        if (char === '(' || char === '{' || char === '[') depth++;
        if (char === ')' || char === '}' || char === ']') depth--;
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    return params;
  }

  private parseEnumValue(value: string): string | number {
    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue;
    }
    
    // Remove quotes if present
    return value.replace(/^['"]|['"]$/g, '');
  }

  private inferExportType(content: string, name: string): ExportInfo['type'] {
    if (content.includes(`function ${name}`)) return 'function';
    if (content.includes(`class ${name}`)) return 'class';
    if (content.includes(`interface ${name}`)) return 'interface';
    if (content.includes(`type ${name}`)) return 'type';
    if (content.includes(`enum ${name}`)) return 'enum';
    return 'constant';
  }

  private extractDescription(content: string, name: string): string | undefined {
    // Look for JSDoc comments before the declaration
    const beforeDeclaration = content.substring(0, content.indexOf(name));
    const commentMatch = beforeDeclaration.match(/\/\*\*([^*]|\*(?!\/))*\*\//g);
    
    if (commentMatch && commentMatch.length > 0) {
      const lastComment = commentMatch[commentMatch.length - 1];
      return lastComment
        .replace(/\/\*\*|\*\//g, '')
        .replace(/^\s*\*\s?/gm, '')
        .trim();
    }
    
    return undefined;
  }

  private deduplicateExports(exports: ExportInfo[]): ExportInfo[] {
    const seen = new Set<string>();
    return exports.filter(exp => {
      const key = `${exp.name}-${exp.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private createEmptyAnalysis(): TypeDefinitionAnalysis {
    return {
      exports: [],
      interfaces: [],
      functions: [],
      classes: [],
      types: [],
      enums: [],
      hasDefinitions: false
    };
  }
}