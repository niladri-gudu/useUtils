import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  rot13,
  rot5,
  rot18,
  rot47,
  caesar,
  vigenere,
  atbash,
  analyzeLetterFrequency,
  bruteForceCaesar,
  calculateEnglishScore,
  ENGLISH_FREQUENCIES
} from '../utils-engine/rot13';
import { formatBytes } from '../utils-engine/file';

// ============================================================================
// Clipboard Copy Helper
// ============================================================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through
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

const SAMPLE_TEXT = 'Cryptography is the practice and study of techniques for secure communication in the presence of adversarial behavior. More generally, cryptography is about constructing and analyzing protocols that prevent third parties or the public from reading private messages.';

type CipherMode = 'rot13' | 'rot5' | 'rot18' | 'rot47' | 'caesar' | 'vigenere' | 'atbash';

export const Rot13Encoder: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [mode, setMode] = useState<CipherMode>('rot13');
  const [caesarShift, setCaesarShift] = useState<number>(3);
  const [vigenereKey, setVigenereKey] = useState<string>('KEY');
  const [isDecrypt, setIsDecrypt] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');

  // Interactive Tabs
  const [activeTab, setActiveTab] = useState<'output' | 'frequency' | 'bruteforce' | 'info'>('output');

  // File Upload
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User notifications
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Sync state from LocalStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedInput = localStorage.getItem('useutils_rot13_input_text');
    if (storedInput) setInputText(storedInput);

    const storedMode = localStorage.getItem('useutils_rot13_mode') as CipherMode;
    if (storedMode) setMode(storedMode);

    const storedShift = localStorage.getItem('useutils_rot13_caesar_shift');
    if (storedShift) setCaesarShift(parseInt(storedShift, 10));

    const storedKey = localStorage.getItem('useutils_rot13_vigenere_key');
    if (storedKey) setVigenereKey(storedKey);

    const storedDecrypt = localStorage.getItem('useutils_rot13_is_decrypt');
    if (storedDecrypt) setIsDecrypt(storedDecrypt === 'true');
  }, []);

  // Sync state helpers
  const handleInputChange = (val: string) => {
    setInputText(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_rot13_input_text', val);
    }
  };

  const handleModeChange = (val: CipherMode) => {
    setMode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_rot13_mode', val);
    }
  };

  const handleCaesarShiftChange = (val: number) => {
    setCaesarShift(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_rot13_caesar_shift', String(val));
    }
  };

  const handleVigenereKeyChange = (val: string) => {
    // Sanitize Vigenère key: letters only
    const cleaned = val.replace(/[^a-zA-Z]/g, '');
    setVigenereKey(cleaned);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_rot13_vigenere_key', cleaned);
    }
  };

  const handleDecryptToggle = (val: boolean) => {
    setIsDecrypt(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_rot13_is_decrypt', String(val));
    }
  };

  // 1. Process Encoding
  const outputText = useMemo(() => {
    if (!inputText) return '';
    try {
      switch (mode) {
        case 'rot13':
          return rot13(inputText);
        case 'rot5':
          return rot5(inputText);
        case 'rot18':
          return rot18(inputText);
        case 'rot47':
          return rot47(inputText);
        case 'caesar':
          return caesar(inputText, caesarShift, isDecrypt);
        case 'vigenere':
          return vigenere(inputText, vigenereKey, isDecrypt);
        case 'atbash':
          return atbash(inputText);
        default:
          return inputText;
      }
    } catch (err: any) {
      return `Encryption Error: ${err.message || 'Unknown error'}`;
    }
  }, [inputText, mode, caesarShift, vigenereKey, isDecrypt]);

  // 2. Frequency Analysis Data
  const frequencyData = useMemo(() => {
    const inputFreq = analyzeLetterFrequency(inputText);
    const outputFreq = analyzeLetterFrequency(outputText);
    return inputFreq.map((item, idx) => ({
      letter: item.letter,
      expected: item.expected,
      inputActual: item.actual,
      outputActual: outputFreq[idx].actual
    }));
  }, [inputText, outputText]);

  // 3. Brute Force Solutions List
  const bruteForceList = useMemo(() => {
    if (mode === 'caesar' || mode === 'rot13' || mode === 'rot18' || mode === 'atbash') {
      return bruteForceCaesar(inputText);
    }
    return [];
  }, [inputText, mode]);

  // File Upload reader
  const processFile = (selectedFile: File) => {
    setFileError(null);
    if (!selectedFile.type.startsWith('text/') && !selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.log') && !selectedFile.name.endsWith('.json') && !selectedFile.name.endsWith('.xml') && !selectedFile.name.endsWith('.yml') && !selectedFile.name.endsWith('.yaml')) {
      setFileError('File type not supported. Please upload a plaintext file (.txt, .log, .json, etc.).');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5MB size limit.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        handleInputChange(e.target.result);
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read the file.');
    };
    reader.readAsText(selectedFile);
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
    setFileError(null);
    handleInputChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyOutput = () => {
    const success = copyToClipboard(outputText);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleApplyShift = (shift: number) => {
    handleCaesarShiftChange(shift);
    handleModeChange('caesar');
    setActiveTab('output');
  };

  const handleReset = () => {
    handleInputChange('');
    setCaesarShift(3);
    setVigenereKey('KEY');
    setIsDecrypt(false);
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Find the max frequency value to scale SVG height nicely
  const maxFrequencyVal = useMemo(() => {
    const vals = frequencyData.flatMap(d => [d.expected, d.inputActual, d.outputActual]);
    return Math.max(15, ...vals);
  }, [frequencyData]);

  // Vigenère repeated key layout helper
  const repeatedVigenereKeyString = useMemo(() => {
    if (mode !== 'vigenere' || !vigenereKey || !inputText) return '';
    const cleanKey = vigenereKey.toUpperCase();
    let result = '';
    let keyIdx = 0;
    for (let i = 0; i < Math.min(60, inputText.length); i++) {
      const char = inputText[i];
      if (/[a-zA-Z]/.test(char)) {
        result += cleanKey[keyIdx % cleanKey.length];
        keyIdx++;
      } else {
        result += ' ';
      }
    }
    if (inputText.length > 60) result += '...';
    return result;
  }, [inputText, mode, vigenereKey]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Input Panel & Settings */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          
          <div className="flex justify-between items-center">
            {/* Input Selection Tabs */}
            <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-border-hairline/60">
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 uppercase tracking-wide ${
                  inputMode === 'text'
                    ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Text Input
              </button>
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 uppercase tracking-wide ${
                  inputMode === 'file'
                    ? 'bg-zinc-800 border-zinc-700/60 text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                File Drop
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {inputMode === 'text' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleInputChange(SAMPLE_TEXT)}
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

          {/* Core Input Ingest */}
          {inputMode === 'text' ? (
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type or paste plain text here to encrypt or decrypt in real-time..."
                rows={8}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              {!inputText && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
                        {formatBytes(file.size)} • plain text
                      </span>
                    </div>
                    <span className="text-[10px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 px-2 py-0.5 rounded font-mono font-semibold uppercase mt-1">
                      Ready to Process
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl text-zinc-650">📥</span>
                    <h4 className="text-xs font-semibold text-zinc-300 font-sans">
                      Drag & Drop Text File Here
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-sans max-w-[240px] leading-relaxed">
                      or click to browse. Max size 5MB. Calculated completely in sandbox.
                    </p>
                  </div>
                )}
              </div>
              {fileError && (
                <div className="text-xs font-mono text-red-400 mt-1">
                  ⚠️ {fileError}
                </div>
              )}
            </div>
          )}

          {/* Cipher Settings */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            
            {/* Cipher Algorithm Tabs */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Classical Cipher Algorithm
              </label>
              <div className="flex flex-wrap gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {[
                  { id: 'rot13', name: 'ROT13' },
                  { id: 'rot5', name: 'ROT5' },
                  { id: 'rot18', name: 'ROT18' },
                  { id: 'rot47', name: 'ROT47' },
                  { id: 'caesar', name: 'Caesar' },
                  { id: 'vigenere', name: 'Vigenère' },
                  { id: 'atbash', name: 'Atbash' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleModeChange(item.id as CipherMode)}
                    className={`px-3 py-1 rounded text-xs font-mono select-none cursor-pointer border transition-all duration-75 ${
                      mode === item.id
                        ? 'bg-zinc-850 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contextual configuration options */}
            <div className="bg-zinc-900/35 border border-border-hairline/60 p-4 rounded-lg flex flex-col gap-4">
              
              {/* Caesar cipher settings */}
              {mode === 'caesar' && (
                <div className="flex flex-col gap-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-300 font-semibold">Caesar Shift Key</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={caesarShift}
                        onChange={(e) => handleCaesarShiftChange(Math.max(0, Math.min(25, parseInt(e.target.value) || 0)))}
                        className="w-12 bg-canvas border border-border-hairline rounded px-1.5 py-0.5 font-mono text-xs text-zinc-200 text-center focus:outline-none focus:border-zinc-700"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">
                        (Letter: {String.fromCharCode(65 + caesarShift)})
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={caesarShift}
                      onChange={(e) => handleCaesarShiftChange(parseInt(e.target.value))}
                      className="flex-grow accent-accent-emerald cursor-pointer h-1 bg-zinc-850 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="flex items-center gap-6 mt-1 pt-2 border-t border-border-hairline/30">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="caesar_decrypt_toggle"
                        checked={isDecrypt}
                        onChange={(e) => handleDecryptToggle(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-accent-emerald bg-canvas border-zinc-800 text-zinc-900 cursor-pointer"
                      />
                      <label htmlFor="caesar_decrypt_toggle" className="text-xs font-mono text-zinc-300 cursor-pointer select-none">
                        Decrypt text (Reverse shift)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Vigenère settings */}
              {mode === 'vigenere' && (
                <div className="flex flex-col gap-3.5 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono text-zinc-300 font-semibold">Vigenère Keyword</label>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">letters only</span>
                    </div>
                    <input
                      type="text"
                      value={vigenereKey}
                      onChange={(e) => handleVigenereKeyChange(e.target.value)}
                      placeholder="Enter alphabetic secret key..."
                      className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded px-3 py-1.5 font-mono text-xs text-zinc-200 transition-all focus:ring-1 focus:ring-zinc-750"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2 border-t border-border-hairline/30">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="vigenere_decrypt_toggle"
                        checked={isDecrypt}
                        onChange={(e) => handleDecryptToggle(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-accent-emerald bg-canvas border-zinc-800 text-zinc-900 cursor-pointer"
                      />
                      <label htmlFor="vigenere_decrypt_toggle" className="text-xs font-mono text-zinc-300 cursor-pointer select-none">
                        Decrypt text (Reverse key shifts)
                      </label>
                    </div>
                  </div>

                  {vigenereKey && repeatedVigenereKeyString && (
                    <div className="bg-canvas border border-border-hairline/80 rounded p-2.5 flex flex-col gap-1 text-[10px] font-mono mt-1 text-zinc-400">
                      <div className="flex gap-2">
                        <span className="text-zinc-600 w-10 shrink-0">Plain:</span>
                        <span className="text-zinc-350 truncate">{inputText.slice(0, 60) || '...'}</span>
                      </div>
                      <div className="flex gap-2 border-t border-border-hairline/30 pt-1">
                        <span className="text-zinc-650 w-10 shrink-0">Key:</span>
                        <span className="text-accent-emerald/80 truncate font-semibold">{repeatedVigenereKeyString}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROT / Symmetric note details */}
              {(mode === 'rot13' || mode === 'rot5' || mode === 'rot18' || mode === 'rot47' || mode === 'atbash') && (
                <div className="text-xs font-mono text-zinc-450 leading-relaxed py-1.5">
                  {mode === 'rot13' && (
                    <span>💡 <strong>ROT13</strong> is a symmetric cipher. Running it twice returns the original text. It is its own inverse (decryption is identical to encryption).</span>
                  )}
                  {mode === 'rot5' && (
                    <span>💡 <strong>ROT5</strong> shifts numbers 0-9 by 5 places. It is symmetric for digits (e.g., 0 ↔ 5, 1 ↔ 6). Non-numeric chars are ignored.</span>
                  )}
                  {mode === 'rot18' && (
                    <span>💡 <strong>ROT18</strong> combines ROT13 (letters) and ROT5 (numbers). It is self-reciprocal (symmetric) for both letters and numbers.</span>
                  )}
                  {mode === 'rot47' && (
                    <span>💡 <strong>ROT47</strong> shifts all printable ASCII characters by 47 places. It is self-reciprocal. It scrambles spaces and special signs.</span>
                  )}
                  {mode === 'atbash' && (
                    <span>💡 <strong>Atbash</strong> is a reflective cipher where letters are matched backwards (A ↔ Z, B ↔ Y). It is self-reciprocal; encrypt and decrypt are identical.</span>
                  )}
                </div>
              )}

            </div>

          </div>
        </div>

        {/* Right Column: Dynamic Output & Analysis Panels */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          {/* Output Header with Tabs */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Processed Studio Output
              </h2>
              
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!outputText}
                className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy Output'}
              </button>
            </div>

            {/* Analysis Tabs Switcher */}
            <div className="flex border-b border-border-hairline/60 pb-1 gap-2">
              {[
                { id: 'output', name: 'Text Output' },
                { id: 'frequency', name: 'Frequency Analysis' },
                { id: 'bruteforce', name: 'Caesar Brute Force', hide: (mode !== 'caesar' && mode !== 'rot13' && mode !== 'rot18' && mode !== 'atbash') },
                { id: 'info', name: 'Cipher Info' }
              ].map((tab) => {
                if (tab.hide) return null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-accent-emerald text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-450 hover:text-zinc-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Tab Contents */}
          <div className="flex-grow flex flex-col min-h-[300px] overflow-hidden">
            
            {/* Tab 1: Plain Text Output */}
            {activeTab === 'output' && (
              <div className="w-full h-full flex flex-col bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto flex-grow select-all">
                <textarea
                  value={outputText}
                  readOnly
                  placeholder="Ciphertext or parsed output will appear here in real-time as you type..."
                  className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all flex-grow"
                />
                
                {outputText && (
                  <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                    <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Letter Frequency Distribution SVG Chart */}
            {activeTab === 'frequency' && (
              <div className="w-full flex flex-col bg-zinc-900/30 border border-border-hairline/60 rounded-lg p-4 gap-4 overflow-y-auto flex-grow justify-between">
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Letter Distribution Analysis
                  </h4>
                  <p className="text-[10px] text-zinc-450 font-sans leading-relaxed">
                    Compare character counts in your text to standard English frequencies. Caesar shifts the whole distribution; Atbash reflects it; Vigenère flattens the distribution peaks.
                  </p>
                </div>

                {/* SVG Visual Chart */}
                <div className="w-full overflow-x-auto py-2 bg-canvas/30 rounded border border-border-hairline/40">
                  <div className="min-w-[480px] h-[180px] relative px-2">
                    <svg viewBox={`0 0 520 180`} className="w-full h-full">
                      {/* Grid Lines */}
                      {[0.25, 0.5, 0.75].map((yPercent, idx) => {
                        const yVal = 10 + yPercent * 140;
                        const labelPct = ((1 - yPercent) * maxFrequencyVal).toFixed(0);
                        return (
                          <g key={idx}>
                            <line
                              x1="30"
                              y1={yVal}
                              x2="510"
                              y2={yVal}
                              stroke="#2c2c2e"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <text
                              x="25"
                              y={yVal + 3}
                              fill="#636366"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="end"
                            >
                              {labelPct}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Letters Columns */}
                      {frequencyData.map((item, idx) => {
                        const x = 35 + idx * 18;
                        const colHeight = 140;
                        
                        // Map frequencies to scale height [0, colHeight]
                        const inputYHeight = (item.inputActual / maxFrequencyVal) * colHeight;
                        const outputYHeight = (item.outputActual / maxFrequencyVal) * colHeight;
                        const expectedYHeight = (item.expected / maxFrequencyVal) * colHeight;

                        return (
                          <g key={item.letter}>
                            {/* Expected marker - Dash */}
                            <line
                              x1={x - 4}
                              y1={150 - expectedYHeight}
                              x2={x + 12}
                              y2={150 - expectedYHeight}
                              stroke="#71717a"
                              strokeWidth="1.5"
                              title={`Expected average: ${item.expected}%`}
                            />

                            {/* Input Actual - Left vertical bar (Gray) */}
                            <rect
                              x={x - 2}
                              y={150 - inputYHeight}
                              width="5"
                              height={Math.max(1, inputYHeight)}
                              fill="#3a3a3c"
                              rx="1"
                              title={`Input ${item.letter}: ${item.inputActual}%`}
                            />

                            {/* Output Actual - Right vertical bar (Emerald) */}
                            <rect
                              x={x + 4}
                              y={150 - outputYHeight}
                              width="5"
                              height={Math.max(1, outputYHeight)}
                              fill="#34d399"
                              rx="1"
                              title={`Output ${item.letter}: ${item.outputActual}%`}
                            />

                            {/* Letter Label */}
                            <text
                              x={x + 3}
                              y="166"
                              fill="#a1a1aa"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {item.letter}
                            </text>
                          </g>
                        );
                      })}
                      {/* Base Line */}
                      <line x1="30" y1="150" x2="510" y2="150" stroke="#3a3a3c" strokeWidth="1" />
                    </svg>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 items-center justify-center text-[10px] font-mono bg-canvas/40 border border-border-hairline/60 p-2 rounded shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-[#71717a] inline-block rounded-xs"></span>
                    <span className="text-zinc-400">English Avg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#3a3a3c] inline-block rounded-xs"></span>
                    <span className="text-zinc-400">Input Text</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-accent-emerald inline-block rounded-xs"></span>
                    <span className="text-zinc-400 font-semibold">Output (Encrypted)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Caesar Brute Force Panel */}
            {activeTab === 'bruteforce' && (
              <div className="w-full flex flex-col bg-zinc-900/30 border border-border-hairline/60 rounded-lg p-3 gap-3 overflow-hidden flex-grow">
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Caesar Cipher Auto-Crack Scanner
                  </h4>
                  <p className="text-[10px] text-zinc-450 font-sans leading-relaxed">
                    Attempts all 25 alphabetical Caesar shifts in real-time. Matches are rated based on letter frequency distribution matching and dictionary overlap. Click a row to load that shift configuration.
                  </p>
                </div>

                <div className="flex-grow overflow-y-auto max-h-[300px] border border-border-hairline/60 rounded bg-canvas/30 p-1.5 flex flex-col gap-1.5">
                  {!inputText.trim() ? (
                    <div className="text-center py-12 text-xs font-mono text-zinc-600">
                      Enter plaintext to run brute-force simulations...
                    </div>
                  ) : (
                    bruteForceList.map((res, idx) => {
                      const isTopResult = idx === 0;
                      return (
                        <div
                          key={res.shift}
                          onClick={() => handleApplyShift(res.shift)}
                          className={`flex items-start justify-between p-2.5 border rounded cursor-pointer transition-all group hover:-translate-x-0.5 ${
                            isTopResult
                              ? 'bg-emerald-950/20 border-accent-emerald/40 hover:bg-emerald-950/35 hover:border-accent-emerald/60'
                              : 'bg-panel/40 border-border-hairline/60 hover:border-zinc-750 hover:bg-panel/60'
                          }`}
                        >
                          <div className="flex flex-col gap-1.5 max-w-[82%]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-zinc-300">
                                Shift {res.shift} (Key: {String.fromCharCode(65 + res.shift)})
                              </span>
                              {isTopResult && (
                                <span className="text-[9px] font-mono bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald px-1 rounded font-semibold uppercase tracking-wide">
                                  Best Match
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-zinc-400 break-all line-clamp-1 italic">
                              "{res.text}"
                            </p>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`text-[10px] font-mono ${isTopResult ? 'text-accent-emerald font-bold' : 'text-zinc-500'}`}>
                              Score: {res.score}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-650 opacity-0 group-hover:opacity-100 transition-opacity">
                              Apply Shift
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Educational Info Pane */}
            {activeTab === 'info' && (
              <div className="w-full bg-zinc-900/30 border border-border-hairline/60 rounded-lg p-4 gap-4 overflow-y-auto flex-grow flex flex-col font-sans text-xs text-zinc-450 leading-relaxed">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold mb-2">
                    About the {mode === 'rot13' ? 'ROT13' : mode === 'caesar' ? 'Caesar Cipher' : mode === 'vigenere' ? 'Vigenère Cipher' : mode.toUpperCase()} Cipher
                  </h4>
                  {mode === 'rot13' && (
                    <div className="flex flex-col gap-2">
                      <p>
                        <strong>ROT13</strong> ("rotate by 13 places") is a simple substitution cipher that replaces a letter with the 13th letter after it in the Latin alphabet.
                      </p>
                      <p>
                        Because there are 26 letters in the basic Latin alphabet, ROT13 is its own inverse; that is, to decrypt ROT13 text, the exact same rotation operation is applied. It is widely used in online forums to hide spoilers, punchlines, puzzle solutions, and offensive materials from a casual glance.
                      </p>
                    </div>
                  )}
                  {mode === 'caesar' && (
                    <div className="flex flex-col gap-2">
                      <p>
                        The <strong>Caesar Cipher</strong> is one of the earliest known and simplest ciphers. It is a type of substitution cipher in which each letter in the plaintext is shifted a fixed number of places down the alphabet.
                      </p>
                      <p>
                        Named after Julius Caesar, who used it with a shift of 3 to communicate with his generals. Because the Caesar cipher has only 25 possible shifts (excluding 0), it is extremely easy to crack using brute-force (testing all shifts) or letter frequency analysis.
                      </p>
                    </div>
                  )}
                  {mode === 'vigenere' && (
                    <div className="flex flex-col gap-2">
                      <p>
                        The <strong>Vigenère Cipher</strong> is a method of encrypting alphabetic text by using a series of interwoven Caesar ciphers based on the letters of a keyword. It is a polyalphabetic substitution cipher.
                      </p>
                      <p>
                        First described by Giovan Battista Bellaso in 1553, the cipher is easy to understand and implement, but it resisted all attempts to break it for three centuries, which earned it the description <em>"le chiffre indéchiffrable"</em> (French for 'the indecipherable cipher'). Friedrich Kasiski published the first successful attack method in 1863.
                      </p>
                    </div>
                  )}
                  {mode === 'atbash' && (
                    <div className="flex flex-col gap-2">
                      <p>
                        The <strong>Atbash Cipher</strong> is a specific type of monoalphabetic substitution cipher that maps the alphabet to its reverse. That is, the first letter becomes the last letter, the second letter becomes the second to last letter, and so on (A ↔ Z, B ↔ Y, C ↔ X).
                      </p>
                      <p>
                        Originally used for the Hebrew alphabet (where it is named after the first, last, second, and second-to-last Hebrew letters: Aleph-Tav-Bet-Shin). Atbash is highly symmetric, meaning encryption and decryption are identical processes.
                      </p>
                    </div>
                  )}
                  {mode === 'rot5' && (
                    <p>
                      <strong>ROT5</strong> is a symmetric rotation cipher designed specifically for numbers (0 to 9). It rotates digits by 5 positions, shifting 0 to 5, 3 to 8, etc. It leaves letters and symbols unchanged. It is often combined with ROT13 as part of ROT18 to encrypt alphanumeric fields.
                    </p>
                  )}
                  {mode === 'rot18' && (
                    <p>
                      <strong>ROT18</strong> combines ROT13 (letters) and ROT5 (numbers) to provide alphanumeric rotation. For example, the string "ABC-123" rotated under ROT18 becomes "NOP-678". Like its components, it is completely symmetric.
                    </p>
                  )}
                  {mode === 'rot47' && (
                    <p>
                      <strong>ROT47</strong> is a rotation cipher that rotates printable ASCII characters by 47 positions. It shifts characters from code 33 (exclamation point) to code 126 (tilde). Because it covers a broader character set, it scrambles numbers, lowercase letters, uppercase letters, and common punctuation marks under a single unified shift.
                    </p>
                  )}
                </div>

                <div className="border-t border-border-hairline/60 pt-3 mt-1 flex flex-col gap-1.5">
                  <h5 className="font-semibold text-zinc-350 text-[10px] uppercase font-mono">Mathematical Cryptanalysis</h5>
                  <p>
                    Substitution ciphers preserve the frequency distribution of characters, which makes them highly vulnerable. A letter frequency analysis reveals the shift by mapping the highest peaks (representing 'E', 'T', 'A' in English) from the ciphertext back to expected distributions.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Sandbox Status badge */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono shrink-0">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>

        </div>

      </div>
    </div>
  );
};
