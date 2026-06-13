import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  validateJson,
  formatJson,
  minifyJson,
  escapeJson,
  unescapeJson,
  jsonToYaml,
  yamlToJson,
  jsonToXml,
  xmlToJson,
  jsonToCsv,
  filterJson
} from '../utils-engine/json';

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

const SAMPLE_JSON = `{
  "status": "success",
  "data": {
    "user": {
      "id": 48291,
      "username": "dev_ninja",
      "email": "ninja@useutils.com",
      "profile": {
        "fullName": "John Doe",
        "role": "Senior Engineer",
        "verified": true,
        "avatarUrl": "https://api.useutils.com/avatars/john.png"
      },
      "skills": ["TypeScript", "Astro", "React", "Tailwind CSS"],
      "settings": {
        "theme": "dark",
        "notifications": {
          "email": true,
          "slack": false
        }
      }
    },
    "metrics": {
      "requestsCount": 1420,
      "responseTimeMs": 18.4,
      "cached": true
    }
  }
}`;

const SAMPLE_YAML = `status: success
data:
  user:
    id: 48291
    username: dev_ninja
    email: ninja@useutils.com
    profile:
      fullName: John Doe
      role: Senior Engineer
      verified: true
    skills:
      - TypeScript
      - Astro
      - React
      - Tailwind CSS
    settings:
      theme: dark
      notifications:
        email: true
        slack: false
  metrics:
    requestsCount: 1420
    responseTimeMs: 18.4
    cached: true`;

const SAMPLE_XML = `<response>
  <status>success</status>
  <data>
    <user>
      <id>48291</id>
      <username>dev_ninja</username>
      <email>ninja@useutils.com</email>
      <profile>
        <fullName>John Doe</fullName>
        <role>Senior Engineer</role>
        <verified>true</verified>
      </profile>
      <skills>
        <item>TypeScript</item>
        <item>Astro</item>
        <item>React</item>
        <item>Tailwind CSS</item>
      </skills>
      <settings>
        <theme>dark</theme>
        <notifications>
          <email>true</email>
          <slack>false</slack>
        </notifications>
      </settings>
    </user>
    <metrics>
      <requestsCount>1420</requestsCount>
      <responseTimeMs>18.4</responseTimeMs>
      <cached>true</cached>
    </metrics>
  </data>
</response>`;

// ============================================================================
// Collapsible JSON Tree Node Renderer
// ============================================================================
interface JsonNodeViewerProps {
  data: any;
  name: string | number;
  path: string;
  isLast: boolean;
  depth: number;
  onCopyPath: (path: string) => void;
  searchTerm: string;
}

const JsonNodeViewer: React.FC<JsonNodeViewerProps> = ({
  data,
  name,
  path,
  isLast,
  depth,
  onCopyPath,
  searchTerm
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);

  const keyDisplay = typeof name === 'number' ? name : `"${name}"`;

  const highlightText = (text: string, search: string) => {
    if (!search) return <span className="text-zinc-300">{text}</span>;
    const parts = text.split(new RegExp(`(${search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-accent-emerald/30 text-accent-emerald rounded-sm px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const renderPrimitive = () => {
    let valueElement;
    if (data === null) {
      valueElement = <span className="text-red-400 font-semibold">null</span>;
    } else if (typeof data === 'boolean') {
      valueElement = <span className="text-purple-400 font-semibold">{data ? 'true' : 'false'}</span>;
    } else if (typeof data === 'number') {
      valueElement = <span className="text-blue-400 font-semibold">{data}</span>;
    } else {
      // String
      valueElement = (
        <span className="text-emerald-400 font-semibold">
          "{highlightText(String(data), searchTerm)}"
        </span>
      );
    }

    return (
      <div className="flex items-center group/node py-0.5 pl-6 hover:bg-zinc-800/40 rounded transition-colors duration-100">
        <span className="text-zinc-500 font-mono select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>
        <span className="font-mono text-xs md:text-sm break-all">{valueElement}</span>
        {!isLast && <span className="text-zinc-500 mr-2">,</span>}

        {/* Copy Path micro-action */}
        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover/node:opacity-100 ml-4 px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
          title="Copy node keypath"
        >
          Copy Path
        </button>
      </div>
    );
  };

  if (!isObject) {
    return renderPrimitive();
  }

  // Object / Array Rendering
  const keys = isArray ? [] : Object.keys(data);
  const size = isArray ? data.length : keys.length;
  const opener = isArray ? '[' : '{';
  const closer = isArray ? ']' : '}';

  return (
    <div className="flex flex-col pl-4">
      {/* Node Header */}
      <div className="flex items-center group/node py-0.5 hover:bg-zinc-800/40 rounded transition-colors duration-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-500 hover:text-zinc-300 w-4 h-4 flex items-center justify-center font-mono text-[9px] select-none cursor-pointer focus:outline-none"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <span className="text-zinc-400 font-mono select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>

        <span className="text-zinc-500 font-mono text-xs md:text-sm mr-2">{opener}</span>

        {!isExpanded && (
          <span
            onClick={() => setIsExpanded(true)}
            className="text-zinc-500 hover:text-zinc-400 font-mono text-[11px] cursor-pointer italic bg-zinc-900 border border-zinc-800 px-1 rounded select-none mr-2"
          >
            {isArray ? `${size} items` : `${size} keys`}
          </span>
        )}

        {!isExpanded && <span className="text-zinc-500 font-mono text-xs md:text-sm mr-2">{closer}</span>}
        {!isExpanded && !isLast && <span className="text-zinc-500 mr-2">,</span>}

        {/* Copy Path trigger */}
        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover/node:opacity-100 ml-4 px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
          title="Copy node keypath"
        >
          Copy Path
        </button>
      </div>

      {/* Expanded Children */}
      {isExpanded && (
        <div className="border-l border-zinc-800/60 pl-2 mt-0.5 flex flex-col gap-0.5">
          {isArray
            ? data.map((item: any, idx: number) => (
                <JsonNodeViewer
                  key={idx}
                  data={item}
                  name={idx}
                  path={`${path}[${idx}]`}
                  isLast={idx === size - 1}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  searchTerm={searchTerm}
                />
              ))
            : keys.map((key: string, idx: number) => (
                <JsonNodeViewer
                  key={key}
                  data={data[key]}
                  name={key}
                  path={`${path}.${/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`}`}
                  isLast={idx === size - 1}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  searchTerm={searchTerm}
                />
              ))}
        </div>
      )}

      {isExpanded && (
        <div className="pl-4 font-mono text-xs md:text-sm text-zinc-500 py-0.5">
          {closer}
          {!isLast && <span className="text-zinc-500">,</span>}
        </div>
      )}
    </div>
  );
};


// ============================================================================
// Main JSON Formatter Dashboard
// ============================================================================
export const JsonFormatter: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2');
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const [mode, setMode] = useState<
    'format' | 'minify' | 'toYaml' | 'toXml' | 'toCsv' | 'escape' | 'unescape' | 'yamlToJson' | 'xmlToJson'
  >('format');
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('text');
  
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState<string>('');

  // LocalStorage state persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedInput = localStorage.getItem('useutils_json_raw_input');
    if (storedInput) {
      setInput(storedInput);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_json_raw_input', val);
    }
  };

  // Real-time Input validation (only applies when we expect JSON as input)
  const validationResult = useMemo(() => {
    const isJsonInput = ['format', 'minify', 'toYaml', 'toXml', 'toCsv', 'escape'].includes(mode);
    if (!isJsonInput) {
      return { isValid: true, error: null };
    }
    return validateJson(input);
  }, [input, mode]);

  // Main output generator
  const processedOutput = useMemo(() => {
    if (!input || !input.trim()) return '';

    try {
      switch (mode) {
        case 'format':
          return formatJson(input, indent, sortKeys);
        case 'minify':
          return minifyJson(input);
        case 'toYaml': {
          const parsed = JSON.parse(input);
          return jsonToYaml(parsed);
        }
        case 'toXml': {
          const parsed = JSON.parse(input);
          return jsonToXml(parsed);
        }
        case 'toCsv':
          return jsonToCsv(input);
        case 'escape':
          return escapeJson(input);
        case 'unescape':
          return unescapeJson(input);
        case 'yamlToJson':
          return yamlToJson(input);
        case 'xmlToJson':
          return xmlToJson(input);
        default:
          return input;
      }
    } catch (err: any) {
      return `Conversion Error: ${err.message}`;
    }
  }, [input, mode, indent, sortKeys]);

  // Query engine evaluation
  const queriedJsonOutput = useMemo(() => {
    if (!processedOutput || processedOutput.startsWith('Conversion Error:')) return null;
    if (!query.trim()) return null;

    try {
      let objectToFilter;
      // Depending on the output, it could be JSON, XML, or YAML
      // We parse the output to object to apply filtering
      if (mode === 'toYaml' || mode === 'toXml' || mode === 'toCsv' || mode === 'escape') {
        // We filter the input JSON directly since the output isn't JSON
        objectToFilter = JSON.parse(input);
      } else if (mode === 'yamlToJson' || mode === 'xmlToJson' || mode === 'format' || mode === 'minify' || mode === 'unescape') {
        objectToFilter = JSON.parse(processedOutput);
      } else {
        objectToFilter = JSON.parse(input);
      }

      const filtered = filterJson(objectToFilter, query);
      return typeof filtered === 'string' && filtered.startsWith('Query Error:')
        ? filtered
        : JSON.stringify(filtered, null, indent === 'tab' ? '\t' : Number(indent));
    } catch (e: any) {
      return `Filter Evaluation Error: ${e.message}`;
    }
  }, [processedOutput, query, mode, indent, input]);

  // Prepares the parsed object for the Tree Viewer
  const parsedTreeData = useMemo(() => {
    const dataToParse = queriedJsonOutput || processedOutput;
    if (!dataToParse) return null;
    try {
      return JSON.parse(dataToParse);
    } catch {
      return null;
    }
  }, [processedOutput, queriedJsonOutput]);

  // General statistics
  const stats = useMemo(() => {
    const charCount = input.length;
    const lineCount = input ? input.split('\n').length : 0;
    const outCharCount = processedOutput.length;
    const outLineCount = processedOutput ? processedOutput.split('\n').length : 0;

    let sizeSaving = 0;
    if (charCount > 0 && outCharCount > 0) {
      sizeSaving = ((charCount - outCharCount) / charCount) * 100;
    }

    return {
      charCount,
      lineCount,
      outCharCount,
      outLineCount,
      sizeSaving
    };
  }, [input, processedOutput]);

  // Actions
  const handleCopy = () => {
    const textToCopy = queriedJsonOutput || processedOutput;
    const success = copyToClipboard(textToCopy);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleCopyPath = (path: string) => {
    const success = copyToClipboard(path);
    if (success) {
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  };

  const handleDownload = () => {
    const textToCopy = queriedJsonOutput || processedOutput;
    if (!textToCopy) return;

    let extension = 'json';
    if (mode === 'toYaml') extension = 'yaml';
    else if (mode === 'toXml') extension = 'xml';
    else if (mode === 'toCsv') extension = 'csv';
    else if (mode === 'escape') extension = 'txt';

    const blob = new Blob([textToCopy], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils_export.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSwap = () => {
    if (!processedOutput || processedOutput.startsWith('Conversion Error:')) return;
    
    // Set matching mode
    if (mode === 'yamlToJson') {
      setMode('toYaml');
    } else if (mode === 'xmlToJson') {
      setMode('toXml');
    } else if (mode === 'toYaml') {
      setMode('yamlToJson');
    } else if (mode === 'toXml') {
      setMode('xmlToJson');
    }
    
    handleInputChange(processedOutput);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Raw Input and Modes */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Source Document
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.charCount} chars • {stats.lineCount} lines
              </span>
            </div>

            {/* Load Samples and Clean */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_JSON)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample JSON
              </button>
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_YAML)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample YAML
              </button>
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_XML)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample XML
              </button>
              {input && (
                <button
                  type="button"
                  onClick={() => handleInputChange('')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste JSON, YAML, or XML payload here..."
              rows={16}
              className={`w-full bg-canvas border focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 ${
                !validationResult.isValid ? 'border-red-900/60 focus:border-red-800' : 'border-border-hairline'
              }`}
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
            
            {/* Real-time parse validation notice */}
            {!validationResult.isValid && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg p-3 flex flex-col gap-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <span>🛑</span>
                  <span>Malformed Input Syntax</span>
                </div>
                <p className="text-red-300/95 leading-relaxed">{validationResult.error}</p>
                {validationResult.line && (
                  <span className="text-[10px] text-red-400/70 mt-1">
                    Failed at Line {validationResult.line}, Column {validationResult.column}
                  </span>
                )}
              </div>
            )}

            {validationResult.isValid && input && (
              <div className="bg-emerald-950/10 border border-accent-emerald/20 text-accent-emerald rounded-lg px-3 py-2 flex items-center gap-2 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse"></span>
                Input Document Verified / Syntax Valid
              </div>
            )}
          </div>

          {/* Configuration Controls */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Transformation modes */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Utility Functions & Operations
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1.5 rounded-lg">
                {[
                  { id: 'format', name: 'Beautify JSON', active: true },
                  { id: 'minify', name: 'Minify JSON' },
                  { id: 'toYaml', name: 'JSON → YAML' },
                  { id: 'toXml', name: 'JSON → XML' },
                  { id: 'toCsv', name: 'JSON → CSV' },
                  { id: 'escape', name: 'Escape JSON' },
                  { id: 'unescape', name: 'Unescape JSON' },
                  { id: 'yamlToJson', name: 'YAML → JSON' },
                  { id: 'xmlToJson', name: 'XML → JSON' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMode(opt.id as any);
                      // Set default view Mode based on conversions
                      if (['toYaml', 'toXml', 'toCsv', 'escape'].includes(opt.id)) {
                        setViewMode('text');
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      mode === opt.id
                        ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Indent & Sort - only shown if JSON formatting / yamlToJson / xmlToJson are active */}
            {['format', 'yamlToJson', 'xmlToJson'].includes(mode) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Indent options */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    Indentation Spacing
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { id: '2', name: '2 Spaces' },
                      { id: '4', name: '4 Spaces' },
                      { id: 'tab', name: 'Tab' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setIndent(opt.id as any)}
                        className={`flex-grow px-2 py-1 rounded text-[10px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                          indent === opt.id
                            ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                            : 'border-border-hairline text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorter option */}
                <div className="flex flex-col gap-1.5 justify-end pb-0.5">
                  <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortKeys}
                      onChange={(e) => setSortKeys(e.target.checked)}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Sort object keys alphabetically
                  </label>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Output Panel */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Processed Results
              </h2>
              {processedOutput && (
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {stats.outCharCount} chars • {stats.outLineCount} lines
                  {mode === 'minify' && stats.sizeSaving > 0 && (
                    <span className="text-accent-emerald ml-1.5">
                      (Saved {stats.sizeSaving.toFixed(1)}% size)
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* View Modes & Actions */}
            <div className="flex items-center gap-2">
              {/* Text / Tree view switcher - Only visible if we have valid JSON output or filtering is active */}
              {parsedTreeData && (
                <div className="flex bg-zinc-900 border border-border-hairline/80 p-0.5 rounded-lg mr-2">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded select-none cursor-pointer ${
                      viewMode === 'text'
                        ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-inner'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Text View
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded select-none cursor-pointer ${
                      viewMode === 'tree'
                        ? 'bg-zinc-800 text-accent-emerald font-semibold shadow-inner'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Tree View
                  </button>
                </div>
              )}

              {/* Swap converter directions */}
              {['yamlToJson', 'xmlToJson', 'toYaml', 'toXml'].includes(mode) && processedOutput && (
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
                  title="Swap source with result"
                >
                  Swap ⇄
                </button>
              )}

              {/* Download output */}
              {processedOutput && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
                  title="Save formatted document to local file"
                >
                  Download
                </button>
              )}

              {/* Copy action */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!processedOutput}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Real-time Query / Filtering Bar */}
          {processedOutput && !processedOutput.startsWith('Conversion Error:') && (
            <div className="flex flex-col gap-1.5 bg-zinc-900/40 border border-border-hairline/60 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Live JSON Query / Filter
                </label>
                <span className="text-[9px] text-zinc-650 font-mono">
                  e.g. $.data.user.skills.map(s =&gt; s.toUpperCase())
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter query path or JavaScript expression (e.g. data.user.id or map(x => x.name))..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-md py-1.5 pl-8 pr-12 text-xs font-mono text-zinc-200 placeholder-zinc-650"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs select-none">
                  $
                </div>
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* Display query result state */}
              {queriedJsonOutput && queriedJsonOutput.startsWith('Filter Evaluation Error:') && (
                <div className="text-[10px] text-red-400 font-mono mt-1">
                  🛑 {queriedJsonOutput}
                </div>
              )}
            </div>
          )}

          {/* Output Display box */}
          <div className="flex-grow min-h-[300px] bg-canvas border border-border-hairline rounded-lg p-3.5 relative overflow-auto max-h-[520px]">
            
            {/* Tabbed view mode: Text Prettified view */}
            {viewMode === 'text' && (
              <textarea
                value={queriedJsonOutput || processedOutput}
                readOnly
                placeholder="Transformed or formatted output will appear here dynamically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
              />
            )}

            {/* Tabbed view mode: Interactive Tree View */}
            {viewMode === 'tree' && parsedTreeData && (
              <div className="flex flex-col gap-4 h-full">
                {/* Search highlights in Tree Node */}
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <input
                    type="text"
                    placeholder="Search keys or values in tree..."
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    className="bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono px-2 py-1 rounded placeholder-zinc-600 outline-none focus:border-zinc-700 w-full max-w-xs"
                  />
                  {treeSearch && (
                    <button
                      onClick={() => setTreeSearch('')}
                      className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto pr-2 flex-grow select-text">
                  <JsonNodeViewer
                    data={parsedTreeData}
                    name="root"
                    path="$"
                    isLast={true}
                    depth={0}
                    onCopyPath={handleCopyPath}
                    searchTerm={treeSearch}
                  />
                </div>
              </div>
            )}

            {/* Path copied overlay feedback */}
            {copiedPath && (
              <div className="absolute top-4 right-4 bg-accent-emerald border border-accent-emerald/30 text-zinc-950 font-mono text-[10px] font-semibold px-2 py-1 rounded shadow-lg animate-fade-in">
                Copied keypath: {copiedPath}
              </div>
            )}

            {processedOutput && viewMode === 'text' && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
              </div>
            )}
          </div>

          {/* Local Privacy Status Pill */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

      </div>
    </div>
  );
};
