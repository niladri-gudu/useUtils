import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  uint8ToBinary,
  binaryToUint8,
  uint8ToHex,
  hexToUint8,
  uint8ToDecimal,
  decimalToUint8,
  uint8ToOctal,
  octalToUint8,
  textToUint8,
  uint8ToText,
  uint8ToBase64,
  base64ToUint8,
  generateHexDump
} from '../utils-engine/binary';
import { formatBytes } from '../utils-engine/file';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
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

const SAMPLE_TEXT = "Hello, World! 🚀";

// BigInt Base Conversion helper alphabets
const BASE_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

const parseBigIntInBase = (str: string, base: number): bigint => {
  const clean = str.trim().toLowerCase().replace(/[^0-9a-z]/g, '');
  if (!clean) return 0n;
  let result = 0n;
  const b = BigInt(base);
  for (const char of clean) {
    const val = BASE_ALPHABET.indexOf(char);
    if (val === -1 || val >= base) {
      throw new Error(`Invalid character "${char}" for base ${base}`);
    }
    result = result * b + BigInt(val);
  }
  return result;
};

const formatBigIntInBase = (val: bigint, base: number): string => {
  if (val === 0n) return '0';
  let result = '';
  let temp = val;
  const b = BigInt(base);
  while (temp > 0n) {
    const rem = temp % b;
    result = BASE_ALPHABET[Number(rem)] + result;
    temp = temp / b;
  }
  return result;
};

export const BinaryConverter: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'converter' | 'sandbox' | 'hexdump' | 'basecalc'>('converter');

  // Core configurations
  const [delimiter, setDelimiter] = useState<string>(' '); // ' ', ',', ':', 'none', 'array'
  const [encoding, setEncoding] = useState<'utf-8' | 'ascii'>('utf-8');
  const [hexUppercase, setHexUppercase] = useState<boolean>(false);

  // Raw intermediate bytes representation
  const [bytes, setBytes] = useState<Uint8Array>(new Uint8Array(0));

  // Visual inputs mapping
  const [inputs, setInputs] = useState({
    text: '',
    binary: '',
    hex: '',
    decimal: '',
    octal: '',
    base64: ''
  });

  // Track focused element to prevent updating it while editing
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ field: string; message: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});

  // File Hex Dump states
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [fileHexDump, setFileHexDump] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [fileTruncated, setFileTruncated] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Large Number Base Calculator state
  const [baseCalcInput, setBaseCalcInput] = useState<string>('424242');
  const [baseCalcInBase, setBaseCalcInBase] = useState<number>(10);
  const [baseCalcOutBase, setBaseCalcOutBase] = useState<number>(2);
  const [baseCalcOutput, setBaseCalcOutput] = useState<string>('');
  const [baseCalcError, setBaseCalcError] = useState<string>('');

  // Initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('useutils_binary_converter_text');
    const initialText = stored !== null ? stored : SAMPLE_TEXT;
    
    const initialBytes = textToUint8(initialText, encoding);
    setBytes(initialBytes);
    syncOutputsFromBytes(initialBytes, null, delimiter, encoding, hexUppercase);
  }, []);

  // Sync state back to localstorage when text changes
  const saveTextToStorage = (text: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_binary_converter_text', text);
    }
  };

  // Helper to format bytes to output strings based on delimiter/encoding options
  const formatBytesToType = (
    arr: Uint8Array,
    type: 'binary' | 'hex' | 'decimal' | 'octal' | 'base64' | 'text',
    delim: string,
    enc: 'utf-8' | 'ascii',
    upperHex: boolean
  ): string => {
    if (arr.length === 0) return '';

    // Array formats customization
    if (delim === 'array') {
      switch (type) {
        case 'hex':
          return `[${Array.from(arr).map(b => '0x' + (upperHex ? b.toString(16).toUpperCase() : b.toString(16)).padStart(2, '0')).join(', ')}]`;
        case 'binary':
          return `[${Array.from(arr).map(b => '0b' + b.toString(2).padStart(8, '0')).join(', ')}]`;
        case 'decimal':
          return `[${Array.from(arr).map(b => b.toString(10)).join(', ')}]`;
        case 'octal':
          return `[${Array.from(arr).map(b => '0o' + b.toString(8).padStart(3, '0')).join(', ')}]`;
        case 'base64':
          return uint8ToBase64(arr);
        case 'text':
          return uint8ToText(arr, enc);
      }
    }

    // Standard formats
    switch (type) {
      case 'binary':
        return uint8ToBinary(arr, delim);
      case 'hex':
        return uint8ToHex(arr, delim, upperHex);
      case 'decimal':
        return uint8ToDecimal(arr, delim);
      case 'octal':
        return uint8ToOctal(arr, delim);
      case 'base64':
        return uint8ToBase64(arr);
      case 'text':
        return uint8ToText(arr, enc);
      default:
        return '';
    }
  };

  // Synchronize all input fields except the one that is currently focused/edited
  const syncOutputsFromBytes = (
    newBytes: Uint8Array,
    excludeField: string | null,
    delim: string,
    enc: 'utf-8' | 'ascii',
    upperHex: boolean
  ) => {
    setInputs(prev => {
      const next = { ...prev };
      if (excludeField !== 'text') next.text = formatBytesToType(newBytes, 'text', delim, enc, upperHex);
      if (excludeField !== 'binary') next.binary = formatBytesToType(newBytes, 'binary', delim, enc, upperHex);
      if (excludeField !== 'hex') next.hex = formatBytesToType(newBytes, 'hex', delim, enc, upperHex);
      if (excludeField !== 'decimal') next.decimal = formatBytesToType(newBytes, 'decimal', delim, enc, upperHex);
      if (excludeField !== 'octal') next.octal = formatBytesToType(newBytes, 'octal', delim, enc, upperHex);
      if (excludeField !== 'base64') next.base64 = formatBytesToType(newBytes, 'base64', delim, enc, upperHex);
      return next;
    });
  };

  // Parse arrays or pre-formatted strings before calling converters
  const cleanInputString = (str: string, delim: string): string => {
    let clean = str.trim();
    // If array representation e.g. [0x48, 0x65]
    if (clean.startsWith('[') && clean.endsWith(']')) {
      clean = clean.slice(1, -1);
    }
    // Handle comma or space delimiters in array representation
    if (delim === 'array') {
      return clean;
    }
    return str;
  };

  // Re-sync all fields when config toggles occur
  useEffect(() => {
    syncOutputsFromBytes(bytes, null, delimiter, encoding, hexUppercase);
  }, [delimiter, encoding, hexUppercase]);

  // Handle specific field updates
  const handleFieldChange = (fieldName: string, value: string) => {
    setInputs(prev => ({ ...prev, [fieldName]: value }));
    setErrorMsg(null);

    if (!value.trim()) {
      const emptyBytes = new Uint8Array(0);
      setBytes(emptyBytes);
      syncOutputsFromBytes(emptyBytes, fieldName, delimiter, encoding, hexUppercase);
      if (fieldName === 'text') saveTextToStorage('');
      return;
    }

    try {
      let parsedBytes = new Uint8Array(0);
      const cleaned = cleanInputString(value, delimiter);

      switch (fieldName) {
        case 'text':
          parsedBytes = textToUint8(value, encoding);
          saveTextToStorage(value);
          break;
        case 'binary':
          parsedBytes = binaryToUint8(cleaned, delimiter === 'array' ? ',' : delimiter);
          break;
        case 'hex':
          parsedBytes = hexToUint8(cleaned, delimiter === 'array' ? ',' : delimiter);
          break;
        case 'decimal':
          parsedBytes = decimalToUint8(cleaned, delimiter === 'array' ? ',' : delimiter);
          break;
        case 'octal':
          parsedBytes = octalToUint8(cleaned, delimiter === 'array' ? ',' : delimiter);
          break;
        case 'base64':
          parsedBytes = base64ToUint8(value);
          break;
      }

      setBytes(parsedBytes);
      syncOutputsFromBytes(parsedBytes, fieldName, delimiter, encoding, hexUppercase);
    } catch (err: any) {
      setErrorMsg({ field: fieldName, message: err.message || 'Parsing failed' });
    }
  };

  // Toggle individual bit inside the interactive sandbox
  const handleToggleBit = (byteIndex: number, bitPos: number) => {
    const newBytes = new Uint8Array(bytes);
    newBytes[byteIndex] ^= (1 << bitPos);
    setBytes(newBytes);
    // Sync all text areas
    syncOutputsFromBytes(newBytes, null, delimiter, encoding, hexUppercase);
    // Save state if text representation changes
    try {
      const text = uint8ToText(newBytes, encoding);
      saveTextToStorage(text);
    } catch {
      // Ignore text decoding failure if binary goes outside printable bounds
    }
  };

  // Clipboard copies trigger
  const handleCopy = (field: string, text: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopyFeedback(prev => ({ ...prev, [field]: true }));
      setTimeout(() => {
        setCopyFeedback(prev => ({ ...prev, [field]: false }));
      }, 1500);
    }
  };

  // Clear converter dashboard
  const handleClearAll = () => {
    const emptyBytes = new Uint8Array(0);
    setBytes(emptyBytes);
    setInputs({
      text: '',
      binary: '',
      hex: '',
      decimal: '',
      octal: '',
      base64: ''
    });
    setErrorMsg(null);
    saveTextToStorage('');
  };

  // Load sample json to converter
  const handleLoadSample = () => {
    setErrorMsg(null);
    const sample = SAMPLE_TEXT;
    const sampleBytes = textToUint8(sample, encoding);
    setBytes(sampleBytes);
    syncOutputsFromBytes(sampleBytes, null, delimiter, encoding, hexUppercase);
    saveTextToStorage(sample);
  };

  // File drag & drop processing
  const processHexDumpFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileBytes(null);
    setFileHexDump('');
    setFileTruncated(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const rawBytes = new Uint8Array(e.target.result);
        setFileBytes(rawBytes);

        // Rendering check: Limit output formatting if file > 50KB to maintain smoothness
        const maxBytesToFormat = 50 * 1024; // 50KB
        if (rawBytes.length > maxBytesToFormat) {
          const truncated = rawBytes.subarray(0, maxBytesToFormat);
          setFileHexDump(generateHexDump(truncated));
          setFileTruncated(true);
        } else {
          setFileHexDump(generateHexDump(rawBytes));
          setFileTruncated(false);
        }
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processHexDumpFile(e.target.files[0]);
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
      processHexDumpFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFileBytes(null);
    setFileHexDump('');
    setFileTruncated(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Large Number calculator syncing
  useEffect(() => {
    setBaseCalcError('');
    if (!baseCalcInput.trim()) {
      setBaseCalcOutput('');
      return;
    }

    try {
      const bigintVal = parseBigIntInBase(baseCalcInput, baseCalcInBase);
      const formatted = formatBigIntInBase(bigintVal, baseCalcOutBase);
      setBaseCalcOutput(formatted);
    } catch (err: any) {
      setBaseCalcError(err.message || 'Conversion failed');
      setBaseCalcOutput('');
    }
  }, [baseCalcInput, baseCalcInBase, baseCalcOutBase]);

  // Convert Sandbox character display to standard text labels or escape sequences
  const getByteCharacterLabel = (byte: number): string => {
    if (byte === 32) return 'Space';
    if (byte === 10) return '\\n (LF)';
    if (byte === 13) return '\\r (CR)';
    if (byte === 9) return '\\t (Tab)';
    if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
    return `\\x${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Top Controls Grid */}
      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-wrap gap-6 items-center justify-between">
        
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-border-hairline/60">
          {[
            { id: 'converter', label: 'Dashboard', icon: '🎛️' },
            { id: 'sandbox', label: 'Bit Sandbox', icon: '👾' },
            { id: 'hexdump', label: 'Hex Dump Explorer', icon: '🔍' },
            { id: 'basecalc', label: 'Base Calculator', icon: '🧮' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-100 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Global Settings Panel (Hide/disable in inappropriate tabs) */}
        {activeTab !== 'hexdump' && activeTab !== 'basecalc' && (
          <div className="flex flex-wrap gap-5 items-center">
            {/* Delimiters Selection */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Delimiter Separator
              </span>
              <div className="flex bg-zinc-900/40 border border-border-hairline/60 p-0.5 rounded-md">
                {[
                  { id: ' ', name: 'Space' },
                  { id: ',', name: 'Comma' },
                  { id: ':', name: 'Colon' },
                  { id: 'none', name: 'None' },
                  { id: 'array', name: 'Array' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDelimiter(opt.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                      delimiter === opt.id
                        ? 'bg-zinc-800 text-accent-emerald font-semibold'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Encoding Selection */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Char Encoding
              </span>
              <div className="flex bg-zinc-900/40 border border-border-hairline/60 p-0.5 rounded-md w-max">
                <button
                  onClick={() => setEncoding('utf-8')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    encoding === 'utf-8'
                      ? 'bg-zinc-800 text-accent-emerald font-semibold'
                      : 'text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  UTF-8
                </button>
                <button
                  onClick={() => setEncoding('ascii')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    encoding === 'ascii'
                      ? 'bg-zinc-800 text-accent-emerald font-semibold'
                      : 'text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  ASCII
                </button>
              </div>
            </div>

            {/* Hex Casing */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Hex Casing
              </span>
              <button
                onClick={() => setHexUppercase(!hexUppercase)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono border border-border-hairline/60 transition-all ${
                  hexUppercase
                    ? 'bg-zinc-800 text-accent-emerald font-semibold border-zinc-700'
                    : 'bg-zinc-900/40 text-zinc-500 border-transparent hover:text-zinc-350'
                }`}
              >
                {hexUppercase ? 'UPPER' : 'lower'}
              </button>
            </div>
          </div>
        )}

        {/* Global Action items */}
        <div className="flex gap-2">
          {activeTab === 'converter' && (
            <>
              <button
                onClick={handleLoadSample}
                className="px-2.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded text-zinc-300 font-mono cursor-pointer transition-colors"
              >
                Load Sample
              </button>
              {bytes.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 text-xs bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 rounded text-red-400 font-mono cursor-pointer transition-colors"
                >
                  Clear Dashboard
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {/* Main Switchboard Canvas Layouts */}
      <div className="w-full">

        {/* 1. Multi-Base Dashboard Tab */}
        {activeTab === 'converter' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { id: 'text', label: 'Plain Text (ASCII/UTF-8)', placeholder: 'Type or paste plain text characters here...', rows: 5, uppercase: false },
              { id: 'binary', label: 'Binary (Base 2)', placeholder: 'Binary byte strings will appear here (e.g. 01001000)...', rows: 5, uppercase: false },
              { id: 'hex', label: 'Hexadecimal (Base 16)', placeholder: 'Hex values will appear here (e.g. 48 65)...', rows: 5, uppercase: true },
              { id: 'decimal', label: 'Decimal / ASCII values (Base 10)', placeholder: 'Decimal representations will appear here (e.g. 72 101)...', rows: 5, uppercase: false },
              { id: 'octal', label: 'Octal (Base 8)', placeholder: 'Octal representations will appear here (e.g. 110 145)...', rows: 5, uppercase: false },
              { id: 'base64', label: 'Base64 Encoding', placeholder: 'Base64 representations will appear here (e.g. SGVsbG8=)...', rows: 5, uppercase: false }
            ].map(field => {
              const isFieldErr = errorMsg?.field === field.id;
              const hasVal = !!inputs[field.id as keyof typeof inputs];
              
              return (
                <div key={field.id} className="flex flex-col bg-panel border border-border-hairline rounded-lg p-4 gap-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-xs font-semibold text-zinc-300 font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-zinc-700 rounded-xs"></span>
                      {field.label}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(field.id, inputs[field.id as keyof typeof inputs])}
                        disabled={!hasVal || isFieldErr}
                        className="px-2 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded font-mono font-semibold transition-all disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                      >
                        {copyFeedback[field.id] ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={inputs[field.id as keyof typeof inputs]}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      onFocus={() => setFocusedField(field.id)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={field.placeholder}
                      rows={field.rows}
                      className={`w-full bg-canvas border outline-none rounded-md p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 ${
                        isFieldErr 
                          ? 'border-red-900/60 focus:border-red-800/80 bg-red-950/5' 
                          : 'border-border-hairline focus:border-zinc-700'
                      }`}
                    />
                    
                    {/* Paste Badge placeholder on blank text */}
                    {!hasVal && field.id === 'text' && (
                      <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                        <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ V</kbd>
                      </div>
                    )}
                  </div>

                  {/* Parse Errors block */}
                  {isFieldErr && errorMsg && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2.5 mt-0.5">
                      ⚠️ {errorMsg.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Interactive Bit Sandbox Tab */}
        {activeTab === 'sandbox' && (
          <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-hairline/60 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 font-mono">
                  Interactive Bitwise Sandbox & Bit Flipper
                </h3>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  Hover or click bit nodes to toggle binary values (0 & 1). Instantly witness the parsed results dynamically synchronize with characters, decimals, and hex addresses.
                </p>
              </div>

              {/* Status pill showing total bytes */}
              <div className="text-xs font-mono text-zinc-400 bg-zinc-900/80 border border-border-hairline rounded px-3 py-1.5 w-max">
                Total Payload Size: <strong className="text-zinc-200">{bytes.length} bytes</strong>
              </div>
            </div>

            {bytes.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center gap-3 border border-dashed border-border-hairline rounded-lg text-center">
                <span className="text-3xl text-zinc-650">👾</span>
                <h4 className="text-xs font-semibold text-zinc-300 font-sans">
                  No Bytes Loaded in Memory Sandbox
                </h4>
                <p className="text-[10px] text-zinc-500 max-w-sm leading-relaxed">
                  Go back to the converter dashboard and type some characters, or click the button below to load a preset character sequence in local memory.
                </p>
                <button
                  onClick={handleLoadSample}
                  className="px-3 py-1.5 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-semibold rounded transition-all shadow cursor-pointer"
                >
                  Load Sample Presets
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                
                {/* Visual Character Bytes Stack */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[550px] overflow-y-auto pr-1">
                  {Array.from(bytes).slice(0, 128).map((byteVal, byteIdx) => (
                    <div 
                      key={byteIdx}
                      className="bg-zinc-900/40 border border-border-hairline hover:border-zinc-700/80 rounded-lg p-3.5 flex flex-col gap-3 transition-colors"
                    >
                      {/* Character Card header */}
                      <div className="flex justify-between items-center border-b border-border-hairline/40 pb-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">
                            Byte Offset {byteIdx}
                          </span>
                          <span className="text-xs font-bold font-mono text-accent-emerald mt-0.5">
                            Dec: {byteVal} • Hex: 0x{byteVal.toString(16).toUpperCase().padStart(2, '0')}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded bg-zinc-950 border border-border-hairline flex items-center justify-center text-xs font-mono text-zinc-200" title={getByteCharacterLabel(byteVal)}>
                          {byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '•'}
                        </div>
                      </div>

                      {/* Interactive bits selector box */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
                          Bit Array (MSB → LSB)
                        </span>
                        
                        <div className="grid grid-cols-8 gap-1">
                          {[7, 6, 5, 4, 3, 2, 1, 0].map(bitPos => {
                            const isSet = ((byteVal >> bitPos) & 1) === 1;
                            const decimalValue = 1 << bitPos;
                            return (
                              <button
                                key={bitPos}
                                title={`Bit ${bitPos} (Decimal: ${decimalValue})`}
                                onClick={() => handleToggleBit(byteIdx, bitPos)}
                                className={`h-8 rounded flex flex-col items-center justify-center font-mono text-xs cursor-pointer select-none transition-all ${
                                  isSet 
                                    ? 'bg-accent-emerald text-zinc-950 font-bold border border-accent-emerald hover:bg-emerald-400' 
                                    : 'bg-canvas text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                              >
                                <span>{isSet ? '1' : '0'}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-zinc-600 px-0.5">
                          <span>128</span>
                          <span>64</span>
                          <span>32</span>
                          <span>16</span>
                          <span>8</span>
                          <span>4</span>
                          <span>2</span>
                          <span>1</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Byte Count Truncation disclaimer */}
                {bytes.length > 128 && (
                  <div className="text-[10px] font-mono text-zinc-500 pl-1">
                    ℹ️ For memory and canvas performance, only the first 128 characters are displayed in the bit flitter playground.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Hex Dump Explorer Tab */}
        {activeTab === 'hexdump' && (
          <div className="flex flex-col lg:flex-row gap-5">
            
            {/* File drop panel */}
            <div className="w-full lg:w-80 shrink-0 bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
              <div className="flex flex-col">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  File Source Ingest
                </h3>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                  Select any binary, log, or executable file to generate a classic memory hex dump.
                </p>
              </div>

              {/* Input drop wrapper */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[160px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 gap-2.5 cursor-pointer select-none transition-all ${
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
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-2xl">📄</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-200 font-mono truncate max-w-[200px]" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <span className="text-[9px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 px-2 py-0.5 rounded font-mono font-semibold uppercase mt-1">
                      Loaded
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-2xl text-zinc-650">📥</span>
                    <h4 className="text-xs font-semibold text-zinc-300 font-sans">
                      Drag & Drop File
                    </h4>
                    <p className="text-[9px] text-zinc-500 font-sans leading-relaxed max-w-[180px]">
                      or browse file folders. Processed offline. Max 50KB for full dump display.
                    </p>
                  </div>
                )}
              </div>

              {/* Stats & Actions */}
              {file && (
                <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                      File Profile Info
                    </span>
                    <div className="bg-zinc-900/40 border border-border-hairline rounded p-2.5 flex flex-col gap-1 font-mono text-[10px] text-zinc-400">
                      <div>Name: <span className="text-zinc-200 truncate inline-block max-w-[150px] align-bottom" title={file.name}>{file.name}</span></div>
                      <div>Size: <span className="text-zinc-200">{formatBytes(file.size)} ({file.size} bytes)</span></div>
                      <div>Type: <span className="text-zinc-200">{file.type || 'unknown/binary'}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={handleClearFile}
                    className="w-full py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 rounded text-red-400 font-mono text-xs cursor-pointer transition-colors"
                  >
                    Clear File
                  </button>
                </div>
              )}
            </div>

            {/* Display panel */}
            <div className="flex-grow bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center select-none border-b border-border-hairline/60 pb-3">
                <div className="flex flex-col">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                    Structured Hex Dump View
                  </h3>
                  {fileTruncated && (
                    <span className="text-[10px] font-mono mt-0.5 text-amber-500">
                      ⚠️ Large file truncated: displaying first 50KB only.
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy('hexdump', fileHexDump)}
                    disabled={!fileHexDump}
                    className="px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded font-mono font-semibold transition-all disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                  >
                    {copyFeedback['hexdump'] ? 'Copied ✓' : 'Copy Hex Dump'}
                  </button>
                </div>
              </div>

              {/* Plain Dump text zone */}
              <div className="bg-canvas border border-border-hairline rounded-md p-3 relative h-[380px] overflow-auto flex flex-col">
                {fileHexDump ? (
                  <pre className="font-mono text-xs text-zinc-300 whitespace-pre overflow-x-auto select-all leading-relaxed">
                    {fileHexDump}
                  </pre>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-center text-zinc-500 font-mono text-xs">
                    Drop a file on the left side to preview its hex address dump.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 4. Large Number Base Converter Tab */}
        {activeTab === 'basecalc' && (
          <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-5 max-w-3xl mx-auto">
            
            <div className="border-b border-border-hairline/60 pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 font-mono">
                BigInt Large Number Base Converter
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-1">
                Convert arbitrary-precision integers between bases from 2 (Binary) up to 36. Built on BigInt to secure exact precision without floating rounding compromises.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              
              {/* Left configurations */}
              <div className="flex flex-col gap-4">
                
                {/* Input Base Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    Source Input Base
                  </label>
                  <select
                    value={baseCalcInBase}
                    onChange={(e) => setBaseCalcInBase(parseInt(e.target.value))}
                    className="bg-canvas border border-border-hairline rounded px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    {[2, 8, 10, 12, 16, 20, 24, 32, 36].map(base => (
                      <option key={base} value={base} className="bg-zinc-900">
                        Base {base} {base === 2 ? '(Binary)' : base === 8 ? '(Octal)' : base === 10 ? '(Decimal)' : base === 16 ? '(Hexadecimal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input text */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    Source Value
                  </label>
                  <input
                    type="text"
                    value={baseCalcInput}
                    onChange={(e) => setBaseCalcInput(e.target.value)}
                    placeholder="Enter integer..."
                    className="bg-canvas border border-border-hairline rounded px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
                  />
                  {baseCalcError && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 rounded px-2.5 py-1.5">
                      ⚠️ {baseCalcError}
                    </div>
                  )}
                </div>

              </div>

              {/* Right configurations */}
              <div className="flex flex-col gap-4">
                
                {/* Output Base Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                    Target Output Base
                  </label>
                  <select
                    value={baseCalcOutBase}
                    onChange={(e) => setBaseCalcOutBase(parseInt(e.target.value))}
                    className="bg-canvas border border-border-hairline rounded px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    {[2, 8, 10, 12, 16, 20, 24, 32, 36].map(base => (
                      <option key={base} value={base} className="bg-zinc-900">
                        Base {base} {base === 2 ? '(Binary)' : base === 8 ? '(Octal)' : base === 10 ? '(Decimal)' : base === 16 ? '(Hexadecimal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Output text */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center select-none">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                      Converted Result
                    </label>
                    <button
                      onClick={() => handleCopy('basecalc', baseCalcOutput)}
                      disabled={!baseCalcOutput}
                      className="px-2 py-0.5 text-[9px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded font-mono font-semibold transition-all disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                    >
                      {copyFeedback['basecalc'] ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={baseCalcOutput}
                    readOnly
                    rows={3}
                    placeholder="Result will appear here..."
                    className="bg-canvas border border-border-hairline rounded px-3 py-2 text-xs font-mono text-zinc-300 outline-none resize-none select-all"
                  />
                </div>

              </div>

            </div>

            {/* Info notes */}
            <div className="bg-zinc-900/60 border border-border-hairline rounded p-3 flex flex-col gap-1 mt-2">
              <span className="text-[10px] font-mono font-bold text-zinc-400">⚡ Core Details:</span>
              <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                Standard JavaScript floating numbers lose precision at 9,007,199,254,740,991 (Number.MAX_SAFE_INTEGER). Our converter bypasses this by utilizing native BigInt integers, allowing you to convert numbers of arbitrary length securely.
              </p>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
