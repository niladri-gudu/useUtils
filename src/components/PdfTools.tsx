import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';

type PdfTool = 'merge' | 'split' | 'compress' | 'extract';

interface LoadedPdf {
  id: number;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const loadPdfBytes = async (file: File): Promise<{ bytes: Uint8Array; doc: PDFDocument }> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { bytes, doc };
};

const parseRanges = (input: string, maxPage: number): number[] => {
  const result: number[] = [];
  const parts = input.split(',').map(p => p.trim());
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(n => parseInt(n, 10));
      if (isNaN(a) || isNaN(b)) continue;
      const from = Math.max(1, Math.min(a, b));
      const to = Math.max(1, Math.max(a, b));
      for (let p = from; p <= Math.min(to, maxPage); p++) result.push(p);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= maxPage) result.push(n);
    }
  }
  return [...new Set(result)].sort((x, y) => x - y);
};

export default function PdfTools({ defaultTool = 'merge' }: { defaultTool?: PdfTool }) {
  const [activeTab, setActiveTab] = useState<PdfTool>(defaultTool);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Merge state
  const [mergeList, setMergeList] = useState<LoadedPdf[]>([]);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Split state
  const [splitPdf, setSplitPdf] = useState<LoadedPdf | null>(null);
  const [splitEvery, setSplitEvery] = useState<number>(1);
  const splitInputRef = useRef<HTMLInputElement>(null);

  // Compress state
  const [compressPdf, setCompressPdf] = useState<LoadedPdf | null>(null);
  const [compressResult, setCompressResult] = useState<{ bytes: number; name: string } | null>(null);
  const compressInputRef = useRef<HTMLInputElement>(null);

  // Extract state
  const [extractPdf, setExtractPdf] = useState<LoadedPdf | null>(null);
  const [extractRanges, setExtractRanges] = useState<string>('');
  const extractInputRef = useRef<HTMLInputElement>(null);

  const loadPdf = async (file: File): Promise<LoadedPdf> => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error(`"${file.name}" is not a PDF file.`);
    }
    const { doc } = await loadPdfBytes(file);
    return { id: Date.now() + Math.random(), name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), pageCount: doc.getPageCount() };
  };

  const handleMergeFiles = async (files: FileList | File[]) => {
    setError('');
    setMessage('');
    try {
      const loaded: LoadedPdf[] = [];
      for (const file of Array.from(files)) {
        loaded.push(await loadPdf(file));
      }
      setMergeList(prev => [...prev, ...loaded]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF.');
    }
  };

  const moveMergeItem = (index: number, dir: -1 | 1) => {
    setMergeList(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleMerge = async () => {
    if (mergeList.length < 2) {
      setError('Add at least two PDF files to merge.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('Merging PDFs…');
    try {
      const dest = await PDFDocument.create();
      for (const item of mergeList) {
        const src = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const pages = await dest.copyPages(src, src.getPageIndices());
        pages.forEach(p => dest.addPage(p));
      }
      const out = await dest.save({ useObjectStreams: true });
      downloadBytes(out, `merged-${mergeList.length}-pdfs.pdf`);
      setMessage(`Merged ${mergeList.reduce((s, p) => s + p.pageCount, 0)} pages.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to merge PDFs.');
    } finally {
      setBusy(false);
    }
  };

  const handleSplitFile = async (file: File) => {
    setError('');
    try {
      const loaded = await loadPdf(file);
      setSplitPdf(loaded);
      setCompressResult(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleSplit = async () => {
    if (!splitPdf) return;
    setBusy(true);
    setError('');
    setMessage('Splitting PDF…');
    try {
      const src = await PDFDocument.load(splitPdf.bytes, { ignoreEncryption: true });
      const total = src.getPageCount();
      const groups: number[][] = [];
      const every = Math.max(1, splitEvery);
      for (let start = 0; start < total; start += every) {
        groups.push(Array.from({ length: Math.min(every, total - start) }, (_, i) => start + i));
      }
      const baseName = splitPdf.name.replace(/\.pdf$/i, '');
      let delay = 0;
      for (let g = 0; g < groups.length; g++) {
        const doc = await PDFDocument.create();
        const pages = await doc.copyPages(src, groups[g]);
        pages.forEach(p => doc.addPage(p));
        const out = await doc.save({ useObjectStreams: true });
        const name = groups.length === 1 ? `${baseName}-part-${g + 1}.pdf` : `${baseName}-part-${g + 1}.pdf`;
        setTimeout(() => downloadBytes(out, name), delay);
        delay += 300;
      }
      setMessage(`Split into ${groups.length} part${groups.length > 1 ? 's' : ''}.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to split PDF.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompressFile = async (file: File) => {
    setError('');
    try {
      const loaded = await loadPdf(file);
      setCompressPdf(loaded);
      setCompressResult(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleCompress = async () => {
    if (!compressPdf) return;
    setBusy(true);
    setError('');
    setMessage('Compressing PDF…');
    try {
      const doc = await PDFDocument.load(compressPdf.bytes, { ignoreEncryption: true });
      const out = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50
      });
      setCompressResult({ bytes: out.length, name: compressPdf.name.replace(/\.pdf$/i, '') + '-compressed.pdf' });
      setMessage('Compression complete.');
    } catch (e: any) {
      setError(e?.message || 'Failed to compress PDF.');
    } finally {
      setBusy(false);
    }
  };

  const handleExtractFile = async (file: File) => {
    setError('');
    try {
      const loaded = await loadPdf(file);
      setExtractPdf(loaded);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF.');
    }
  };

  const handleExtract = async () => {
    if (!extractPdf) return;
    setBusy(true);
    setError('');
    const pages = parseRanges(extractRanges, extractPdf.pageCount);
    if (pages.length === 0) {
      setError('Enter valid page numbers or ranges (e.g. 1-3, 5, 8).');
      setBusy(false);
      return;
    }
    setMessage('Extracting pages…');
    try {
      const src = await PDFDocument.load(extractPdf.bytes, { ignoreEncryption: true });
      const doc = await PDFDocument.create();
      const copied = await doc.copyPages(src, pages.map(p => p - 1));
      copied.forEach(p => doc.addPage(p));
      const out = await doc.save({ useObjectStreams: true });
      downloadBytes(out, `${extractPdf.name.replace(/\.pdf$/i, '')}-extracted-${pages.length}p.pdf`);
      setMessage(`Extracted ${pages.length} page${pages.length > 1 ? 's' : ''}.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to extract pages.');
    } finally {
      setBusy(false);
    }
  };

  const resetMerge = () => {
    setMergeList([]);
    setError('');
    setMessage('');
  };

  const DropZone = ({ onClick, hint, multi }: { onClick: () => void; hint: string; multi?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-hairline hover:border-zinc-700 rounded-xl p-8 cursor-pointer transition-all bg-zinc-900/20"
    >
      <span className="text-3xl">{multi ? '📂' : '📄'}</span>
      <span className="text-sm font-mono text-zinc-300">Click to {multi ? 'choose PDF files' : 'choose a PDF'}</span>
      <span className="text-[10px] font-mono text-zinc-500">{hint}</span>
    </button>
  );

  const TabButton = ({ id, label }: { id: PdfTool; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-1.5 rounded-md text-xs font-mono select-none cursor-pointer transition-all duration-75 border ${
        activeTab === id
          ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
          : 'text-zinc-400 hover:text-zinc-200 border-transparent'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-border-hairline rounded-lg w-full flex-wrap">
        <TabButton id="merge" label="Merge PDFs" />
        <TabButton id="split" label="Split PDF" />
        <TabButton id="compress" label="Compress" />
        <TabButton id="extract" label="Extract Pages" />
      </div>

      {/* Merge */}
      {activeTab === 'merge' && (
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-3">
            <DropZone
              onClick={() => mergeInputRef.current?.click()}
              multi
              hint="Multiple files supported — order matters for the merged result"
            />
            <input
              ref={mergeInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleMergeFiles(e.target.files)}
            />
          </div>

          {mergeList.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Files to merge ({mergeList.length}) • {mergeList.reduce((s, p) => s + p.pageCount, 0)} pages
                </span>
                <button
                  type="button"
                  onClick={resetMerge}
                  className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {mergeList.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-2.5">
                    <span className="text-[10px] font-mono text-zinc-500 w-6 text-right">{index + 1}.</span>
                    <span className="text-xs font-mono text-zinc-200 truncate flex-1">{item.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{item.pageCount}p</span>
                    <button
                      type="button"
                      onClick={() => moveMergeItem(index, -1)}
                      disabled={index === 0}
                      className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 text-zinc-300 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMergeItem(index, 1)}
                      disabled={index === mergeList.length - 1}
                      className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 text-zinc-300 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergeList(prev => prev.filter(p => p.id !== item.id))}
                      className="px-1.5 py-0.5 text-[10px] bg-red-950/30 rounded border border-red-900/40 text-red-400 cursor-pointer font-mono"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleMerge}
                disabled={busy || mergeList.length < 2}
                className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {busy ? 'Merging…' : '⬇️ Merge & Download PDF'}
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Your PDFs never leave your device.
          </div>
        </div>
      )}

      {/* Split */}
      {activeTab === 'split' && (
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          {!splitPdf ? (
            <DropZone onClick={() => splitInputRef.current?.click()} hint="The PDF will be split into separate files" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-200 truncate max-w-xs">{splitPdf.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{splitPdf.pageCount} pages</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSplitPdf(null); setError(''); }}
                  className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                >
                  Choose Another
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="uppercase tracking-wider text-zinc-500 font-semibold">Pages per part</span>
                  <span className="text-accent-emerald font-bold">{splitEvery}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.max(splitPdf.pageCount, 1)}
                  value={splitEvery}
                  onChange={(e) => setSplitEvery(parseInt(e.target.value))}
                  className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                />
                <span className="text-[10px] text-zinc-500 font-mono">
                  {splitEvery >= splitPdf.pageCount ? 'Produces 1 part' : `Produces ~${Math.ceil(splitPdf.pageCount / splitEvery)} parts`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSplit}
                disabled={busy}
                className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {busy ? 'Splitting…' : '⬇️ Split & Download Parts'}
              </button>
            </div>
          )}
          <input
            ref={splitInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleSplitFile(e.target.files[0])}
          />
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Your PDFs never leave your device.
          </div>
        </div>
      )}

      {/* Compress */}
      {activeTab === 'compress' && (
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          {!compressPdf ? (
            <DropZone onClick={() => compressInputRef.current?.click()} hint="Reduce PDF file size by re-serializing the document" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-200 truncate max-w-xs">{compressPdf.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {formatBytes(compressPdf.bytes.length)} • {compressPdf.pageCount} pages
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCompressPdf(null); setCompressResult(null); setError(''); }}
                  className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                >
                  Choose Another
                </button>
              </div>
              <button
                type="button"
                onClick={handleCompress}
                disabled={busy}
                className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {busy ? 'Compressing…' : '🗜️ Compress PDF'}
              </button>
              {compressResult && (
                <div className="bg-zinc-900/30 border border-accent-emerald/30 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Result</span>
                    {compressResult.bytes < compressPdf.bytes.length && (
                      <span className="text-xs font-mono text-accent-emerald font-semibold">
                        -{Math.round(((compressPdf.bytes.length - compressResult.bytes) / compressPdf.bytes.length) * 100)}%
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-mono text-zinc-200">
                    {formatBytes(compressPdf.bytes.length)} → {formatBytes(compressResult.bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadBytes(new Uint8Array(compressResult.bytes as unknown as ArrayBuffer), compressResult.name)}
                    className="mt-1 px-3 py-2 text-[10px] bg-accent-emerald hover:bg-emerald-400 text-zinc-950 rounded cursor-pointer font-mono font-semibold self-start"
                  >
                    ⬇️ Download Compressed PDF
                  </button>
                </div>
              )}
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                This compressor re-serializes the PDF with object streams, removing redundant structure. For maximum reduction of image-heavy PDFs, re-compress the images first with an image tool.
              </p>
            </div>
          )}
          <input
            ref={compressInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCompressFile(e.target.files[0])}
          />
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Your PDFs never leave your device.
          </div>
        </div>
      )}

      {/* Extract */}
      {activeTab === 'extract' && (
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          {!extractPdf ? (
            <DropZone onClick={() => extractInputRef.current?.click()} hint="Extract specific pages into a new PDF" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-200 truncate max-w-xs">{extractPdf.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{extractPdf.pageCount} pages</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setExtractPdf(null); setError(''); }}
                  className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
                >
                  Choose Another
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Pages to Extract</label>
                <input
                  type="text"
                  value={extractRanges}
                  onChange={(e) => setExtractRanges(e.target.value)}
                  placeholder={`e.g. 1-3, 5, 8 (max ${extractPdf.pageCount})`}
                  className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
                />
                <span className="text-[10px] text-zinc-500 font-mono">
                  Supports ranges (1-3), single pages (5), and combinations (1-3, 5, 8).
                </span>
              </div>
              <button
                type="button"
                onClick={handleExtract}
                disabled={busy}
                className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {busy ? 'Extracting…' : '⬇️ Extract Pages'}
              </button>
            </div>
          )}
          <input
            ref={extractInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleExtractFile(e.target.files[0])}
          />
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Your PDFs never leave your device.
          </div>
        </div>
      )}

      {busy && (
        <div className="bg-zinc-900/40 border border-border-hairline rounded-lg p-3 text-xs font-mono text-accent-emerald">
          ⏳ {message || 'Processing…'}
        </div>
      )}

      {error && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
