export interface SchemaGenOptions {
  draft?: 'draft-04' | 'draft-07' | 'draft-2019-09';
  title?: string;
  description?: string;
  requiredByDefault?: boolean;
  detectFormats?: boolean;
  includeDescriptions?: boolean;
  includeExamples?: boolean;
  mergeArraySchemas?: boolean;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  keyword: string;
}

/**
 * Detects standard formats for string fields
 */
function detectStringFormat(val: string): string | null {
  // email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(val)) return 'email';

  // date-time (ISO 8601)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(val)) return 'date';

  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (dateTimeRegex.test(val)) return 'date-time';

  // uuid
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) return 'uuid';

  // ipv4
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipv4Regex.test(val)) {
    const parts = val.split('.');
    if (parts.every(p => {
      const num = parseInt(p, 10);
      return num >= 0 && num <= 255;
    })) return 'ipv4';
  }

  // ipv6
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  if (ipv6Regex.test(val)) return 'ipv6';

  // uri
  const uriRegex = /^(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]$/i;
  if (uriRegex.test(val)) return 'uri';

  return null;
}

/**
 * Generates description metadata based on property names
 */
function generateDescription(key: string): string {
  let words = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  if (words === 'id') return 'The unique identifier';
  
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);
  return `The ${words.toLowerCase()} property`;
}

/**
 * Deep equality checker for objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Merge multiple schemas into a unified schema
 */
function mergeSchemas(schemas: any[], options: SchemaGenOptions): any {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];

  const activeSchemas = schemas.filter(s => s && Object.keys(s).length > 0);
  if (activeSchemas.length === 0) return {};
  if (activeSchemas.length === 1) return activeSchemas[0];

  const types = Array.from(new Set(activeSchemas.map(s => s.type).filter(Boolean)));
  
  if (types.length === 1) {
    const type = types[0];
    if (type === 'object') {
      const merged: any = { type: 'object' };
      const allProps: Record<string, any[]> = {};
      
      for (const s of activeSchemas) {
        if (s.properties) {
          for (const key of Object.keys(s.properties)) {
            if (!allProps[key]) allProps[key] = [];
            allProps[key].push(s.properties[key]);
          }
        }
      }

      const properties: Record<string, any> = {};
      for (const key of Object.keys(allProps)) {
        properties[key] = mergeSchemas(allProps[key], options);
      }
      merged.properties = properties;

      // Determine required properties (intersection of required properties across all objects)
      const requiredSets = activeSchemas.map(s => new Set<string>(s.required || []));
      if (requiredSets.length > 0) {
        const intersection = Array.from(requiredSets[0]).filter(prop => 
          requiredSets.every(set => set.has(prop))
        );
        if (intersection.length > 0) {
          merged.required = intersection;
        }
      }

      return merged;
    }

    if (type === 'array') {
      const itemSchemas = activeSchemas.map(s => s.items).filter(Boolean);
      return {
        type: 'array',
        items: mergeSchemas(itemSchemas, options)
      };
    }

    const base = { ...activeSchemas[0] };
    const formats = Array.from(new Set(activeSchemas.map(s => s.format).filter(Boolean)));
    if (formats.length === 1) {
      base.format = formats[0];
    } else {
      delete base.format;
    }
    return base;
  }

  const hasComplex = activeSchemas.some(s => s.type === 'object' || s.type === 'array');
  if (hasComplex) {
    return { anyOf: activeSchemas };
  } else {
    return { type: types };
  }
}

/**
 * Infer Schema recursively for a parsed JSON structure
 */
function inferSchema(val: any, options: SchemaGenOptions, keyPath: string[] = []): any {
  if (val === null) {
    return { type: 'null' };
  }
  const type = typeof val;
  if (type === 'boolean') {
    return { type: 'boolean' };
  }
  if (type === 'number') {
    const isInteger = Number.isInteger(val);
    const schema: any = { type: isInteger ? 'integer' : 'number' };
    if (options.includeExamples) {
      schema.examples = [val];
    }
    return schema;
  }
  if (type === 'string') {
    const schema: any = { type: 'string' };
    if (options.detectFormats) {
      const format = detectStringFormat(val);
      if (format) {
        schema.format = format;
      }
    }
    if (options.includeExamples) {
      schema.examples = [val];
    }
    return schema;
  }
  if (Array.isArray(val)) {
    const schema: any = { type: 'array' };
    if (val.length === 0) {
      schema.items = {};
    } else if (options.mergeArraySchemas) {
      const itemSchemas = val.map((item, idx) => inferSchema(item, options, [...keyPath, `[${idx}]`]));
      schema.items = mergeSchemas(itemSchemas, options);
    } else {
      schema.items = inferSchema(val[0], options, [...keyPath, '[0]']);
    }
    return schema;
  }
  if (type === 'object') {
    const schema: any = { type: 'object' };
    const properties: Record<string, any> = {};
    const required: string[] = [];

    const keys = Object.keys(val);
    for (const key of keys) {
      const propVal = val[key];
      const propSchema = inferSchema(propVal, options, [...keyPath, key]);
      
      if (options.includeDescriptions) {
        propSchema.description = generateDescription(key);
      }
      
      properties[key] = propSchema;
      if (options.requiredByDefault) {
        required.push(key);
      }
    }

    if (keys.length > 0) {
      schema.properties = properties;
      if (required.length > 0) {
        schema.required = required;
      }
    }
    return schema;
  }

  return {};
}

/**
 * Top level generator function
 */
export function compileJsonSchema(jsonStr: string, options: SchemaGenOptions): string {
  if (!jsonStr || !jsonStr.trim()) return '';
  const parsed = JSON.parse(jsonStr);
  const inferred = inferSchema(parsed, options);

  const draftUrls: Record<string, string> = {
    'draft-04': 'http://json-schema.org/draft-04/schema#',
    'draft-07': 'http://json-schema.org/draft-07/schema#',
    'draft-2019-09': 'http://json-schema.org/draft/2019-09/schema#'
  };

  const schemaMeta: any = {
    $schema: draftUrls[options.draft || 'draft-07'],
    $id: 'https://example.com/schema.json',
    title: options.title || 'Generated Schema',
    description: options.description || 'Generated by useUtils.com',
    ...inferred
  };

  return JSON.stringify(schemaMeta, null, 2);
}

/**
 * Get internal type name matching JSON Schema specification
 */
function getJsonType(val: any): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  const type = typeof val;
  if (type === 'number') return 'number';
  if (type === 'string') return 'string';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  return 'unknown';
}

/**
 * Validates a string value against standard JSON Schema formats
 */
function checkStringFormat(val: string, format: string): boolean {
  if (typeof val !== 'string') return false;

  switch (format) {
    case 'email':
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    case 'date-time':
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(val);
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    case 'ipv4':
      const ipv4Parts = val.split('.');
      if (ipv4Parts.length !== 4) return false;
      return ipv4Parts.every(p => {
        const num = parseInt(p, 10);
        return !isNaN(num) && num >= 0 && num <= 255 && String(num) === p;
      });
    case 'ipv6':
      return /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/.test(val);
    case 'uri':
      try {
        new URL(val);
        return true;
      } catch (err) {
        return false;
      }
    default:
      return true;
  }
}

/**
 * Validates parsed JSON object against parsed JSON Schema object recursively
 */
export function validateJsonAgainstSchema(json: any, schema: any): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  
  function validate(val: any, s: any, path: string) {
    if (s === true) return;
    if (s === false) {
      errors.push({ path, message: 'Value is not allowed by schema (false)', keyword: 'schema' });
      return;
    }
    if (!s || typeof s !== 'object') return;

    // 1. Type validation
    if (s.type) {
      const allowedTypes = Array.isArray(s.type) ? s.type : [s.type];
      const actualType = getJsonType(val);
      
      const typeMatches = allowedTypes.some((t: string) => {
        if (t === 'integer') {
          return actualType === 'number' && Number.isInteger(val);
        }
        return t === actualType;
      });

      if (!typeMatches) {
        errors.push({
          path,
          message: `Expected type ${allowedTypes.join(' or ')}, but got ${actualType}`,
          keyword: 'type'
        });
        return;
      }
    }

    // 2. Const validation
    if (s.const !== undefined) {
      if (!deepEqual(val, s.const)) {
        errors.push({
          path,
          message: `Must be exactly equal to constant: ${JSON.stringify(s.const)}`,
          keyword: 'const'
        });
      }
    }

    // 3. Enum validation
    if (s.enum !== undefined && Array.isArray(s.enum)) {
      const matchesEnum = s.enum.some((item: any) => deepEqual(val, item));
      if (!matchesEnum) {
        errors.push({
          path,
          message: `Must be one of the allowed values: ${s.enum.map((e: any) => JSON.stringify(e)).join(', ')}`,
          keyword: 'enum'
        });
      }
    }

    // 4. Object properties validation
    if (s.type === 'object' || (typeof val === 'object' && val !== null && !Array.isArray(val))) {
      // Required properties
      if (s.required && Array.isArray(s.required)) {
        for (const reqKey of s.required) {
          if (val[reqKey] === undefined) {
            errors.push({
              path: path === '$' ? `$.${reqKey}` : `${path}.${reqKey}`,
              message: `Missing required property '${reqKey}'`,
              keyword: 'required'
            });
          }
        }
      }

      // Property specifications
      if (s.properties && typeof s.properties === 'object') {
        for (const key of Object.keys(s.properties)) {
          if (val[key] !== undefined) {
            validate(val[key], s.properties[key], path === '$' ? `$.${key}` : `${path}.${key}`);
          }
        }
      }

      // Additional properties checker
      if (s.additionalProperties !== undefined) {
        const definedProps = new Set(Object.keys(s.properties || {}));
        const valKeys = Object.keys(val);
        for (const k of valKeys) {
          if (!definedProps.has(k)) {
            if (s.additionalProperties === false) {
              errors.push({
                path: path === '$' ? `$.${k}` : `${path}.${k}`,
                message: `Additional property '${k}' is not allowed in this object`,
                keyword: 'additionalProperties'
              });
            } else if (typeof s.additionalProperties === 'object') {
              validate(val[k], s.additionalProperties, path === '$' ? `$.${k}` : `${path}.${k}`);
            }
          }
        }
      }
    }

    // 5. Array validations
    if (s.type === 'array' || Array.isArray(val)) {
      if (s.minItems !== undefined && val.length < s.minItems) {
        errors.push({
          path,
          message: `Array has too few items (minimum: ${s.minItems}, actual: ${val.length})`,
          keyword: 'minItems'
        });
      }
      if (s.maxItems !== undefined && val.length > s.maxItems) {
        errors.push({
          path,
          message: `Array has too many items (maximum: ${s.maxItems}, actual: ${val.length})`,
          keyword: 'maxItems'
        });
      }
      if (s.uniqueItems === true) {
        const hasDuplicates = val.some((item: any, index: number) => {
          return val.findIndex((other: any) => deepEqual(item, other)) !== index;
        });
        if (hasDuplicates) {
          errors.push({
            path,
            message: `Array items must be unique, but duplicates were found`,
            keyword: 'uniqueItems'
          });
        }
      }

      if (s.items) {
        if (Array.isArray(s.items)) {
          for (let i = 0; i < s.items.length; i++) {
            if (val[i] !== undefined) {
              validate(val[i], s.items[i], `${path}[${i}]`);
            }
          }
          if (s.additionalItems !== undefined) {
            if (val.length > s.items.length) {
              if (s.additionalItems === false) {
                errors.push({
                  path,
                  message: `Array contains additional items beyond the tuple definition (maximum: ${s.items.length})`,
                  keyword: 'additionalItems'
                });
              } else if (typeof s.additionalItems === 'object') {
                for (let i = s.items.length; i < val.length; i++) {
                  validate(val[i], s.additionalItems, `${path}[${i}]`);
                }
              }
            }
          }
        } else {
          for (let i = 0; i < val.length; i++) {
            validate(val[i], s.items, `${path}[${i}]`);
          }
        }
      }
    }

    // 6. String validations
    if (s.type === 'string' || typeof val === 'string') {
      if (s.minLength !== undefined && val.length < s.minLength) {
        errors.push({
          path,
          message: `String length is too short (minimum: ${s.minLength}, actual: ${val.length})`,
          keyword: 'minLength'
        });
      }
      if (s.maxLength !== undefined && val.length > s.maxLength) {
        errors.push({
          path,
          message: `String length is too long (maximum: ${s.maxLength}, actual: ${val.length})`,
          keyword: 'maxLength'
        });
      }
      if (s.pattern !== undefined) {
        try {
          const regex = new RegExp(s.pattern);
          if (!regex.test(val)) {
            errors.push({
              path,
              message: `String does not match required pattern: ${s.pattern}`,
              keyword: 'pattern'
            });
          }
        } catch (err) {}
      }
      if (s.format !== undefined) {
        const matchesFormat = checkStringFormat(val, s.format);
        if (!matchesFormat) {
          errors.push({
            path,
            message: `String does not match format '${s.format}'`,
            keyword: 'format'
          });
        }
      }
    }

    // 7. Numeric validations
    if (s.type === 'number' || s.type === 'integer' || typeof val === 'number') {
      if (s.minimum !== undefined && val < s.minimum) {
        errors.push({
          path,
          message: `Value must be greater than or equal to ${s.minimum} (actual: ${val})`,
          keyword: 'minimum'
        });
      }
      if (s.maximum !== undefined && val > s.maximum) {
        errors.push({
          path,
          message: `Value must be less than or equal to ${s.maximum} (actual: ${val})`,
          keyword: 'maximum'
        });
      }
      if (s.exclusiveMinimum !== undefined) {
        const valExMin = typeof s.exclusiveMinimum === 'boolean' ? s.minimum : s.exclusiveMinimum;
        if (valExMin !== undefined && val <= valExMin) {
          errors.push({
            path,
            message: `Value must be strictly greater than ${valExMin} (actual: ${val})`,
            keyword: 'exclusiveMinimum'
          });
        }
      }
      if (s.exclusiveMaximum !== undefined) {
        const valExMax = typeof s.exclusiveMaximum === 'boolean' ? s.maximum : s.exclusiveMaximum;
        if (valExMax !== undefined && val >= valExMax) {
          errors.push({
            path,
            message: `Value must be strictly less than ${valExMax} (actual: ${val})`,
            keyword: 'exclusiveMaximum'
          });
        }
      }
      if (s.multipleOf !== undefined && s.multipleOf > 0) {
        const quotient = val / s.multipleOf;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
          errors.push({
            path,
            message: `Value must be a multiple of ${s.multipleOf} (actual: ${val})`,
            keyword: 'multipleOf'
          });
        }
      }
    }

    // 8. Logical Combinators
    if (s.allOf && Array.isArray(s.allOf)) {
      s.allOf.forEach((subSchema: any) => {
        validate(val, subSchema, path);
      });
    }

    if (s.anyOf && Array.isArray(s.anyOf)) {
      const subErrors: SchemaValidationError[][] = [];
      const passed = s.anyOf.some((subSchema: any) => {
        const innerErrors = validateJsonAgainstSchema(val, subSchema);
        subErrors.push(innerErrors);
        return innerErrors.length === 0;
      });

      if (!passed) {
        errors.push({
          path,
          message: `Must match at least one sub-schema in 'anyOf'`,
          keyword: 'anyOf'
        });
      }
    }

    if (s.oneOf && Array.isArray(s.oneOf)) {
      let matchCount = 0;
      s.oneOf.forEach((subSchema: any) => {
        const innerErrors = validateJsonAgainstSchema(val, subSchema);
        if (innerErrors.length === 0) {
          matchCount++;
        }
      });

      if (matchCount !== 1) {
        errors.push({
          path,
          message: `Must match exactly one sub-schema in 'oneOf' (matched: ${matchCount})`,
          keyword: 'oneOf'
        });
      }
    }

    if (s.not !== undefined) {
      const innerErrors = validateJsonAgainstSchema(val, s.not);
      if (innerErrors.length === 0) {
        errors.push({
          path,
          message: `Must NOT match the sub-schema in 'not'`,
          keyword: 'not'
        });
      }
    }
  }

  validate(json, schema, '$');
  return errors;
}
