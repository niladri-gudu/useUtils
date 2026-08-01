import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';

const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    document.body.removeChild(textArea);
    return false;
  }
};

const MD_SAMPLE = `# Hello, useUtils

This is a **Markdown** to *HTML* converter.

## Features

- GitHub Flavored Markdown
- Code blocks
- Tables

\`\`\`js
const greeting = "Hello World!";
console.log(greeting);
\`\`\`

| Name | Type |
| ---- | ---- |
| Markdown | Editor |
| HTML | Output |

> A blockquote with a [link](https://useutils.com).
`;

const HTML_SAMPLE = `<h1>Hello, useUtils</h1>
<p>This is a <strong>Markdown</strong> to <em>HTML</em> converter.</p>
<h2>Features</h2>
<ul>
<li>GitHub Flavored Markdown</li>
<li>Code blocks</li>
<li>Tables</li>
</ul>
<pre><code class="language-js">const greeting = &quot;Hello World!&quot;;
console.log(greeting);
</code></pre>
<table>
<thead><tr><th>Name</th><th>Type</th></tr></thead>
<tbody><tr><td>Markdown</td><td>Editor</td></tr><tr><td>HTML</td><td>Output</td></tr></tbody>
</table>
<blockquote>
<p>A blockquote with a <a href="https://useutils.com">link</a>.</p>
</blockquote>`;

export default function MarkdownHtmlConverter() {
  const [mode, setMode] = useState<'md-to-html' | 'html-to-md'>('md-to-html');
  const [input, setInput] = useState<string>(MD_SAMPLE);
  const [gfm, setGfm] = useState<boolean>(true);
  const [breaks, setBreaks] = useState<boolean>(true);
  const [headingStyle, setHeadingStyle] = useState<'atx' | 'setext'>('atx');
  const [bulletMarker, setBulletMarker] = useState<'*' | '-' | '+'>('-');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const output = useMemo(() => {
    if (!input.trim()) return '';
    try {
      setError('');
      if (mode === 'md-to-html') {
        marked.setOptions({ gfm, breaks });
        const result = marked.parse(input, { async: false });
        return typeof result === 'string' ? result : '';
      } else {
        const service = new TurndownService({
          headingStyle,
          bulletListMarker: bulletMarker,
          codeBlockStyle: 'fenced'
        });
        return service.turndown(input);
      }
    } catch (e: any) {
      setError(e?.message || 'Conversion failed');
      return '';
    }
  }, [input, mode, gfm, breaks, headingStyle, bulletMarker]);

  const handleCopy = () => {
    if (!output) return;
    if (copyToClipboard(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = mode === 'md-to-html' ? 'html' : 'md';
    const type = ext === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8';
    const blob = new Blob([output], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils-output.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const switchMode = (newMode: 'md-to-html' | 'html-to-md') => {
    setMode(newMode);
    setInput(newMode === 'md-to-html' ? MD_SAMPLE : HTML_SAMPLE);
    setError('');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Mode Switcher */}
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg w-fit">
        <button
          type="button"
          onClick={() => switchMode('md-to-html')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
            mode === 'md-to-html'
              ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent'
          }`}
        >
          Markdown → HTML
        </button>
        <button
          type="button"
          onClick={() => switchMode('html-to-md')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
            mode === 'html-to-md'
              ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent'
          }`}
        >
          HTML → Markdown
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Input */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {mode === 'md-to-html' ? 'Markdown Input' : 'HTML Input'}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{input.length} chars</span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'md-to-html' ? 'Paste Markdown here…' : 'Paste HTML here…'}
            rows={20}
            spellCheck={false}
            className="w-full flex-grow bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 min-h-[320px]"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {mode === 'md-to-html' ? 'HTML Output' : 'Markdown Output'}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{output.length} chars</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!output}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
              >
                Download
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-1 px-3 py-1 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            rows={20}
            spellCheck={false}
            placeholder="Converted output will appear here…"
            className="w-full flex-grow bg-canvas border border-border-hairline rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed outline-none min-h-[320px]"
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        {mode === 'md-to-html' ? (
          <>
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={gfm}
                onChange={(e) => setGfm(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              GitHub Flavored Markdown
            </label>
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={breaks}
                onChange={(e) => setBreaks(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              Hard line breaks
            </label>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Heading Style</span>
              <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {(['atx', 'setext'] as const).map(hs => (
                  <button
                    key={hs}
                    type="button"
                    onClick={() => setHeadingStyle(hs)}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono capitalize select-none cursor-pointer border transition-all ${
                      headingStyle === hs
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {hs}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Bullet Marker</span>
              <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {(['-', '*', '+'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBulletMarker(m)}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                      bulletMarker === m
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono ml-auto">
          <span className="text-accent-emerald">✓</span>
          Processed locally in browser. Zero server transmission.
        </div>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
