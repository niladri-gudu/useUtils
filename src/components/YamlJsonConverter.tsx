import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  validateYaml,
  yamlToJson,
  jsonToYaml,
  generateSchema,
  generateParserCode
} from '../utils-engine/yaml';
import { validateJson } from '../utils-engine/json';

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

const SAMPLE_YAML = `# YAML configuration payload demo
app:
  name: "useUtils Studio"
  version: 3.4.0
  active: true
  
  # Local processing sandbox details
  security: &sec_policy
    local_only: true
    zero_server_logs: true
    encryption: "AES-256"
  
  features:
    - name: "YAML validation"
      stability: "stable"
    - name: "Interactive tree explorer"
      stability: "beta"
      
  # Anchor reference demo
  admin_credentials:
    <<: *sec_policy
    authorized_roles: ["admin", "superadmin"]`;

const SAMPLE_JSON = `{
  "app": {
    "name": "useUtils Studio",
    "version": "3.4.0",
    "active": true,
    "security": {
      "local_only": true,
      "zero_server_logs": true,
      "encryption": "AES-256"
    },
    "features": [
      {
        "name": "YAML validation",
        "stability": "stable"
      },
      {
        "name": "Interactive tree explorer",
        "stability": "beta"
      }
    ],
    "admin_credentials": {
      "local_only": true,
      "zero_server_logs": true,
      "encryption": "AES-256",
      "authorized_roles": [
        "admin",
        "superadmin"
      ]
    }
  }
}`;

// Multi-document sample
const SAMPLE_MULTI_YAML = `# Document 1: Service config
service:
  name: "gateway"
  port: 8080
---
# Document 2: Database config
database:
  host: "db.local"
  pool: 15`;

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

  const highlightText = (text: string, search: string) => {
    if (!search) return <span className="text-zinc-300">{text}</span>;
    const parts = text.split(new RegExp(`(${search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-emerald-500/30 text-emerald-300 rounded-sm px-0.5 font-semibold">
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
      valueElement = (
        <span className="text-emerald-400 font-semibold">
          "{highlightText(String(data), searchTerm)}"
        </span>
      );
    }

    return (
      <div className="flex items-center group/node py-0.5 pl-6 hover:bg-zinc-850 rounded transition-colors duration-100 font-mono text-xs md:text-sm">
        <span className="text-zinc-500 select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>
        <span className="break-all">{valueElement}</span>
        {!isLast && <span className="text-zinc-500 mr-2">,</span>}

        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover/node:opacity-100 ml-4 px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all cursor-pointer"
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

  const keys = isArray ? [] : Object.keys(data);
  const size = isArray ? data.length : keys.length;
  const opener = isArray ? '[' : '{';
  const closer = isArray ? ']' : '}';

  return (
    <div className="flex flex-col pl-4">
      <div className="flex items-center group/node py-0.5 hover:bg-zinc-850 rounded transition-colors duration-100 font-mono text-xs md:text-sm">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-500 hover:text-zinc-300 w-4 h-4 flex items-center justify-center text-[9px] select-none cursor-pointer focus:outline-none"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <span className="text-zinc-400 select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>

        <span className="text-zinc-500 mr-2">{opener}</span>

        {!isExpanded && (
          <span
            onClick={() => setIsExpanded(true)}
            className="text-zinc-500 hover:text-zinc-400 text-[11px] cursor-pointer italic bg-zinc-900 border border-zinc-800 px-1 rounded select-none mr-2"
          >
            {isArray ? `${size} items` : `${size} keys`}
          </span>
        )}

        {!isExpanded && <span className="text-zinc-500 mr-2">{closer}</span>}
        {!isExpanded && !isLast && <span className="text-zinc-500 mr-2">,</span>}

        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover/node:opacity-100 ml-4 px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all cursor-pointer"
          title="Copy node keypath"
        >
          Copy Path
        </button>
      </div>

      {isExpanded && (
        <div className="border-l border-zinc-800 pl-2 mt-0.5 flex flex-col gap-0.5">
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
// Main YAML ⇄ JSON Converter Component
// ============================================================================
export const YamlJsonConverter: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<'yamlToJson' | 'jsonToYaml'>('yamlToJson');
  const [indent, setIndent] = useState<'2' | '4'>('2');
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const [resolveAnchors, setResolveAnchors] = useState<boolean>(true);
  const [forceQuotes, setForceQuotes] = useState<boolean>(false);
  const [multiDoc, setMultiDoc] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  
  // Tab UI State
  const [activeTab, setActiveTab] = useState<'output' | 'tree' | 'schema' | 'code'>('output');
  const [codeLanguage, setCodeLanguage] = useState<'go' | 'typescript' | 'python'>('typescript');

  // Copy and interaction feedback state
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState<string>('');

  // Persist raw inputs inside localStorage sandbox
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedInput = localStorage.getItem('useutils_yaml_raw_input');
    const storedMode = localStorage.getItem('useutils_yaml_converter_mode') as 'yamlToJson' | 'jsonToYaml';
    if (storedInput) setInput(storedInput);
    if (storedMode) setMode(storedMode);
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_yaml_raw_input', val);
    }
  };

  const handleModeChange = (newMode: 'yamlToJson' | 'jsonToYaml') => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_yaml_converter_mode', newMode);
    }
    // Clean query on toggle
    setQuery('');
  };

  // Live syntax check parser
  const validationResult = useMemo(() => {
    if (!input || !input.trim()) {
      return { isValid: true, error: null };
    }
    if (mode === 'yamlToJson') {
      return validateYaml(input);
    } else {
      return validateJson(input);
    }
  }, [input, mode]);

  // Main converter calculations
  const parsedObject = useMemo(() => {
    if (!input || !input.trim() || !validationResult.isValid) return null;
    try {
      if (mode === 'yamlToJson') {
        return yamlToJson(input, { resolveAnchors, multiDoc });
      } else {
        return JSON.parse(input);
      }
    } catch (err) {
      return null;
    }
  }, [input, mode, resolveAnchors, multiDoc, validationResult]);

  // JSON Query filter engine
  const filteredObject = useMemo(() => {
    if (parsedObject === null) return null;
    if (!query.trim()) return parsedObject;

    let formattedQuery = query.trim();
    if (formattedQuery.startsWith('$')) formattedQuery = formattedQuery.slice(1);
    if (formattedQuery.startsWith('.')) formattedQuery = formattedQuery.slice(1);
    if (!formattedQuery) return parsedObject;

    try {
      const fn = new Function('$', `try { return $?.${formattedQuery}; } catch(e) { return undefined; }`);
      const result = fn(parsedObject);
      return result !== undefined ? result : `Query error: Path $.${formattedQuery} does not exist`;
    } catch (e: any) {
      return `Filter evaluation error: ${e.message}`;
    }
  }, [parsedObject, query]);

  // Final text output
  const processedOutputText = useMemo(() => {
    if (!input || !input.trim()) return '';
    if (!validationResult.isValid) {
      return `// Fix input syntax errors to view results`;
    }
    if (filteredObject === null) return '';

    // If there is an error in query evaluation
    if (typeof filteredObject === 'string' && (filteredObject.startsWith('Query error:') || filteredObject.startsWith('Filter evaluation error:'))) {
      return filteredObject;
    }

    try {
      if (mode === 'yamlToJson') {
        // YAML -> JSON output
        return JSON.stringify(filteredObject, null, indent === '4' ? 4 : 2);
      } else {
        // JSON -> YAML output
        return jsonToYaml(filteredObject, {
          indent: Number(indent),
          sortKeys,
          forceQuotes,
          blockScalarThreshold: 2
        });
      }
    } catch (err: any) {
      return `Conversion error: ${err.message}`;
    }
  }, [input, filteredObject, mode, indent, sortKeys, forceQuotes, validationResult]);

  // Statistics
  const stats = useMemo(() => {
    return {
      inCharCount: input.length,
      inLineCount: input ? input.split('\n').length : 0,
      outCharCount: processedOutputText.length,
      outLineCount: processedOutputText ? processedOutputText.split('\n').length : 0
    };
  }, [input, processedOutputText]);

  // Actions
  const handleCopy = () => {
    if (!processedOutputText) return;
    const success = copyToClipboard(processedOutputText);
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
    if (!processedOutputText) return;
    const extension = mode === 'yamlToJson' ? 'json' : 'yaml';
    const blob = new Blob([processedOutputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils_converted.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSwap = () => {
    if (!processedOutputText || !validationResult.isValid || processedOutputText.startsWith('Conversion error:')) return;
    const nextInput = processedOutputText;
    const nextMode = mode === 'yamlToJson' ? 'jsonToYaml' : 'yamlToJson';
    handleInputChange(nextInput);
    handleModeChange(nextMode);
  };

  // Sub-tab calculated values
  const jsonSchemaText = useMemo(() => {
    if (!parsedObject) return '';
    try {
      return generateSchema(parsedObject);
    } catch (e: any) {
      return `// Schema generation failed: ${e.message}`;
    }
  }, [parsedObject]);

  const parserCodeText = useMemo(() => {
    if (!parsedObject) return '';
    try {
      return generateParserCode(parsedObject, codeLanguage);
    } catch (e: any) {
      return `// Code generation failed: ${e.message}`;
    }
  }, [parsedObject, codeLanguage]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Raw Inputs & Parameters */}
        <div className="flex flex-col gap-5 bg-panel border border-[#2c2c2e] rounded-xl p-5">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Source Document
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.inCharCount} chars • {stats.inLineCount} lines
              </span>
            </div>

            {/* Load preset presets */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleModeChange('yamlToJson');
                  handleInputChange(SAMPLE_YAML);
                }}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
              >
                Sample YAML
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModeChange('yamlToJson');
                  handleInputChange(SAMPLE_MULTI_YAML);
                }}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
              >
                Multi-Doc YAML
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModeChange('jsonToYaml');
                  handleInputChange(SAMPLE_JSON);
                }}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
              >
                Sample JSON
              </button>
              {input && (
                <button
                  type="button"
                  onClick={() => handleInputChange('')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded border border-red-900/40 font-mono cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Code Editor view */}
          <div className="relative flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={mode === 'yamlToJson' ? "Paste YAML structure here..." : "Paste JSON structure here..."}
              rows={18}
              className={`w-full bg-[#151515] border focus:border-zinc-700 outline-none rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-850 ${
                !validationResult.isValid ? 'border-red-900/60 focus:border-red-800' : 'border-[#2c2c2e]'
              }`}
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-750 text-[10px] text-zinc-500">⌘ V</kbd>
              </div>
            )}

            {/* Error diagnostic box */}
            {!validationResult.isValid && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg p-3 flex flex-col gap-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <span>🛑</span>
                  <span>Malformed {mode === 'yamlToJson' ? 'YAML' : 'JSON'} Syntax</span>
                </div>
                <p className="text-red-300/90 leading-relaxed">{validationResult.error}</p>
                {validationResult.line && (
                  <span className="text-[10px] text-red-400/70 mt-1">
                    Error localized at Line {validationResult.line}, Column {validationResult.column}
                  </span>
                )}
              </div>
            )}

            {validationResult.isValid && input && (
              <div className="bg-emerald-950/10 border border-emerald-500/20 text-[#34d399] rounded-lg px-3 py-2 flex items-center gap-2 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse"></span>
                Payload schema verified locally
              </div>
            )}
          </div>

          {/* Controls and adjustments */}
          <div className="border-t border-[#2c2c2e] pt-4 flex flex-col gap-4">
            {/* Conversion toggles */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Conversion Pathway
              </label>
              <div className="flex bg-zinc-900/60 border border-[#2c2c2e] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleModeChange('yamlToJson')}
                  className={`flex-grow py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all duration-100 ${
                    mode === 'yamlToJson'
                      ? 'bg-zinc-800 text-[#34d399] font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  YAML ⇄ JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('jsonToYaml')}
                  className={`flex-grow py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all duration-100 ${
                    mode === 'jsonToYaml'
                      ? 'bg-zinc-800 text-[#34d399] font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  JSON ⇄ YAML
                </button>
              </div>
            </div>

            {/* Custom parameters grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Indentation configuration */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Indentation Size
                </span>
                <div className="flex gap-2">
                  {[
                    { id: '2', name: '2 Spaces' },
                    { id: '4', name: '4 Spaces' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIndent(opt.id as any)}
                      className={`flex-grow py-1.5 rounded text-xs font-mono select-none cursor-pointer border transition-all duration-75 ${
                        indent === opt.id
                          ? 'bg-zinc-800 border-zinc-700 text-[#34d399] font-semibold'
                          : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode-specific triggers */}
              <div className="flex flex-col gap-2 justify-end">
                {mode === 'yamlToJson' ? (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resolveAnchors}
                        onChange={(e) => setResolveAnchors(e.target.checked)}
                        className="rounded border-zinc-700 bg-[#151515] text-[#34d399] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Resolve anchors & aliases (& / *)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiDoc}
                        onChange={(e) => setMultiDoc(e.target.checked)}
                        className="rounded border-zinc-700 bg-[#151515] text-[#34d399] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Support multi-document parsing
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sortKeys}
                        onChange={(e) => setSortKeys(e.target.checked)}
                        className="rounded border-zinc-700 bg-[#151515] text-[#34d399] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Sort keys alphabetically
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceQuotes}
                        onChange={(e) => setForceQuotes(e.target.checked)}
                        className="rounded border-zinc-700 bg-[#151515] text-[#34d399] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Force quote strings in YAML
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Processed Results */}
        <div className="flex flex-col bg-panel border border-[#2c2c2e] rounded-xl p-5 gap-5">
          <div className="flex justify-between items-center flex-wrap gap-3 border-b border-[#2c2c2e] pb-3">
            
            {/* Display sub tabs */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-[#2c2c2e] flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all ${
                  activeTab === 'output'
                    ? 'bg-zinc-800 text-[#34d399] font-semibold shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Converted Code
              </button>
              {parsedObject && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tree')}
                    className={`px-3 py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all ${
                      activeTab === 'tree'
                        ? 'bg-zinc-800 text-[#34d399] font-semibold shadow-inner'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Interactive Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('schema')}
                    className={`px-3 py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all ${
                      activeTab === 'schema'
                        ? 'bg-zinc-800 text-[#34d399] font-semibold shadow-inner'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    JSON Schema
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1.5 rounded text-xs font-mono select-none cursor-pointer transition-all ${
                      activeTab === 'code'
                        ? 'bg-zinc-800 text-[#34d399] font-semibold shadow-inner'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Parser Models
                  </button>
                </>
              )}
            </div>

            {/* Utility actions */}
            <div className="flex gap-2">
              {input && validationResult.isValid && (
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
                  title="Swap source with results"
                >
                  Swap ⇄
                </button>
              )}
              {processedOutputText && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 font-mono cursor-pointer transition-colors"
                  title="Download results to local file"
                >
                  Download
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!processedOutputText}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[#34d399] rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Sub-tab view implementations */}
          <div className="flex-grow flex flex-col gap-4">
            
            {/* Display Stats */}
            {activeTab === 'output' && processedOutputText && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {stats.outCharCount} chars • {stats.outLineCount} lines
              </span>
            )}

            {/* Live Filter query bar (Only for code views and tree views) */}
            {activeTab === 'output' && parsedObject && (
              <div className="flex flex-col gap-1.5 bg-zinc-950 p-3 rounded-lg border border-[#2c2c2e]">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    Local Path Filter
                  </label>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    e.g. app.features.map(f =&gt; f.name)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter payload objects using path keys (e.g., app.name)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded-md py-1.5 pl-8 pr-12 text-xs font-mono text-zinc-200 placeholder-zinc-700"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs select-none">
                    $
                  </div>
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-0.5 cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB VIEW 1: Standard text display */}
            {activeTab === 'output' && (
              <div className="relative flex flex-col">
                <pre className="w-full bg-[#151515] border border-[#2c2c2e] rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto min-h-[350px] leading-relaxed max-h-[500px]">
                  <code>{processedOutputText}</code>
                </pre>
              </div>
            )}

            {/* TAB VIEW 2: Collapsible Interactive Tree */}
            {activeTab === 'tree' && parsedObject && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 bg-zinc-950 p-2.5 rounded-lg border border-[#2c2c2e] flex-wrap justify-between">
                  <input
                    type="text"
                    placeholder="Search node keys / values..."
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] rounded px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-700 outline-none focus:border-zinc-700"
                  />
                  {copiedPath && (
                    <span className="text-[10px] text-[#34d399] font-mono animate-fade-in">
                      Copied path: <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-bold">{copiedPath}</code>
                    </span>
                  )}
                </div>
                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-4 overflow-auto min-h-[350px] max-h-[500px]">
                  <JsonNodeViewer
                    data={parsedObject}
                    name={Array.isArray(parsedObject) ? 'root' : '{}'}
                    path="$"
                    isLast={true}
                    depth={0}
                    onCopyPath={handleCopyPath}
                    searchTerm={treeSearch}
                  />
                </div>
              </div>
            )}

            {/* TAB VIEW 3: JSON Schema Exporter */}
            {activeTab === 'schema' && parsedObject && (
              <div className="flex flex-col gap-2">
                <pre className="w-full bg-[#151515] border border-[#2c2c2e] rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto min-h-[350px] max-h-[500px] leading-relaxed">
                  <code>{jsonSchemaText}</code>
                </pre>
              </div>
            )}

            {/* TAB VIEW 4: Developer Model Code Generators */}
            {activeTab === 'code' && parsedObject && (
              <div className="flex flex-col gap-4">
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-[#2c2c2e] w-max gap-1">
                  {[
                    { id: 'typescript', name: 'TypeScript' },
                    { id: 'go', name: 'Go Structs' },
                    { id: 'python', name: 'Python PyYAML' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCodeLanguage(opt.id as any)}
                      className={`px-3 py-1 rounded text-[11px] font-mono select-none cursor-pointer transition-all ${
                        codeLanguage === opt.id
                          ? 'bg-zinc-800 text-[#34d399] font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
                <pre className="w-full bg-[#151515] border border-[#2c2c2e] rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto min-h-[300px] max-h-[420px] leading-relaxed">
                  <code>{parserCodeText}</code>
                </pre>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Security sandbox status footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-[#2c2c2e] rounded-lg px-4 py-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34d399]"></span>
          </span>
          <span className="text-xs md:text-sm text-zinc-300 font-medium font-sans">
            Processed locally in browser. Zero server transmission.
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
          100% Offline Sandbox
        </div>
      </div>
    </div>
  );
};
