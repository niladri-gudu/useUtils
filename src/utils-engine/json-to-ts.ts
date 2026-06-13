export interface ConvertOptions {
  rootName?: string;
  outputFormat?: 'interfaces' | 'types' | 'zod';
  dateTimeDetection?: boolean;
  optionalProperties?: boolean;
  readonlyProperties?: boolean;
  exportType?: 'export' | 'none';
}

export type TypeNode =
  | { type: 'primitive'; name: 'string' | 'number' | 'boolean' | 'null' | 'any' | 'Date' }
  | { type: 'array'; elementType: TypeNode }
  | { type: 'object'; properties: Record<string, { node: TypeNode; optional: boolean }> }
  | { type: 'union'; types: TypeNode[] };

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]+/g, ' ')
    .split(' ')
    .map(word => capitalize(word))
    .join('');
}

/**
 * Infers the schema TypeNode tree from a JavaScript value.
 */
export function inferType(val: any, options: ConvertOptions): TypeNode {
  if (val === null) {
    return { type: 'primitive', name: 'null' };
  }
  if (typeof val === 'string') {
    if (options.dateTimeDetection) {
      // Check for ISO 8601 timestamps
      const isDate = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/.test(val);
      if (isDate) {
        return { type: 'primitive', name: 'Date' };
      }
    }
    return { type: 'primitive', name: 'string' };
  }
  if (typeof val === 'number') {
    return { type: 'primitive', name: 'number' };
  }
  if (typeof val === 'boolean') {
    return { type: 'primitive', name: 'boolean' };
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return { type: 'array', elementType: { type: 'primitive', name: 'any' } };
    }
    const elementTypes = val.map(item => inferType(item, options));
    const merged = mergeTypes(elementTypes, options);
    return { type: 'array', elementType: merged };
  }
  if (typeof val === 'object') {
    const properties: Record<string, { node: TypeNode; optional: boolean }> = {};
    for (const key of Object.keys(val)) {
      properties[key] = {
        node: inferType(val[key], options),
        optional: false
      };
    }
    return { type: 'object', properties };
  }
  return { type: 'primitive', name: 'any' };
}

/**
 * Recursively merges an array of TypeNodes to handle varying object structures in collections.
 */
function mergeTypes(types: TypeNode[], options: ConvertOptions): TypeNode {
  if (types.length === 0) {
    return { type: 'primitive', name: 'any' };
  }
  if (types.length === 1) {
    return types[0];
  }

  const first = types[0];
  const allSameType = types.every(t => t.type === first.type);

  if (allSameType) {
    if (first.type === 'primitive') {
      const allSameName = types.every(t => t.type === 'primitive' && t.name === first.name);
      if (allSameName) {
        return first;
      }
      const names = Array.from(new Set(types.map(t => (t as any).name)));
      return { type: 'union', types: names.map(n => ({ type: 'primitive', name: n })) };
    }

    if (first.type === 'array') {
      const elementTypes = types.map(t => (t as any).elementType);
      return { type: 'array', elementType: mergeTypes(elementTypes, options) };
    }

    if (first.type === 'object') {
      const allProps: Record<string, TypeNode[]> = {};
      const keyOccurrenceCount: Record<string, number> = {};

      types.forEach(t => {
        if (t.type === 'object') {
          Object.keys(t.properties).forEach(k => {
            if (!allProps[k]) {
              allProps[k] = [];
              keyOccurrenceCount[k] = 0;
            }
            allProps[k].push(t.properties[k].node);
            keyOccurrenceCount[k]++;
          });
        }
      });

      const mergedProperties: Record<string, { node: TypeNode; optional: boolean }> = {};
      Object.keys(allProps).forEach(k => {
        const propTypes = allProps[k];
        const isOptional = options.optionalProperties || keyOccurrenceCount[k] < types.length;
        mergedProperties[k] = {
          node: mergeTypes(propTypes, options),
          optional: isOptional
        };
      });

      return { type: 'object', properties: mergedProperties };
    }
  }

  const flattened: TypeNode[] = [];
  types.forEach(t => {
    if (t.type === 'union') {
      flattened.push(...t.types);
    } else {
      flattened.push(t);
    }
  });

  const uniqueTypes: TypeNode[] = [];
  flattened.forEach(t => {
    const exists = uniqueTypes.some(u => isSameTypeNode(u, t));
    if (!exists) {
      uniqueTypes.push(t);
    }
  });

  if (uniqueTypes.length === 1) {
    return uniqueTypes[0];
  }
  return { type: 'union', types: uniqueTypes };
}

function isSameTypeNode(a: TypeNode, b: TypeNode): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'primitive' && b.type === 'primitive') {
    return a.name === b.name;
  }
  if (a.type === 'array' && b.type === 'array') {
    return isSameTypeNode(a.elementType, b.elementType);
  }
  if (a.type === 'object' && b.type === 'object') {
    const aKeys = Object.keys(a.properties);
    const bKeys = Object.keys(b.properties);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(k => bKeys.includes(k) && isSameTypeNode(a.properties[k].node, b.properties[k].node));
  }
  if (a.type === 'union' && b.type === 'union') {
    if (a.types.length !== b.types.length) return false;
    return a.types.every(t => b.types.some(u => isSameTypeNode(t, u)));
  }
  return false;
}

/**
 * Compiles a TypeNode tree into TypeScript Interfaces or Types.
 */
export function generateTypescript(node: TypeNode, options: ConvertOptions): string {
  const definitions: { name: string; code: string }[] = [];
  const nameRegistry = new Set<string>();
  const rootRawName = options.rootName || 'RootObject';
  const rootPascalName = toPascalCase(rootRawName);

  function getUniqueName(suggestedName: string): string {
    let name = toPascalCase(suggestedName);
    if (!name) name = 'Item';

    const reserved = ['any', 'never', 'unknown', 'object', 'string', 'number', 'boolean', 'void', 'Date'];
    if (reserved.includes(name.toLowerCase())) {
      name = name + 'Obj';
    }

    let candidate = name;
    let counter = 2;
    while (nameRegistry.has(candidate) || candidate === rootPascalName) {
      candidate = name + counter;
      counter++;
    }
    nameRegistry.add(candidate);
    return candidate;
  }

  function resolveType(t: TypeNode, currentKeyName: string, isRoot: boolean = false): string {
    if (t.type === 'primitive') {
      if (t.name === 'Date') return 'Date';
      return t.name;
    }

    if (t.type === 'array') {
      const elementStr = resolveType(t.elementType, currentKeyName ? `${currentKeyName}Item` : 'Item');
      if (t.elementType.type === 'union') {
        return `(${elementStr})[]`;
      }
      return `${elementStr}[]`;
    }

    if (t.type === 'union') {
      return t.types.map(subT => resolveType(subT, currentKeyName)).join(' | ');
    }

    if (t.type === 'object') {
      // Use the root name directly for the root object definition
      const interfaceName = isRoot ? rootPascalName : getUniqueName(currentKeyName);
      const isExport = options.exportType === 'export' ? 'export ' : '';
      const isReadonly = options.readonlyProperties ? 'readonly ' : '';

      let code = '';
      if (options.outputFormat === 'types') {
        code += `${isExport}type ${interfaceName} = {\n`;
      } else {
        code += `${isExport}interface ${interfaceName} {\n`;
      }

      for (const [key, prop] of Object.entries(t.properties)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        const opt = prop.optional ? '?' : '';
        const propTypeStr = resolveType(prop.node, key);
        code += `  ${isReadonly}${safeKey}${opt}: ${propTypeStr};\n`;
      }
      code += `};`;

      definitions.push({ name: interfaceName, code });
      return interfaceName;
    }

    return 'any';
  }

  // Check if root is object
  if (node.type === 'object') {
    resolveType(node, rootPascalName, true);
    // Reverse definitions so Root object is at the top
    return definitions.reverse().map(d => d.code).join('\n\n');
  } else {
    // Root is not an object (e.g. primitive or array)
    const rootType = resolveType(node, rootPascalName);
    const isExport = options.exportType === 'export' ? 'export ' : '';
    const rootDefinition = `${isExport}type ${rootPascalName} = ${rootType};`;
    
    if (definitions.length > 0) {
      return [rootDefinition, ...definitions.reverse().map(d => d.code)].join('\n\n');
    }
    return rootDefinition;
  }
}

/**
 * Compiles a TypeNode tree into Zod Validation Schema.
 */
export function generateZod(node: TypeNode, options: ConvertOptions): string {
  const definitions: { name: string; code: string }[] = [];
  const nameRegistry = new Set<string>();
  const rootRawName = options.rootName || 'RootObject';
  const rootPascalName = toPascalCase(rootRawName);
  const rootSchemaName = rootPascalName.endsWith('Schema') ? rootPascalName : `${rootPascalName}Schema`;

  function getUniqueName(suggestedName: string): string {
    let name = toPascalCase(suggestedName);
    if (!name) name = 'Item';
    if (!name.endsWith('Schema')) {
      name = name + 'Schema';
    }

    let candidate = name;
    let counter = 2;
    while (nameRegistry.has(candidate) || candidate === rootSchemaName) {
      candidate = name.slice(0, -6) + counter + 'Schema';
      counter++;
    }
    nameRegistry.add(candidate);
    return candidate;
  }

  function resolveZod(t: TypeNode, currentKeyName: string, isRoot: boolean = false): string {
    if (t.type === 'primitive') {
      if (t.name === 'string') return 'z.string()';
      if (t.name === 'number') return 'z.number()';
      if (t.name === 'boolean') return 'z.boolean()';
      if (t.name === 'null') return 'z.null()';
      if (t.name === 'Date') return 'z.coerce.date()';
      return 'z.any()';
    }

    if (t.type === 'array') {
      const elementStr = resolveZod(t.elementType, currentKeyName ? `${currentKeyName}Item` : 'Item');
      return `z.array(${elementStr})`;
    }

    if (t.type === 'union') {
      const subSchemas = t.types.map(subT => resolveZod(subT, currentKeyName));
      return `z.union([${subSchemas.join(', ')}])`;
    }

    if (t.type === 'object') {
      const schemaName = isRoot ? rootSchemaName : getUniqueName(currentKeyName);
      const isExport = options.exportType === 'export' ? 'export ' : '';

      let code = `${isExport}const ${schemaName} = z.object({\n`;
      for (const [key, prop] of Object.entries(t.properties)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        let propStr = resolveZod(prop.node, key);
        if (prop.optional) {
          propStr += '.optional()';
        }
        code += `  ${safeKey}: ${propStr},\n`;
      }
      code += `});`;

      definitions.push({ name: schemaName, code });
      return schemaName;
    }

    return 'z.any()';
  }

  let finalCode = '';
  if (node.type === 'object') {
    resolveZod(node, rootPascalName, true);
    finalCode = definitions.reverse().map(d => d.code).join('\n\n');
  } else {
    const rootSchema = resolveZod(node, rootPascalName);
    const isExport = options.exportType === 'export' ? 'export ' : '';
    const rootDefinition = `${isExport}const ${rootSchemaName} = ${rootSchema};`;
    
    if (definitions.length > 0) {
      finalCode = [rootDefinition, ...definitions.reverse().map(d => d.code)].join('\n\n');
    } else {
      finalCode = rootDefinition;
    }
  }

  return `import { z } from "zod";\n\n${finalCode}`;
}

/**
 * Main parser entry point.
 */
export function compileJsonToTs(jsonStr: string, options: ConvertOptions): string {
  if (!jsonStr || !jsonStr.trim()) {
    return '';
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  const inferred = inferType(parsed, options);

  if (options.outputFormat === 'zod') {
    return generateZod(inferred, options);
  } else {
    return generateTypescript(inferred, options);
  }
}
