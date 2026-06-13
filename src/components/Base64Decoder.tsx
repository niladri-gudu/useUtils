import React, { useState, useEffect, useMemo } from 'react';
import { formatBytes } from '../utils-engine/file';
import { decodeBase64, detectFileTypeFromB64 } from '../utils-engine/base64';

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

const SAMPLE_ENCODED_TEXT = 'Ly8gU2FtcGxlIGNvbmZpZ3VyYXRpb24gc3RydWN0dXJlCnsKICAibmFtZSI6ICJ1c2VVdGlscyBEZXZlbG9wZXIgVG9vbHMiLAogICJjbGllbnQiOiAibG9jYWwtZmlyc3Qtc2FuZGJveCIsCiAgInNlY3VyZSI6IHRydWUsCiAgImVudHJvcHkiOiAiMzRkMzk5IiwKICAiZmVhdHVyZXMiOiBbCiAgICAiSldUIEVuY29kZS9EZWNvZGUiLAogICAgIlVSTCBQZXJjZW50IEVzY2FwZSIsCiAgICAiQmFzZTY0IEZpbGUgQ29udmVydGVyIgogIF1KfQ==';
const SAMPLE_ENCODED_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiPgo8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjMzRkMzk5IiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiIC8+CjxwYXRoIGQ9Ik0zMCA1MCBMMjUgNTAgTDQ1IDcwIEw3NSA0MCIgc3Ryb2tlPSIjMzRkMzk5IiBzdHJva2Utd2lkdGg9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgLz4KPC9zdmc+';



export const Base64Decoder: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [encoding, setEncoding] = useState<'utf-8' | 'ascii'>('utf-8');
  const [outputMode, setOutputMode] = useState<'text' | 'file'>('text');
  
  // Custom file download details
  const [fileName, setFileName] = useState<string>('decoded_file');

  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync state with localstorage on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('useutils_base64_encoded_text');
    if (stored) {
      setInput(stored);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_base64_encoded_text', val);
    }
  };

  // Strip Data URI headers and extract details if available
  const parsedInput = useMemo(() => {
    let cleanB64 = input.trim().replace(/\s/g, ''); // strip newlines, spaces
    let detectedMime = '';

    const dataUriMatch = cleanB64.match(/^data:([^;]+);base64,(.*)$/);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1];
      cleanB64 = dataUriMatch[2];
    }

    return {
      base64: cleanB64,
      headerMime: detectedMime
    };
  }, [input]);

  // File type analysis from magic bytes
  const fileTypeInfo = useMemo(() => {
    if (!parsedInput.base64) {
      return { mime: 'text/plain', ext: 'txt', isImage: false };
    }
    const detected = detectFileTypeFromB64(parsedInput.base64);
    
    // Fall back to header-defined mime if detected says text/plain
    if (parsedInput.headerMime && detected.mime === 'text/plain') {
      const isImg = parsedInput.headerMime.startsWith('image/') || parsedInput.headerMime === 'image/svg+xml';
      const parts = parsedInput.headerMime.split('/');
      return {
        mime: parsedInput.headerMime,
        ext: parts[1] || 'bin',
        isImage: isImg
      };
    }

    return detected;
  }, [parsedInput]);

  // Decode logic
  const decodedResult = useMemo(() => {
    setErrorMsg('');
    if (!parsedInput.base64) return '';

    // Validate Base64 characters
    const validB64Regex = /^[a-zA-Z0-9+/]*={0,2}$/;
    if (!validB64Regex.test(parsedInput.base64)) {
      setErrorMsg('Input is not a valid Base64 string. Contains invalid characters.');
      return '';
    }

    try {
      if (outputMode === 'text') {
        return decodeBase64(parsedInput.base64, encoding);
      }
      return atob(parsedInput.base64); // fallback for raw preview/count
    } catch (err: any) {
      setErrorMsg(
        err.message?.includes('decode') 
          ? 'Decoding failed: Malformed UTF-8 sequence. Try ASCII mode.' 
          : 'Invalid Base64 sequence. Could not decode.'
      );
      return '';
    }
  }, [parsedInput, encoding, outputMode]);

  // Sync text results to encoder raw text state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (outputMode === 'text' && decodedResult && !errorMsg) {
      localStorage.setItem('useutils_base64_raw_text', decodedResult);
    }
  }, [decodedResult, outputMode, errorMsg]);

  // Performant blob trigger for file download
  const handleDownload = () => {
    if (!parsedInput.base64 || errorMsg) return;

    try {
      const binary = atob(parsedInput.base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: fileTypeInfo.mime });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.${fileTypeInfo.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg('Failed to process binary file for download.');
    }
  };

  const handleCopyOutput = () => {
    if (typeof decodedResult === 'string') {
      const success = copyToClipboard(decodedResult);
      if (success) {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1500);
      }
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const inputChars = input.length;
    let outBytes = 0;
    try {
      if (parsedInput.base64) {
        outBytes = atob(parsedInput.base64).length;
      }
    } catch(e) {}
    
    return {
      inputChars,
      outBytes
    };
  }, [input, parsedInput]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Input controls */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Base64 Input
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.inputChars} chars
              </span>
            </div>

            {/* Samples */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_ENCODED_TEXT)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample Text
              </button>
              <button
                type="button"
                onClick={() => handleInputChange(SAMPLE_ENCODED_IMAGE)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample SVG
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

          {/* Text Input area */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste Base64 encoded string or Data URI here to decode..."
              rows={10}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Config Controls */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Mode selection (Text vs File download) */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Decoded Output Mode
              </label>
              <div className="flex bg-zinc-900/30 p-1 rounded-lg border border-border-hairline/60 w-max">
                <button
                  type="button"
                  onClick={() => setOutputMode('text')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
                    outputMode === 'text'
                      ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Text Plain
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode('file')}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
                    outputMode === 'file'
                      ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Binary File
                </button>
              </div>
            </div>

            {/* Character Encoding (Text mode only) */}
            {outputMode === 'text' && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Text Character Encoding
                </label>
                <div className="flex gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg w-max">
                  <button
                    type="button"
                    onClick={() => setEncoding('utf-8')}
                    className={`px-3 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      encoding === 'utf-8'
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    UTF-8
                  </button>
                  <button
                    type="button"
                    onClick={() => setEncoding('ascii')}
                    className={`px-3 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      encoding === 'ascii'
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    ASCII (7-bit)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Pane: Processed Output */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Decoded Output Details
              </h2>
              {input && !errorMsg && (
                <span className="text-[10px] font-mono mt-0.5 text-zinc-500">
                  Decoded size: {formatBytes(stats.outBytes)} • MIME: {fileTypeInfo.mime}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {outputMode === 'text' && (
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  disabled={!decodedResult || !!errorMsg}
                  className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
                >
                  {copyFeedback ? 'Copied ✓' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Output display depending on Output Mode */}
          {errorMsg ? (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs font-mono text-red-400">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-red-500 mb-1">
                <span>⚠️</span>
                <span>Decoding Error</span>
              </div>
              {errorMsg}
            </div>
          ) : outputMode === 'text' ? (
            /* Text display output */
            <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto flex flex-col">
              <textarea
                value={decodedResult}
                readOnly
                placeholder="Decoded text output will appear here dynamically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all flex-grow"
              />
              {decodedResult && (
                <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                </div>
              )}
            </div>
          ) : (
            /* Binary file download output details */
            <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-5 flex flex-col justify-center items-center gap-4 text-center">
              <span className="text-4xl">💾</span>
              <div className="flex flex-col gap-1 max-w-xs">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono">
                  Decoded File Sandbox
                </h4>
                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                  The base64 payload is parsed as a binary stream. Save it locally using the downloader below.
                </p>
              </div>

              {/* Form elements for custom download file name */}
              {parsedInput.base64 && (
                <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                  <div className="flex items-center bg-zinc-900 border border-border-hairline rounded-lg px-2.5 py-1">
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="bg-transparent text-xs font-mono text-zinc-200 outline-none w-full"
                      placeholder="Filename"
                    />
                    <span className="text-xs font-mono text-zinc-500 px-1">
                      .{fileTypeInfo.ext}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-2 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    Download Decoded File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Visual Previewer if decoded is image or SVG */}
          {!errorMsg && parsedInput.base64 && fileTypeInfo.isImage && (
            <div className="border border-border-hairline rounded-lg bg-zinc-900/30 p-3 flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono pl-1">
                Visual Image Preview
              </span>
              <div className="w-full h-40 rounded border border-border-hairline/80 bg-zinc-950 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={`data:${fileTypeInfo.mime};base64,${parsedInput.base64}`}
                  alt="Decoded visual preview"
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            </div>
          )}

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
