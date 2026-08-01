import React, { useState, useMemo } from 'react';

type CodeFormat = 'dec' | 'hex' | 'bin' | 'oct';

const FORMATS: Array<{ id: CodeFormat; name: string; desc: string }> = [
  { id: 'dec', name: 'Decimal', desc: '65' },
  { id: 'hex', name: 'Hex', desc: '0x41' },
  { id: 'bin', name: 'Binary', desc: '1000001' },
  { id: 'oct', name: 'Octal', desc: '101' }
];

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

const codeToStr = (code: number, format: CodeFormat): string => {
  if (format === 'dec') return String(code);
  if (format === 'hex') return '0x' + code.toString(16).toUpperCase();
  if (format === 'bin') return code.toString(2);
  return code.toString(8);
};

const strToCode = (str: string, format: CodeFormat): number | null => {
  const cleaned = str.trim();
  if (!cleaned) return null;
  const raw = cleaned.replace(/^0[xX]/, '');
  const radix = format === 'dec' ? 10 : format === 'hex' ? 16 : format === 'bin' ? 2 : 8;
  const value = parseInt(raw, radix);
  if (isNaN(value) || value < 0 || value > 0x10ffff) return null;
  return value;
};

const CONTROL_NAMES: Record<number, string> = {
  0: 'NUL', 9: 'TAB', 10: 'LF', 13: 'CR', 27: 'ESC', 32: 'SPACE'
};

const SAMPLE = 'Hello, World!\nuseUtils 123';

export default function AsciiConverter() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState<string>(SAMPLE);
  const [format, setFormat] = useState<CodeFormat>('dec');
  const [separator, setSeparator] = useState<string>('space');
  const [error, setError] = useState<string>('');

  const encodeOutput = useMemo(() => {
    if (!input) return '';
    const codes = Array.from(input).map(ch => codeToStr(ch.charCodeAt(0), format));
    const sep = separator === 'space' ? ' ' : separator === 'comma' ? ', ' : separator === 'newline' ? '\n' : '';
    return codes.join(sep);
  }, [input, format, separator]);

  const decodeOutput = useMemo(() => {
    if (!input.trim()) return '';
    const tokens = input.split(separator === 'newline' ? /\s*[\n,]\s*/ : /[\s,]+/).filter(t => t.trim());
    let out = '';
    for (const token of tokens) {
      const code = strToCode(token, format);
      if (code === null) {
        setError(`Invalid ${FORMATS.find(f => f.id === format)?.name} value: "${token}"`);
        return '';
      }
      out += String.fromCodePoint(code);
    }
    setError('');
    return out;
  }, [input, format, separator]);

  const handleCopy = (text: string) => {
    if (copyToClipboard(text)) setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const [copied, setCopied] = useState<boolean>(false);

  const commonCodes = useMemo(() => {
    const chars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
    return Array.from(chars).map((ch, i) => ({ code: 32 + i, ch }));
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Mode Switcher */}
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('encode')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
            mode === 'encode'
              ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent'
          }`}
        >
          Text → ASCII
        </button>
        <button
          type="button"
          onClick={() => setMode('decode')}
          className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
            mode === 'decode'
              ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent'
          }`}
        >
          ASCII → Text
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input */}
        <div className="lg:col-span-6 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {mode === 'encode' ? 'Text Input' : 'ASCII Codes Input'}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {mode === 'encode' ? `${input.length} characters` : 'Separated by spaces or commas'}
              </span>
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
            placeholder={mode === 'encode' ? 'Type or paste text…' : 'e.g. 72 101 108 108 111'}
            rows={14}
            spellCheck={false}
            className="w-full flex-grow bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 min-h-[240px]"
          />
        </div>

        {/* Output */}
        <div className="lg:col-span-6 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {mode === 'encode' ? 'ASCII Output' : 'Decoded Text'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(mode === 'encode' ? encodeOutput : decodeOutput)}
              disabled={!((mode === 'encode' ? encodeOutput : decodeOutput))}
              className="flex items-center gap-1 px-3 py-1 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold disabled:opacity-40 disabled:pointer-events-none"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <textarea
            value={mode === 'encode' ? encodeOutput : decodeOutput}
            readOnly
            rows={14}
            placeholder={mode === 'encode' ? 'ASCII codes will appear here…' : 'Decoded text will appear here…'}
            className="w-full flex-grow bg-canvas border border-border-hairline rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed outline-none min-h-[240px]"
          />
          {error && (
            <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">⚠️ {error}</div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Code Format</span>
          <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
            {FORMATS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={`px-3 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                  format === f.id
                    ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {mode === 'encode' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Separator</span>
            <div className="flex gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
              {(['space', 'comma', 'newline'] as const).map(sep => (
                <button
                  key={sep}
                  type="button"
                  onClick={() => setSeparator(sep)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono capitalize select-none cursor-pointer border transition-all ${
                    separator === sep
                      ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sep}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono ml-auto">
          <span className="text-accent-emerald">✓</span>
          Processed locally in browser. Zero server transmission.
        </div>
      </div>

      {/* ASCII Reference Table */}
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">ASCII Reference (Printable Characters)</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {commonCodes.map(({ code, ch }) => (
            <div
              key={code}
              className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/20 border border-border-hairline/50 rounded-md font-mono text-[10px]"
            >
              <span className="text-accent-emerald font-semibold">{code}</span>
              <span className="text-zinc-200">{ch === ' ' ? '␣' : ch}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
