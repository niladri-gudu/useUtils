import React, { useState, useEffect, useMemo } from 'react';
import { strictHexEncode } from '../utils-engine/url';
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
const SAMPLE_TEXT = 'https://api.useutils.com/v1/search?q=developer tools&limit=10&secure=true#main';
const SAMPLE_RAW = 'name=John Doe&email=john.doe@example.com&skills=React,TypeScript,Astro&status=active!';


export const UrlEncoder: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<'standard' | 'fullUri' | 'rfc3986' | 'formUrl' | 'strictHex'>('standard');
  const [lineByLine, setLineByLine] = useState<boolean>(false);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Sync state between encoder and decoder via localStorage (matching JWT sync behavior)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('useutils_url_raw_input');
    if (stored) {
      setInput(stored);
    }
  }, []);

  // Save changes to localStorage for decoder page sync
  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_raw_input', val);
    }
  };

  // Main Encoding Logic
  const encodedOutput = useMemo(() => {
    if (!input) return '';

    const encodeSingle = (text: string): string => {
      let working = trimWhitespace ? text.trim() : text;

      switch (mode) {
        case 'fullUri':
          return encodeURI(working);
        case 'rfc3986':
          return encodeURIComponent(working).replace(
            /[!'()*]/g,
            c => '%' + c.charCodeAt(0).toString(16).toUpperCase()
          );
        case 'formUrl':
          return encodeURIComponent(working).replace(/%20/g, '+');
        case 'strictHex':
          return strictHexEncode(working);
        case 'standard':
        default:
          return encodeURIComponent(working);
      }
    };

    if (lineByLine) {
      return input
        .split('\n')
        .map(line => encodeSingle(line))
        .join('\n');
    }

    return encodeSingle(input);
  }, [input, mode, lineByLine, trimWhitespace]);

  // Sync encoded output to localStorage for decoder input sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (encodedOutput) {
      localStorage.setItem('useutils_url_encoded_output', encodedOutput);
    }
  }, [encodedOutput]);

  // Memoized diff computation
  const diffData = useMemo(() => {
    if (!showDiff || !input || input.length > 1200 || encodedOutput.length > 1200) return null;
    return diffChars(input, encodedOutput);
  }, [showDiff, input, encodedOutput]);

  // Statistics
  const statistics = useMemo(() => {
    const chars = input.length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const lines = input ? input.split('\n').length : 0;

    const outChars = encodedOutput.length;
    let sizeChangePercent = 0;
    if (chars > 0) {
      sizeChangePercent = ((outChars - chars) / chars) * 100;
    }

    return { chars, words, lines, sizeChangePercent, outChars };
  }, [input, encodedOutput]);

  // Actions
  const handleCopyOutput = () => {
    const success = copyToClipboard(encodedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleSwap = () => {
    if (!encodedOutput) return;
    setInput(encodedOutput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_url_raw_input', encodedOutput);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Controls & Input */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Raw Input Text
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {statistics.chars} chars • {statistics.words} words • {statistics.lines} lines
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_TEXT)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample URL
              </button>
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_RAW)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample Query
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
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste raw text, query strings, or complete URLs here..."
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
            
            {/* Encoding Modes */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Encoding Mode / Specification
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1.5 rounded-lg">
                {[
                  { id: 'standard', name: 'Standard (Component)', title: 'Uses encodeURIComponent' },
                  { id: 'fullUri', name: 'Full URL (URI)', title: 'Uses encodeURI' },
                  { id: 'rfc3986', name: 'Strict RFC 3986', title: 'Encodes !, \', (, ), and * as per strict specifications' },
                  { id: 'formUrl', name: 'Form (x-www-form-urlencoded)', title: 'Encodes spaces as + signs' },
                  { id: 'strictHex', name: 'Strict Hex (Obfuscate)', title: 'Encodes every character to its %XX hex sequence' }
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
                Encoded URL Output
              </h2>
              {input && (
                <span className={`text-[10px] font-mono mt-0.5 ${
                  statistics.sizeChangePercent > 0 ? 'text-amber-500' : 'text-zinc-500'
                }`}>
                  Size: +{statistics.sizeChangePercent.toFixed(1)}% ({statistics.outChars} chars)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(!showDiff)}
                disabled={!input || input.length > 1200}
                className={`px-2 py-0.5 text-[10px] rounded border font-mono transition-colors duration-150 cursor-pointer ${
                  showDiff && input.length <= 1200
                    ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-semibold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none'
                }`}
                title={input.length > 1200 ? 'Diff disabled for inputs over 1200 chars' : 'Show character encoding modifications'}
              >
                Show Diff
              </button>
              <button
                type="button"
                onClick={handleSwap}
                disabled={!encodedOutput}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
                title="Swap input and output values"
              >
                Swap ⇄
              </button>
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!encodedOutput}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Output Textbox */}
          <div className="flex-grow min-h-[200px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto">
            {showDiff && diffData ? (
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
                value={encodedOutput}
                readOnly
                placeholder="Percent-encoded output will appear here dynamically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
              />
            )}

            {encodedOutput && !showDiff && (
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
    </div>
  );
};
