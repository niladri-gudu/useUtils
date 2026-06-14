import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  diffLines,
  diffJson,
  calculateSimilarity,
  type DiffLine,
  type DiffWord
} from '../utils-engine/diff';

const SAMPLES = {
  text: {
    original: `function calculateTotal(price, tax, discount) {
  // Calculate raw price with tax
  const taxAmount = price * tax;
  const subtotal = price + taxAmount;
  
  // Apply discount
  const finalTotal = subtotal - discount;
  return finalTotal;
}`,
    modified: `/**
 * Calculates the total cost including tax and discounts.
 */
function calculateTotal(price, taxRate = 0.08, discount = 0) {
  if (price < 0) {
    throw new Error("Price cannot be negative");
  }
  
  const taxAmount = price * taxRate;
  const subtotal = price + taxAmount;
  
  // Subtract discount (cannot go below 0)
  const finalTotal = Math.max(0, subtotal - discount);
  return Number(finalTotal.toFixed(2));
}`
  },
  json: {
    original: `{
  "name": "useUtils App",
  "version": "1.2.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "astro": "^4.0.0"
  },
  "author": "Niladri Gudu"
}`,
    modified: `{
  "name": "useUtils App",
  "version": "1.3.0",
  "private": true,
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "astro": "^6.4.5",
    "tailwindcss": "^4.0.0"
  },
  "keywords": [
    "developer",
    "tools",
    "utility"
  ]
}`
  }
};

export function DiffChecker() {
  const [activeTab, setActiveTab] = useState<'text' | 'json' | 'file'>('text');
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  
  // Settings
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('split');
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreEmptyLines, setIgnoreEmptyLines] = useState(false);
  const [semanticJson, setSemanticJson] = useState(true);
  
  // UI states
  const [selectedDiffIndex, setSelectedDiffIndex] = useState(-1);
  const [mergeDecisions, setMergeDecisions] = useState<Record<number, 'original' | 'modified'>>({});
  const [showMergePane, setShowMergePane] = useState(false);
  const [copiedText, setCopiedText] = useState<'original' | 'modified' | 'merged' | 'share' | null>(null);
  
  const originalFileInputRef = useRef<HTMLInputElement>(null);
  const modifiedFileInputRef = useRef<HTMLInputElement>(null);
  const diffContainerRef = useRef<HTMLDivElement>(null);

  // Load configuration from local storage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('useutils_diff_mode');
    if (savedMode === 'split' || savedMode === 'unified') setDiffMode(savedMode);
    
    setCaseInsensitive(localStorage.getItem('useutils_diff_case') === 'true');
    setIgnoreWhitespace(localStorage.getItem('useutils_diff_whitespace') === 'true');
    setIgnoreEmptyLines(localStorage.getItem('useutils_diff_empty') === 'true');
    setSemanticJson(localStorage.getItem('useutils_diff_semantic_json') !== 'false');
  }, []);

  // Save config changes
  const updateSetting = <T extends any>(key: string, val: T, setter: (v: T) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  // Reset merger decisions on diff inputs change
  useEffect(() => {
    setMergeDecisions({});
    setSelectedDiffIndex(-1);
  }, [originalText, modifiedText, caseInsensitive, ignoreWhitespace, ignoreEmptyLines, semanticJson, activeTab]);

  // Load sample texts
  const loadSample = () => {
    if (activeTab === 'json') {
      setOriginalText(SAMPLES.json.original);
      setModifiedText(SAMPLES.json.modified);
    } else {
      setOriginalText(SAMPLES.text.original);
      setModifiedText(SAMPLES.text.modified);
    }
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'original' | 'modified') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (target === 'original') {
        setOriginalText(text);
      } else {
        setModifiedText(text);
      }
    };
    reader.readAsText(file);
  };

  // Perform diffing
  const diffResult = useMemo(() => {
    if (!originalText && !modifiedText) {
      return { diffLines: [], error: undefined };
    }

    const options = { caseInsensitive, ignoreWhitespace, ignoreEmptyLines };

    if (activeTab === 'json') {
      return diffJson(originalText, modifiedText, options, semanticJson);
    }

    return {
      diffLines: diffLines(originalText, modifiedText, options),
      error: undefined
    };
  }, [originalText, modifiedText, caseInsensitive, ignoreWhitespace, ignoreEmptyLines, semanticJson, activeTab]);

  const diffLinesResult = diffResult.diffLines;

  // Compute similarity score
  const similarityScore = useMemo(() => {
    if (diffLinesResult.length === 0) return 0;
    return calculateSimilarity(diffLinesResult);
  }, [diffLinesResult]);

  // Count changes
  const changeStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    diffLinesResult.forEach(line => {
      if (line.type === 'added') additions++;
      else if (line.type === 'removed') deletions++;
      else if (line.type === 'modified') modifications++;
    });

    return { additions, deletions, modifications };
  }, [diffLinesResult]);

  // Indices of non-common lines for keyboard navigation
  const diffLineIndices = useMemo(() => {
    const indices: number[] = [];
    diffLinesResult.forEach((line, index) => {
      if (line.type !== 'common') {
        indices.push(index);
      }
    });
    return indices;
  }, [diffLinesResult]);

  // Keyboard navigation function
  const navigateDiff = (direction: 'next' | 'prev') => {
    if (diffLineIndices.length === 0) return;
    let nextIdx = selectedDiffIndex;
    
    if (direction === 'next') {
      nextIdx = selectedDiffIndex === -1 ? 0 : (selectedDiffIndex + 1) % diffLineIndices.length;
    } else {
      nextIdx = selectedDiffIndex === -1 ? diffLineIndices.length - 1 : (selectedDiffIndex - 1 + diffLineIndices.length) % diffLineIndices.length;
    }
    
    setSelectedDiffIndex(nextIdx);
    const targetIndex = diffLineIndices[nextIdx];
    const element = document.getElementById(`diff-row-${targetIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT'
      ) {
        return;
      }
      
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        navigateDiff('next');
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigateDiff('prev');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [diffLineIndices, selectedDiffIndex]);

  // Interactive Merge Decider output
  const mergedText = useMemo(() => {
    const lines: string[] = [];
    diffLinesResult.forEach((line, index) => {
      const decision = mergeDecisions[index] || 'modified'; // default to modified (B)

      if (line.type === 'common') {
        lines.push(line.value);
      } else if (line.type === 'removed') {
        if (decision === 'original') {
          lines.push(line.value);
        }
      } else if (line.type === 'added') {
        if (decision === 'modified') {
          lines.push(line.value);
        }
      } else if (line.type === 'modified') {
        if (decision === 'original') {
          lines.push(line.oldValue || '');
        } else {
          lines.push(line.newValue || '');
        }
      }
    });
    return lines.join('\n');
  }, [diffLinesResult, mergeDecisions]);

  // Copy to clipboard helper
  const handleCopy = (text: string, type: 'original' | 'modified' | 'merged' | 'share') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Share Diff Link (Base64 URL)
  const generateShareLink = () => {
    if (!originalText && !modifiedText) return;
    try {
      const payload = JSON.stringify({
        o: originalText,
        m: modifiedText,
        t: activeTab
      });
      const b64 = btoa(encodeURIComponent(payload));
      const shareUrl = `${window.location.origin}${window.location.pathname}?diff=${b64}`;
      handleCopy(shareUrl, 'share');
    } catch (err) {
      console.error('Failed to generate share link', err);
    }
  };

  // Load shared link from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedDiff = params.get('diff');
    if (sharedDiff) {
      try {
        const decoded = decodeURIComponent(atob(sharedDiff));
        const data = JSON.parse(decoded);
        if (data.o !== undefined) setOriginalText(data.o);
        if (data.m !== undefined) setModifiedText(data.m);
        if (data.t === 'text' || data.t === 'json' || data.t === 'file') {
          setActiveTab(data.t);
        }
        // Clean URL to prevent re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('Failed to parse shared URL state', err);
      }
    }
  }, []);

  // Clean views helper
  const handleClearAll = () => {
    setOriginalText('');
    setModifiedText('');
  };

  // Inline styling words diff
  const renderInlineDiffText = (words: DiffWord[], type: 'added' | 'removed') => {
    return words.map((w, i) => {
      if (w.type === 'common') {
        return <span key={i}>{w.value}</span>;
      }
      
      const isRed = w.type === 'removed';
      const isGreen = w.type === 'added';

      // Only display deletes in deletion lines, and additions in addition lines
      if (type === 'removed' && isGreen) return null;
      if (type === 'added' && isRed) return null;

      return (
        <span
          key={i}
          className={`px-0.5 rounded font-bold font-mono ${
            isRed 
              ? 'bg-rose-500/30 text-red-300 line-through decoration-red-500 decoration-2' 
              : 'bg-emerald-400/30 text-emerald-300 border-b border-emerald-400/50'
          }`}
        >
          {w.value}
        </span>
      );
    });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Tab Selector & Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-hairline pb-4">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-border-hairline p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none transition-colors ${
              activeTab === 'text'
                ? 'bg-panel text-accent-emerald shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📝 Text Compare
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none transition-colors ${
              activeTab === 'json'
                ? 'bg-panel text-accent-emerald shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {"{ }"} Semantic JSON
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none transition-colors ${
              activeTab === 'file'
                ? 'bg-panel text-accent-emerald shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📁 File Upload
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSample}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg transition-colors cursor-pointer"
          >
            💡 Load Sample
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-400 hover:text-zinc-200 font-mono text-xs rounded-lg transition-colors cursor-pointer"
          >
            🧹 Clear
          </button>
        </div>
      </div>

      {/* Main Raw Input Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Original / Source input panel */}
        <div className="flex flex-col gap-2.5 bg-panel border border-border-hairline rounded-xl p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> Original Text (A)
            </label>
            <div className="flex items-center gap-2">
              {activeTab === 'file' ? (
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'original')}
                  ref={originalFileInputRef}
                  className="hidden"
                  accept=".txt,.json,.js,.ts,.tsx,.css,.html,.md,.yaml,.yml"
                />
              ) : null}
              {activeTab === 'file' && (
                <button
                  onClick={() => originalFileInputRef.current?.click()}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-[10px] text-zinc-300 rounded font-mono"
                >
                  Upload File
                </button>
              )}
              <button
                onClick={() => handleCopy(originalText, 'original')}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-[10px] text-zinc-300 rounded font-mono"
                disabled={!originalText}
              >
                {copiedText === 'original' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder={
              activeTab === 'file'
                ? "Upload a text file, drag & drop a file here, or type/paste original content..."
                : activeTab === 'json'
                ? "Paste your original JSON structure here..."
                : "Paste or type original text block here..."
            }
            className="w-full min-h-[180px] lg:min-h-[240px] bg-zinc-950/60 border border-border-hairline hover:border-zinc-800 focus:border-zinc-700 rounded-lg p-3 font-mono text-xs text-zinc-100 placeholder-zinc-650 outline-none resize-y leading-relaxed"
          />
        </div>

        {/* Modified / Target input panel */}
        <div className="flex flex-col gap-2.5 bg-panel border border-border-hairline rounded-xl p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-accent-emerald rounded-full"></span> Modified Text (B)
            </label>
            <div className="flex items-center gap-2">
              {activeTab === 'file' ? (
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'modified')}
                  ref={modifiedFileInputRef}
                  className="hidden"
                  accept=".txt,.json,.js,.ts,.tsx,.css,.html,.md,.yaml,.yml"
                />
              ) : null}
              {activeTab === 'file' && (
                <button
                  onClick={() => modifiedFileInputRef.current?.click()}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-[10px] text-zinc-300 rounded font-mono"
                >
                  Upload File
                </button>
              )}
              <button
                onClick={() => handleCopy(modifiedText, 'modified')}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-[10px] text-zinc-300 rounded font-mono"
                disabled={!modifiedText}
              >
                {copiedText === 'modified' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <textarea
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            placeholder={
              activeTab === 'file'
                ? "Upload a text file, drag & drop a file here, or type/paste modified content..."
                : activeTab === 'json'
                ? "Paste your updated JSON structure here..."
                : "Paste or type modified text block here to compare..."
            }
            className="w-full min-h-[180px] lg:min-h-[240px] bg-zinc-950/60 border border-border-hairline hover:border-zinc-800 focus:border-zinc-700 rounded-lg p-3 font-mono text-xs text-zinc-100 placeholder-zinc-650 outline-none resize-y leading-relaxed"
          />
        </div>

      </div>

      {/* Comparison Options Panel */}
      <div className="bg-panel border border-border-hairline rounded-xl p-4 flex flex-wrap gap-x-6 gap-y-3 items-center text-xs text-zinc-300">
        <span className="font-mono text-zinc-500 uppercase tracking-wider font-semibold mr-2">Options:</span>
        
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={caseInsensitive}
            onChange={(e) => updateSetting('useutils_diff_case', e.target.checked, setCaseInsensitive)}
            className="rounded border-zinc-700 text-accent-emerald focus:ring-accent-emerald/30 bg-zinc-950"
          />
          <span className="font-mono">Case Insensitive</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => updateSetting('useutils_diff_whitespace', e.target.checked, setIgnoreWhitespace)}
            className="rounded border-zinc-700 text-accent-emerald focus:ring-accent-emerald/30 bg-zinc-950"
          />
          <span className="font-mono">Ignore Whitespace</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ignoreEmptyLines}
            onChange={(e) => updateSetting('useutils_diff_empty', e.target.checked, setIgnoreEmptyLines)}
            className="rounded border-zinc-700 text-accent-emerald focus:ring-accent-emerald/30 bg-zinc-950"
          />
          <span className="font-mono">Ignore Empty Lines</span>
        </label>

        {activeTab === 'json' && (
          <label className="flex items-center gap-2 cursor-pointer select-none border-l border-zinc-800 pl-6">
            <input
              type="checkbox"
              checked={semanticJson}
              onChange={(e) => updateSetting('useutils_diff_semantic_json', e.target.checked, setSemanticJson)}
              className="rounded border-zinc-700 text-accent-emerald focus:ring-accent-emerald/30 bg-zinc-950"
            />
            <span className="font-mono text-accent-emerald font-semibold">Semantic Key Sorting</span>
          </label>
        )}
      </div>

      {/* Comparison Results Header & Viewer */}
      {(!originalText && !modifiedText) ? (
        <div className="w-full flex flex-col items-center justify-center py-12 text-center bg-panel border border-border-hairline rounded-xl gap-3">
          <span className="text-3xl text-zinc-650">⚖️</span>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-zinc-50">Awaiting inputs</h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Enter text above, load sample data, or upload files to see dynamic, local diff comparisons.
            </p>
          </div>
        </div>
      ) : diffResult.error ? (
        <div className="w-full p-4 bg-rose-950/20 border border-red-900/40 text-red-400 rounded-xl font-mono text-xs flex flex-col gap-1.5">
          <span className="font-bold flex items-center gap-1">⚠️ Error Parsing Inputs</span>
          <p>{diffResult.error}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Comparison Metrics Header Dashboard */}
          <div className="bg-panel border border-border-hairline rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* Left stats */}
            <div className="flex items-center gap-4 flex-wrap">
              
              {/* Similarity index badge */}
              <div className="flex flex-col bg-zinc-950 border border-border-hairline rounded-lg px-3 py-1.5 text-center min-w-[90px]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Similarity</span>
                <span className={`text-base font-bold font-mono ${
                  similarityScore === 100 ? 'text-accent-emerald' : similarityScore > 50 ? 'text-amber-400' : 'text-zinc-300'
                }`}>
                  {similarityScore}%
                </span>
              </div>
              
              {/* Additions count */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <span className="bg-emerald-950/60 border border-emerald-900/30 px-2 py-1 rounded">
                  +{changeStats.additions}
                </span>
                <span className="text-[10px] text-zinc-500">Additions</span>
              </div>
              
              {/* Deletions count */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400">
                <span className="bg-rose-950/40 border border-red-900/20 px-2 py-1 rounded">
                  -{changeStats.deletions}
                </span>
                <span className="text-[10px] text-zinc-500">Deletions</span>
              </div>

              {/* Modifications count */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-blue-400">
                <span className="bg-blue-950/30 border border-blue-900/20 px-2 py-1 rounded">
                  ~{changeStats.modifications}
                </span>
                <span className="text-[10px] text-zinc-500">Modifications</span>
              </div>

            </div>

            {/* View Mode controls & navigation */}
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Diff Navigation controls */}
              {diffLineIndices.length > 0 && (
                <div className="flex items-center gap-1 border-r border-border-hairline pr-3 mr-1">
                  <button
                    onClick={() => navigateDiff('prev')}
                    className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-border-hairline rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Previous difference (K)"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => navigateDiff('next')}
                    className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-border-hairline rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Next difference (J)"
                  >
                    ↓
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500 ml-1.5 select-none">
                    {selectedDiffIndex === -1 ? '0' : selectedDiffIndex + 1} of {diffLineIndices.length} diffs
                  </span>
                </div>
              )}

              {/* Display Mode Toggles */}
              <div className="flex items-center gap-1 bg-zinc-950 border border-border-hairline p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setDiffMode('split')}
                  className={`px-3 py-1 rounded font-mono select-none transition-colors ${
                    diffMode === 'split' ? 'bg-panel text-accent-emerald font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Split View
                </button>
                <button
                  onClick={() => setDiffMode('unified')}
                  className={`px-3 py-1 rounded font-mono select-none transition-colors ${
                    diffMode === 'unified' ? 'bg-panel text-accent-emerald font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Unified
                </button>
              </div>

              {/* Merged Pane Toggle Button */}
              <button
                onClick={() => setShowMergePane(!showMergePane)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono select-none transition-all flex items-center gap-1 cursor-pointer ${
                  showMergePane 
                    ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-semibold' 
                    : 'bg-zinc-950 hover:bg-zinc-800 border-border-hairline text-zinc-300'
                }`}
              >
                <span>🛠️</span> <span>Merge Tool</span>
              </button>

              {/* Share button */}
              <button
                onClick={generateShareLink}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-border-hairline text-zinc-300 hover:text-zinc-200 font-mono text-xs rounded-lg transition-colors cursor-pointer"
                title="Generate Base64 compressed sharing URL"
              >
                {copiedText === 'share' ? 'Link Copied!' : 'Share Diff'}
              </button>

            </div>

          </div>

          {/* Interactive Keyboard shortcut pill badge */}
          <div className="text-[11px] font-mono text-zinc-500 self-end flex items-center gap-1.5 select-none -mt-1 mr-2">
            <span>Press</span>
            <kbd className="font-mono bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 px-1 py-0.5 rounded">J</kbd>
            <span>/</span>
            <kbd className="font-mono bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 px-1 py-0.5 rounded">K</kbd>
            <span>to jump differences.</span>
          </div>

          {/* High Fidelity Diff View Output Area */}
          <div
            ref={diffContainerRef}
            className="w-full overflow-x-auto border border-border-hairline rounded-xl bg-zinc-950/30 overflow-y-auto max-h-[600px] no-scrollbar font-mono text-xs select-text"
          >
            
            {diffMode === 'split' ? (
              
              /* SPLIT VIEW (2 columns, horizontally aligned grid) */
              <div className="min-w-[800px] divide-y divide-zinc-900">
                {diffLinesResult.map((line, idx) => {
                  const decision = mergeDecisions[idx] || 'modified';
                  const isSelected = diffLineIndices[selectedDiffIndex] === idx;
                  
                  return (
                    <div
                      key={idx}
                      id={`diff-row-${idx}`}
                      className={`grid grid-cols-2 group hover:bg-zinc-900/10 transition-colors ${
                        isSelected ? 'ring-1 ring-accent-emerald/40 bg-accent-emerald/5' : ''
                      }`}
                    >
                      {/* Left Side (Original - A) */}
                      <div
                        className={`flex border-r border-zinc-900 py-1.5 px-3 min-h-[26px] leading-relaxed ${
                          line.type === 'removed' 
                            ? 'bg-rose-950/20 text-red-200/90' 
                            : line.type === 'modified' 
                            ? 'bg-rose-950/15 text-red-200/90' 
                            : 'text-zinc-400'
                        }`}
                      >
                        {/* Line number gutter */}
                        <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-3.5 select-none font-mono">
                          {line.oldLineNum || ''}
                        </span>
                        
                        {/* Action status gutter */}
                        <span className="w-4 shrink-0 text-center font-bold select-none text-red-400 font-mono">
                          {(line.type === 'removed' || line.type === 'modified') ? '-' : ''}
                        </span>
                        
                        {/* Content line */}
                        <span className="whitespace-pre overflow-x-auto break-all font-mono font-normal">
                          {line.type === 'modified' && line.inlineDiffs ? (
                            renderInlineDiffText(line.inlineDiffs, 'removed')
                          ) : (
                            line.oldValue || line.value
                          )}
                        </span>
                      </div>

                      {/* Right Side (Modified - B) */}
                      <div
                        className={`flex py-1.5 px-3 min-h-[26px] leading-relaxed relative ${
                          line.type === 'added' 
                            ? 'bg-emerald-950/20 text-emerald-200/90' 
                            : line.type === 'modified' 
                            ? 'bg-emerald-950/15 text-emerald-200/90' 
                            : 'text-zinc-300'
                        }`}
                      >
                        {/* Line number gutter */}
                        <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-3.5 select-none font-mono">
                          {line.newLineNum || ''}
                        </span>
                        
                        {/* Action status gutter */}
                        <span className="w-4 shrink-0 text-center font-bold select-none text-emerald-400 font-mono">
                          {(line.type === 'added' || line.type === 'modified') ? '+' : ''}
                        </span>
                        
                        {/* Content line */}
                        <span className="whitespace-pre overflow-x-auto break-all font-mono font-normal">
                          {line.type === 'modified' && line.inlineDiffs ? (
                            renderInlineDiffText(line.inlineDiffs, 'added')
                          ) : (
                            line.newValue || line.value
                          )}
                        </span>

                        {/* Interactive Merge Control Toggles (Overlay on hover/focus) */}
                        {showMergePane && line.type !== 'common' && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 select-none bg-zinc-950 border border-zinc-800 rounded-md p-0.5 shadow-md">
                            <button
                              onClick={() => {
                                setMergeDecisions(prev => ({ ...prev, [idx]: 'original' }));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono transition-colors cursor-pointer ${
                                decision === 'original'
                                  ? 'bg-rose-500/20 border border-rose-500/40 text-red-400'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                              title="Keep A version in output"
                            >
                              Use A
                            </button>
                            <button
                              onClick={() => {
                                setMergeDecisions(prev => ({ ...prev, [idx]: 'modified' }));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono transition-colors cursor-pointer ${
                                decision === 'modified'
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                              title="Use B version (default)"
                            >
                              Use B
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              
              /* UNIFIED VIEW (Single column inline diff) */
              <div className="min-w-[500px] divide-y divide-zinc-900">
                {diffLinesResult.map((line, idx) => {
                  const isSelected = diffLineIndices[selectedDiffIndex] === idx;
                  const decision = mergeDecisions[idx] || 'modified';

                  // For modified, we render old (red) then new (green) consecutive rows
                  if (line.type === 'modified') {
                    return (
                      <div key={idx} id={`diff-row-${idx}`} className={isSelected ? 'ring-1 ring-accent-emerald/40' : ''}>
                        {/* Removed Part */}
                        <div className="flex bg-rose-950/20 hover:bg-rose-950/25 text-red-200/90 py-1.5 px-3 leading-relaxed relative group">
                          {/* Line numbers (Old, Blank) */}
                          <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-2 select-none font-mono">
                            {line.oldLineNum}
                          </span>
                          <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-3.5 select-none font-mono border-r border-zinc-900">
                            
                          </span>
                          <span className="w-4 shrink-0 text-center font-bold select-none text-red-400 ml-1 font-mono">
                            -
                          </span>
                          <span className="whitespace-pre overflow-x-auto break-all font-mono font-normal">
                            {line.inlineDiffs ? renderInlineDiffText(line.inlineDiffs, 'removed') : line.oldValue}
                          </span>

                          {showMergePane && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 bg-zinc-950 border border-zinc-800 rounded-md p-0.5 shadow-md">
                              <button
                                onClick={() => setMergeDecisions(prev => ({ ...prev, [idx]: 'original' }))}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                  decision === 'original' ? 'bg-rose-500/20 text-red-400' : 'text-zinc-500'
                                }`}
                              >
                                Use A
                              </button>
                              <button
                                onClick={() => setMergeDecisions(prev => ({ ...prev, [idx]: 'modified' }))}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                  decision === 'modified' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'
                                }`}
                              >
                                Use B
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Added Part */}
                        <div className="flex bg-emerald-950/20 hover:bg-emerald-950/25 text-emerald-200/90 py-1.5 px-3 leading-relaxed relative group">
                          {/* Line numbers (Blank, New) */}
                          <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-2 select-none font-mono">
                            
                          </span>
                          <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-3.5 select-none font-mono border-r border-zinc-900 font-mono">
                            {line.newLineNum}
                          </span>
                          <span className="w-4 shrink-0 text-center font-bold select-none text-emerald-400 ml-1 font-mono">
                            +
                          </span>
                          <span className="whitespace-pre overflow-x-auto break-all font-mono font-normal font-mono">
                            {line.inlineDiffs ? renderInlineDiffText(line.inlineDiffs, 'added') : line.newValue}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      id={`diff-row-${idx}`}
                      className={`flex py-1.5 px-3 leading-relaxed relative group transition-colors ${
                        line.type === 'added' 
                          ? 'bg-emerald-950/20 text-emerald-200/90 hover:bg-emerald-950/25' 
                          : line.type === 'removed' 
                          ? 'bg-rose-950/20 text-red-200/90 hover:bg-rose-950/25' 
                          : 'text-zinc-350 hover:bg-zinc-900/10'
                      } ${isSelected ? 'ring-1 ring-accent-emerald/40 bg-accent-emerald/5' : ''}`}
                    >
                      {/* Line Numbers Column (Old Line, New Line) */}
                      <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-2 select-none font-mono">
                        {line.oldLineNum || ''}
                      </span>
                      <span className="w-9 shrink-0 text-right text-[10px] text-zinc-650 pr-3.5 select-none border-r border-zinc-900 font-mono">
                        {line.newLineNum || ''}
                      </span>

                      {/* Action status gutter */}
                      <span className={`w-4 shrink-0 text-center font-bold select-none ml-1 font-mono ${
                        line.type === 'added' ? 'text-emerald-400' : line.type === 'removed' ? 'text-red-400' : 'text-zinc-600'
                      }`}>
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
                      </span>

                      {/* Code line content */}
                      <span className="whitespace-pre overflow-x-auto break-all font-mono font-normal">
                        {line.value}
                      </span>

                      {/* Interactive Merge buttons on hover in unified */}
                      {showMergePane && line.type !== 'common' && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 bg-zinc-950 border border-zinc-800 rounded-md p-0.5 shadow-md">
                          <button
                            onClick={() => setMergeDecisions(prev => ({ ...prev, [idx]: 'original' }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                              decision === 'original' ? 'bg-rose-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Use A
                          </button>
                          <button
                            onClick={() => setMergeDecisions(prev => ({ ...prev, [idx]: 'modified' }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                              decision === 'modified' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Use B
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Merge & Construct Output Pane (Dynamic) */}
          {showMergePane && (
            <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-border-hairline/60 pb-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold text-zinc-50 flex items-center gap-2">
                    <span>🛠️</span> Interactive Merger Result
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                    Constructed output combining choices. Unchecked changes resolve to Modified (B) by default.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(mergedText, 'merged')}
                    className="px-3 py-1.5 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-md"
                    disabled={!mergedText}
                  >
                    {copiedText === 'merged' ? 'Copied Output!' : 'Copy Merged Text'}
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={mergedText}
                placeholder="Accept/Ignore changes in the diff viewer above to construct merged code..."
                className="w-full h-[180px] bg-zinc-950/90 border border-border-hairline focus:border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 outline-none leading-relaxed"
              />
            </div>
          )}

        </div>
      )}

      {/* End of content */}

    </div>
  );
}
