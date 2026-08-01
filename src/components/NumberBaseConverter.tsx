import React, { useState, useMemo } from 'react';

const BASES = [
  { id: 2, name: 'Binary', short: 'BIN', base: 2, prefix: '0b' },
  { id: 8, name: 'Octal', short: 'OCT', base: 8, prefix: '0o' },
  { id: 10, name: 'Decimal', short: 'DEC', base: 10, prefix: '' },
  { id: 16, name: 'Hexadecimal', short: 'HEX', base: 16, prefix: '0x' }
];

const VALID_CHARS: Record<number, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^\d+$/,
  16: /^[0-9a-f]+$/i
};

const parseInBase = (str: string, base: number): bigint | null => {
  let cleaned = str.replace(/[\s_]/g, '');
  if (!cleaned) return null;
  const sign = cleaned.startsWith('-') ? -1n : 1n;
  cleaned = cleaned.replace(/^[+-]/, '').replace(/^0[xob]/i, '');
  if (!VALID_CHARS[base].test(cleaned)) return null;
  let value = 0n;
  for (const ch of cleaned) {
    value = value * BigInt(base) + BigInt(parseInt(ch, base));
  }
  return sign * value;
};

const toBaseString = (value: bigint, base: number): string => {
  if (value === 0n) return '0';
  const negative = value < 0n;
  let v = negative ? -value : value;
  const digits = '0123456789ABCDEF';
  let out = '';
  while (v > 0n) {
    out = digits[Number(v % BigInt(base))] + out;
    v = v / BigInt(base);
  }
  return (negative ? '-' : '') + out;
};

const formatNumber = (value: bigint): string => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function NumberBaseConverter() {
  const [activeBase, setActiveBase] = useState<number>(10);
  const [input, setInput] = useState<string>('255');
  const [error, setError] = useState<string>('');

  const value = useMemo(() => {
    const parsed = parseInBase(input, activeBase);
    if (input.trim() === '') {
      setError('');
      return null;
    }
    if (parsed === null) {
      setError(`Invalid ${BASES.find(b => b.base === activeBase)?.name} input.`);
      return null;
    }
    setError('');
    return parsed;
  }, [input, activeBase]);

  const switchBase = (base: number) => {
    setActiveBase(base);
    setError('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const conversions = useMemo(() => {
    if (value === null) return [];
    return BASES.map(b => ({
      ...b,
      out: toBaseString(value, b.base)
    }));
  }, [value]);

  const byteInfo = useMemo(() => {
    if (value === null || value < 0n) return null;
    const hex = toBaseString(value, 16);
    const bin = toBaseString(value, 2);
    const bytes = Math.max(1, Math.ceil(hex.length / 2));
    return { bytes, bits: Math.max(1, bin.length) };
  }, [value]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Base Switcher */}
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg w-fit">
        {BASES.map(b => (
          <button
            key={b.base}
            type="button"
            onClick={() => switchBase(b.base)}
            className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
              activeBase === b.base
                ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Enter value ({BASES.find(b => b.base === activeBase)?.name})
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeBase === 10 ? 'e.g. 255' : activeBase === 16 ? 'e.g. FF' : activeBase === 8 ? 'e.g. 377' : 'e.g. 11111111'}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-base rounded-lg px-4 py-3 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              spellCheck={false}
            />
            {error && <span className="text-[11px] text-red-400 font-mono">⚠️ {error}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BASES.map(b => (
              <button
                key={b.base}
                type="button"
                onClick={() => {
                  if (value !== null) {
                    setInput(toBaseString(value, b.base));
                    switchBase(b.base);
                  }
                }}
                disabled={value === null}
                className="px-3 py-2 rounded-lg bg-zinc-900/30 border border-border-hairline hover:border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                ↔ Convert to {b.name}
              </button>
            ))}
          </div>

          {byteInfo && (
            <div className="bg-zinc-900/35 border border-border-hairline/80 rounded-lg p-3 flex items-center justify-between text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Size</span>
                <span className="text-zinc-200 font-semibold">{byteInfo.bits} bits</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Storage</span>
                <span className="text-accent-emerald font-semibold">{byteInfo.bytes} byte{byteInfo.bytes > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Conversion Results</h3>
            {conversions.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono">Enter a valid value to see all conversions…</span>
            ) : (
              conversions.map(c => (
                <div key={c.base} className="flex flex-col gap-1 bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                      {c.name} <span className="text-zinc-700">({c.short})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.out)}
                      className="px-2 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                    >
                      Copy
                    </button>
                  </div>
                  <span className="text-base md:text-lg text-accent-emerald font-mono font-semibold break-all select-all">
                    {c.prefix}{c.out}
                  </span>
                </div>
              ))
            )}
          </div>

          {value !== null && (
            <div className="bg-panel border border-border-hairline rounded-lg p-5">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono mb-3">Value as Number</h3>
              <div className="flex items-center justify-between bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Decimal (BigInt)</span>
                <span className="text-sm text-zinc-200 font-mono break-all select-all text-right">
                  {formatNumber(value)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
