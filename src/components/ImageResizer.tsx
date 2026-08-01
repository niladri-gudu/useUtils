import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageMeta {
  file: File;
  url: string;
  width: number;
  height: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

export default function ImageResizer() {
  const [original, setOriginal] = useState<ImageMeta | null>(null);
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [keepRatio, setKeepRatio] = useState<boolean>(true);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('webp');
  const [quality, setQuality] = useState<number>(0.85);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputSize, setOutputSize] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalRef = useRef<ImageMeta | null>(null);

  // Keep a ref to the latest original so the unmount cleanup can revoke its blob URL
  useEffect(() => {
    originalRef.current = original;
  }, [original]);

  useEffect(() => {
    return () => {
      // Revoke blob URLs only on unmount. outputUrl is a data: URL and needs no revocation.
      if (originalRef.current) URL.revokeObjectURL(originalRef.current.url);
    };
  }, []);

  const readFile = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPEG, WebP, GIF, SVG, or BMP).');
      return;
    }
    if (original) URL.revokeObjectURL(original.url);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const meta: ImageMeta = { file, url, width: img.naturalWidth, height: img.naturalHeight };
      setOriginal(meta);
      setTargetWidth(img.naturalWidth);
      setTargetHeight(img.naturalHeight);
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

  const handleWidthChange = (value: string) => {
    const w = Math.max(1, parseInt(value) || 0);
    setTargetWidth(w);
    if (keepRatio && original && original.height > 0) {
      setTargetHeight(Math.round((w * original.height) / original.width));
    }
  };

  const handleHeightChange = (value: string) => {
    const h = Math.max(1, parseInt(value) || 0);
    setTargetHeight(h);
    if (keepRatio && original && original.width > 0) {
      setTargetWidth(Math.round((h * original.width) / original.height));
    }
  };

  const handleProcess = () => {
    if (!original || targetWidth <= 0 || targetHeight <= 0) return;
    setProcessing(true);
    setError('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas is not supported in this browser.');
          setProcessing(false);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = canvas.toDataURL(mime, format === 'png' ? undefined : quality);
        setOutputUrl(dataUrl);
        setOutputSize(Math.round((dataUrl.length * 3) / 4));
        setProcessing(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to process image.');
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
    const ext = format === 'jpeg' ? 'jpg' : format;
    link.href = outputUrl;
    link.download = `useutils-image-${targetWidth}x${targetHeight}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const savings = original && outputSize > 0 ? original.file.size - outputSize : 0;
  const savingsPct = original && outputSize > 0 ? Math.round((savings / original.file.size) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Upload / Drop Zone */}
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
          <span className="text-4xl">🖼️</span>
          <span className="text-sm font-mono text-zinc-300">Drop an image here or <span className="text-accent-emerald font-semibold">browse</span></span>
          <span className="text-[10px] font-mono text-zinc-500">PNG • JPEG • WebP • GIF • SVG — processed locally, never uploaded</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
          />
        </div>
      )}

      {original && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">Resize & Compress Settings</h3>
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
                <span className="text-zinc-300">{original.width} × {original.height}px • {formatBytes(original.file.size)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={targetWidth || ''}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={targetHeight || ''}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={keepRatio}
                onChange={(e) => setKeepRatio(e.target.checked)}
                className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
              />
              Maintain aspect ratio
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Output Format</span>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {(['webp', 'jpeg', 'png'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`px-2 py-1.5 rounded text-[10px] font-mono uppercase select-none cursor-pointer border transition-all ${
                      format === f
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {format !== 'png' && (
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

            <button
              type="button"
              onClick={handleProcess}
              disabled={processing}
              className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {processing ? 'Processing…' : '⚙️ Resize & Compress'}
            </button>

            <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
              <span className="text-accent-emerald">✓</span>
              Processed locally in browser. Zero server transmission.
            </div>
          </div>

          {/* Previews */}
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
                    <span className="text-[10px] text-zinc-500 font-mono">Click "Resize & Compress"</span>
                  </div>
                )}
                <span className="text-[10px] font-mono text-zinc-500">
                  {outputUrl ? `${targetWidth} × ${targetHeight}px • ${formatBytes(outputSize)}` : '—'}
                </span>
              </div>
            </div>

            {outputUrl && (
              <div className="flex flex-wrap items-center gap-3 bg-panel border border-border-hairline rounded-lg p-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">File Size</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {formatBytes(original.file.size)} → {formatBytes(outputSize)}
                    <span className={savings >= 0 ? 'text-accent-emerald ml-2' : 'text-amber-500 ml-2'}>
                      {savings >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                    </span>
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
