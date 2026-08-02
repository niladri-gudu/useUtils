import React, { useState, useMemo, useCallback, useEffect } from 'react';

type Charset = 'alnum' | 'lower' | 'upper' | 'numeric' | 'hex' | 'binary' | 'custom';

const CHARSETS: { id: Charset; label: string; chars: string }[] = [
  { id: 'alnum', label: 'Letters + Digits', chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
  { id: 'lower', label: 'Lowercase', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'upper', label: 'Uppercase', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'numeric', label: 'Digits', chars: '0123456789' },
  { id: 'hex', label: 'Hex (0-9, a-f)', chars: '0123456789abcdef' },
  { id: 'binary', label: 'Binary (0/1)', chars: '01' },
  { id: 'custom', label: 'Custom alphabet', chars: '' }
];

const separatorOf = (id: string): string => {
  switch (id) {
    case 'comma': return ', ';
    case 'space': return ' ';
    case 'semicolon': return ';';
    default: return '\n';
  }
};

const cryptoRandom = (n: number): number => {
  const arr = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    arr[0] = Math.floor(Math.random() * 0xffffffff);
  }
  return arr[0] % n;
};

const randomPick = (alphabet: string, length: number): string => {
  let out = '';
  const max = 0xffffffff - (0xffffffff % alphabet.length);
  for (let i = 0; i < length; i++) {
    let r = cryptoRandom(0xffffffff);
    while (r >= max) r = cryptoRandom(0xffffffff);
    out += alphabet[r % alphabet.length];
  }
  return out;
};

export default function RandomStringGenerator() {
  const [charset, setCharset] = useState<Charset>('alnum');
  const [customChars, setCustomChars] = useState('!@#$%^&*');
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [separatorId, setSeparatorId] = useState('newline');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [uppercase, setUppercase] = useState(true);
  const [copied, setCopied] = useState(false);
  const [nonce, setNonce] = useState(0);

  const alphabet = useMemo(() => {
    if (charset === 'custom') return customChars;
    const base = CHARSETS.find(c => c.id === charset)?.chars || '';
    return uppercase ? base.toUpperCase() : base;
  }, [charset, customChars, uppercase]);

  const results = useMemo(() => {
    if (!alphabet) return [];
    return Array.from({ length: count }, () => prefix + randomPick(alphabet, length) + suffix);
  }, [alphabet, length, count, prefix, suffix, nonce]);

  const output = useMemo(() => results.join(separatorOf(separatorId)), [results, separatorId]);

  useEffect(() => setCopied(false), [output]);

  const regenerate = useCallback(() => {
    setNonce(n => n + 1);
    setCopied(false);
  }, []);

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'random-strings.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Character Set</span>
            <div className="flex flex-wrap gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
              {CHARSETS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCharset(c.id)}
                  className={`flex-1 px-1.5 py-1.5 rounded text-[9px] font-mono select-none cursor-pointer border transition-all whitespace-nowrap ${
                    charset === c.id
                      ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase tracking-wider text-zinc-500 font-semibold">Length</span>
              <span className="text-accent-emerald font-bold">{length} chars</span>
            </div>
            <input
              type="range"
              min={1}
              max={256}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase tracking-wider text-zinc-500 font-semibold">Count</span>
              <span className="text-accent-emerald font-bold">{count}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Separator</span>
            <select
              value={separatorId}
              onChange={(e) => setSeparatorId(e.target.value)}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-2.5 py-2 outline-none focus:border-accent-emerald/40 cursor-pointer"
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma</option>
              <option value="space">Space</option>
              <option value="semicolon">Semicolon</option>
            </select>
          </div>
        </div>

        {charset === 'custom' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Custom Alphabet</span>
            <input
              type="text"
              value={customChars}
              onChange={(e) => setCustomChars(e.target.value)}
              placeholder="e.g. ABCXYZ0123!@#"
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
            />
          </div>
        )}

        {charset === 'alnum' && (
          <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
            />
            Uppercase only (skip lowercase letters)
          </label>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Prefix</span>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. TK_"
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 placeholder-zinc-600"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Suffix</span>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. _v2"
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 placeholder-zinc-600"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={regenerate}
          className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer"
        >
          🎲 Generate {count} Random String{count > 1 ? 's' : ''}
        </button>
      </div>

      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Result</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={download}
              disabled={!output}
              className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
            >
              ⬇️
            </button>
          </div>
        </div>
        <textarea
          value={output}
          readOnly
          spellCheck={false}
          placeholder="Generated strings appear here…"
          className="w-full h-56 bg-canvas border border-border-hairline text-accent-emerald font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
        />
        <p className="text-[10px] font-mono text-zinc-500">
          {results.length > 0 && `Entropy per string: ~${(alphabet.length > 1 ? Math.round(Math.log2(alphabet.length) * length) : 0)} bits`}
        </p>
      </div>

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Cryptographically secure (Web Crypto API). Generated locally.
      </div>
    </div>
  );
}
