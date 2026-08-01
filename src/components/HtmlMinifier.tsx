import React, { useState, useMemo } from 'react';

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em',
  'i', 'kbd', 'label', 'mark', 'q', 'samp', 'small', 'span', 'strong', 'sub', 'sup',
  'time', 'u', 'var', 'wbr', 'img', 'input', 'button', 'select', 'textarea', 'option', 'svg'
]);

const PRESERVE_TAGS = new Set(['pre', 'textarea', 'script', 'style']);

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

const minifyHtml = (source: string, keepComments: boolean): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid or malformed HTML could not be parsed.');
  }

  const processNode = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      if (!keepComments) {
        node.parentNode?.removeChild(node);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const preserve = PRESERVE_TAGS.has(tag);

    if (!preserve) {
      // Collapse and trim text node whitespace
      const children = Array.from(el.childNodes);
      children.forEach(child => {
        if (child.nodeType !== Node.TEXT_NODE) return;
        const textNode = child as Text;
        const prevEl = findElementSibling(child, -1);
        const nextEl = findElementSibling(child, 1);
        const prevInline = prevEl && INLINE_TAGS.has(prevEl.tagName.toLowerCase());
        const nextInline = nextEl && INLINE_TAGS.has(nextEl.tagName.toLowerCase());

        const collapsed = textNode.data.replace(/[\t\n\r ]+/g, ' ');
        const trimmed = collapsed.trim();

        if (trimmed === '') {
          // Pure whitespace: keep a single space only when bridging two inline elements
          textNode.data = prevInline && nextInline ? ' ' : '';
        } else {
          let out = collapsed;
          if (!prevInline) out = out.replace(/^\s+/, '');
          if (!nextInline) out = out.replace(/\s+$/, '');
          textNode.data = out;
        }
      });
    }

    Array.from(el.childNodes).forEach(processNode);
  };

  processNode(doc.documentElement);

  // Remove empty text nodes
  const textNodes = Array.from(doc.body.querySelectorAll('*'));
  [doc.body, ...textNodes].forEach(el => {
    Array.from(el.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE && (child as Text).data === '') {
        el.removeChild(child);
      }
    });
  });

  // Serialize
  const isFullDoc = /^\s*<!doctype/i.test(source) || /^\s*<html[\s>]/i.test(source);
  if (isFullDoc) {
    let doctype = '';
    if (doc.doctype) doctype = `<!DOCTYPE ${doc.doctype.name}>`;
    return doctype + doc.documentElement.outerHTML;
  }
  return Array.from(doc.body.childNodes).map(n => (n as HTMLElement).outerHTML ?? (n as Text).data).join('');
};

const findElementSibling = (node: Node, direction: -1 | 1): Element | null => {
  let sib: Node | null = node;
  while (true) {
    sib = direction === -1 ? sib.previousSibling : sib.nextSibling;
    if (sib === null) return null;
    if (sib.nodeType === Node.ELEMENT_NODE) return sib as Element;
    if (sib.nodeType === Node.TEXT_NODE && sib.textContent?.trim() !== '') return null;
  }
};

const SAMPLE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Sample</title></head><body><div class="card">  <h1>Hello World</h1>  <p>This is a <strong>sample</strong> document.</p>  <!-- remove me --></div></body></html>`;

export default function HtmlMinifier() {
  const [input, setInput] = useState<string>(SAMPLE);
  const [keepComments, setKeepComments] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const output = useMemo(() => {
    if (!input.trim()) return '';
    try {
      setError('');
      return minifyHtml(input, keepComments);
    } catch (e: any) {
      setError(e?.message || 'Failed to minify HTML');
      return '';
    }
  }, [input, keepComments]);

  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const saved = inputSize - outputSize;
  const savedPct = inputSize > 0 ? Math.round((saved / inputSize) * 100) : 0;

  const handleCopy = () => {
    if (!output) return;
    if (copyToClipboard(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'minified.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Input Pane */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">HTML Source Input</h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{inputSize.toLocaleString()} bytes</span>
            </div>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
            >
              Load Sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your HTML markup here..."
            rows={18}
            spellCheck={false}
            className="w-full flex-grow bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 min-h-[280px]"
          />
        </div>

        {/* Output Pane */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Minified Output</h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {outputSize.toLocaleString()} bytes
                {saved > 0 && <> • <span className="text-accent-emerald">saved {saved.toLocaleString()} bytes ({savedPct}%)</span></>}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!output}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
              >
                Download .html
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
            rows={18}
            spellCheck={false}
            placeholder="Minified HTML will appear here..."
            className="w-full flex-grow bg-canvas border border-border-hairline rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed outline-none min-h-[280px]"
          />
        </div>
      </div>

      {/* Options Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={keepComments}
            onChange={(e) => setKeepComments(e.target.checked)}
            className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
          />
          Keep HTML comments
        </label>

        {saved > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 bg-zinc-900/40 border border-border-hairline/80 rounded-md px-3 py-2">
            <span className="text-accent-emerald font-bold">-{savedPct}%</span>
            <span>size reduction</span>
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
