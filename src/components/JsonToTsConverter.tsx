import React, { useState, useEffect, useMemo } from 'react';
import { compileJsonToTs } from '../utils-engine/json-to-ts';
import { formatJson, minifyJson, validateJson } from '../utils-engine/json';

// Clipboard copy helper
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
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

const SAMPLE_JSON = `{
  "id": 101,
  "name": "Leanne Graham",
  "username": "Bret",
  "email": "Sincere@april.biz",
  "isActive": true,
  "address": {
    "street": "Kulas Light",
    "suite": "Apt. 556",
    "city": "Gwenborough",
    "zipcode": "92998-3874",
    "geo": {
      "lat": "-37.3159",
      "lng": "81.1496"
    }
  },
  "roles": ["admin", "developer"],
  "tags": [
    { "id": "t1", "label": "Frontend" },
    { "id": "t2", "label": "Remote" }
  ],
  "createdAt": "2026-06-13T08:11:41.000Z"
}`;

export const JsonToTsConverter: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [rootName, setRootName] = useState<string>('RootObject');
  const [outputFormat, setOutputFormat] = useState<'interfaces' | 'types' | 'zod'>('interfaces');
  const [dateTimeDetection, setDateTimeDetection] = useState<boolean>(true);
  const [optionalProperties, setOptionalProperties] = useState<boolean>(false);
  const [readonlyProperties, setReadonlyProperties] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'export' | 'none'>('export');

  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate JSON on input change
  useEffect(() => {
    if (!jsonInput.trim()) {
      setValidationError(null);
      return;
    }
    const result = validateJson(jsonInput);
    if (!result.isValid) {
      setValidationError(result.error || 'Invalid JSON syntax');
    } else {
      setValidationError(null);
    }
  }, [jsonInput]);

  // Convert JSON to Target format in real-time
  const convertedOutput = useMemo(() => {
    if (!jsonInput.trim() || validationError) {
      return '';
    }

    try {
      return compileJsonToTs(jsonInput, {
        rootName: rootName.trim() || 'RootObject',
        outputFormat,
        dateTimeDetection,
        optionalProperties,
        readonlyProperties,
        exportType,
      });
    } catch (e: any) {
      return `// Conversion Error: ${e.message}`;
    }
  }, [jsonInput, rootName, outputFormat, dateTimeDetection, optionalProperties, readonlyProperties, exportType, validationError]);

  // Input JSON formatting utils
  const handlePrettify = () => {
    if (!jsonInput.trim()) return;
    try {
      const formatted = formatJson(jsonInput, 2, false);
      setJsonInput(formatted);
    } catch (e: any) {
      setValidationError(e.message);
    }
  };

  const handleMinify = () => {
    if (!jsonInput.trim()) return;
    try {
      const minified = minifyJson(jsonInput);
      setJsonInput(minified);
    } catch (e: any) {
      setValidationError(e.message);
    }
  };

  const handleCopy = () => {
    if (!convertedOutput) return;
    if (copyToClipboard(convertedOutput)) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleDownload = () => {
    if (!convertedOutput) return;
    const blob = new Blob([convertedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set appropriate filename
    const filename = `${rootName.trim() || 'types'}.${outputFormat === 'zod' ? 'ts' : 'ts'}`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Two-Column split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Input and configuration options */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Raw JSON Input
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJsonInput(SAMPLE_JSON)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Load Sample
              </button>
              {jsonInput && (
                <>
                  <button
                    type="button"
                    onClick={handlePrettify}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
                  >
                    Prettify
                  </button>
                  <button
                    type="button"
                    onClick={handleMinify}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
                  >
                    Minify
                  </button>
                  <button
                    type="button"
                    onClick={() => setJsonInput('')}
                    className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors font-mono"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="relative flex-grow flex flex-col min-h-[300px]">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your JSON payload here..."
              className="w-full flex-grow bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750 min-h-[300px]"
            />
            {!jsonInput && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Real-time Syntax Error Warnings */}
          {validationError && (
            <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 text-red-400 text-xs font-mono leading-relaxed">
              <span className="font-bold">⚠️ JSON Validation Error:</span> {validationError}
            </div>
          )}

          {/* Converter options & configurations */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Configuration Options
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Root Object Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Root Object Name</label>
                <input
                  type="text"
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value.replace(/[^a-zA-Z0-9_$]/g, ''))}
                  placeholder="RootObject"
                  className="bg-canvas border border-border-hairline hover:border-zinc-700 focus:border-zinc-650 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 outline-none transition-colors"
                />
              </div>

              {/* Export mode selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Export Keyword</label>
                <div className="flex gap-1 bg-zinc-900/60 border border-border-hairline p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setExportType('export')}
                    className={`flex-1 py-1 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                      exportType === 'export'
                        ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    export
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportType('none')}
                    className={`flex-1 py-1 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                      exportType === 'none'
                        ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    none
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="flex flex-col gap-2.5 mt-2 border-t border-border-hairline/40 pt-3">
              <label className="flex items-center gap-2.5 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={dateTimeDetection}
                  onChange={(e) => setDateTimeDetection(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Detect ISO-8601 DateTime strings (creates Date / z.coerce.date)
              </label>

              <label className="flex items-center gap-2.5 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalProperties}
                  onChange={(e) => setOptionalProperties(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Force all nested properties to be optional (?)
              </label>

              <label className="flex items-center gap-2.5 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={readonlyProperties}
                  onChange={(e) => setReadonlyProperties(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Add Readonly modifier to all properties (readonly keys)
              </label>
            </div>

          </div>
        </div>

        {/* Right Column: Code Generator Outputs */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Generated Structure
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!convertedOutput}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
              >
                Download (.ts)
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!convertedOutput}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy Output'}
              </button>
            </div>
          </div>

          {/* Toggle format tabs */}
          <div className="flex gap-1 bg-zinc-900/60 border border-border-hairline p-1.5 rounded-lg">
            <button
              type="button"
              onClick={() => setOutputFormat('interfaces')}
              className={`flex-1 py-1.5 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                outputFormat === 'interfaces'
                  ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              TS Interfaces
            </button>
            <button
              type="button"
              onClick={() => setOutputFormat('types')}
              className={`flex-1 py-1.5 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                outputFormat === 'types'
                  ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              TS Types
            </button>
            <button
              type="button"
              onClick={() => setOutputFormat('zod')}
              className={`flex-1 py-1.5 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                outputFormat === 'zod'
                  ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Zod Schema
            </button>
          </div>

          {/* Output Display area */}
          <div className="flex-grow min-h-[350px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-hidden flex flex-col">
            <textarea
              value={convertedOutput}
              readOnly
              placeholder="Output will be compiled here automatically as you type..."
              className="w-full flex-grow bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
            />
            
            {convertedOutput && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
              </div>
            )}
          </div>

          {/* Privacy status pill */}
          <div className="flex items-center justify-between bg-zinc-900 border border-border-hairline rounded-lg px-3.5 py-2.5">
            <div className="inline-flex items-center gap-2 text-[10px] text-accent-emerald font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-ping"></span>
              Processed locally in browser. Zero server transmission.
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Privacy Guaranteed</span>
          </div>

        </div>

      </div>

    </div>
  );
};
