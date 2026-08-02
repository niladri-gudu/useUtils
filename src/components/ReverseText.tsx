import React, { useState, useMemo } from 'react';

type Mode = 'reverse' | 'reverse-words' | 'reverse-lines' | 'reverse-case';

const reverseString = (s: string) => [...s].reverse().join('');

const reverseWords = (s: string) =>
  s.split(/(\s+)/).map(w => (/^\s+$/.test(w) ? w : [...w].reverse().join(''))).join('');

const reverseLines = (s: string) => s.split('\n').reverse().join('\n');

const reverseCase = (s: string) =>
  [...s].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'reverse', label: 'Reverse characters', hint: 'dlrow olleH → Hellodlrow' },
  { id: 'reverse-words', label: 'Reverse each word', hint: 'hello world → olleh dlrow' },
  { id: 'reverse-lines', label: 'Reverse line order', hint: 'flips lines bottom to top' },
  { id: 'reverse-case', label: 'Swap case', hint: 'Hello → hELLO' }
];

export default function ReverseText() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('reverse');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    switch (mode) {
      case 'reverse':
        return reverseString(input);
      case 'reverse-words':
        return reverseWords(input);
      case 'reverse-lines':
        return reverseLines(input);
      case 'reverse-case':
        return reverseCase(input);
    }
  }, [input, mode]);

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-wrap gap-1.5">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            title={m.hint}
            className={`px-2.5 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
              mode === m.id
                ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Input</span>
            <span className="text-[10px] font-mono text-zinc-500">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste text to transform…"
            className="w-full h-64 bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput('The quick brown fox jumps over the lazy dog.')}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Sample
            </button>
            <button
              type="button"
              onClick={() => setInput('')}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Output</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            placeholder="Result appears here…"
            className="w-full h-64 bg-canvas border border-border-hairline text-accent-emerald font-mono text-sm leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Processed locally in browser. Your text never leaves your device.
      </div>
    </div>
  );
}
