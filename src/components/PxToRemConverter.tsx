import React, { useState, useMemo } from 'react';

interface ConversionRow {
  px: number;
  rem: number;
  em: number;
}

const formatNum = (n: number, digits = 4): string => {
  const str = parseFloat(n.toFixed(digits)).toString();
  return str;
};

const COMMON_16: Array<{ px: number; label: string }> = [
  { px: 4, label: 'x1' },
  { px: 8, label: 'x2' },
  { px: 12, label: 'x3' },
  { px: 16, label: 'base' },
  { px: 20, label: 'x5' },
  { px: 24, label: 'x6' },
  { px: 32, label: 'x8' },
  { px: 40, label: 'x10' },
  { px: 48, label: 'x12' },
  { px: 64, label: 'x16' }
];

export default function PxToRemConverter() {
  const [pxToRemPx, setPxToRemPx] = useState<string>('16');
  const [remBase, setRemBase] = useState<number>(16);
  const [remToPxRem, setRemToPxRem] = useState<string>('1');
  const [emBase, setEmBase] = useState<number>(16);
  const [pxToEmPx, setPxToEmPx] = useState<string>('16');

  const pxToRemResult = useMemo(() => {
    const px = parseFloat(pxToRemPx);
    if (isNaN(px) || remBase <= 0) return null;
    return px / remBase;
  }, [pxToRemPx, remBase]);

  const remToPxResult = useMemo(() => {
    const rem = parseFloat(remToPxRem);
    if (isNaN(rem) || remBase <= 0) return null;
    return rem * remBase;
  }, [remToPxRem, remBase]);

  const pxToEmResult = useMemo(() => {
    const px = parseFloat(pxToEmPx);
    if (isNaN(px) || emBase <= 0) return null;
    return px / emBase;
  }, [pxToEmPx, emBase]);

  const referenceRows: ConversionRow[] = useMemo(() => {
    return COMMON_16.map(({ px }) => ({
      px,
      rem: px / remBase,
      em: px / emBase
    }));
  }, [remBase, emBase]);

  const handleCopy = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* PX → REM */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-2">
            <span>📐</span> Pixel → REM
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Pixel Value (px)</span>
              <input
                type="number"
                value={pxToRemPx}
                onChange={(e) => setPxToRemPx(e.target.value)}
                placeholder="e.g. 32"
                className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Root Font Size</span>
                <span className="text-accent-emerald font-bold">{remBase}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={24}
                value={remBase}
                onChange={(e) => setRemBase(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>
            <div className="bg-zinc-900/40 border border-border-hairline/80 rounded-lg p-4 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Result</span>
              {pxToRemResult !== null ? (
                <>
                  <span className="text-2xl font-bold text-accent-emerald font-mono">
                    {formatNum(pxToRemResult)} rem
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${formatNum(pxToRemResult)}rem`)}
                    className="self-start mt-1 px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span className="text-sm text-zinc-500 font-mono">Enter a valid number</span>
              )}
            </div>
          </div>
        </div>

        {/* REM → PX */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-2">
            <span>🔄</span> REM → Pixel
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">REM Value (rem)</span>
              <input
                type="number"
                step="0.25"
                value={remToPxRem}
                onChange={(e) => setRemToPxRem(e.target.value)}
                placeholder="e.g. 1.5"
                className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
                Uses the same root size above ({remBase}px)
              </span>
            </div>
            <div className="bg-zinc-900/40 border border-border-hairline/80 rounded-lg p-4 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Result</span>
              {remToPxResult !== null ? (
                <>
                  <span className="text-2xl font-bold text-accent-emerald font-mono">
                    {formatNum(remToPxResult)} px
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${formatNum(remToPxResult)}px`)}
                    className="self-start mt-1 px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span className="text-sm text-zinc-500 font-mono">Enter a valid number</span>
              )}
            </div>
          </div>
        </div>

        {/* PX → EM */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-2">
            <span>📏</span> Pixel → EM
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Pixel Value (px)</span>
              <input
                type="number"
                value={pxToEmPx}
                onChange={(e) => setPxToEmPx(e.target.value)}
                placeholder="e.g. 24"
                className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Parent Font Size</span>
                <span className="text-accent-emerald font-bold">{emBase}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={24}
                value={emBase}
                onChange={(e) => setEmBase(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>
            <div className="bg-zinc-900/40 border border-border-hairline/80 rounded-lg p-4 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Result</span>
              {pxToEmResult !== null ? (
                <>
                  <span className="text-2xl font-bold text-accent-emerald font-mono">
                    {formatNum(pxToEmResult)} em
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${formatNum(pxToEmResult)}em`)}
                    className="self-start mt-1 px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span className="text-sm text-zinc-500 font-mono">Enter a valid number</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reference Table */}
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
          Quick Reference Table ({remBase}px root)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-border-hairline">
                <th className="text-left py-2 px-2 font-semibold">Pixels</th>
                <th className="text-left py-2 px-2 font-semibold">rem</th>
                <th className="text-left py-2 px-2 font-semibold">em</th>
                <th className="text-left py-2 px-2 font-semibold">Tailwind Size</th>
              </tr>
            </thead>
            <tbody>
              {referenceRows.map((row, i) => (
                <tr
                  key={row.px}
                  className={`${i % 2 === 0 ? 'bg-zinc-900/10' : ''} border-b border-border-hairline/40`}
                >
                  <td className="py-2 px-2 text-zinc-200 font-semibold">{row.px}px</td>
                  <td className="py-2 px-2 text-accent-emerald font-semibold">{formatNum(row.rem)}rem</td>
                  <td className="py-2 px-2 text-zinc-300">{formatNum(row.em)}em</td>
                  <td className="py-2 px-2 text-zinc-400">{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
          <span className="text-accent-emerald">✓</span>
          Processed locally in browser. Zero server transmission.
        </div>
      </div>
    </div>
  );
}
