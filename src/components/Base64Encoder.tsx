import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatBytes } from '../utils-engine/file';
import { encodeBase64, uint8ToBase64 } from '../utils-engine/base64';

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



const SAMPLE_TEXT = `// Sample configuration structure
{
  "name": "useUtils Developer Tools",
  "client": "local-first-sandbox",
  "secure": true,
  "entropy": "34d399",
  "features": [
    "JWT Encode/Decode",
    "URL Percent Escape",
    "Base64 File Converter"
  ]
}`;

export const Base64Encoder: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [encoding, setEncoding] = useState<'utf-8' | 'ascii'>('utf-8');
  const [lineWrap, setLineWrap] = useState<'none' | '64' | '76'>('none');
  const [outputFormat, setOutputFormat] = useState<'raw' | 'uri' | 'css' | 'html'>('raw');
  
  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync state with localstorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('useutils_base64_raw_text');
    if (stored) {
      setInput(stored);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_base64_raw_text', val);
    }
  };

  // Convert raw text based on selected encoding
  const rawBase64OfText = useMemo(() => {
    setErrorMsg('');
    if (mode !== 'text' || !input) return '';

    try {
      return encodeBase64(input, encoding);
    } catch (err: any) {
      setErrorMsg(err.message || 'Encoding failed');
      return '';
    }
  }, [input, encoding, mode]);

  // Compute active base64 string depending on mode
  const activeBase64String = mode === 'text' ? rawBase64OfText : fileBase64;

  // Format the output (Raw, Data URI, CSS background, HTML Image)
  const formattedOutput = useMemo(() => {
    if (!activeBase64String) return '';

    const mime = mode === 'text' ? 'text/plain' : fileType || 'application/octet-stream';
    let base = activeBase64String;

    // Apply formatting wrappers
    switch (outputFormat) {
      case 'uri':
        base = `data:${mime};base64,${base}`;
        break;
      case 'css':
        base = `background-image: url("data:${mime};base64,${base}");`;
        break;
      case 'html':
        if (mime.startsWith('image/')) {
          base = `<img src="data:${mime};base64,${base}" alt="${file ? file.name : 'Base64 Image'}" />`;
        } else {
          base = `<iframe src="data:${mime};base64,${base}"></iframe>`;
        }
        break;
      case 'raw':
      default:
        break;
    }

    // Apply line wrapping
    if (lineWrap !== 'none') {
      const size = parseInt(lineWrap);
      const regex = new RegExp(`.{1,${size}}`, 'g');
      const chunks = base.match(regex);
      return chunks ? chunks.join('\n') : base;
    }

    return base;
  }, [activeBase64String, outputFormat, lineWrap, mode, fileType, file]);

  // Sync formatted output to LocalStorage for Decoder input sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeBase64String) {
      // Always store the raw base64 or Data URI so the decoder can read it directly
      const mime = mode === 'text' ? 'text/plain' : fileType || 'application/octet-stream';
      localStorage.setItem('useutils_base64_encoded_text', `data:${mime};base64,${activeBase64String}`);
    }
  }, [activeBase64String, fileType, mode]);

  // File Ingestion Logic
  const processFile = (selectedFile: File) => {
    setErrorMsg('');
    setFile(selectedFile);
    setFileType(selectedFile.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.target.result);
        try {
          const b64 = uint8ToBase64(bytes);
          setFileBase64(b64);
        } catch (err: any) {
          setErrorMsg('Failed to convert file binary to Base64.');
        }
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read selected file.');
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFileBase64('');
    setFileType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyOutput = () => {
    const success = copyToClipboard(formattedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let inputBytes = 0;
    if (mode === 'text') {
      inputBytes = new TextEncoder().encode(input).length;
    } else if (file) {
      inputBytes = file.size;
    }

    const outputBytes = formattedOutput.length;
    const change = inputBytes > 0 ? ((outputBytes - inputBytes) / inputBytes) * 100 : 0;

    return {
      inputBytes,
      outputBytes,
      change
    };
  }, [input, file, formattedOutput, mode]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Ingest Controls */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          
          <div className="flex justify-between items-center">
            {/* Input Selection Tabs */}
            <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-border-hairline/60">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
                  mode === 'text'
                    ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
                  mode === 'file'
                    ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                File Drop
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {mode === 'text' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleInputChange(SAMPLE_TEXT)}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
                  >
                    Sample JSON
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
                </>
              )}
              {mode === 'file' && file && (
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors font-mono"
                >
                  Clear File
                </button>
              )}
            </div>
          </div>

          {/* Text Input area */}
          {mode === 'text' ? (
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type or paste plain text here to encode..."
                rows={10}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              {!input && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
          ) : (
            /* File Upload drag/drop area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full min-h-[220px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-6 gap-3 cursor-pointer select-none transition-all ${
                isDragOver 
                  ? 'border-accent-emerald bg-accent-emerald/5' 
                  : 'border-border-hairline bg-canvas/30 hover:border-zinc-700 hover:bg-canvas/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl">📄</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-200 font-mono truncate max-w-[280px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {formatBytes(file.size)} • {file.type || 'unknown type'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 px-2 py-0.5 rounded font-mono font-semibold uppercase mt-1">
                    Ready to copy
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl text-zinc-650">📥</span>
                  <h4 className="text-xs font-semibold text-zinc-300 font-sans">
                    Drag & Drop File Here
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-sans max-w-[240px] leading-relaxed">
                    or click to browse local files. Supported format sizes up to 20MB.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Configuration Controls */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Options Row (Text mode only) */}
            {mode === 'text' && (
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

            {/* Output Formatting */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Output Format Wrapper
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {[
                  { id: 'raw', name: 'Raw Base64', title: 'Output raw encoded string' },
                  { id: 'uri', name: 'Data URI', title: 'Prefixed with data:<mime>;base64,' },
                  { id: 'css', name: 'CSS background', title: 'Wrapped in background-image url(...)' },
                  { id: 'html', name: 'HTML tag', title: 'Wrapped in HTML tags' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.title}
                    onClick={() => setOutputFormat(opt.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      outputFormat === opt.id
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Wrapping */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Line Wrapping Offset
              </label>
              <div className="flex gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg w-max">
                {[
                  { id: 'none', name: 'None' },
                  { id: '64', name: '64 Chars (MIME)' },
                  { id: '76', name: '76 Chars (PEM)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLineWrap(opt.id as any)}
                    className={`px-3 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      lineWrap === opt.id
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane: Processed Output */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Base64 Encoded Output
              </h2>
              {activeBase64String && !errorMsg && (
                <span className="text-[10px] font-mono mt-0.5 text-zinc-500">
                  Input size: {formatBytes(stats.inputBytes)} • Output size: {formatBytes(stats.outputBytes)} (+{stats.change.toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!formattedOutput || !!errorMsg}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Text Output Box */}
          <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto flex flex-col">
            {errorMsg ? (
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs font-mono text-red-400">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-red-500 mb-1">
                  <span>⚠️</span>
                  <span>Encoding Error</span>
                </div>
                {errorMsg}
              </div>
            ) : (
              <textarea
                value={formattedOutput}
                readOnly
                placeholder="Base64 encoded string will appear here dynamically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all flex-grow"
              />
            )}

            {formattedOutput && !errorMsg && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
              </div>
            )}
          </div>

          {/* File Image Previewer */}
          {mode === 'file' && file && fileBase64 && file.type.startsWith('image/') && (
            <div className="border border-border-hairline rounded-lg bg-zinc-900/30 p-3 flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono pl-1">
                Visual Image Preview
              </span>
              <div className="w-full h-40 rounded border border-border-hairline/80 bg-zinc-950 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={`data:${file.type};base64,${fileBase64}`}
                  alt="Encoded visual preview"
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
