import React, { useState, useEffect, useMemo } from 'react';
import {
  generateUuidV4,
  generateUuidV7,
  parseUuidV7,
  generateNanoId,
  generateSecurePassword,
  generateRandomBytes,
  calculateShannonEntropy
} from '../utils-engine/uuid';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
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

// NanoID Alphabets Presets
const ALPHABET_PRESETS = [
  { id: 'url-safe', name: 'URL Safe (Standard)', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-' },
  { id: 'alphanumeric', name: 'Alphanumeric', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
  { id: 'lowercase-num', name: 'Lowercase & Numbers', value: 'abcdefghijklmnopqrstuvwxyz0123456789' },
  { id: 'uppercase-num', name: 'Uppercase & Numbers', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
  { id: 'hex', name: 'Hexadecimal (Lower)', value: '0123456789abcdef' },
  { id: 'binary', name: 'Binary (Bits)', value: '01' }
];

export const UuidGenerator: React.FC = () => {
  // Navigation: Generate vs Parse
  const [activeTab, setActiveTab] = useState<'generate' | 'parse'>('generate');

  // Generator Config States
  const [genType, setGenType] = useState<'uuid4' | 'uuid7' | 'nanoid' | 'password' | 'bytes'>('uuid4');
  const [quantity, setQuantity] = useState<number>(10);
  
  // Delimiter Separator ('newline' | 'comma' | 'semicolon' | 'space' | 'custom')
  const [delimiter, setDelimiter] = useState<string>('newline');
  const [customDelimiter, setCustomDelimiter] = useState<string>('|');
  const [casing, setCasing] = useState<'default' | 'upper' | 'lower'>('default');
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');

  // UUID v7 specific options
  const [useCustomTimestamp, setUseCustomTimestamp] = useState<boolean>(false);
  const [customTimestampDate, setCustomTimestampDate] = useState<string>('');
  const [customTimestampTime, setCustomTimestampTime] = useState<string>('');

  // NanoID specific options
  const [nanoIdLength, setNanoIdLength] = useState<number>(21);
  const [nanoIdAlphabetType, setNanoIdAlphabetType] = useState<string>('url-safe');
  const [customNanoIdAlphabet, setCustomNanoIdAlphabet] = useState<string>('');

  // Secure Password specific options
  const [passwordLength, setPasswordLength] = useState<number>(16);
  const [passUpper, setPassUpper] = useState<boolean>(true);
  const [passLower, setPassLower] = useState<boolean>(true);
  const [passDigits, setPassDigits] = useState<boolean>(true);
  const [passSymbols, setPassSymbols] = useState<boolean>(true);
  const [passExcludeAmbiguous, setPassExcludeAmbiguous] = useState<boolean>(false);

  // Bytes specific options
  const [byteCount, setByteCount] = useState<number>(32);
  const [byteFormat, setByteFormat] = useState<'hex' | 'base64' | 'base64url' | 'base58'>('hex');

  // Generated results
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [copyFeedbackAll, setCopyFeedbackAll] = useState<boolean>(false);
  const [copyFeedbackRow, setCopyFeedbackRow] = useState<number | null>(null);

  // Parser States
  const [parserInput, setParserInput] = useState<string>('');

  // Get active NanoID Alphabet
  const currentNanoIdAlphabet = useMemo(() => {
    if (nanoIdAlphabetType === 'custom') {
      return customNanoIdAlphabet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    }
    return ALPHABET_PRESETS.find(p => p.id === nanoIdAlphabetType)?.value || ALPHABET_PRESETS[0].value;
  }, [nanoIdAlphabetType, customNanoIdAlphabet]);

  // Parse custom timestamp fields to milliseconds
  const parsedCustomMs = useMemo(() => {
    if (!useCustomTimestamp || !customTimestampDate) return undefined;
    const datetimeStr = `${customTimestampDate}T${customTimestampTime || '00:00'}`;
    const parsed = Date.parse(datetimeStr);
    return isNaN(parsed) ? undefined : parsed;
  }, [useCustomTimestamp, customTimestampDate, customTimestampTime]);

  // Main Generator runner
  const handleGenerate = () => {
    const list: string[] = [];
    const count = Math.min(Math.max(quantity, 1), 500);

    for (let i = 0; i < count; i++) {
      let rawToken = '';

      switch (genType) {
        case 'uuid4':
          rawToken = generateUuidV4();
          break;
        case 'uuid7':
          rawToken = generateUuidV7(parsedCustomMs);
          break;
        case 'nanoid':
          rawToken = generateNanoId(nanoIdLength, currentNanoIdAlphabet);
          break;
        case 'password':
          rawToken = generateSecurePassword(passwordLength, {
            uppercase: passUpper,
            lowercase: passLower,
            digits: passDigits,
            symbols: passSymbols,
            excludeAmbiguous: passExcludeAmbiguous
          });
          break;
        case 'bytes':
          rawToken = generateRandomBytes(byteCount, byteFormat);
          break;
      }

      // Casing transformations
      if (casing === 'upper') {
        rawToken = rawToken.toUpperCase();
      } else if (casing === 'lower') {
        rawToken = rawToken.toLowerCase();
      }

      // Add prefix/suffix
      list.push(`${prefix}${rawToken}${suffix}`);
    }

    setGeneratedTokens(list);
  };

  // Run initial generation on load
  useEffect(() => {
    // Set custom date picker presets to today's date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    setCustomTimestampDate(dateStr);
    setCustomTimestampTime(timeStr);
    
    // Generate some default tokens
    const initialList: string[] = [];
    for (let i = 0; i < 10; i++) {
      initialList.push(generateUuidV4());
    }
    setGeneratedTokens(initialList);
  }, []);

  // Recalculate if generator configurations change
  // We trigger manually or automatically. In Raycast systems, auto-updating is amazing for options changes,
  // but if we have a regenerate button it is also useful. Let's auto-update whenever options change!
  useEffect(() => {
    handleGenerate();
  }, [
    genType, quantity, delimiter, customDelimiter, casing, prefix, suffix,
    useCustomTimestamp, parsedCustomMs, nanoIdLength, currentNanoIdAlphabet,
    passwordLength, passUpper, passLower, passDigits, passSymbols, passExcludeAmbiguous,
    byteCount, byteFormat
  ]);

  // Joined string representation for outputs
  const joinedOutputString = useMemo(() => {
    if (generatedTokens.length === 0) return '';
    let sep = '\n';
    if (delimiter === 'comma') sep = ',';
    if (delimiter === 'semicolon') sep = ';';
    if (delimiter === 'space') sep = ' ';
    if (delimiter === 'custom') sep = customDelimiter;

    return generatedTokens.join(sep);
  }, [generatedTokens, delimiter, customDelimiter]);

  // Copy and download actions
  const handleCopyAll = () => {
    if (!joinedOutputString) return;
    const success = copyToClipboard(joinedOutputString);
    if (success) {
      setCopyFeedbackAll(true);
      setTimeout(() => setCopyFeedbackAll(false), 1500);
    }
  };

  const handleCopySingle = (text: string, index: number) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopyFeedbackRow(index);
      setTimeout(() => setCopyFeedbackRow(null), 1000);
    }
  };

  const handleDownload = () => {
    if (!joinedOutputString) return;
    const blob = new Blob([joinedOutputString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils-${genType}-tokens.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Entropy Analysis for first token generated
  const tokenStats = useMemo(() => {
    if (generatedTokens.length === 0) return { entropy: 0, strength: 'N/A' };
    const firstToken = generatedTokens[0];
    const entropy = calculateShannonEntropy(firstToken);
    
    // Evaluate strength
    let strength = 'Weak';
    if (genType === 'password') {
      const entropyTotal = entropy * firstToken.length;
      if (entropyTotal > 100) strength = 'Cryptographic Grade';
      else if (entropyTotal > 75) strength = 'Very Strong';
      else if (entropyTotal > 50) strength = 'Strong';
      else if (entropyTotal > 35) strength = 'Moderate';
      else strength = 'Weak';
    } else {
      const entropyTotal = entropy * firstToken.length;
      if (entropyTotal > 120) strength = 'Cryptographic Grade';
      else if (entropyTotal > 90) strength = 'Strong';
      else strength = 'Standard High-Entropy';
    }

    return { entropy, strength };
  }, [generatedTokens, genType]);

  // ==========================================
  // Parser Logics
  // ==========================================
  const parsedResults = useMemo(() => {
    if (!parserInput.trim()) return [];
    
    // Split by comma, newline, spaces, etc.
    const tokens = parserInput.split(/[\n,; ]+/).map(t => t.trim()).filter(Boolean);
    
    return tokens.map(token => {
      const info = parseUuidV7(token);
      if (info) {
        return {
          uuid: token,
          valid: true,
          type: 'UUID v7 (Timestamp-ordered)',
          timestamp: info.timestamp,
          date: info.date,
          relative: getRelativeTimeString(info.timestamp)
        };
      }
      
      // Check if it's a valid UUID v4
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isV4 = uuidV4Regex.test(token);
      
      return {
        uuid: token,
        valid: isV4,
        type: isV4 ? 'UUID v4 (Random)' : 'Invalid UUID Pattern',
        timestamp: null,
        date: null,
        relative: null
      };
    });
  }, [parserInput]);

  function getRelativeTimeString(timeMs: number): string {
    const elapsed = Date.now() - timeMs;
    const isFuture = elapsed < 0;
    const absElapsed = Math.abs(elapsed);
    
    if (absElapsed < 1000) return 'Just now';
    const seconds = Math.floor(absElapsed / 1000);
    if (seconds < 60) return isFuture ? `in ${seconds}s` : `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return isFuture ? `in ${days} days` : `${days} days ago`;
    return new Date(timeMs).toLocaleDateString();
  }

  // Preset loaders for parser
  const handleLoadParserSamples = () => {
    const list = [
      generateUuidV7(),
      generateUuidV7(Date.now() - 3600000), // 1hr ago
      generateUuidV7(Date.now() - 86400000), // 1day ago
      generateUuidV4(),
      'not-a-valid-uuid-string-data'
    ];
    setParserInput(list.join('\n'));
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Subnavigation Bar */}
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
            activeTab === 'generate'
              ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          🎲 Generate Identifiers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parse')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
            activeTab === 'parse'
              ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          🔍 UUID v7 Parser & Analyzer
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Pane (Controls) - 5 Cols */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
            
            {/* Primary ID Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Generator Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 bg-zinc-900/40 p-1.5 border border-border-hairline/80 rounded-lg">
                {[
                  { id: 'uuid4', name: 'UUID v4', title: 'Cryptographically random 128-bit identifier' },
                  { id: 'uuid7', name: 'UUID v7', title: 'Timestamp-sorted ordered 128-bit identifier' },
                  { id: 'nanoid', name: 'NanoID', title: 'Compact, secure, customizable URL-safe string' },
                  { id: 'password', name: 'Password', title: 'Secure random password strings' },
                  { id: 'bytes', name: 'Raw Bytes', title: 'Cryptographically secure random binary bytes' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.title}
                    onClick={() => setGenType(item.id as any)}
                    className={`px-2 py-1.5 rounded text-[11px] font-mono select-none cursor-pointer border text-center transition-all ${
                      genType === item.id
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/35'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Type-Specific Panels */}
            <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
              
              {/* UUID v7 options */}
              {genType === 'uuid7' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                      Timestamp Customization
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomTimestamp}
                        onChange={(e) => setUseCustomTimestamp(e.target.checked)}
                        className="rounded border-zinc-750 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer accent-accent-emerald"
                      />
                      Custom Time
                    </label>
                  </div>

                  {useCustomTimestamp && (
                    <div className="grid grid-cols-2 gap-2 bg-zinc-900/30 border border-border-hairline/50 p-2.5 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono text-zinc-500">Date</span>
                        <input
                          type="date"
                          value={customTimestampDate}
                          onChange={(e) => setCustomTimestampDate(e.target.value)}
                          className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-[11px] rounded px-2 py-1 outline-none focus:border-zinc-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono text-zinc-500">Time (Local)</span>
                        <input
                          type="time"
                          value={customTimestampTime}
                          step="1"
                          onChange={(e) => setCustomTimestampTime(e.target.value)}
                          className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-[11px] rounded px-2 py-1 outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}
                  <span className="text-[9px] text-zinc-500 font-mono leading-relaxed">
                    UUID v7 embeds a 48-bit millisecond UNIX timestamp at the beginning, making it index-friendly in databases.
                  </span>
                </div>
              )}

              {/* NanoID options */}
              {genType === 'nanoid' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="uppercase tracking-wider text-zinc-500 font-semibold">Length</span>
                      <span className="text-accent-emerald font-bold">{nanoIdLength} chars</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={64}
                      value={nanoIdLength}
                      onChange={(e) => setNanoIdLength(parseInt(e.target.value))}
                      className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                      Alphabet Preset
                    </label>
                    <select
                      value={nanoIdAlphabetType}
                      onChange={(e) => setNanoIdAlphabetType(e.target.value)}
                      className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg p-2 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      {ALPHABET_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="custom">Custom Character Set...</option>
                    </select>
                  </div>

                  {nanoIdAlphabetType === 'custom' && (
                    <div className="flex flex-col gap-1 bg-zinc-900/20 p-2 rounded-lg border border-border-hairline/40">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Custom Alphabet Characters</span>
                      <input
                        type="text"
                        placeholder="Paste unique custom characters..."
                        value={customNanoIdAlphabet}
                        onChange={(e) => setCustomNanoIdAlphabet(e.target.value)}
                        className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-md px-2 py-1.5 outline-none focus:border-zinc-700"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Password options */}
              {genType === 'password' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="uppercase tracking-wider text-zinc-500 font-semibold">Password Length</span>
                      <span className="text-accent-emerald font-bold">{passwordLength} chars</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={128}
                      value={passwordLength}
                      onChange={(e) => setPasswordLength(parseInt(e.target.value))}
                      className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Character Inclusions</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passUpper}
                          onChange={(e) => setPassUpper(e.target.checked)}
                          className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                        />
                        Uppercase (A-Z)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passLower}
                          onChange={(e) => setPassLower(e.target.checked)}
                          className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                        />
                        Lowercase (a-z)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passDigits}
                          onChange={(e) => setPassDigits(e.target.checked)}
                          className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                        />
                        Digits (0-9)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passSymbols}
                          onChange={(e) => setPassSymbols(e.target.checked)}
                          className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                        />
                        Symbols (!@#$...)
                      </label>
                    </div>
                  </div>

                  <div className="pt-1.5">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passExcludeAmbiguous}
                        onChange={(e) => setPassExcludeAmbiguous(e.target.checked)}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                      />
                      Exclude ambiguous (e.g. 1, l, O, 0)
                    </label>
                  </div>
                </div>
              )}

              {/* Bytes options */}
              {genType === 'bytes' && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="uppercase tracking-wider text-zinc-500 font-semibold">Byte Quantity (Size)</span>
                    <span className="text-accent-emerald font-bold">{byteCount} bytes</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={256}
                    value={byteCount}
                    onChange={(e) => setByteCount(parseInt(e.target.value))}
                    className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                  />

                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Output Encoding</label>
                    <div className="flex flex-wrap gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                      {[
                        { id: 'hex', name: 'Hex' },
                        { id: 'base64', name: 'Base64' },
                        { id: 'base64url', name: 'Base64URL' },
                        { id: 'base58', name: 'Base58' }
                      ].map(enc => (
                        <button
                          key={enc.id}
                          type="button"
                          onClick={() => setByteFormat(enc.id as any)}
                          className={`px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                            byteFormat === enc.id
                              ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                              : 'border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {enc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* General Formatting & Configuration Controls */}
            <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
              
              {/* Quantity Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="uppercase tracking-wider text-zinc-400 font-semibold">Bulk Quantity</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 500))}
                      className="w-12 bg-canvas border border-border-hairline text-accent-emerald font-bold font-mono text-[11px] rounded text-center py-0.5 outline-none focus:border-zinc-700"
                    />
                    <span className="text-zinc-500">items</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                />
              </div>

              {/* Layout Config Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Delimiter */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Delimiter</span>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg p-2 outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="newline">New Line (\n)</option>
                    <option value="comma">Comma (,)</option>
                    <option value="semicolon">Semicolon (;)</option>
                    <option value="space">Space ( )</option>
                    <option value="custom">Custom...</option>
                  </select>
                </div>

                {/* Case Transform */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Letter Case</span>
                  <select
                    value={casing}
                    onChange={(e) => setCasing(e.target.value as any)}
                    className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg p-2 outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="upper">UPPERCASE</option>
                    <option value="lower">lowercase</option>
                  </select>
                </div>
              </div>

              {/* Custom delimiter string input */}
              {delimiter === 'custom' && (
                <div className="flex flex-col gap-1 bg-zinc-900/30 p-2.5 rounded-lg border border-border-hairline/60">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Custom Delimiter</span>
                  <input
                    type="text"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded px-2 py-1 outline-none focus:border-zinc-700"
                  />
                </div>
              )}

              {/* Affixes (Prefix / Suffix) */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Prefix</span>
                  <input
                    type="text"
                    placeholder="e.g. id_"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Suffix</span>
                  <input
                    type="text"
                    placeholder="e.g. _v1"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Force Regenerate button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer mt-1"
              >
                <span>🎲 Regenerate Batch</span>
              </button>

            </div>

          </div>

          {/* Right Pane (Output & Click lists) - 7 Cols */}
          <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
            
            {/* Header info & controls */}
            <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
              <div className="flex flex-col">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Generated Tokens Batch
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {generatedTokens.length} tokens • {joinedOutputString.length} chars
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={generatedTokens.length === 0}
                  className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
                  title="Download as TXT file"
                >
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  disabled={generatedTokens.length === 0}
                  className="flex items-center gap-1 px-3 py-1 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
                >
                  {copyFeedbackAll ? 'Copied ✓' : 'Copy All'}
                </button>
              </div>
            </div>

            {/* Code Output Area */}
            <div className="relative bg-canvas border border-border-hairline rounded-lg p-3 overflow-hidden flex flex-col">
              <textarea
                value={joinedOutputString}
                readOnly
                rows={9}
                placeholder="Identifiers will appear here..."
                className="w-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
              />
              
              {joinedOutputString && (
                <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                </div>
              )}
            </div>

            {/* Click to Copy Rows List */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Click Individual Rows to Copy
              </span>
              
              <div className="max-h-[220px] overflow-y-auto border border-border-hairline/60 rounded-lg bg-zinc-900/10 p-1 flex flex-col gap-1 pr-1.5 custom-scrollbar">
                {generatedTokens.map((token, index) => (
                  <div
                    key={index}
                    onClick={() => handleCopySingle(token, index)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded font-mono text-xs border cursor-pointer select-all group/item transition-all ${
                      copyFeedbackRow === index
                        ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-semibold shadow-inner'
                        : 'bg-canvas border-border-hairline/40 hover:bg-zinc-800/30 hover:border-zinc-750 text-zinc-300'
                    }`}
                  >
                    <span className="truncate pr-4">{token}</span>
                    <span className={`text-[10px] shrink-0 font-semibold transition-all ${
                      copyFeedbackRow === index
                        ? 'text-accent-emerald'
                        : 'text-zinc-500 opacity-0 group-hover/item:opacity-100'
                    }`}>
                      {copyFeedbackRow === index ? 'Copied ✓' : 'Click to Copy'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Entropy Analyzer Widget */}
            {generatedTokens.length > 0 && (
              <div className="bg-zinc-900/35 border border-border-hairline/80 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between gap-3 text-xs font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Shannon Entropy (First Token)</span>
                  <span className="text-zinc-200 font-semibold">{tokenStats.entropy.toFixed(3)} bits/char</span>
                </div>
                <div className="flex flex-col gap-1 sm:text-right">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Batch Security Level</span>
                  <span className={`font-bold uppercase ${
                    tokenStats.strength.includes('Cryptographic') || tokenStats.strength.includes('Very Strong')
                      ? 'text-accent-emerald'
                      : tokenStats.strength.includes('Strong')
                      ? 'text-emerald-400'
                      : tokenStats.strength.includes('Moderate')
                      ? 'text-amber-500'
                      : 'text-red-400'
                  }`}>
                    {tokenStats.strength}
                  </span>
                </div>
              </div>
            )}

            {/* Privacy Guarantee Banner */}
            <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono mt-1">
              <span className="text-accent-emerald">✓</span>
              Processed locally in browser. Zero server transmission.
            </div>

          </div>

        </div>
      ) : (
        /* V7 Parser Tab - Split-Pane */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Parser Left: Input area - 5 Cols */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-panel border border-border-hairline rounded-lg p-5">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  UUIDs Input List
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Paste UUIDs (v7 or v4) separated by spaces, commas, or newlines.
                </span>
              </div>
              <button
                type="button"
                onClick={handleLoadParserSamples}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
              >
                Load Samples
              </button>
            </div>

            <div className="relative flex-grow">
              <textarea
                value={parserInput}
                onChange={(e) => setParserInput(e.target.value)}
                placeholder="Paste UUIDs here... e.g.&#10;018fb1ea-d2f6-7b18-80f2-77732a39281a"
                rows={12}
                className="w-full h-full min-h-[220px] bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              {!parserInput && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
            
            <div className="text-[9px] text-zinc-500 font-mono leading-relaxed bg-zinc-900/30 border border-border-hairline/60 p-2.5 rounded">
              👉 <strong>Note:</strong> UUID v7 encodes millisecond unix timestamps in the first 48 bits. This parser will dissect the bitstream to retrieve the exact date and relative creation offset from the identifier!
            </div>
          </div>

          {/* Parser Right: Output analysis - 7 Cols */}
          <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono border-b border-border-hairline/40 pb-3">
              Extraction & Analysis Report
            </h3>

            {parsedResults.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border border-border-hairline border-dashed rounded-lg bg-zinc-900/10 min-h-[300px]">
                <span className="text-3xl text-zinc-650 mb-2">🔍</span>
                <span className="text-xs text-zinc-400 font-mono max-w-xs leading-relaxed">
                  Enter UUID strings on the left to extract timestamps, validate version patterns, and compute generation ages in real-time.
                </span>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto max-h-[460px] flex flex-col gap-4 pr-1">
                {parsedResults.map((res, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 font-mono text-xs flex flex-col gap-2.5 transition-all ${
                      res.valid 
                        ? res.timestamp 
                          ? 'border-accent-emerald/20 bg-emerald-950/5' 
                          : 'border-zinc-800 bg-zinc-900/10'
                        : 'border-red-900/30 bg-red-950/5'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-zinc-200 select-all truncate max-w-[80%]">{res.uuid}</span>
                      <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-bold ${
                        res.valid
                          ? res.timestamp
                            ? 'bg-accent-emerald/10 border-accent-emerald/25 text-accent-emerald'
                            : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                          : 'bg-red-950/20 border-red-900/40 text-red-400'
                      }`}>
                        {res.type}
                      </span>
                    </div>

                    {/* Extracted Details for v7 */}
                    {res.timestamp && res.date ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-border-hairline/30">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Unix Timestamp</span>
                          <span className="text-zinc-300 font-bold">{res.timestamp} <span className="text-[10px] text-zinc-500 font-normal">ms</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Relative Generation Age</span>
                          <span className="text-accent-emerald font-bold">{res.relative}</span>
                        </div>
                        <div className="flex flex-col sm:col-span-2 mt-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Calendar Time Date (UTC)</span>
                          <span className="text-zinc-300">{res.date.toUTCString()}</span>
                        </div>
                        <div className="flex flex-col sm:col-span-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Calendar Time Date (Local)</span>
                          <span className="text-zinc-300">{res.date.toString()}</span>
                        </div>
                      </div>
                    ) : !res.valid ? (
                      <div className="pt-1.5 text-[11px] text-red-400/90 leading-relaxed font-sans border-t border-red-950/20">
                        ❌ This string does not conform to RFC 4122 UUID standards. Ensure it is a valid 36-character hexadecimal token.
                      </div>
                    ) : (
                      <div className="pt-1.5 text-[11px] text-zinc-400/90 leading-relaxed font-sans border-t border-zinc-800/40">
                        ℹ️ UUID v4 is built using purely random numbers and does not contain any chronological metadata or timestamp bits.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Privacy banner */}
            <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono mt-auto">
              <span className="text-accent-emerald">✓</span>
              Processed locally in browser. Zero server transmission.
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
