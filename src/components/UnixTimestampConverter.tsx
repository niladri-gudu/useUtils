import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  parseTimestamp,
  parseHumanDate,
  addTimeOffset,
  scanLogsForTimestamps,
  formatDateAll,
  generateCodeSnippets,
  type ScannedTimestamp,
  type CodeSnippet
} from '../utils-engine/timestamp';

// Helper to copy text to clipboard
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

const COMMON_TIMEZONES = [
  { label: 'UTC (GMT)', value: 'UTC' },
  { label: 'Local (Browser)', value: 'LOCAL' },
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' }
];

export const UnixTimestampConverter: React.FC = () => {
  // Tabs: Single Converter vs Log Scanner
  const [activeTab, setActiveTab] = useState<'single' | 'scanner'>('single');

  // Timezone setting
  const [timezone, setTimezone] = useState<string>('LOCAL');
  
  // Resolve timezone string
  const resolvedTimezone = useMemo(() => {
    if (timezone === 'LOCAL') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch {
        return 'UTC';
      }
    }
    return timezone;
  }, [timezone]);

  // ==========================================
  // Single Converter State
  // ==========================================
  const [inputVal, setInputVal] = useState<string>('');
  const [inputUnit, setInputUnit] = useState<'s' | 'ms' | 'us' | 'ns'>('s');
  
  // Natural language state
  const [naturalVal, setNaturalVal] = useState<string>('');

  // Ticking Clock State
  const [isTicking, setIsTicking] = useState<boolean>(true);
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));

  // Offset calculator state
  const [mathValue, setMathValue] = useState<number>(1);
  const [mathUnit, setMathUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'>('days');

  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});

  // ==========================================
  // Log Scanner State
  // ==========================================
  const [logText, setLogText] = useState<string>('');
  const [scannerLogs, setScannerLogs] = useState<ScannedTimestamp[]>([]);

  // Selected language snippet index
  const [activeSnippetLang, setActiveSnippetLang] = useState<string>('javascript');

  // Trigger copy toast
  const triggerCopyFeedback = (key: string) => {
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  // Keep ticking clock running
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isTicking) {
      timer = setInterval(() => {
        const nowSec = Math.floor(Date.now() / 1000);
        setCurrentEpoch(nowSec);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTicking]);

  // Sync input val with ticking clock initially or when ticking is active
  useEffect(() => {
    if (isTicking) {
      setInputVal(currentEpoch.toString());
      setInputUnit('s');
    }
  }, [currentEpoch, isTicking]);

  // Handle manual typing of timestamp
  const handleTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTicking(false); // Stop clock if typing manually
    setInputVal(e.target.value);
  };

  // Convert raw inputs to standard Date
  const parsedDate = useMemo(() => {
    if (!inputVal) return null;
    return parseTimestamp(inputVal, inputUnit);
  }, [inputVal, inputUnit]);

  // Dynamic formatting results
  const formattedResults = useMemo(() => {
    if (!parsedDate) return null;
    return formatDateAll(parsedDate, resolvedTimezone);
  }, [parsedDate, resolvedTimezone]);

  // Code snippets generator
  const activeSnippets = useMemo(() => {
    const epochSec = parsedDate ? Math.floor(parsedDate.getTime() / 1000) : currentEpoch;
    return generateCodeSnippets(epochSec);
  }, [parsedDate, currentEpoch]);

  const activeSnippet = useMemo(() => {
    return activeSnippets.find(s => s.lang === activeSnippetLang) || activeSnippets[0];
  }, [activeSnippets, activeSnippetLang]);

  // Dynamic tick date formatting based on selected timezone
  const tickingClockDateStr = useMemo(() => {
    const d = new Date(currentEpoch * 1000);
    try {
      return d.toLocaleString('en-US', { 
        timeZone: resolvedTimezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
    } catch {
      return d.toLocaleString();
    }
  }, [currentEpoch, resolvedTimezone]);

  // ==========================================
  // Natural Language Date Submitter
  // ==========================================
  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalVal.trim()) return;
    
    const parsed = parseHumanDate(naturalVal);
    if (parsed) {
      setIsTicking(false);
      
      let finalVal = 0;
      if (inputUnit === 's') finalVal = Math.floor(parsed.getTime() / 1000);
      else if (inputUnit === 'ms') finalVal = parsed.getTime();
      else if (inputUnit === 'us') finalVal = parsed.getTime() * 1000;
      else if (inputUnit === 'ns') finalVal = parsed.getTime() * 1000000;

      setInputVal(finalVal.toString());
      triggerCopyFeedback('natural-parse-success');
    } else {
      triggerCopyFeedback('natural-parse-error');
    }
  };

  // Apply math offset
  const handleApplyMath = (operator: 'add' | 'subtract') => {
    if (!parsedDate) return;
    setIsTicking(false);
    const multiplier = operator === 'add' ? 1 : -1;
    const adjusted = addTimeOffset(parsedDate, mathValue * multiplier, mathUnit);
    
    let finalVal = 0;
    if (inputUnit === 's') finalVal = Math.floor(adjusted.getTime() / 1000);
    else if (inputUnit === 'ms') finalVal = adjusted.getTime();
    else if (inputUnit === 'us') finalVal = adjusted.getTime() * 1000;
    else if (inputUnit === 'ns') finalVal = adjusted.getTime() * 1000000;

    setInputVal(finalVal.toString());
  };

  // ==========================================
  // Slider / Time Scrubber Logic
  // ==========================================
  // Let range span from Unix Start (1970) to 2040.
  const sliderMin = 0;
  const sliderMax = 2208988800; // Jan 01 2040

  const currentSecondsValue = useMemo(() => {
    if (!parsedDate) return Math.floor(Date.now() / 1000);
    return Math.floor(parsedDate.getTime() / 1000);
  }, [parsedDate]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTicking(false);
    const secs = parseInt(e.target.value, 10);
    
    let finalVal = 0;
    if (inputUnit === 's') finalVal = secs;
    else if (inputUnit === 'ms') finalVal = secs * 1000;
    else if (inputUnit === 'us') finalVal = secs * 1000000;
    else if (inputUnit === 'ns') finalVal = secs * 1000000000;

    setInputVal(finalVal.toString());
  };

  // ==========================================
  // Year 2038 Threat Assessment
  // ==========================================
  const threatLevel = useMemo(() => {
    if (!parsedDate) return 'safe';
    const seconds = Math.floor(parsedDate.getTime() / 1000);
    const LIMIT_32BIT = 2147483647;
    
    if (seconds > LIMIT_32BIT) {
      return 'overflow';
    } else if (seconds > 2140000000) {
      return 'critical';
    }
    return 'safe';
  }, [parsedDate]);

  // ==========================================
  // Log Scanner Scanner Logic
  // ==========================================
  useEffect(() => {
    if (activeTab === 'scanner') {
      const results = scanLogsForTimestamps(logText);
      setScannerLogs(results);
    }
  }, [logText, activeTab]);

  const handleLoadSampleLogs = () => {
    const sample = `[2026-06-14 11:53:06] INFO  Starting useUtils index processing thread...
[2026-06-14 11:53:07] DEBUG Found task reference: 1781440000. Parsing node properties.
[2026-06-14 11:53:08] ERROR Connection timed out at epoch 1718365200000. Re-attempting connection.
[2026-06-14 11:53:09] WARN  Scheduler warning: limit exceeded. Next schedule set for 2147483650.
[2026-06-14 11:53:10] INFO  Processed batch in browser sandboxed script.`;
    setLogText(sample);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Subnavigation Bar & Timezone selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-hairline/60 pb-4">
        <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
              activeTab === 'single'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            ⏱️ Date & Epoch Converter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 ${
              activeTab === 'scanner'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            🔍 Log Timestamp Scanner
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Timezone:</span>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="bg-panel border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-zinc-700 cursor-pointer"
          >
            {COMMON_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tab Rendering */}
      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: CONTROLS & TIMELINE (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
            
            {/* Realtime Ticking Clock Ticker */}
            <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isTicking ? 'bg-accent-emerald animate-pulse' : 'bg-zinc-650'}`}></span>
                  Current Epoch Time
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTicking(prev => !prev);
                      if (!isTicking) {
                        setCurrentEpoch(Math.floor(Date.now() / 1000));
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                      isTicking 
                        ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-400 border-zinc-750' 
                        : 'bg-accent-emerald/15 hover:bg-accent-emerald/25 text-accent-emerald border-accent-emerald/20'
                    }`}
                  >
                    {isTicking ? 'Freeze' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTicking(false);
                      setInputVal(Math.floor(Date.now() / 1000).toString());
                      setInputUnit('s');
                    }}
                    className="px-2 py-0.5 rounded text-[9px] font-mono border bg-zinc-850 hover:bg-zinc-800 text-zinc-350 border-zinc-750"
                  >
                    Insert Now
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold font-mono text-zinc-50 select-all">
                    {currentEpoch}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = copyToClipboard(currentEpoch.toString());
                      if (ok) triggerCopyFeedback('clock');
                    }}
                    className="text-xs font-mono text-accent-emerald hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    {copyFeedback['clock'] ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {tickingClockDateStr}
                </span>
              </div>
            </div>

            {/* Input Timestamp Section */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Unix Timestamp / Epoch Time
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste or type timestamp..."
                  value={inputVal}
                  onChange={handleTimestampChange}
                  className="w-full bg-canvas border border-border-hairline hover:border-zinc-700 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-lg py-2.5 pl-3 pr-28 text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {inputVal && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputVal('');
                        setIsTicking(false);
                      }}
                      className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-1 rounded bg-zinc-900/60"
                    >
                      Clear
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[9px] text-zinc-500">⌘ V</kbd>
                </div>
              </div>

              {/* Units Picker */}
              <div className="flex gap-1 bg-zinc-900/40 p-1 border border-border-hairline/80 rounded-lg mt-1">
                {[
                  { id: 's', label: 'Seconds (10d)' },
                  { id: 'ms', label: 'Millis (13d)' },
                  { id: 'us', label: 'Micros (16d)' },
                  { id: 'ns', label: 'Nanos (19d)' }
                ].map(unit => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setIsTicking(false);
                      setInputUnit(unit.id as any);
                    }}
                    className={`flex-1 px-1 py-1.5 rounded text-[10px] font-mono text-center select-none cursor-pointer border transition-all ${
                      inputUnit === unit.id
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Timeline Scrubber Slider */}
            <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Visual Scrubber</span>
                <span className="text-zinc-400 font-mono">
                  {parsedDate ? parsedDate.getFullYear() : 'N/A'}
                </span>
              </div>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={currentSecondsValue}
                onChange={handleSliderChange}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
              <div className="flex flex-col gap-0.5 text-center mt-0.5">
                <span className="text-[10px] text-accent-emerald font-mono font-semibold">
                  Scrubbed: {formattedResults ? formattedResults.local : 'N/A'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">
                  Drag slider to scrub between year 1970 and 2040
                </span>
              </div>
            </div>

            {/* Natural Language Date Parser */}
            <form onSubmit={handleNaturalSubmit} className="border-t border-border-hairline/60 pt-4 flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Parse Human / Relative Date
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 5 days ago, tomorrow, next week..."
                  value={naturalVal}
                  onChange={(e) => setNaturalVal(e.target.value)}
                  className="flex-grow bg-canvas border border-border-hairline hover:border-zinc-700 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-lg py-2 px-3 text-xs font-mono text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  className="bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 font-mono text-xs px-3.5 rounded-lg font-semibold transition-all cursor-pointer shadow-sm"
                >
                  Parse
                </button>
              </div>

              {/* Sample Tags */}
              <div className="flex flex-wrap gap-1.5 items-center mt-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Presets:</span>
                {['now', 'yesterday', 'tomorrow', '3 days ago', 'in 6 hours', '2026-06-14T12:00:00Z'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNaturalVal(tag)}
                    className="text-[9px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded border border-border-hairline/60"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Parse Feedback Alerts */}
              {copyFeedback['natural-parse-success'] && (
                <span className="text-[10px] text-accent-emerald font-mono font-semibold mt-1">
                  ✓ Successfully parsed and injected timestamp!
                </span>
              )}
              {copyFeedback['natural-parse-error'] && (
                <span className="text-[10px] text-red-400 font-mono font-semibold mt-1">
                  ⚠️ Error: Could not parse relative date expression.
                </span>
              )}
            </form>

            {/* Time Offset Math Calculator */}
            <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Epoch Math Adjuster
              </label>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  value={mathValue}
                  onChange={(e) => setMathValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg text-center py-2 outline-none focus:border-zinc-700"
                />
                
                <select
                  value={mathUnit}
                  onChange={(e) => setMathUnit(e.target.value as any)}
                  className="flex-grow bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded-lg p-2 outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleApplyMath('subtract')}
                    className="w-10 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 font-bold font-mono text-sm rounded-lg cursor-pointer"
                    title="Subtract time offset"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyMath('add')}
                    className="w-10 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 font-bold font-mono text-sm rounded-lg cursor-pointer"
                    title="Add time offset"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Year 2038 Threat Assessment Warnings */}
            {threatLevel !== 'safe' && (
              <div className={`mt-2 border rounded-lg p-3.5 flex flex-col gap-1.5 ${
                threatLevel === 'overflow'
                  ? 'bg-red-950/20 border-red-500/30 text-red-400'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-400'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold font-mono">
                  <span>⚠️</span>
                  <span>
                    {threatLevel === 'overflow' ? '32-Bit Integer Overflow (Year 2038 Bug)' : 'Approaching Year 2038 Limit'}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed font-sans opacity-90">
                  {threatLevel === 'overflow'
                    ? 'Warning: This timestamp exceeds 2147483647. Legacy 32-bit signed systems will overflow and wrap around to December 13, 1901. Requires 64-bit variables.'
                    : 'Caution: This date is close to the 32-bit Unix epoch limit (Jan 19, 2038). Ensure your codebase represents timestamps as 64-bit integer values.'}
                </p>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: PARSED TABLE & CODE GENERATOR (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Result formats Panel */}
            <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Parsed Date & Time Representations
                </h3>
                {parsedDate && (
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-border-hairline/60 px-2 py-0.5 rounded">
                    Validated local conversion
                  </span>
                )}
              </div>

              {!formattedResults ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border-hairline rounded-lg">
                  <span className="text-2xl text-zinc-650">⏱️</span>
                  <span className="text-xs text-zinc-500 font-mono">Enter a valid timestamp value to show parsed outputs.</span>
                </div>
              ) : (
                <div className="flex flex-col border border-border-hairline/60 rounded-lg divide-y divide-border-hairline bg-zinc-900/10">
                  
                  {/* Local Time representation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 group/row hover:bg-zinc-800/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Local Time ({resolvedTimezone})</span>
                      <span className="text-xs font-mono text-zinc-100 select-all mt-0.5 font-bold">{formattedResults.local}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(formattedResults.local);
                        triggerCopyFeedback('local');
                      }}
                      className="self-start sm:self-center px-2 py-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline/80 font-mono font-semibold"
                    >
                      {copyFeedback['local'] ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  {/* GMT/UTC Time representation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 group/row hover:bg-zinc-800/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">GMT / UTC Time</span>
                      <span className="text-xs font-mono text-zinc-100 select-all mt-0.5">{formattedResults.utc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(formattedResults.utc);
                        triggerCopyFeedback('utc');
                      }}
                      className="self-start sm:self-center px-2 py-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline/80 font-mono font-semibold"
                    >
                      {copyFeedback['utc'] ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  {/* ISO 8601 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 group/row hover:bg-zinc-800/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">ISO 8601</span>
                      <span className="text-xs font-mono text-zinc-100 select-all mt-0.5">{formattedResults.iso}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(formattedResults.iso);
                        triggerCopyFeedback('iso');
                      }}
                      className="self-start sm:self-center px-2 py-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline/80 font-mono font-semibold"
                    >
                      {copyFeedback['iso'] ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  {/* Relative time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 group/row hover:bg-zinc-800/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Relative Time</span>
                      <span className="text-xs font-mono text-accent-emerald mt-0.5 font-bold uppercase tracking-wide">
                        {formattedResults.relative}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(formattedResults.relative);
                        triggerCopyFeedback('relative');
                      }}
                      className="self-start sm:self-center px-2 py-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-border-hairline/80 font-mono font-semibold"
                    >
                      {copyFeedback['relative'] ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  {/* Additional representations: Day of year, week of year, Julian date */}
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/30">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold">Day of Year</span>
                      <span className="text-xs font-mono text-zinc-200 mt-0.5">{formattedResults.dayOfYear}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold">Week of Year</span>
                      <span className="text-xs font-mono text-zinc-200 mt-0.5">{formattedResults.weekOfYear}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold">Day of Week</span>
                      <span className="text-xs font-mono text-zinc-200 mt-0.5">{formattedResults.dayOfWeek}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-mono text-zinc-500 font-semibold">Julian Date</span>
                      <span className="text-xs font-mono text-zinc-200 mt-0.5">{formattedResults.julian}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Code Snippets Generator tab */}
            <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Convert in Language Code Snippets
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(activeSnippet.code);
                    triggerCopyFeedback('snippet');
                  }}
                  className="px-2.5 py-1 text-[10px] bg-accent-emerald/15 hover:bg-accent-emerald/25 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-colors font-mono font-semibold"
                >
                  {copyFeedback['snippet'] ? 'Copied ✓' : 'Copy Code'}
                </button>
              </div>

              {/* Selector Tabs */}
              <div className="flex flex-wrap gap-1 bg-zinc-900/50 p-1 border border-border-hairline rounded-lg">
                {activeSnippets.map(snip => (
                  <button
                    key={snip.lang}
                    type="button"
                    onClick={() => setActiveSnippetLang(snip.lang)}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer transition-all border ${
                      activeSnippetLang === snip.lang
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold shadow-sm'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
                    }`}
                  >
                    {snip.title}
                  </button>
                ))}
              </div>

              {/* Code Snippet Box */}
              <div className="relative bg-canvas border border-border-hairline rounded-lg p-3 overflow-hidden flex flex-col">
                <pre className="text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed select-all">
                  <code>{activeSnippet.code}</code>
                </pre>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* BATCH LOG TIMESTAMP SCANNER (TAB 2) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-panel border border-border-hairline rounded-lg p-5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Log Payload Ingestion
              </label>
              <button
                type="button"
                onClick={handleLoadSampleLogs}
                className="px-2 py-0.5 rounded text-[9px] font-mono border bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700 cursor-pointer"
              >
                Load Sample logs
              </button>
            </div>

            <textarea
              rows={11}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="Paste raw log data, terminal printouts, or JSON responses containing epoch timestamps..."
              className="w-full bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-lg p-3 font-mono text-xs text-zinc-300 placeholder-zinc-500 outline-none resize-none leading-relaxed"
            />
            
            <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-accent-emerald font-semibold font-mono">
                <span>🛡️</span>
                <span>In-Browser Extraction Engine</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                Our parser executes client-side scanning algorithms using optimized regex bounds to identify 10-digit (seconds) and 13-digit (milliseconds) numerical structures. Absolutely no data leaves your sandbox.
              </p>
            </div>
          </div>

          {/* Results column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
            <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
              <div className="flex flex-col">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Extracted Epoch Timestamps
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {scannerLogs.length} instances discovered
                </span>
              </div>
              {scannerLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const block = scannerLogs.map(s => `${s.raw} -> ${s.dateStr}`).join('\n');
                    copyToClipboard(block);
                    triggerCopyFeedback('batch-copy');
                  }}
                  className="px-2.5 py-1 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-colors font-mono font-semibold"
                >
                  {copyFeedback['batch-copy'] ? 'Copied ✓' : 'Copy All Results'}
                </button>
              )}
            </div>

            {scannerLogs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-border-hairline rounded-lg">
                <span className="text-3xl text-zinc-650">🔍</span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-350 font-semibold font-sans">No Timestamps Extracted</span>
                  <span className="text-[10px] text-zinc-500 font-mono max-w-xs leading-relaxed">
                    Paste raw text containing 10 or 13-digit numbers on the left to extract.
                  </span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border-hairline rounded-lg bg-zinc-900/10 max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-border-hairline bg-zinc-950 font-mono text-zinc-400 select-none">
                      <th className="p-3">Matched Value</th>
                      <th className="p-3">Detected Unit</th>
                      <th className="p-3">ISO Converted Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline/60 text-zinc-300 font-mono">
                    {scannerLogs.map((log, idx) => (
                      <tr key={`${log.index}-${idx}`} className="hover:bg-zinc-800/15 transition-colors">
                        <td className="p-3 text-zinc-100 font-bold select-all">{log.raw}</td>
                        <td className="p-3 select-none">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                            log.unit === 's' 
                              ? 'bg-indigo-950/20 text-indigo-400 border border-indigo-500/20' 
                              : 'bg-emerald-950/20 text-accent-emerald border border-accent-emerald/20'
                          }`}>
                            {log.unit === 's' ? 'Seconds' : 'Millis'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 select-all">{log.dateStr}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(log.raw);
                              triggerCopyFeedback(`log-val-${idx}`);
                            }}
                            className="text-[9px] bg-zinc-900 hover:bg-zinc-800 border border-border-hairline px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-all mr-1.5 font-semibold"
                          >
                            {copyFeedback[`log-val-${idx}`] ? 'Copied' : 'Timestamp'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(log.dateStr);
                              triggerCopyFeedback(`log-date-${idx}`);
                            }}
                            className="text-[9px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 px-2 py-0.5 rounded text-accent-emerald transition-all font-semibold"
                          >
                            {copyFeedback[`log-date-${idx}`] ? 'Copied' : 'Date'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* End of content */}

    </div>
  );
};
