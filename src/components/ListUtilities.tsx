import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  splitRawText,
  joinItems,
  calculateStatistics,
  getDuplicateMetrics,
  trimWhitespace,
  filterList,
  deduplicateList,
  sortList,
  addPrefixSuffix,
  cleanList,
  changeCaseOfList
} from '../utils-engine/list-utils';
import type {
  SortType,
  SortDirection,
  DedupePolicy,
  FilterType,
  TrimType,
  CleanType,
  SplitJoinOptions,
  SortOptions,
  DedupeOptions,
  FilterOptions,
  PrefixSuffixOptions
} from '../utils-engine/list-utils';

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

const INITIAL_SAMPLE = `// API Route Endpoints
GET /api/v1/users
POST /api/v1/users
GET /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET /api/v1/products
GET /api/v1/products
GET /api/v1/products/{id}
PUT /api/v1/products/{id}
// Admin Routes
GET /api/v1/admin/dashboard
GET /api/v1/admin/settings
POST /api/v1/admin/settings
GET /api/v1/users`;

export const ListUtilities: React.FC = () => {
  // 1. Raw Text and Split/Join Configuration
  const [rawText, setRawText] = useState<string>(INITIAL_SAMPLE);
  const [splitJoin, setSplitJoin] = useState<SplitJoinOptions>({
    splitBy: 'newline',
    customSplitVal: '',
    joinBy: 'newline',
    customJoinVal: ''
  });

  // 2. Operation Configs
  const [sortOpts, setSortOpts] = useState<SortOptions>({
    type: 'alphabetical',
    direction: 'asc',
    caseSensitive: false
  });

  const [dedupeOpts, setDedupeOpts] = useState<DedupeOptions & { enabled: boolean }>({
    enabled: false,
    policy: 'keep-first',
    caseSensitive: false
  });

  const [prefixSuffixOpts, setPrefixSuffixOpts] = useState<PrefixSuffixOptions & { lineNumbersEnabled: boolean }>({
    prefix: '',
    suffix: '',
    lineNumbersEnabled: false,
    lineNumbers: {
      enabled: false,
      format: '1.',
      startFrom: 1
    }
  });

  const [filterOpts, setFilterOpts] = useState<FilterOptions>({
    removeEmpty: true,
    trimBeforeEmptyCheck: true,
    filterType: 'none',
    filterValue: '',
    minLength: 0,
    maxLength: 100
  });

  const [trimType, setTrimType] = useState<TrimType>('none');
  const [cleanType, setCleanType] = useState<CleanType>('none');
  const [caseType, setCaseType] = useState<string>('none');

  // UI Tabs / Views
  const [activeTab, setActiveTab] = useState<'sort' | 'dedupe' | 'prefix' | 'filter' | 'clean' | 'split-join'>('sort');
  const [rightViewMode, setRightViewMode] = useState<'preview' | 'sandbox' | 'duplicates'>('preview');

  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([INITIAL_SAMPLE]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUpdatingHistory = useRef<boolean>(false);

  // Visual Sandbox State
  const [sandboxItems, setSandboxItems] = useState<{ id: string; val: string; active: boolean }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  // Push new state to history helper
  const pushToHistory = (newText: string) => {
    if (isUpdatingHistory.current) return;
    const cleanHistory = history.slice(0, historyIndex + 1);
    // Don't push duplicates of current state
    if (cleanHistory[cleanHistory.length - 1] === newText) return;

    const updated = [...cleanHistory, newText];
    // Limit history stack size to 50
    if (updated.length > 50) {
      updated.shift();
      setHistory(updated);
      setHistoryIndex(updated.length - 1);
    } else {
      setHistory(updated);
      setHistoryIndex(updated.length - 1);
    }
  };

  const handleRawTextChange = (val: string) => {
    setRawText(val);
    pushToHistory(val);
  };

  // Undo/Redo logic
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUpdatingHistory.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setRawText(history[prevIndex]);
      setTimeout(() => {
        isUpdatingHistory.current = false;
      }, 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUpdatingHistory.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setRawText(history[nextIndex]);
      setTimeout(() => {
        isUpdatingHistory.current = false;
      }, 0);
    }
  };

  // Base parsed items from raw text
  const parsedBaseItems = useMemo(() => {
    return splitRawText(rawText, splitJoin);
  }, [rawText, splitJoin]);

  // Compute stats on basic input
  const inputStats = useMemo(() => {
    return calculateStatistics(parsedBaseItems);
  }, [parsedBaseItems]);

  // Compute duplicate metrics on the base items
  const duplicateMetrics = useMemo(() => {
    return getDuplicateMetrics(parsedBaseItems, dedupeOpts.caseSensitive);
  }, [parsedBaseItems, dedupeOpts.caseSensitive]);

  // Main list transformation pipeline
  const processedItems = useMemo(() => {
    let list = [...parsedBaseItems];

    // 1. Trim whitespace
    if (trimType !== 'none') {
      list = trimWhitespace(list, trimType);
    }

    // 2. Clean items (alphanumeric, ASCII, HTML tags, numbers etc.)
    if (cleanType !== 'none') {
      list = cleanList(list, cleanType);
    }

    // 3. Case Conversion
    if (caseType !== 'none') {
      list = changeCaseOfList(list, caseType);
    }

    // 4. Filtering (removes empty, regex, substrings, length limits)
    list = filterList(list, filterOpts);

    // 5. Deduplication
    if (dedupeOpts.enabled) {
      list = deduplicateList(list, dedupeOpts);
    }

    // 6. Sorting
    list = sortList(list, sortOpts);

    // 7. Add Prefix / Suffix & Line numbering
    if (prefixSuffixOpts.prefix || prefixSuffixOpts.suffix || prefixSuffixOpts.lineNumbersEnabled) {
      const lineNumbersConf = prefixSuffixOpts.lineNumbersEnabled
        ? { ...prefixSuffixOpts.lineNumbers!, enabled: true }
        : undefined;
      list = addPrefixSuffix(list, {
        prefix: prefixSuffixOpts.prefix,
        suffix: prefixSuffixOpts.suffix,
        lineNumbers: lineNumbersConf
      });
    }

    return list;
  }, [
    parsedBaseItems,
    trimType,
    cleanType,
    caseType,
    filterOpts,
    dedupeOpts,
    sortOpts,
    prefixSuffixOpts
  ]);

  // Build the joined output
  const outputText = useMemo(() => {
    return joinItems(processedItems, splitJoin);
  }, [processedItems, splitJoin]);

  // Sync Sandbox with parsed base items on load or when input changes
  useEffect(() => {
    // We only update sandbox state if the user is not currently interacting with sandbox item edits
    // or drag actions, or if sandbox is not active.
    if (rightViewMode === 'sandbox') {
      // Create initial list of sandbox items from base parsed items if sandbox is empty or length changed
      setSandboxItems(
        parsedBaseItems.map((item, idx) => ({
          id: `sandbox-${idx}-${item}`,
          val: item,
          active: true
        }))
      );
    }
  }, [parsedBaseItems, rightViewMode]);

  // Synchronize Sandbox changes back to raw text
  const applySandboxToRaw = (itemsList: typeof sandboxItems) => {
    const activeVals = itemsList.filter((item) => item.active).map((item) => item.val);
    const joined = joinItems(activeVals, { ...splitJoin, joinBy: 'newline' });
    setRawText(joined);
    pushToHistory(joined);
  };

  // Drag and Drop Sandbox items reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag preview look
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragItemIndex.current === null || dragItemIndex.current === index) return;
    dragOverItemIndex.current = index;
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragItemIndex.current === null) return;
    
    const updated = [...sandboxItems];
    const dragItem = updated[dragItemIndex.current];
    
    // Remove the item
    updated.splice(dragItemIndex.current, 1);
    // Insert at new index
    updated.splice(index, 0, dragItem);
    
    setSandboxItems(updated);
    applySandboxToRaw(updated);
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  // Sandbox actions
  const toggleSandboxItem = (index: number) => {
    const updated = [...sandboxItems];
    updated[index].active = !updated[index].active;
    setSandboxItems(updated);
    applySandboxToRaw(updated);
  };

  const deleteSandboxItem = (index: number) => {
    const updated = [...sandboxItems];
    updated.splice(index, 1);
    setSandboxItems(updated);
    applySandboxToRaw(updated);
  };

  const startEditSandboxItem = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
  };

  const saveEditSandboxItem = (index: number) => {
    if (editingIndex === null) return;
    const updated = [...sandboxItems];
    updated[index].val = editingValue;
    setSandboxItems(updated);
    applySandboxToRaw(updated);
    setEditingIndex(null);
  };

  const addSandboxItem = () => {
    const newItem = {
      id: `sandbox-new-${Date.now()}`,
      val: 'New item',
      active: true
    };
    const updated = [...sandboxItems, newItem];
    setSandboxItems(updated);
    applySandboxToRaw(updated);
    setEditingIndex(updated.length - 1);
    setEditingValue('New item');
  };

  // Bulk operation macros (applies operations permanently to the rawText state)
  const applyMacroToRaw = (macroName: string, newItems: string[]) => {
    const joined = joinItems(newItems, { ...splitJoin, joinBy: 'newline' });
    setRawText(joined);
    pushToHistory(joined);
    
    setApplyFeedback(macroName);
    setTimeout(() => setApplyFeedback(null), 1500);
  };

  const handleSortAlphabetical = () => {
    const sorted = sortList(parsedBaseItems, sortOpts);
    applyMacroToRaw('Sorted List', sorted);
  };

  const handleRemoveDuplicates = () => {
    const deduped = deduplicateList(parsedBaseItems, dedupeOpts);
    applyMacroToRaw('Duplicates Removed', deduped);
  };

  const handleFilterEmpty = () => {
    const cleaned = filterList(parsedBaseItems, {
      ...filterOpts,
      removeEmpty: true,
      trimBeforeEmptyCheck: true
    });
    applyMacroToRaw('Empty Lines Trimmed', cleaned);
  };

  const handleTrimWhitespace = (type: TrimType) => {
    const trimmed = trimWhitespace(parsedBaseItems, type);
    applyMacroToRaw('Whitespace Cleaned', trimmed);
  };

  const handleCaseConversion = (cType: string) => {
    const converted = changeCaseOfList(parsedBaseItems, cType);
    applyMacroToRaw('Casing Transformed', converted);
  };

  // Copy output text
  const handleCopyOutput = () => {
    const success = copyToClipboard(outputText);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  // Reset tool state
  const handleReset = () => {
    setRawText(INITIAL_SAMPLE);
    pushToHistory(INITIAL_SAMPLE);
    setTrimType('none');
    setCleanType('none');
    setCaseType('none');
    setDedupeOpts({ enabled: false, policy: 'keep-first', caseSensitive: false });
    setSortOpts({ type: 'alphabetical', direction: 'asc', caseSensitive: false });
    setFilterOpts({
      removeEmpty: true,
      trimBeforeEmptyCheck: true,
      filterType: 'none',
      filterValue: '',
      minLength: 0,
      maxLength: 100
    });
    setPrefixSuffixOpts({
      prefix: '',
      suffix: '',
      lineNumbersEnabled: false,
      lineNumbers: {
        enabled: false,
        format: '1.',
        startFrom: 1
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 1. Live Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Items</span>
          <span className="text-xl font-bold font-mono text-zinc-50">{inputStats.totalItems}</span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Unique Items</span>
          <span className="text-xl font-bold font-mono text-accent-emerald">{inputStats.uniqueCount}</span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Duplicate Rows</span>
          <span className={`text-xl font-bold font-mono ${inputStats.duplicateCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
            {inputStats.duplicateCount}
          </span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Empty Lines</span>
          <span className="text-xl font-bold font-mono text-zinc-400">{inputStats.emptyCount}</span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Chars</span>
          <span className="text-xl font-bold font-mono text-zinc-300">{inputStats.charCount}</span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Words</span>
          <span className="text-xl font-bold font-mono text-zinc-300">{inputStats.wordCount}</span>
        </div>
        <div className="bg-panel border border-border-hairline rounded-xl p-3.5 flex flex-col gap-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Avg Length</span>
          <span className="text-xl font-bold font-mono text-zinc-300">{inputStats.averageLength} ch</span>
        </div>
      </div>

      {/* 2. Undo/Redo & Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-lg p-3">
        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-1.5 bg-zinc-900 border border-border-hairline hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-1.5 bg-zinc-900 border border-border-hairline hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
            </svg>
          </button>
          <span className="text-[10px] font-mono text-zinc-500">
            History: {historyIndex + 1}/{history.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {applyFeedback && (
            <span className="text-xs font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2.5 py-1 rounded animate-fade-in font-semibold">
              {applyFeedback} Applied ✓
            </span>
          )}
          <button
            onClick={handleSortAlphabetical}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-border-hairline hover:border-zinc-750 text-zinc-300 rounded hover:text-zinc-100 cursor-pointer transition-colors"
          >
            Sort Alphabetical
          </button>
          <button
            onClick={handleRemoveDuplicates}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-border-hairline hover:border-zinc-750 text-zinc-300 rounded hover:text-zinc-100 cursor-pointer transition-colors"
          >
            Remove Duplicates
          </button>
          <button
            onClick={handleFilterEmpty}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-border-hairline hover:border-zinc-750 text-zinc-300 rounded hover:text-zinc-100 cursor-pointer transition-colors"
          >
            Clear Empty Lines
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 text-xs font-mono bg-red-950/40 border border-red-900/40 hover:bg-red-950/80 text-red-400 rounded cursor-pointer transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* 3. Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Pane: Input and Controls */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-xl p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Raw List Ingestion
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRawTextChange(`Apple\nOrange\nBanana\nOrange\nApple\nGrape`)}
                className="px-2 py-0.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline transition-colors font-mono cursor-pointer"
              >
                Sample Fruit
              </button>
              <button
                type="button"
                onClick={() => handleRawTextChange(`10.0.0.1\n192.168.1.1\n10.0.0.1\n172.16.0.5\n192.168.1.1`)}
                className="px-2 py-0.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline transition-colors font-mono cursor-pointer"
              >
                Sample IPs
              </button>
              {rawText && (
                <button
                  type="button"
                  onClick={() => handleRawTextChange('')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 transition-colors font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="relative">
            <textarea
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              placeholder="Paste list values (e.g., database fields, email arrays, server paths, numeric logs) here..."
              rows={12}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3.5 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-700"
            />
            {!rawText && (
              <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Configuration Tabs Header */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-1 bg-zinc-900/80 border border-border-hairline p-1 rounded-lg">
              {(['sort', 'dedupe', 'prefix', 'filter', 'clean', 'split-join'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-colors capitalize ${
                    activeTab === tab
                      ? 'bg-panel border border-border-hairline text-accent-emerald font-semibold shadow-sm'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                  }`}
                >
                  {tab === 'dedupe' ? 'Deduplicate' : tab === 'prefix' ? 'Add Prefix/Suffix' : tab.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Tab Configurations Content Panels */}
            <div className="bg-zinc-900/40 border border-border-hairline rounded-lg p-4 min-h-[140px] flex flex-col justify-center gap-4">
              
              {/* TAB 1: SORT */}
              {activeTab === 'sort' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Sort Type</span>
                      <select
                        value={sortOpts.type}
                        onChange={(e) => setSortOpts({ ...sortOpts, type: e.target.value as SortType })}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      >
                        <option value="alphabetical">Alphabetical (A-Z)</option>
                        <option value="natural">Natural (e.g. 2 before 10)</option>
                        <option value="length">Length-based</option>
                        <option value="reverse">Reverse List Order</option>
                        <option value="shuffle">Randomize / Shuffle</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Direction</span>
                      <select
                        value={sortOpts.direction}
                        onChange={(e) => setSortOpts({ ...sortOpts, direction: e.target.value as SortDirection })}
                        disabled={sortOpts.type === 'reverse' || sortOpts.type === 'shuffle'}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700 disabled:opacity-55"
                      >
                        <option value="asc">Ascending (A-Z, Small-Large)</option>
                        <option value="desc">Descending (Z-A, Large-Small)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sortOpts.caseSensitive}
                        onChange={(e) => setSortOpts({ ...sortOpts, caseSensitive: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      Case Sensitive Sorting
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: DEDUPLICATE */}
              {activeTab === 'dedupe' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dedupeOpts.enabled}
                        onChange={(e) => setDedupeOpts({ ...dedupeOpts, enabled: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      <span className="font-semibold text-accent-emerald">Enable Real-Time Deduplication</span>
                    </label>
                    
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dedupeOpts.caseSensitive}
                        onChange={(e) => setDedupeOpts({ ...dedupeOpts, caseSensitive: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      Case Sensitive Deduplication
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Occurrence Policy</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['keep-first', 'keep-last', 'remove-all'] as const).map((policy) => (
                        <button
                          key={policy}
                          type="button"
                          onClick={() => setDedupeOpts({ ...dedupeOpts, policy })}
                          disabled={!dedupeOpts.enabled}
                          className={`px-3 py-1.5 border rounded text-xs font-mono cursor-pointer transition-colors select-none ${
                            dedupeOpts.policy === policy && dedupeOpts.enabled
                              ? 'bg-zinc-800 border-accent-emerald/40 text-accent-emerald font-semibold'
                              : 'bg-canvas border-border-hairline text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none'
                          }`}
                        >
                          {policy === 'keep-first' ? 'Keep First' : policy === 'keep-last' ? 'Keep Last' : 'Remove All Dups'}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {dedupeOpts.policy === 'remove-all'
                        ? 'Completely wipes out any line that appears more than once in the list.'
                        : 'Retains only one unique instance (either the first one encountered or the last).'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: PREFIX / SUFFIX */}
              {activeTab === 'prefix' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Add Prefix</span>
                      <input
                        type="text"
                        placeholder="e.g. prefix_"
                        value={prefixSuffixOpts.prefix}
                        onChange={(e) => setPrefixSuffixOpts({ ...prefixSuffixOpts, prefix: e.target.value })}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Add Suffix</span>
                      <input
                        type="text"
                        placeholder="e.g. _suffix"
                        value={prefixSuffixOpts.suffix}
                        onChange={(e) => setPrefixSuffixOpts({ ...prefixSuffixOpts, suffix: e.target.value })}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border-hairline/40 pt-3 flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefixSuffixOpts.lineNumbersEnabled}
                        onChange={(e) => setPrefixSuffixOpts({ ...prefixSuffixOpts, lineNumbersEnabled: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      Prepend Line Numbers
                    </label>

                    {prefixSuffixOpts.lineNumbersEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5 animate-in fade-in duration-150">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Number Format</span>
                          <select
                            value={prefixSuffixOpts.lineNumbers?.format}
                            onChange={(e) =>
                              setPrefixSuffixOpts({
                                ...prefixSuffixOpts,
                                lineNumbers: {
                                  ...prefixSuffixOpts.lineNumbers!,
                                  format: e.target.value as any
                                }
                              })
                            }
                            className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                          >
                            <option value="1.">Standard (1., 2.)</option>
                            <option value="01.">Padded 2 digits (01., 02.)</option>
                            <option value="001.">Padded 3 digits (001., 002.)</option>
                            <option value="[1]">Brackets ([1], [2])</option>
                            <option value="Line 1:">Label (Line 1:, Line 2:)</option>
                            <option value="1:">Colon (1:, 2:)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Start Index</span>
                          <input
                            type="number"
                            min={0}
                            value={prefixSuffixOpts.lineNumbers?.startFrom}
                            onChange={(e) =>
                              setPrefixSuffixOpts({
                                ...prefixSuffixOpts,
                                lineNumbers: {
                                  ...prefixSuffixOpts.lineNumbers!,
                                  startFrom: parseInt(e.target.value) || 0
                                }
                              })
                            }
                            className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: FILTER */}
              {activeTab === 'filter' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterOpts.removeEmpty}
                        onChange={(e) => setFilterOpts({ ...filterOpts, removeEmpty: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      Remove Empty Lines
                    </label>

                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterOpts.trimBeforeEmptyCheck}
                        disabled={!filterOpts.removeEmpty}
                        onChange={(e) => setFilterOpts({ ...filterOpts, trimBeforeEmptyCheck: e.target.checked })}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 accent-accent-emerald"
                      />
                      Trim before empty check
                    </label>
                  </div>

                  <div className="border-t border-border-hairline/40 pt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5 md:col-span-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Filter Condition</span>
                        <select
                          value={filterOpts.filterType}
                          onChange={(e) => setFilterOpts({ ...filterOpts, filterType: e.target.value as FilterType })}
                          className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                        >
                          <option value="none">No Filter</option>
                          <option value="keep-containing">Keep Containing</option>
                          <option value="remove-containing">Remove Containing</option>
                          <option value="keep-regex">Keep Matching Regex</option>
                          <option value="remove-regex">Remove Matching Regex</option>
                          <option value="keep-length">Keep by Length</option>
                          <option value="remove-length">Remove by Length</option>
                        </select>
                      </div>

                      {/* Display input field depending on selection */}
                      {filterOpts.filterType !== 'none' && !filterOpts.filterType.endsWith('length') && (
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            {filterOpts.filterType.endsWith('regex') ? 'Regular Expression' : 'Substring'}
                          </span>
                          <input
                            type="text"
                            placeholder={filterOpts.filterType.endsWith('regex') ? 'e.g. ^[0-9]+$' : 'e.g. api/v1'}
                            value={filterOpts.filterValue}
                            onChange={(e) => setFilterOpts({ ...filterOpts, filterValue: e.target.value })}
                            className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                      )}

                      {filterOpts.filterType !== 'none' && filterOpts.filterType.endsWith('length') && (
                        <div className="flex flex-row gap-3 md:col-span-2">
                          <div className="flex flex-col gap-1.5 flex-grow">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Min Length</span>
                            <input
                              type="number"
                              min={0}
                              value={filterOpts.minLength}
                              onChange={(e) => setFilterOpts({ ...filterOpts, minLength: parseInt(e.target.value) || 0 })}
                              className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5 flex-grow">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Max Length</span>
                            <input
                              type="number"
                              min={0}
                              value={filterOpts.maxLength}
                              onChange={(e) => setFilterOpts({ ...filterOpts, maxLength: parseInt(e.target.value) || 0 })}
                              className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CLEAN & CASE */}
              {activeTab === 'clean' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Whitespace Trim</span>
                      <select
                        value={trimType}
                        onChange={(e) => setTrimType(e.target.value as TrimType)}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      >
                        <option value="none">No Trimming</option>
                        <option value="trim-both">Trim Spaces (Both Ends)</option>
                        <option value="trim-start">Trim Spaces (Start)</option>
                        <option value="trim-end">Trim Spaces (End)</option>
                        <option value="collapse-spaces">Collapse Multiple Spaces</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Text Cleaning</span>
                      <select
                        value={cleanType}
                        onChange={(e) => setCleanType(e.target.value as CleanType)}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      >
                        <option value="none">No Cleaning</option>
                        <option value="alphanumeric-only">Alphanumeric Only</option>
                        <option value="strip-special">Strip Special Chars (Non-ASCII)</option>
                        <option value="strip-numbers">Remove All Numbers</option>
                        <option value="strip-html-markdown">Strip HTML & Markdown Tags</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Case Converter</span>
                      <select
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="bg-canvas border border-border-hairline rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                      >
                        <option value="none">No Case Change</option>
                        <option value="upper">UPPERCASE</option>
                        <option value="lower">lowercase</option>
                        <option value="camel">camelCase</option>
                        <option value="pascal">PascalCase</option>
                        <option value="snake">snake_case</option>
                        <option value="kebab">kebab-case</option>
                        <option value="constant">CONSTANT_CASE</option>
                        <option value="dot">dot.case</option>
                        <option value="path">path/case</option>
                        <option value="title">Title Case</option>
                        <option value="sentence">Sentence case</option>
                        <option value="alternating">Alternating Case</option>
                        <option value="inverse">Inverse Case</option>
                      </select>
                    </div>
                  </div>

                  {/* Apply macros permanently */}
                  <div className="border-t border-border-hairline/40 pt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-mono text-zinc-500 mr-2">Apply Permanently:</span>
                    <button
                      onClick={() => handleTrimWhitespace('trim-both')}
                      className="px-2 py-1 bg-zinc-900 border border-border-hairline hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Trim Both Ends
                    </button>
                    <button
                      onClick={() => handleTrimWhitespace('collapse-spaces')}
                      className="px-2 py-1 bg-zinc-900 border border-border-hairline hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Collapse Spaces
                    </button>
                    {caseType !== 'none' && (
                      <button
                        onClick={() => handleCaseConversion(caseType)}
                        className="px-2 py-1 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded text-[10px] font-mono font-semibold cursor-pointer"
                      >
                        Apply Case ({caseType})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: SPLIT JOIN */}
              {activeTab === 'split-join' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="flex flex-col gap-2 bg-canvas/30 border border-border-hairline/60 rounded p-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">1. Split Input By</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['newline', 'comma', 'custom'] as const).map((mode) => (
                          <button
                            key={`split-${mode}`}
                            type="button"
                            onClick={() => setSplitJoin({ ...splitJoin, splitBy: mode })}
                            className={`py-1 border rounded text-[11px] font-mono select-none cursor-pointer transition-colors ${
                              splitJoin.splitBy === mode
                                ? 'bg-zinc-800 border-accent-emerald/40 text-accent-emerald font-semibold'
                                : 'bg-canvas border-border-hairline text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {mode === 'newline' ? 'Newline' : mode === 'comma' ? 'Comma' : 'Custom'}
                          </button>
                        ))}
                      </div>

                      {splitJoin.splitBy === 'custom' && (
                        <input
                          type="text"
                          placeholder="Split character or /regex/"
                          value={splitJoin.customSplitVal}
                          onChange={(e) => setSplitJoin({ ...splitJoin, customSplitVal: e.target.value })}
                          className="bg-canvas border border-border-hairline rounded px-2 py-1 mt-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-2 bg-canvas/30 border border-border-hairline/60 rounded p-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">2. Join Output By</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['newline', 'comma', 'custom', 'json'] as const).map((mode) => (
                          <button
                            key={`join-${mode}`}
                            type="button"
                            onClick={() => setSplitJoin({ ...splitJoin, joinBy: mode })}
                            className={`py-1 border rounded text-[10px] font-mono select-none cursor-pointer transition-colors ${
                              splitJoin.joinBy === mode
                                ? 'bg-zinc-800 border-accent-emerald/40 text-accent-emerald font-semibold'
                                : 'bg-canvas border-border-hairline text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {mode === 'newline' ? 'Newline' : mode === 'comma' ? 'Comma' : mode === 'json' ? 'JSON' : 'Custom'}
                          </button>
                        ))}
                      </div>

                      {splitJoin.joinBy === 'custom' && (
                        <input
                          type="text"
                          placeholder="Join string (e.g. | or \t)"
                          value={splitJoin.customJoinVal}
                          onChange={(e) => setSplitJoin({ ...splitJoin, customJoinVal: e.target.value })}
                          className="bg-canvas border border-border-hairline rounded px-2 py-1 mt-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Pane: Outputs, Sandbox & Duplicates Table */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-xl p-5 gap-5">
          
          {/* Header tabs for Right view */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setRightViewMode('preview')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono select-none cursor-pointer transition-colors ${
                  rightViewMode === 'preview'
                    ? 'bg-panel text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                Output Preview
              </button>
              <button
                type="button"
                onClick={() => setRightViewMode('sandbox')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono select-none cursor-pointer transition-colors flex items-center gap-1 ${
                  rightViewMode === 'sandbox'
                    ? 'bg-panel text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                <span>Visual Sandbox</span>
                <span className="text-[9px] bg-accent-emerald/15 px-1 py-0.2 rounded-full font-bold">New</span>
              </button>
              <button
                type="button"
                onClick={() => setRightViewMode('duplicates')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono select-none cursor-pointer transition-colors ${
                  rightViewMode === 'duplicates'
                    ? 'bg-panel text-accent-emerald font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                Dups Table ({duplicateMetrics.length})
              </button>
            </div>

            {/* Quick Actions */}
            {rightViewMode === 'preview' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyOutput}
                  disabled={!outputText}
                  className="flex items-center gap-1 px-3 py-1 text-[11px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded-lg cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
                >
                  {copyFeedback ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            )}

            {rightViewMode === 'sandbox' && (
              <button
                onClick={addSandboxItem}
                className="px-2.5 py-1 text-[11px] bg-accent-emerald hover:bg-emerald-400 text-zinc-950 rounded-lg cursor-pointer transition-colors font-mono font-semibold"
              >
                + Add Item
              </button>
            )}
          </div>

          {/* VIEW: 1. PREVIEW TEXTAREA */}
          {rightViewMode === 'preview' && (
            <div className="flex-grow min-h-[280px] bg-canvas border border-border-hairline rounded-lg p-3.5 relative overflow-auto">
              <textarea
                value={outputText}
                readOnly
                placeholder="Transformed list items will appear here automatically..."
                className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
              />
              {outputText && (
                <div className="absolute right-3.5 bottom-3.5 pointer-events-none select-none">
                  <kbd className="font-mono bg-zinc-800/95 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                </div>
              )}
            </div>
          )}

          {/* VIEW: 2. VISUAL SANDBOX (DRAG-AND-DROP, INLINE EDIT, DELETE) */}
          {rightViewMode === 'sandbox' && (
            <div className="flex-grow min-h-[280px] bg-canvas border border-border-hairline rounded-lg p-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
              <div className="text-[11px] text-zinc-500 font-mono flex items-center justify-between pb-1 border-b border-border-hairline/60">
                <span>Drag handles to reorder • Double-click item text to edit</span>
                <span>Active count: {sandboxItems.filter(i => i.active).length}/{sandboxItems.length}</span>
              </div>

              {sandboxItems.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-2">
                  <span className="text-2xl">📋</span>
                  <span className="text-xs text-zinc-400 font-mono">Sandbox is currently empty.</span>
                  <span className="text-[10px] text-zinc-500 font-mono max-w-xs">Type in the raw ingestion pane to load items.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sandboxItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`flex items-center gap-3 bg-panel border rounded-lg px-3 py-2 transition-all ${
                        dragOverItemIndex.current === idx
                          ? 'border-accent-emerald bg-zinc-900/60 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                          : 'border-border-hairline hover:border-zinc-700'
                      } ${!item.active ? 'opacity-40 border-dashed bg-canvas/30' : ''}`}
                    >
                      {/* Drag Handle */}
                      <div className="cursor-grab active:cursor-grabbing text-zinc-550 select-none px-1 text-sm font-mono tracking-tighter">
                        ☰
                      </div>

                      {/* Enable Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleSandboxItem(idx)}
                        className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                        title={item.active ? 'Exclude from output' : 'Include in output'}
                      />

                      {/* Item content or Editor input */}
                      {editingIndex === idx ? (
                        <div className="flex-grow flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => saveEditSandboxItem(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditSandboxItem(idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            className="flex-grow bg-canvas border border-border-hairline rounded px-2 py-0.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-accent-emerald"
                          />
                          <button
                            onClick={() => saveEditSandboxItem(idx)}
                            className="text-[10px] bg-accent-emerald/20 text-accent-emerald px-1.5 py-0.5 rounded border border-accent-emerald/20 font-mono font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`flex-grow font-mono text-xs md:text-sm text-zinc-200 select-none cursor-pointer truncate ${
                            !item.active ? 'line-through text-zinc-500' : ''
                          }`}
                          onDoubleClick={() => startEditSandboxItem(idx, item.val)}
                          title="Double-click to inline edit"
                        >
                          {item.val || <em className="text-zinc-600">empty line</em>}
                        </span>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => deleteSandboxItem(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1 text-xs cursor-pointer rounded hover:bg-zinc-800 transition-colors"
                        title="Delete line"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: 3. DUPLICATES ANALYZER DRAWER */}
          {rightViewMode === 'duplicates' && (
            <div className="flex-grow min-h-[280px] bg-canvas border border-border-hairline rounded-lg p-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
              <div className="text-[11px] text-zinc-500 font-mono pb-1 border-b border-border-hairline/60">
                Frequency analysis of duplicates found in the raw input text.
              </div>

              {duplicateMetrics.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-2">
                  <span className="text-2xl text-accent-emerald">✓</span>
                  <span className="text-xs text-zinc-400 font-mono">No duplicates detected.</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Your list is completely clean of redundant rows!</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-hairline font-mono text-zinc-400">
                        <th className="py-2 px-3">Row Value</th>
                        <th className="py-2 px-3 text-right">Occurrences</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline/60 font-mono text-zinc-200">
                      {duplicateMetrics.map((dup, i) => (
                        <tr key={i} className="hover:bg-zinc-900/30">
                          <td className="py-2 px-3 truncate max-w-[200px]" title={dup.item}>
                            {dup.item}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-400 font-semibold">
                            {dup.count}x
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                // Macro to keep only first occurrence of this item
                                const key = dedupeOpts.caseSensitive ? dup.item : dup.item.toLowerCase();
                                let firstSeen = false;
                                const filtered = parsedBaseItems.filter(item => {
                                  const itemKey = dedupeOpts.caseSensitive ? item : item.toLowerCase();
                                  if (itemKey === key) {
                                    if (!firstSeen) {
                                      firstSeen = true;
                                      return true;
                                    }
                                    return false;
                                  }
                                  return true;
                                });
                                applyMacroToRaw('Resolved duplicate', filtered);
                              }}
                              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-border-hairline px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Privacy Pill notice */}
          <div className="flex items-center justify-between bg-zinc-900/40 border border-border-hairline/80 rounded-lg p-2.5">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
              <span className="text-accent-emerald">✓</span>
              Processed locally in browser. Zero server transmission.
            </div>
            <div className="text-[10px] text-zinc-650 uppercase tracking-widest font-mono">
              Offline First
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default ListUtilities;
