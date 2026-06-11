import React, { useState, useEffect, useMemo } from 'react';

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
// Case Transformation Utilities
// ==========================================
const getTokens = (str: string): string[] => {
  // Split camelCase & PascalCase
  const withSpaces = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  
  // Split by non-alphanumeric chars
  return withSpaces.split(/[^a-zA-Z0-9]+/).filter(Boolean);
};

const toCamelCase = (str: string): string => {
  const tokens = getTokens(str);
  if (tokens.length === 0) return '';
  return tokens
    .map((token, index) => {
      const lower = token.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

const toPascalCase = (str: string): string => {
  const tokens = getTokens(str);
  if (tokens.length === 0) return '';
  return tokens
    .map((token) => {
      const lower = token.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

const toSnakeCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('_');
};

const toKebabCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('-');
};

const toConstantCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toUpperCase()).join('_');
};

const toDotCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('.');
};

const toPathCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('/');
};

const toTitleCase = (str: string): string => {
  const minorWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v\.?|via|vs\.?|with)$/i;
  return str.replace(/([^\s\-_.\/\\,;:!?()]+)/g, (word, index, fullText) => {
    const isFirst = index === 0;
    const isLast = index + word.length === fullText.length;
    if (!isFirst && !isLast && minorWords.test(word)) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

const toSentenceCase = (str: string): string => {
  if (!str) return '';
  const lower = str.toLowerCase();
  let result = lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });
  // Capitalize standalone "I"
  result = result.replace(/\bi\b/g, 'I');
  return result;
};

const toAlternatingCase = (str: string): string => {
  let uppercase = true;
  return str
    .split('')
    .map((c) => {
      if (/[a-zA-Z]/.test(c)) {
        const res = uppercase ? c.toUpperCase() : c.toLowerCase();
        uppercase = !uppercase;
        return res;
      }
      return c;
    })
    .join('');
};

const toInverseCase = (str: string): string => {
  return str
    .split('')
    .map((c) => {
      if (c === c.toUpperCase()) return c.toLowerCase();
      return c.toUpperCase();
    })
    .join('');
};

// ==========================================
// Smart Case Detection Helper
// ==========================================
const detectCase = (str: string): string => {
  const trimmed = str.trim();
  if (!trimmed) return 'None';

  // Single word / no punctuation checks
  const hasSpace = trimmed.includes(' ');
  const hasUnderscore = trimmed.includes('_');
  const hasDash = trimmed.includes('-');
  const hasDot = trimmed.includes('.');
  const hasSlash = trimmed.includes('/');

  if (hasSpace) {
    if (trimmed === trimmed.toUpperCase()) return 'UPPERCASE';
    if (trimmed === trimmed.toLowerCase()) return 'lowercase';
    
    // Check Title Case
    const words = trimmed.split(/\s+/);
    const isTitle = words.every((w) => {
      if (w.length === 0) return true;
      const first = w.charAt(0);
      const isUpper = first === first.toUpperCase() && /[A-Z]/.test(first);
      const isMinor = /^(a|an|and|as|at|but|by|for|if|in|of|on|or|the|to|with)$/i.test(w);
      return isUpper || isMinor;
    });
    if (isTitle && words.some((w) => /[A-Z]/.test(w.charAt(0)))) return 'Title Case';

    // Check Sentence Case
    const firstChar = trimmed.charAt(0);
    const startsWithUpper = firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar);
    const rest = trimmed.slice(1);
    const restMostlyLower = (rest.match(/[A-Z]/g) || []).length < (rest.match(/[a-z]/g) || []).length * 0.2;
    if (startsWithUpper && restMostlyLower) return 'Sentence case';

    return 'Mixed Space Text';
  }

  if (hasUnderscore) {
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return 'CONSTANT_CASE';
    if (trimmed === trimmed.toLowerCase()) return 'snake_case';
    return 'Mixed Underscore';
  }

  if (hasDash) {
    if (trimmed === trimmed.toLowerCase()) return 'kebab-case';
    return 'Mixed Dash';
  }

  if (hasDot) {
    if (trimmed === trimmed.toLowerCase()) return 'dot.case';
    return 'Mixed Dot';
  }

  if (hasSlash) {
    if (trimmed === trimmed.toLowerCase()) return 'path/case';
    return 'Mixed Path';
  }

  // Camel/Pascal detection for single words
  if (/^[a-z]+[A-Z0-9]/.test(trimmed)) {
    return 'camelCase';
  }
  if (/^[A-Z][a-z0-9]+[A-Z]/.test(trimmed)) {
    return 'PascalCase';
  }
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return 'UPPERCASE';
  }
  if (trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed)) {
    return 'lowercase';
  }

  return 'Plain Text / Identifier';
};

// ==========================================
// Longest Common Subsequence Diffing
// ==========================================
interface DiffNode {
  type: 'added' | 'removed' | 'common';
  value: string;
}

const diffChars = (oldStr: string, newStr: string): DiffNode[] => {
  const n = oldStr.length;
  const m = newStr.length;
  
  // Boundary fallback for safety
  if (n > 1500 || m > 1500) {
    return [
      { type: 'removed', value: oldStr },
      { type: 'added', value: newStr }
    ];
  }

  const dp: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldStr[i - 1] === newStr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n, j = m;
  const result: DiffNode[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
      result.unshift({ type: 'common', value: oldStr[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: newStr[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: oldStr[i - 1] });
      i--;
    }
  }

  return result;
};

// ==========================================
// Samples
// ==========================================
const DEV_SAMPLE = `user_id
auth_token_secret
API_GATEWAY_URL
kebab-case-variable
MyPascalCaseClass
camelCaseIdentifier
db.connection.pool_size
v1/users/profile`;

const PARAGRAPH_SAMPLE = `the quick brown fox jumps over the lazy dog.
this is a sample paragraph with MULTIPLE lines of text.
i hope this case converter is useful for your developer workflow!`;

// Supported Cases List
interface CaseOption {
  id: string;
  name: string;
  example: string;
  converter: (s: string) => string;
  isProgramming: boolean;
}

const CASE_OPTIONS: CaseOption[] = [
  { id: 'camel', name: 'camelCase', example: 'camelCase', converter: toCamelCase, isProgramming: true },
  { id: 'pascal', name: 'PascalCase', example: 'PascalCase', converter: toPascalCase, isProgramming: true },
  { id: 'snake', name: 'snake_case', example: 'snake_case', converter: toSnakeCase, isProgramming: true },
  { id: 'kebab', name: 'kebab-case', example: 'kebab-case', converter: toKebabCase, isProgramming: true },
  { id: 'constant', name: 'CONSTANT_CASE', example: 'CONSTANT_CASE', converter: toConstantCase, isProgramming: true },
  { id: 'dot', name: 'dot.case', example: 'dot.case', converter: toDotCase, isProgramming: true },
  { id: 'path', name: 'path/case', example: 'path/case', converter: toPathCase, isProgramming: true },
  { id: 'upper', name: 'UPPERCASE', example: 'UPPERCASE', converter: (s) => s.toUpperCase(), isProgramming: false },
  { id: 'lower', name: 'lowercase', example: 'lowercase', converter: (s) => s.toLowerCase(), isProgramming: false },
  { id: 'title', name: 'Title Case', example: 'Title Case', converter: toTitleCase, isProgramming: false },
  { id: 'sentence', name: 'Sentence case', example: 'Sentence case', converter: toSentenceCase, isProgramming: false },
  { id: 'alternating', name: 'aLtErNaTiNg CaSe', example: 'aLtErNaTiNg CaSe', converter: toAlternatingCase, isProgramming: false },
  { id: 'inverse', name: 'iNvErSe CaSe', example: 'iNvErSe CaSe', converter: toInverseCase, isProgramming: false },
];

export const CaseConverter: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('camel');
  const [lineByLine, setLineByLine] = useState<boolean>(true);
  const [stripPunctuation, setStripPunctuation] = useState<boolean>(true);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(true);
  
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [copyTargetFeedback, setCopyTargetFeedback] = useState<Record<string, boolean>>({});

  // Sync state: auto-disable punctuation stripping for natural language cases
  useEffect(() => {
    const selected = CASE_OPTIONS.find((c) => c.id === selectedCaseId);
    if (selected && !selected.isProgramming) {
      setStripPunctuation(false);
    } else {
      setStripPunctuation(true);
    }
  }, [selectedCaseId]);

  // Detected input case format
  const detectedInputCase = useMemo(() => {
    return detectCase(input);
  }, [input]);

  // Main conversion engine
  const convertedOutput = useMemo(() => {
    if (!input) return '';

    const selectedCase = CASE_OPTIONS.find((c) => c.id === selectedCaseId);
    if (!selectedCase) return input;

    const processText = (text: string): string => {
      let working = text;
      
      if (trimWhitespace) {
        working = working.trim();
      }

      if (stripPunctuation && selectedCase.isProgramming) {
        // Strip out dots, slashes, dashes, underscores, spaces and convert them using tokens
        return selectedCase.converter(working);
      } else {
        // Natural language cases or preserved punctuation:
        // If lineByLine is off, just apply it
        // If lineByLine is on, we apply it line by line
        return selectedCase.converter(working);
      }
    };

    if (lineByLine) {
      return input
        .split('\n')
        .map((line) => {
          // If punctuation is stripped, we tokenise the line
          if (stripPunctuation && selectedCase.isProgramming) {
            return selectedCase.converter(line);
          }
          return selectedCase.converter(line);
        })
        .join('\n');
    }

    return processText(input);
  }, [input, selectedCaseId, lineByLine, stripPunctuation, trimWhitespace]);

  // Memoized diff computation
  const diffData = useMemo(() => {
    if (!showDiff || !input || input.length > 1200 || convertedOutput.length > 1200) return null;
    return diffChars(input, convertedOutput);
  }, [showDiff, input, convertedOutput]);

  // Statistics
  const statistics = useMemo(() => {
    const chars = input.length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const lines = input ? input.split('\n').length : 0;
    return { chars, words, lines };
  }, [input]);

  // Copy Main Output
  const handleCopyOutput = () => {
    const success = copyToClipboard(convertedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  // Copy specific grid card case
  const handleCopyGridCase = (text: string, caseId: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopyTargetFeedback((prev) => ({ ...prev, [caseId]: true }));
      setTimeout(() => {
        setCopyTargetFeedback((prev) => ({ ...prev, [caseId]: false }));
      }, 1500);
    }
  };

  // Swaps input with output
  const handleSwap = () => {
    if (!convertedOutput) return;
    setInput(convertedOutput);
  };

  // Generate All Case Variant previews (for short texts)
  const allCasesPreviews = useMemo(() => {
    if (!input || input.length > 150) return [];
    
    return CASE_OPTIONS.map((cOption) => {
      let previewText = '';
      if (lineByLine) {
        previewText = input
          .split('\n')
          .map((line) => cOption.converter(line))
          .join('\n');
      } else {
        previewText = cOption.converter(input);
      }
      return {
        ...cOption,
        text: previewText
      };
    });
  }, [input, lineByLine]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Split-Pane Converter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Ingest Raw Input */}
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
                onClick={() => setInput(DEV_SAMPLE)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample Vars
              </button>
              <button
                type="button"
                onClick={() => setInput(PARAGRAPH_SAMPLE)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors font-mono"
              >
                Sample Text
              </button>
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
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
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste raw text, code identifiers, or database variables here..."
              rows={10}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Operations & Customization Controls */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Line-by-Line mode */}
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineByLine}
                  onChange={(e) => setLineByLine(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Treat each line independently
              </label>

              {/* Strip Punctuation */}
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripPunctuation}
                  onChange={(e) => setStripPunctuation(e.target.checked)}
                  className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                />
                Strip special characters
              </label>

              {/* Trim whitespace */}
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

            {/* Smart Detection Bar */}
            <div className="flex items-center justify-between bg-zinc-900 border border-border-hairline rounded px-3.5 py-2">
              <span className="text-[11px] font-mono text-zinc-400">Auto-Detected Case:</span>
              <span className="text-[11px] font-mono bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald px-2 py-0.5 rounded font-semibold">
                {detectedInputCase}
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane: Transformed Outputs */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          
          {/* Output Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Converted Output
            </h2>

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
                title={input.length > 1200 ? 'Diff is disabled for inputs larger than 1200 characters' : 'Show inline modifications'}
              >
                Show Diff
              </button>
              <button
                type="button"
                onClick={handleSwap}
                disabled={!convertedOutput}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
                title="Swap input and output values"
              >
                Swap ⇄
              </button>
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!convertedOutput}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick Case Selection Tab bar */}
          <div className="flex flex-wrap gap-1 bg-zinc-900/60 border border-border-hairline p-1.5 rounded-lg">
            {CASE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedCaseId(opt.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono select-none cursor-pointer transition-colors duration-75 ${
                  selectedCaseId === opt.id
                    ? 'bg-zinc-800 border border-zinc-700 text-accent-emerald font-semibold shadow-sm'
                    : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>

          {/* Output Display box */}
          <div className="flex-grow min-h-[200px] bg-canvas border border-border-hairline rounded-lg p-3 relative overflow-auto">
            {showDiff && diffData ? (
              // Inline Highlighted Diff View
              <div className="font-mono text-xs md:text-sm break-all leading-relaxed whitespace-pre-wrap selection:bg-emerald-400/20 max-h-[350px] overflow-y-auto">
                {diffData.map((node, index) => {
                  if (node.type === 'removed') {
                    return (
                      <span
                        key={index}
                        className="bg-red-900/30 text-red-400 line-through px-0.5 rounded-sm"
                        title="Deleted character"
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
                        title="Inserted character"
                      >
                        {node.value}
                      </span>
                    );
                  }
                  return <span key={index} className="text-zinc-200">{node.value}</span>;
                })}
              </div>
            ) : (
              // Standard Output Field
              <textarea
                value={convertedOutput}
                readOnly
                placeholder="Transformed output will display here in real-time..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
              />
            )}

            {convertedOutput && !showDiff && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
              </div>
            )}
          </div>

          {/* Privacy Guarantee Note */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>

        </div>
      </div>

      {/* All Cases Preview Grid (Visible for shorter inputs to allow instant comparisons) */}
      {input && input.length <= 150 && allCasesPreviews.length > 0 && (
        <div className="bg-panel border border-border-hairline rounded-lg p-5 mt-2 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center border-b border-border-hairline/60 pb-2">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              All Formats at a Glance
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">
              Hover to quickly copy any case
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allCasesPreviews.map((preview) => (
              <div
                key={preview.id}
                onClick={() => handleCopyGridCase(preview.text, preview.id)}
                className="group relative flex flex-col bg-canvas border border-border-hairline hover:border-accent-emerald/40 rounded-lg p-3 cursor-pointer select-none transition-all hover:bg-zinc-900/30"
              >
                <span className="text-[10px] text-zinc-500 font-mono font-medium tracking-wide uppercase">
                  {preview.name}
                </span>
                <span className="text-xs text-zinc-200 font-mono truncate mt-1 group-hover:text-accent-emerald transition-colors">
                  {preview.text}
                </span>

                {/* Micro-action Badge */}
                <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    copyTargetFeedback[preview.id]
                      ? 'bg-accent-emerald/20 border-accent-emerald/30 text-accent-emerald font-semibold'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}>
                    {copyTargetFeedback[preview.id] ? 'Copied ✓' : 'Copy'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
