import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';

type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

const EC_LEVELS: Array<{ id: ErrorCorrection; name: string; desc: string }> = [
  { id: 'L', name: 'Low', desc: '7%' },
  { id: 'M', name: 'Medium', desc: '15%' },
  { id: 'Q', name: 'Quartile', desc: '25%' },
  { id: 'H', name: 'High', desc: '30%' }
];

const PRESETS = [
  { id: 'url', name: 'URL', icon: '🔗', value: 'https://useutils.com' },
  { id: 'wifi', name: 'Wi-Fi', icon: '📶', value: 'WIFI:T:WPA;S:MyNetwork;P:MyPassword123;;' },
  { id: 'text', name: 'Plain Text', icon: '📝', value: 'Hello, useUtils!' },
  { id: 'email', name: 'Email', icon: '✉️', value: 'mailto:hello@example.com?subject=Hello&body=Hi there' },
  { id: 'vcard', name: 'vCard', icon: '👤', value: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+15551234567\nEMAIL:john@example.com\nEND:VCARD' },
  { id: 'sms', name: 'SMS', icon: '💬', value: 'SMSTO:+15551234567:Hello from useUtils' },
  { id: 'geo', name: 'Location', icon: '📍', value: 'geo:37.7749,-122.4194?z=15' },
  { id: 'paypal', name: 'Payment', icon: '💳', value: 'PYP:example@email.com' }
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

export default function QrCodeGenerator() {
  const [text, setText] = useState<string>('https://useutils.com');
  const [errorLevel, setErrorLevel] = useState<ErrorCorrection>('M');
  const [moduleSize, setModuleSize] = useState<number>(8);
  const [margin, setMargin] = useState<number>(4);
  const [darkColor, setDarkColor] = useState<string>('#111111');
  const [lightColor, setLightColor] = useState<string>('#ffffff');
  const [renderMode, setRenderMode] = useState<'png' | 'svg'>('png');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const normalizedText = useMemo(() => text.trim(), [text]);

  useEffect(() => {
    if (!normalizedText) {
      setQrDataUrl('');
      setQrSvg('');
      setError('');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const opts = {
        errorCorrectionLevel: errorLevel,
        margin,
        color: { dark: darkColor, light: lightColor },
        width: moduleSize * 29
      };
      try {
        const dataUrl = await QRCode.toDataURL(normalizedText, { ...opts, type: 'png' });
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setError('');
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to generate QR code');
          setQrDataUrl('');
        }
      }
      try {
        const svg = await QRCode.toString(normalizedText, { ...opts, type: 'svg', width: 320 });
        if (!cancelled) setQrSvg(svg);
      } catch {
        /* svg optional */
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [normalizedText, errorLevel, moduleSize, margin, darkColor, lightColor]);

  // Re-render on canvas whenever PNG mode is active
  useEffect(() => {
    if (renderMode === 'png' && qrDataUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, img.width, img.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = qrDataUrl;
    }
  }, [qrDataUrl, renderMode]);

  const handleDownload = (format: 'png' | 'svg') => {
    if (format === 'png' && qrDataUrl) {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = 'useutils-qr-code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'useutils-qr-code.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = async (kind: 'svg' | 'url') => {
    const target = kind === 'svg' ? qrSvg : qrDataUrl;
    if (!target) return;
    const ok = copyToClipboard(target);
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(''), 1500);
    }
  };

  const applyPreset = (value: string) => {
    setText(value);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              QR Code Content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type text or paste a URL..."
              rows={4}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-y leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800"
            />
            <span className="text-[9px] text-zinc-500 font-mono">
              {normalizedText.length} characters
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className="px-2 py-1.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>{p.icon}</span> {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border-hairline/60 pt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Error Correction Level</span>
              <div className="grid grid-cols-4 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
                {EC_LEVELS.map(ec => (
                  <button
                    key={ec.id}
                    type="button"
                    onClick={() => setErrorLevel(ec.id)}
                    className={`px-2 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                      errorLevel === ec.id
                        ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {ec.name}
                    <span className="block text-[8px] text-zinc-500">{ec.desc}</span>
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-zinc-500 font-mono leading-relaxed">
                Higher correction keeps the code scannable even when partially covered or damaged.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Size</span>
                <span className="text-accent-emerald font-bold">{moduleSize}px / module</span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                value={moduleSize}
                onChange={(e) => setModuleSize(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Quiet Zone Margin</span>
                <span className="text-accent-emerald font-bold">{margin} blocks</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Foreground</span>
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-full h-9 bg-canvas border border-border-hairline rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Background</span>
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-full h-9 bg-canvas border border-border-hairline rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-7 flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-5">
          <div className="flex justify-between items-center border-b border-border-hairline/40 pb-3">
            <div className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Live QR Code Preview
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {errorLevel} correction • {margin} margin
              </span>
            </div>
            <div className="flex gap-1 bg-zinc-900 border border-border-hairline/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setRenderMode('png')}
                className={`px-3 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-all border ${
                  renderMode === 'png'
                    ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('svg')}
                className={`px-3 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-all border ${
                  renderMode === 'svg'
                    ? 'bg-zinc-800 text-accent-emerald border-zinc-700 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SVG
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 py-6 bg-canvas border border-border-hairline rounded-lg min-h-[280px]">
            {error ? (
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <span className="text-3xl">⚠️</span>
                <span className="text-xs text-red-400 font-mono leading-relaxed max-w-sm">{error}</span>
              </div>
            ) : renderMode === 'png' && qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code encoding: ${normalizedText}`}
                className="w-56 h-56 md:w-64 md:h-64 object-contain"
                style={{ backgroundColor: lightColor }}
              />
            ) : renderMode === 'svg' && qrSvg ? (
              <div className="w-56 h-56 md:w-64 md:h-64" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            ) : (
              <span className="text-xs text-zinc-500 font-mono">Enter content to generate…</span>
            )}
          </div>

          {qrDataUrl && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleDownload('png')}
                className="px-2 py-2 text-[10px] bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/20 text-accent-emerald rounded cursor-pointer transition-all font-mono font-semibold"
              >
                ⬇️ Download PNG
              </button>
              <button
                type="button"
                onClick={() => handleDownload('svg')}
                className="px-2 py-2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
              >
                ⬇️ Download SVG
              </button>
              <button
                type="button"
                onClick={() => handleCopy('url')}
                className="px-2 py-2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
              >
                {copied === 'url' ? 'Copied ✓' : '📋 Copy PNG'}
              </button>
              <button
                type="button"
                onClick={() => handleCopy('svg')}
                className="px-2 py-2 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer transition-colors font-mono"
              >
                {copied === 'svg' ? 'Copied ✓' : '📋 Copy SVG'}
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>
      </div>
    </div>
  );
}
