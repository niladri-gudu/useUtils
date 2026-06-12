import React, { useState, useEffect, useRef } from 'react';
import {
  hslToRgb,
  rgbToHsl,
  rgbToHex,
  parseColorString,
  getLuminance,
  getContrastRatio,
  findNearestTailwindColor,
  type ParsedColor
} from '../utils-engine/color';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy if writeText fails
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
};


// ==========================================
// Main Color Converter Component
// ==========================================
export const ColorConverter: React.FC = () => {
  // Main State
  const [r, setR] = useState<number>(52);
  const [g, setG] = useState<number>(211);
  const [b, setB] = useState<number>(153);
  const [h, setH] = useState<number>(158);
  const [s, setS] = useState<number>(64);
  const [l, setL] = useState<number>(52);
  const [a, setA] = useState<number>(1.0);

  // Inputs Text Sync States (to allow fluid typing without cursor jump)
  const [smartInput, setSmartInput] = useState<string>('rgb(52, 211, 153)');
  const [hexInput, setHexInput] = useState<string>('#34D399');
  const [rgbInput, setRgbInput] = useState<string>('rgb(52, 211, 153)');
  const [hslInput, setHslInput] = useState<string>('hsl(158, 64%, 52%)');

  // Parse Errors
  const [smartError, setSmartError] = useState<boolean>(false);
  const [hexError, setHexError] = useState<boolean>(false);
  const [rgbError, setRgbError] = useState<boolean>(false);
  const [hslError, setHslError] = useState<boolean>(false);

  // Feedback states
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Synchronizers: Run when RGB changes
  const updateFromRgb = (newR: number, newG: number, newB: number, newAlpha: number = a, skipFormat: 'hex' | 'rgb' | 'hsl' | 'smart' | null = null) => {
    const [newH, newS, newL] = rgbToHsl(newR, newG, newB);
    
    setR(newR);
    setG(newG);
    setB(newB);
    setH(newH);
    setS(newS);
    setL(newL);
    setA(newAlpha);

    // Sync Text inputs
    const formattedHex = rgbToHex(newR, newG, newB, newAlpha);
    const formattedRgb = newAlpha < 1 
      ? `rgba(${newR}, ${newG}, ${newB}, ${newAlpha})` 
      : `rgb(${newR}, ${newG}, ${newB})`;
    const formattedHsl = newAlpha < 1 
      ? `hsla(${newH}, ${newS}%, ${newL}%, ${newAlpha})` 
      : `hsl(${newH}, ${newS}%, ${newL}%)`;

    if (skipFormat !== 'hex') {
      setHexInput(formattedHex);
      setHexError(false);
    }
    if (skipFormat !== 'rgb') {
      setRgbInput(formattedRgb);
      setRgbError(false);
    }
    if (skipFormat !== 'hsl') {
      setHslInput(formattedHsl);
      setHslError(false);
    }
    if (skipFormat !== 'smart') {
      // Pick RGB or HSL representation to display as standard
      setSmartInput(formattedRgb);
      setSmartError(false);
    }
  };

  // Synchronizers: Run when HSL changes
  const updateFromHsl = (newH: number, newS: number, newL: number, newAlpha: number = a, skipFormat: 'hex' | 'rgb' | 'hsl' | 'smart' | null = null) => {
    const [newR, newG, newB] = hslToRgb(newH, newS, newL);
    
    setR(newR);
    setG(newG);
    setB(newB);
    setH(newH);
    setS(newS);
    setL(newL);
    setA(newAlpha);

    // Sync Text inputs
    const formattedHex = rgbToHex(newR, newG, newB, newAlpha);
    const formattedRgb = newAlpha < 1 
      ? `rgba(${newR}, ${newG}, ${newB}, ${newAlpha})` 
      : `rgb(${newR}, ${newG}, ${newB})`;
    const formattedHsl = newAlpha < 1 
      ? `hsla(${newH}, ${newS}%, ${newL}%, ${newAlpha})` 
      : `hsl(${newH}, ${newS}%, ${newL}%)`;

    if (skipFormat !== 'hex') {
      setHexInput(formattedHex);
      setHexError(false);
    }
    if (skipFormat !== 'rgb') {
      setRgbInput(formattedRgb);
      setRgbError(false);
    }
    if (skipFormat !== 'hsl') {
      setHslInput(formattedHsl);
      setHslError(false);
    }
    if (skipFormat !== 'smart') {
      setSmartInput(formattedHsl);
      setSmartError(false);
    }
  };

  // Handles input changes
  const handleSmartInputChange = (val: string) => {
    setSmartInput(val);
    const parsed = parseColorString(val);
    if (parsed) {
      setSmartError(false);
      updateFromRgb(parsed.r, parsed.g, parsed.b, parsed.a, 'smart');
    } else {
      setSmartError(true);
    }
  };

  const handleHexInputChange = (val: string) => {
    setHexInput(val);
    const parsed = parseColorString(val);
    if (parsed) {
      setHexError(false);
      updateFromRgb(parsed.r, parsed.g, parsed.b, parsed.a, 'hex');
    } else {
      setHexError(true);
    }
  };

  const handleRgbInputChange = (val: string) => {
    setRgbInput(val);
    const parsed = parseColorString(val);
    if (parsed) {
      setRgbError(false);
      updateFromRgb(parsed.r, parsed.g, parsed.b, parsed.a, 'rgb');
    } else {
      setRgbError(true);
    }
  };

  const handleHslInputChange = (val: string) => {
    setHslInput(val);
    const parsed = parseColorString(val);
    if (parsed) {
      setHslError(false);
      updateFromHsl(parsed.h, parsed.s, parsed.l, parsed.a, 'hsl');
    } else {
      setHslError(true);
    }
  };

  // Sliders Change Handlers
  const handleRgbSliderChange = (channel: 'r' | 'g' | 'b' | 'a', val: number) => {
    let nr = r, ng = g, nb = b, na = a;
    if (channel === 'r') nr = val;
    if (channel === 'g') ng = val;
    if (channel === 'b') nb = val;
    if (channel === 'a') na = val;
    updateFromRgb(nr, ng, nb, na);
  };

  const handleHslSliderChange = (channel: 'h' | 's' | 'l' | 'a', val: number) => {
    let nh = h, ns = s, nl = l, na = a;
    if (channel === 'h') nh = val;
    if (channel === 's') ns = val;
    if (channel === 'l') nl = val;
    if (channel === 'a') na = val;
    updateFromHsl(nh, ns, nl, na);
  };

  // Color picker handler
  const handleNativeColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // Returns #RRGGBB
    const parsed = parseColorString(val);
    if (parsed) {
      updateFromRgb(parsed.r, parsed.g, parsed.b, a);
    }
  };

  // Randomize Color
  const handleRandomizeColor = () => {
    const nr = Math.floor(Math.random() * 256);
    const ng = Math.floor(Math.random() * 256);
    const nb = Math.floor(Math.random() * 256);
    // Keep alpha but randomize channels
    updateFromRgb(nr, ng, nb, a);
  };

  // Trigger copy feedback
  const triggerCopy = (text: string, format: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  // Handle palette color selection
  const handleSelectColor = (hex: string) => {
    const parsed = parseColorString(hex);
    if (parsed) {
      updateFromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
    }
  };

  // Render a color block with copy overlay in harmonious palettes
  const renderPaletteBlock = (colorHex: string, label: string) => {
    const isCopied = copiedFormat === colorHex;
    return (
      <div 
        className="relative flex-1 group cursor-pointer transition-transform hover:scale-105" 
        style={{ backgroundColor: colorHex }}
        onClick={() => handleSelectColor(colorHex)}
        title={`${label}: ${colorHex}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerCopy(colorHex, colorHex);
          }}
          className="absolute top-1 right-1 p-0.5 rounded bg-zinc-950/85 hover:bg-zinc-950 border border-zinc-850 shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Copy: ${colorHex}`}
        >
          {isCopied ? (
            <svg className="w-3 h-3 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-zinc-400 hover:text-zinc-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      </div>
    );
  };

  // Computed Values
  const activeColorHex = rgbToHex(r, g, b, a);
  const activeColorRgb = a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  const activeColorHsl = a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;

  // Contrast evaluations
  const myLuminance = getLuminance(r, g, b);
  const contrastWhite = getContrastRatio(myLuminance, 1.0); // white is 1.0
  const contrastBlack = getContrastRatio(myLuminance, 0.0); // black is 0.0

  const getWcagRating = (ratio: number) => {
    if (ratio >= 7) return { label: 'AAA Pass', bg: 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald' };
    if (ratio >= 4.5) return { label: 'AA Pass', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' };
    if (ratio >= 3) return { label: 'Large Text Only', bg: 'bg-amber-400/10 border-amber-400/20 text-amber-400' };
    return { label: 'Fail', bg: 'bg-red-400/10 border-red-400/20 text-red-400' };
  };

  const whiteRating = getWcagRating(contrastWhite);
  const blackRating = getWcagRating(contrastBlack);

  // Tailwind Matches
  const nearestTailwindRaw = findNearestTailwindColor(r, g, b);
  const nearestTailwind = {
    name: nearestTailwindRaw.fullName,
    hex: nearestTailwindRaw.hex,
    distance: nearestTailwindRaw.distance
  };

  // Palette Generator calculations
  const complementaryHex = rgbToHex(...hslToRgb((h + 180) % 360, s, l), a);
  const analogous1Hex = rgbToHex(...hslToRgb((h - 30 + 360) % 360, s, l), a);
  const analogous2Hex = rgbToHex(...hslToRgb((h + 30) % 360, s, l), a);
  const triadic1Hex = rgbToHex(...hslToRgb((h + 120) % 360, s, l), a);
  const triadic2Hex = rgbToHex(...hslToRgb((h + 240) % 360, s, l), a);
  
  const mono1Hex = rgbToHex(...hslToRgb(h, s, Math.max(0, l - 30)), a);
  const mono2Hex = rgbToHex(...hslToRgb(h, s, Math.max(0, l - 15)), a);
  const mono3Hex = rgbToHex(...hslToRgb(h, s, Math.min(100, l + 15)), a);
  const mono4Hex = rgbToHex(...hslToRgb(h, s, Math.min(100, l + 30)), a);

  // Gradient Track Styles
  const redTrackStyle = {
    background: `linear-gradient(to right, rgb(0, ${g}, ${b}), rgb(255, ${g}, ${b}))`
  };
  const greenTrackStyle = {
    background: `linear-gradient(to right, rgb(${r}, 0, ${b}), rgb(${r}, 255, ${b}))`
  };
  const blueTrackStyle = {
    background: `linear-gradient(to right, rgb(${r}, ${g}, 0), rgb(${r}, ${g}, 255))`
  };
  const hueTrackStyle = {
    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  };
  const satTrackStyle = {
    background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
  };
  const lightTrackStyle = {
    background: `linear-gradient(to right, #000000 0%, hsl(${h}, ${s}%, 50%) 50%, #ffffff 100%)`
  };
  const alphaTrackStyle = {
    background: `linear-gradient(to right, transparent 0%, rgba(${r}, ${g}, ${b}, 1) 100%)`
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Color Ingestion & Sliders */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono mb-3">
              Color Detection & Parser
            </h2>
            
            {/* Smart Command Bar Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={smartInput}
                onChange={(e) => handleSmartInputChange(e.target.value)}
                placeholder="Paste or type HEX, RGB, HSL... (e.g. #34d399)"
                className={`w-full pl-9 pr-24 bg-canvas border ${
                  smartError ? 'border-red-400/50 focus:border-red-400' : 'border-border-hairline focus:border-accent-emerald'
                } text-zinc-150 rounded-lg py-2.5 text-sm outline-none font-mono transition-all`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                {/* Randomize action */}
                <button
                  type="button"
                  onClick={handleRandomizeColor}
                  title="Generate Random Color"
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-50 cursor-pointer transition-colors"
                >
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    strokeWidth={2} 
    d="M12 3a9 9 0 000 18h1a3 3 0 003-3v-1a2 2 0 012-2h1a3 3 0 003-3V9a6 6 0 00-6-6h-4zM7.5 10.5a1 1 0 110-2 1 1 0 010 2zm4-2.5a1 1 0 110-2 1 1 0 010 2zm5 3.5a1 1 0 110-2 1 1 0 010 2z" 
  />
</svg>
                </button>
                {/* Native Picker Trigger */}
                <div className="relative w-6 h-6 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850">
                  <input
                    type="color"
                    value={rgbToHex(r, g, b)}
                    onChange={handleNativeColorPicker}
                    className="absolute inset-0 w-10 h-10 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                  />
                </div>
              </div>
            </div>
            {smartError && (
              <p className="text-[10px] text-red-400 font-mono mt-1.5 leading-relaxed">
                ⚠️ Format not recognized. Enter a valid hex, rgb, or hsl expression.
              </p>
            )}
          </div>

          <hr className="border-border-hairline" />

          {/* RGB Sliders Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center justify-between">
              <span>RGB Channels</span>
              <span className="text-[10px] text-zinc-500 font-normal">Red, Green, Blue, Alpha</span>
            </h3>
            
            {/* Red Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">R</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={redTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={r}
                  onChange={(e) => handleRgbSliderChange('r', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${(r / 255) * 100}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="255"
                value={r}
                onChange={(e) => handleRgbSliderChange('r', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>

            {/* Green Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">G</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={greenTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={g}
                  onChange={(e) => handleRgbSliderChange('g', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${(g / 255) * 100}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="255"
                value={g}
                onChange={(e) => handleRgbSliderChange('g', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>

            {/* Blue Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">B</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={blueTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={b}
                  onChange={(e) => handleRgbSliderChange('b', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${(b / 255) * 100}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="255"
                value={b}
                onChange={(e) => handleRgbSliderChange('b', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* HSL Sliders Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center justify-between">
              <span>HSL Channels</span>
              <span className="text-[10px] text-zinc-500 font-normal">Hue, Saturation, Lightness</span>
            </h3>

            {/* Hue Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">H</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={hueTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={h}
                  onChange={(e) => handleHslSliderChange('h', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${(h / 360) * 100}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="360"
                value={h}
                onChange={(e) => handleHslSliderChange('h', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>

            {/* Saturation Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">S</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={satTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={s}
                  onChange={(e) => handleHslSliderChange('s', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${s}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={s}
                onChange={(e) => handleHslSliderChange('s', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>

            {/* Lightness Channel */}
            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">L</span>
              <div className="flex-grow relative h-3 rounded-full overflow-hidden" style={lightTrackStyle}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={l}
                  onChange={(e) => handleHslSliderChange('l', parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${l}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={l}
                onChange={(e) => handleHslSliderChange('l', parseInt(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Alpha/Transparency Channel */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center justify-between">
              <span>Opacity Channel</span>
              <span className="text-[10px] text-zinc-500 font-normal">Alpha (0.0 to 1.0)</span>
            </h3>

            <div className="flex items-center gap-4">
              <span className="w-8 text-xs font-mono text-zinc-400 font-medium">A</span>
              <div 
                className="flex-grow relative h-3 rounded-full overflow-hidden bg-zinc-950 border border-zinc-900"
                style={{
                  backgroundImage: 'conic-gradient(#27272a 0.25turn, transparent 0.25turn 0.5turn, #27272a 0.5turn 0.75turn, transparent 0.75turn)',
                  backgroundSize: '8px 8px'
                }}
              >
                <div className="absolute inset-0 w-full h-full" style={alphaTrackStyle} />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(a * 100)}
                  onChange={(e) => handleRgbSliderChange('a', parseFloat((parseInt(e.target.value) / 100).toFixed(2)))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                  style={{ left: `calc(${a * 100}% - 8px)` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={a}
                onChange={(e) => handleRgbSliderChange('a', parseFloat(e.target.value) || 0)}
                className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Color Preview & Outputs */}
        <div className="flex flex-col gap-6">
          
          {/* Live Preview block */}
          <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Live Color Preview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Giant color square */}
              <div 
                className="relative h-36 md:h-40 w-full rounded-lg shadow-inner border border-zinc-900 overflow-hidden bg-zinc-950 flex items-center justify-center"
                style={{
                  backgroundImage: 'conic-gradient(#27272a 0.25turn, transparent 0.25turn 0.5turn, #27272a 0.5turn 0.75turn, transparent 0.75turn)',
                  backgroundSize: '16px 16px'
                }}
              >
                <div 
                  className="absolute inset-0 transition-colors duration-75" 
                  style={{ backgroundColor: activeColorRgb }}
                />
                
                {/* Contrast check badges visible inside color square */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                    Luminance: {myLuminance.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* WCAG Contrast check ratios */}
              <div className="flex flex-col gap-3 font-sans">
                <h3 className="text-xs font-mono font-semibold text-zinc-450 uppercase tracking-wider">
                  WCAG Accessibility Contrast
                </h3>
                
                <div className="flex flex-col gap-2">
                  {/* White text contrast */}
                  <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-white border border-zinc-300 flex items-center justify-center text-[10px] font-bold text-black select-none">
                        Aa
                      </span>
                      <span className="text-xs font-mono text-zinc-300">White text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-300">{contrastWhite}:1</span>
                      <span className={`text-[9px] font-semibold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${whiteRating.bg}`}>
                        {whiteRating.label}
                      </span>
                    </div>
                  </div>

                  {/* Black text contrast */}
                  <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-black border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-white select-none">
                        Aa
                      </span>
                      <span className="text-xs font-mono text-zinc-300">Black text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-300">{contrastBlack}:1</span>
                      <span className={`text-[9px] font-semibold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${blackRating.bg}`}>
                        {blackRating.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Color Output Channels Card */}
          <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Color Primitives Formats
            </h2>

            <div className="flex flex-col gap-4">
              
              {/* HEX/HEXA Card */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-450">
                  <label htmlFor="output-hex">HEX / HEXA</label>
                  {copiedFormat === 'hex' && (
                    <span className="text-[10px] text-accent-emerald font-semibold uppercase tracking-wider">Copied</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="output-hex"
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    className={`w-full bg-canvas border ${
                      hexError ? 'border-red-400/50' : 'border-border-hairline'
                    } text-zinc-300 px-3 py-2 text-xs font-mono rounded-lg outline-none pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => triggerCopy(activeColorHex, 'hex')}
                    className="absolute inset-y-1.5 right-1.5 px-2.5 py-0.5 text-[10px] font-sans bg-zinc-800 hover:bg-zinc-750 text-zinc-450 hover:text-zinc-50 border border-zinc-750 rounded transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Copy</span>
                    <kbd className="font-mono bg-zinc-950 px-1 py-0.2 rounded border border-zinc-850 text-[8px] text-zinc-500">⌘ C</kbd>
                  </button>
                </div>
              </div>

              {/* RGB/RGBA Card */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-450">
                  <label htmlFor="output-rgb">RGB / RGBA</label>
                  {copiedFormat === 'rgb' && (
                    <span className="text-[10px] text-accent-emerald font-semibold uppercase tracking-wider">Copied</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="output-rgb"
                    type="text"
                    value={rgbInput}
                    onChange={(e) => handleRgbInputChange(e.target.value)}
                    className={`w-full bg-canvas border ${
                      rgbError ? 'border-red-400/50' : 'border-border-hairline'
                    } text-zinc-300 px-3 py-2 text-xs font-mono rounded-lg outline-none pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => triggerCopy(activeColorRgb, 'rgb')}
                    className="absolute inset-y-1.5 right-1.5 px-2.5 py-0.5 text-[10px] font-sans bg-zinc-800 hover:bg-zinc-750 text-zinc-450 hover:text-zinc-50 border border-zinc-750 rounded transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Copy</span>
                    <kbd className="font-mono bg-zinc-950 px-1 py-0.2 rounded border border-zinc-850 text-[8px] text-zinc-500">⌘ C</kbd>
                  </button>
                </div>
              </div>

              {/* HSL/HSLA Card */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-450">
                  <label htmlFor="output-hsl">HSL / HSLA</label>
                  {copiedFormat === 'hsl' && (
                    <span className="text-[10px] text-accent-emerald font-semibold uppercase tracking-wider">Copied</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="output-hsl"
                    type="text"
                    value={hslInput}
                    onChange={(e) => handleHslInputChange(e.target.value)}
                    className={`w-full bg-canvas border ${
                      hslError ? 'border-red-400/50' : 'border-border-hairline'
                    } text-zinc-300 px-3 py-2 text-xs font-mono rounded-lg outline-none pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => triggerCopy(activeColorHsl, 'hsl')}
                    className="absolute inset-y-1.5 right-1.5 px-2.5 py-0.5 text-[10px] font-sans bg-zinc-800 hover:bg-zinc-750 text-zinc-450 hover:text-zinc-50 border border-zinc-750 rounded transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Copy</span>
                    <kbd className="font-mono bg-zinc-950 px-1 py-0.2 rounded border border-zinc-850 text-[8px] text-zinc-500">⌘ C</kbd>
                  </button>
                </div>
              </div>

              {/* Tailwind Matcher */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-450">
                  <span>Tailwind v4 Match</span>
                  {copiedFormat === 'tailwind' && (
                    <span className="text-[10px] text-accent-emerald font-semibold uppercase tracking-wider">Copied</span>
                  )}
                </div>
                <div className="flex items-center justify-between bg-zinc-900 border border-border-hairline rounded-lg p-2.5 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-4 h-4 rounded border border-zinc-800" 
                      style={{ backgroundColor: nearestTailwind.hex }}
                    />
                    <span>
                      <code className="text-accent-emerald text-xs font-semibold">{nearestTailwind.name}</code>
                      <span className="text-[10px] text-zinc-500 ml-2">(Hex: {nearestTailwind.hex}, Dist: {nearestTailwind.distance})</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerCopy(nearestTailwind.name, 'tailwind')}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-350 hover:text-zinc-100 rounded border border-zinc-750 transition-colors cursor-pointer"
                  >
                    Copy Class
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Palette Generator Section */}
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-5">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
            Harmonious Color Palettes
          </h2>
          <p className="text-[11px] text-zinc-500 font-sans mt-1">
            Generated color harmonies based on the currently active color coordinates. Click a block to select it, or hover to copy its HEX value.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Complementary */}
          <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-lg">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">Complementary</h3>
            <div className="flex items-stretch rounded overflow-hidden h-14 border border-zinc-950 bg-zinc-950">
              {renderPaletteBlock(activeColorHex, 'Active')}
              {renderPaletteBlock(complementaryHex, 'Complementary')}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-500">
              <span>{activeColorHex}</span>
              <span>{complementaryHex}</span>
            </div>
          </div>

          {/* Analogous */}
          <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-lg">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">Analogous</h3>
            <div className="flex items-stretch rounded overflow-hidden h-14 border border-zinc-950 bg-zinc-950">
              {renderPaletteBlock(analogous1Hex, 'Analogous 1')}
              {renderPaletteBlock(activeColorHex, 'Active')}
              {renderPaletteBlock(analogous2Hex, 'Analogous 2')}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-500">
              <span>{analogous1Hex}</span>
              <span>{analogous2Hex}</span>
            </div>
          </div>

          {/* Triadic */}
          <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-lg">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">Triadic</h3>
            <div className="flex items-stretch rounded overflow-hidden h-14 border border-zinc-950 bg-zinc-950">
              {renderPaletteBlock(activeColorHex, 'Active')}
              {renderPaletteBlock(triadic1Hex, 'Triadic 1')}
              {renderPaletteBlock(triadic2Hex, 'Triadic 2')}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-500">
              <span>{activeColorHex}</span>
              <span>{triadic2Hex}</span>
            </div>
          </div>

          {/* Monochromatic */}
          <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-lg">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">Monochromatic</h3>
            <div className="flex items-stretch rounded overflow-hidden h-14 border border-zinc-950 bg-zinc-950">
              {renderPaletteBlock(mono1Hex, 'Darker 2')}
              {renderPaletteBlock(mono2Hex, 'Darker 1')}
              {renderPaletteBlock(activeColorHex, 'Active')}
              {renderPaletteBlock(mono3Hex, 'Lighter 1')}
              {renderPaletteBlock(mono4Hex, 'Lighter 2')}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-500">
              <span>{mono1Hex}</span>
              <span>{mono4Hex}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
