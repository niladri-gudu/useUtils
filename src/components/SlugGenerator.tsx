import React, { useState, useEffect, useMemo } from 'react';
import { slugify, bulkSlugify, DEFAULT_SLUGIFY_OPTIONS } from '../utils-engine/slug';
import type { SlugifyOptions } from '../utils-engine/slug';

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

const SINGLE_SAMPLE = "🚀 10 Essential VS Code Extensions For React & TypeScript Developers (2026 Guide) 💻";
const BULK_SAMPLE = `React 19 Server Components: A Complete Deep Dive
How to set up Tailwind CSS v4 in Astro projects!
Understanding CSS Grid vs Flexbox layouts
Building a secure, sandboxed client-side JWT authorization
Top 5 REST API best practices with C# & .NET`;

// Tech-specific replacements that users can quickly initialize
const DEFAULT_TECH_REPLACEMENTS = [
  { pattern: 'c#', replacement: 'csharp' },
  { pattern: 'c++', replacement: 'cpp' },
  { pattern: '.net', replacement: 'dotnet' },
  { pattern: 'f#', replacement: 'fsharp' }
];

export const SlugGenerator: React.FC = () => {
  // --- Mode States ---
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  
  // --- Slugify Settings States ---
  const [separator, setSeparator] = useState<string>('-');
  const [lowercase, setLowercase] = useState<boolean>(true);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [stripSpecialCharacters, setStripSpecialCharacters] = useState<boolean>(true);
  const [stripStopWords, setStripStopWords] = useState<boolean>(false);
  const [transliterateAccents, setTransliterateAccents] = useState<boolean>(true);
  const [germanUmlauts, setGermanUmlauts] = useState<boolean>(true);
  const [cyrillicToLatin, setCyrillicToLatin] = useState<boolean>(true);
  const [maxLength, setMaxLength] = useState<number>(100);
  const [preserveWholeWords, setPreserveWholeWords] = useState<boolean>(true);
  const [suffixType, setSuffixType] = useState<SlugifyOptions['suffixType']>('none');
  const [suffixLength, setSuffixLength] = useState<number>(5);
  const [counterStart, setCounterStart] = useState<number>(1);
  const [customReplacements, setCustomReplacements] = useState<{ pattern: string; replacement: string }[]>(DEFAULT_TECH_REPLACEMENTS);

  // --- UI Aux States ---
  const [customPattern, setCustomPattern] = useState<string>('');
  const [customReplacement, setCustomReplacement] = useState<string>('');
  const [domainPrefix, setDomainPrefix] = useState<string>('https://useutils.com/blog/');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [bulkCopyFeedback, setBulkCopyFeedback] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('custom');

  // --- Suffix custom & stable states ---
  const [customSuffix, setCustomSuffix] = useState<string>('');
  const [stableSuffix, setStableSuffix] = useState<string>('');

  // --- Collapsible Panel States ---
  const [showNormalization, setShowNormalization] = useState<boolean>(true);
  const [showSuffixConfig, setShowSuffixConfig] = useState<boolean>(false);
  const [showReplacements, setShowReplacements] = useState<boolean>(false);

  // Generate stable random suffix helper
  const generateStableSuffix = (len: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStableSuffix(result);
  };

  // Generate stable random suffix when type changes or length is adjusted
  useEffect(() => {
    if (suffixType === 'nanoid') {
      generateStableSuffix(suffixLength);
    }
  }, [suffixType, suffixLength]);

  // Auto-fill samples when switching modes if input is empty
  useEffect(() => {
    if (!input) {
      setInput(bulkMode ? BULK_SAMPLE : SINGLE_SAMPLE);
    }
  }, [bulkMode]);

  // Handle Preset Conversions
  const handleApplyPreset = (presetName: string) => {
    setActivePreset(presetName);
    if (presetName === 'wordpress') {
      setSeparator('-');
      setLowercase(true);
      setUppercase(false);
      setStripSpecialCharacters(true);
      setStripStopWords(true);
      setTransliterateAccents(true);
      setGermanUmlauts(true);
      setCyrillicToLatin(true);
      setMaxLength(150);
      setPreserveWholeWords(true);
      setSuffixType('none');
    } else if (presetName === 'shopify') {
      setSeparator('-');
      setLowercase(true);
      setUppercase(false);
      setStripSpecialCharacters(true);
      setStripStopWords(false);
      setTransliterateAccents(true);
      setGermanUmlauts(false);
      setCyrillicToLatin(true);
      setMaxLength(70);
      setPreserveWholeWords(true);
      setSuffixType('none');
    } else if (presetName === 'database') {
      setSeparator('_');
      setLowercase(true);
      setUppercase(false);
      setStripSpecialCharacters(true);
      setStripStopWords(false);
      setTransliterateAccents(true);
      setGermanUmlauts(false);
      setCyrillicToLatin(true);
      setMaxLength(64);
      setPreserveWholeWords(false);
      setSuffixType('none');
    } else if (presetName === 'nextjs') {
      setSeparator('-');
      setLowercase(true);
      setUppercase(false);
      setStripSpecialCharacters(true);
      setStripStopWords(false);
      setTransliterateAccents(true);
      setGermanUmlauts(true);
      setCyrillicToLatin(true);
      setMaxLength(100);
      setPreserveWholeWords(true);
      setSuffixType('none');
    }
  };

  // Add Custom Replacement Rule
  const handleAddReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPattern.trim()) return;
    setCustomReplacements([
      ...customReplacements,
      { pattern: customPattern.trim(), replacement: customReplacement }
    ]);
    setCustomPattern('');
    setCustomReplacement('');
    setActivePreset('custom');
  };

  // Remove Custom Replacement Rule
  const handleRemoveReplacement = (index: number) => {
    setCustomReplacements(customReplacements.filter((_, i) => i !== index));
    setActivePreset('custom');
  };

  // Build Options Object
  const slugifyOptions = useMemo<Partial<SlugifyOptions>>(() => {
    return {
      separator,
      lowercase,
      uppercase,
      stripSpecialCharacters,
      stripStopWords,
      transliterateAccents,
      germanUmlauts,
      cyrillicToLatin,
      maxLength,
      preserveWholeWords,
      customReplacements,
      suffixType,
      suffixLength,
      counterValue: counterStart,
      customSuffix: suffixType === 'nanoid' ? stableSuffix : suffixType === 'custom' ? customSuffix : ''
    };
  }, [
    separator,
    lowercase,
    uppercase,
    stripSpecialCharacters,
    stripStopWords,
    transliterateAccents,
    germanUmlauts,
    cyrillicToLatin,
    maxLength,
    preserveWholeWords,
    customReplacements,
    suffixType,
    suffixLength,
    counterStart,
    stableSuffix,
    customSuffix
  ]);

  // Compute Converted Slugs (runs even on empty input, which will return the suffix if one is active)
  const singleSlugOutput = useMemo(() => {
    if (bulkMode) return '';
    return slugify(input, slugifyOptions);
  }, [input, bulkMode, slugifyOptions]);

  const bulkSlugsOutput = useMemo(() => {
    if (!bulkMode || !input) return [];
    const lines = input.split('\n').filter(line => line.trim() !== '');
    const results = bulkSlugify(lines, slugifyOptions);
    return lines.map((original, idx) => ({
      original,
      slug: results[idx] || ''
    }));
  }, [input, bulkMode, slugifyOptions]);

  // --- Real-time Stats & Warnings ---
  const stats = useMemo(() => {
    const originalChars = input.length;
    let charactersStripped = 0;
    let cleanChars = 0;

    if (!bulkMode) {
      cleanChars = singleSlugOutput.length;
      const nonAlphanumeric = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
      charactersStripped = nonAlphanumeric;
    } else if (bulkMode && bulkSlugsOutput.length > 0) {
      cleanChars = bulkSlugsOutput.reduce((acc, curr) => acc + curr.slug.length, 0);
      const nonAlphanumeric = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
      charactersStripped = nonAlphanumeric;
    }

    const isTooLong = !bulkMode && cleanChars > 75; // SEO recommended length

    return {
      originalChars,
      cleanChars,
      charactersStripped,
      isTooLong
    };
  }, [input, bulkMode, singleSlugOutput, bulkSlugsOutput]);

  // Copy Single output
  const handleCopySingle = () => {
    if (!singleSlugOutput) return;
    const success = copyToClipboard(singleSlugOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  // Copy Full Mock URL
  const handleCopyFullUrl = () => {
    const fullUrl = `${domainPrefix}${singleSlugOutput}`;
    const success = copyToClipboard(fullUrl);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  // Copy Bulk Output (as newline-separated list)
  const handleCopyBulkList = () => {
    if (bulkSlugsOutput.length === 0) return;
    const textList = bulkSlugsOutput.map(item => item.slug).join('\n');
    const success = copyToClipboard(textList);
    if (success) {
      setBulkCopyFeedback(true);
      setTimeout(() => setBulkCopyFeedback(false), 1500);
    }
  };

  // Download Bulk Slugs as JSON file
  const handleDownloadJSON = () => {
    if (bulkSlugsOutput.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bulkSlugsOutput, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'useutils_slugs.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download Bulk Slugs as CSV file
  const handleDownloadCSV = () => {
    if (bulkSlugsOutput.length === 0) return;
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const headers = 'Original,Slug\n';
    const rows = bulkSlugsOutput.map(item => `${escapeCsv(item.original)},${escapeCsv(item.slug)}`).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', 'useutils_slugs.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Top Banner Settings Options / Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-panel border border-border-hairline rounded-lg p-4 font-mono">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Configuration Presets</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button
              onClick={() => handleApplyPreset('wordpress')}
              className={`px-2.5 py-1 text-[11px] rounded transition-all cursor-pointer ${
                activePreset === 'wordpress'
                  ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-semibold'
                  : 'bg-zinc-900 border border-border-hairline text-zinc-400 hover:text-zinc-200'
              }`}
            >
              WordPress Slug
            </button>
            <button
              onClick={() => handleApplyPreset('shopify')}
              className={`px-2.5 py-1 text-[11px] rounded transition-all cursor-pointer ${
                activePreset === 'shopify'
                  ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-semibold'
                  : 'bg-zinc-900 border border-border-hairline text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shopify URL
            </button>
            <button
              onClick={() => handleApplyPreset('nextjs')}
              className={`px-2.5 py-1 text-[11px] rounded transition-all cursor-pointer ${
                activePreset === 'nextjs'
                  ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-semibold'
                  : 'bg-zinc-900 border border-border-hairline text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Next.js Router
            </button>
            <button
              onClick={() => handleApplyPreset('database')}
              className={`px-2.5 py-1 text-[11px] rounded transition-all cursor-pointer ${
                activePreset === 'database'
                  ? 'bg-accent-emerald/20 border border-accent-emerald/40 text-accent-emerald font-semibold'
                  : 'bg-zinc-900 border border-border-hairline text-zinc-400 hover:text-zinc-200'
              }`}
            >
              DB Identifier
            </button>
            <button
              onClick={() => {
                setActivePreset('custom');
              }}
              className={`px-2.5 py-1 text-[11px] rounded border transition-all cursor-pointer ${
                activePreset === 'custom'
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 font-semibold'
                  : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-450'
              }`}
            >
              Custom Settings
            </button>
          </div>
        </div>

        {/* View Toggle (Single vs Bulk) */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-border-hairline/65 p-1 rounded-lg self-start md:self-center">
          <button
            onClick={() => setBulkMode(false)}
            className={`px-3 py-1 rounded text-xs select-none transition-colors duration-100 cursor-pointer ${
              !bulkMode
                ? 'bg-panel text-accent-emerald font-semibold shadow-sm border border-border-hairline'
                : 'text-zinc-400 hover:text-zinc-250'
            }`}
          >
            Single Text
          </button>
          <button
            onClick={() => setBulkMode(true)}
            className={`px-3 py-1 rounded text-xs select-none transition-colors duration-100 cursor-pointer ${
              bulkMode
                ? 'bg-panel text-accent-emerald font-semibold shadow-sm border border-border-hairline'
                : 'text-zinc-400 hover:text-zinc-250'
            }`}
          >
            Bulk Mode ({bulkSlugsOutput.length || 0})
          </button>
        </div>
      </div>

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ==================================================== */}
        {/* LEFT COLUMN: Inputs & Options Controls               */}
        {/* ==================================================== */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col font-mono">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                {bulkMode ? 'Raw Multiline Text' : 'Raw Input Text'}
              </h2>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                {stats.originalChars} original chars • {stats.charactersStripped} special chars stripped
              </span>
            </div>
            
            <div className="flex gap-2 font-mono">
              <button
                type="button"
                onClick={() => setInput(bulkMode ? BULK_SAMPLE : SINGLE_SAMPLE)}
                className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700/60 cursor-pointer transition-colors"
              >
                Insert Sample
              </button>
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="px-2 py-0.5 text-[10px] bg-red-950/40 hover:bg-red-950/80 text-red-400 rounded border border-red-900/60 cursor-pointer transition-colors"
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
              onChange={(e) => {
                setInput(e.target.value);
                if (activePreset !== 'custom') setActivePreset('custom');
              }}
              placeholder={
                bulkMode
                  ? "Enter titles/phrases, one per line, to batch generate slugs..."
                  : "Type or paste blog post title, directory structure, or text string to convert..."
              }
              rows={bulkMode ? 8 : 6}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
            />
            {!input && (
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
          </div>

          {/* Configuration Grid Panel */}
          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4 font-mono">
            
            {/* Basic Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Separator Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Separator Character</label>
                <div className="relative">
                  <select
                    value={separator}
                    onChange={(e) => {
                      setSeparator(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none cursor-pointer appearance-none"
                  >
                    <option value="-">Dash ( - )</option>
                    <option value="_">Underscore ( _ )</option>
                    <option value=".">Dot ( . )</option>
                    <option value="/">Slash ( / )</option>
                    <option value=" ">Space (   )</option>
                    <option value="">None (Squished)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Case Format Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Casing Mode</label>
                <div className="relative">
                  <select
                    value={lowercase ? 'lower' : uppercase ? 'upper' : 'original'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'lower') {
                        setLowercase(true);
                        setUppercase(false);
                      } else if (value === 'upper') {
                        setLowercase(false);
                        setUppercase(true);
                      } else {
                        setLowercase(false);
                        setUppercase(false);
                      }
                      setActivePreset('custom');
                    }}
                    className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none cursor-pointer appearance-none"
                  >
                    <option value="lower">lowercase (Recommended)</option>
                    <option value="upper">UPPERCASE</option>
                    <option value="original">Preserve Case</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

            </div>

            {/* Slider: Max Length */}
            <div className="flex flex-col gap-2 bg-zinc-900/40 border border-border-hairline p-3 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-450">Maximum Character Length</span>
                <span className="text-accent-emerald font-semibold">{maxLength} chars</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={maxLength}
                onChange={(e) => {
                  setMaxLength(Number(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-accent-emerald bg-canvas h-1 rounded cursor-pointer mt-1"
              />
              <label className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveWholeWords}
                  onChange={(e) => {
                    setPreserveWholeWords(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded border-zinc-800 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer accent-accent-emerald"
                />
                Truncate cleanly on whole word boundaries (prevent cut-off words)
              </label>
            </div>

            {/* Collapsible Section 1: Character Normalization & Filtering */}
            <div className="border border-border-hairline rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowNormalization(!showNormalization)}
                className="w-full bg-zinc-900 px-3 py-2.5 flex justify-between items-center text-xs text-zinc-300 font-semibold cursor-pointer border-none"
              >
                <span>🌐 Character Normalization & Rules</span>
                <span>{showNormalization ? '▲' : '▼'}</span>
              </button>
              
              {showNormalization && (
                <div className="p-3 bg-panel border-t border-border-hairline/60 flex flex-col gap-3">
                  
                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripSpecialCharacters}
                      onChange={(e) => {
                        setStripSpecialCharacters(e.target.checked);
                        setActivePreset('custom');
                      }}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Strip Special Characters (Remove punctuation, symbols, brackets)
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripStopWords}
                      onChange={(e) => {
                        setStripStopWords(e.target.checked);
                        setActivePreset('custom');
                      }}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Strip SEO Stop Words (a, an, the, and, or, in, at, to, with, etc.)
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transliterateAccents}
                      onChange={(e) => {
                        setTransliterateAccents(e.target.checked);
                        setActivePreset('custom');
                      }}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Normalize Accented Characters (é → e, ü → u, ñ → n)
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={germanUmlauts}
                      onChange={(e) => {
                        setGermanUmlauts(e.target.checked);
                        setActivePreset('custom');
                      }}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    German Umlauts Transliteration (ä → ae, ö → oe, ü → ue, ß → ss)
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cyrillicToLatin}
                      onChange={(e) => {
                        setCyrillicToLatin(e.target.checked);
                        setActivePreset('custom');
                      }}
                      className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                    />
                    Cyrillic to Latin Transliteration (привет → privet)
                  </label>

                </div>
              )}
            </div>

            {/* Collapsible Section 2: Unique Suffix Appending */}
            <div className="border border-border-hairline rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSuffixConfig(!showSuffixConfig)}
                className="w-full bg-zinc-900 px-3 py-2.5 flex justify-between items-center text-xs text-zinc-300 font-semibold cursor-pointer border-none"
              >
                <span>🔑 Unique Suffix Controls</span>
                <span>{showSuffixConfig ? '▲' : '▼'}</span>
              </button>

              {showSuffixConfig && (
                <div className="p-3 bg-panel border-t border-border-hairline/60 flex flex-col gap-4">
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-zinc-400">Append Unique Component</span>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'nanoid', label: 'Short ID' },
                        { id: 'counter', label: 'Counter' },
                        { id: 'timestamp', label: 'Epoch' },
                        { id: 'custom', label: 'Custom' }
                      ].map(btn => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            setSuffixType(btn.id as SlugifyOptions['suffixType']);
                            setActivePreset('custom');
                          }}
                          className={`px-2 py-1 text-xs border rounded transition-colors cursor-pointer ${
                            suffixType === btn.id
                              ? 'bg-zinc-800 border-zinc-750 text-accent-emerald font-semibold'
                              : 'bg-canvas border-border-hairline text-zinc-450 hover:text-zinc-300'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {suffixType === 'nanoid' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="text-[11px] text-zinc-400">Random Suffix Length</label>
                          <span className="text-zinc-300 font-semibold">{suffixLength} chars</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="12"
                          value={suffixLength}
                          onChange={(e) => setSuffixLength(Number(e.target.value))}
                          className="w-full accent-accent-emerald bg-canvas h-1 rounded cursor-pointer"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 flex-grow">
                          <label className="text-[11px] text-zinc-450">Active Random Suffix</label>
                          <input
                            type="text"
                            value={stableSuffix}
                            onChange={(e) => setStableSuffix(e.target.value)}
                            className="bg-canvas border border-border-hairline focus:border-zinc-700 rounded py-1.5 px-3 text-xs text-zinc-300 outline-none w-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => generateStableSuffix(suffixLength)}
                          className="mt-5 p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700 cursor-pointer text-xs"
                          title="Generate new random suffix"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                  )}

                  {suffixType === 'custom' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-zinc-450">Custom Suffix Value</label>
                      <input
                        type="text"
                        placeholder="e.g. draft, v2, release"
                        value={customSuffix}
                        onChange={(e) => setCustomSuffix(e.target.value)}
                        className="bg-canvas border border-border-hairline focus:border-zinc-700 rounded py-1.5 px-3 text-xs text-zinc-300 outline-none w-full"
                      />
                    </div>
                  )}

                  {suffixType === 'counter' && (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1 flex-grow">
                        <label className="text-[11px] text-zinc-400">Counter Starting Value</label>
                        <input
                          type="number"
                          min="0"
                          value={counterStart}
                          onChange={(e) => setCounterStart(Math.max(0, parseInt(e.target.value) || 1))}
                          className="bg-canvas border border-border-hairline focus:border-zinc-700 rounded py-1.5 px-3 text-xs text-zinc-300 outline-none w-full"
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500 leading-tight max-w-[180px] mt-4">
                        Increments sequentially for each processed line in bulk mode.
                      </div>
                    </div>
                  )}

                  {suffixType === 'timestamp' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-zinc-455">Epoch Timestamp Preview</label>
                      <input
                        type="text"
                        readOnly
                        value={Math.floor(Date.now() / 1000)}
                        className="bg-canvas border border-border-hairline opacity-70 rounded py-1.5 px-3 text-xs text-zinc-455 outline-none w-full cursor-not-allowed select-none font-mono"
                      />
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Appends the live Unix timestamp (in seconds) dynamically.
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Collapsible Section 3: Custom Word replacements */}
            <div className="border border-border-hairline rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReplacements(!showReplacements)}
                className="w-full bg-zinc-900 px-3 py-2.5 flex justify-between items-center text-xs text-zinc-300 font-semibold cursor-pointer border-none"
              >
                <span>🔀 Custom Search-and-Replace Rules ({customReplacements.length})</span>
                <span>{showReplacements ? '▲' : '▼'}</span>
              </button>

              {showReplacements && (
                <div className="p-3 bg-panel border-t border-border-hairline/60 flex flex-col gap-3">
                  
                  {/* Inline Rules Form */}
                  <form onSubmit={handleAddReplacement} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Find pattern (e.g. c#)"
                      value={customPattern}
                      onChange={(e) => setCustomPattern(e.target.value)}
                      className="bg-canvas border border-border-hairline focus:border-zinc-700 rounded py-1.5 px-3 text-xs text-zinc-350 outline-none flex-grow placeholder:text-zinc-600"
                    />
                    <span className="text-zinc-600 text-xs">→</span>
                    <input
                      type="text"
                      placeholder="Replace with (e.g. csharp)"
                      value={customReplacement}
                      onChange={(e) => setCustomReplacement(e.target.value)}
                      className="bg-canvas border border-border-hairline focus:border-zinc-700 rounded py-1.5 px-3 text-xs text-zinc-350 outline-none flex-grow placeholder:text-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={!customPattern.trim()}
                      className="px-3 py-1.5 bg-accent-emerald/15 hover:bg-accent-emerald/25 border border-accent-emerald/20 text-accent-emerald text-xs rounded font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Add
                    </button>
                  </form>

                  {/* List of rules */}
                  {customReplacements.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1 border-t border-border-hairline/45 pt-3">
                      {customReplacements.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-zinc-900 border border-border-hairline rounded px-2.5 py-1 text-xs text-zinc-300"
                        >
                          <span className="font-semibold text-zinc-400">{rule.pattern}</span>
                          <span className="text-zinc-600 text-[10px]">→</span>
                          <span className="text-accent-emerald">{rule.replacement || '""'}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReplacement(idx)}
                            className="ml-1.5 text-zinc-500 hover:text-red-400 font-bold outline-none cursor-pointer border-none text-[10px] bg-transparent"
                            title="Delete rule"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-650 text-center py-2">
                      No custom search-and-replace mappings registered.
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: Interactive Live Outputs               */}
        {/* ==================================================== */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5 items-stretch min-h-[500px]">
          
          {/* Output Header */}
          <div className="flex justify-between items-center font-mono">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Slugify Output
            </h2>

            <div className="flex gap-2">
              {!bulkMode ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopySingle}
                    disabled={!singleSlugOutput}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-semibold disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {copyFeedback ? 'Copied ✓' : 'Copy Slug'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    disabled={bulkSlugsOutput.length === 0}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    disabled={bulkSlugsOutput.length === 0}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBulkList}
                    disabled={bulkSlugsOutput.length === 0}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-semibold disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {bulkCopyFeedback ? 'Copied ✓' : 'Copy List'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SINGLE MODE OUTPUT STACKS */}
          {!bulkMode ? (
            <div className="flex flex-col gap-4 flex-grow">
              
              {/* Mock Address Bar Router Preview */}
              <div className="bg-zinc-950 border border-border-hairline rounded-lg p-3.5 flex flex-col gap-2.5">
                
                {/* Address Bar */}
                <div className="flex items-center gap-2 bg-panel border border-border-hairline rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-500/70"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500/70"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500/70"></span>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto font-mono text-xs w-full select-all px-1 scrollbar-hide">
                    <span className="text-zinc-600 shrink-0 select-none">🌐</span>
                    <input
                      type="text"
                      value={domainPrefix}
                      onChange={(e) => setDomainPrefix(e.target.value)}
                      className="bg-transparent border-none outline-none text-zinc-500 w-44 shrink-0 font-mono text-xs focus:ring-0 p-0"
                      title="Edit domain preview prefix"
                    />
                    <span className="text-accent-emerald font-semibold break-all">
                      {singleSlugOutput || 'enter-text-to-preview'}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyFullUrl}
                    disabled={!singleSlugOutput}
                    className="shrink-0 text-zinc-500 hover:text-accent-emerald transition-colors text-xs cursor-pointer border-none bg-transparent"
                    title="Copy full Mock URL"
                  >
                    🔗
                  </button>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between px-1">
                  <span>URL Preview (Click the input domain prefix above to edit it)</span>
                  <span className="text-[9px] uppercase tracking-wider bg-zinc-900 px-1 py-0.5 rounded border border-border-hairline/40">
                    SEO friendly
                  </span>
                </div>
              </div>

              {/* Large Output Box */}
              <div className="flex-grow flex flex-col bg-canvas border border-border-hairline rounded-lg p-3.5 relative min-h-[160px]">
                <textarea
                  value={singleSlugOutput}
                  readOnly
                  placeholder="Sanitized URL slug will print here dynamically..."
                  className="w-full h-full bg-transparent font-mono text-xs md:text-sm text-zinc-300 resize-none outline-none leading-relaxed select-all"
                />
                
                {singleSlugOutput && (
                  <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 pointer-events-none select-none">
                    <kbd className="font-mono bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
                  </div>
                )}
              </div>

              {/* Stats & SEO Checklist Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 font-mono">
                
                <div className="p-3 bg-zinc-900 border border-border-hairline rounded-lg flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-550 uppercase">Slug Length</span>
                    <span className={`text-xs font-semibold ${stats.isTooLong ? 'text-yellow-500' : 'text-accent-emerald'}`}>
                      {stats.cleanChars} characters
                    </span>
                  </div>
                  <div className="text-right">
                    {stats.isTooLong ? (
                      <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                        ℹ Long (SEO limit ~75)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-accent-emerald px-1.5 py-0.5 rounded">
                        ✓ Optimal Length
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 border border-border-hairline rounded-lg flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-550 uppercase">Compression Ratio</span>
                    <span className="text-xs text-zinc-300 font-semibold">
                      {stats.originalChars > 0
                        ? `${Math.round(((stats.originalChars - stats.cleanChars) / stats.originalChars) * 100)}% shorter`
                        : '0% shorter'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-right">
                    Spaces & markup stripped
                  </div>
                </div>

              </div>

            </div>
          ) : (
            
            // BULK MODE OUTPUT GRID
            <div className="flex flex-col gap-3 flex-grow justify-between">
              
              {/* Spreadsheet-like Table Grid */}
              <div className="border border-border-hairline rounded-lg overflow-hidden flex-grow bg-canvas overflow-y-auto max-h-[360px] min-h-[250px]">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-border-hairline text-zinc-400 select-none">
                      <th className="p-2.5 font-medium w-12 text-center border-r border-border-hairline">#</th>
                      <th className="p-2.5 font-medium w-1/2 border-r border-border-hairline">Original Text</th>
                      <th className="p-2.5 font-medium w-1/2">Generated Slug</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline/60 text-zinc-300">
                    {bulkSlugsOutput.length > 0 ? (
                      bulkSlugsOutput.map((item, index) => (
                        <tr key={index} className="hover:bg-zinc-900/40 group">
                          
                          <td className="p-2.5 text-center text-zinc-500 border-r border-border-hairline">
                            {index + 1}
                          </td>

                          <td className="p-2.5 border-r border-border-hairline max-w-[200px] truncate" title={item.original}>
                            {item.original}
                          </td>

                          <td className="p-2.5 text-accent-emerald flex justify-between items-center gap-2">
                            <span className="truncate" title={item.slug}>{item.slug || '—'}</span>
                            {item.slug && (
                              <button
                                onClick={() => copyToClipboard(item.slug)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded cursor-pointer border border-zinc-700/60"
                                title="Copy row slug"
                              >
                                Copy
                              </button>
                            )}
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-zinc-600">
                          Empty input. Paste multiline text on the left pane.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3 text-[11px] text-zinc-555 leading-relaxed font-mono flex flex-col gap-1 mt-2">
                <div className="text-zinc-450 font-semibold">Bulk Mode Tips:</div>
                <div>• Downloads as CSV will import cleanly into Microsoft Excel, Google Sheets, or PostgreSQL.</div>
                <div>• Double separators, leading symbols, and empty rows are automatically pruned line-by-line.</div>
              </div>

            </div>
          )}

          {/* Privacy Guarantee Status Badge */}
          <div className="inline-flex items-center gap-2 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="flex h-1.5 w-1.5 relative shrink-0">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-emerald"></span>
            </span>
            <span>Processed locally in browser. Zero server transmission.</span>
          </div>

        </div>

      </div>

    </div>
  );
};
