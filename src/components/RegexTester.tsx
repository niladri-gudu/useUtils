import React, { useState, useEffect, useMemo } from 'react';
import { evaluateRegex } from '../utils-engine/regex';


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
// Regex Presets
// ==========================================
interface Preset {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  testString: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: 'email',
    name: 'Email Address',
    pattern: '\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b',
    flags: 'gim',
    testString: 'Please contact us at support@useutils.com or info.sales@company.co.uk.\nInvalid emails: user@, test@com, @domain.com',
    description: 'Matches standard email addresses.'
  },
  {
    id: 'url',
    name: 'URL Parser',
    pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/\\/=]*)',
    flags: 'g',
    testString: 'Our main site is https://useutils.com.\nAPI docs are at http://api.useutils.com/v1/endpoints?auth=true#doc.\nInvalid url: hps://invalid-url.com',
    description: 'Extracts HTTP/HTTPS URLs.'
  },
  {
    id: 'uuid',
    name: 'UUID v4',
    pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
    flags: 'g',
    testString: 'New transaction created: f81d4fae-7dec-11d0-a765-00a0c91e6bf6 (v1, no match)\nActive API keys:\n1. 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d (v4)\n2. 550e8400-e29b-41d4-a716-446655440000 (v4)',
    description: 'Matches version-4 Universally Unique Identifiers.'
  },
  {
    id: 'phone',
    name: 'Phone Number',
    pattern: '\\+?\\d{1,4}[-\\s]?\\(?\\d{1,3}\\)?[-\\s]?\\d{3,4}[-\\s]?\\d{3,4}',
    flags: 'g',
    testString: 'Call us at +1 (555) 019-2834 or dial 080-1234-5678.\nInternational office: +44 20 7946 0958.',
    description: 'Matches international and local phone number formats.'
  },
  {
    id: 'ipv4',
    name: 'IPv4 Address',
    pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
    flags: 'g',
    testString: 'Localhost is 127.0.0.1.\nRouter IP is 192.168.1.1.\nBroadcast IP: 255.255.255.255.\nInvalid IP: 256.1.2.3',
    description: 'Finds standard IPv4 network addresses.'
  },
  {
    id: 'date',
    name: 'Date (YYYY-MM-DD)',
    pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b',
    flags: 'g',
    testString: 'Task completed on 2026-06-13.\nDue date: 2026-12-31.\nInvalid date formats: 13-06-2026, 2026/06/13, 2026-13-45',
    description: 'Matches dates in ISO 8601 YYYY-MM-DD format.'
  },
  {
    id: 'html',
    name: 'HTML Tag Parser',
    pattern: '<\\/?([a-zA-Z1-6]+)(?:\\s+[^>]*)?>',
    flags: 'g',
    testString: '<div class="header">\n  <h1>Welcome to <span>useUtils</span></h1>\n  <p>Secure online tools</p>\n</div>',
    description: 'Matches HTML start, end, and self-closing tags.'
  },
  {
    id: 'password',
    name: 'Strong Password Rule',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    flags: 'gm',
    testString: 'P@ssword123\nweakpass\nNoSpecialChar123\nnodigits!',
    description: 'Validates passwords: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.'
  }
];

export const RegexTester: React.FC = () => {
  const [pattern, setPattern] = useState<string>('');
  const [flags, setFlags] = useState<string>('g');
  const [testString, setTestString] = useState<string>('');
  const [replaceString, setReplaceString] = useState<string>('');
  const [mode, setMode] = useState<'test' | 'replace'>('test');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('');

  // Sync state with localStorage on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPattern = localStorage.getItem('useutils_regex_pattern');
    const storedFlags = localStorage.getItem('useutils_regex_flags');
    const storedTest = localStorage.getItem('useutils_regex_test');
    const storedMode = localStorage.getItem('useutils_regex_mode');
    const storedReplace = localStorage.getItem('useutils_regex_replace');

    if (storedPattern) setPattern(storedPattern);
    if (storedFlags !== null) setFlags(storedFlags);
    if (storedTest) setTestString(storedTest);
    if (storedMode) setMode(storedMode as any);
    if (storedReplace) setReplaceString(storedReplace);

    // If everything is empty, load the first preset as default
    if (!storedPattern && !storedTest) {
      handleLoadPreset(PRESETS[0]);
    }
  }, []);

  // Sync state changes to localStorage
  const handlePatternChange = (val: string) => {
    setPattern(val);
    setActivePreset('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_pattern', val);
    }
  };

  const handleTestStringChange = (val: string) => {
    setTestString(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_test', val);
    }
  };

  const handleReplaceStringChange = (val: string) => {
    setReplaceString(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_replace', val);
    }
  };

  const handleModeChange = (newMode: 'test' | 'replace') => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_mode', newMode);
    }
  };

  const handleFlagToggle = (flag: string) => {
    let nextFlags = '';
    if (flags.includes(flag)) {
      nextFlags = flags.replace(flag, '');
    } else {
      nextFlags = flags + flag;
    }
    setFlags(nextFlags);
    setActivePreset('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_flags', nextFlags);
    }
  };

  const handleLoadPreset = (preset: Preset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestString(preset.testString);
    setActivePreset(preset.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_regex_pattern', preset.pattern);
      localStorage.setItem('useutils_regex_flags', preset.flags);
      localStorage.setItem('useutils_regex_test', preset.testString);
    }
  };

  const handleClear = () => {
    setPattern('');
    setTestString('');
    setReplaceString('');
    setActivePreset('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('useutils_regex_pattern');
      localStorage.removeItem('useutils_regex_test');
      localStorage.removeItem('useutils_regex_replace');
    }
  };

  // Compile regular expression and calculate matches / replaces safely
  const regexData = useMemo(() => {
    return evaluateRegex(pattern, flags, testString, replaceString);
  }, [pattern, flags, testString, replaceString]);

  // Construct React Node Array of text elements with highlighted match spans
  const highlightedTestText = useMemo(() => {
    if (!testString) return <span className="text-zinc-500 italic">Test string matches will display here...</span>;
    if (regexData.matches.length === 0) return <span className="text-zinc-300 whitespace-pre-wrap">{testString}</span>;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    // Filter out overlapping matches if any occurred due to bad index adjustments
    const sortedMatches = [...regexData.matches].sort((a, b) => a.index - b.index);

    sortedMatches.forEach((m, idx) => {
      // Avoid inserting backward slice or overlap
      if (m.index < lastIndex) return;

      // Text before match
      if (m.index > lastIndex) {
        elements.push(
          <span key={`text-pre-${idx}`} className="text-zinc-300 whitespace-pre-wrap">
            {testString.substring(lastIndex, m.index)}
          </span>
        );
      }

      // Match token
      elements.push(
        <span
          key={`match-${idx}`}
          className="bg-accent-emerald/20 hover:bg-accent-emerald/30 border border-accent-emerald/40 hover:border-accent-emerald/60 text-accent-emerald rounded-sm px-0.5 font-mono cursor-pointer relative group transition-colors duration-100 inline-block align-bottom"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {m.text}
          
          {/* Micro-Tooltip Popup on Hover */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-mono py-1 px-2 rounded shadow-2xl z-40 whitespace-nowrap">
            <span className="text-accent-emerald font-semibold">Match #{idx + 1}</span>
            <span className="text-zinc-500"> • </span>
            <span>[{m.index}, {m.index + m.length}]</span>
            {m.groups.length > 0 && (
              <>
                <span className="text-zinc-500"> • </span>
                <span>Groups: {m.groups.map((g: string | undefined) => g === undefined ? 'undefined' : `"${g}"`).join(', ')}</span>
              </>
            )}
          </span>
        </span>
      );

      lastIndex = m.index + m.length;
    });

    if (lastIndex < testString.length) {
      elements.push(
        <span key="text-post" className="text-zinc-300 whitespace-pre-wrap">
          {testString.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  }, [testString, regexData.matches]);

  const handleCopyReplacement = () => {
    const success = copyToClipboard(regexData.replacedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Sidebar Presets Pane - 3 Columns wide */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-panel border border-border-hairline rounded-lg p-4 h-max lg:sticky lg:top-20">
          <div className="flex flex-col">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Regex Presets
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Click to load standard patterns
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer font-sans ${
                  activePreset === preset.id
                    ? 'bg-accent-emerald/5 border-accent-emerald/30 text-zinc-200'
                    : 'bg-zinc-900/40 border-border-hairline hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className={activePreset === preset.id ? 'text-accent-emerald' : 'text-zinc-300'}>
                    {preset.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.2 rounded">
                    /{preset.flags}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-1 line-clamp-2">
                  {preset.description}
                </p>
                <div className="font-mono text-[9px] text-zinc-500 bg-zinc-950/40 px-1.5 py-0.5 rounded mt-1.5 border border-zinc-900/60 truncate">
                  {preset.pattern}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle/Left Main Input Pane - 5 Columns wide */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Regex Configuration
              </h2>
            </div>
            { (pattern || testString) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors font-mono"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Combined Regex Visualizer & Raw Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
              Regular Expression Pattern
            </label>
            <div className={`flex items-center bg-canvas border rounded-lg p-1 transition-all ${
              regexData.error ? 'border-red-500/60 focus-within:border-red-500' : 'border-border-hairline focus-within:border-zinc-700'
            }`}>
              <span className="text-zinc-650 font-mono text-sm px-2 select-none">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                placeholder="([a-zA-Z0-9]+)..."
                className="w-full bg-transparent outline-none font-mono text-xs md:text-sm text-zinc-200 py-1.5"
              />
              <span className="text-zinc-650 font-mono text-sm px-2 select-none">/</span>
              <span className="text-accent-emerald font-mono text-xs font-semibold px-2 border-l border-zinc-800 min-w-[30px] text-center select-none">
                {flags || <span className="text-zinc-650 italic">none</span>}
              </span>
            </div>

            {/* Invalid Regex Compile Error Warning */}
            {regexData.error && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 text-xs text-red-400 font-mono leading-relaxed mt-1">
                <div className="font-semibold mb-0.5">⚠️ RegExp Error:</div>
                {regexData.error}
              </div>
            )}
          </div>

          {/* Regex Modifiers Flag Checkboxes */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
              Expression Flags
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 bg-zinc-900/30 border border-border-hairline/60 p-2 rounded-lg">
              {[
                { id: 'g', label: 'global (g)', desc: 'Find all matches' },
                { id: 'i', label: 'ignoreCase (i)', desc: 'Case-insensitive' },
                { id: 'm', label: 'multiline (m)', desc: 'Treat anchor characters ^ and $ line by line' },
                { id: 's', label: 'dotAll (s)', desc: 'Allow . to match newlines' },
                { id: 'u', label: 'unicode (u)', desc: 'Enable full unicode parsing' }
              ].map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  title={flag.desc}
                  onClick={() => handleFlagToggle(flag.id)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded border text-center transition-all cursor-pointer select-none ${
                    flags.includes(flag.id)
                      ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-350 hover:bg-zinc-850/40'
                  }`}
                >
                  <span className="text-xs font-mono">{flag.id}</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 whitespace-nowrap">{flag.id === 'g' ? 'global' : flag.id === 'i' ? 'insensitive' : flag.id === 'm' ? 'multiline' : flag.id === 's' ? 'dotAll' : 'unicode'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Tabs Selector */}
          <div className="flex flex-col gap-2 border-t border-border-hairline/60 pt-4">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
              Operation Mode
            </label>
            <div className="flex items-center gap-1.5 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleModeChange('test')}
                className={`flex-grow px-3.5 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer border transition-all duration-75 ${
                  mode === 'test'
                    ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                Match & Test
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('replace')}
                className={`flex-grow px-3.5 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer border transition-all duration-75 ${
                  mode === 'replace'
                    ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold shadow-sm'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                Replace String
              </button>
            </div>
          </div>

          {/* Test String Input Area */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Test Target String
              </label>
              <span className="text-[9px] text-zinc-500 font-mono">
                {testString.length} chars
              </span>
            </div>
            <div className="relative">
              <textarea
                value={testString}
                onChange={(e) => handleTestStringChange(e.target.value)}
                placeholder="Paste text to test regular expression matchings..."
                rows={8}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              {!testString && (
                <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                </div>
              )}
            </div>
          </div>

          {/* Replacement Input Area (If Mode == 'replace') */}
          {mode === 'replace' && (
            <div className="flex flex-col gap-2 border-t border-border-hairline/60 pt-4 animate-fade-in">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Replacement Pattern
              </label>
              <input
                type="text"
                value={replaceString}
                onChange={(e) => handleReplaceStringChange(e.target.value)}
                placeholder="Substitute string (e.g. 'masked', '$1', '[$&]')..."
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans px-1">
                Supports replacement indicators: <code className="text-zinc-400 font-mono">$&</code> (full match), <code className="text-zinc-400 font-mono">$1, $2</code> (group contents), or <code className="text-zinc-400 font-mono">$`</code>/<code className="text-zinc-400 font-mono">$'</code> (text before/after match).
              </p>
            </div>
          )}

        </div>

        {/* Right Output Details Pane - 4 Columns wide */}
        <div className="lg:col-span-4 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Result Details
              </h2>
              {pattern && !regexData.error && (
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Parsed in {regexData.execTime.toFixed(2)}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {pattern && !regexData.error && (
                <div className={`px-2 py-0.5 text-[9px] font-mono rounded-md uppercase font-semibold ${
                  regexData.matches.length > 0
                    ? 'bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald'
                    : 'bg-zinc-850 border border-zinc-800 text-zinc-500'
                }`}>
                  {regexData.matches.length} {regexData.matches.length === 1 ? 'match' : 'matches'}
                </div>
              )}
            </div>
          </div>

          {/* Tab Content 1: TEST MODE */}
          {mode === 'test' && (
            <div className="flex flex-col gap-4 flex-grow">
              
              {/* Highlight Overlay Viewer */}
              <div className="flex flex-col gap-1.5 flex-grow">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Live Match Overlay
                </label>
                <div className="w-full flex-grow min-h-[160px] max-h-[300px] bg-canvas border border-border-hairline rounded-lg p-3 overflow-auto text-xs md:text-sm font-mono leading-relaxed relative">
                  {highlightedTestText}
                </div>
              </div>

              {/* Match Details List */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border-hairline/60">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Matches Breakdown
                </label>

                {regexData.matches.length === 0 ? (
                  <div className="bg-canvas border border-border-hairline rounded-lg p-6 text-center text-xs text-zinc-500 italic font-mono">
                    No active regular expression matches found in test string.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {regexData.matches.slice(0, 100).map((m, idx) => (
                      <div
                        key={`breakdown-${idx}`}
                        className="bg-canvas border border-border-hairline rounded-lg p-2.5 flex flex-col gap-1.5 text-[11px] font-mono"
                      >
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-1">
                          <span className="text-accent-emerald font-semibold">Match #{idx + 1}</span>
                          <span className="text-zinc-500">Range: [{m.index}, {m.index + m.length}]</span>
                        </div>
                        <div className="text-zinc-200 break-all select-all font-semibold bg-zinc-900/50 p-1.5 rounded border border-zinc-900">
                          {m.text}
                        </div>
                        {m.groups.length > 0 && (
                          <div className="flex flex-col gap-1 pl-1 border-l border-zinc-800 mt-1">
                            <span className="text-zinc-500 text-[9px] uppercase font-semibold">Capture Groups:</span>
                            {m.groups.map((groupVal: string | undefined, groupIdx: number) => (
                              <div key={groupIdx} className="flex gap-1.5 text-[10px]">
                                <span className="text-zinc-400 font-semibold">#{groupIdx + 1}:</span>
                                <span className="text-zinc-300 break-all bg-zinc-950 px-1.5 py-0.2 rounded border border-zinc-900">
                                  {groupVal === undefined ? (
                                    <span className="text-zinc-650 italic">undefined</span>
                                  ) : (
                                    `"${groupVal}"`
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {regexData.matches.length > 100 && (
                      <div className="text-center text-[10px] text-zinc-500 font-mono py-1">
                        ... Showing first 100 matches out of {regexData.matches.length} total ...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: REPLACE MODE */}
          {mode === 'replace' && (
            <div className="flex flex-col gap-4 flex-grow">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                  Replaced Output String
                </label>
                <button
                  type="button"
                  onClick={handleCopyReplacement}
                  disabled={!pattern || !!regexData.error || !testString}
                  className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
                >
                  {copyFeedback ? 'Copied ✓' : 'Copy Output'}
                </button>
              </div>

              <div className="flex-grow min-h-[220px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto">
                <textarea
                  value={regexData.replacedOutput}
                  readOnly
                  placeholder="The text substitution results will appear here dynamically..."
                  className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
                />
                {regexData.replacedOutput && (
                  <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                    <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                  </div>
                )}
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
