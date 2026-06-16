import React, { useState, useEffect, useRef } from 'react';
import { 
  type GradientStop, 
  type GradientType, 
  type GradientPreset,
  PRESETS, 
  getGradientCssValue, 
  getTailwindValue, 
  getSvgValue, 
  getCanvasCode, 
  getReactCssObject,
  extractGradientFromCanvas
} from '../utils-engine/gradient';

// Robust Clipboard Copy Helper
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy
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

export const GradientGenerator: React.FC = () => {
  // State variables
  const [type, setType] = useState<GradientType>('linear');
  const [direction, setDirection] = useState<string | number>(135);
  const [stops, setStops] = useState<GradientStop[]>(() => {
    // Initial stops derived from Emerald Glow preset
    return PRESETS[0].stops.map((s, idx) => ({
      ...s,
      id: `stop-${idx}-${Date.now()}`
    }));
  });
  
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  
  // Custom text gradient preview state
  const [textGradientVal, setTextGradientVal] = useState<string>('USE UTILS');
  const [activePreviewMode, setActivePreviewMode] = useState<'card' | 'button' | 'text' | 'shape'>('card');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'css' | 'tailwind' | 'svg' | 'canvas' | 'react'>('css');

  // Image color extractor states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageColors, setImageColors] = useState<string[]>([]);
  const [colorCount, setColorCount] = useState<number>(3);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Select first stop initially or on mount
  useEffect(() => {
    if (stops.length > 0 && !selectedStopId) {
      setSelectedStopId(stops[0].id);
    }
  }, [stops, selectedStopId]);

  const cssValue = getGradientCssValue(type, direction, stops);
  const tailwindValue = getTailwindValue(type, direction, stops);
  const svgValue = getSvgValue(type, direction, stops);
  const canvasCode = getCanvasCode(type, direction, stops);
  const reactCode = getReactCssObject(type, direction, stops);

  // Sync selected stop value if stops change and the selected one is gone
  useEffect(() => {
    if (stops.length > 0 && !stops.some(s => s.id === selectedStopId)) {
      setSelectedStopId(stops[0].id);
    }
  }, [stops, selectedStopId]);

  const selectedStop = stops.find(s => s.id === selectedStopId);

  // Copy code utility
  const copyCode = (text: string, format: string) => {
    const ok = copyToClipboard(text);
    if (ok) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  // Keyboard shortcut support (⌘ C or Ctrl+C to copy background CSS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (activeNode && (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        copyCode(`background: ${cssValue};`, 'css');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cssValue]);

  // Apply Preset
  const handleApplyPreset = (preset: GradientPreset) => {
    setType(preset.type);
    setDirection(preset.direction);
    const newStops = preset.stops.map((s, idx) => ({
      ...s,
      id: `stop-${idx}-${Date.now()}`
    }));
    setStops(newStops);
    if (newStops.length > 0) {
      setSelectedStopId(newStops[0].id);
    }
  };

  // Stop property updates
  const updateStopProperty = (stopId: string, field: keyof GradientStop, value: any) => {
    setStops(prev => prev.map(s => {
      if (s.id === stopId) {
        return { ...s, [field]: value };
      }
      return s;
    }).sort((a, b) => a.position - b.position));
  };

  // Delete stop
  const handleDeleteStop = (stopId: string) => {
    if (stops.length <= 2) return; // Must have at least 2 stops
    const updated = stops.filter(s => s.id !== stopId);
    setStops(updated);
  };

  // Add Stop by clicking on track
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const position = Math.round((clickX / rect.width) * 100);

    // Find nearest stop to clone color
    let nearestStop = stops[0];
    let minDist = Math.abs(stops[0].position - position);
    for (const s of stops) {
      const d = Math.abs(s.position - position);
      if (d < minDist) {
        minDist = d;
        nearestStop = s;
      }
    }

    const newStop: GradientStop = {
      id: `stop-${Date.now()}`,
      color: nearestStop.color,
      position,
      opacity: nearestStop.opacity
    };

    const newStops = [...stops, newStop].sort((a, b) => a.position - b.position);
    setStops(newStops);
    setSelectedStopId(newStop.id);
  };

  // Mouse drag handler for stops
  const handleStopMouseDown = (stopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStopId(stopId);

    const track = document.getElementById('gradient-track');
    if (!track) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = track.getBoundingClientRect();
      const pos = Math.min(100, Math.max(0, Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100)));
      
      setStops(prev => prev.map(s => {
        if (s.id === stopId) {
          return { ...s, position: pos };
        }
        return s;
      }).sort((a, b) => a.position - b.position));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Add random stop
  const handleAddRandomStop = () => {
    // Generate a random position not occupied
    let position = Math.floor(Math.random() * 80) + 10;
    while (stops.some(s => Math.abs(s.position - position) < 5)) {
      position = Math.floor(Math.random() * 80) + 10;
    }
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newStop: GradientStop = {
      id: `stop-${Date.now()}`,
      color: randomColor,
      position,
      opacity: 1
    };

    const newStops = [...stops, newStop].sort((a, b) => a.position - b.position);
    setStops(newStops);
    setSelectedStopId(newStop.id);
  };

  // Color extraction logic
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run color extraction when image loads
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = hiddenCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw image to canvas sized 200x200 for color sampling efficiency
      canvas.width = 200;
      canvas.height = 200;
      ctx.drawImage(img, 0, 0, 200, 200);

      const colors = extractGradientFromCanvas(canvas, colorCount);
      setImageColors(colors);
    };
  }, [imageSrc, colorCount]);

  const applyExtractedColors = () => {
    if (imageColors.length < 2) return;
    const step = 100 / (imageColors.length - 1);
    const newStops = imageColors.map((color, idx) => ({
      id: `stop-${idx}-${Date.now()}`,
      color,
      position: Math.round(idx * step),
      opacity: 1
    }));
    setStops(newStops);
    if (newStops.length > 0) {
      setSelectedStopId(newStops[0].id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const handleResetImage = () => {
    setImageSrc(null);
    setImageColors([]);
  };

  // Direction angle configurations helper
  const handleDirectionChange = (val: string | number) => {
    setDirection(val);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 text-zinc-100 font-sans">
      
      {/* Fullscreen Background Preview Triggered State */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[100] transition-all flex flex-col items-center justify-between p-6"
          style={{ background: cssValue }}
        >
          <div className="w-full flex justify-between items-center bg-black/40 backdrop-blur-md border border-zinc-800/50 rounded-xl px-4 py-2 text-xs font-mono max-w-lg">
            <span className="text-zinc-300">Fullscreen Preview Mode</span>
            <button 
              onClick={() => setIsFullscreen(false)}
              className="bg-accent-emerald hover:bg-emerald-400 text-zinc-950 px-3 py-1 rounded font-semibold transition-all cursor-pointer"
            >
              Exit Fullscreen
            </button>
          </div>
          <div className="text-center bg-black/50 backdrop-blur-md rounded-xl p-5 border border-zinc-800 max-w-md shadow-2xl">
            <h4 className="text-lg font-bold mb-1 tracking-tight">Interactive CSS Gradient</h4>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">Adjusted parameters are displayed on your full desktop workspace backdrop.</p>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 p-2.5 rounded overflow-x-auto text-left whitespace-pre-wrap select-all">
              {cssValue}
            </div>
          </div>
          <div />
        </div>
      )}

      {/* Top Banner Options: Presets & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border border-border-hairline rounded-xl p-4 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto min-w-0 overflow-hidden">
          <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap text-center sm:text-left">
            Gradient Presets:
          </span>
          <div className="flex gap-2 overflow-x-auto py-1 max-w-full no-scrollbar min-w-0">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="group flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-border-hairline rounded transition-all cursor-pointer flex-shrink-0"
              >
                <span 
                  className="w-3.5 h-3.5 rounded-full border border-zinc-700/50 flex-shrink-0"
                  style={{ background: getGradientCssValue(preset.type, preset.direction, preset.stops) }}
                />
                <span className="text-zinc-300 group-hover:text-zinc-100 font-sans transition-colors">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setType('linear');
            setDirection(135);
            setStops([
              { id: '1', color: '#10b981', position: 0, opacity: 1 },
              { id: '2', color: '#3b82f6', position: 100, opacity: 1 }
            ]);
            setSelectedStopId('1');
            handleResetImage();
          }}
          className="w-full sm:w-auto px-3.5 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-border-hairline text-zinc-350 hover:text-zinc-100 rounded transition-all cursor-pointer font-sans text-center"
        >
          Reset defaults
        </button>
      </div>

      {/* Main Grid Two-Pane UI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Input Ingestion & Control Panels (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6 bg-panel border border-border-hairline rounded-xl p-5 shadow-sm">
          
          {/* Gradient System Selector & Direction Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* System Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Gradient Type
              </label>
              <div className="bg-zinc-900 border border-border-hairline rounded-lg p-1 flex gap-1 items-center">
                {(['linear', 'radial', 'conic'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      if (t === 'linear') setDirection(135);
                      else if (t === 'radial') setDirection('circle at center');
                      else setDirection('from 0deg at center');
                    }}
                    className={`flex-1 text-center py-1.5 text-xs font-semibold rounded transition-all cursor-pointer capitalize ${
                      type === t
                        ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction Control depending on selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                {type === 'linear' ? 'Direction Angle' : 'Position Origin'}
              </label>

              {type === 'linear' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={typeof direction === 'number' ? direction : 135}
                    onChange={(e) => handleDirectionChange(parseInt(e.target.value))}
                    className="flex-grow accent-accent-emerald h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={typeof direction === 'number' ? direction : 135}
                      onChange={(e) => handleDirectionChange(parseInt(e.target.value) || 0)}
                      className="w-16 bg-zinc-900 border border-border-hairline text-zinc-200 text-xs font-mono text-center rounded py-1.5 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-accent-emerald/30"
                    />
                    <span className="text-xs font-mono text-zinc-500">deg</span>
                  </div>
                </div>
              ) : type === 'radial' ? (
                <select
                  value={typeof direction === 'string' ? direction : 'circle at center'}
                  onChange={(e) => handleDirectionChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-border-hairline focus:border-zinc-700 text-zinc-200 text-xs rounded p-2 outline-none font-mono focus:ring-1 focus:ring-accent-emerald/30"
                >
                  <option value="circle at center">circle at center</option>
                  <option value="circle at top">circle at top</option>
                  <option value="circle at bottom">circle at bottom</option>
                  <option value="circle at left">circle at left</option>
                  <option value="circle at right">circle at right</option>
                  <option value="circle at top left">circle at top left</option>
                  <option value="circle at top right">circle at top right</option>
                  <option value="circle at bottom left">circle at bottom left</option>
                  <option value="circle at bottom right">circle at bottom right</option>
                </select>
              ) : (
                <select
                  value={typeof direction === 'string' ? direction : 'from 0deg at center'}
                  onChange={(e) => handleDirectionChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-border-hairline focus:border-zinc-700 text-zinc-200 text-xs rounded p-2 outline-none font-mono focus:ring-1 focus:ring-accent-emerald/30"
                >
                  <option value="from 0deg at center">from 0deg at center</option>
                  <option value="from 90deg at center">from 90deg at center</option>
                  <option value="from 180deg at center">from 180deg at center</option>
                  <option value="from 270deg at center">from 270deg at center</option>
                  <option value="from 0deg at top left">from 0deg at top left</option>
                  <option value="from 0deg at bottom right">from 0deg at bottom right</option>
                </select>
              )}
            </div>
          </div>

          {type === 'linear' && (
            <div className="flex gap-2 flex-wrap items-center mt-[-8px]">
              <span className="text-[10px] font-mono text-zinc-500">Angle Presets:</span>
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setDirection(deg)}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-border-hairline rounded hover:bg-zinc-800 cursor-pointer"
                >
                  {deg}°
                </button>
              ))}
            </div>
          )}

          <hr className="border-zinc-800" />

          {/* Interactive Stops Sandbox Slider */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Interactive Gradient Stops
                </span>
                <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                  Click the track to add a stop. Drag markers to adjust positions.
                </span>
              </div>
              
              <button
                type="button"
                onClick={handleAddRandomStop}
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-border-hairline rounded text-accent-emerald font-semibold cursor-pointer transition-all"
              >
                <span>+ Add Stop</span>
              </button>
            </div>

            {/* Slider Container Track */}
            <div className="py-5 px-3.5 relative select-none">
              <div
                id="gradient-track"
                onClick={handleTrackClick}
                className="w-full h-8 rounded-lg relative cursor-pointer border border-zinc-800 shadow-inner flex items-center"
                style={{
                  background: `linear-gradient(to right, ${[...stops]
                    .sort((a, b) => a.position - b.position)
                    .map(s => `${s.color} ${s.position}%`)
                    .join(', ')})`
                }}
              >
                {/* Visual grid ticks inside bar */}
                <div className="absolute inset-y-0 left-1/4 w-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-3/4 w-[1px] bg-white/10 pointer-events-none" />

                {/* Stops Marker Knobs */}
                {stops.map(stop => {
                  const isSelected = stop.id === selectedStopId;
                  return (
                    <div
                      key={stop.id}
                      onMouseDown={(e) => handleStopMouseDown(stop.id, e)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setSelectedStopId(stop.id);
                        // Standard touch movements can be added, but mouse is priority for desktop Devs
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-10"
                      style={{ left: `${stop.position}%` }}
                    >
                      <div className={`flex flex-col items-center group relative`}>
                        {/* Selected tooltip */}
                        {isSelected && (
                          <div className="absolute bottom-6 bg-zinc-950 border border-accent-emerald text-[9px] font-mono font-bold px-1 py-0.5 rounded text-accent-emerald select-none pointer-events-none z-20">
                            {stop.position}%
                          </div>
                        )}
                        <div 
                          className={`w-5.5 h-5.5 rounded-full border-2 shadow-lg transition-all flex items-center justify-center ${
                            isSelected 
                              ? 'border-accent-emerald scale-110 ring-2 ring-accent-emerald/20' 
                              : 'border-white hover:border-accent-emerald/50'
                          }`}
                          style={{ backgroundColor: stop.color }}
                        >
                          {/* Inner pinhead */}
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-950/60" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Stop Detail Editor Panel */}
          {selectedStop ? (
            <div className="bg-zinc-900 border border-border-hairline rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
                  Stop Config Node
                </span>
                
                {/* Delete Node if count > 2 */}
                <button
                  type="button"
                  onClick={() => handleDeleteStop(selectedStop.id)}
                  disabled={stops.length <= 2}
                  className={`flex items-center gap-1 text-[11px] font-mono py-0.5 px-2 rounded border transition-colors ${
                    stops.length <= 2 
                      ? 'border-zinc-800 text-zinc-700 cursor-not-allowed' 
                      : 'border-red-900/40 text-red-400/80 hover:text-red-400 hover:bg-red-900/10 cursor-pointer'
                  }`}
                >
                  🗑️ Delete Stop
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Color Input */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 font-semibold">Color Selection</span>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded border border-border-hairline overflow-hidden cursor-pointer bg-zinc-800 flex-shrink-0">
                      <input
                        type="color"
                        value={selectedStop.color}
                        onChange={(e) => updateStopProperty(selectedStop.id, 'color', e.target.value)}
                        className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={7}
                      value={selectedStop.color.toUpperCase()}
                      onChange={(e) => updateStopProperty(selectedStop.id, 'color', e.target.value)}
                      className="w-full bg-zinc-950 border border-border-hairline text-zinc-200 font-mono text-xs rounded px-2.5 py-2 outline-none focus:border-zinc-800"
                    />
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
                    <span>Opacity modifier</span>
                    <span className="text-zinc-200 font-semibold">{Math.round(selectedStop.opacity * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(selectedStop.opacity * 100)}
                      onChange={(e) => updateStopProperty(selectedStop.id, 'opacity', parseFloat(e.target.value) / 100)}
                      className="w-full accent-accent-emerald h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Position input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
                    <span>Stop Position</span>
                    <span className="text-zinc-200 font-semibold">{selectedStop.position}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedStop.position}
                      onChange={(e) => updateStopProperty(selectedStop.id, 'position', parseInt(e.target.value))}
                      className="w-full accent-accent-emerald h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            </div>
          ) : null}

          <hr className="border-zinc-800" />

          {/* Local-First Image Color Extraction Zone */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                  📷 Image Palette-to-Gradient Extractor
                </span>
                <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                  Drop any local photo. We extract its dominant colors sequences completely in-browser.
                </span>
              </div>
              {imageSrc && (
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="text-[10px] font-mono text-zinc-400 hover:text-red-400 underline cursor-pointer"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* Drop / Select Zone */}
            {!imageSrc ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center select-none"
              >
                <span className="text-2xl">📥</span>
                <span className="text-xs font-mono text-zinc-400">Drag & Drop Image or Click to Browse</span>
                <span className="text-[9px] text-zinc-500">Supports PNG, JPG, WEBP. Executed 100% locally.</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-950/50 border border-border-hairline rounded-xl p-4">
                {/* Thumb preview */}
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 relative">
                  <img
                    src={imageSrc}
                    alt="Uploaded thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-grow flex flex-col gap-3 w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">Extract quantity:</span>
                      <select
                        value={colorCount}
                        onChange={(e) => setColorCount(parseInt(e.target.value))}
                        className="bg-zinc-900 border border-border-hairline text-zinc-200 text-xs rounded px-1.5 py-0.5 font-mono outline-none focus:border-zinc-850"
                      >
                        {[2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num} colors</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={applyExtractedColors}
                      disabled={imageColors.length === 0}
                      className="px-3 py-1.5 text-xs bg-accent-emerald text-zinc-950 font-bold rounded hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 font-sans cursor-pointer transition-all shadow"
                    >
                      Apply Colors to Stops
                    </button>
                  </div>

                  {/* Render Dominant Swatches */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Extracted Swatches</span>
                    <div className="flex items-center gap-1.5">
                      {imageColors.length > 0 ? (
                        imageColors.map((hex, i) => (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                            onClick={() => {
                              // If stop selected, update it
                              if (selectedStopId) {
                                updateStopProperty(selectedStopId, 'color', hex);
                              }
                            }}
                            title="Click to apply to selected stop"
                          >
                            <div
                              className="w-full h-6 rounded border border-zinc-700/60"
                              style={{ backgroundColor: hex }}
                            />
                            <span className="text-[9px] font-mono text-zinc-400 uppercase group-hover:text-accent-emerald transition-colors">
                              {hex}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">Analyzing photo...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden canvas for image sampling */}
            <canvas ref={hiddenCanvasRef} className="hidden" />
          </div>

        </div>

        {/* Right Column: Visual Preview & Code Panel (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 items-stretch">
          
          {/* Visual Preview Dashboard Node */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Real-time Preview
              </h2>

              {/* Fullscreen trigger */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="text-[11px] font-mono text-zinc-400 hover:text-accent-emerald flex items-center gap-1 cursor-pointer"
                title="Preview full screen"
              >
                <span>🎎</span> <span>Fullscreen</span>
              </button>
            </div>

            {/* Preview Canvas Workspace */}
            <div className="w-full h-[280px] bg-zinc-950 border border-border-hairline rounded-lg relative flex items-center justify-center overflow-hidden transition-all bg-[linear-gradient(45deg,#1c1c1e_25%,transparent_25%),linear-gradient(-45deg,#1c1c1e_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1c1e_75%),linear-gradient(-45deg,transparent_75%,#1c1c1e_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
              
              {/* Dynamic preview elements depending on active preview tab */}
              {activePreviewMode === 'card' && (
                <div 
                  className="w-full max-w-[288px] h-44 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/10"
                  style={{ background: cssValue }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/50 tracking-wider font-mono">USEUTILS LABS</span>
                      <span className="text-xs font-semibold text-white/80 mt-0.5 tracking-tight font-sans">CSS Gradient Studio</span>
                    </div>
                    {/* Chip */}
                    <div className="w-9 h-7 rounded bg-white/15 border border-white/10 backdrop-blur-xs flex items-center justify-center text-[10px]">
                      👑
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-white select-none">
                    <span className="text-xs font-mono tracking-widest text-white/40">••••  ••••  ••••  2026</span>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-white/60">ACTIVE DESIGN</span>
                      <span className="text-[10px] font-mono text-white/50">LOCAL ONLY</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewMode === 'button' && (
                <div className="flex flex-col items-center gap-4">
                  {/* solid gradient button */}
                  <button
                    type="button"
                    className="px-6 py-3 rounded-lg text-sm font-semibold text-zinc-950 shadow-lg hover:brightness-105 active:scale-98 transition-all cursor-pointer border border-black/10"
                    style={{ background: cssValue }}
                  >
                    Solid Action Button
                  </button>

                  {/* Outline gradient button */}
                  <button
                    type="button"
                    className="p-[1.5px] rounded-lg overflow-hidden group hover:shadow-[0_0_15px_rgba(52,211,153,0.15)] active:scale-98 transition-all cursor-pointer"
                    style={{ background: cssValue }}
                  >
                    <div className="bg-zinc-950 text-zinc-200 px-6 py-2.5 rounded-[7px] text-xs font-mono font-bold group-hover:text-white transition-colors">
                      Outline Action Button
                    </div>
                  </button>
                </div>
              )}

              {activePreviewMode === 'text' && (
                <div className="flex flex-col items-center gap-3 w-full px-4">
                  <h3 
                    className="text-4xl md:text-5xl font-black tracking-tighter text-center select-none"
                    style={{
                      background: cssValue,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {textGradientVal || 'GRADIENT'}
                  </h3>
                  <input
                    type="text"
                    value={textGradientVal}
                    onChange={(e) => setTextGradientVal(e.target.value)}
                    placeholder="Type custom preview text..."
                    maxLength={15}
                    className="w-48 bg-zinc-900 border border-border-hairline text-zinc-350 text-2xs font-mono text-center rounded py-1 outline-none focus:border-zinc-800 mt-2"
                  />
                </div>
              )}

              {activePreviewMode === 'shape' && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Floating morphing mesh gradient element */}
                  <div 
                    className="w-36 h-36 rounded-full blur-[2px] animate-pulse"
                    style={{ 
                      background: cssValue,
                      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                    }}
                  />
                  {/* Frosted overlay */}
                  <div className="absolute inset-x-6 bottom-6 bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-xl p-3 shadow-2xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-accent-emerald font-mono">⚡ Mesh Fluid Aesthetic</span>
                    <p className="text-[9px] text-zinc-400 font-sans leading-relaxed">CSS conic and radial directions yield complex mesh approximations in UI layouts.</p>
                  </div>
                </div>
              )}

            </div>

            {/* Preview Node Type Selector */}
            <div className="grid grid-cols-4 gap-1.5 mt-3.5 bg-zinc-900 border border-border-hairline rounded-lg p-1">
              {([
                { id: 'card', name: 'Card' },
                { id: 'button', name: 'Button' },
                { id: 'text', name: 'Text' },
                { id: 'shape', name: 'Shape' }
              ] as const).map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActivePreviewMode(mode.id)}
                  className={`text-[10px] text-center py-1 font-mono font-semibold rounded cursor-pointer transition-all ${
                    activePreviewMode === mode.id
                      ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Structured Output Code Block */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-xl p-5 shadow-sm">
            
            {/* Code Tabs Header */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Code Export Outputs
              </h2>

              <div className="text-[10px] text-zinc-500 font-mono">
                Keyboard: <kbd className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded text-[9px] font-semibold">⌘ C</kbd>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar">
              {([
                { id: 'css', label: 'CSS' },
                { id: 'tailwind', label: 'Tailwind' },
                { id: 'svg', label: 'SVG' },
                { id: 'canvas', label: 'Canvas' },
                { id: 'react', label: 'React' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCodeTab(tab.id)}
                  className={`px-3.5 py-2 text-[10px] font-mono font-bold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeCodeTab === tab.id
                      ? 'border-accent-emerald text-accent-emerald'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="relative mt-3.5 group">
              
              {/* CSS Code Tab */}
              {activeCodeTab === 'css' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>Standard CSS properties</span>
                    <button
                      type="button"
                      onClick={() => copyCode(`background: ${cssValue};`, 'css')}
                      className="text-accent-emerald hover:underline cursor-pointer"
                    >
                      {copiedFormat === 'css' ? 'Copied! ✓' : 'Copy CSS'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-border-hairline p-3.5 rounded-lg text-xs font-mono text-zinc-350 w-full max-w-full overflow-x-auto whitespace-pre-wrap select-all">
                    {`background: ${cssValue};`}
                  </pre>
                </div>
              )}

              {/* Tailwind Code Tab */}
              {activeCodeTab === 'tailwind' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>Tailwind Arbitrary Syntax</span>
                    <button
                      type="button"
                      onClick={() => copyCode(tailwindValue, 'tailwind')}
                      className="text-accent-emerald hover:underline cursor-pointer"
                    >
                      {copiedFormat === 'tailwind' ? 'Copied! ✓' : 'Copy Class'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-border-hairline p-3.5 rounded-lg text-xs font-mono text-zinc-350 w-full max-w-full overflow-x-auto whitespace-pre-wrap select-all">
                    {tailwindValue}
                  </pre>
                </div>
              )}

              {/* SVG Code Tab */}
              {activeCodeTab === 'svg' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>SVG Gradient code tag</span>
                    <button
                      type="button"
                      onClick={() => copyCode(svgValue, 'svg')}
                      className="text-accent-emerald hover:underline cursor-pointer"
                    >
                      {copiedFormat === 'svg' ? 'Copied! ✓' : 'Copy SVG'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-border-hairline p-3.5 rounded-lg text-xs font-mono text-zinc-350 overflow-x-auto whitespace-pre select-all max-h-[140px]">
                    {svgValue}
                  </pre>
                </div>
              )}

              {/* Canvas Code Tab */}
              {activeCodeTab === 'canvas' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>JS HTML5 Canvas draw API</span>
                    <button
                      type="button"
                      onClick={() => copyCode(canvasCode, 'canvas')}
                      className="text-accent-emerald hover:underline cursor-pointer"
                    >
                      {copiedFormat === 'canvas' ? 'Copied! ✓' : 'Copy JS Code'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-border-hairline p-3.5 rounded-lg text-[11px] font-mono text-zinc-350 overflow-x-auto whitespace-pre select-all max-h-[140px]">
                    {canvasCode}
                  </pre>
                </div>
              )}

              {/* React Style Code Tab */}
              {activeCodeTab === 'react' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>React Inline style syntax</span>
                    <button
                      type="button"
                      onClick={() => copyCode(reactCode, 'react')}
                      className="text-accent-emerald hover:underline cursor-pointer"
                    >
                      {copiedFormat === 'react' ? 'Copied! ✓' : 'Copy Object'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-border-hairline p-3.5 rounded-lg text-xs font-mono text-zinc-350 w-full max-w-full overflow-x-auto whitespace-pre select-all">
                    {reactCode}
                  </pre>
                </div>
              )}

            </div>
          </div>

          {/* Privacy status pill following rules */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between bg-zinc-950/40 border border-border-hairline rounded-lg px-4 py-3 shadow-inner text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald"></span>
              </span>
              <span className="text-[11px] font-medium text-zinc-400 font-sans">
                Processed locally in browser. Zero server transmission.
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              LOCAL API
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
