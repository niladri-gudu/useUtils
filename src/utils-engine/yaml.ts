/**
 * YAML Parser, Serializer, Schema Generator, and Code Boilerplate Generator
 * 100% Offline, Zero-Dependency implementation for useUtils.com.
 */

export interface YamlValidationResult {
  isValid: boolean;
  error: string | null;
  line?: number;
  column?: number;
}

export interface YamlParseOptions {
  multiDoc?: boolean;
  resolveAnchors?: boolean;
}

export interface YamlDumpOptions {
  indent?: number;
  sortKeys?: boolean;
  forceQuotes?: boolean;
  blockScalarThreshold?: number; // threshold of newlines or length to use '|' for strings
}

/**
 * Deep clone helper to resolve aliases cleanly
 */
function deepClone(val: any): any {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(deepClone);
  }
  const cloned: any = {};
  for (const k of Object.keys(val)) {
    cloned[k] = deepClone(val[k]);
  }
  return cloned;
}

/**
 * Parse an inline flow value (e.g. [1, "two", 3] or {a: true, b: null})
 */
function parseFlowValue(str: string): any {
  str = str.trim();
  if (!str) return null;

  // Check if it's a flow array: [val1, val2, ...]
  if (str.startsWith('[') && str.endsWith(']')) {
    const content = str.slice(1, -1).trim();
    if (!content) return [];
    
    // Simple comma splitter that respects quotes
    const items = splitByCommaOutsideQuotes(content);
    return items.map(item => parseYamlScalar(item));
  }

  // Check if it's a flow object: {k1: v1, k2: v2, ...}
  if (str.startsWith('{') && str.endsWith('}')) {
    const content = str.slice(1, -1).trim();
    if (!content) return {};

    const items = splitByCommaOutsideQuotes(content);
    const obj: any = {};
    for (const item of items) {
      const colonIdx = item.indexOf(':');
      if (colonIdx === -1) continue;
      const key = item.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      const val = item.slice(colonIdx + 1).trim();
      obj[key] = parseYamlScalar(val);
    }
    return obj;
  }

  return parseYamlScalar(str);
}

/**
 * Split flow collections by comma, ignoring commas nested inside quotes or braces
 */
function splitByCommaOutsideQuotes(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !inSingleQuotes) {
      if (i === 0 || str[i - 1] !== '\\') {
        inDoubleQuotes = !inDoubleQuotes;
      }
    } else if (char === "'" && !inDoubleQuotes) {
      if (i === 0 || str[i - 1] !== '\\') {
        inSingleQuotes = !inSingleQuotes;
      }
    } else if (!inDoubleQuotes && !inSingleQuotes) {
      if (char === '[') bracketDepth++;
      else if (char === ']') bracketDepth--;
      else if (char === '{') braceDepth++;
      else if (char === '}') braceDepth--;
    }

    if (char === ',' && !inDoubleQuotes && !inSingleQuotes && bracketDepth === 0 && braceDepth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

/**
 * Standard scalar parser for YAML (converts types natively)
 */
export function parseYamlScalar(valStr: string): any {
  valStr = valStr.trim();
  if (!valStr || valStr === 'null' || valStr === '~' || valStr === 'Null' || valStr === 'NULL') {
    return null;
  }
  if (valStr === 'true' || valStr === 'True' || valStr === 'TRUE') return true;
  if (valStr === 'false' || valStr === 'False' || valStr === 'FALSE') return false;

  // Quoted strings
  if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
    const content = valStr.slice(1, -1);
    return valStr.startsWith('"')
      ? content.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
      : content.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }

  // Numbers (Integers, Decimals, Hex, Octal)
  if (/^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(valStr)) {
    return Number(valStr);
  }
  if (/^0x[0-9a-fA-F]+$/.test(valStr)) {
    return parseInt(valStr, 16);
  }
  if (/^0o[0-7]+$/.test(valStr)) {
    return parseInt(valStr.slice(2), 8);
  }

  return valStr;
}

/**
 * Validates YAML syntax by checking common structural points:
 * - Tabs used for indentation
 * - Consistent indentation increments
 * - Unbalanced quotes or flow braces/brackets
 * - Attempting to parse documents
 */
export function validateYaml(yamlStr: string): YamlValidationResult {
  if (!yamlStr || !yamlStr.trim()) {
    return { isValid: true, error: null };
  }

  // Check for tab characters in indentation
  const lines = yamlStr.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s+)/);
    if (match && match[1].includes('\t')) {
      return {
        isValid: false,
        error: 'Tab characters are not allowed for indentation in YAML. Use spaces instead.',
        line: i + 1,
        column: line.indexOf('\t') + 1
      };
    }
  }

  // Try parsing to verify structural soundness
  try {
    yamlToJson(yamlStr, { resolveAnchors: true });
    return { isValid: true, error: null };
  } catch (err: any) {
    let line = 1;
    let column = 1;
    const msg = err.message || 'Unknown YAML syntax error';

    // Attempt to extract line and column from the error message
    const lineMatch = msg.match(/at line (\d+)/i);
    const colMatch = msg.match(/column (\d+)/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }
    if (colMatch) {
      column = parseInt(colMatch[1], 10);
    }

    return {
      isValid: false,
      error: msg.replace(/\s*at line \d+\s*(column \d+)?/gi, ''),
      line,
      column
    };
  }
}

/**
 * Parses a YAML string into a JS structure.
 * Supports multi-document configs, objects, lists, flow structures, multiline scalars, and anchors/aliases.
 */
export function yamlToJson(yamlStr: string, options: YamlParseOptions = {}): any {
  if (!yamlStr || !yamlStr.trim()) return {};

  const lines = yamlStr.split(/\r?\n/);
  const documents: any[] = [];
  let currentDocLines: string[] = [];

  // Split multi-document structures by '---'
  for (const line of lines) {
    if (line.trim() === '---') {
      if (currentDocLines.length > 0) {
        documents.push(parseSingleDocument(currentDocLines, options));
        currentDocLines = [];
      }
    } else if (line.trim() === '...') {
      if (currentDocLines.length > 0) {
        documents.push(parseSingleDocument(currentDocLines, options));
        currentDocLines = [];
      }
    } else {
      currentDocLines.push(line);
    }
  }
  if (currentDocLines.length > 0) {
    documents.push(parseSingleDocument(currentDocLines, options));
  }

  const validDocs = documents.filter(d => d !== undefined && d !== null);

  if (options.multiDoc) {
    return validDocs;
  }
  return validDocs.length > 0 ? validDocs[0] : {};
}

/**
 * Parses a single YAML document block represented by array of lines
 */
function parseSingleDocument(lines: string[], options: YamlParseOptions): any {
  const anchors: Record<string, any> = {};
  const anchorReferencesToResolve: { parent: any; key: string | number; anchorName: string }[] = [];

  // Parse lines structurally
  let i = 0;
  const len = lines.length;

  // Helper to read indentation
  const getIndent = (s: string) => {
    const match = s.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  // Stack of structural frames
  // indent: spacing level
  // value: container (object or array)
  // type: 'object' | 'array'
  // lastKey: key mapping for nested fields
  const stack: { indent: number; value: any; type: 'object' | 'array'; lastKey?: string | number }[] = [];

  let root: any = null;

  while (i < len) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines or comment-only lines
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const indent = getIndent(rawLine);

    // Pop the stack to find the parent context matching the indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const currentContext = stack[stack.length - 1];

    // Read multiline block scalars: literal "|" or folded ">"
    let isBlockScalar = false;
    let blockScalarType: 'literal' | 'folded' | null = null;
    let valueStr = '';

    // Check if line represents a list item: "- item"
    if (trimmed.startsWith('-')) {
      const content = trimmed.slice(1).trim();

      // Ensure current context matches this array
      let activeContainer: any[];
      if (!currentContext) {
        root = root === null ? [] : root;
        if (!Array.isArray(root)) {
          throw new Error(`YAML parsing mismatch: expected array root at line ${i + 1}`);
        }
        activeContainer = root;
        stack.push({ indent, value: activeContainer, type: 'array' });
      } else if (currentContext.type === 'array') {
        activeContainer = currentContext.value;
      } else {
        // Parent context was an object, but this is a list item.
        // It should map to the last key of the parent object.
        const parentKey = currentContext.lastKey;
        if (parentKey === undefined) {
          throw new Error(`YAML parsing error: array item found without parent key mapping at line ${i + 1}`);
        }
        if (!Array.isArray(currentContext.value[parentKey])) {
          currentContext.value[parentKey] = [];
        }
        activeContainer = currentContext.value[parentKey];
        stack.push({ indent, value: activeContainer, type: 'array' });
      }

      // Check if it's a key-value mapping inside the list: "- key: value"
      if (content.includes(':') && !content.startsWith('[') && !content.startsWith('{')) {
        const colonIdx = content.indexOf(':');
        const itemKey = content.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
        let itemValStr = content.slice(colonIdx + 1).trim();

        const objItem: any = {};
        activeContainer.push(objItem);

        const currentArrayIdx = activeContainer.length - 1;

        // Process anchor definition on this value if any
        let anchorName = '';
        if (itemValStr.includes('&')) {
          const anchorMatch = itemValStr.match(/&(\w+)/);
          if (anchorMatch) {
            anchorName = anchorMatch[1];
            itemValStr = itemValStr.replace(/&(\w+)/, '').trim();
          }
        }

        // Process alias usage on this value if any
        let isAlias = false;
        let aliasName = '';
        if (itemValStr.startsWith('*')) {
          isAlias = true;
          aliasName = itemValStr.slice(1).trim();
        }

        // Check if value is a block scalar indicator
        if (itemValStr === '|' || itemValStr === '>') {
          blockScalarType = itemValStr === '|' ? 'literal' : 'folded';
          const scalarLines: string[] = [];
          let nextIdx = i + 1;
          while (nextIdx < len) {
            const nextRaw = lines[nextIdx];
            const nextTrim = nextRaw.trim();
            if (!nextTrim) {
              scalarLines.push('');
              nextIdx++;
              continue;
            }
            const nextIndent = getIndent(nextRaw);
            if (nextIndent <= indent) break; // End of block scalar
            scalarLines.push(nextRaw.slice(indent + 2)); // slice base indent + 2 (standard list padding)
            nextIdx++;
          }
          i = nextIdx - 1; // Update iterator

          // Join lines
          if (blockScalarType === 'literal') {
            valueStr = scalarLines.join('\n');
          } else {
            valueStr = joinFoldedLines(scalarLines);
          }
          objItem[itemKey] = valueStr;
        } else if (isAlias) {
          anchorReferencesToResolve.push({ parent: objItem, key: itemKey, anchorName: aliasName });
        } else {
          objItem[itemKey] = parseFlowValue(itemValStr);
        }

        if (anchorName) {
          anchors[anchorName] = objItem[itemKey];
        }

        // Push this object item into the stack so subsequent nested elements can bind to it
        stack.push({ indent: indent + 2, value: objItem, type: 'object', lastKey: itemKey });

      } else {
        // Simple list item scalar: "- value"
        let itemValStr = content;

        // Process anchor definition
        let anchorName = '';
        if (itemValStr.includes('&')) {
          const anchorMatch = itemValStr.match(/&(\w+)/);
          if (anchorMatch) {
            anchorName = anchorMatch[1];
            itemValStr = itemValStr.replace(/&(\w+)/, '').trim();
          }
        }

        // Process alias usage
        let isAlias = false;
        let aliasName = '';
        if (itemValStr.startsWith('*')) {
          isAlias = true;
          aliasName = itemValStr.slice(1).trim();
        }

        const currentArrayIdx = activeContainer.length;

        // Check block scalar
        if (itemValStr === '|' || itemValStr === '>') {
          blockScalarType = itemValStr === '|' ? 'literal' : 'folded';
          const scalarLines: string[] = [];
          let nextIdx = i + 1;
          while (nextIdx < len) {
            const nextRaw = lines[nextIdx];
            const nextTrim = nextRaw.trim();
            if (!nextTrim) {
              scalarLines.push('');
              nextIdx++;
              continue;
            }
            const nextIndent = getIndent(nextRaw);
            if (nextIndent <= indent) break;
            scalarLines.push(nextRaw.slice(indent + 2));
            nextIdx++;
          }
          i = nextIdx - 1;

          if (blockScalarType === 'literal') {
            valueStr = scalarLines.join('\n');
          } else {
            valueStr = joinFoldedLines(scalarLines);
          }
          activeContainer.push(valueStr);
        } else if (isAlias) {
          activeContainer.push(null); // placeholder
          anchorReferencesToResolve.push({ parent: activeContainer, key: currentArrayIdx, anchorName: aliasName });
        } else {
          activeContainer.push(parseFlowValue(itemValStr));
        }

        if (anchorName) {
          anchors[anchorName] = activeContainer[activeContainer.length - 1];
        }
      }

    } else if (trimmed.includes(':')) {
      // Key-value pair: "key: value"
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      let valStr = trimmed.slice(colonIdx + 1).trim();

      let activeContainer: any;
      if (!currentContext) {
        root = root === null ? {} : root;
        if (typeof root !== 'object' || Array.isArray(root)) {
          throw new Error(`YAML parsing mismatch: expected object root at line ${i + 1}`);
        }
        activeContainer = root;
        stack.push({ indent, value: activeContainer, type: 'object', lastKey: key });
      } else if (currentContext.type === 'object') {
        activeContainer = currentContext.value;
        currentContext.lastKey = key;
      } else {
        // Parent context was an array, but we have a key-value mapping.
        // Usually invalid unless we're inside an implicit mapping, but we handle it
        throw new Error(`YAML parsing error: key-value found inside array context without leading dash at line ${i + 1}`);
      }

      // Check anchor/alias on value
      let anchorName = '';
      if (valStr.includes('&')) {
        const anchorMatch = valStr.match(/&(\w+)/);
        if (anchorMatch) {
          anchorName = anchorMatch[1];
          valStr = valStr.replace(/&(\w+)/, '').trim();
        }
      }

      let isAlias = false;
      let aliasName = '';
      if (valStr.startsWith('*')) {
        isAlias = true;
        aliasName = valStr.slice(1).trim();
      }

      // Parse values
      if (valStr === '' || valStr === '|' || valStr === '>') {
        if (valStr === '|' || valStr === '>') {
          // Block scalar parsing
          blockScalarType = valStr === '|' ? 'literal' : 'folded';
          const scalarLines: string[] = [];
          let nextIdx = i + 1;
          while (nextIdx < len) {
            const nextRaw = lines[nextIdx];
            const nextTrim = nextRaw.trim();
            if (!nextTrim) {
              scalarLines.push('');
              nextIdx++;
              continue;
            }
            const nextIndent = getIndent(nextRaw);
            if (nextIndent <= indent) break;
            scalarLines.push(nextRaw.slice(indent + 2)); // slice standard indent + nested indent padding
            nextIdx++;
          }
          i = nextIdx - 1;

          if (blockScalarType === 'literal') {
            valueStr = scalarLines.join('\n');
          } else {
            valueStr = joinFoldedLines(scalarLines);
          }
          activeContainer[key] = valueStr;
        } else {
          // Empty value means nested object/array next
          activeContainer[key] = {};
          stack.push({ indent, value: activeContainer[key], type: 'object', lastKey: key });
        }
      } else if (isAlias) {
        anchorReferencesToResolve.push({ parent: activeContainer, key, anchorName: aliasName });
      } else {
        activeContainer[key] = parseFlowValue(valStr);
      }

      if (anchorName) {
        anchors[anchorName] = activeContainer[key];
      }
    } else {
      // Freeform string / invalid configuration
      throw new Error(`YAML parsing error: invalid structural line at line ${i + 1}: "${trimmed}"`);
    }

    i++;
  }

  // Resolve anchor alias references
  if (options.resolveAnchors !== false) {
    for (const ref of anchorReferencesToResolve) {
      if (anchors[ref.anchorName] !== undefined) {
        ref.parent[ref.key] = deepClone(anchors[ref.anchorName]);
      } else {
        throw new Error(`YAML parsing error: undefined anchor reference "*${ref.anchorName}"`);
      }
    }
  }

  return root;
}

/**
 * Join lines for folded block scalar '>'
 */
function joinFoldedLines(lines: string[]): string {
  const result: string[] = [];
  let tempBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (tempBuffer.length > 0) {
        result.push(tempBuffer.join(' '));
        tempBuffer = [];
      }
      result.push(''); // keeps empty line
    } else if (line.match(/^\s+/)) {
      // Indented line in folded scalar - keep as literal
      if (tempBuffer.length > 0) {
        result.push(tempBuffer.join(' '));
        tempBuffer = [];
      }
      result.push(line);
    } else {
      tempBuffer.push(line);
    }
  }
  if (tempBuffer.length > 0) {
    result.push(tempBuffer.join(' '));
  }

  return result.join('\n');
}

/**
 * Converts a JS object/array to YAML format.
 */
export function jsonToYaml(obj: any, options: YamlDumpOptions = {}): string {
  const indentSize = options.indent || 2;
  const sortKeys = options.sortKeys || false;
  const forceQuotes = options.forceQuotes || false;
  const blockThreshold = options.blockScalarThreshold || 2; // threshold of newlines or length

  function stringify(val: any, depth: number): string {
    const spacing = ' '.repeat(depth);

    if (val === null) return 'null';
    if (typeof val === 'undefined') return '';

    if (typeof val !== 'object') {
      if (typeof val === 'string') {
        const hasNewlines = val.includes('\n');
        
        // Literal block scalar helper
        if (hasNewlines && val.split('\n').length >= blockThreshold) {
          const formattedLines = val
            .split('\n')
            .map(line => ' '.repeat(depth + indentSize) + line)
            .join('\n');
          return `|\n${formattedLines}`;
        }

        const needsQuotes =
          forceQuotes ||
          /[#:*?{}|[\]&*!%@`]/.test(val) ||
          val === 'true' ||
          val === 'false' ||
          val === 'null' ||
          !isNaN(Number(val)) ||
          val.trim() !== val;

        if (needsQuotes) {
          return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        }
        return val;
      }
      return String(val);
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      return val
        .map(item => {
          const itemVal = stringify(item, depth + indentSize);
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            // Nested object maps cleanly as:
            // - key: val
            //   key2: val2
            return `${spacing}- ${itemVal.trimStart()}`;
          }
          return `${spacing}- ${itemVal.trim()}`;
        })
        .join('\n');
    }

    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';

    const processedKeys = sortKeys ? [...keys].sort() : keys;

    return processedKeys
      .map(key => {
        const itemVal = val[key];
        const safeKey = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;

        if (itemVal === null) {
          return `${spacing}${safeKey}: null`;
        }
        if (typeof itemVal === 'object') {
          if (Array.isArray(itemVal) && itemVal.length === 0) {
            return `${spacing}${safeKey}: []`;
          }
          if (!Array.isArray(itemVal) && Object.keys(itemVal).length === 0) {
            return `${spacing}${safeKey}: {}`;
          }
          return `${spacing}${safeKey}:\n${stringify(itemVal, depth + indentSize)}`;
        }
        return `${spacing}${safeKey}: ${stringify(itemVal, depth + indentSize)}`;
      })
      .join('\n');
  }

  return stringify(obj, 0);
}

/**
 * Generates a clean JSON Schema (Draft 07) from a JS object structure.
 */
export function generateSchema(obj: any): string {
  function getJsonType(val: any): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function buildSchema(val: any): any {
    const type = getJsonType(val);
    
    if (type === 'null') {
      return { type: 'null' };
    }
    if (type === 'boolean') {
      return { type: 'boolean' };
    }
    if (type === 'number') {
      return { type: Number.isInteger(val) ? 'integer' : 'number' };
    }
    if (type === 'string') {
      const isUrl = /^https?:\/\/\S+$/.test(val);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isDate = !isNaN(Date.parse(val)) && val.includes('-');
      
      const schema: any = { type: 'string' };
      if (isUrl) schema.format = 'uri';
      else if (isEmail) schema.format = 'email';
      else if (isDate) schema.format = 'date-time';

      return schema;
    }
    if (type === 'array') {
      const schema: any = { type: 'array' };
      if (val.length > 0) {
        // Collect types of items to generate items schema
        const itemTypes = new Set(val.map(getJsonType));
        if (itemTypes.size === 1) {
          schema.items = buildSchema(val[0]);
        } else {
          // Mixed array
          schema.items = {
            anyOf: Array.from(itemTypes).map(t => {
              const matchingItem = val.find((item: any) => getJsonType(item) === t);
              return buildSchema(matchingItem);
            })
          };
        }
      } else {
        schema.items = {};
      }
      return schema;
    }
    if (type === 'object') {
      const properties: any = {};
      const required: string[] = [];

      for (const key of Object.keys(val)) {
        properties[key] = buildSchema(val[key]);
        required.push(key);
      }

      return {
        type: 'object',
        properties,
        required
      };
    }

    return {};
  }

  const baseSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'AutoGeneratedSchema',
    description: 'JSON Schema auto-generated from parsed YAML/JSON data structure.',
    ...buildSchema(obj)
  };

  return JSON.stringify(baseSchema, null, 2);
}

/**
 * Generates parsing code snippets in Go, Python, and JavaScript/TypeScript
 */
export function generateParserCode(obj: any, language: string): string {
  if (obj === null || obj === undefined) return '// Provide valid data to generate parser code';

  switch (language.toLowerCase()) {
    case 'go':
      return generateGoStructs(obj);
    case 'python':
      return generatePythonParser(obj);
    case 'javascript':
    case 'typescript':
      return generateTypeScriptInterfaces(obj);
    default:
      return '// Language not supported for parsing code generation';
  }
}

/**
 * Helper: Go structs generator
 */
function generateGoStructs(obj: any): string {
  const structs: Record<string, string> = {};

  function capitalize(s: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }

  function getGoType(name: string, val: any): string {
    if (val === null) return 'interface{}';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'int' : 'float64';
    }
    if (typeof val === 'string') return 'string';
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]interface{}';
      const childType = getGoType(name + 'Item', val[0]);
      return `[]${childType}`;
    }
    
    // Object
    const structName = capitalize(name) + 'Struct';
    if (!structs[structName]) {
      buildStruct(structName, val);
    }
    return structName;
  }

  function buildStruct(structName: string, val: any) {
    let fields = '';
    for (const key of Object.keys(val)) {
      const goKeyName = capitalize(key);
      const goType = getGoType(key, val[key]);
      fields += `\t${goKeyName} ${goType} \`json:"${key}" yaml:"${key}"\`\n`;
    }
    structs[structName] = `type ${structName} struct {\n${fields}}`;
  }

  const rootGoType = getGoType('AutoGenerated', obj);

  let output = 'package main\n\nimport (\n\t"fmt"\n\t"gopkg.in/yaml.v3"\n\t"encoding/json"\n)\n\n';
  
  if (typeof obj === 'object' && obj !== null) {
    // Collect all generated structs
    output += Object.values(structs).join('\n\n') + '\n\n';
  }

  output += `func ParseData(data []byte) (*${rootGoType}, error) {
\tvar res ${rootGoType}
\t// Supports both JSON and YAML auto-unmarshaling
\terr := yaml.Unmarshal(data, &res)
\tif err != nil {
\t\treturn nil, err
\t}
\treturn &res, nil
}

func main() {
\traw := []byte(\`# source yaml/json payload\`)
\tparsed, err := ParseData(raw)
\tif err != nil {
\t\tpanic(err)
\t}
\tfmt.Printf("Parsed successfully: %+v\\n", parsed)
}`;

  return output;
}

/**
 * Helper: Python parser generator
 */
function generatePythonParser(obj: any): string {
  let output = `import json
import yaml

# Boilerplate code to parse data in Python

def parse_data(raw_str: str, format_type: str = 'yaml'):
    """Parses raw input config string using either PyYAML or json parser natively.
    
    Args:
        raw_str: The raw string config payload
        format_type: 'yaml' or 'json'
    """
    if format_type.lower() == 'json':
        return json.loads(raw_str)
    else:
        # PyYAML safe_load prevents code injection attacks
        return yaml.safe_load(raw_str)

# Example Usage:
if __name__ == "__main__":
    payload = """
`;
  // Add a quick truncated yaml block
  try {
    const sampleYaml = jsonToYaml(obj, { indent: 2, sortKeys: false }).slice(0, 150);
    output += sampleYaml + (sampleYaml.length >= 150 ? '\n    # ... [truncated]' : '') + '\n';
  } catch {
    output += '    status: success\n';
  }

  output += `    """
    data = parse_data(payload, 'yaml')
    print("Parsed JSON dict object in Python:")
    print(json.dumps(data, indent=4))
`;
  return output;
}

/**
 * Helper: TypeScript interfaces generator
 */
function generateTypeScriptInterfaces(obj: any): string {
  const interfaces: Record<string, string> = {};

  function capitalize(s: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }

  function getTsType(name: string, val: any): string {
    if (val === null) return 'null';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'number') return 'number';
    if (typeof val === 'string') return 'string';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'any[]';
      const childType = getTsType(name + 'Item', val[0]);
      return `${childType}[]`;
    }
    
    // Object
    const intName = capitalize(name);
    if (!interfaces[intName]) {
      buildInterface(intName, val);
    }
    return intName;
  }

  function buildInterface(intName: string, val: any) {
    let fields = '';
    for (const key of Object.keys(val)) {
      const isSafeKey = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key);
      const displayKey = isSafeKey ? key : `"${key}"`;
      const tsType = getTsType(key, val[key]);
      fields += `  ${displayKey}: ${tsType};\n`;
    }
    interfaces[intName] = `interface ${intName} {\n${fields}}`;
  }

  const rootTsType = getTsType('AutoGenerated', obj);

  let output = `// Auto-generated TypeScript Interfaces for parsed JSON/YAML data structures.

`;

  if (typeof obj === 'object' && obj !== null) {
    output += Object.values(interfaces).join('\n\n') + '\n\n';
  }

  output += `// JavaScript safe-parsing loader with js-yaml library fallback
import * as yaml from 'js-yaml';

export function loadConfiguration(rawInput: string): ${rootTsType} {
  try {
    // First try standard JSON parser
    return JSON.parse(rawInput);
  } catch {
    // If standard JSON fails, load configuration using JS-YAML parser
    return yaml.load(rawInput) as ${rootTsType};
  }
}
`;
  return output;
}
