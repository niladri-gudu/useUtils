import React, { useState } from 'react';
import { minifyCss } from '../utils-engine/css';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const SAMPLE = `.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* This comment is removed when minifying */
.card {
  padding: 1.5rem 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-4px);
}`;

export default function CssMinifier() {
  const [input, setInput] = useState<string>(SAMPLE);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const runMinify = () => {
    setError('');
    setCopied(false);
    if (!input.trim()) {
      setError('Enter CSS to minify.');
      setOutput('');
      return;
    }
    try {
      setOutput(minifyCss(input));
    } catch (e: any) {
      setError(e?.message || 'Failed to minify CSS.');
      setOutput('');
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not access clipboard.');
    }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'minified.css';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const inputSize = new TextEncoder().encode(input).length;
  const outputSize = new TextEncoder().encode(output).length;
  const saved = outputSize > 0 ? inputSize - outputSize : 0;
  const savedPct = outputSize > 0 ? Math.round((saved / inputSize) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">CSS Input</span>
            <span className="text-[10px] font-mono text-zinc-500">{formatBytes(inputSize)}</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste your CSS here…"
            className="w-full h-80 bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Sample
            </button>
            <button
              type="button"
              onClick={() => { setInput(''); setOutput(''); setError(''); }}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Minified Output</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500">{formatBytes(outputSize)}</span>
              <button
                type="button"
                onClick={copyOutput}
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
            placeholder="Minified CSS appears here…"
            className="w-full h-80 bg-canvas border border-border-hairline text-accent-emerald font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
        </div>
      </div>

      {output && (
        <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Reduction</span>
          <span className="text-sm font-bold font-mono text-accent-emerald">
            {formatBytes(inputSize)} → {formatBytes(outputSize)} (-{savedPct}%)
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={runMinify}
        className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer"
      >
        ⚡ Minify CSS
      </button>

      {error && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Processed locally in browser. Your CSS never leaves your device.
      </div>
    </div>
  );
}
