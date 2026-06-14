export interface CsvToJsonOptions {
  delimiter?: string;
  hasHeaders?: boolean;
  parseTypes?: boolean;
  outputStructure?: 'array' | '2d-array' | 'keyed';
}

export interface JsonToCsvOptions {
  delimiter?: string;
  hasHeaders?: boolean;
}

/**
 * Standard RFC 4180 CSV parser that correctly handles escaped quotes, newlines, and custom delimiters.
 */
export function parseCsvToRows(csv: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  if (!csv) return [];

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentVal += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          insideQuote = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentVal);
        currentVal = '';
        if (currentRow.length > 0 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        currentVal += char;
      }
    }
  }

  // Push remaining elements
  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Formats modular 2D string array data into standard CSV content.
 */
export function formatRowsToCsv(rows: string[][], delimiter: string = ','): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const cellStr = String(cell ?? '');
          // If cell contains delimiter, newline, carriage return, or double quote, we must escape it
          if (
            cellStr.includes(delimiter) ||
            cellStr.includes('\n') ||
            cellStr.includes('\r') ||
            cellStr.includes('"')
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(delimiter)
    )
    .join('\n');
}

/**
 * Converts CSV text to JSON with configurable shapes (Array of Objects, 2D Array, or Keyed Columns)
 * and column type detection (numbers, booleans, nulls).
 */
export function csvToJson(csv: string, options: CsvToJsonOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const hasHeaders = options.hasHeaders ?? true;
  const parseTypes = options.parseTypes ?? true;
  const outputStructure = options.outputStructure ?? 'array';

  const rows = parseCsvToRows(csv, delimiter);
  if (rows.length === 0) return '[]';

  const parseVal = (val: string) => {
    if (!parseTypes) return val;
    const trimmed = val.trim();
    if (trimmed === '') return '';
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (trimmed.toLowerCase() === 'null') return null;
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return num;
    return val;
  };

  if (outputStructure === '2d-array') {
    const data = rows.map(row => row.map(parseVal));
    return JSON.stringify(data, null, 2);
  }

  if (hasHeaders) {
    const headers = rows[0].map(h => h.trim() || 'column');
    const dataRows = rows.slice(1);
    
    // Ensure unique headers
    const uniqueHeaders: string[] = [];
    const headerCounts: Record<string, number> = {};
    for (const h of headers) {
      let finalHeader = h;
      if (headerCounts[h] !== undefined) {
        headerCounts[h]++;
        finalHeader = `${h}_${headerCounts[h]}`;
      } else {
        headerCounts[h] = 0;
      }
      uniqueHeaders.push(finalHeader);
    }

    if (outputStructure === 'keyed') {
      const result: Record<string, any[]> = {};
      uniqueHeaders.forEach(h => {
        result[h] = [];
      });
      for (const row of dataRows) {
        for (let colIdx = 0; colIdx < uniqueHeaders.length; colIdx++) {
          const header = uniqueHeaders[colIdx];
          const val = colIdx < row.length ? parseVal(row[colIdx]) : null;
          result[header].push(val);
        }
      }
      return JSON.stringify(result, null, 2);
    } else {
      // array of objects
      const result = dataRows.map(row => {
        const obj: Record<string, any> = {};
        for (let colIdx = 0; colIdx < uniqueHeaders.length; colIdx++) {
          const header = uniqueHeaders[colIdx];
          obj[header] = colIdx < row.length ? parseVal(row[colIdx]) : null;
        }
        return obj;
      });
      return JSON.stringify(result, null, 2);
    }
  } else {
    if (outputStructure === 'keyed') {
      const maxCols = Math.max(...rows.map(r => r.length), 0);
      const result: Record<string, any[]> = {};
      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        result[`column_${colIdx + 1}`] = [];
      }
      for (const row of rows) {
        for (let colIdx = 0; colIdx < maxCols; colIdx++) {
          const val = colIdx < row.length ? parseVal(row[colIdx]) : null;
          result[`column_${colIdx + 1}`].push(val);
        }
      }
      return JSON.stringify(result, null, 2);
    } else {
      const maxCols = Math.max(...rows.map(r => r.length), 0);
      const result = rows.map(row => {
        const obj: Record<string, any> = {};
        for (let colIdx = 0; colIdx < maxCols; colIdx++) {
          obj[`field_${colIdx + 1}`] = colIdx < row.length ? parseVal(row[colIdx]) : null;
        }
        return obj;
      });
      return JSON.stringify(result, null, 2);
    }
  }
}

/**
 * Converts JSON objects/arrays back to flat CSV strings.
 */
export function jsonToCsv(jsonStr: string, options: JsonToCsvOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const hasHeaders = options.hasHeaders ?? true;

  if (!jsonStr || !jsonStr.trim()) return '';

  const parsed = JSON.parse(jsonStr);

  // Case 1: Simple 2D array of values
  if (Array.isArray(parsed) && parsed.every(row => Array.isArray(row))) {
    const rows = parsed.map(row => row.map(cell => (cell === null || cell === undefined ? '' : String(cell))));
    return formatRowsToCsv(rows, delimiter);
  }

  // Case 2: Array of objects
  if (Array.isArray(parsed)) {
    const headersSet = new Set<string>();
    parsed.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(k => headersSet.add(k));
      }
    });

    const headers = Array.from(headersSet);
    if (headers.length === 0) return '';

    const rows: string[][] = [];
    if (hasHeaders) {
      rows.push(headers);
    }

    for (const item of parsed) {
      const row = headers.map(header => {
        const val = item ? item[header] : '';
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      rows.push(row);
    }

    return formatRowsToCsv(rows, delimiter);
  }

  // Case 3: Single object
  if (typeof parsed === 'object' && parsed !== null) {
    const keys = Object.keys(parsed);
    const firstVal = parsed[keys[0]];
    if (keys.length > 0 && Array.isArray(firstVal)) {
      const rowCount = firstVal.length;
      const rows: string[][] = [];
      if (hasHeaders) {
        rows.push(keys);
      }
      for (let r = 0; r < rowCount; r++) {
        const row = keys.map(k => {
          const colArr = parsed[k];
          const val = Array.isArray(colArr) && r < colArr.length ? colArr[r] : '';
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        });
        rows.push(row);
      }
      return formatRowsToCsv(rows, delimiter);
    } else {
      const headers = keys;
      const rows: string[][] = [];
      if (hasHeaders) {
        rows.push(headers);
      }
      const row = headers.map(h => {
        const val = parsed[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      rows.push(row);
      return formatRowsToCsv(rows, delimiter);
    }
  }

  throw new Error('Unsupported JSON shape for CSV conversion. Must be an Array of Objects, 2D Array, or Keyed Columns.');
}
