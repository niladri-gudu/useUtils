import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatBytes } from '../utils-engine/file';
import {
  generateHash,
  generateHMAC,
  uint8ArrayToHex,
  uint8ArrayToBase64,
  uint8ArrayToBase64Url,
  uint8ArrayToDecimal
} from '../utils-engine/hash';

// ==========================================
// Clipboard Copy Helper
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

const SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog';

export const HashGenerator: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'bulk' | 'file'>('text');
  const [algorithm, setAlgorithm] = useState<string>('SHA-256');
  const [hmacEnabled, setHmacEnabled] = useState<boolean>(false);
  const [hmacKey, setHmacKey] = useState<string>('');
  const [showHmacKey, setShowHmacKey] = useState<boolean>(false);
  const [outputEncoding, setOutputEncoding] = useState<'hex' | 'hex_upper' | 'base64' | 'base64url' | 'decimal'>('hex');

  // Input states
  const [textInput, setTextInput] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Output states
  const [outputHash, setOutputHash] = useState<string>('');
  const [fileHash, setFileHash] = useState<string>('');
  const [fileProcessing, setFileProcessing] = useState<boolean>(false);
  const [bulkResults, setBulkResults] = useState<Array<{ input: string; hash: string; error?: string }>>([]);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [copyBulkFeedback, setCopyBulkFeedback] = useState<'csv' | 'json' | 'raw' | null>(null);

  // Checksum comparison
  const [checksumInput, setChecksumInput] = useState<string>('');

  // Sync state with LocalStorage for text inputs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedText = localStorage.getItem('useutils_hash_text_input');
    if (storedText) setTextInput(storedText);

    const storedKey = localStorage.getItem('useutils_hash_hmac_key');
    if (storedKey) setHmacKey(storedKey);

    const storedAlgo = localStorage.getItem('useutils_hash_algo');
    if (storedAlgo) setAlgorithm(storedAlgo);
  }, []);

  const handleTextChange = (val: string) => {
    setTextInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_hash_text_input', val);
    }
  };

  const handleKeyChange = (val: string) => {
    setHmacKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_hash_hmac_key', val);
    }
  };

  const handleAlgoChange = (val: string) => {
    setAlgorithm(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_hash_algo', val);
    }
  };

  // 1. Calculate Hash for Single Text Mode
  useEffect(() => {
    let isMounted = true;
    if (mode !== 'text') return;

    if (!textInput) {
      setOutputHash('');
      setErrorMsg(null);
      return;
    }

    const calculateTextHash = async () => {
      try {
        let hashBytes: Uint8Array;
        if (hmacEnabled) {
          hashBytes = await generateHMAC(textInput, hmacKey, algorithm);
        } else {
          hashBytes = await generateHash(textInput, algorithm);
        }

        if (!isMounted) return;

        let formatted = '';
        if (outputEncoding === 'hex') formatted = uint8ArrayToHex(hashBytes);
        else if (outputEncoding === 'hex_upper') formatted = uint8ArrayToHex(hashBytes).toUpperCase();
        else if (outputEncoding === 'base64') formatted = uint8ArrayToBase64(hashBytes);
        else if (outputEncoding === 'base64url') formatted = uint8ArrayToBase64Url(hashBytes);
        else if (outputEncoding === 'decimal') formatted = uint8ArrayToDecimal(hashBytes);

        setOutputHash(formatted);
        setErrorMsg(null);
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Hashing failed');
          setOutputHash('');
        }
      }
    };

    calculateTextHash();
    return () => {
      isMounted = false;
    };
  }, [textInput, algorithm, hmacEnabled, hmacKey, outputEncoding, mode]);

  // 2. Calculate Hash for Bulk Mode
  useEffect(() => {
    let isMounted = true;
    if (mode !== 'bulk') return;

    if (!textInput) {
      setBulkResults([]);
      setErrorMsg(null);
      return;
    }

    const calculateBulkHash = async () => {
      const lines = textInput.split('\n');
      try {
        const results = await Promise.all(
          lines.map(async (line) => {
            if (!line) return { input: line, hash: '' };
            try {
              let hashBytes: Uint8Array;
              if (hmacEnabled) {
                hashBytes = await generateHMAC(line, hmacKey, algorithm);
              } else {
                hashBytes = await generateHash(line, algorithm);
              }
              
              let formatted = '';
              if (outputEncoding === 'hex') formatted = uint8ArrayToHex(hashBytes);
              else if (outputEncoding === 'hex_upper') formatted = uint8ArrayToHex(hashBytes).toUpperCase();
              else if (outputEncoding === 'base64') formatted = uint8ArrayToBase64(hashBytes);
              else if (outputEncoding === 'base64url') formatted = uint8ArrayToBase64Url(hashBytes);
              else if (outputEncoding === 'decimal') formatted = uint8ArrayToDecimal(hashBytes);

              return { input: line, hash: formatted };
            } catch (err: any) {
              return { input: line, hash: '', error: err.message || 'Hashing error' };
            }
          })
        );

        if (isMounted) {
          setBulkResults(results);
          setErrorMsg(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Bulk hashing failed');
        }
      }
    };

    calculateBulkHash();
    return () => {
      isMounted = false;
    };
  }, [textInput, algorithm, hmacEnabled, hmacKey, outputEncoding, mode]);

  // 3. Calculate Hash for File Mode
  useEffect(() => {
    let isMounted = true;
    if (mode !== 'file' || !file) {
      setFileHash('');
      return;
    }

    const calculateFileHash = async () => {
      setFileProcessing(true);
      setErrorMsg(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!isMounted) return;
        const bytes = new Uint8Array(arrayBuffer);

        let hashBytes: Uint8Array;
        if (hmacEnabled) {
          hashBytes = await generateHMAC(bytes, hmacKey, algorithm);
        } else {
          hashBytes = await generateHash(bytes, algorithm);
        }

        if (!isMounted) return;

        let formatted = '';
        if (outputEncoding === 'hex') formatted = uint8ArrayToHex(hashBytes);
        else if (outputEncoding === 'hex_upper') formatted = uint8ArrayToHex(hashBytes).toUpperCase();
        else if (outputEncoding === 'base64') formatted = uint8ArrayToBase64(hashBytes);
        else if (outputEncoding === 'base64url') formatted = uint8ArrayToBase64Url(hashBytes);
        else if (outputEncoding === 'decimal') formatted = uint8ArrayToDecimal(hashBytes);

        setFileHash(formatted);
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'File hashing failed');
          setFileHash('');
        }
      } finally {
        if (isMounted) {
          setFileProcessing(false);
        }
      }
    };

    calculateFileHash();
    return () => {
      isMounted = false;
    };
  }, [file, algorithm, hmacEnabled, hmacKey, outputEncoding, mode]);

  // Drag and Drop File Handlers
  const processFile = (selectedFile: File) => {
    setErrorMsg(null);
    setFile(selectedFile);
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
    setFileHash('');
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Action Triggers
  const handleCopyOutput = () => {
    const activeHash = mode === 'text' ? outputHash : fileHash;
    const success = copyToClipboard(activeHash);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleCopyBulk = (formatType: 'csv' | 'json' | 'raw') => {
    let textToCopy = '';
    if (formatType === 'json') {
      textToCopy = JSON.stringify(bulkResults, null, 2);
    } else if (formatType === 'csv') {
      textToCopy = 'Input,Hash\n' + bulkResults.map(r => `"${r.input.replace(/"/g, '""')}","${r.hash}"`).join('\n');
    } else {
      textToCopy = bulkResults.map(r => r.hash).join('\n');
    }

    const success = copyToClipboard(textToCopy);
    if (success) {
      setCopyBulkFeedback(formatType);
      setTimeout(() => setCopyBulkFeedback(null), 1500);
    }
  };

  const handleReset = () => {
    setTextInput('');
    setHmacEnabled(false);
    setHmacKey('');
    setChecksumInput('');
    setFile(null);
    setFileHash('');
    setOutputHash('');
    setBulkResults([]);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('useutils_hash_text_input');
      localStorage.removeItem('useutils_hash_hmac_key');
    }
  };

  // Checksum matching validation status
  const checksumMatch = useMemo(() => {
    if (!checksumInput) return null;
    const activeHash = mode === 'text' ? outputHash : (mode === 'file' ? fileHash : '');
    if (!activeHash) return null;
    return activeHash.trim().toLowerCase() === checksumInput.trim().toLowerCase();
  }, [checksumInput, outputHash, fileHash, mode]);

  // Bit/Byte sizes helper
  const hashBits = useMemo(() => {
    const algoSizes: Record<string, number> = {
      'MD5': 128,
      'SHA-1': 160,
      'SHA-256': 256,
      'SHA-384': 384,
      'SHA-512': 512,
    };
    return algoSizes[algorithm] || 256;
  }, [algorithm]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Ingest Controls & Settings */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            {/* Input Selection Tabs */}
            <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-border-hairline/60">
              {(['text', 'bulk', 'file'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMode(t)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 uppercase tracking-wide ${
                    mode === t
                      ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t === 'text' ? 'Single Text' : t === 'bulk' ? 'Bulk lines' : 'File Checksum'}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {mode !== 'file' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTextChange(SAMPLE_TEXT)}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
                  >
                    Sample String
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-0.5 text-[10px] bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded border border-zinc-750 cursor-pointer transition-colors font-mono"
                  >
                    Reset
                  </button>
                </>
              ) : (
                file && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors font-mono"
                  >
                    Clear File
                  </button>
                )
              )}
            </div>
          </div>

          {/* Core Input Panes */}
          {mode === 'text' && (
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Plain Text Input
              </label>
              <textarea
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Type or paste plain text here to compute hash in real-time..."
                rows={8}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              {!textInput && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
          )}

          {mode === 'bulk' && (
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Bulk Lines Input (Each line computed separately)
              </label>
              <textarea
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Enter strings (one per line)...&#10;hello&#10;world&#10;useutils"
                rows={8}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
            </div>
          )}

          {mode === 'file' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Upload File for Hash Verification
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[190px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-6 gap-3 cursor-pointer select-none transition-all ${
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
                    <span className="text-3xl">📁</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-200 font-mono truncate max-w-[280px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {formatBytes(file.size)} • {file.type || 'unknown type'}
                      </span>
                    </div>
                    {file.size > 100 * 1024 * 1024 && (
                      <span className="text-[9px] text-amber-500 font-mono mt-1 max-w-[250px] leading-relaxed">
                        ⚠️ File size exceeds 100MB. Processing takes place entirely in browser memory.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl text-zinc-650">📥</span>
                    <h4 className="text-xs font-semibold text-zinc-300 font-sans">
                      Drag & Drop File Here
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-sans max-w-[240px] leading-relaxed">
                      or click to select. Calculated completely client-side in sandbox.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hashing Settings Panels */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Algorithm Select */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Cryptographic Hashing Algorithm
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map((alg) => (
                  <button
                    key={alg}
                    type="button"
                    onClick={() => handleAlgoChange(alg)}
                    className={`px-3 py-1 rounded text-xs font-mono select-none cursor-pointer border transition-all duration-75 ${
                      algorithm === alg
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {alg}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Enc Envelope */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Output Representation
              </label>
              <div className="flex flex-wrap gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {[
                  { id: 'hex', name: 'Hex (Lower)' },
                  { id: 'hex_upper', name: 'Hex (Upper)' },
                  { id: 'base64', name: 'Base64' },
                  { id: 'base64url', name: 'Base64URL' },
                  { id: 'decimal', name: 'Byte Array' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOutputEncoding(opt.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                      outputEncoding === opt.id
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* HMAC Configuration */}
            <div className="flex flex-col gap-2.5 bg-zinc-900/35 border border-border-hairline/60 p-3.5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hmac_toggle"
                    checked={hmacEnabled}
                    onChange={(e) => setHmacEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-accent-emerald bg-canvas border-zinc-800 text-zinc-900 cursor-pointer"
                  />
                  <label htmlFor="hmac_toggle" className="text-xs font-mono text-zinc-300 cursor-pointer select-none">
                    Enable HMAC Signatures
                  </label>
                </div>
                {hmacEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowHmacKey(!showHmacKey)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 font-sans cursor-pointer"
                  >
                    {showHmacKey ? 'Hide key' : 'Show key'}
                  </button>
                )}
              </div>
              
              {hmacEnabled && (
                <div className="flex flex-col gap-1.5 mt-1 animate-fade-in">
                  <span className="text-[10px] text-zinc-400 font-mono">HMAC Secret Key</span>
                  <input
                    type={showHmacKey ? 'text' : 'password'}
                    value={hmacKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="Enter HMAC passphrase..."
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded px-3 py-1.5 font-mono text-xs text-zinc-200 transition-all focus:ring-1 focus:ring-zinc-750"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Pane: Outputs & Matching */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          {mode !== 'bulk' ? (
            /* Single Result View */
            <div className="flex flex-col gap-4 flex-grow">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                    Cryptographic Signature / Hash
                  </h2>
                  <span className="text-[10px] font-mono mt-0.5 text-zinc-500">
                    Output size: {hashBits} bits ({hashBits / 8} bytes)
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  disabled={mode === 'text' ? !outputHash : (!fileHash || fileProcessing)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
                >
                  {copyFeedback ? 'Copied ✓' : 'Copy Hash'}
                </button>
              </div>

              {/* Hashed display box */}
              <div className="w-full min-h-[120px] max-h-[160px] bg-canvas border border-border-hairline rounded-lg p-3 overflow-y-auto select-all selection:bg-accent-emerald/20 relative">
                {fileProcessing ? (
                  <div className="flex items-center justify-center h-full gap-2 text-zinc-500 font-mono text-xs py-10">
                    <span className="animate-spin text-sm">⏳</span> Hashing file locally...
                  </div>
                ) : errorMsg ? (
                  <div className="text-xs font-mono text-red-400 p-2">
                    ⚠️ {errorMsg}
                  </div>
                ) : (
                  <div className="font-mono text-xs md:text-sm text-zinc-300 break-all leading-relaxed whitespace-pre-wrap select-all">
                    {mode === 'text' ? (
                      outputHash || <span className="text-zinc-650">Waiting for text input...</span>
                    ) : (
                      fileHash || <span className="text-zinc-650">Select or drop a file to compute checksum...</span>
                    )}
                  </div>
                )}
                
                {((mode === 'text' && outputHash) || (mode === 'file' && fileHash)) && !errorMsg && !fileProcessing && (
                  <div className="absolute right-3 bottom-3 pointer-events-none select-none">
                    <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                  </div>
                )}
              </div>

              {/* Checksum Matching / Comparison Widget */}
              <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                    <span>🔍</span> Checksum Validator / Matcher
                  </label>
                  <input
                    type="text"
                    value={checksumInput}
                    onChange={(e) => setChecksumInput(e.target.value)}
                    placeholder="Paste expected hash here (e.g. SHA-256 checksum)..."
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded px-3 py-2 font-mono text-xs text-zinc-200 transition-all focus:ring-1 focus:ring-zinc-750"
                  />
                </div>

                {checksumInput && (
                  <div className="animate-fade-in">
                    {checksumMatch === true ? (
                      <div className="flex items-center gap-2 p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs rounded-lg font-mono">
                        <span className="text-sm">✅</span>
                        <span>
                          <strong>Checksum Matches!</strong> The calculated hash matches your pasted checksum.
                        </span>
                      </div>
                    ) : checksumMatch === false ? (
                      <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs rounded-lg font-mono">
                        <span className="text-sm">❌</span>
                        <span>
                          <strong>Checksum Mismatch.</strong> The hashes do not match. Verify your algorithm choice.
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Bulk Result View */
            <div className="flex flex-col gap-4 flex-grow overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                    Bulk Hashed Outputs
                  </h2>
                  <span className="text-[10px] font-mono mt-0.5 text-zinc-500">
                    Processed {bulkResults.length} strings
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyBulk('raw')}
                    disabled={bulkResults.length === 0}
                    className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 font-mono disabled:opacity-40"
                  >
                    {copyBulkFeedback === 'raw' ? 'Copied ✓' : 'Copy Hashes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyBulk('csv')}
                    disabled={bulkResults.length === 0}
                    className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 font-mono disabled:opacity-40"
                  >
                    {copyBulkFeedback === 'csv' ? 'CSV Copied ✓' : 'Export CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyBulk('json')}
                    disabled={bulkResults.length === 0}
                    className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 font-mono disabled:opacity-40"
                  >
                    {copyBulkFeedback === 'json' ? 'JSON Copied ✓' : 'Export JSON'}
                  </button>
                </div>
              </div>

              {/* Scrollable list of bulk results */}
              <div className="flex-grow bg-canvas border border-border-hairline rounded-lg overflow-y-auto max-h-[350px] p-2 flex flex-col gap-1.5">
                {bulkResults.length === 0 ? (
                  <div className="text-zinc-650 font-mono text-xs p-4 text-center">
                    Enter line-by-line inputs to see batch results...
                  </div>
                ) : (
                  bulkResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 p-2 bg-panel border border-border-hairline/60 rounded font-mono text-xs group hover:border-zinc-800/80 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500 truncate max-w-[70%]" title={item.input}>
                          In: {item.input || '""'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.hash)}
                          disabled={!item.hash}
                          className="text-[9px] text-zinc-600 hover:text-accent-emerald transition-colors font-sans opacity-0 group-hover:opacity-100"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="text-zinc-300 break-all select-all font-semibold">
                        {item.error ? (
                          <span className="text-red-500">⚠️ {item.error}</span>
                        ) : (
                          item.hash || <span className="text-zinc-700">""</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Privacy status badge */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono shrink-0">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

      </div>
    </div>
  );
};
