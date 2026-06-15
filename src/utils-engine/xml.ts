export interface XmlValidationResult {
  isValid: boolean;
  error: string | null;
  line?: number;
  column?: number;
}

export interface XmlToJsonOptions {
  attributePrefix?: string;
  textKey?: string;
  ignoreAttributes?: boolean;
  ignoreNamespaces?: boolean;
  forceArrayKeys?: string[];
  trimText?: boolean;
  typeCast?: boolean;
}

export interface JsonToXmlOptions {
  rootName?: string;
  attributePrefix?: string;
  textKey?: string;
  indent?: string | number;
  ignoreAttributes?: boolean;
  minify?: boolean;
}

/**
 * Validates XML string and extracts detailed parse errors.
 */
export function validateXml(xmlStr: string): XmlValidationResult {
  if (!xmlStr || !xmlStr.trim()) {
    return { isValid: true, error: null };
  }

  if (typeof DOMParser === 'undefined') {
    // SSR Fallback
    return { isValid: true, error: null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    const errorText = parserError.textContent || 'XML Parsing Error';
    let line: number | undefined;
    let column: number | undefined;

    // Chrome: "error on line 5 at column 12: ..."
    // Firefox: "XML Parsing Error: ... Location: ... Line Number 5, Column 12"
    // Safari/Edge: standard messages
    const lineColMatch = errorText.match(/line (\d+)(?: at column (\d+)|, column (\d+))?/i) ||
                        errorText.match(/Line Number (\d+), Column (\d+)/i) ||
                        errorText.match(/:(\d+):(\d+)/);
    
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      const colStr = lineColMatch[2] || lineColMatch[3];
      if (colStr) {
        column = parseInt(colStr, 10);
      }
    }

    return {
      isValid: false,
      error: errorText.split('\n')[0],
      line,
      column
    };
  }

  return { isValid: true, error: null };
}

/**
 * Auto-closes unclosed tags at the end of the string.
 */
export function repairXml(xmlStr: string): string {
  if (!xmlStr) return '';

  const tagRegex = /<(\/?[a-zA-Z0-9_:-]+)([^>]*?)>/g;
  const stack: string[] = [];
  let match;

  while ((match = tagRegex.exec(xmlStr)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isClosing = tagName.startsWith('/');
    const isSelfClosing = fullTag.endsWith('/>') || match[2].trim().endsWith('/');

    if (isSelfClosing) continue;

    if (isClosing) {
      const cleanTagName = tagName.slice(1);
      const lastIdx = stack.lastIndexOf(cleanTagName);
      if (lastIdx !== -1) {
        stack.splice(lastIdx);
      }
    } else {
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    let closingTags = '';
    for (let i = stack.length - 1; i >= 0; i--) {
      closingTags += `\n</${stack[i]}>`;
    }
    return xmlStr.trim() + closingTags;
  }

  return xmlStr;
}

/**
 * Strips namespace prefixes from element/attribute names if requested.
 */
function cleanName(name: string, ignoreNamespaces: boolean): string {
  if (ignoreNamespaces && name.includes(':')) {
    return name.split(':').slice(1).join(':');
  }
  return name;
}

/**
 * Coerces string values to native types.
 */
function coerceValue(val: string): any {
  const trimmed = val.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return val;
}

/**
 * Converts XML string to JSON string using custom translation rules.
 */
export function xmlToJson(xmlStr: string, options: XmlToJsonOptions = {}): string {
  if (!xmlStr || !xmlStr.trim()) return '{}';

  if (typeof DOMParser === 'undefined') {
    return '{}';
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent || 'XML parsing error');
  }

  const attrPrefix = options.attributePrefix ?? '@';
  const textKey = options.textKey ?? '#text';
  const ignoreAttrs = options.ignoreAttributes ?? false;
  const ignoreNamespaces = options.ignoreNamespaces ?? false;
  const forceArrays = options.forceArrayKeys ?? [];
  const trimText = options.trimText ?? true;
  const typeCast = options.typeCast ?? true;

  function parseNode(node: Node): any {
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue ?? '';
      return trimText ? val.trim() : val;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const obj: any = {};

    // 1. Process Attributes
    if (!ignoreAttrs && element.attributes.length > 0) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const attrName = cleanName(attr.nodeName, ignoreNamespaces);
        // Skip namespace declaration attributes themselves if namespace ignored
        if (ignoreNamespaces && (attrName === 'xmlns' || attrName.startsWith('xmlns:'))) {
          continue;
        }
        const attrVal = typeCast ? coerceValue(attr.nodeValue ?? '') : (attr.nodeValue ?? '');
        obj[`${attrPrefix}${attrName}`] = attrVal;
      }
    }

    // 2. Process Children
    const childNodes = Array.from(element.childNodes);
    const activeChildren = childNodes.filter(c => 
      c.nodeType === Node.ELEMENT_NODE || 
      (c.nodeType === Node.TEXT_NODE && (c.nodeValue ?? '').trim() !== '')
    );

    // If it's a leaf node with only text, return the value directly unless there are attributes
    if (activeChildren.length === 1 && activeChildren[0].nodeType === Node.TEXT_NODE) {
      const textVal = activeChildren[0].nodeValue ?? '';
      const finalVal = trimText ? textVal.trim() : textVal;
      const parsedVal = typeCast ? coerceValue(finalVal) : finalVal;

      if (Object.keys(obj).length === 0) {
        return parsedVal;
      } else {
        obj[textKey] = parsedVal;
        return obj;
      }
    }

    // Process nested tags
    let hasElementChild = false;
    for (const child of activeChildren) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        hasElementChild = true;
        const rawTagName = child.nodeName;
        const tagName = cleanName(rawTagName, ignoreNamespaces);
        const childVal = parseNode(child);

        const shouldForceArray = forceArrays.includes(tagName);

        if (obj[tagName] === undefined) {
          obj[tagName] = shouldForceArray ? [childVal] : childVal;
        } else {
          if (!Array.isArray(obj[tagName])) {
            obj[tagName] = [obj[tagName]];
          }
          obj[tagName].push(childVal);
        }
      } else if (child.nodeType === Node.TEXT_NODE) {
        // Mixed content: elements and stray text nodes
        const txtVal = trimText ? (child.nodeValue ?? '').trim() : (child.nodeValue ?? '');
        if (txtVal !== '') {
          if (obj[textKey] === undefined) {
            obj[textKey] = typeCast ? coerceValue(txtVal) : txtVal;
          } else {
            if (!Array.isArray(obj[textKey])) {
              obj[textKey] = [obj[textKey]];
            }
            obj[textKey].push(typeCast ? coerceValue(txtVal) : txtVal);
          }
        }
      }
    }

    if (!hasElementChild && Object.keys(obj).length === 0) {
      return '';
    }

    // Ensure forceArray keys that were absent or scalar are arrays
    for (const key of forceArrays) {
      if (obj[key] !== undefined && !Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
    }

    return obj;
  }

  const root = xmlDoc.documentElement;
  const rootName = cleanName(root.nodeName, ignoreNamespaces);
  const result = {
    [rootName]: parseNode(root)
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Escapes special XML characters.
 */
function escapeXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts JS object/value to XML string.
 */
export function jsonToXml(jsonObj: any, options: JsonToXmlOptions = {}): string {
  const rootName = options.rootName ?? 'root';
  const attrPrefix = options.attributePrefix ?? '@';
  const textKey = options.textKey ?? '#text';
  const ignoreAttrs = options.ignoreAttributes ?? false;
  const minify = options.minify ?? false;
  const rawIndent = options.indent ?? 2;
  const indentSpacer = typeof rawIndent === 'number' ? ' '.repeat(rawIndent) : (rawIndent === 'tab' ? '\t' : '  ');

  function buildXml(obj: any, tagName: string, depth: number): string {
    const spaces = minify ? '' : indentSpacer.repeat(depth);
    const newline = minify ? '' : '\n';

    if (obj === null || obj === undefined) {
      return `${spaces}<${tagName} />`;
    }

    if (typeof obj !== 'object') {
      const esc = escapeXml(String(obj));
      return `${spaces}<${tagName}>${esc}</${tagName}>`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => buildXml(item, tagName, depth)).join(newline);
    }

    // Check for attribute keys vs child nodes
    const attrPairs: string[] = [];
    const childrenKeys: string[] = [];
    let textVal: any = null;

    Object.keys(obj).forEach(key => {
      if (!ignoreAttrs && key.startsWith(attrPrefix)) {
        const attrName = key.slice(attrPrefix.length);
        const attrVal = String(obj[key]);
        attrPairs.push(`${attrName}="${escapeXml(attrVal)}"`);
      } else if (key === textKey) {
        textVal = obj[key];
      } else {
        childrenKeys.push(key);
      }
    });

    const attrStr = attrPairs.length > 0 ? ' ' + attrPairs.join(' ') : '';

    // If there are no children and no text value
    if (childrenKeys.length === 0 && textVal === null) {
      return `${spaces}<${tagName}${attrStr} />`;
    }

    // Leaf element with only text and attributes
    if (childrenKeys.length === 0 && textVal !== null) {
      const escText = escapeXml(String(textVal));
      return `${spaces}<${tagName}${attrStr}>${escText}</${tagName}>`;
    }

    // Element with child elements
    const childrenXml: string[] = [];
    
    // Add text value first if present
    if (textVal !== null) {
      childrenXml.push(`${spaces}${indentSpacer}${escapeXml(String(textVal))}`);
    }

    childrenKeys.forEach(key => {
      const val = obj[key];
      childrenXml.push(buildXml(val, key, depth + 1));
    });

    const innerXml = childrenXml.join(newline);
    return `${spaces}<${tagName}${attrStr}>${newline}${innerXml}${newline}${spaces}</${tagName}>`;
  }

  // Find the true root key in JSON
  let xmlResult = '';
  if (jsonObj && typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
    const keys = Object.keys(jsonObj);
    if (keys.length === 1) {
      // Normal JSON translated from XML which has a single root node
      xmlResult = buildXml(jsonObj[keys[0]], keys[0], 0);
    } else {
      // Multiple root keys or flat object, wrap in a designated root
      xmlResult = buildXml(jsonObj, rootName, 0);
    }
  } else {
    xmlResult = buildXml(jsonObj, rootName, 0);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>${minify ? '' : '\n'}${xmlResult}`;
}

/**
 * Generate structural Go structures, Python dataclasses, and JS parser code from an object.
 */
export function generateCodeSnippets(parsedObj: any, rootName: string = 'Root'): Record<string, string> {
  const data = (parsedObj && typeof parsedObj === 'object' && !Array.isArray(parsedObj) && Object.keys(parsedObj).length === 1)
    ? parsedObj[Object.keys(parsedObj)[0]]
    : parsedObj;
  
  const rootTagName = (parsedObj && typeof parsedObj === 'object' && !Array.isArray(parsedObj) && Object.keys(parsedObj).length === 1)
    ? Object.keys(parsedObj)[0]
    : 'root';

  // 1. Go Structs Generator
  const goStructs: string[] = [];
  const processedGoTypes = new Set<string>();

  function toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  function determineGoType(val: any, fieldName: string): string {
    if (val === null || val === undefined) return 'string';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'int' : 'float64';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]string';
      const itemType = determineGoType(val[0], fieldName);
      return `[]${itemType}`;
    }
    if (typeof val === 'object') {
      const typeName = toPascalCase(fieldName);
      generateGoStruct(val, typeName);
      return typeName;
    }
    return 'string';
  }

  function generateGoStruct(obj: any, structName: string) {
    if (processedGoTypes.has(structName)) return;
    processedGoTypes.add(structName);

    const fields: string[] = [];
    Object.keys(obj).forEach(key => {
      const isAttr = key.startsWith('@');
      const cleanKey = isAttr ? key.slice(1) : key;
      
      let goFieldName = toPascalCase(cleanKey);
      if (goFieldName === structName) {
        goFieldName += 'Field'; // avoid recursion collision in name
      }
      
      const val = obj[key];
      const goType = determineGoType(val, cleanKey);
      
      let tag = `xml:"${cleanKey}`;
      if (isAttr) {
        tag += ',attr';
      }
      tag += `" json:"${cleanKey}"`;
      
      fields.push(`\t${goFieldName} ${goType} \`${tag}\``);
    });

    const structDef = `type ${structName} struct {\n${fields.join('\n')}\n}`;
    goStructs.unshift(structDef); // Put dependencies first
  }

  if (data && typeof data === 'object') {
    generateGoStruct(data, toPascalCase(rootTagName));
  } else {
    goStructs.push(`type ${toPascalCase(rootTagName)} struct {\n\tContent string \`xml:",chardata" json:"content"\`\n}`);
  }

  const goCode = `package main\n\nimport (\n\t"encoding/xml"\n\t"encoding/json"\n\t"fmt"\n)\n\n${goStructs.join('\n\n')}`;

  // 2. Python Dataclasses Generator
  const pyClasses: string[] = [];
  const processedPyTypes = new Set<string>();

  function determinePythonType(val: any, fieldName: string): string {
    if (val === null || val === undefined) return 'Optional[str]';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'int' : 'float';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return 'List[str]';
      const itemType = determinePythonType(val[0], fieldName);
      return `List[${itemType}]`;
    }
    if (typeof val === 'object') {
      const typeName = toPascalCase(fieldName);
      generatePythonClass(val, typeName);
      return typeName;
    }
    return 'str';
  }

  function generatePythonClass(obj: any, className: string) {
    if (processedPyTypes.has(className)) return;
    processedPyTypes.add(className);

    const fields: string[] = [];
    Object.keys(obj).forEach(key => {
      const isAttr = key.startsWith('@');
      const cleanKey = isAttr ? key.slice(1) : key;
      const pyFieldName = cleanKey.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      const val = obj[key];
      const pyType = determinePythonType(val, cleanKey);
      
      fields.push(`    ${pyFieldName}: ${pyType} # XML Name: ${key}`);
    });

    const classDef = `@dataclass\nclass ${className}:\n${fields.join('\n')}`;
    pyClasses.unshift(classDef);
  }

  if (data && typeof data === 'object') {
    generatePythonClass(data, toPascalCase(rootTagName));
  } else {
    pyClasses.push(`@dataclass\nclass ${toPascalCase(rootTagName)}:\n    content: str`);
  }

  const pyCode = `from dataclasses import dataclass\nfrom typing import List, Optional\nimport xml.etree.ElementTree as ET\nimport json\n\n${pyClasses.join('\n\n')}`;

  // 3. JavaScript Parser code
  const jsCode = `// Fetch and parse XML in the Browser using native Web APIs
async function fetchAndParseXml(url) {
  const response = await fetch(url);
  const xmlText = await response.text();
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  
  // Check for parser errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("XML Parsing Failed: " + parseError.textContent);
  }
  
  // Read root tag name
  const rootTagName = xmlDoc.documentElement.nodeName;
  console.log("Parsed root node:", rootTagName);
  
  // Extract simple field example
  const firstElement = xmlDoc.documentElement.firstElementChild;
  if (firstElement) {
    console.log(\`\${firstElement.nodeName} value:\`, firstElement.textContent);
  }
  
  return xmlDoc;
}

// Convert XML DOM element to raw JSON (simple implementation)
function elementToJson(element) {
  const obj = {};
  
  // Attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    obj["@" + attr.nodeName] = attr.nodeValue;
  }
  
  // Child Elements
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childVal = elementToJson(child);
      if (obj[child.nodeName] === undefined) {
        obj[child.nodeName] = childVal;
      } else {
        if (!Array.isArray(obj[child.nodeName])) {
          obj[child.nodeName] = [obj[child.nodeName]];
        }
        obj[child.nodeName].push(childVal);
      }
    } else if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) {
      if (Object.keys(obj).length === 0) {
        return child.nodeValue.trim();
      }
      obj["#text"] = child.nodeValue.trim();
    }
  }
  
  return obj;
}`;

  // 4. Java Class Model (Jackson Style)
  const javaClasses: string[] = [];
  const processedJavaTypes = new Set<string>();

  function determineJavaType(val: any, fieldName: string): string {
    if (val === null || val === undefined) return 'String';
    if (typeof val === 'boolean') return 'Boolean';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'Integer' : 'Double';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return 'List<String>';
      const itemType = determineJavaType(val[0], fieldName);
      return `List<${itemType}>`;
    }
    if (typeof val === 'object') {
      const typeName = toPascalCase(fieldName);
      generateJavaClass(val, typeName);
      return typeName;
    }
    return 'String';
  }

  function generateJavaClass(obj: any, className: string) {
    if (processedJavaTypes.has(className)) return;
    processedJavaTypes.add(className);

    const fields: string[] = [];
    Object.keys(obj).forEach(key => {
      const isAttr = key.startsWith('@');
      const cleanKey = isAttr ? key.slice(1) : key;
      const javaFieldName = cleanKey.replace(/[^a-zA-Z0-9_]/g, '');
      const val = obj[key];
      const javaType = determineJavaType(val, cleanKey);
      
      let annotation = '';
      if (isAttr) {
        annotation = `    @JacksonXmlProperty(isAttribute = true, localName = "${cleanKey}")\n`;
      } else {
        annotation = `    @JacksonXmlProperty(localName = "${cleanKey}")\n`;
      }
      
      fields.push(`${annotation}    private ${javaType} ${javaFieldName};`);
    });

    const classDef = `@JacksonXmlRootElement(localName = "${className.toLowerCase()}")\npublic class ${className} {\n${fields.join('\n\n')}\n}`;
    javaClasses.unshift(classDef);
  }

  if (data && typeof data === 'object') {
    generateJavaClass(data, toPascalCase(rootTagName));
  } else {
    javaClasses.push(`public class ${toPascalCase(rootTagName)} {\n    private String content;\n}`);
  }

  const javaCode = `import com.fasterxml.jackson.dataformat.xml.annotation.*;\nimport java.util.List;\n\n${javaClasses.join('\n\n')}`;

  return {
    go: goCode,
    python: pyCode,
    javascript: jsCode,
    java: javaCode
  };
}
