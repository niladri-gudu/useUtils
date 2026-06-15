import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  countCharacters,
  countWords,
  countSentences,
  countParagraphs,
  countLines,
  countSyllables,
  calculateFleschReadingEase,
  calculateARI,
  calculateGunningFog,
  getWordDensity,
  extractPatterns,
  cleanText,
  getWords
} from '../utils-engine/word-counter';

// Demo text to pre-populate the tool with sample analytical content
const DEMO_TEXT = `A SUCCESSFUL DIGITAL PLATFORM requires regular auditing, precise formatting, and continuous optimization. 

When developers analyze log file databases (like server outputs containing IPv4 address ranges such as 192.168.1.1 and email parameters like system.admin@useutils.com), they require tools that execute locally to protect sensitive operational keys.

The Flesch-Kincaid ease formula provides a metric for text readability. By monitoring the automated readability index (ARI), technical writers ensure that documents remain accessible. If you paste your content here, this application will instantly calculate word densities, reading time, and complex syllabic counts. 

Processed locally in the browser. Zero server transmission. Give it a try! https://useutils.com/tools/word-counter`;

export function WordCounter() {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'readability' | 'density' | 'extract'>('stats');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [readingWpm, setReadingWpm] = useState(200);
  const [speakingWpm, setSpeakingWpm] = useState(130);
  const [showInvisibles, setShowInvisibles] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [filterStopWords, setFilterStopWords] = useState(true);
  const [densitySearch, setDensitySearch] = useState('');
  const [extractType, setExtractType] = useState<'emails' | 'urls' | 'ips' | 'numbers'>('emails');
  
  // UI Feedbacks
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger feedback timers
  const showFeedback = (message: string, isClean: boolean = false) => {
    if (isClean) {
      setCleanFeedback(message);
      setTimeout(() => setCleanFeedback(null), 2500);
    } else {
      setCopiedAction(message);
      setTimeout(() => setCopiedAction(null), 2000);
    }
  };

  // Cursor Tracking
  const updateCursorPosition = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const textBeforeCursor = target.value.substring(0, target.selectionStart);
    const lines = textBeforeCursor.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  // Calculations Memoization
  const stats = useMemo(() => {
    const charCountWithSpace = countCharacters(text, true);
    const charCountNoSpace = countCharacters(text, false);
    const wordCount = countWords(text);
    const sentenceCount = countSentences(text);
    const paragraphCount = countParagraphs(text);
    const lineCount = countLines(text);
    const wordsList = getWords(text);
    
    // Syllables calculations
    let totalSyllables = 0;
    let complexWordsCount = 0; // words with >= 3 syllables
    const uniqueWordsSet = new Set<string>();

    wordsList.forEach(w => {
      const syl = countSyllables(w);
      totalSyllables += syl;
      if (syl >= 3) complexWordsCount++;
      uniqueWordsSet.add(w.toLowerCase());
    });

    const uniqueWords = uniqueWordsSet.size;
    const avgWordLength = wordCount > 0 ? Math.round((charCountNoSpace / wordCount) * 10) / 10 : 0;
    const avgSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
    const sizeInBytes = new Blob([text]).size;

    // Readability scores
    const flesch = calculateFleschReadingEase(wordCount, sentenceCount, totalSyllables);
    const ari = calculateARI(charCountNoSpace, wordCount, sentenceCount);
    const gunningFog = calculateGunningFog(wordCount, sentenceCount, complexWordsCount);

    return {
      charCountWithSpace,
      charCountNoSpace,
      wordCount,
      sentenceCount,
      paragraphCount,
      lineCount,
      uniqueWords,
      avgWordLength,
      avgSentenceLength,
      sizeInBytes,
      flesch,
      ari,
      gunningFog,
      totalSyllables,
      complexWordsCount
    };
  }, [text]);

  // Reading & Speaking times
  const timing = useMemo(() => {
    const words = stats.wordCount;
    
    const readMin = words / readingWpm;
    const readSec = Math.round((readMin % 1) * 60);
    const readDuration = `${Math.floor(readMin)}m ${readSec}s`;

    const speakMin = words / speakingWpm;
    const speakSec = Math.round((speakMin % 1) * 60);
    const speakDuration = `${Math.floor(speakMin)}m ${speakSec}s`;

    return {
      readDuration,
      speakDuration
    };
  }, [stats.wordCount, readingWpm, speakingWpm]);

  // Word Density Memoization
  const densities = useMemo(() => {
    const rawDensities = getWordDensity(text, filterStopWords);
    if (!densitySearch) return rawDensities;
    return rawDensities.filter(d => d.word.includes(densitySearch.toLowerCase()));
  }, [text, filterStopWords, densitySearch]);

  // Pattern Extractor Memoization
  const extractedItems = useMemo(() => {
    return extractPatterns(text, extractType);
  }, [text, extractType]);

  // Actions
  const handleCopyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showFeedback('Input text copied!');
  };

  const handleClearText = () => {
    setText('');
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
    showFeedback('Loaded analytical sample text');
  };

  const handleCleanText = (action: 'trim' | 'double-spaces' | 'empty-lines' | 'duplicates' | 'html' | 'special') => {
    if (!text) return;
    const cleaned = cleanText(text, action);
    setText(cleaned);
    
    const labels: Record<string, string> = {
      'trim': 'Whitespace trimmed',
      'double-spaces': 'Double spaces flattened',
      'empty-lines': 'Empty lines removed',
      'duplicates': 'Duplicate lines removed',
      'html': 'HTML tags stripped',
      'special': 'Special characters removed'
    };
    showFeedback(labels[action] || 'Clean completed', true);
  };

  const downloadWordDensity = (format: 'json' | 'csv') => {
    if (densities.length === 0) return;
    
    let content = '';
    let mime = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      content = JSON.stringify(densities, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      // CSV
      content = 'Word,Count,DensityPercentage\n' + 
        densities.map(d => `"${d.word.replace(/"/g, '""')}",${d.count},${d.percentage}%`).join('\n');
      mime = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils_word_density.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback(`Downloaded word density ${format.toUpperCase()}`);
  };

  const handleCopyExtracted = () => {
    if (extractedItems.length === 0) return;
    navigator.clipboard.writeText(extractedItems.join('\n'));
    showFeedback(`Copied ${extractedItems.length} items`);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[640px]">
      
      {/* LEFT COLUMN: Input and Controls */}
      <div className="flex flex-col bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
        
        {/* Editor Header panel */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171719] px-4 py-3 border-b border-[#2c2c2e]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-zinc-400 select-none tracking-wider">
              Raw Text Ingestion
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 rounded transition-all hover:bg-zinc-800"
            >
              Demo Text
            </button>
            <button
              onClick={handlePasteText}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 rounded transition-all hover:bg-zinc-800 flex items-center gap-1.5"
            >
              Paste <kbd className="hidden sm:inline font-mono bg-zinc-800 border border-zinc-700 px-1 py-0.2 rounded text-[9px] text-zinc-400">⌘ V</kbd>
            </button>
            {text && (
              <>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 rounded transition-all hover:bg-zinc-800"
                >
                  Copy All
                </button>
                <button
                  onClick={handleClearText}
                  className="px-2.5 py-1 bg-rose-950/20 border border-rose-900/40 hover:border-rose-800 text-xs font-mono text-rose-400 rounded transition-all hover:bg-rose-950/40"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Text Area pane */}
        <div className="relative flex-grow flex min-h-[350px]">
          {/* Custom overlays or views */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyUp={updateCursorPosition}
            onMouseUp={updateCursorPosition}
            placeholder="Type, paste, or load demo text to inspect content analytics in real-time..."
            className="w-full min-h-[350px] p-4 bg-transparent outline-none border-none text-zinc-100 font-mono text-sm leading-relaxed resize-none placeholder-zinc-650"
            spellCheck="true"
          />

          {/* Action Copy/Status Notification Bubble */}
          {copiedAction && (
            <div className="absolute top-4 right-4 bg-[#34d399] text-[#151515] font-mono text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-lg select-none pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
              {copiedAction}
            </div>
          )}
        </div>

        {/* Text Cleaner Bar */}
        <div className="border-t border-[#2c2c2e] bg-[#1a1a1c] px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                Quick Text Cleaners (One-Click)
              </span>
              {cleanFeedback && (
                <span className="text-[11px] font-mono text-[#34d399] font-medium animate-pulse">
                  {cleanFeedback}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleCleanText('trim')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Trim trailing whitespace and spaces on each line"
              >
                Trim Lines
              </button>
              <button
                onClick={() => handleCleanText('double-spaces')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Replace multiple spaces with a single space"
              >
                Flat Spaces
              </button>
              <button
                onClick={() => handleCleanText('empty-lines')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Remove empty rows completely"
              >
                Strip Empty Rows
              </button>
              <button
                onClick={() => handleCleanText('duplicates')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Keep only unique lines of text"
              >
                Deduplicate Lines
              </button>
              <button
                onClick={() => handleCleanText('html')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Remove all HTML tags like <div> etc."
              >
                Strip HTML Tags
              </button>
              <button
                onClick={() => handleCleanText('special')}
                disabled={!text}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                title="Remove punctuation and special characters, preserving alphanumeric text"
              >
                Strip Special Chars
              </button>
            </div>
          </div>
        </div>

        {/* Text Area Status Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#2c2c2e] bg-[#171719] text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>Size: {stats.sizeInBytes < 1024 ? `${stats.sizeInBytes} B` : `${(stats.sizeInBytes / 1024).toFixed(2)} KB`}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-350 select-none">
              <input
                type="checkbox"
                checked={showInvisibles}
                onChange={(e) => {
                  setShowInvisibles(e.target.checked);
                  // Highlight invisibles logic
                  if (e.target.checked) {
                    const mapped = text.replace(/ /g, '·').replace(/\n/g, '↵\n');
                    setText(mapped);
                    showFeedback('Showing invisibles (whitespace)', true);
                  } else {
                    const unmapped = text.replace(/·/g, ' ').replace(/↵\n/g, '\n');
                    setText(unmapped);
                  }
                }}
                className="rounded border-[#2c2c2e] text-[#34d399] focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer w-3.5 h-3.5"
              />
              <span>View Spaces</span>
            </label>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Analytics Workspace */}
      <div className="flex flex-col bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2c2c2e] bg-[#171719] select-none p-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'stats'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📋 Core Statistics
          </button>
          <button
            onClick={() => setActiveTab('readability')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'readability'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🎓 Readability Index
          </button>
          <button
            onClick={() => setActiveTab('density')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'density'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📊 Word Density
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'extract'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔍 Regex Extractor
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 flex-grow overflow-y-auto">
          
          {/* TAB 1: Core Statistics */}
          {activeTab === 'stats' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                
                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Words</div>
                  <div className="text-xl font-mono font-bold text-[#34d399] mt-0.5">{stats.wordCount}</div>
                </div>

                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Characters</div>
                  <div className="text-xl font-mono font-bold text-[#34d399] mt-0.5">{stats.charCountWithSpace}</div>
                  <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{stats.charCountNoSpace} no spaces</div>
                </div>

                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Sentences</div>
                  <div className="text-xl font-mono font-bold text-zinc-200 mt-0.5">{stats.sentenceCount}</div>
                </div>

                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Paragraphs</div>
                  <div className="text-xl font-mono font-bold text-zinc-200 mt-0.5">{stats.paragraphCount}</div>
                </div>

                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Lines / Rows</div>
                  <div className="text-xl font-mono font-bold text-zinc-200 mt-0.5">{stats.lineCount}</div>
                </div>

                <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 hover:border-zinc-800 transition-colors">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Unique Words</div>
                  <div className="text-xl font-mono font-bold text-zinc-200 mt-0.5">{stats.uniqueWords}</div>
                </div>

              </div>

              {/* Averages Section */}
              <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-4 flex flex-col gap-3">
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider">
                  Text Distribution Averages
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500">Avg. Word Length:</span>
                    <span className="text-zinc-300 font-bold">{stats.avgWordLength} characters</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500">Avg. Sentence Length:</span>
                    <span className="text-zinc-300 font-bold">{stats.avgSentenceLength} words</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500">Total Syllables:</span>
                    <span className="text-zinc-300 font-bold">{stats.totalSyllables} count</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500">Complex Words (3+ syl):</span>
                    <span className="text-zinc-300 font-bold">{stats.complexWordsCount} ({stats.wordCount > 0 ? Math.round((stats.complexWordsCount / stats.wordCount) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Reading & Speaking Estimates */}
              <div className="flex flex-col gap-4 bg-[#151515] border border-[#2c2c2e] rounded-lg p-4">
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-400 tracking-wider">
                  Chronological Estimates
                </h3>

                {/* Reading Timer */}
                <div className="flex flex-col gap-1.5 border-b border-[#2c2c2e]/60 pb-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      📖 Reading Time: <strong className="text-zinc-200 font-semibold">{timing.readDuration}</strong>
                    </span>
                    <span className="text-zinc-500 text-[10px]">{readingWpm} WPM</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="450"
                    step="10"
                    value={readingWpm}
                    onChange={(e) => setReadingWpm(parseInt(e.target.value))}
                    className="w-full accent-[#34d399] bg-[#2c2c2e] rounded-lg appearance-none h-1.5 cursor-ew-resize"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                    <span>100 (Slow)</span>
                    <span>200 (Average)</span>
                    <span>450 (Super Fast)</span>
                  </div>
                </div>

                {/* Speaking Timer */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      🗣️ Speaking Time: <strong className="text-zinc-200 font-semibold">{timing.speakDuration}</strong>
                    </span>
                    <span className="text-zinc-500 text-[10px]">{speakingWpm} WPM</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="260"
                    step="5"
                    value={speakingWpm}
                    onChange={(e) => setSpeakingWpm(parseInt(e.target.value))}
                    className="w-full accent-[#34d399] bg-[#2c2c2e] rounded-lg appearance-none h-1.5 cursor-ew-resize"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                    <span>80 (Slow)</span>
                    <span>130 (Average)</span>
                    <span>260 (Screaming)</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Readability Metrics */}
          {activeTab === 'readability' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              
              {/* Circular Gauge for Flesch Reading Ease */}
              <div className="bg-[#151515] border border-[#2c2c2e] rounded-xl p-4 flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-zinc-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#34d399]"
                      strokeWidth="3.5"
                      strokeDasharray={`${stats.flesch.score}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-mono font-bold text-zinc-100">{stats.flesch.score}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                    Flesch Reading Ease Score
                  </div>
                  <h4 className={`text-base font-bold font-mono ${stats.flesch.colorClass}`}>
                    {stats.flesch.label}
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Appropriate for: <strong className="text-zinc-200">{stats.flesch.schoolLevel}</strong>
                  </p>
                </div>
              </div>

              {/* ARI Index Display */}
              <div className="bg-[#151515] border border-[#2c2c2e] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#2c2c2e]/60 pb-2">
                  <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                    Automated Readability Index (ARI)
                  </div>
                  <span className="text-sm font-mono font-bold text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 px-2 py-0.5 rounded">
                    Score: {stats.ari.score}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Education Level:</span>
                    <strong className="text-zinc-200">{stats.ari.grade}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400 mt-1">
                    <span>Target Age range:</span>
                    <strong className="text-zinc-200">{stats.ari.age} years old</strong>
                  </div>
                </div>
              </div>

              {/* Gunning Fog Index */}
              <div className="bg-[#151515] border border-[#2c2c2e] rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500 tracking-wider">
                    Gunning Fog Index
                  </div>
                  <span className="text-sm font-mono font-bold text-[#34d399]">
                    Grade: {stats.gunningFog}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  The Gunning Fog Index estimates the years of formal education needed to understand the text on the first reading. A score of 12 represents high school senior level; a score of 16 is college graduate level.
                </p>
              </div>

              {/* Readability Explanation Box */}
              <div className="bg-zinc-900/60 border border-[#2c2c2e] rounded-lg p-3 text-[11px] text-zinc-500 leading-relaxed font-sans">
                💡 <strong>Readability index calibration</strong>: These indexes evaluate word structures and sentence ratios locally. Keep sentences concise (around 15-20 words) and minimize complex words to increase readability ease and lower the required school level scores.
              </div>

            </div>
          )}

          {/* TAB 3: Word Density */}
          {activeTab === 'density' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              
              {/* Density Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151515] border border-[#2c2c2e] p-3 rounded-lg">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterStopWords}
                    onChange={(e) => setFilterStopWords(e.target.checked)}
                    className="rounded border-[#2c2c2e] text-[#34d399] focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Ignore Common Words</span>
                </label>

                {densities.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500">Download:</span>
                    <button
                      onClick={() => downloadWordDensity('csv')}
                      className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono text-zinc-300 rounded"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => downloadWordDensity('json')}
                      className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono text-zinc-300 rounded"
                    >
                      JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Word filter search */}
              <input
                type="text"
                placeholder="Search word density database..."
                value={densitySearch}
                onChange={(e) => setDensitySearch(e.target.value)}
                className="w-full bg-[#151515] border border-[#2c2c2e] hover:border-zinc-700 focus:border-[#34d399] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 outline-none transition-all"
              />

              {/* Densities Grid / List */}
              {densities.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-[#2c2c2e] border-dashed rounded-lg bg-[#151515]/50">
                  {text ? 'No matches found for search filter' : 'No words detected to perform density mapping'}
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {densities.slice(0, 50).map((d, index) => (
                    <div
                      key={`${d.word}-${index}`}
                      className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-2.5 flex flex-col gap-1 hover:border-zinc-800 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-200 font-bold">{d.word}</span>
                        <span className="text-zinc-400">
                          {d.count} count <span className="text-zinc-500">({d.percentage}%)</span>
                        </span>
                      </div>
                      
                      {/* Density progress indicator line */}
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#34d399] h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, d.percentage * 5)}%` }} // scale width visually for better UI dynamics
                        />
                      </div>
                    </div>
                  ))}
                  {densities.length > 50 && (
                    <div className="text-center text-[10px] font-mono text-zinc-500 pt-1">
                      Showing top 50 rows. Download CSV to inspect complete dictionary database.
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: Pattern Extractor */}
          {activeTab === 'extract' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              
              {/* Selector */}
              <div className="flex border border-[#2c2c2e] bg-zinc-950 p-1 rounded-lg">
                {(['emails', 'urls', 'ips', 'numbers'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setExtractType(type)}
                    className={`flex-1 py-1.5 font-mono text-[10px] font-semibold rounded-md transition-all uppercase select-none ${
                      extractType === type
                        ? 'bg-[#1c1c1e] text-[#34d399] shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Extraction block */}
              {extractedItems.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-[#2c2c2e] border-dashed rounded-lg bg-[#151515]/50">
                  {text ? `No patterns of type ${extractType.toUpperCase()} found in text` : 'Paste text to run regex scan'}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">
                      Detected <strong className="text-zinc-200">{extractedItems.length}</strong> unique matches:
                    </span>
                    <button
                      onClick={handleCopyExtracted}
                      className="px-2 py-0.5 bg-[#34d399] hover:bg-emerald-400 text-zinc-950 font-semibold font-mono text-[10px] rounded transition-colors"
                    >
                      Copy All Matches
                    </button>
                  </div>
                  
                  <div className="bg-[#151515] border border-[#2c2c2e] rounded-lg p-3 font-mono text-xs text-zinc-300 max-h-[280px] overflow-y-auto flex flex-col gap-1.5">
                    {extractedItems.map((item, idx) => (
                      <div
                        key={`${item}-${idx}`}
                        className="flex items-center justify-between border-b border-[#2c2c2e]/40 pb-1.5 last:border-none last:pb-0 select-text"
                      >
                        <span className="truncate pr-4 text-[#34d399]">{item}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item);
                            showFeedback('Item copied!');
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors select-none font-mono"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Global Security sandboxed footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#2c2c2e] bg-[#171719] text-[10px] font-mono text-zinc-500 select-none">
          <span>🛡️ Client sandbox execution</span>
          <span>Processed locally in browser</span>
        </div>

      </div>

    </div>
  );
}
