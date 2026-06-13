export interface JsonValidationResult {
  isValid: boolean;
  error: string | null;
  line?: number;
  column?: number;
  position?: number;
}

/**
 * Validates a JSON string and extracts detailed line/column coordinates on failure.
 */
export function validateJson(jsonStr: string): JsonValidationResult {
  if (!jsonStr || !jsonStr.trim()) {
    return { isValid: true, error: null };
  }

  try {
    JSON.parse(jsonStr);
    return { isValid: true, error: null };
  } catch (e: any) {
    const message = e.message;
    let position = -1;
    let line = 1;
    let column = 1;

    // Try to extract error offset/position from browser's error message (V8 engine style)
    const positionMatch = message.match(/at position (\d+)/i);
    if (positionMatch) {
      position = parseInt(positionMatch[1], 10);
    } else {
      // Firefox style: "line X column Y"
      const lineColMatch = message.match(/line (\d+) column (\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      }
    }

    if (position !== -1) {
      const lines = jsonStr.slice(0, position).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      isValid: false,
      error: message,
      line,
      column,
      position: position !== -1 ? position : undefined,
    };
  }
}

/**
 * Recursively sorts object keys alphabetically.
 */
export function sortJsonKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = sortJsonKeys(obj[key]);
  }
  return result;
}

/**
 * Formats JSON with customizable indent spacing and key sorting.
 */
export function formatJson(
  jsonStr: string,
  indent: number | string = 2,
  sortKeys: boolean = false
): string {
  if (!jsonStr || !jsonStr.trim()) return '';
  const parsed = JSON.parse(jsonStr);
  const data = sortKeys ? sortJsonKeys(parsed) : parsed;
  const spacer = typeof indent === 'number' ? indent : indent === 'tab' ? '\t' : 2;
  return JSON.stringify(data, null, spacer);
}

/**
 * Minifies JSON by stripping all indentation and formatting whitespace.
 */
export function minifyJson(jsonStr: string): string {
  if (!jsonStr || !jsonStr.trim()) return '';
  const parsed = JSON.parse(jsonStr);
  return JSON.stringify(parsed);
}

/**
 * Escapes quotes, backslashes, and control characters in a JSON string
 * so it can be safely copy-pasted as a programming string literal.
 */
export function escapeJson(jsonStr: string): string {
  if (!jsonStr) return '';
  return jsonStr
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Reverses escaping of string literal characters back into raw JSON format.
 */
export function unescapeJson(jsonStr: string): string {
  if (!jsonStr) return '';
  return jsonStr
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Converts a JS object/value to YAML recursively.
 */
export function jsonToYaml(obj: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);

  if (obj === null) return 'null';
  if (typeof obj === 'undefined') return '';
  
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (obj.includes('\n')) {
        return `|\n${obj.split('\n').map(line => ' '.repeat(indent + 2) + line).join('\n')}`;
      }
      if (/[#:*?{}|[\]&*!%@`]/.test(obj) || obj === 'true' || obj === 'false' || obj === 'null' || !isNaN(Number(obj))) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map(item => {
        const val = jsonToYaml(item, indent + 2);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return `${spaces}- ${val.trimStart()}`;
        }
        return `${spaces}- ${val.trim()}`;
      })
      .join('\n');
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  return keys
    .map(key => {
      const val = obj[key];
      const keyStr = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
      
      if (val === null) {
        return `${spaces}${keyStr}: null`;
      }
      if (typeof val === 'object') {
        if (Array.isArray(val) && val.length === 0) {
          return `${spaces}${keyStr}: []`;
        }
        if (!Array.isArray(val) && Object.keys(val).length === 0) {
          return `${spaces}${keyStr}: {}`;
        }
        return `${spaces}${keyStr}:\n${jsonToYaml(val, indent + 2)}`;
      }
      return `${spaces}${keyStr}: ${jsonToYaml(val, indent + 2)}`;
    })
    .join('\n');
}

/**
 * Safe, browser-first YAML parser for standard developer JSON/YAML configurations.
 */
export function yamlToJson(yamlStr: string): string {
  if (!yamlStr || !yamlStr.trim()) return '{}';

  const lines = yamlStr.split(/\r?\n/);
  const root: any = {};
  
  // Track stack of levels
  // level: indentation spaces, value: reference to object or array, type: 'object' | 'array'
  const stack: { indent: number; value: any; type: 'object' | 'array'; lastKey?: string }[] = [
    { indent: -1, value: root, type: 'object' }
  ];

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = rawLine.search(/\S/);
    
    // Pop items off stack until we find the parent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    // Check if line is a list item: "- value" or "- key: value"
    if (trimmed.startsWith('-')) {
      const rest = trimmed.slice(1).trim();
      
      // If current level is not an array, initialize it or change it
      if (current.type !== 'array') {
        // Find parent object and overwrite parent key with array
        if (stack.length > 1) {
          const parent = stack[stack.length - 2];
          const lastKey = parent.lastKey;
          if (lastKey) {
            parent.value[lastKey] = [];
            current.value = parent.value[lastKey];
            current.type = 'array';
          }
        }
      }

      if (rest.includes(':')) {
        // Nested object inside array item: "- key: value"
        const colonIdx = rest.indexOf(':');
        const key = rest.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
        const valStr = rest.slice(colonIdx + 1).trim();
        const objItem: any = {};
        
        current.value.push(objItem);
        
        let parsedVal: any = parseYamlValue(valStr);
        objItem[key] = parsedVal;
        
        // Push this objItem to stack so nested keys can anchor to it
        stack.push({ indent: indent + 2, value: objItem, type: 'object', lastKey: key });
      } else {
        // Scalar value in array: "- item"
        current.value.push(parseYamlValue(rest));
      }
    } else if (trimmed.includes(':')) {
      // It's a key-value mapping: "key: value" or "key:"
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      const valStr = trimmed.slice(colonIdx + 1).trim();

      if (current.type !== 'object') {
        // Force it to be an object if key-value is encountered
        if (stack.length > 1) {
          const parent = stack[stack.length - 2];
          const lastKey = parent.lastKey;
          if (lastKey) {
            parent.value[lastKey] = {};
            current.value = parent.value[lastKey];
            current.type = 'object';
          }
        }
      }

      current.lastKey = key;

      if (valStr === '' || valStr === '|' || valStr === '>') {
        // Nested object/array or block scalar
        const newObj = {};
        current.value[key] = newObj;
        stack.push({ indent: indent, value: newObj, type: 'object', lastKey: key });
      } else {
        current.value[key] = parseYamlValue(valStr);
      }
    }
  }

  return JSON.stringify(root, null, 2);
}

function parseYamlValue(valStr: string): any {
  valStr = valStr.trim();
  if (!valStr || valStr === 'null' || valStr === '~') return null;
  if (valStr === 'true') return true;
  if (valStr === 'false') return false;
  
  // Strip outer quotes if any
  if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
    return valStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  
  const num = Number(valStr);
  if (!isNaN(num) && valStr !== '') return num;
  
  return valStr;
}

/**
 * Converts JS Object to XML string recursively.
 */
export function jsonToXml(obj: any, rootName: string = 'root', indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  if (obj === null) return `${spaces}<${rootName} nil="true" />`;
  if (typeof obj !== 'object') {
    const val = String(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `${spaces}<${rootName}>${val}</${rootName}>`;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => jsonToXml(item, rootName, indent)).join('\n');
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return `${spaces}<${rootName} />`;

  const children = keys
    .map(key => {
      const tagName = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const val = obj[key];
      if (Array.isArray(val)) {
        return jsonToXml(val, tagName, indent + 2);
      }
      return jsonToXml(val, tagName, indent + 2);
    })
    .join('\n');

  return `${spaces}<${rootName}>\n${children}\n${spaces}</${rootName}>`;
}

/**
 * Converts XML string to JSON using browser native DOMParser.
 */
export function xmlToJson(xmlStr: string): string {
  if (!xmlStr || !xmlStr.trim()) return '{}';

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent || 'XML Parsing Error');
  }

  function parseNode(node: Node): any {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue?.trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const obj: any = {};

    // Attributes
    if (element.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        obj['@attributes'][attr.nodeName] = attr.nodeValue;
      }
    }

    // Process children
    const childNodes = Array.from(element.childNodes);
    const activeChildren = childNodes.filter(c => 
      c.nodeType === Node.ELEMENT_NODE || 
      (c.nodeType === Node.TEXT_NODE && c.nodeValue?.trim())
    );

    if (activeChildren.length === 1 && activeChildren[0].nodeType === Node.TEXT_NODE) {
      const val = activeChildren[0].nodeValue?.trim() || '';
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (val === 'null') return null;
      if (!isNaN(Number(val)) && val !== '') return Number(val);
      return val;
    }

    let hasElementChild = false;
    for (const child of activeChildren) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        hasElementChild = true;
        const name = child.nodeName;
        const val = parseNode(child);

        if (obj[name] === undefined) {
          obj[name] = val;
        } else {
          if (!Array.isArray(obj[name])) {
            obj[name] = [obj[name]];
          }
          obj[name].push(val);
        }
      }
    }

    if (!hasElementChild && Object.keys(obj).length === 0) {
      return '';
    }

    return obj;
  }

  const root = xmlDoc.documentElement;
  const result = {
    [root.nodeName]: parseNode(root)
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Converts a JSON string to CSV format.
 */
export function jsonToCsv(jsonStr: string): string {
  if (!jsonStr || !jsonStr.trim()) return '';

  const parsed = JSON.parse(jsonStr);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  if (arr.length === 0) return '';

  // Gather unique headers
  const headersSet = new Set<string>();
  arr.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(k => headersSet.add(k));
    }
  });
  
  const headers = Array.from(headersSet);
  if (headers.length === 0) return '';

  const csvRows = [];
  
  // Headers row
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const item of arr) {
    const row = headers.map(header => {
      const val = item ? item[header] : '';
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Evaluates a JS query expression against the parsed JSON object.
 */
export function filterJson(obj: any, query: string): any {
  if (!query || !query.trim()) return obj;

  let formattedQuery = query.trim();
  if (formattedQuery.startsWith('$')) {
    formattedQuery = formattedQuery.slice(1);
  }
  if (formattedQuery.startsWith('.')) {
    formattedQuery = formattedQuery.slice(1);
  }

  if (!formattedQuery) return obj;

  try {
    // Try wrapping inside a function evaluation
    const fn = new Function('$', `try { return $?.${formattedQuery}; } catch(e) { return undefined; }`);
    const result = fn(obj);
    if (result === undefined) {
      // Try direct evaluation
      const fnDirect = new Function('$', `try { return ${formattedQuery}; } catch(e) { return undefined; }`);
      return fnDirect(obj);
    }
    return result;
  } catch (err: any) {
    return `Query Error: ${err.message}`;
  }
}
