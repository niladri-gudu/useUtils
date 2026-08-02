import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageMeta {
  file: File;
  url: string;
  width: number;
  height: number;
  type: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const mimeOf = (format: string): string =>
  format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : format === 'gif' ? 'image/gif' : format === 'bmp' ? 'image/bmp' : 'image/png';

const extOf = (format: string): string => (format === 'jpeg' ? 'jpg' : format);

const READ_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,image/avif';

export default function ImageFormatConverter() {
  const [original, setOriginal] = useState<ImageMeta | null>(null);
  const [format, setFormat] = useState<'webp' | 'jpeg' | 'png' | 'gif' | 'bmp'>('webp');
  const [quality, setQuality] = useState<number>(0.85);
  const [keepDimensions, setKeepDimensions] = useState<boolean>(true);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputSize, setOutputSize] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalRef = useRef<ImageMeta | null>(null);

  useEffect(() => {
    originalRef.current = original;
  }, [original]);

  useEffect(() => {
    return () => {
      if (originalRef.current) URL.revokeObjectURL(originalRef.current.url);
    };
  }, []);

  const readFile = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPEG, WebP, GIF, BMP, SVG, or AVIF).');
      return;
    }
    if (original) URL.revokeObjectURL(original.url);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const meta: ImageMeta = { file, url, width: img.naturalWidth, height: img.naturalHeight, type: file.type };
      setOriginal(meta);
      setOutputUrl('');
      setOutputSize(0);
    };
    img.onerror = () => setError('Could not load this image file.');
    img.src = url;
  }, [original]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleConvert = () => {
    if (!original) return;
    setProcessing(true);
    setError('');

    const img = new Image();
    img.onload = () => {
      try {
        const w = keepDimensions ? original.width : img.naturalWidth;
        const h = keepDimensions ? original.height : img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas is not supported in this browser.');
          setProcessing(false);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (format === 'jpeg' || format === 'bmp') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);

        const mime = mimeOf(format);
        const dataUrl = canvas.toDataURL(mime, format === 'png' || format === 'gif' || format === 'bmp' ? undefined : quality);
        setOutputUrl(dataUrl);
        setOutputSize(Math.round((dataUrl.length * 3) / 4));
        setProcessing(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to convert image.');
        setProcessing(false);
      }
    };
    img.onerror = () => {
      setError('Failed to render the image.');
      setProcessing(false);
    };
    img.src = original.url;
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `useutils-converted.${extOf(format)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formats: { id: typeof format; label: string; note: string }[] = [
    { id: 'webp', label: 'WebP', note: 'Best compression' },
    { id: 'jpeg', label: 'JPEG', note: 'Photos, small' },
    { id: 'png', label: 'PNG', note: 'Lossless + transparency' },
    { id: 'gif', label: 'GIF', note: 'Legacy, animation' },
    { id: 'bmp', label: 'BMP', note: 'Uncompressed' }
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      {!original && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all bg-panel ${
            dragOver ? 'border-accent-emerald bg-accent-emerald/5' : 'border-border-hairline hover:border-zinc-700'
          }`}
        >
          <span className="text-4xl">🔄</span>
          <span className="text-sm font-mono text-zinc-300">Drop an image here or <span className="text-accent-emerald font-semibold">browse</span></span>
          <span className="text-[10px] font-mono text-zinc-500">PNG • JPEG • WebP • GIF • BMP • SVG • AVIF — processed locally, never uploaded</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={READ_ACCEPT}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
          />
        </div>
      )}

      {original && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Conversion Settings</h3>
              <button
                type="button"
                onClick={() => {
                  if (original) URL.revokeObjectURL(original.url);
                  setOriginal(null);
                  setOutputUrl('');
                  setOutputSize(0);
                }}
                className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
              >
                New Image
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Original</span>
                <span className="text-zinc-300">{original.width} × {original.height}px • {formatBytes(original.file.size)} • {original.type.replace('image/', '').toUpperCase()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Target Format</span>
              <div className="grid grid-cols-1 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {formats.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { setFormat(f.id); setOutputUrl(''); setOutputSize(0); }}
                    className={`flex items-center justify-between px-3 py-2 rounded text-[10px] font-mono uppercase select-none cursor-pointer border transition-all ${
                      format === f.id
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[9px] font-normal normal-case ${format === f.id ? 'text-zinc-400' : 'text-zinc-600'}`}>{f.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {(format === 'jpeg' || format === 'webp') && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="uppercase tracking-wider text-zinc-500 font-semibold">Quality</span>
                  <span className="text-accent-emerald font-bold">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                />
                <span className="text-[9px] text-zinc-500 font-mono">
                  Lower quality = smaller file. 80–90% is usually visually lossless.
                </span>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={keepDimensions}
                onChange={(e) => setKeepDimensions(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              Preserve original dimensions
            </label>

            <button
              type="button"
              onClick={handleConvert}
              disabled={processing}
              className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {processing ? 'Converting…' : `⚙️ Convert to ${format.toUpperCase()}`}
            </button>

            <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
              <span className="text-accent-emerald">✓</span>
              Processed locally in browser. Zero server transmission.
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-3 gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Original</span>
                <img
                  src={original.url}
                  alt="Original preview"
                  className="w-full object-contain rounded border border-border-hairline bg-canvas max-h-48"
                />
                <span className="text-[10px] font-mono text-zinc-500">
                  {original.width} × {original.height}px • {formatBytes(original.file.size)}
                </span>
              </div>
              <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-3 gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Output</span>
                {outputUrl ? (
                  <img
                    src={outputUrl}
                    alt="Output preview"
                    className="w-full object-contain rounded border border-border-hairline bg-canvas max-h-48"
                  />
                ) : (
                  <div className="w-full flex items-center justify-center border border-dashed border-border-hairline rounded bg-canvas max-h-48 min-h-32">
                    <span className="text-[10px] text-zinc-500 font-mono">Click "Convert"</span>
                  </div>
                )}
                <span className="text-[10px] font-mono text-zinc-500">
                  {outputUrl ? `${original.width} × ${original.height}px • ${formatBytes(outputSize)}` : '—'}
                </span>
              </div>
            </div>

            {outputUrl && (
              <div className="flex flex-wrap items-center gap-3 bg-panel border border-border-hairline rounded-lg p-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">File Size</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {formatBytes(original.file.size)} → {formatBytes(outputSize)}
                    {outputSize < original.file.size && (
                      <span className="text-accent-emerald ml-2">-{Math.round(((original.file.size - outputSize) / original.file.size) * 100)}%</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="ml-auto px-4 py-2 text-xs bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold rounded-lg transition-all cursor-pointer"
                >
                  ⬇️ Download {format.toUpperCase()}
                </button>
              </div>
            )}
          </div>
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
