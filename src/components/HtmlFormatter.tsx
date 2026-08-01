import React, { useState, useMemo } from 'react';

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

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

const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isInline = (tag: string): boolean =>
  new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em',
    'i', 'kbd', 'label', 'mark', 'q', 'samp', 'small', 'span', 'strong', 'sub', 'sup',
    'time', 'u', 'var', 'wbr', 'img', 'input', 'button', 'select', 'textarea', 'option', 'svg']).has(tag);

const shouldKeepText = (text: string, isPre: boolean): string | null => {
  if (isPre) return text;
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length ? collapsed : null;
};

interface FormatOptions {
  indent: string;
  collapseComments?: boolean;
}

const formatNode = (node: Node, depth: number, opts: FormatOptions): string[] => {
  const indentUnit = opts.indent;
  const pad = (n: number) => indentUnit.repeat(n);
  const lines: string[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    const isPre = !!parent && parent.closest('pre, textarea');
    const text = shouldKeepText((node as Text).data, !!isPre);
    if (text !== null && text.length) {
      if (isPre) {
        lines.push(pad(depth) + (node as Text).data.replace(/\n/g, '\n' + pad(depth)));
      } else {
        lines.push(pad(depth) + text);
      }
    }
    return lines;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    if (opts.collapseComments) return lines;
    lines.push(pad(depth) + '<!--' + (node as Comment).data + '-->');
    return lines;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return lines;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const isPre = tag === 'pre' || tag === 'textarea';
  const inline = isInline(tag) || isPre;

  const attrStr = Array.from(el.attributes)
    .map(a => ` ${a.name}${a.value !== '' ? `="${escapeAttr(a.value)}"` : ''}`)
    .join('');

  if (VOID_TAGS.has(tag)) {
    lines.push(pad(depth) + `<${tag}${attrStr}>`);
    return lines;
  }

  const children: Node[] = Array.from(el.childNodes);
  const meaningfulChildren = children.filter(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      return shouldKeepText((child as Text).data, isPre) !== null;
    }
    return true;
  });

  // No meaningful children -> self-close
  if (meaningfulChildren.length === 0) {
    lines.push(pad(depth) + `<${tag}${attrStr}></${tag}>`);
    return lines;
  }

  // Single inline child (text or inline element) -> keep on one line
  if (meaningfulChildren.length === 1) {
    const child = meaningfulChildren[0];
    if (child.nodeType === Node.TEXT_NODE || (child.nodeType === Node.ELEMENT_NODE && (isInline(child.tagName.toLowerCase()) || child.tagName.toLowerCase() === 'pre'))) {
      const childLines = formatNode(child, 0, opts);
      const inner = childLines.join(' ').trim();
      lines.push(pad(depth) + `<${tag}${attrStr}>${inner}</${tag}>`);
      return lines;
    }
  }

  // Multi-child block
  lines.push(pad(depth) + `<${tag}${attrStr}>`);
  children.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = shouldKeepText((child as Text).data, isPre);
      if (text !== null && text.length) {
        lines.push(pad(depth + 1) + text);
      }
    } else if (child.nodeType === Node.COMMENT_NODE) {
      lines.push(...formatNode(child, depth + 1, opts));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      lines.push(...formatNode(child, depth + 1, opts));
    }
  });
  lines.push(pad(depth) + `</${tag}>`);
  return lines;
};

const formatHtml = (source: string, indent: string, collapseComments: boolean): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid or malformed HTML could not be parsed.');
  }
  const opts: FormatOptions = { indent, collapseComments };
  const lines: string[] = [];
  if (doc.doctype) {
    lines.push('<!DOCTYPE ' + doc.doctype.name + '>');
  }
  if (doc.documentElement) {
    lines.push(...formatNode(doc.documentElement, 0, opts));
  }
  return lines.join('\n');
};

const SAMPLE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Sample</title></head><body><div class="card"><h1>Hello World</h1><p>This is a <strong>sample</strong> document for formatting.</p><ul><li>One</li><li>Two</li></ul></div><!-- footer --><footer><a href="https://useutils.com">useUtils</a></footer></body></html>`;

export default function HtmlFormatter() {
  const [input, setInput] = useState<string>(SAMPLE);
  const [indentSize, setIndentSize] = useState<number>(2);
  const [indentStyle, setIndentStyle] = useState<'spaces' | 'tab'>('spaces');
  const [collapseComments, setCollapseComments] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const indentUnit = indentStyle === 'tab' ? '\t' : ' '.repeat(indentSize);

  const output = useMemo(() => {
    if (!input.trim()) return '';
    try {
      setError('');
      return formatHtml(input, indentUnit, collapseComments);
    } catch (e: any) {
      setError(e?.message || 'Failed to format HTML');
      return '';
    }
  }, [input, indentUnit, collapseComments]);

  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const savings = inputSize > 0 ? Math.max(0, inputSize - outputSize) : 0;
  const savingsPct = inputSize > 0 ? Math.max(0, Math.round(((inputSize - outputSize) / inputSize) * 100)) : 0;

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
    link.download = 'formatted.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => setInput(SAMPLE);
  const handleClear = () => { setInput(''); setError(''); };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Input Pane */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">HTML Source Input</h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{inputSize} bytes</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
              >
                Load Sample
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
              >
                Clear
              </button>
            </div>
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
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Formatted Output</h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {outputSize} bytes {savingsPct > 0 && <>• <span className="text-accent-emerald">-{savingsPct}% smaller</span></>}
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
            placeholder="Formatted HTML will appear here..."
            className="w-full flex-grow bg-canvas border border-border-hairline rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed outline-none min-h-[280px]"
          />
        </div>
      </div>

      {/* Options Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Indent Style</span>
          <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
            {(['spaces', 'tab'] as const).map(style => (
              <button
                key={style}
                type="button"
                onClick={() => setIndentStyle(style)}
                className={`px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                  indentStyle === style
                    ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {style === 'spaces' ? 'Spaces' : 'Tab'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Indent Width</span>
          <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
            {[2, 4, 8].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setIndentSize(size)}
                disabled={indentStyle === 'tab'}
                className={`px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all disabled:opacity-30 disabled:pointer-events-none ${
                  indentSize === size
                    ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer mt-auto">
          <input
            type="checkbox"
            checked={collapseComments}
            onChange={(e) => setCollapseComments(e.target.checked)}
            className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
          />
          Remove comments
        </label>

        <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono mt-auto ml-auto">
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
