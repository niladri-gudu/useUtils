import React, { useState, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

type Format = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'Code39' | 'Code93' | 'Codabar';

const FORMATS: { id: Format; label: string; hint: string; length: string }[] = [
  { id: 'CODE128', label: 'Code 128', hint: 'All ASCII', length: 'Any' },
  { id: 'EAN13', label: 'EAN-13', hint: 'Retail', length: '13 digits' },
  { id: 'EAN8', label: 'EAN-8', hint: 'Retail', length: '8 digits' },
  { id: 'UPC', label: 'UPC-A', hint: 'Retail (US)', length: '12 digits' },
  { id: 'ITF14', label: 'ITF-14', hint: 'Logistics', length: '14 digits' },
  { id: 'Code39', label: 'Code 39', hint: 'Industrial', length: 'Any (A-Z0-9 -.$/+%)' },
  { id: 'Code93', label: 'Code 93', hint: 'Compact', length: 'Any' },
  { id: 'Codabar', label: 'Codabar', hint: 'Libraries', length: 'Digits A-D' }
];

export default function BarcodeGenerator() {
  const [value, setValue] = useState('US-UTILS-001');
  const [format, setFormat] = useState<Format>('CODE128');
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(60);
  const [fontSize, setFontSize] = useState(14);
  const [showText, setShowText] = useState(true);
  const [color, setColor] = useState('#000000');
  const [background, setBackground] = useState('#ffffff');
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    setError('');
    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        fontSize,
        displayValue: showText,
        lineColor: color,
        background,
        margin: 10
      });
    } catch (e: any) {
      setError(e?.message || 'Could not generate a barcode for this value and format.');
    }
  }, [value, format, width, height, fontSize, showText, color, background]);

  const downloadPng = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = svg.width.baseVal.value * scale;
      canvas.height = svg.height.baseVal.value * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `barcode-${format}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = url;
  };

  const downloadSvg = () => {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-${format}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Barcode Value</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter a value to encode…"
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
            />
            {format !== 'CODE128' && (
              <p className="text-[9px] text-zinc-500 font-mono">
                {FORMATS.find(f => f.id === format)?.length} required for {format}.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Format</span>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900/30 border border-border-hairline/60 p-1 rounded-lg">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  title={f.hint}
                  className={`px-2 py-1.5 rounded text-[10px] font-mono select-none cursor-pointer border transition-all ${
                    format === f.id
                      ? 'bg-zinc-800 border-zinc-700 text-accent-emerald font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Bar Width</span>
                <span className="text-accent-emerald font-bold">{width}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Height</span>
                <span className="text-accent-emerald font-bold">{height}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">Font Size</span>
                <span className="text-accent-emerald font-bold">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={30}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Colors</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 cursor-pointer bg-canvas border border-border-hairline rounded p-0.5" />
                  <span className="text-[9px] font-mono text-zinc-500">Bars</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="w-7 h-7 cursor-pointer bg-canvas border border-border-hairline rounded p-0.5" />
                  <span className="text-[9px] font-mono text-zinc-500">Bg</span>
                </label>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showText}
              onChange={(e) => setShowText(e.target.checked)}
              className="rounded border-zinc-700 bg-canvas text-accent-emerald focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-accent-emerald"
            />
            Show value text under barcode
          </label>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-panel border border-border-hairline rounded-lg p-6 flex flex-col items-center gap-4">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono self-start">Preview</span>
            <div className="flex items-center justify-center bg-canvas border border-border-hairline rounded-lg p-6 min-h-48 w-full overflow-x-auto">
              <svg ref={svgRef} className="max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadPng}
                disabled={!!error}
                className="px-3 py-2 text-xs bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                ⬇️ Download PNG
              </button>
              <button
                type="button"
                onClick={downloadSvg}
                disabled={!!error}
                className="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-mono font-semibold rounded-lg border border-zinc-700 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                ⬇️ Download SVG
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">
              ⚠️ {error}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
            <span className="text-accent-emerald">✓</span>
            Generated locally in browser. Zero server transmission.
          </div>
        </div>
      </div>
    </div>
  );
}
