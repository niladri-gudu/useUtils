import React, { useState, useMemo } from 'react';

type System = 'decimal' | 'binary';
type Unit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

const DECIMAL = [1, 1000, 1000 ** 2, 1000 ** 3, 1000 ** 4, 1000 ** 5];
const BINARY = [1, 1024, 1024 ** 2, 1024 ** 3, 1024 ** 4, 1024 ** 5];
const UNITS: Unit[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

const parseInput = (value: string): number => {
  const cleaned = value.replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

export default function FileSizeConverter() {
  const [value, setValue] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<Unit>('GB');
  const [system, setSystem] = useState<System>('decimal');
  const [file, setFile] = useState<File | null>(null);

  const factor = (unit: Unit) => (system === 'decimal' ? DECIMAL : BINARY)[UNITS.indexOf(unit)];

  const inputBytes = useMemo(() => parseInput(value) * factor(fromUnit), [value, fromUnit, system]);

  const rows = useMemo(() => {
    return UNITS.map(unit => ({
      unit,
      value: inputBytes / factor(unit)
    }));
  }, [inputBytes, system]);

  const formatNumber = (n: number): string => {
    if (n === 0) return '0';
    if (Math.abs(n) >= 1e15) return n.toExponential(4);
    if (Math.abs(n) >= 1e6) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 100) return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (Math.abs(n) >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  };

  const selectFile = (f: File) => {
    setFile(f);
    setSystem('decimal');
    const bytes = f.size;
    let unit = 'B' as Unit;
    let num = bytes;
    for (let i = 1; i < UNITS.length; i++) {
      if (bytes >= DECIMAL[i]) { unit = UNITS[i]; num = bytes / DECIMAL[i]; }
    }
    setFromUnit(unit);
    setValue(num.toString());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Value</label>
          <div className="flex gap-2.5 flex-col sm:flex-row">
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 1.5"
              className="flex-1 bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value as Unit)}
              className="w-full sm:w-28 bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-accent-emerald/40 cursor-pointer"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Unit System</span>
          <div className="grid grid-cols-2 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSystem('decimal')}
              className={`px-2 py-2 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                system === 'decimal'
                  ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Decimal (KB, MB, GB)
            </button>
            <button
              type="button"
              onClick={() => setSystem('binary')}
              className={`px-2 py-2 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                system === 'binary'
                  ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Binary (KiB, MiB, GiB)
            </button>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono">
            Decimal: 1 KB = 1000 B. Binary: 1 KiB = 1024 B. Windows uses binary; hard drives and ISPs use decimal.
          </span>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center gap-1.5 border border-dashed border-border-hairline rounded-lg p-4 cursor-pointer hover:border-zinc-700 transition-all"
        >
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-[10px] font-mono text-zinc-400">Drop a file to read its actual size</span>
            <span className="text-[10px] font-mono text-accent-emerald underline">browse…</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
            />
          </label>
          {file && (
            <span className="text-[10px] font-mono text-zinc-500">
              {file.name} — {file.size.toLocaleString()} bytes
            </span>
          )}
        </div>
      </div>

      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Conversion Result</span>
          <span className="text-[10px] font-mono text-zinc-500">{inputBytes.toLocaleString()} bytes total</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map(r => (
            <button
              key={r.unit}
              type="button"
              onClick={() => {
                setValue(formatNumber(r.value).replace(/,/g, ''));
                setFromUnit(r.unit);
              }}
              title="Copy this value into the input"
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                r.unit === fromUnit
                  ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                  : 'bg-zinc-900/20 border-border-hairline/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span>{r.unit}</span>
              <span>{formatNumber(r.value)}</span>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-zinc-500 font-mono">Click any row to make it the new input value.</p>
      </div>

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Processed locally in browser. Your files never leave your device.
      </div>
    </div>
  );
}
