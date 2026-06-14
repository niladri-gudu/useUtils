import React, { useState, useEffect, useMemo, useRef } from 'react';
import { csvToJson, jsonToCsv, parseCsvToRows, formatRowsToCsv } from '../utils-engine/csv';

// Clipboard helper
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
};

// Delimiter auto-detector
function detectDelimiter(csv: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const lines = csv.split(/\r?\n/).slice(0, 3).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) return ',';
  
  let bestDelimiter = ',';
  let maxScore = -1;
  
  for (const delim of delimiters) {
    const counts = lines.map(line => {
      let count = 0;
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') insideQuote = !insideQuote;
        else if (line[i] === delim && !insideQuote) count++;
      }
      return count;
    });
    
    const allPositive = counts.every(c => c > 0);
    const allEqual = counts.every(c => c === counts[0]);
    
    let score = 0;
    if (allPositive) score += 10;
    if (allEqual) score += 20;
    
    const sum = counts.reduce((a, b) => a + b, 0);
    score += sum;
    
    if (score > maxScore && sum > 0) {
      maxScore = score;
      bestDelimiter = delim;
    }
  }
  
  return bestDelimiter;
}

// Samples
const SAMPLES = {
  users: {
    csv: `id,username,email,role,isActive\n101,johndoe,john@example.com,Admin,true\n102,janedoe,jane@example.com,Developer,true\n103,bobsmith,bob@example.com,Editor,false\n104,alice_w,alice@example.com,Viewer,true`,
    json: `[\n  {\n    "id": 101,\n    "username": "johndoe",\n    "email": "john@example.com",\n    "role": "Admin",\n    "isActive": true\n  },\n  {\n    "id": 102,\n    "username": "janedoe",\n    "email": "jane@example.com",\n    "role": "Developer",\n    "isActive": true\n  },\n  {\n    "id": 103,\n    "username": "bobsmith",\n    "email": "bob@example.com",\n    "role": "Editor",\n    "isActive": false\n  },\n  {\n    "id": 104,\n    "username": "alice_w",\n    "email": "alice@example.com",\n    "role": "Viewer",\n    "isActive": true\n  }\n]`
  },
  products: {
    csv: `sku,product_name,category,price,in_stock\nAPL-101,iPhone 15,Electronics,999.99,45\nAPL-102,MacBook Air,Electronics,1299.50,12\nORG-204,Organic Apples,Groceries,4.99,120\nSHR-901,Running Shoes,Apparel,79.95,0`,
    json: `[\n  {\n    "sku": "APL-101",\n    "product_name": "iPhone 15",\n    "category": "Electronics",\n    "price": 999.99,\n    "in_stock": 45\n  },\n  {\n    "sku": "APL-102",\n    "product_name": "MacBook Air",\n    "category": "Electronics",\n    "price": 1299.5,\n    "in_stock": 12\n  },\n  {\n    "sku": "ORG-204",\n    "product_name": "Organic Apples",\n    "category": "Groceries",\n    "price": 4.99,\n    "in_stock": 120\n  },\n  {\n    "sku": "SHR-901",\n    "product_name": "Running Shoes",\n    "category": "Apparel",\n    "price": 79.95,\n    "in_stock": 0\n  }\n]`
  },
  logs: {
    csv: `timestamp,ip_address,method,status_code,response_time_ms\n2026-06-14T12:00:00Z,192.168.1.1,GET,200,12.5\n2026-06-14T12:00:02Z,10.0.0.5,POST,201,45.8\n2026-06-14T12:00:05Z,172.16.0.42,GET,404,4.2\n2026-06-14T12:00:09Z,192.168.1.1,PUT,500,210.1`,
    json: `[\n  {\n    "timestamp": "2026-06-14T12:00:00Z",\n    "ip_address": "192.168.1.1",\n    "method": "GET",\n    "status_code": 200,\n    "response_time_ms": 12.5\n  },\n  {\n    "timestamp": "2026-06-14T12:00:02Z",\n    "ip_address": "10.0.0.5",\n    "method": "POST",\n    "status_code": 201,\n    "response_time_ms": 45.8\n  },\n  {\n    "timestamp": "2026-06-14T12:00:05Z",\n    "ip_address": "172.16.0.42",\n    "method": "GET",\n    "status_code": 404,\n    "response_time_ms": 4.2\n  },\n  {\n    "timestamp": "2026-06-14T12:00:09Z",\n    "ip_address": "192.168.1.1",\n    "method": "PUT",\n    "status_code": 500,\n    "response_time_ms": 210.1\n  }\n]`
  }
};

export const CsvJsonConverter: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json');
  
  // Options
  const [delimiter, setDelimiter] = useState<string>(',');
  const [autoDetect, setAutoDetect] = useState<boolean>(true);
  const [hasHeaders, setHasHeaders] = useState<boolean>(true);
  const [parseTypes, setParseTypes] = useState<boolean>(true);
  const [outputStructure, setOutputStructure] = useState<'array' | '2d-array' | 'keyed'>('array');
  const [minifyJson, setMinifyJson] = useState<boolean>(false);
  
  // Tab Switcher for right side
  const [rightTab, setRightTab] = useState<'text' | 'grid'>('text');
  
  // Copy feedback toasts
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  
  // Parsing status
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut focus
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger loading initial mock data and options from URL query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      const urlTab = params.get('tab');
      
      if (urlMode === 'json-to-csv') {
        setMode('json-to-csv');
        setInput(SAMPLES.users.json);
      } else {
        setMode('csv-to-json');
        setInput(SAMPLES.users.csv);
      }
      
      if (urlTab === 'grid') {
        setRightTab('grid');
      } else {
        setRightTab('text');
      }
    } else {
      setInput(SAMPLES.users.csv);
    }
  }, []);

  // Sync Input and Delimiter auto-detector
  useEffect(() => {
    if (mode === 'csv-to-json' && autoDetect && input) {
      const detected = detectDelimiter(input);
      if (detected !== delimiter) {
        setDelimiter(detected);
      }
    }
  }, [input, mode, autoDetect]);

  // Main Conversion engine runner
  const convertData = (rawVal: string, currentMode: typeof mode, delim: string, headers: boolean, types: boolean, struct: typeof outputStructure, min: boolean) => {
    if (!rawVal.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      if (currentMode === 'csv-to-json') {
        const jsonStr = csvToJson(rawVal, {
          delimiter: delim,
          hasHeaders: headers,
          parseTypes: types,
          outputStructure: struct
        });
        if (min) {
          setOutput(JSON.stringify(JSON.parse(jsonStr)));
        } else {
          setOutput(jsonStr);
        }
        setError(null);
      } else {
        // json to csv
        const csvStr = jsonToCsv(rawVal, {
          delimiter: delim,
          hasHeaders: headers
        });
        setOutput(csvStr);
        setError(null);
      }
    } catch (err: any) {
      setOutput('');
      setError(err.message || 'Formatting failed. Please check your data format.');
    }
  };

  // Run conversion whenever input or configs change
  useEffect(() => {
    convertData(input, mode, delimiter, hasHeaders, parseTypes, outputStructure, minifyJson);
  }, [input, mode, delimiter, hasHeaders, parseTypes, outputStructure, minifyJson]);

  // 2D Array Grid Data parsed representation
  const gridData = useMemo(() => {
    if (error || !input.trim()) return [];
    try {
      if (mode === 'csv-to-json') {
        return parseCsvToRows(input, delimiter);
      } else {
        // Parse input JSON, then construct a 2D array
        const parsed = JSON.parse(input);
        
        // standard array of objects
        if (Array.isArray(parsed)) {
          if (parsed.every(row => Array.isArray(row))) {
            return parsed.map(row => row.map(cell => (cell === null ? '' : String(cell))));
          }
          
          const headersSet = new Set<string>();
          parsed.forEach(item => {
            if (item && typeof item === 'object') {
              Object.keys(item).forEach(k => headersSet.add(k));
            }
          });
          const headers = Array.from(headersSet);
          
          const rows: string[][] = [];
          if (hasHeaders && headers.length > 0) {
            rows.push(headers);
          }
          for (const item of parsed) {
            const row = headers.map(header => {
              const val = item ? item[header] : '';
              return val === null || val === undefined ? '' : String(val);
            });
            rows.push(row);
          }
          return rows;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          const firstVal = parsed[keys[0]];
          if (keys.length > 0 && Array.isArray(firstVal)) {
            // Keyed layout
            const rows: string[][] = [];
            if (hasHeaders) {
              rows.push(keys);
            }
            const rowCount = firstVal.length;
            for (let r = 0; r < rowCount; r++) {
              const row = keys.map(k => {
                const arr = parsed[k];
                const val = Array.isArray(arr) && r < arr.length ? arr[r] : '';
                return val === null ? '' : String(val);
              });
              rows.push(row);
            }
            return rows;
          } else {
            // Key-Value flat object
            const rows: string[][] = [];
            if (hasHeaders) {
              rows.push(keys);
            }
            const row = keys.map(k => {
              const val = parsed[k];
              return val === null ? '' : String(val);
            });
            rows.push(row);
            return rows;
          }
        }
      }
    } catch {
      // return empty array if failed
    }
    return [];
  }, [input, mode, delimiter, hasHeaders, error]);

  // Max columns count in current gridData
  const maxColsCount = useMemo(() => {
    if (gridData.length === 0) return 0;
    return Math.max(...gridData.map(r => r.length), 0);
  }, [gridData]);

  // Data Types Profiler for column headers
  const columnProfiles = useMemo(() => {
    if (gridData.length === 0) return [];
    
    const headers = hasHeaders ? gridData[0] : [];
    const dataRows = hasHeaders ? gridData.slice(1) : gridData;
    const numCols = maxColsCount;
    
    const profiles: Array<{ name: string; type: string; details: string }> = [];
    
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const headerName = (hasHeaders && colIdx < headers.length) ? headers[colIdx] : `Column ${colIdx + 1}`;
      
      let integers = 0;
      let floats = 0;
      let booleans = 0;
      let strings = 0;
      let nulls = 0;
      let total = 0;
      
      for (const row of dataRows) {
        if (colIdx >= row.length) continue;
        const cell = row[colIdx].trim();
        total++;
        if (cell === '') {
          nulls++;
          continue;
        }
        if (cell.toLowerCase() === 'true' || cell.toLowerCase() === 'false') {
          booleans++;
        } else if (cell.toLowerCase() === 'null') {
          nulls++;
        } else if (/^-?\d+$/.test(cell)) {
          integers++;
        } else if (/^-?\d+\.\d+$/.test(cell)) {
          floats++;
        } else {
          strings++;
        }
      }
      
      let detectedType = 'String';
      let confidence = 0;
      
      if (total > 0) {
        if (booleans === total - nulls) {
          detectedType = 'Boolean';
          confidence = 100;
        } else if (integers === total - nulls) {
          detectedType = 'Integer';
          confidence = 100;
        } else if (floats === total - nulls) {
          detectedType = 'Float';
          confidence = 100;
        } else if (integers + floats === total - nulls) {
          detectedType = 'Number';
          confidence = 100;
        } else if (nulls === total) {
          detectedType = 'Null';
          confidence = 100;
        } else {
          // Mixed types or text
          const maxVal = Math.max(integers, floats, booleans, strings);
          confidence = Math.round((maxVal / (total - nulls || 1)) * 100);
          if (maxVal === integers) detectedType = 'Integer';
          else if (maxVal === floats) detectedType = 'Float';
          else if (maxVal === booleans) detectedType = 'Boolean';
          else detectedType = 'String';
        }
      }
      
      profiles.push({
        name: headerName,
        type: detectedType,
        details: total > 0 ? `${detectedType} (${confidence}% match)` : 'No Data'
      });
    }
    
    return profiles;
  }, [gridData, hasHeaders, maxColsCount]);

  // Handle cell edit from Interactive Grid Editor
  const handleCellEdit = (rowIndex: number, colIndex: number, newValue: string) => {
    // gridData represents the current 2D structure
    const updated = [...gridData];
    
    // Ensure row exists
    if (!updated[rowIndex]) {
      updated[rowIndex] = [];
    }
    
    // Pad columns if needed
    while (updated[rowIndex].length <= colIndex) {
      updated[rowIndex].push('');
    }
    
    updated[rowIndex][colIndex] = newValue;
    
    // Rebuild CSV and JSON
    const csvContent = formatRowsToCsv(updated, delimiter);
    let jsonContent = '';
    
    try {
      jsonContent = csvToJson(csvContent, {
        delimiter,
        hasHeaders,
        parseTypes,
        outputStructure
      });
      if (minifyJson) {
        jsonContent = JSON.stringify(JSON.parse(jsonContent));
      }
    } catch {
      // fallback
    }

    if (mode === 'csv-to-json') {
      setInput(csvContent);
      setOutput(jsonContent);
    } else {
      setInput(jsonContent);
      setOutput(csvContent);
    }
  };

  // Add row in Grid Editor
  const handleAddRow = () => {
    const updated = [...gridData];
    const newRow = Array(maxColsCount || 3).fill('');
    updated.push(newRow);
    
    const csvContent = formatRowsToCsv(updated, delimiter);
    if (mode === 'csv-to-json') {
      setInput(csvContent);
    } else {
      try {
        const jsonContent = csvToJson(csvContent, {
          delimiter,
          hasHeaders,
          parseTypes,
          outputStructure
        });
        setInput(minifyJson ? JSON.stringify(JSON.parse(jsonContent)) : jsonContent);
      } catch {}
    }
  };

  // Add column in Grid Editor
  const handleAddColumn = () => {
    const updated = gridData.map((row, idx) => {
      const r = [...row];
      // Append empty value, or header name if 0-th row
      if (idx === 0 && hasHeaders) {
        r.push(`col_${maxColsCount + 1}`);
      } else {
        r.push('');
      }
      return r;
    });

    if (updated.length === 0) {
      // Empty grid initialization
      if (hasHeaders) {
        updated.push(['col_1'], ['']);
      } else {
        updated.push(['']);
      }
    }
    
    const csvContent = formatRowsToCsv(updated, delimiter);
    if (mode === 'csv-to-json') {
      setInput(csvContent);
    } else {
      try {
        const jsonContent = csvToJson(csvContent, {
          delimiter,
          hasHeaders,
          parseTypes,
          outputStructure
        });
        setInput(minifyJson ? JSON.stringify(JSON.parse(jsonContent)) : jsonContent);
      } catch {}
    }
  };

  // Remove row in Grid Editor
  const handleRemoveRow = (idxToRemove: number) => {
    const updated = gridData.filter((_, idx) => idx !== idxToRemove);
    const csvContent = formatRowsToCsv(updated, delimiter);
    if (mode === 'csv-to-json') {
      setInput(csvContent);
    } else {
      try {
        const jsonContent = csvToJson(csvContent, {
          delimiter,
          hasHeaders,
          parseTypes,
          outputStructure
        });
        setInput(minifyJson ? JSON.stringify(JSON.parse(jsonContent)) : jsonContent);
      } catch {}
    }
  };

  // Remove column in Grid Editor
  const handleRemoveColumn = (colIndexToRemove: number) => {
    if (maxColsCount <= 1) return; // Keep at least one column
    
    const updated = gridData.map(row => row.filter((_, idx) => idx !== colIndexToRemove));
    const csvContent = formatRowsToCsv(updated, delimiter);
    
    if (mode === 'csv-to-json') {
      setInput(csvContent);
    } else {
      try {
        const jsonContent = csvToJson(csvContent, {
          delimiter,
          hasHeaders,
          parseTypes,
          outputStructure
        });
        setInput(minifyJson ? JSON.stringify(JSON.parse(jsonContent)) : jsonContent);
      } catch {}
    }
  };

  // Load Sample
  const handleLoadSample = (key: keyof typeof SAMPLES) => {
    const sample = SAMPLES[key];
    if (mode === 'csv-to-json') {
      setInput(sample.csv);
    } else {
      setInput(sample.json);
    }
  };

  // Swap converter direction
  const handleSwapMode = () => {
    if (mode === 'csv-to-json') {
      setMode('json-to-csv');
      // Swap content if valid
      if (output && !error) {
        setInput(output);
      } else {
        setInput(SAMPLES.users.json);
      }
    } else {
      setMode('csv-to-json');
      if (output && !error) {
        setInput(output);
      } else {
        setInput(SAMPLES.users.csv);
      }
    }
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setInput(text);
      
      // Auto toggle mode based on file type
      if (file.name.endsWith('.json')) {
        setMode('json-to-csv');
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        setMode('csv-to-json');
      }
    };
    reader.readAsText(file);
  };

  // Action Buttons
  const handleCopyOutput = () => {
    if (!output) return;
    const success = copyToClipboard(output);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleDownloadOutput = () => {
    if (!output) return;
    const extension = mode === 'csv-to-json' ? 'json' : 'csv';
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils_converted.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Layout stats
  const inputStats = useMemo(() => {
    const chars = input.length;
    const lines = input ? input.split('\n').length : 0;
    return { chars, lines };
  }, [input]);

  const outputStats = useMemo(() => {
    const chars = output.length;
    const lines = output ? output.split('\n').length : 0;
    return { chars, lines };
  }, [output]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Bidirectional Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side Ingest Panel (Col Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono bg-zinc-850 border border-zinc-750 text-zinc-400 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
                {mode === 'csv-to-json' ? 'CSV Source File' : 'JSON Source Payload'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">
                {inputStats.chars} chars • {inputStats.lines} lines
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleLoadSample('users')}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 font-mono cursor-pointer"
              >
                Sample Users
              </button>
              <button
                onClick={() => handleLoadSample('products')}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 font-mono cursor-pointer"
              >
                Sample Sales
              </button>
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 border border-red-900/40 rounded font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="relative flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'csv-to-json' ? "id,name,role\n1,Niladri,Admin\n2,Gudu,Editor..." : '[\n  { "id": 1, "name": "Niladri" }\n]'}
              rows={16}
              className={`w-full bg-canvas border outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 ${
                error ? 'border-red-900/60 focus:border-red-800' : 'border-border-hairline'
              }`}
            />

            {/* Input helpers and drag drop */}
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}

            {/* Drag & Drop Overlay Info */}
            <div className="flex items-center justify-between border border-dashed border-border-hairline/80 rounded-lg p-2 px-3 bg-zinc-900/20 text-xs">
              <span className="text-zinc-500 font-sans">Have a file? Upload .csv or .json directly:</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-[10px] font-mono bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
              >
                Browse File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {/* Real-time Syntax Error feedback */}
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg p-3 flex flex-col gap-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <span>🛑</span>
                  <span>Parser Translation Error</span>
                </div>
                <p className="text-red-300/95 leading-relaxed">{error}</p>
              </div>
            )}

            {!error && input && (
              <div className="bg-emerald-950/10 border border-accent-emerald/20 text-accent-emerald rounded-lg px-3 py-2 flex items-center gap-2 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse"></span>
                Structured Input Verified / Schema Synced
              </div>
            )}
          </div>

          {/* Configuration Settings */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Toggle direction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Conversion Pathway
              </label>
              <div className="flex gap-2 bg-zinc-900/50 border border-border-hairline p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => mode !== 'csv-to-json' && handleSwapMode()}
                  className={`flex-1 py-1.5 rounded text-[11px] font-mono text-center select-none cursor-pointer border transition-all duration-75 ${
                    mode === 'csv-to-json'
                      ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  CSV → JSON
                </button>
                <button
                  type="button"
                  onClick={() => mode !== 'json-to-csv' && handleSwapMode()}
                  className={`flex-1 py-1.5 rounded text-[11px] font-mono text-center select-none cursor-pointer border transition-all duration-75 ${
                    mode === 'json-to-csv'
                      ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  JSON → CSV
                </button>
              </div>
            </div>

            {/* CSV Parser Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Separator */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono flex items-center justify-between">
                  <span>Delimiter Separator</span>
                  {mode === 'csv-to-json' && (
                    <label className="text-[9px] text-zinc-650 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDetect}
                        onChange={(e) => setAutoDetect(e.target.checked)}
                        className="accent-accent-emerald"
                      />
                      Auto-detect
                    </label>
                  )}
                </span>
                <div className="flex gap-1 bg-zinc-950 border border-border-hairline rounded-lg p-0.5">
                  {[
                    { val: ',', label: ',' },
                    { val: ';', label: ';' },
                    { val: '\t', label: 'Tab' },
                    { val: '|', label: '|' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      disabled={mode === 'csv-to-json' && autoDetect}
                      onClick={() => setDelimiter(opt.val)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono select-none cursor-pointer border transition-all duration-75 disabled:opacity-40 disabled:pointer-events-none ${
                        delimiter === opt.val
                          ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2.5 justify-end">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded border-zinc-750 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                  />
                  First row contains headers
                </label>

                {mode === 'csv-to-json' && (
                  <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parseTypes}
                      onChange={(e) => setParseTypes(e.target.checked)}
                      className="rounded border-zinc-750 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Detect cell values types (number/bool)
                  </label>
                )}
              </div>
            </div>

            {/* JSON Specific settings */}
            {mode === 'csv-to-json' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-hairline/40 pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    JSON Output Structure
                  </span>
                  <select
                    value={outputStructure}
                    onChange={(e) => setOutputStructure(e.target.value as any)}
                    className="bg-zinc-950 border border-border-hairline rounded-lg py-1 px-2 text-xs font-mono text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="array">Array of Objects [&#123;...&#125;]</option>
                    <option value="2d-array">2D Array of Arrays [[...]]</option>
                    <option value="keyed">Keyed Columns &#123;col: []&#125;</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 justify-end pb-0.5">
                  <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={minifyJson}
                      onChange={(e) => setMinifyJson(e.target.checked)}
                      className="rounded border-zinc-750 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Minify JSON payload spacing
                  </label>
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* Right Side Results and Editor (Col Span 7) */}
        <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono bg-zinc-850 border border-zinc-750 text-zinc-400 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
                {mode === 'csv-to-json' ? 'JSON Result Output' : 'CSV Result Output'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">
                {outputStats.chars} chars • {outputStats.lines} lines
              </span>
            </div>

            {/* Tab Swapping & CTAs */}
            <div className="flex items-center gap-2">
              
              {/* Raw / Grid tab switch */}
              <div className="flex bg-zinc-900 border border-border-hairline p-0.5 rounded-lg mr-2">
                <button
                  onClick={() => setRightTab('text')}
                  className={`px-3 py-1 text-[10px] font-mono rounded select-none cursor-pointer transition-all ${
                    rightTab === 'text'
                      ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Raw Text
                </button>
                <button
                  onClick={() => setRightTab('grid')}
                  disabled={!!error || gridData.length === 0}
                  className={`px-3 py-1 text-[10px] font-mono rounded select-none cursor-pointer transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                    rightTab === 'grid'
                      ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={error ? 'Please fix parsing errors to load Grid Editor' : 'Visual Table Spreadsheet Editor'}
                >
                  Grid Editor
                </button>
              </div>

              {output && (
                <>
                  <button
                    onClick={handleDownloadOutput}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
                    title="Download output file to system"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold"
                  >
                    {copyFeedback ? 'Copied ✓' : 'Copy'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Contents Container */}
          <div className="flex-grow flex flex-col gap-4 min-h-[460px]">
            
            {/* View 1: Raw Output Text */}
            {rightTab === 'text' && (
              <textarea
                readOnly
                value={output}
                placeholder="Resulting formatted output will generate here dynamically..."
                rows={21}
                className="w-full flex-grow bg-canvas border border-border-hairline outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed"
              />
            )}

            {/* View 2: Interactive Grid Editor */}
            {rightTab === 'grid' && !error && gridData.length > 0 && (
              <div className="flex-grow flex flex-col gap-4 h-full">
                
                {/* Grid Header Commands */}
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 border border-border-hairline rounded-lg text-[11px] font-mono">
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddRow}
                      className="px-2.5 py-1 bg-zinc-900 border border-border-hairline hover:border-zinc-700 hover:bg-zinc-850 text-zinc-200 rounded cursor-pointer select-none transition-colors"
                    >
                      + Add Row
                    </button>
                    <button
                      onClick={handleAddColumn}
                      className="px-2.5 py-1 bg-zinc-900 border border-border-hairline hover:border-zinc-700 hover:bg-zinc-850 text-zinc-200 rounded cursor-pointer select-none transition-colors"
                    >
                      + Add Column
                    </button>
                  </div>
                  <div className="text-zinc-500">
                    {gridData.length} Rows • {maxColsCount} Columns
                  </div>
                </div>

                {/* Spreadsheet Body Scroll Container */}
                <div className="flex-grow overflow-auto max-h-[420px] border border-border-hairline rounded-lg bg-zinc-900/30">
                  <table className="w-full border-collapse text-left text-xs text-zinc-300">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-border-hairline sticky top-0 z-10">
                        {/* Row delete indicator header */}
                        <th className="p-2 w-10 border-r border-border-hairline text-center text-zinc-600 font-mono">#</th>
                        
                        {/* Headers */}
                        {Array.from({ length: maxColsCount }).map((_, colIdx) => {
                          const prof = columnProfiles[colIdx];
                          return (
                            <th 
                              key={colIdx} 
                              className="p-2 border-r border-border-hairline group/th relative font-mono text-zinc-300 min-w-[120px]"
                            >
                              <div className="flex flex-col gap-0.5">
                                {/* Header editable cell */}
                                {hasHeaders && gridData[0] ? (
                                  <input
                                    type="text"
                                    value={gridData[0][colIdx] || ''}
                                    onChange={(e) => handleCellEdit(0, colIdx, e.target.value)}
                                    className="bg-transparent border-0 outline-none text-zinc-100 font-semibold focus:ring-1 focus:ring-accent-emerald/40 px-1 rounded w-full"
                                  />
                                ) : (
                                  <span className="text-zinc-400 font-semibold px-1">Col {colIdx + 1}</span>
                                )}

                                {/* Column Data Type Profiler Indicator */}
                                <span className="text-[9px] text-zinc-500 px-1 font-normal font-sans italic">
                                  {prof?.type || 'String'}
                                </span>
                              </div>

                              {/* Delete Column button */}
                              {maxColsCount > 1 && (
                                <button
                                  onClick={() => handleRemoveColumn(colIdx)}
                                  className="absolute top-1.5 right-1.5 opacity-0 group-hover/th:opacity-100 hover:text-red-400 text-zinc-500 text-[10px] w-4 h-4 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                                  title="Delete column"
                                >
                                  ✕
                                </button>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    
                    <tbody className="divide-y divide-border-hairline bg-panel/30">
                      {/* Render data rows */}
                      {gridData.slice(hasHeaders ? 1 : 0).map((row, relativeRowIdx) => {
                        const actualRowIdx = hasHeaders ? relativeRowIdx + 1 : relativeRowIdx;
                        return (
                          <tr key={relativeRowIdx} className="hover:bg-zinc-850/30 group/tr">
                            {/* Actions column */}
                            <td className="p-2 border-r border-border-hairline text-center bg-zinc-950/60 font-mono text-zinc-500 relative">
                              <span className="group-hover/tr:hidden">{actualRowIdx}</span>
                              <button
                                onClick={() => handleRemoveRow(actualRowIdx)}
                                className="hidden group-hover/tr:flex absolute inset-0 items-center justify-center text-red-500 hover:text-red-400 font-bold bg-zinc-900 cursor-pointer text-[10px]"
                                title="Delete row"
                              >
                                ✕
                              </button>
                            </td>

                            {/* Column values */}
                            {Array.from({ length: maxColsCount }).map((_, colIdx) => {
                              const cellValue = colIdx < row.length ? row[colIdx] : '';
                              return (
                                <td key={colIdx} className="p-1.5 border-r border-border-hairline min-w-[120px]">
                                  <input
                                    type="text"
                                    value={cellValue}
                                    onChange={(e) => handleCellEdit(actualRowIdx, colIdx, e.target.value)}
                                    className="w-full bg-transparent border-0 outline-none text-xs font-mono text-zinc-200 focus:bg-zinc-950/50 focus:ring-1 focus:ring-accent-emerald/40 px-1 py-0.5 rounded"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>💡 Double-click cells to type. Changes are saved back to raw inputs instantly.</span>
                  <span>Row Indexes are offset-numbered.</span>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
