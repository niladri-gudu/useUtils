import React, { useState, useRef, useEffect, useMemo } from 'react';

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

const EMOJI_PRESETS = ['⚡', '🔧', '🚀', '🧪', '🛠️', '📦', '✨', '🔥', '💡', '🔍'];

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

export default function FaviconGenerator() {
  const [inputMode, setInputMode] = useState<'emoji' | 'text' | 'image'>('emoji');
  const [emoji, setEmoji] = useState<string>('⚡');
  const [text, setText] = useState<string>('U');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [size, setSize] = useState<number>(64);
  const [bgColor, setBgColor] = useState<string>('#34d399');
  const [textColor, setTextColor] = useState<string>('#0a0a0a');
  const [rounded, setRounded] = useState<boolean>(true);
  const [padding, setPadding] = useState<number>(8);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontScale = useMemo(() => Math.max(0.2, 1 - padding / 100), [padding]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [imageUrl, previewUrl]);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
  };

  const drawFavicon = (targetSize: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, targetSize, targetSize);

    const drawBg = () => {
      ctx.beginPath();
      if (rounded) {
        const radius = targetSize * 0.22;
        const r = Math.min(radius, targetSize / 2);
        ctx.roundRect(0, 0, targetSize, targetSize, r);
      } else {
        ctx.rect(0, 0, targetSize, targetSize);
      }
      ctx.fillStyle = bgColor;
      ctx.fill();
    };

    drawBg();

    const pad = (targetSize * padding) / 100;
    const inner = targetSize - pad * 2;

    if (inputMode === 'emoji') {
      ctx.font = `${inner * 0.9}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, targetSize / 2, targetSize / 2 + inner * 0.02);
    } else if (inputMode === 'text') {
      const displayText = text.slice(0, 3);
      const fontSize = inner * (displayText.length > 1 ? 0.55 : 0.75);
      ctx.font = `bold ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.fillText(displayText, targetSize / 2, targetSize / 2 + inner * 0.02);
    } else if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      ctx.save();
      if (rounded) {
        const radius = targetSize * 0.22;
        const r = Math.min(radius, targetSize / 2);
        ctx.beginPath();
        ctx.roundRect(0, 0, targetSize, targetSize, r);
        ctx.clip();
      }
      ctx.drawImage(img, pad, pad, inner, inner);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const handleGenerate = () => {
    setPreviewUrl(drawFavicon(size));
  };

  const handleDownload = (sizes: number[]) => {
    if (sizes.length === 1) {
      const dataUrl = drawFavicon(sizes[0]);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `favicon-${sizes[0]}x${sizes[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Multi-size PNG is not a standard favicon; download each size separately
      sizes.forEach((s, index) => {
        setTimeout(() => {
          const dataUrl = drawFavicon(s);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `favicon-${s}x${s}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 250);
      });
    }
  };

  const handleCopyDataUrl = () => {
    if (!previewUrl) return;
    if (copyToClipboard(previewUrl)) setCopied(true);
  };

  const [copied, setCopied] = useState<boolean>(false);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Content Type</span>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
              {(['emoji', 'text', 'image'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInputMode(mode)}
                  className={`px-2 py-1.5 rounded text-[10px] font-mono capitalize select-none cursor-pointer border transition-all ${
                    inputMode === mode
                      ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {mode === 'emoji' ? '😀 Emoji' : mode === 'text' ? 'Aa Text' : '🖼️ Image'}
                </button>
              ))}
            </div>
          </div>

          {inputMode === 'emoji' && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Choose Emoji</span>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJI_PRESETS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`text-lg py-1.5 rounded-lg border transition-all cursor-pointer ${
                      emoji === em
                        ? 'bg-zinc-800 border-accent-emerald/40'
                        : 'bg-zinc-900/30 border-border-hairline hover:border-zinc-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Or type any emoji / character"
                maxLength={2}
                className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              />
            </div>
          )}

          {inputMode === 'text' && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Text (up to 3 characters)</span>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 3))}
                placeholder="e.g. U"
                className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Text Color</span>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-9 bg-canvas border border-border-hairline rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {inputMode === 'image' && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Source Image (square works best)</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-zinc-900/40 border border-dashed border-border-hairline hover:border-zinc-700 rounded-lg p-6 text-xs font-mono text-zinc-400 cursor-pointer transition-colors"
              >
                {imageUrl ? '✓ Image loaded — click to replace' : 'Click to upload an image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
              {imageUrl && (
                <img src={imageUrl} alt="Source" className="w-16 h-16 object-contain rounded border border-border-hairline" />
              )}
            </div>
          )}

          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Output Size</span>
                <span className="text-accent-emerald font-bold">{size} × {size}px</span>
              </div>
              <div className="grid grid-cols-4 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`px-1 py-1 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                      size === s
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Background</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-9 bg-canvas border border-border-hairline rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Rounded Corners</span>
                <label className="flex items-center h-9 px-2 bg-canvas border border-border-hairline rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rounded}
                    onChange={(e) => setRounded(e.target.checked)}
                    className="rounded border-zinc-700 bg-canvas text-accent-emerald w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
                  />
                  <span className="ml-2 text-[10px] font-mono text-zinc-300">Enable</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Padding</span>
                <span className="text-accent-emerald font-bold">{padding}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={padding}
                onChange={(e) => setPadding(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
            >
              ⚡ Generate Favicon
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-6 bg-panel border border-border-hairline rounded-lg p-8 min-h-[280px]">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Preview</span>
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Favicon preview"
                  className="w-32 h-32 object-contain rounded border border-border-hairline bg-canvas"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex items-center gap-3">
                  <img src={previewUrl} alt="Favicon 16px" className="w-4 h-4 rounded-sm" />
                  <img src={previewUrl} alt="Favicon 32px" className="w-6 h-6 rounded-sm" />
                  <img src={previewUrl} alt="Favicon 48px" className="w-8 h-8 rounded-sm" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">👁️</span>
                <span className="text-xs text-zinc-500 font-mono max-w-xs leading-relaxed">
                  Configure your favicon on the left, then click "Generate Favicon" to preview it here.
                </span>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="flex flex-col gap-3 bg-panel border border-border-hairline rounded-lg p-4">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Download</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload([32])}
                  className="px-3 py-2 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold"
                >
                  ⬇️ 32×32
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload([size])}
                  className="px-3 py-2 text-[10px] bg-accent-emerald hover:bg-emerald-400 text-zinc-950 rounded cursor-pointer transition-all font-mono font-semibold"
                >
                  ⬇️ {size}×{size}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload([16, 32, 48, 64])}
                  className="px-3 py-2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
                >
                  ⬇️ All Sizes
                </button>
                <button
                  type="button"
                  onClick={handleCopyDataUrl}
                  className="px-3 py-2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
                >
                  {copied ? 'Copied ✓' : '📋 Copy Data URL'}
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
                <span className="text-accent-emerald">✓</span>
                Processed locally in browser. Zero server transmission.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
