import React, { useState, useEffect, useMemo } from 'react';
import { validateCron, describeCron, getNextExecutions } from '../utils-engine/cron';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
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

const PRESETS = [
  { name: 'Every minute', value: '* * * * *' },
  { name: 'Every 5 minutes', value: '*/5 * * * *' },
  { name: 'Every 15 minutes', value: '*/15 * * * *' },
  { name: 'Hourly (minute 0)', value: '0 * * * *' },
  { name: 'Every 2 hours', value: '0 */2 * * *' },
  { name: 'Daily at midnight', value: '0 0 * * *' },
  { name: 'Daily at 9:00 AM', value: '0 9 * * *' },
  { name: 'Weekly (Sundays)', value: '0 0 * * 0' },
  { name: 'Weekly (Mon-Fri at 9 AM)', value: '0 9 * * 1-5' },
  { name: 'Monthly (1st at midnight)', value: '0 0 1 * *' },
  { name: 'Quarterly (1st at midnight)', value: '0 0 1 */3 *' },
  { name: 'Yearly (Jan 1st at midnight)', value: '0 0 1 1 *' }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface TabState {
  type: 'every' | 'interval' | 'specific' | 'range';
  intervalStart: number;
  intervalStep: number;
  specificList: number[];
  rangeStart: number;
  rangeEnd: number;
}

const initialTabState = (min: number): TabState => ({
  type: 'every',
  intervalStart: min,
  intervalStep: 5,
  specificList: [],
  rangeStart: min,
  rangeEnd: min
});

export const CronGenerator: React.FC = () => {
  const [cronExpression, setCronExpression] = useState<string>('*/15 9-17 * * 1-5');
  const [activeTab, setActiveTab] = useState<'presets' | 'minutes' | 'hours' | 'dom' | 'months' | 'dow'>('presets');
  const [isUpdatingFromBuilder, setIsUpdatingFromBuilder] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [copyDescFeedback, setCopyDescFeedback] = useState<boolean>(false);

  // Builder States
  const [minState, setMinState] = useState<TabState>(initialTabState(0));
  const [hourState, setHourState] = useState<TabState>(initialTabState(0));
  const [domState, setDomState] = useState<TabState>(initialTabState(1));
  const [monthState, setMonthState] = useState<TabState>(initialTabState(1));
  const [dowState, setDowState] = useState<TabState>(initialTabState(0));

  // Initialize specific steps/max bounds
  const limits = {
    minutes: { min: 0, max: 59, label: 'Minute' },
    hours: { min: 0, max: 23, label: 'Hour' },
    dom: { min: 1, max: 31, label: 'Day' },
    months: { min: 1, max: 12, label: 'Month' },
    dow: { min: 0, max: 6, label: 'Weekday' }
  };

  // Cron calculations
  const validation = useMemo(() => validateCron(cronExpression), [cronExpression]);
  const description = useMemo(() => describeCron(cronExpression), [cronExpression]);
  const nextExecutions = useMemo(() => {
    if (!validation.isValid) return [];
    try {
      return getNextExecutions(cronExpression, 5);
    } catch {
      return [];
    }
  }, [cronExpression, validation.isValid]);

  // Construct Cron from Builder States
  const constructCronExpression = () => {
    const getFieldExpr = (state: TabState, min: number, max: number): string => {
      if (state.type === 'every') return '*';
      if (state.type === 'interval') {
        const start = state.intervalStart === min ? '*' : state.intervalStart;
        return `${start}/${state.intervalStep}`;
      }
      if (state.type === 'specific') {
        if (state.specificList.length === 0) return '*';
        return [...state.specificList].sort((a, b) => a - b).join(',');
      }
      if (state.type === 'range') {
        if (state.rangeStart === state.rangeEnd) return state.rangeStart.toString();
        return `${state.rangeStart}-${state.rangeEnd}`;
      }
      return '*';
    };

    const minPart = getFieldExpr(minState, limits.minutes.min, limits.minutes.max);
    const hourPart = getFieldExpr(hourState, limits.hours.min, limits.hours.max);
    const domPart = getFieldExpr(domState, limits.dom.min, limits.dom.max);
    const monthPart = getFieldExpr(monthState, limits.months.min, limits.months.max);
    const dowPart = getFieldExpr(dowState, limits.dow.min, limits.dow.max);

    return `${minPart} ${hourPart} ${domPart} ${monthPart} ${dowPart}`;
  };

  // Auto update expression when builder state changes
  useEffect(() => {
    if (activeTab === 'presets') return;
    setIsUpdatingFromBuilder(true);
    const expr = constructCronExpression();
    setCronExpression(expr);
    setIsUpdatingFromBuilder(false);
  }, [minState, hourState, domState, monthState, dowState, activeTab]);

  // Sync state if user loads a preset
  const handleLoadPreset = (val: string) => {
    setCronExpression(val);
    syncBuilderFromExpression(val);
  };

  // Synchronizes the builder states from a valid cron expression string
  const syncBuilderFromExpression = (expr: string) => {
    const valid = validateCron(expr);
    if (!valid.isValid) return;

    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return;

    const parseFieldToState = (part: string, min: number, max: number): TabState => {
      const state = initialTabState(min);
      if (part === '*') {
        state.type = 'every';
        return state;
      }

      // Check step/interval
      if (part.includes('/')) {
        state.type = 'interval';
        const [range, stepStr] = part.split('/');
        state.intervalStep = parseInt(stepStr, 10) || 5;
        if (range !== '*') {
          state.intervalStart = parseInt(range.split('-')[0], 10) || min;
        } else {
          state.intervalStart = min;
        }
        return state;
      }

      // Check range
      if (part.includes('-') && !part.includes(',')) {
        state.type = 'range';
        const [startStr, endStr] = part.split('-');
        state.rangeStart = parseInt(startStr, 10) || min;
        state.rangeEnd = parseInt(endStr, 10) || min;
        return state;
      }

      // Treat as specific list (even single values)
      state.type = 'specific';
      const items = part.split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
      state.specificList = items;
      return state;
    };

    setMinState(parseFieldToState(parts[0], 0, 59));
    setHourState(parseFieldToState(parts[1], 0, 23));
    setDomState(parseFieldToState(parts[2], 1, 31));
    setMonthState(parseFieldToState(parts[3], 1, 12));
    setDowState(parseFieldToState(parts[4], 0, 6));
  };

  // Load sample on start
  useEffect(() => {
    syncBuilderFromExpression('*/15 9-17 * * 1-5');
  }, []);

  // UI helpers for rendering lists
  const toggleSpecificValue = (
    value: number,
    state: TabState,
    setState: React.Dispatch<React.SetStateAction<TabState>>
  ) => {
    setState(prev => {
      const exists = prev.specificList.includes(value);
      const list = exists
        ? prev.specificList.filter(x => x !== value)
        : [...prev.specificList, value];
      return { ...prev, specificList: list };
    });
  };

  const handleCopy = () => {
    const success = copyToClipboard(cronExpression);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleCopyDescription = () => {
    if (!validation.isValid) return;
    const success = copyToClipboard(description);
    if (success) {
      setCopyDescFeedback(true);
      setTimeout(() => setCopyDescFeedback(false), 1500);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      
      {/* Top Raw expression input and Copy bar */}
      <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Cron Expression String
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Standard 5-field UNIX format (Minute, Hour, Day of Month, Month, Day of Week)
            </span>
          </div>

          {/* Privacy Pill */}
          <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-[10px] text-accent-emerald font-mono w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald"></span>
            Processed locally. Zero server transmission.
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => {
              setCronExpression(e.target.value);
              // Attempt to back-sync builder to this new manual string if valid
              if (!isUpdatingFromBuilder) {
                syncBuilderFromExpression(e.target.value);
              }
            }}
            placeholder="* * * * *"
            className={`flex-grow bg-canvas border rounded-lg px-4 py-3 font-mono text-sm md:text-base outline-none transition-all ${
              validation.isValid
                ? 'border-border-hairline hover:border-zinc-700 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 text-zinc-100'
                : 'border-red-500/50 hover:border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-red-400'
            }`}
          />
          <button
            onClick={handleCopy}
            disabled={!cronExpression.trim()}
            className="px-4 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-semibold rounded-lg transition-all active:scale-98 cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:pointer-events-none shadow-md"
          >
            {copyFeedback ? 'Copied ✓' : 'Copy'}
          </button>
        </div>

        {/* Validation Errors banner */}
        {!validation.isValid && validation.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-mono leading-relaxed">
            ⚠️ {validation.error}
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Builder Panels - 7 Cols */}
        <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-xl overflow-hidden shadow-lg">
          
          {/* Builder Tab Headers */}
          <div className="flex border-b border-border-hairline/80 bg-zinc-900/40 overflow-x-auto select-none custom-scrollbar">
            {[
              { id: 'presets', label: '⭐ Presets' },
              { id: 'minutes', label: 'Minutes' },
              { id: 'hours', label: 'Hours' },
              { id: 'dom', label: 'Day of Month' },
              { id: 'months', label: 'Months' },
              { id: 'dow', label: 'Day of Week' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'border-accent-emerald text-accent-emerald bg-zinc-900/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Builder Content Area */}
          <div className="p-5 min-h-[350px]">
            
            {/* Tab: Presets */}
            {activeTab === 'presets' && (
              <div className="flex flex-col gap-4">
                <div className="text-xs text-zinc-400 leading-relaxed">
                  Select a common cron preset to load immediately. This updates both the raw string and the visual builders below.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handleLoadPreset(preset.value)}
                      className="flex flex-col items-start text-left bg-canvas border border-border-hairline/60 hover:border-zinc-700 hover:bg-zinc-850/30 rounded-lg p-3 transition-all cursor-pointer group hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                    >
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-accent-emerald transition-colors">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 mt-1">
                        {preset.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Minutes */}
            {activeTab === 'minutes' && (
              <FieldTabBuilder
                state={minState}
                setState={setMinState}
                limit={limits.minutes}
              />
            )}

            {/* Tab: Hours */}
            {activeTab === 'hours' && (
              <FieldTabBuilder
                state={hourState}
                setState={setHourState}
                limit={limits.hours}
              />
            )}

            {/* Tab: Day of Month */}
            {activeTab === 'dom' && (
              <FieldTabBuilder
                state={domState}
                setState={setDomState}
                limit={limits.dom}
              />
            )}

            {/* Tab: Months */}
            {activeTab === 'months' && (
              <FieldTabBuilder
                state={monthState}
                setState={setMonthState}
                limit={limits.months}
                labels={MONTH_NAMES}
              />
            )}

            {/* Tab: Day of Week */}
            {activeTab === 'dow' && (
              <FieldTabBuilder
                state={dowState}
                setState={setDowState}
                limit={limits.dow}
                labels={WEEKDAY_NAMES}
              />
            )}

          </div>

        </div>

        {/* Right Side: Translation & Schedule Outputs - 5 Cols */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Real-time Translator Panel */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-border-hairline/40 pb-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Human Description
              </span>
              {validation.isValid && (
                <button
                  onClick={handleCopyDescription}
                  className="text-[9px] font-mono bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded border border-zinc-700 cursor-pointer transition-colors"
                >
                  {copyDescFeedback ? 'Copied ✓' : 'Copy Description'}
                </button>
              )}
            </div>

            <div className="min-h-[60px] flex items-center">
              {validation.isValid ? (
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-accent-emerald mt-1.5 shrink-0 animate-pulse"></span>
                  <p className="text-zinc-200 font-mono text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-zinc-500">
                  <span>❌</span>
                  <p className="text-xs font-mono leading-relaxed">
                    Fix validation errors to translate expression.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Executions List */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4 shadow-lg">
            <div className="border-b border-border-hairline/40 pb-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Upcoming Executions
              </span>
            </div>

            {validation.isValid && nextExecutions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="overflow-hidden border border-border-hairline/80 rounded-lg bg-zinc-900/30">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border-hairline bg-zinc-950/80 text-zinc-400">
                        <th className="p-2.5 font-semibold">Run</th>
                        <th className="p-2.5 font-semibold">Scheduled Date & Time (Local)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline text-zinc-300">
                      {nextExecutions.map((date, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/10">
                          <td className="p-2.5 text-zinc-500 font-semibold">#{idx + 1}</td>
                          <td className="p-2.5 text-accent-emerald font-semibold">
                            {date.toLocaleString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono leading-relaxed text-right">
                  System Date/Time: {new Date().toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-500 font-mono text-xs border border-border-hairline border-dashed rounded-lg">
                No executions available. Expression is empty or invalid.
              </div>
            )}
          </div>

          {/* Quick Cheatsheet Table */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-3.5 shadow-lg">
            <div className="border-b border-border-hairline/40 pb-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Quick Syntax Reference
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
              <div className="bg-zinc-900/40 p-2 border border-border-hairline/50 rounded-lg">
                <strong className="text-zinc-300 block mb-0.5">*</strong>
                Any value / wildcard
              </div>
              <div className="bg-zinc-900/40 p-2 border border-border-hairline/50 rounded-lg">
                <strong className="text-zinc-300 block mb-0.5">,</strong>
                Value list separator (e.g. 1,3,5)
              </div>
              <div className="bg-zinc-900/40 p-2 border border-border-hairline/50 rounded-lg">
                <strong className="text-zinc-300 block mb-0.5">-</strong>
                Value range (e.g. 1-5)
              </div>
              <div className="bg-zinc-900/40 p-2 border border-border-hairline/50 rounded-lg">
                <strong className="text-zinc-300 block mb-0.5">/</strong>
                Step/intervals (e.g. */5 or 1-10/2)
              </div>
            </div>

            <div className="border-t border-border-hairline/50 pt-2.5">
              <div className="text-[9px] font-mono text-zinc-500 leading-relaxed">
                Aliases: Months support <code>jan-dec</code>, Weekdays support <code>sun-sat</code> (0 or 7 is Sunday).
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

// ==========================================
// Inner Sub-Component: Builder forms per Tab
// ==========================================
interface BuilderProps {
  state: TabState;
  setState: React.Dispatch<React.SetStateAction<TabState>>;
  limit: { min: number; max: number; label: string };
  labels?: string[];
}

const FieldTabBuilder: React.FC<BuilderProps> = ({ state, setState, limit, labels }) => {
  const { type, intervalStart, intervalStep, specificList, rangeStart, rangeEnd } = state;

  // Build range of available values
  const allValues = useMemo(() => {
    const list = [];
    for (let i = limit.min; i <= limit.max; i++) {
      list.push(i);
    }
    return list;
  }, [limit]);

  const toggleVal = (val: number) => {
    const exists = specificList.includes(val);
    const list = exists ? specificList.filter(x => x !== val) : [...specificList, val];
    setState(prev => ({ ...prev, specificList: list }));
  };

  const selectAll = () => {
    setState(prev => ({ ...prev, specificList: [...allValues] }));
  };

  const clearAll = () => {
    setState(prev => ({ ...prev, specificList: [] }));
  };

  const getDisplayLabel = (val: number) => {
    if (labels) {
      // Offset labels if they are 1-indexed (months)
      const index = limit.min === 1 ? val - 1 : val;
      return labels[index] || val.toString();
    }
    return val.toString().padStart(2, '0');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Radio options selectors */}
      <div className="flex flex-col sm:flex-row gap-2 bg-zinc-900 border border-border-hairline/80 p-1 rounded-lg">
        {[
          { id: 'every', label: `Every ${limit.label} (*)` },
          { id: 'interval', label: `Step/Interval (*/n)` },
          { id: 'range', label: `Range (a-b)` },
          { id: 'specific', label: `Specific list` }
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setState(prev => ({ ...prev, type: item.id as any }))}
            className={`flex-grow px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border text-center transition-all ${
              type === item.id
                ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="border-t border-border-hairline/40 pt-4">
        
        {/* State: Every */}
        {type === 'every' && (
          <div className="text-xs font-mono text-zinc-400 bg-zinc-900/30 border border-border-hairline/60 rounded-lg p-4 leading-relaxed">
            🚀 Executes on <strong>every single</strong> {limit.label.toLowerCase()} (represented by <code>*</code>).
          </div>
        )}

        {/* State: Interval */}
        {type === 'interval' && (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-zinc-400 font-mono">
              Execute every <strong>N</strong> {limit.label.toLowerCase()}(s) starting from a value:
            </div>
            
            <div className="grid grid-cols-2 gap-3 bg-zinc-900/20 border border-border-hairline/40 p-4 rounded-lg">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Start {limit.label}</span>
                <select
                  value={intervalStart}
                  onChange={(e) => setState(prev => ({ ...prev, intervalStart: parseInt(e.target.value, 10) }))}
                  className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded p-2 outline-none cursor-pointer"
                >
                  <option value={limit.min}>Every {limit.label.toLowerCase()} (wildcard start)</option>
                  {allValues.map(v => (
                    <option key={v} value={v}>{getDisplayLabel(v)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Step Increment (every N)</span>
                <input
                  type="number"
                  min={1}
                  max={limit.max}
                  value={intervalStep}
                  onChange={(e) => setState(prev => ({ ...prev, intervalStep: Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), limit.max) }))}
                  className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded p-2 outline-none"
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-border-hairline/60">
              Expression part: <code>{intervalStart === limit.min ? '*' : intervalStart}/{intervalStep}</code>
            </div>
          </div>
        )}

        {/* State: Range */}
        {type === 'range' && (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-zinc-400 font-mono">
              Execute continuously within a specified range of {limit.label.toLowerCase()}s:
            </div>
            
            <div className="grid grid-cols-2 gap-3 bg-zinc-900/20 border border-border-hairline/40 p-4 rounded-lg">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">From {limit.label}</span>
                <select
                  value={rangeStart}
                  onChange={(e) => setState(prev => ({ ...prev, rangeStart: parseInt(e.target.value, 10) }))}
                  className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded p-2 outline-none cursor-pointer"
                >
                  {allValues.map(v => (
                    <option key={v} value={v}>{getDisplayLabel(v)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Through {limit.label}</span>
                <select
                  value={rangeEnd}
                  onChange={(e) => setState(prev => ({ ...prev, rangeEnd: parseInt(e.target.value, 10) }))}
                  className="bg-canvas border border-border-hairline text-zinc-300 font-mono text-xs rounded p-2 outline-none cursor-pointer"
                >
                  {allValues.map(v => (
                    <option key={v} value={v}>{getDisplayLabel(v)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-border-hairline/60">
              Expression part: <code>{rangeStart === rangeEnd ? rangeStart : `${rangeStart}-${rangeEnd}`}</code>
            </div>
          </div>
        )}

        {/* State: Specific */}
        {type === 'specific' && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Select specific values below (comma-separated list):</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[9px] text-accent-emerald hover:text-emerald-300 transition-colors font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-650">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Checkbox Grid */}
            <div className={`grid gap-1.5 mt-1 border border-border-hairline/50 p-3 rounded-lg bg-zinc-900/10 ${
              allValues.length > 31 
                ? 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10' 
                : allValues.length > 12 
                  ? 'grid-cols-4 sm:grid-cols-6' 
                  : 'grid-cols-3 sm:grid-cols-4'
            }`}>
              {allValues.map(v => {
                const isSelected = specificList.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVal(v)}
                    className={`px-1.5 py-2 font-mono text-[10px] text-center border rounded transition-all select-none cursor-pointer ${
                      isSelected
                        ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-bold'
                        : 'bg-canvas border-border-hairline/45 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {getDisplayLabel(v)}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-border-hairline/60">
              Expression part: <code>{specificList.length === 0 ? '*' : [...specificList].sort((a, b) => a - b).join(',')}</code>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
