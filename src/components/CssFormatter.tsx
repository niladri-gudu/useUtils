import React, { useState } from 'react';
import { formatCss } from '../utils-engine/css';

const SAMPLE = `.container{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}.card{padding:1.5rem 2rem;border-radius:.5rem;box-shadow:0 10px 25px rgba(0,0,0,.1);transition:transform .2s ease-in-out}.card:hover{transform:translateY(-4px)}@media (max-width:768px){.container{flex-direction:column}.card{padding:1rem}}`;

export default function CssFormatter() {
  const [input, setInput] = useState<string>(SAMPLE);
  const [output, setOutput] = useState<string>('');
  const [indentSize, setIndentSize] = useState<number>(2);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const runFormat = () => {
    setError('');
    setCopied(false);
    if (!input.trim()) {
      setError('Enter CSS to format.');
      setOutput('');
      return;
    }
    try {
      setOutput(formatCss(input, indentSize));
    } catch (e: any) {
      setError(e?.message || 'Failed to format CSS.');
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
    link.download = 'formatted.css';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">CSS Input</span>
            <span className="text-[10px] font-mono text-zinc-500">{input.length.toLocaleString()} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste minified or messy CSS here…"
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
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Formatted Output</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500">{output.length.toLocaleString()} chars</span>
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
            placeholder="Formatted CSS appears here…"
            className="w-full h-80 bg-canvas border border-border-hairline text-accent-emerald font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="uppercase tracking-wider text-zinc-500 font-semibold">Indentation</span>
            <span className="text-accent-emerald font-bold">{indentSize} spaces</span>
          </div>
          <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
            {[2, 4, 8].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setIndentSize(s)}
                className={`flex-1 px-2 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                  indentSize === s
                    ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s} spaces
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={runFormat}
          className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer"
        >
          ✨ Format CSS
        </button>
      </div>

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
