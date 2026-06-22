import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  analyzeText,
  cleanText,
  generateHexDump,
  type CharDetail,
  type CleanOptions
} from '../utils-engine/text-inspector';

const DEMO_TEXT = `Hello World! 😄 This is a test string containing:\n1. Invisible characters: Here is a zero-width space right here ->\u200B<- (did you see it?).\n2. Combined characters (NFD format): cafe\u0301 (cafe + \u0301 combiner = café).\n3. Tab characters:\t<- look, a tab!\n4. Control characters like Null (\\x00) ->\u0000<-.\n5. Compound Emojis: 👨‍👩‍👧‍👦 (Family ZWJ chain: Man + ZWJ + Woman + ZWJ + Girl + ZWJ + Boy).`;

export function TextInspector() {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'table' | 'warnings' | 'hexdump'>('grid');
  
  // Clean options state
  const [cleanOptions, setCleanOptions] = useState<CleanOptions>({
    removeInvisible: true,
    removeControl: false,
    convertTabsToSpaces: false,
    tabSize: 4,
    normalizeWhitespace: false,
    removeEmojis: false,
    normalizeForm: 'NFC'
  });

  // Selected character in grid/table for detail sidebar
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);

  // UI feedbacks
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showFeedback = (message: string, isClean: boolean = false) => {
    if (isClean) {
      setCleanFeedback(message);
      setTimeout(() => setCleanFeedback(null), 2500);
    } else {
      setCopiedAction(message);
      setTimeout(() => setCopiedAction(null), 2000);
    }
  };

  // Run analysis (cap detail list at 3000 for UI performance, count summary on full text)
  const analysis = useMemo(() => {
    return analyzeText(text, 3000);
  }, [text]);

  const hexLines = useMemo(() => {
    return generateHexDump(text);
  }, [text]);

  const selectedCharDetail = useMemo(() => {
    if (selectedCharIndex === null) return null;
    return analysis.characterList.find(c => c.charIndex === selectedCharIndex) || null;
  }, [selectedCharIndex, analysis]);

  // Set initial selected char to the first one if available
  useEffect(() => {
    if (analysis.characterList.length > 0 && selectedCharIndex === null) {
      setSelectedCharIndex(0);
    } else if (analysis.characterList.length === 0) {
      setSelectedCharIndex(null);
    }
  }, [analysis.characterList]);

  // Actions
  const handleCopyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showFeedback('Input text copied!');
  };

  const handleClearText = () => {
    setText('');
    setSelectedCharIndex(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handlePasteText = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
      showFeedback('Pasted from clipboard');
    } catch (err) {
      showFeedback('Failed to read clipboard');
    }
  };

  const handleLoadDemo = () => {
    setText(DEMO_TEXT);
    setSelectedCharIndex(0);
    showFeedback('Loaded unicode demo text');
  };

  const handleApplyClean = () => {
    if (!text) return;
    const cleaned = cleanText(text, cleanOptions);
    setText(cleaned);
    showFeedback('Text cleaned successfully!', true);
  };

  const handleQuickStripInvisible = () => {
    if (!text) return;
    const opts: CleanOptions = {
      ...cleanOptions,
      removeInvisible: true,
      removeControl: false,
      convertTabsToSpaces: false,
      normalizeWhitespace: false,
      removeEmojis: false,
      normalizeForm: 'none'
    };
    const cleaned = cleanText(text, opts);
    setText(cleaned);
    showFeedback('All zero-width/hidden characters stripped!', true);
  };

  const handleQuickNormalize = (form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD') => {
    if (!text) return;
    const opts: CleanOptions = {
      ...cleanOptions,
      removeInvisible: false,
      removeControl: false,
      convertTabsToSpaces: false,
      normalizeWhitespace: false,
      removeEmojis: false,
      normalizeForm: form
    };
    const cleaned = cleanText(text, opts);
    setText(cleaned);
    showFeedback(`Normalized to ${form}`, true);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+Alt+D or Ctrl+Alt+D for Demo text
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleLoadDemo();
      }
      // CMD+Alt+C or Ctrl+Alt+C for Clear
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearText();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [text]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
      
      {/* LEFT COLUMN: Input and Sanitization Settings (5 cols) */}
      <div className="lg:col-span-5 flex flex-col bg-panel border border-border-hairline rounded-xl overflow-hidden shadow-lg">
        
        {/* Input Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 px-4 py-3 border-b border-border-hairline">
          <span className="text-xs font-mono font-semibold uppercase text-zinc-400 select-none tracking-wider">
            Raw Input String
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-xs font-mono text-zinc-350 rounded transition-all hover:bg-zinc-700 cursor-pointer"
              title="Load demo text loaded with unicode errors (Shortcut: ⌘+Alt+D)"
            >
              Demo Text
            </button>
            <button
              onClick={handlePasteText}
              className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-xs font-mono text-zinc-350 rounded transition-all hover:bg-zinc-700 flex items-center gap-1 cursor-pointer"
            >
              Paste <kbd className="hidden sm:inline font-mono bg-zinc-900 px-1 py-0.2 rounded border border-zinc-700 text-[9px] text-zinc-500">⌘ V</kbd>
            </button>
            {text && (
              <>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-xs font-mono text-zinc-350 rounded transition-all hover:bg-zinc-700 cursor-pointer"
                >
                  Copy
                </button>
                <button
                  onClick={handleClearText}
                  className="px-2.5 py-1 bg-rose-950/20 border border-rose-900/40 hover:border-rose-800 text-xs font-mono text-rose-400 rounded transition-all hover:bg-rose-950/40 cursor-pointer"
                  title="Clear text (Shortcut: ⌘+Alt+C)"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Text Input Frame */}
        <div className="relative flex-grow flex min-h-[250px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here to inspect its Unicode composition. Try pasting problematic characters, zero-width joiners, or strings that fail JSON parsing..."
            className="w-full min-h-[250px] p-4 bg-transparent outline-none border-none text-zinc-150 font-mono text-sm leading-relaxed resize-none placeholder-zinc-500"
            spellCheck="false"
          />

          {copiedAction && (
            <div className="absolute top-4 right-4 bg-accent-emerald text-zinc-950 font-mono text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-lg select-none pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
              {copiedAction}
            </div>
          )}
        </div>

        {/* Text Cleaner Toolset Drawer */}
        <div className="border-t border-border-hairline bg-zinc-900/30 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
              Sanitize & Cleaning Studio
            </span>
            {cleanFeedback && (
              <span className="text-[11px] font-mono text-accent-emerald font-medium animate-pulse">
                {cleanFeedback}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Left controls */}
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanOptions.removeInvisible}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, removeInvisible: e.target.checked })}
                  className="rounded border-zinc-700 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer w-4 h-4"
                />
                <span>Remove Zero-Width & Hidden</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanOptions.removeControl}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, removeControl: e.target.checked })}
                  className="rounded border-zinc-700 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer w-4 h-4"
                />
                <span>Strip Non-Space Control Codes</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanOptions.removeEmojis}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, removeEmojis: e.target.checked })}
                  className="rounded border-zinc-700 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer w-4 h-4"
                />
                <span>Strip Emojis</span>
              </label>
            </div>

            {/* Right controls */}
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanOptions.normalizeWhitespace}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, normalizeWhitespace: e.target.checked })}
                  className="rounded border-zinc-700 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer w-4 h-4"
                />
                <span>Flatten Spaces & Trim</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanOptions.convertTabsToSpaces}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, convertTabsToSpaces: e.target.checked })}
                  className="rounded border-zinc-700 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer w-4 h-4"
                />
                <span>Tabs to Spaces</span>
              </label>

              {cleanOptions.convertTabsToSpaces && (
                <div className="flex items-center gap-2 pl-6 font-mono text-[11px] text-zinc-500">
                  <span>Tab Size:</span>
                  <select
                    value={cleanOptions.tabSize}
                    onChange={(e) => setCleanOptions({ ...cleanOptions, tabSize: parseInt(e.target.value) })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-1 text-zinc-300 outline-none"
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Normalization select */}
          <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
            <span className="text-zinc-400 font-sans">Unicode Normalization Form:</span>
            <select
              value={cleanOptions.normalizeForm}
              onChange={(e) => setCleanOptions({ ...cleanOptions, normalizeForm: e.target.value as CleanOptions['normalizeForm'] })}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 outline-none font-mono text-[11px]"
            >
              <option value="none">None (Keep Raw)</option>
              <option value="NFC">NFC (Canonical Composition)</option>
              <option value="NFD">NFD (Canonical Decomposition)</option>
              <option value="NFKC">NFKC (Compatibility Composition)</option>
              <option value="NFKD">NFKD (Compatibility Decomposition)</option>
            </select>
          </div>

          <button
            onClick={handleApplyClean}
            disabled={!text}
            className="w-full bg-accent-emerald hover:bg-emerald-450 disabled:opacity-50 text-zinc-950 font-semibold font-mono py-2 rounded-lg text-xs cursor-pointer shadow-md select-none active:scale-98 transition-all"
          >
            Execute Cleaning Operations
          </button>
        </div>

        {/* Input stats summary */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-border-hairline bg-zinc-900/60 text-[11px] font-mono text-zinc-500">
          <div className="flex gap-3">
            <span>Bytes (UTF-8): <strong className="text-zinc-300">{analysis.byteSizeUtf8}</strong></span>
            <span>UTF-16 Units: <strong className="text-zinc-300">{analysis.charCount}</strong></span>
          </div>
          <div>
            <span>Code Points: <strong className="text-zinc-300">{analysis.codePointCount}</strong></span>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Unicode Analytics Studio (7 cols) */}
      <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-xl overflow-hidden shadow-lg">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border-hairline bg-zinc-900/60 p-1 select-none">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-zinc-800 text-accent-emerald border border-border-hairline shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔲 Character Grid
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'bg-zinc-800 text-accent-emerald border border-border-hairline shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📋 Unicode Table
          </button>
          <button
            onClick={() => setActiveTab('warnings')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all relative cursor-pointer ${
              activeTab === 'warnings'
                ? 'bg-zinc-800 text-accent-emerald border border-border-hairline shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚠️ Warnings
            {analysis.hasInvisibleChars && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hexdump')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'hexdump'
                ? 'bg-zinc-800 text-accent-emerald border border-border-hairline shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💾 UTF-8 Hex
          </button>
        </div>

        {/* Tab content workspace */}
        <div className="p-5 flex-grow overflow-y-auto min-h-[400px] flex flex-col justify-between">
          
          {/* TAB 1: Character Matrix Grid */}
          {activeTab === 'grid' && (
            <div className="flex-grow flex flex-col gap-5 animate-in fade-in duration-200 justify-between">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Character Flow Matrix (First 3000 elements)</span>
                  <div className="flex gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-zinc-800 border border-zinc-700 rounded-sm"></span> Standard</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-accent-emerald/10 border border-accent-emerald/20 rounded-sm"></span> Emojis</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-950/20 border border-yellow-800/40 rounded-sm"></span> Whitespace</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-950/30 border border-rose-800/45 rounded-sm"></span> Warning / Hidden</span>
                  </div>
                </div>

                {text.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-zinc-500 border border-border-hairline border-dashed rounded-lg bg-zinc-900/10">
                    No character data. Type something in the input panel or click 'Demo Text'.
                  </div>
                ) : (
                  <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {analysis.characterList.map((char) => {
                      // Determine BG colors depending on class
                      let bgClass = 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-750 text-zinc-300';
                      if (char.type === 'emoji') {
                        bgClass = 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald hover:border-accent-emerald/45';
                      } else if (char.type === 'whitespace') {
                        bgClass = 'bg-yellow-950/10 border-yellow-900/20 text-yellow-400/80 hover:border-yellow-700/40';
                      } else if (char.type === 'invisible' || char.type === 'control') {
                        bgClass = 'bg-rose-950/25 border-rose-900/40 text-rose-400 hover:border-rose-600';
                      }

                      const isSelected = selectedCharIndex === char.charIndex;
                      const selectedBorder = isSelected ? 'ring-2 ring-accent-emerald ring-offset-1 ring-offset-[#1c1c1e]' : '';

                      return (
                        <button
                          key={char.charIndex}
                          onClick={() => setSelectedCharIndex(char.charIndex)}
                          className={`w-full aspect-square border rounded-lg flex items-center justify-center font-mono text-sm cursor-pointer select-none transition-all ${bgClass} ${selectedBorder}`}
                          title={`[Index ${char.charIndex}] Code Point ${char.hexCodePoint}: "${char.typeName}"`}
                        >
                          {/* Rendering glyph logic */}
                          {char.type === 'invisible' || char.type === 'control' ? (
                            <span className="text-[10px] font-sans font-bold">
                              {char.codePoint === 0x200B ? 'ZWSP' : 
                               char.codePoint === 0x200D ? 'ZWJ' : 
                               char.codePoint === 0x200C ? 'ZWNJ' : 
                               char.codePoint === 0x0000 ? 'NUL' : 'ctrl'}
                            </span>
                          ) : char.codePoint === 0x000A ? (
                            '↵'
                          ) : char.codePoint === 0x0009 ? (
                            '⇥'
                          ) : char.codePoint === 0x0020 ? (
                            '␣'
                          ) : (
                            char.char
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Character Deep Dive Inspector Card */}
              {selectedCharDetail ? (
                <div className="bg-zinc-900 border border-border-hairline rounded-xl p-4 mt-4 animate-in fade-in zoom-in-98 duration-150">
                  <div className="flex items-start gap-4">
                    {/* Visual Glyph Showcase */}
                    <div className="w-16 h-16 bg-panel border border-border-hairline rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-3xl font-mono text-zinc-100 select-all">
                        {selectedCharDetail.type === 'invisible' || selectedCharDetail.type === 'control' ? '⚠️' : selectedCharDetail.char}
                      </span>
                    </div>

                    {/* Metadata table */}
                    <div className="flex-grow flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {selectedCharDetail.hexCodePoint} ({selectedCharDetail.typeName})
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">
                          Char Index: {selectedCharDetail.charIndex}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400">
                        <div>Decimal Val: <strong className="text-zinc-300">{selectedCharDetail.dec}</strong></div>
                        <div>Unicode Block: <strong className="text-zinc-300 truncate block max-w-[180px]">{selectedCharDetail.unicodeBlock}</strong></div>
                        <div>UTF-8 Hex: <strong className="text-zinc-300">{selectedCharDetail.utf8Hex}</strong></div>
                        <div>UTF-16 Hex: <strong className="text-zinc-300">{selectedCharDetail.utf16Hex}</strong></div>
                      </div>

                      {/* Warning/Description box */}
                      {selectedCharDetail.description && (
                        <p className="text-[10px] leading-relaxed text-yellow-400/90 bg-yellow-950/10 border border-yellow-900/20 p-2 rounded-md mt-1.5">
                          ⚠️ {selectedCharDetail.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Binary bits visual representation */}
                  <div className="border-t border-zinc-800/80 pt-3 mt-3 flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Binary Structure (Big Endian)</span>
                    <span className="font-mono text-xs text-accent-emerald tracking-wide select-all">{selectedCharDetail.bin}</span>
                  </div>
                </div>
              ) : text ? (
                <div className="text-center text-xs font-mono text-zinc-500 mt-4">
                  Click a character block in the matrix above to view its technical binary structure.
                </div>
              ) : null}

            </div>
          )}

          {/* TAB 2: Detailed Table View */}
          {activeTab === 'table' && (
            <div className="flex-grow flex flex-col gap-4 animate-in fade-in duration-200">
              
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Detailed Code Points Indexing Table</span>
                <span>Showing first 3000 rows</span>
              </div>

              {text.length === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-zinc-500 border border-border-hairline border-dashed rounded-lg bg-zinc-900/10">
                  No data points to tabulate. Type in the input panel to build table.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border-hairline rounded-lg bg-zinc-900/20 max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-hairline bg-zinc-900 font-mono text-zinc-400 text-[10px] uppercase select-none">
                        <th className="p-2.5 text-center w-12">Idx</th>
                        <th className="p-2.5 text-center w-12">Glyph</th>
                        <th className="p-2.5">Code Point</th>
                        <th className="p-2.5">Unicode Block</th>
                        <th className="p-2.5">UTF-8 Bytes</th>
                        <th className="p-2.5">Type Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 font-mono text-[11px] text-zinc-300">
                      {analysis.characterList.map((char) => (
                        <tr
                          key={char.charIndex}
                          onClick={() => {
                            setSelectedCharIndex(char.charIndex);
                            setActiveTab('grid'); // switch back to grid to see detail
                          }}
                          className={`hover:bg-zinc-850/50 cursor-pointer ${
                            selectedCharIndex === char.charIndex ? 'bg-zinc-900/60 text-accent-emerald font-bold' : ''
                          }`}
                        >
                          <td className="p-2 text-center text-zinc-550">{char.charIndex}</td>
                          <td className="p-2 text-center text-base bg-zinc-900/20 border-r border-l border-zinc-800/40">
                            {char.type === 'invisible' || char.type === 'control' ? (
                              <span className="text-[10px] font-sans font-bold text-rose-400">⚠️</span>
                            ) : char.codePoint === 0x000A ? (
                              '↵'
                            ) : char.codePoint === 0x0009 ? (
                              '⇥'
                            ) : char.codePoint === 0x0020 ? (
                              '␣'
                            ) : (
                              char.char
                            )}
                          </td>
                          <td className="p-2 font-bold">{char.hexCodePoint}</td>
                          <td className="p-2 text-zinc-400 truncate max-w-[120px]">{char.unicodeBlock}</td>
                          <td className="p-2 text-zinc-400">{char.utf8Hex}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold border ${
                              char.type === 'emoji' ? 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald' :
                              char.type === 'whitespace' ? 'bg-yellow-950/20 border-yellow-900/40 text-yellow-400/80' :
                              char.type === 'invisible' || char.type === 'control' ? 'bg-rose-950/30 border-rose-900/40 text-rose-400' :
                              'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}>
                              {char.typeName.split(' ')[0]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: Warnings & Hidden Scanner */}
          {activeTab === 'warnings' && (
            <div className="flex-grow flex flex-col gap-4 animate-in fade-in duration-200">
              
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Invisible & Control Code Warning Report</span>
              </div>

              {!analysis.hasInvisibleChars ? (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center gap-4 bg-zinc-900/10 border border-border-hairline rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center text-accent-emerald">
                    ✓
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h4 className="text-sm font-semibold text-zinc-100">No hidden anomalies found!</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                      No zero-width spaces, null bytes, or problematic formatting markers were detected. Your string is clean and safe for database queries, JSON parsing, and compiler configurations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Warning summary banner */}
                  <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono font-bold text-rose-400">
                        Warning: {analysis.invisibleCharCount} hidden character(s) detected!
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        These characters are invisible to human readers but will be parsed by compilers, databases, and APIs. This can result in unexpected syntax errors or encoding mismatches.
                      </p>
                    </div>
                    <button
                      onClick={handleQuickStripInvisible}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold font-mono text-[10px] rounded-lg cursor-pointer transition-colors shadow"
                    >
                      Strip All
                    </button>
                  </div>

                  {/* List of specific warnings */}
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {analysis.characterList
                      .filter(c => c.type === 'invisible' || (c.type === 'control' && c.codePoint !== 0x0009 && c.codePoint !== 0x000A && c.codePoint !== 0x000D))
                      .map((char, index) => (
                        <div
                          key={`${char.hexCodePoint}-${index}`}
                          className="bg-zinc-900 border border-border-hairline p-3 rounded-lg flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-zinc-200 font-bold">
                              {char.typeName} ({char.hexCodePoint})
                            </span>
                            <span className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                              Positioned at character index {char.charIndex} (code unit offset {char.codeUnitIndex}). {char.description}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => {
                              // Highlight character in grid
                              setSelectedCharIndex(char.charIndex);
                              setActiveTab('grid');
                            }}
                            className="px-2 py-0.5 border border-zinc-700 hover:border-accent-emerald/40 hover:text-accent-emerald text-[10px] text-zinc-400 rounded cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: UTF-8 Hex Dump */}
          {activeTab === 'hexdump' && (
            <div className="flex-grow flex flex-col gap-4 animate-in fade-in duration-200">
              
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>UTF-8 Hexadecimal Core Dump</span>
                <span className="font-mono text-[10px]">16-byte columns</span>
              </div>

              {text.length === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-zinc-500 border border-border-hairline border-dashed rounded-lg bg-zinc-900/10">
                  No byte dump. Type something in the input panel to generate.
                </div>
              ) : (
                <div className="font-mono text-[11px] bg-zinc-950 p-4 border border-border-hairline rounded-lg overflow-x-auto max-h-[350px] leading-relaxed select-text select-none">
                  
                  {/* Hex dump headers */}
                  <div className="text-zinc-500 border-b border-zinc-900 pb-1.5 mb-1.5 flex gap-4 font-bold select-none">
                    <div className="w-16">Offset</div>
                    <div className="w-[325px]">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</div>
                    <div>ASCII</div>
                  </div>

                  {/* Hex rows */}
                  <div className="flex flex-col gap-0.5 text-zinc-350">
                    {hexLines.map((line, idx) => (
                      <div key={`${line.offset}-${idx}`} className="flex gap-4 hover:bg-zinc-900/40 py-0.5 px-1 rounded">
                        <span className="text-zinc-500 font-semibold">{line.offset}</span>
                        <span className="text-accent-emerald font-bold select-all whitespace-pre">{line.hex}</span>
                        <span className="text-zinc-400 border-l border-zinc-900 pl-4 select-all whitespace-pre">{line.ascii}</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* Privacy status badge pinned at bottom */}
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-5 mt-4 border-t border-zinc-800/80">
            <span>Processed locally in browser. Zero server transmission.</span>
            <span>UTF-8 Engine</span>
          </div>

        </div>

      </div>

    </div>
  );
}
export default TextInspector;
