import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  parseUrlString, 
  rebuildUrl, 
  type QueryParam, 
  type URLBreakdown 
} from '../utils-engine/url';
import { diffChars, type DiffNode } from '../utils-engine/text';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy if writeText fails
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

// ==========================================
// Samples
// ==========================================
const SAMPLE_ENCODED_URL = 'https%3A%2F%2Fapi.useutils.com%3A443%2Fv1%2Fsearch%2Fquery%3Fcategory%3Ddeveloper%2520tools%26limit%3D10%26secure%3Dtrue%26sort%3Dasc%23results-header';
const SAMPLE_RAW_URL_WITH_PARAMS = 'https://example.com/login?redirect_uri=https%3A%2F%2Fuseutils.com%2Fdashboard&client_id=client_9j2k3l&scope=read%20write%20admin';


export const UrlDecoder: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<'standard' | 'fullUri' | 'formUrl'>('standard');
  const [lineByLine, setLineByLine] = useState<boolean>(false);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Table parameters state
  const [paramsList, setParamsList] = useState<QueryParam[]>([]);
  const [urlBreakdown, setUrlBreakdown] = useState<URLBreakdown>({
    protocol: '',
    host: '',
    port: '',
    pathname: '',
    hash: '',
    search: '',
    isValidUrl: false,
    isRelative: false
  });

  const isEditingTableRef = useRef<boolean>(false);

  // Sync state between encoder and decoder via localStorage (matching JWT sync behavior)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('useutils_url_encoded_output');
    if (stored) {
      setInput(stored);
    }
  }, []);

  // Save changes to localStorage for encoder page sync
  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', val);
    }
  };

  // Synchronize URL parsing on input change
  useEffect(() => {
    if (isEditingTableRef.current) {
      isEditingTableRef.current = false;
      return;
    }

    // Try parsing the input URL (we decode first so relative parsing works even on encoded strings)
    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }

    const { breakdown, params } = parseUrlString(decodedAttempt);
    setUrlBreakdown(breakdown);
    setParamsList(params);
  }, [input]);

  // Main Decoding Logic
  const decodedOutput = useMemo(() => {
    setErrorMsg('');
    if (!input) return '';

    const decodeSingle = (text: string): string => {
      let working = trimWhitespace ? text.trim() : text;

      try {
        switch (mode) {
          case 'formUrl':
            return decodeURIComponent(working.replace(/\+/g, '%20'));
          case 'fullUri':
            return decodeURI(working);
          case 'standard':
          default:
            return decodeURIComponent(working);
        }
      } catch (e: any) {
        throw new Error(e.message || 'Malformed URI sequence');
      }
    };

    if (lineByLine) {
      let isAnyError = false;
      const results = input.split('\n').map(line => {
        try {
          return decodeSingle(line);
        } catch (e: any) {
          isAnyError = true;
          return `[Error: ${e.message}]`;
        }
      });
      if (isAnyError) {
        setErrorMsg('Some lines failed to decode due to malformed sequences.');
      }
      return results.join('\n');
    }

    try {
      return decodeSingle(input);
    } catch (e: any) {
      setErrorMsg(e.message || 'Malformed URI sequence');
      return '';
    }
  }, [input, mode, lineByLine, trimWhitespace]);

  // Sync decoded output to localStorage for encoder input sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (decodedOutput) {
      localStorage.setItem('useutils_url_raw_input', decodedOutput);
    }
  }, [decodedOutput]);

  // Memoized diff computation
  const diffData = useMemo(() => {
    if (!showDiff || !input || input.length > 1200 || decodedOutput.length > 1200 || errorMsg) return null;
    return diffChars(input, decodedOutput);
  }, [showDiff, input, decodedOutput, errorMsg]);

  // Statistics
  const statistics = useMemo(() => {
    const chars = input.length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const lines = input ? input.split('\n').length : 0;

    const outChars = decodedOutput.length;
    let sizeChangePercent = 0;
    if (chars > 0) {
      sizeChangePercent = ((outChars - chars) / chars) * 100;
    }

    return { chars, words, lines, sizeChangePercent, outChars };
  }, [input, decodedOutput]);

  // Actions
  const handleCopyOutput = () => {
    const success = copyToClipboard(decodedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleSwap = () => {
    if (errorMsg || !decodedOutput) return;
    setInput(decodedOutput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', decodedOutput);
    }
  };

  // Param editing handlers
  const handleParamEdit = (id: string, field: 'key' | 'value', val: string) => {
    isEditingTableRef.current = true;
    const updated = paramsList.map(p => {
      if (p.id === id) {
        return { ...p, [field]: val };
      }
      return p;
    });
    setParamsList(updated);

    // Reconstruct the unencoded/decoded URL
    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }
    const newDecodedUrl = rebuildUrl(decodedAttempt, updated, urlBreakdown);
    
    // Convert it back to matching encode format
    let finalInput = newDecodedUrl;
    try {
      if (input !== decodedAttempt) {
        // If input was encoded, we re-encode it to match the state
        finalInput = encodeURIComponent(newDecodedUrl);
      }
    } catch {
      // ignore
    }

    setInput(finalInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', finalInput);
    }
  };

  const handleParamToggle = (id: string) => {
    isEditingTableRef.current = true;
    const updated = paramsList.map(p => {
      if (p.id === id) {
        return { ...p, enabled: !p.enabled };
      }
      return p;
    });
    setParamsList(updated);

    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }
    const newDecodedUrl = rebuildUrl(decodedAttempt, updated, urlBreakdown);
    
    let finalInput = newDecodedUrl;
    try {
      if (input !== decodedAttempt) {
        finalInput = encodeURIComponent(newDecodedUrl);
      }
    } catch {
      // ignore
    }

    setInput(finalInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', finalInput);
    }
  };

  const handleParamDelete = (id: string) => {
    isEditingTableRef.current = true;
    const updated = paramsList.filter(p => p.id !== id);
    setParamsList(updated);

    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }
    const newDecodedUrl = rebuildUrl(decodedAttempt, updated, urlBreakdown);
    
    let finalInput = newDecodedUrl;
    try {
      if (input !== decodedAttempt) {
        finalInput = encodeURIComponent(newDecodedUrl);
      }
    } catch {
      // ignore
    }

    setInput(finalInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', finalInput);
    }
  };

  const handleParamAdd = () => {
    isEditingTableRef.current = true;
    const newParam: QueryParam = {
      id: Math.random().toString(36).substring(2, 9),
      key: 'param_name',
      value: 'value',
      enabled: true
    };
    const updated = [...paramsList, newParam];
    setParamsList(updated);

    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }
    const newDecodedUrl = rebuildUrl(decodedAttempt, updated, urlBreakdown);
    
    let finalInput = newDecodedUrl;
    try {
      if (input !== decodedAttempt) {
        finalInput = encodeURIComponent(newDecodedUrl);
      }
    } catch {
      // ignore
    }

    setInput(finalInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', finalInput);
    }
  };

  const handleParamsSort = () => {
    isEditingTableRef.current = true;
    const sorted = [...paramsList].sort((a, b) => a.key.localeCompare(b.key));
    setParamsList(sorted);

    let decodedAttempt = input;
    try {
      decodedAttempt = decodeURIComponent(input);
    } catch {
      // ignore
    }
    const newDecodedUrl = rebuildUrl(decodedAttempt, sorted, urlBreakdown);
    
    let finalInput = newDecodedUrl;
    try {
      if (input !== decodedAttempt) {
        finalInput = encodeURIComponent(newDecodedUrl);
      }
    } catch {
      // ignore
    }

    setInput(finalInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_encoded_output', finalInput);
    }
  };

  const handleCopyPart = (text: string) => {
    copyToClipboard(text);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Input */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Encoded Input Text
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {statistics.chars} chars • {statistics.words} words • {statistics.lines} lines
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_ENCODED_URL)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample URL
              </button>
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_RAW_URL_WITH_PARAMS)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample Query URL
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

          {/* Input Text Box */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste percent-encoded string, form data, or URL parameters here..."
              rows={10}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Configuration Controls */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Decoding Modes */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Decoding Mode / Specification
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1.5 rounded-lg">
                {[
                  { id: 'standard', name: 'Standard (Component)', title: 'Uses decodeURIComponent' },
                  { id: 'fullUri', name: 'Full URL (URI)', title: 'Uses decodeURI' },
                  { id: 'formUrl', name: 'Form (x-www-form-urlencoded)', title: 'Decodes + signs as spaces' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.title}
                    onClick={() => setMode(opt.id as any)}
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

            {/* Options */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineByLine}
                  onChange={(e) => setLineByLine(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Treat each line independently
              </label>

              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={trimWhitespace}
                  onChange={(e) => setTrimWhitespace(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Trim whitespace
              </label>
            </div>

          </div>
        </div>

        {/* Right Pane: Processed Output */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Decoded Output
              </h2>
              {input && !errorMsg && (
                <span className="text-[10px] font-mono mt-0.5 text-accent-emerald">
                  Size: {statistics.sizeChangePercent.toFixed(1)}% ({statistics.outChars} chars)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(!showDiff)}
                disabled={!input || input.length > 1200 || !!errorMsg}
                className={`px-2 py-0.5 text-[10px] rounded border font-mono transition-colors duration-150 cursor-pointer ${
                  showDiff && input.length <= 1200 && !errorMsg
                    ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-semibold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none'
                }`}
                title={input.length > 1200 ? 'Diff disabled for inputs over 1200 chars' : 'Show character modification highlights'}
              >
                Show Diff
              </button>
              <button
                type="button"
                onClick={handleSwap}
                disabled={!decodedOutput || !!errorMsg}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
                title="Swap input and output values"
              >
                Swap ⇄
              </button>
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!decodedOutput || !!errorMsg}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Display Decoded Text */}
          <div className="flex-grow min-h-[200px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto flex flex-col">
            {errorMsg ? (
              <div className="flex flex-col gap-2 p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs font-mono text-red-400">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-red-500">
                  <span>⚠️</span>
                  <span>Decoding Error</span>
                </div>
                <p className="leading-relaxed">{errorMsg}</p>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Verify that the encoding format is correct, or switch to standard mode.
                </p>
              </div>
            ) : showDiff && diffData ? (
              <div className="font-mono text-xs md:text-sm break-all leading-relaxed whitespace-pre-wrap selection:bg-emerald-400/20 max-h-[350px] overflow-y-auto">
                {diffData.map((node, index) => {
                  if (node.type === 'removed') {
                    return (
                      <span
                        key={index}
                        className="bg-red-900/30 text-red-400 line-through px-0.5 rounded-sm"
                      >
                        {node.value}
                      </span>
                    );
                  }
                  if (node.type === 'added') {
                    return (
                      <span
                        key={index}
                        className="bg-emerald-900/30 text-accent-emerald font-semibold border-b border-accent-emerald/30 px-0.5 rounded-sm"
                      >
                        {node.value}
                      </span>
                    );
                  }
                  return <span key={index} className="text-zinc-200">{node.value}</span>;
                })}
              </div>
            ) : (
              <textarea
                value={decodedOutput}
                readOnly
                placeholder="Decoded output will appear here dynamically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all flex-grow"
              />
            )}

            {decodedOutput && !showDiff && !errorMsg && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
              </div>
            )}
          </div>

          {/* Privacy Pill */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

      </div>

      {/* URL Parameter Parser & Breakdown Manager Section */}
      {urlBreakdown.isValidUrl && (
        <div className="bg-panel border border-border-hairline rounded-lg p-5 mt-2 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center border-b border-border-hairline/60 pb-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Interactive URL Breakdown & Query Manager
              </h3>
              <p className="text-[10px] text-zinc-500 font-sans">
                Analyze URL structure and modify query strings dynamically. Changes will reconstruct the input string in real-time.
              </p>
            </div>
            {urlBreakdown.isRelative ? (
              <span className="text-[9px] font-mono bg-zinc-900 border border-border-hairline text-zinc-400 px-2 py-0.5 rounded uppercase font-semibold">
                Relative Path/Query
              </span>
            ) : (
              <span className="text-[9px] font-mono bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald px-2 py-0.5 rounded uppercase font-semibold">
                Absolute URL
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Visual Breakdown of Parts */}
            <div className="xl:col-span-1 flex flex-col gap-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono pl-1">
                URL Component Dissection
              </span>
              <div className="bg-zinc-900/60 border border-border-hairline rounded-lg overflow-hidden divide-y divide-border-hairline font-mono text-[11px]">
                
                {/* Protocol */}
                {!urlBreakdown.isRelative && urlBreakdown.protocol && (
                  <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                    <span className="text-zinc-500">Scheme/Protocol</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-accent-emerald font-semibold">{urlBreakdown.protocol}</span>
                      <button
                        onClick={() => handleCopyPart(urlBreakdown.protocol)}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-700 cursor-pointer"
                        title="Copy Scheme"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Host */}
                {!urlBreakdown.isRelative && urlBreakdown.host && (
                  <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                    <span className="text-zinc-500">Host / Domain</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-200">{urlBreakdown.host}</span>
                      <button
                        onClick={() => handleCopyPart(urlBreakdown.host)}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-700 cursor-pointer"
                        title="Copy Host"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Port */}
                {!urlBreakdown.isRelative && urlBreakdown.port && (
                  <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                    <span className="text-zinc-500">Port</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-200">{urlBreakdown.port}</span>
                      <button
                        onClick={() => handleCopyPart(urlBreakdown.port)}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-700 cursor-pointer"
                        title="Copy Port"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Pathname */}
                <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                  <span className="text-zinc-500">Pathname</span>
                  <div className="flex items-center gap-1.5 overflow-hidden justify-end max-w-[70%]">
                    <span className="text-zinc-200 truncate" title={urlBreakdown.pathname}>{urlBreakdown.pathname}</span>
                    <button
                      onClick={() => handleCopyPart(urlBreakdown.pathname)}
                      className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-700 cursor-pointer shrink-0"
                      title="Copy Path"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Hash */}
                {urlBreakdown.hash && (
                  <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                    <span className="text-zinc-500">Hash / Anchor</span>
                    <div className="flex items-center gap-1.5 overflow-hidden justify-end max-w-[70%]">
                      <span className="text-amber-500 truncate" title={urlBreakdown.hash}>{urlBreakdown.hash}</span>
                      <button
                        onClick={() => handleCopyPart(urlBreakdown.hash)}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-700 cursor-pointer shrink-0"
                        title="Copy Anchor"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Search query representation */}
                <div className="flex items-center justify-between p-2.5 hover:bg-zinc-900/80 group">
                  <span className="text-zinc-500">Query Parameters</span>
                  <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">
                    {paramsList.length} items
                  </span>
                </div>
              </div>
            </div>

            {/* Query parameters Table editor */}
            <div className="xl:col-span-2 flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">
                  Query Parameters Editor
                </span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleParamsSort}
                    disabled={paramsList.length < 2}
                    className="px-2 py-0.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-400 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded cursor-pointer transition-colors font-mono"
                  >
                    Sort Alphabetically ↕
                  </button>
                  <button
                    type="button"
                    onClick={handleParamAdd}
                    className="px-2 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/30 text-accent-emerald rounded cursor-pointer transition-colors font-mono font-semibold"
                  >
                    + Add Parameter
                  </button>
                </div>
              </div>

              {paramsList.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-12 text-center gap-2 bg-zinc-900/30 border border-border-hairline border-dashed rounded-lg">
                  <span className="text-xl text-zinc-650">🔌</span>
                  <h4 className="text-xs font-semibold text-zinc-400 font-mono">No query parameters found</h4>
                  <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                    This URL doesn't contain a query string. Click '+ Add Parameter' to inject new key-values.
                  </p>
                </div>
              ) : (
                <div className="border border-border-hairline rounded-lg bg-zinc-900/30 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border-hairline bg-zinc-950 font-mono text-zinc-400">
                          <th className="p-2.5 w-10 text-center">Active</th>
                          <th className="p-2.5 w-1/3">Parameter Key</th>
                          <th className="p-2.5">Parameter Value</th>
                          <th className="p-2.5 w-12 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-hairline/60">
                        {paramsList.map((param) => (
                          <tr key={param.id} className={`hover:bg-zinc-900/20 font-mono transition-colors ${!param.enabled ? 'opacity-40' : ''}`}>
                            
                            {/* Toggle active state */}
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={param.enabled}
                                onChange={() => handleParamToggle(param.id)}
                                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                                title={param.enabled ? 'Disable parameter' : 'Enable parameter'}
                              />
                            </td>

                            {/* Key Field */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={param.key}
                                onChange={(e) => handleParamEdit(param.id, 'key', e.target.value)}
                                className="w-full bg-canvas border border-border-hairline hover:border-zinc-700 focus:border-accent-emerald/40 outline-none rounded px-2 py-1 text-xs text-zinc-200"
                                placeholder="key"
                              />
                            </td>

                            {/* Value Field */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={param.value}
                                onChange={(e) => handleParamEdit(param.id, 'value', e.target.value)}
                                className="w-full bg-canvas border border-border-hairline hover:border-zinc-700 focus:border-accent-emerald/40 outline-none rounded px-2 py-1 text-xs text-zinc-200"
                                placeholder="value"
                              />
                            </td>

                            {/* Delete Parameter Button */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleParamDelete(param.id)}
                                className="text-zinc-500 hover:text-red-400 cursor-pointer p-1 rounded hover:bg-zinc-800 transition-colors font-sans text-xs"
                                title="Delete parameter"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
