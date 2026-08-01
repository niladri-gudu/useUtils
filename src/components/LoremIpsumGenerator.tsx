import React, { useState, useMemo, useEffect } from 'react';

const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
  "Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
  "Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
  "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.",
  "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores."
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

const sentence = (start?: string): string => {
  if (start) {
    const rest = LOREM_SENTENCES.slice(1, 4).join(' ');
    return start + ' ' + rest;
  }
  return LOREM_SENTENCES[Math.floor(Math.random() * LOREM_SENTENCES.length)];
};

const generateLorem = (paragraphs: number, sentencesPerPara: number, startWithClassic: boolean, asHtml: boolean): string => {
  const parts: string[] = [];
  for (let p = 0; p < paragraphs; p++) {
    const sentences: string[] = [];
    for (let s = 0; s < sentencesPerPara; s++) {
      sentences.push(sentence(s === 0 && p === 0 && startWithClassic ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' : undefined));
    }
    const para = sentences.join(' ');
    parts.push(asHtml ? `<p>${para}</p>` : para);
  }
  return parts.join(asHtml ? '\n\n' : '\n\n');
};

export default function LoremIpsumGenerator() {
  const [paragraphs, setParagraphs] = useState<number>(3);
  const [sentencesPerPara, setSentencesPerPara] = useState<number>(5);
  const [startWithClassic, setStartWithClassic] = useState<boolean>(true);
  const [asHtml, setAsHtml] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerate = () => {
    setOutput(generateLorem(Math.min(Math.max(paragraphs, 1), 20), Math.min(Math.max(sentencesPerPara, 1), 15), startWithClassic, asHtml));
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const stats = useMemo(() => {
    const words = output.trim() ? output.trim().split(/\s+/).length : 0;
    return { words, chars: output.length };
  }, [output]);

  const handleCopy = () => {
    if (!output) return;
    if (copyToClipboard(output)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lorem-ipsum.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls */}
        <div className="lg:col-span-4 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase tracking-wider text-zinc-500 font-semibold">Paragraphs</span>
              <span className="text-accent-emerald font-bold">{paragraphs}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={paragraphs}
              onChange={(e) => setParagraphs(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase tracking-wider text-zinc-500 font-semibold">Sentences per Paragraph</span>
              <span className="text-accent-emerald font-bold">{sentencesPerPara}</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={sentencesPerPara}
              onChange={(e) => setSentencesPerPara(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-border-hairline/60 pt-4">
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={startWithClassic}
                onChange={(e) => setStartWithClassic(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              Start with "Lorem ipsum dolor sit amet…"
            </label>
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={asHtml}
                onChange={(e) => setAsHtml(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              Wrap paragraphs in HTML {"<p>"} tags
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
          >
            🎲 Generate
          </button>

          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

        {/* Output */}
        <div className="lg:col-span-8 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-3">
          <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Generated Text</h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.words} words • {stats.chars} characters
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!output}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono disabled:opacity-40 disabled:pointer-events-none"
              >
                Download .txt
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
            placeholder="Lorem ipsum will appear here..."
            className="w-full flex-grow bg-canvas border border-border-hairline rounded-lg p-3 font-sans text-xs md:text-sm text-zinc-200 resize-y leading-relaxed outline-none min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}
