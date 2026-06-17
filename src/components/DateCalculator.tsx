import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateDateDiff,
  adjustDate,
  accumulateDurations,
  formatMinutes,
  type AccumulateItem,
} from '../utils-engine/date-calculator';

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

export const DateCalculator: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'difference' | 'adjuster' | 'accumulator'>('difference');
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});

  const triggerCopyFeedback = (key: string) => {
    setCopyFeedback((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback((prev) => ({ ...prev, [key]: false }));
    }, 1500);
  };

  // ==========================================
  // Date Difference Calculator State
  // ==========================================
  const [diffStartDate, setDiffStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [diffStartTime, setDiffStartTime] = useState<string>('00:00');
  const [diffEndDate, setDiffEndDate] = useState<string>(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  });
  const [diffEndTime, setDiffEndTime] = useState<string>('00:00');
  const [diffIncludeEndDay, setDiffIncludeEndDay] = useState<boolean>(false);
  const [diffBusinessDaysOnly, setDiffBusinessDaysOnly] = useState<boolean>(false);

  // Combine Date + Time
  const dateDiffStart = useMemo(() => {
    if (!diffStartDate) return new Date();
    const [h, m] = diffStartTime.split(':').map(Number);
    const date = new Date(diffStartDate);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
  }, [diffStartDate, diffStartTime]);

  const dateDiffEnd = useMemo(() => {
    if (!diffEndDate) return new Date();
    const [h, m] = diffEndTime.split(':').map(Number);
    const date = new Date(diffEndDate);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
  }, [diffEndDate, diffEndTime]);

  // Execute difference calculation
  const differenceResult = useMemo(() => {
    return calculateDateDiff(dateDiffStart, dateDiffEnd, diffIncludeEndDay, diffBusinessDaysOnly);
  }, [dateDiffStart, dateDiffEnd, diffIncludeEndDay, diffBusinessDaysOnly]);

  // Calculate year progress for difference range
  const yearProgressPercent = useMemo(() => {
    const startYear = dateDiffStart.getFullYear();
    const startOfYear = new Date(startYear, 0, 1).getTime();
    const endOfYear = new Date(startYear, 12, 0).getTime();
    const diffStartMs = dateDiffStart.getTime() - startOfYear;
    const diffEndMs = dateDiffEnd.getTime() - startOfYear;
    const yearLengthMs = endOfYear - startOfYear;

    const startPct = Math.max(0, Math.min(100, (diffStartMs / yearLengthMs) * 100));
    const endPct = Math.max(0, Math.min(100, (diffEndMs / yearLengthMs) * 100));
    
    return {
      start: Math.round(startPct * 10) / 10,
      end: Math.round(endPct * 10) / 10,
      span: Math.round(Math.abs(endPct - startPct) * 10) / 10,
    };
  }, [dateDiffStart, dateDiffEnd]);

  // ==========================================
  // Date Adjuster / Offset State
  // ==========================================
  const [adjustBaseDate, setAdjustBaseDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [adjustBaseTime, setAdjustBaseTime] = useState<string>('00:00');
  const [adjustAmount, setAdjustAmount] = useState<number>(7);
  const [adjustUnit, setAdjustUnit] = useState<'days' | 'weeks' | 'months' | 'years' | 'hours' | 'minutes'>('days');
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'subtract'>('add');
  const [adjustBusinessDays, setAdjustBusinessDays] = useState<boolean>(false);

  const parsedAdjustBase = useMemo(() => {
    if (!adjustBaseDate) return new Date();
    const [h, m] = adjustBaseTime.split(':').map(Number);
    const date = new Date(adjustBaseDate);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
  }, [adjustBaseDate, adjustBaseTime]);

  const adjustedDateResult = useMemo(() => {
    const multiplier = adjustDirection === 'add' ? 1 : -1;
    return adjustDate(parsedAdjustBase, adjustAmount * multiplier, adjustUnit, adjustBusinessDays);
  }, [parsedAdjustBase, adjustAmount, adjustUnit, adjustDirection, adjustBusinessDays]);

  // Formatted representations of adjusted date
  const formattedAdjusted = useMemo(() => {
    if (!adjustedDateResult) return null;
    return {
      local: adjustedDateResult.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }),
      utc: adjustedDateResult.toUTCString(),
      iso: adjustedDateResult.toISOString(),
      dateOnly: adjustedDateResult.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }, [adjustedDateResult]);

  // ==========================================
  // Timesheet & Duration Accumulator State
  // ==========================================
  const [accumulatorItems, setAccumulatorItems] = useState<AccumulateItem[]>([
    { id: '1', type: 'range', startTime: '09:00', endTime: '17:00', note: 'Standard coding shift' },
    { id: '2', type: 'duration', durationText: '2h 15m', note: 'Feature review standup' },
    { id: '3', type: 'range', startTime: '10:00', endTime: '18:30', note: 'Backend debugging' },
    { id: '4', type: 'duration', durationText: '45m', note: 'Client documentation sync' },
  ]);
  const [hourlyRate, setHourlyRate] = useState<number>(45);

  const accumulatedResult = useMemo(() => {
    return accumulateDurations(accumulatorItems, hourlyRate);
  }, [accumulatorItems, hourlyRate]);

  const addAccumulatorItem = (type: 'range' | 'duration') => {
    const newItem: AccumulateItem = {
      id: `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      startTime: '09:00',
      endTime: '17:00',
      durationText: '1h 30m',
      note: '',
    };
    setAccumulatorItems((prev) => [...prev, newItem]);
  };

  const removeAccumulatorItem = (id: string) => {
    setAccumulatorItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateAccumulatorItem = (id: string, updates: Partial<AccumulateItem>) => {
    setAccumulatorItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const clearAllAccumulator = () => {
    setAccumulatorItems([]);
  };

  // Keyboard shortcut support (CMD+C/CTRL+C to copy results summary)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (
          activeNode &&
          (activeNode.tagName === 'INPUT' ||
            activeNode.tagName === 'TEXTAREA' ||
            activeNode.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }
        e.preventDefault();

        // Copy currently active tab details
        if (activeSubTab === 'difference') {
          const txt = `Date difference summary:\nFrom: ${dateDiffStart.toLocaleString()}\nTo: ${dateDiffEnd.toLocaleString()}\nDifference: ${differenceResult.years}y ${differenceResult.months}mo ${differenceResult.days}d (${differenceResult.totalDays} total days)`;
          const ok = copyToClipboard(txt);
          if (ok) triggerCopyFeedback('diff-copy');
        } else if (activeSubTab === 'adjuster') {
          const txt = `Adjusted date summary:\nBase: ${parsedAdjustBase.toLocaleString()}\nAdjustment: ${adjustDirection} ${adjustAmount} ${adjustUnit}\nResult: ${formattedAdjusted?.local}`;
          const ok = copyToClipboard(txt);
          if (ok) triggerCopyFeedback('adjust-copy');
        } else {
          const txt = `Timesheet accumulated summary:\nTotal time: ${accumulatedResult.formattedDuration}\nAverage duration: ${accumulatedResult.formattedAverage}\nBilling rate: $${hourlyRate}/hr\nTotal earnings: $${accumulatedResult.totalCost}`;
          const ok = copyToClipboard(txt);
          if (ok) triggerCopyFeedback('acc-copy');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSubTab,
    dateDiffStart,
    dateDiffEnd,
    differenceResult,
    parsedAdjustBase,
    adjustAmount,
    adjustUnit,
    adjustDirection,
    formattedAdjusted,
    accumulatedResult,
    hourlyRate,
  ]);

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* Tab Select Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-hairline/60 pb-4">
        <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg">
          <button
            onClick={() => setActiveSubTab('difference')}
            className={`px-4 py-2 rounded-md text-xs font-mono font-semibold select-none cursor-pointer transition-all duration-75 ${
              activeSubTab === 'difference'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            🗓️ Date Difference
          </button>
          <button
            onClick={() => setActiveSubTab('adjuster')}
            className={`px-4 py-2 rounded-md text-xs font-mono font-semibold select-none cursor-pointer transition-all duration-75 ${
              activeSubTab === 'adjuster'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            ➕ Date Adjuster (Math)
          </button>
          <button
            onClick={() => setActiveSubTab('accumulator')}
            className={`px-4 py-2 rounded-md text-xs font-mono font-semibold select-none cursor-pointer transition-all duration-75 ${
              activeSubTab === 'accumulator'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            ⏱️ Timesheet Accumulator
          </button>
        </div>

        <div className="text-[10px] text-zinc-500 font-mono hidden md:inline-flex items-center gap-1.5">
          <span>Copy active summary:</span>
          <kbd className="font-mono bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">
            ⌘ C
          </kbd>
        </div>
      </div>

      {/* Main Split-Pane UI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ====================================================================
            LEFT COLUMN: Parameters & Ingestion Inputs (5 columns on desktop)
            ==================================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-xl p-5">
          {activeSubTab === 'difference' && (
            <>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2 font-mono">
                <span>🗓️</span> Interval Scope Parameters
              </h3>

              {/* Start Date Ingestion */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Start Date & Time (Date A)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={diffStartDate}
                    onChange={(e) => setDiffStartDate(e.target.value)}
                    className="col-span-2 bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                  <input
                    type="time"
                    value={diffStartTime}
                    onChange={(e) => setDiffStartTime(e.target.value)}
                    className="bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* End Date Ingestion */}
              <div className="flex flex-col gap-2 border-t border-border-hairline/40 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  End Date & Time (Date B)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={diffEndDate}
                    onChange={(e) => setDiffEndDate(e.target.value)}
                    className="col-span-2 bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                  <input
                    type="time"
                    value={diffEndTime}
                    onChange={(e) => setDiffEndTime(e.target.value)}
                    className="bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Configurations Toggles */}
              <div className="flex flex-col gap-3 border-t border-border-hairline/40 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Scope Adjustments
                </span>

                {/* Include End Date Checkbox */}
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={diffIncludeEndDay}
                    onChange={(e) => setDiffIncludeEndDay(e.target.checked)}
                    className="rounded border-zinc-800 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-canvas h-4.5 w-4.5 accent-accent-emerald cursor-pointer"
                  />
                  <span>
                    Include final day in count <span className="text-zinc-550 text-[10px]">(Adds 1 day)</span>
                  </span>
                </label>

                {/* Working Days Checkbox */}
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={diffBusinessDaysOnly}
                    onChange={(e) => setDiffBusinessDaysOnly(e.target.checked)}
                    className="rounded border-zinc-800 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-canvas h-4.5 w-4.5 accent-accent-emerald cursor-pointer"
                  />
                  <span>
                    Calculate working days only <span className="text-zinc-550 text-[10px]">(Mon - Fri)</span>
                  </span>
                </label>
              </div>

              {/* Relative Shortcuts */}
              <div className="flex flex-wrap gap-1.5 items-center border-t border-border-hairline/40 pt-4 mt-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Shortcuts:</span>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'End of Month', endOf: 'month' },
                  { label: '+30 Days', add: 30 },
                  { label: '+90 Days', add: 90 },
                  { label: '+1 Year', add: 365 },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const base = new Date();
                      if (item.days === 0) {
                        setDiffEndDate(base.toISOString().split('T')[0]);
                      } else if (item.endOf === 'month') {
                        const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
                        setDiffEndDate(lastDay.toISOString().split('T')[0]);
                      } else if (item.add) {
                        const target = new Date();
                        target.setDate(target.getDate() + item.add);
                        setDiffEndDate(target.toISOString().split('T')[0]);
                      }
                    }}
                    className="text-[9px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded border border-border-hairline/60"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeSubTab === 'adjuster' && (
            <>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2 font-mono">
                <span>➕</span> Date Adjustment Parameters
              </h3>

              {/* Baseline Date Ingestion */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Base Date & Time
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={adjustBaseDate}
                    onChange={(e) => setAdjustBaseDate(e.target.value)}
                    className="col-span-2 bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                  <input
                    type="time"
                    value={adjustBaseTime}
                    onChange={(e) => setAdjustBaseTime(e.target.value)}
                    className="bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Adjustment Factor (Amount + Unit) */}
              <div className="flex flex-col gap-2 border-t border-border-hairline/40 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Offset Factor
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none"
                  />
                  <select
                    value={adjustUnit}
                    onChange={(e) => setAdjustUnit(e.target.value as any)}
                    className="col-span-2 bg-canvas border border-border-hairline hover:border-zinc-750 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
              </div>

              {/* Direction Operator */}
              <div className="flex flex-col gap-2 border-t border-border-hairline/40 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Math Operator
                </span>
                <div className="flex gap-2 p-1 bg-zinc-900 border border-border-hairline rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('add')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-mono font-semibold select-none cursor-pointer transition-all ${
                      adjustDirection === 'add'
                        ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                        : 'text-zinc-450 hover:text-zinc-250 border border-transparent'
                    }`}
                  >
                    ➕ ADD TIME
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection('subtract')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-mono font-semibold select-none cursor-pointer transition-all ${
                      adjustDirection === 'subtract'
                        ? 'bg-zinc-800 text-red-400 border border-zinc-700'
                        : 'text-zinc-450 hover:text-zinc-250 border border-transparent'
                    }`}
                  >
                    ➖ SUBTRACT TIME
                  </button>
                </div>
              </div>

              {/* Adjust options */}
              {(adjustUnit === 'days' || adjustUnit === 'weeks') && (
                <div className="flex flex-col gap-2 border-t border-border-hairline/40 pt-4">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                    Adjustment Option
                  </span>
                  <label className="flex items-center gap-2.5 text-xs text-zinc-300 font-mono cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={adjustBusinessDays}
                      onChange={(e) => setAdjustBusinessDays(e.target.checked)}
                      className="rounded border-zinc-800 text-accent-emerald focus:ring-0 focus:ring-offset-0 bg-canvas h-4.5 w-4.5 accent-accent-emerald cursor-pointer"
                    />
                    <span>
                      Add/Subtract working days only <span className="text-zinc-550 text-[10px]">(Mon - Fri)</span>
                    </span>
                  </label>
                </div>
              )}

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 items-center border-t border-border-hairline/40 pt-4 mt-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Math Presets:</span>
                {[
                  { label: '+90 Days', amount: 90, unit: 'days', dir: 'add' },
                  { label: '-2 Weeks', amount: 2, unit: 'weeks', dir: 'subtract' },
                  { label: '+6 Months', amount: 6, unit: 'months', dir: 'add' },
                  { label: '+8 Hours', amount: 8, unit: 'hours', dir: 'add' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAdjustAmount(item.amount);
                      setAdjustUnit(item.unit as any);
                      setAdjustDirection(item.dir as any);
                    }}
                    className="text-[9px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded border border-border-hairline/60"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeSubTab === 'accumulator' && (
            <>
              <div className="flex items-center justify-between border-b border-border-hairline/60 pb-3">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 font-mono">
                  <span>⏱️</span> Ingest Timesheet Shifts
                </h3>
                <button
                  type="button"
                  onClick={clearAllAccumulator}
                  className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Clear List
                </button>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                {accumulatorItems.length === 0 ? (
                  <div className="w-full text-center py-8 border border-border-hairline border-dashed rounded-xl flex flex-col items-center gap-2">
                    <span className="text-2xl">🧹</span>
                    <p className="text-xs text-zinc-500 font-mono">
                      No timesheet entries. Add shifts or durations below.
                    </p>
                  </div>
                ) : (
                  accumulatorItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 bg-zinc-900/40 border border-border-hairline/65 rounded-lg p-2.5 hover:border-zinc-700 transition-all relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Type toggle */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateAccumulatorItem(item.id, { type: 'range' })}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${
                              item.type === 'range'
                                ? 'bg-zinc-850 border-zinc-700 text-accent-emerald font-semibold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            Clock Range
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAccumulatorItem(item.id, { type: 'duration' })}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${
                              item.type === 'duration'
                                ? 'bg-zinc-850 border-zinc-700 text-accent-emerald font-semibold'
                                : 'border-transparent text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            Raw Hours
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeAccumulatorItem(item.id)}
                          className="text-zinc-500 hover:text-red-400 text-xs px-1"
                          title="Remove shift item"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Inputs Row */}
                      <div className="flex items-center gap-2">
                        {item.type === 'range' ? (
                          <div className="flex items-center gap-1.5 flex-grow">
                            <input
                              type="time"
                              value={item.startTime || '09:00'}
                              onChange={(e) => updateAccumulatorItem(item.id, { startTime: e.target.value })}
                              className="w-full bg-zinc-950 border border-border-hairline rounded px-2 py-1 text-xs font-mono text-zinc-200 outline-none"
                            />
                            <span className="text-zinc-500 text-xs font-mono">to</span>
                            <input
                              type="time"
                              value={item.endTime || '17:00'}
                              onChange={(e) => updateAccumulatorItem(item.id, { endTime: e.target.value })}
                              className="w-full bg-zinc-950 border border-border-hairline rounded px-2 py-1 text-xs font-mono text-zinc-200 outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex-grow">
                            <input
                              type="text"
                              placeholder="e.g. 1h 30m, 45m, 2.5h"
                              value={item.durationText || ''}
                              onChange={(e) => updateAccumulatorItem(item.id, { durationText: e.target.value })}
                              className="w-full bg-zinc-950 border border-border-hairline rounded px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-650 outline-none focus:border-zinc-700"
                            />
                          </div>
                        )}
                        
                        {/* Note Input */}
                        <input
                          type="text"
                          placeholder="Note / Task"
                          value={item.note || ''}
                          onChange={(e) => updateAccumulatorItem(item.id, { note: e.target.value })}
                          className="w-1/3 bg-zinc-950 border border-border-hairline rounded px-2 py-1 text-[11px] font-mono text-zinc-350 placeholder-zinc-700 outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Shift Row */}
              <div className="flex gap-2 border-t border-border-hairline/40 pt-4">
                <button
                  type="button"
                  onClick={() => addAccumulatorItem('range')}
                  className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-300 text-xs font-mono rounded-lg transition-all"
                >
                  + Add Clock Range
                </button>
                <button
                  type="button"
                  onClick={() => addAccumulatorItem('duration')}
                  className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-300 text-xs font-mono rounded-lg transition-all"
                >
                  + Add Raw Hours
                </button>
              </div>

              {/* Hourly Billing Rate Setup */}
              <div className="flex items-center justify-between border-t border-border-hairline/40 pt-4 mt-1 bg-zinc-900/40 p-2.5 rounded-lg border border-border-hairline">
                <span className="text-xs font-mono text-zinc-400">Hourly Wage Rate ($):</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 bg-zinc-950 border border-border-hairline text-zinc-100 text-xs font-mono rounded px-2.5 py-1 outline-none text-right focus:border-accent-emerald"
                />
              </div>
            </>
          )}
        </div>

        {/* ====================================================================
            RIGHT COLUMN: Parsed Structural Outputs (7 columns on desktop)
            ==================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {activeSubTab === 'difference' && (
            <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-hairline/60 pb-3">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Calendar Span Dissection
                </h3>
                <button
                  onClick={() => {
                    const txt = `Date difference summary:\nFrom: ${dateDiffStart.toLocaleString()}\nTo: ${dateDiffEnd.toLocaleString()}\nDifference: ${differenceResult.years}y ${differenceResult.months}mo ${differenceResult.days}d (${differenceResult.totalDays} total days)`;
                    const ok = copyToClipboard(txt);
                    if (ok) triggerCopyFeedback('diff-copy');
                  }}
                  className="text-xs font-mono text-accent-emerald hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  {copyFeedback['diff-copy'] ? 'Copied ✓' : 'Copy Summary'}
                </button>
              </div>

              {/* Grid cards for breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Year/Month/Day Breakdown Card */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3 flex flex-col gap-0.5 col-span-2 sm:col-span-3">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Breakdown (Y / M / D)</span>
                  <span className="text-lg font-bold font-mono text-zinc-50 select-all">
                    {differenceResult.years > 0 ? `${differenceResult.years} Year${differenceResult.years > 1 ? 's' : ''}, ` : ''}
                    {differenceResult.months > 0 || differenceResult.years > 0 ? `${differenceResult.months} Month${differenceResult.months > 1 ? 's' : ''}, ` : ''}
                    {differenceResult.days} Day{differenceResult.days !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Total Days */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Total Days</span>
                  <span className="text-sm font-bold font-mono text-accent-emerald select-all">
                    {differenceResult.totalDays} Day{differenceResult.totalDays !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Business Days */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Working Days</span>
                  <span className="text-sm font-bold font-mono text-accent-emerald select-all">
                    {differenceResult.businessDays} Day{differenceResult.businessDays !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Weeks */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Weeks & Days</span>
                  <span className="text-sm font-bold font-mono text-zinc-200 select-all">
                    {differenceResult.weeks}w {differenceResult.remainingDays}d
                  </span>
                </div>
              </div>

              {/* Sub Hour/Minute breakdown */}
              <div className="bg-zinc-900/40 border border-border-hairline/60 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-zinc-400">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Hours Remainder</span>
                  <span className="text-xs font-mono text-zinc-250 mt-0.5">{differenceResult.hours}h</span>
                </div>
                <div className="flex flex-col border-x border-border-hairline/60">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Minutes</span>
                  <span className="text-xs font-mono text-zinc-250 mt-0.5">{differenceResult.minutes}m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-mono text-zinc-500">Seconds</span>
                  <span className="text-xs font-mono text-zinc-250 mt-0.5">{differenceResult.seconds}s</span>
                </div>
              </div>

              {/* Year Timeline Progress bar */}
              <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="uppercase tracking-wider text-zinc-500 font-semibold">Calendar Year Progress</span>
                  <span className="text-accent-emerald font-semibold">
                    {yearProgressPercent.span}% Span of Year
                  </span>
                </div>
                
                {/* Progress Strip */}
                <div className="w-full h-4 rounded bg-zinc-950 border border-border-hairline relative overflow-hidden">
                  {/* Highlighted portion representing the range */}
                  <div
                    className="absolute h-full bg-accent-emerald/25 border-x border-accent-emerald/40"
                    style={{
                      left: `${Math.min(yearProgressPercent.start, yearProgressPercent.end)}%`,
                      width: `${yearProgressPercent.span}%`,
                    }}
                  />
                  {/* Current Month labels ticks */}
                  <div className="absolute inset-0 flex justify-between px-2 text-[7px] text-zinc-600 font-mono pointer-events-none items-center">
                    <span>JAN</span>
                    <span>APR</span>
                    <span>JUL</span>
                    <span>OCT</span>
                    <span>DEC</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                  <span>Start falls at {yearProgressPercent.start}% of year</span>
                  <span>End falls at {yearProgressPercent.end}% of year</span>
                </div>
              </div>

              {/* Chronological Alert */}
              {differenceResult.isNegative && (
                <div className="bg-amber-950/20 border border-amber-500/25 text-amber-400 text-[10px] p-2.5 rounded-lg font-mono">
                  ⚠️ Note: Date A occurs after Date B. The difference was computed in reverse.
                </div>
              )}

              {/* 100% Privacy assurance */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-550 border-t border-border-hairline/60 pt-3 select-none">
                <span className="flex items-center gap-1.5 text-accent-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                  Processed locally in browser. Zero server transmission.
                </span>
                <span>Offline Sandbox</span>
              </div>
            </div>
          )}

          {activeSubTab === 'adjuster' && (
            <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-hairline/60 pb-3">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Resulting Adjusted Date
                </h3>
                <button
                  onClick={() => {
                    const txt = `Adjusted date summary:\nBase: ${parsedAdjustBase.toLocaleString()}\nAdjustment: ${adjustDirection} ${adjustAmount} ${adjustUnit}\nResult: ${formattedAdjusted?.local}`;
                    const ok = copyToClipboard(txt);
                    if (ok) triggerCopyFeedback('adjust-copy');
                  }}
                  className="text-xs font-mono text-accent-emerald hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  {copyFeedback['adjust-copy'] ? 'Copied ✓' : 'Copy Result'}
                </button>
              </div>

              {formattedAdjusted ? (
                <div className="flex flex-col gap-4 bg-zinc-950 border border-border-hairline rounded-lg p-4 font-mono text-xs text-zinc-300">
                  {/* Large Local Display */}
                  <div className="flex flex-col gap-1 border-b border-border-hairline/50 pb-3">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Local Time Representation</span>
                    <span className="text-base font-bold text-accent-emerald select-all">
                      {formattedAdjusted.local}
                    </span>
                  </div>

                  {/* Fully formatted Date string */}
                  <div className="flex flex-col gap-1 border-b border-border-hairline/50 pb-3">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Date Text</span>
                    <span className="text-xs text-zinc-100 select-all font-semibold">
                      {formattedAdjusted.dateOnly}
                    </span>
                  </div>

                  {/* ISO 8601 representation */}
                  <div className="flex flex-col gap-1 border-b border-border-hairline/50 pb-3">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">ISO 8601 Format</span>
                    <span className="text-xs text-zinc-200 select-all">
                      {formattedAdjusted.iso}
                    </span>
                  </div>

                  {/* UTC representation */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">UTC Standard</span>
                    <span className="text-xs text-zinc-200 select-all">
                      {formattedAdjusted.utc}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-border-hairline rounded-lg">
                  Configure Base Date and adjustments on the left to see results.
                </div>
              )}

              {/* 100% Privacy assurance */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-550 border-t border-border-hairline/60 pt-3 select-none">
                <span className="flex items-center gap-1.5 text-accent-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                  Processed locally in browser. Zero server transmission.
                </span>
                <span>Offline Sandbox</span>
              </div>
            </div>
          )}

          {activeSubTab === 'accumulator' && (
            <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border-hairline/60 pb-3">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Timesheet Analytics Summary
                </h3>
                <button
                  onClick={() => {
                    const txt = `Timesheet accumulated summary:\nTotal time: ${accumulatedResult.formattedDuration}\nAverage duration: ${accumulatedResult.formattedAverage}\nBilling rate: $${hourlyRate}/hr\nTotal earnings: $${accumulatedResult.totalCost}`;
                    const ok = copyToClipboard(txt);
                    if (ok) triggerCopyFeedback('acc-copy');
                  }}
                  className="text-xs font-mono text-accent-emerald hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  {copyFeedback['acc-copy'] ? 'Copied ✓' : 'Copy Summary'}
                </button>
              </div>

              {/* Analytics breakdown cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Total Duration */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Total Duration</span>
                  <span className="text-xl font-bold font-mono text-accent-emerald select-all">
                    {accumulatedResult.formattedDuration}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    ({Math.round((accumulatedResult.totalMinutes / 60) * 100) / 100} hours)
                  </span>
                </div>

                {/* Average Duration */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Average Shift</span>
                  <span className="text-xl font-bold font-mono text-zinc-200 select-all">
                    {accumulatedResult.formattedAverage}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    ({accumulatorItems.filter((i) => i.type === 'duration' ? !!i.durationText?.trim() : !!i.startTime && !!i.endTime).length} active items)
                  </span>
                </div>

                {/* Estimated Earnings */}
                <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-4 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold">Projected Earnings</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-accent-emerald select-all">
                      ${accumulatedResult.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Rate: ${hourlyRate}.00 / hr
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown breakdown list */}
              {accumulatedResult.itemResults.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-wider">Line Item Calculations:</span>
                  <div className="max-h-36 overflow-y-auto border border-border-hairline/80 rounded-lg bg-zinc-900/30 divide-y divide-zinc-850 scrollbar-thin">
                    {accumulatorItems
                      .filter((item) => item.type === 'duration' ? !!item.durationText?.trim() : !!item.startTime && !!item.endTime)
                      .map((item, idx) => {
                        const calc = accumulatedResult.itemResults[idx];
                        return (
                          <div key={item.id} className="p-2 text-[10px] font-mono flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5 truncate">
                              <span className="text-zinc-350 truncate">
                                {item.note || `Shift Entry #${idx + 1}`}
                              </span>
                              <span className="text-zinc-550 text-[9px]">
                                {item.type === 'range' ? `${item.startTime} - ${item.endTime}` : item.durationText}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-accent-emerald font-semibold">{calc?.formatted}</span>
                              {hourlyRate > 0 && (
                                <span className="text-zinc-400">
                                  ${((calc?.minutes || 0) / 60 * hourlyRate).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 100% Privacy assurance */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-550 border-t border-border-hairline/60 pt-3 select-none">
                <span className="flex items-center gap-1.5 text-accent-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                  Processed locally in browser. Zero server transmission.
                </span>
                <span>Offline Sandbox</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
