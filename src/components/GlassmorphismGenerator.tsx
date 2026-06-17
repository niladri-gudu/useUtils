import React, { useState, useEffect, useRef } from 'react';
import { 
  GLASS_PRESETS, 
  DEFAULT_GLASS_CONFIG, 
  getGlassCssProperties, 
  getGlassCssString, 
  getGlassTailwindClasses, 
  getGlassReactStyles,
  type GlassConfig 
} from '../utils-engine/glassmorphism';

// ==========================================
// Clipboard Copy Helper
// ==========================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand
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

export const GlassmorphismGenerator: React.FC = () => {
  // Config state
  const [config, setConfig] = useState<GlassConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('useutils_glass_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return DEFAULT_GLASS_CONFIG;
  });

  const [presetKey, setPresetKey] = useState<string>('frosted');
  
  // Customization states
  const [bgType, setBgType] = useState<'orbs' | 'mesh' | 'forest' | 'city' | 'custom' | 'upload'>('orbs');
  const [bgUrl, setBgUrl] = useState<string>('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop');
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  
  const [widgetType, setWidgetType] = useState<'card' | 'music' | 'stat' | 'login'>('card');
  const [copiedFormat, setCopiedFormat] = useState<'css' | 'tailwind' | 'react' | null>(null);
  
  // Widget internal states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [songProgress, setSongProgress] = useState<number>(38);
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>([12, 24, 16, 28, 14, 22, 10]);

  // File drop ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync config to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_glass_config', JSON.stringify(config));
    }
  }, [config]);

  // Audio visualizer mock animation loop
  useEffect(() => {
    let animationFrameId: number;
    if (isPlaying && widgetType === 'music') {
      const updateVisualizer = () => {
        setVisualizerHeights(prev => 
          prev.map(() => Math.floor(Math.random() * 24) + 6)
        );
        // Throttle animation speed a bit for natural visual rhythm
        setTimeout(() => {
          animationFrameId = requestAnimationFrame(updateVisualizer);
        }, 120);
      };
      animationFrameId = requestAnimationFrame(updateVisualizer);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, widgetType]);

  const applyPreset = (key: string) => {
    const preset = GLASS_PRESETS[key];
    if (preset) {
      setConfig(preset.config);
      setPresetKey(key);
    }
  };

  const updateConfig = (key: keyof GlassConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Preset check helper to toggle preset active badges
  useEffect(() => {
    const matchedPreset = Object.entries(GLASS_PRESETS).find(([_, p]) => {
      return JSON.stringify(p.config) === JSON.stringify(config);
    });
    if (matchedPreset) {
      setPresetKey(matchedPreset[0]);
    } else {
      setPresetKey('');
    }
  }, [config]);

  const cssCode = getGlassCssString(config);
  const tailwindCode = getGlassTailwindClasses(config);
  const reactCode = getGlassReactStyles(config);

  const copyCode = (text: string, format: 'css' | 'tailwind' | 'react') => {
    const ok = copyToClipboard(text);
    if (ok) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  // Keyboard shortcut: CMD+C / Ctrl+C to copy active CSS block
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (activeNode && (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        copyCode(cssCode, 'css');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cssCode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadUrl) {
        URL.revokeObjectURL(uploadUrl);
      }
      const url = URL.createObjectURL(file);
      setUploadUrl(url);
      setBgType('upload');
    }
  };

  const getCanvasBackgroundStyle = () => {
    switch (bgType) {
      case 'mesh':
        return {
          backgroundImage: 'radial-gradient(at 10% 20%, rgb(244, 63, 94) 0px, transparent 50%), radial-gradient(at 90% 10%, rgb(59, 130, 246) 0px, transparent 50%), radial-gradient(at 50% 90%, rgb(16, 185, 129) 0px, transparent 50%), radial-gradient(at 80% 80%, rgb(249, 115, 22) 0px, transparent 50%)',
          backgroundColor: '#0c0a09'
        };
      case 'forest':
        return {
          backgroundImage: `url('https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'city':
        return {
          backgroundImage: `url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'custom':
        return {
          backgroundImage: `url('${bgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'upload':
        return uploadUrl 
          ? { backgroundImage: `url('${uploadUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: '#18181b' };
      case 'orbs':
      default:
        return { backgroundColor: '#09090b' };
    }
  };

  const glassStyle = getGlassCssProperties(config);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Settings Ribbon: Presets & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider select-none">
            Glass Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GLASS_PRESETS).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`px-3 py-1 text-xs border rounded transition-all cursor-pointer font-sans ${
                  presetKey === key
                    ? 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald font-semibold shadow-sm shadow-accent-emerald/5'
                    : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-750 text-zinc-300 hover:text-zinc-50'
                }`}
                title={value.description}
              >
                {value.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfig(DEFAULT_GLASS_CONFIG)}
          className="px-3 py-1 text-xs bg-zinc-900 hover:bg-zinc-850 border border-border-hairline rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans active:scale-98"
        >
          Reset Defaults
        </button>
      </div>

      {/* Main Split Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5/12 grid): Controls Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-panel border border-border-hairline rounded-lg p-5">
          
          {/* Surface properties */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono border-b border-border-hairline/60 pb-2">
              Backdrop & Surface
            </h3>

            {/* Background Color & Opacity Slider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Tint Color</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850 flex-shrink-0">
                    <input
                      type="color"
                      value={config.bgHex}
                      onChange={(e) => updateConfig('bgHex', e.target.value)}
                      className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={7}
                    value={config.bgHex.toUpperCase()}
                    onChange={(e) => updateConfig('bgHex', e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-zinc-750 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Tint Opacity</span>
                  <span className="text-zinc-200 font-semibold">{Math.round(config.bgOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(config.bgOpacity * 100)}
                      onChange={(e) => updateConfig('bgOpacity', parseFloat(e.target.value) / 100)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                      style={{ left: `calc(${config.bgOpacity * 100}% - 7px)` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Backdrop Blur Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Backdrop Blur</span>
                <span className="text-zinc-200 font-semibold">{config.blur}px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.blur}
                    onChange={(e) => updateConfig('blur', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                    style={{ left: `calc(${(config.blur / 40) * 100}% - 7px)` }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={config.blur}
                  onChange={(e) => updateConfig('blur', Math.max(0, Math.min(40, parseInt(e.target.value) || 0)))}
                  className="w-14 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Borders & Geometry */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono border-b border-border-hairline/60 pb-2">
              Borders & Geometry
            </h3>

            {/* Border Radius */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Border Radius</span>
                <span className="text-zinc-200 font-semibold">{config.borderRadius}px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={config.borderRadius}
                    onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                    style={{ left: `calc(${(config.borderRadius / 50) * 100}% - 7px)` }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={config.borderRadius}
                  onChange={(e) => updateConfig('borderRadius', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* Border Width */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Border Width</span>
                <span className="text-zinc-200 font-semibold">{config.borderWidth}px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={config.borderWidth}
                    onChange={(e) => updateConfig('borderWidth', parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                    style={{ left: `calc(${(config.borderWidth / 8) * 100}% - 7px)` }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={config.borderWidth}
                  onChange={(e) => updateConfig('borderWidth', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-14 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* Border Color & Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Border Color</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850 flex-shrink-0">
                    <input
                      type="color"
                      value={config.borderHex}
                      onChange={(e) => updateConfig('borderHex', e.target.value)}
                      className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={7}
                    value={config.borderHex.toUpperCase()}
                    onChange={(e) => updateConfig('borderHex', e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-zinc-750 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Border Opacity</span>
                  <span className="text-zinc-200 font-semibold">{Math.round(config.borderOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(config.borderOpacity * 100)}
                      onChange={(e) => updateConfig('borderOpacity', parseFloat(e.target.value) / 100)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                      style={{ left: `calc(${config.borderOpacity * 100}% - 7px)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shadows */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono border-b border-border-hairline/60 pb-2">
              Box Shadow
            </h3>

            {/* Shadow Y-Offset & Blur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Vertical Offset</span>
                  <span className="text-zinc-200 font-semibold">{config.shadowY}px</span>
                </div>
                <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden mt-1.5">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={config.shadowY}
                    onChange={(e) => updateConfig('shadowY', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                    style={{ left: `calc(${(config.shadowY / 40) * 100}% - 7px)` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Blur Size</span>
                  <span className="text-zinc-200 font-semibold">{config.shadowBlur}px</span>
                </div>
                <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden mt-1.5">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={config.shadowBlur}
                    onChange={(e) => updateConfig('shadowBlur', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                    style={{ left: `calc(${(config.shadowBlur / 60) * 100}% - 7px)` }}
                  />
                </div>
              </div>
            </div>

            {/* Shadow Color & Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Shadow Color</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850 flex-shrink-0">
                    <input
                      type="color"
                      value={config.shadowColor}
                      onChange={(e) => updateConfig('shadowColor', e.target.value)}
                      className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={7}
                    value={config.shadowColor.toUpperCase()}
                    onChange={(e) => updateConfig('shadowColor', e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-zinc-750 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Shadow Opacity</span>
                  <span className="text-zinc-200 font-semibold">{Math.round(config.shadowOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-grow relative h-2.5 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(config.shadowOpacity * 100)}
                      onChange={(e) => updateConfig('shadowOpacity', parseFloat(e.target.value) / 100)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-50 border border-zinc-700 pointer-events-none"
                      style={{ left: `calc(${config.shadowOpacity * 100}% - 7px)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Canvas Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono border-b border-border-hairline/60 pb-2">
              Preview Settings
            </h3>

            {/* Canvas background selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-zinc-400 font-semibold">Canvas Background</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-canvas border border-border-hairline rounded-lg p-1">
                {(['orbs', 'mesh', 'forest', 'city', 'custom', 'upload'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBgType(type)}
                    className={`text-[10px] text-center py-1 font-semibold rounded capitalize cursor-pointer transition-all ${
                      bgType === type
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Conditional background settings */}
              {bgType === 'custom' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[10px] font-mono text-zinc-500">Image URL</label>
                  <input
                    type="text"
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-[11px] rounded px-2.5 py-1.5 outline-none focus:border-zinc-700"
                  />
                </div>
              )}

              {bgType === 'upload' && (
                <div className="flex flex-col gap-2 mt-1">
                  <label className="text-[10px] font-mono text-zinc-500">Local Image Drop</label>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 hover:text-zinc-50 font-mono text-xs rounded transition-all cursor-pointer select-none"
                    >
                      Choose Image File
                    </button>
                    {uploadUrl && (
                      <span className="text-[10px] text-accent-emerald font-mono font-semibold">✓ Loaded</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Widget Mockup Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-zinc-400 font-semibold">Mockup Widget Type</label>
              <div className="grid grid-cols-4 gap-1 bg-canvas border border-border-hairline rounded-lg p-1">
                {(['card', 'music', 'stat', 'login'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWidgetType(type)}
                    className={`text-[10px] text-center py-1 font-semibold rounded capitalize cursor-pointer transition-all ${
                      widgetType === type
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type === 'card' ? 'Credit Card' : type === 'music' ? 'Music Player' : type === 'stat' ? 'Dashboard' : 'Login Panel'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7/12 grid): Preview Canvas & Export Code */}
        <div className="lg:col-span-7 flex flex-col gap-6 items-stretch">
          
          {/* Visual Preview Frame */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Interactive Preview
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono select-none uppercase tracking-widest">
                Render Preview
              </span>
            </div>

            {/* The Actual Canvas Box */}
            <div 
              className="w-full h-[360px] rounded-lg border border-border-hairline relative flex items-center justify-center overflow-hidden transition-all shadow-inner"
              style={getCanvasBackgroundStyle()}
            >
              {/* ORBS ANIMATION BACKGROUND */}
              {bgType === 'orbs' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                  {/* Orb 1 */}
                  <div 
                    className="absolute w-44 h-44 rounded-full bg-purple-600/60 blur-[30px] animate-pulse"
                    style={{
                      left: '15%',
                      top: '10%',
                      animation: 'floatOrb1 16s infinite alternate ease-in-out'
                    }}
                  />
                  {/* Orb 2 */}
                  <div 
                    className="absolute w-52 h-52 rounded-full bg-emerald-500/50 blur-[35px]"
                    style={{
                      right: '10%',
                      bottom: '15%',
                      animation: 'floatOrb2 20s infinite alternate ease-in-out'
                    }}
                  />
                  {/* Orb 3 */}
                  <div 
                    className="absolute w-36 h-36 rounded-full bg-amber-400/50 blur-[25px]"
                    style={{
                      left: '45%',
                      top: '40%',
                      animation: 'floatOrb3 12s infinite alternate ease-in-out'
                    }}
                  />
                </div>
              )}

              {/* Outer boundary info */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500/80 bg-zinc-950/40 px-2 py-0.5 rounded backdrop-blur-xs select-none">
                Interactive Sandbox Preview
              </div>

              {/* Render dynamic mockup container */}
              <div 
                className="w-[320px] sm:w-[360px] p-6 text-zinc-100 flex flex-col justify-between transition-all select-none"
                style={glassStyle}
              >
                {/* 1. CREDIT CARD WIDGET */}
                {widgetType === 'card' && (
                  <div className="flex flex-col gap-8 w-full select-none">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-200/60 font-semibold">Premium Glass</span>
                        <span className="text-[9px] font-mono text-zinc-400/80">Platinum Edition</span>
                      </div>
                      {/* NFC chip mockup */}
                      <div className="w-9 h-7 bg-amber-400/20 border border-amber-400/30 rounded-md flex flex-col gap-1 p-1">
                        <div className="h-0.5 bg-amber-400/40 rounded-full w-full" />
                        <div className="h-0.5 bg-amber-400/40 rounded-full w-4/5" />
                        <div className="h-0.5 bg-amber-400/40 rounded-full w-full" />
                      </div>
                    </div>

                    <div className="font-mono text-lg tracking-wider text-zinc-50 font-bold select-text text-shadow-sm select-none">
                      ••••  ••••  ••••  8840
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase text-zinc-200/50">Cardholder</span>
                        <span className="text-xs font-mono font-semibold tracking-wide text-zinc-50">ALEX RIVERA</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono uppercase text-zinc-200/50">Expires</span>
                        <span className="text-xs font-mono font-semibold text-zinc-50">08 / 29</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MUSIC PLAYER WIDGET */}
                {widgetType === 'music' && (
                  <div className="flex flex-col gap-4 w-full select-none">
                    <div className="flex gap-4 items-center">
                      {/* Album art cover */}
                      <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-rose-400 rounded-lg flex-shrink-0 border border-white/10 flex items-center justify-center text-lg shadow-md">
                        🎵
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-zinc-50 truncate">Hyperdrive Shift</span>
                        <span className="text-[10px] text-zinc-300/80 truncate">Starlight Synth</span>
                        <div className="flex gap-0.5 items-end h-5 mt-1">
                          {visualizerHeights.map((h, i) => (
                            <div 
                              key={i} 
                              className="w-1 bg-accent-emerald rounded-t transition-all duration-150" 
                              style={{ height: isPlaying ? `${h}px` : '4px' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="relative h-1 w-full bg-zinc-700/40 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-accent-emerald rounded-full" style={{ width: `${songProgress}%` }} />
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={songProgress}
                          onChange={(e) => setSongProgress(parseInt(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                        <span>1:24</span>
                        <span>3:42</span>
                      </div>
                    </div>

                    {/* Player Actions Controls */}
                    <div className="flex items-center justify-center gap-6 mt-1">
                      <button type="button" className="text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6L18 6v12z"/>
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 rounded-full bg-white text-zinc-950 border border-zinc-250 flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-zinc-100 shadow"
                      >
                        {isPlaying ? (
                          <svg className="w-4.5 h-4.5 fill-current ml-0" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      <button type="button" className="text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6zm9-12v12h2V6z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. DASHBOARD STAT WIDGET */}
                {widgetType === 'stat' && (
                  <div className="flex flex-col gap-4 w-full select-none">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Instance Health</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-red-500/40 text-red-400 bg-red-500/10 font-bold uppercase tracking-wide">
                        High Load
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex flex-col">
                        <span className="text-2xl font-mono font-bold tracking-tight text-zinc-50 select-text">84.32%</span>
                        <span className="text-[9px] text-zinc-400">Total CPU utilization</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-xs font-mono font-semibold text-emerald-400">✓ Stable</span>
                        <span className="text-[9px] text-zinc-500">12 workers active</span>
                      </div>
                    </div>

                    {/* SVG Micro Chart */}
                    <div className="w-full h-16 mt-1.5 bg-zinc-950/20 border border-white/5 rounded-md p-1">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <path 
                          d="M0 25 Q 15 5, 30 20 T 60 8 T 90 28 T 100 5 L 100 30 L 0 30 Z" 
                          fill="rgba(52, 211, 153, 0.08)"
                        />
                        <path 
                          d="M0 25 Q 15 5, 30 20 T 60 8 T 90 28 T 100 5" 
                          fill="none" 
                          stroke="#34d399" 
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 4. LOGIN FORM WIDGET */}
                {widgetType === 'login' && (
                  <div className="flex flex-col gap-3 w-full select-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-zinc-50">Local Access Authentication</span>
                      <span className="text-[9px] text-zinc-400">Verify credentials to edit node configs</span>
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                      <input 
                        type="text" 
                        placeholder="Node ID" 
                        value="saas-node-east" 
                        disabled
                        className="w-full bg-zinc-950/30 border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-zinc-300 outline-none" 
                      />
                      <input 
                        type="password" 
                        placeholder="Secret Key" 
                        value="••••••••••••••" 
                        disabled
                        className="w-full bg-zinc-950/30 border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-zinc-300 outline-none" 
                      />
                    </div>

                    <button 
                      type="button" 
                      className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer shadow-md select-none mt-1 hover:shadow-emerald-500/10"
                    >
                      Authenticate Node
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generated Code Exporters */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono mb-4">
              Generated Code Output
            </h2>

            {/* Custom Tab Selector */}
            <div className="flex gap-1.5 bg-canvas border border-border-hairline p-1 rounded-lg max-w-md mb-4 shadow-inner">
              {(['css', 'tailwind', 'react'] as const).map(format => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setCopiedFormat(null)} // reset feedback
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono select-none border capitalize transition-colors duration-75 cursor-pointer ${
                    (format === 'css' && copiedFormat === null) || copiedFormat === format
                      ? 'bg-zinc-850 text-accent-emerald border-zinc-700 shadow-sm'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{ display: 'none' }} // We will use a react state below to track the active code tab!
                />
              ))}

              {/* Real Interactive Tabs code */}
              {/* Using native JS/React tab layout */}
              <ActiveCodeTabs 
                cssCode={cssCode} 
                tailwindCode={tailwindCode} 
                reactCode={reactCode} 
                copiedFormat={copiedFormat} 
                copyCode={copyCode} 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Styles for float animations */}
      <style>{`
        @keyframes floatOrb1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -20px) scale(1.1); }
          100% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes floatOrb2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(0.9); }
          100% { transform: translate(30px, -40px) scale(1.1); }
        }
        @keyframes floatOrb3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 40px) scale(1.05); }
          100% { transform: translate(-30px, -15px) scale(0.9); }
        }
      `}</style>
    </div>
  );
};

// =========================================================
// Code Tab Interface Sub-component
// =========================================================
interface CodeTabProps {
  cssCode: string;
  tailwindCode: string;
  reactCode: string;
  copiedFormat: 'css' | 'tailwind' | 'react' | null;
  copyCode: (text: string, format: 'css' | 'tailwind' | 'react') => void;
}

const ActiveCodeTabs: React.FC<CodeTabProps> = ({ 
  cssCode, 
  tailwindCode, 
  reactCode, 
  copiedFormat, 
  copyCode 
}) => {
  const [activeTab, setActiveTab] = useState<'css' | 'tailwind' | 'react'>('css');

  const getActiveCode = () => {
    switch (activeTab) {
      case 'tailwind': return tailwindCode;
      case 'react': return reactCode;
      case 'css':
      default: return cssCode;
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tab headers */}
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-1 bg-canvas border border-border-hairline p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('css')}
            className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
              activeTab === 'css' ? 'bg-zinc-800 text-zinc-50 border border-zinc-700 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            CSS Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tailwind')}
            className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
              activeTab === 'tailwind' ? 'bg-zinc-800 text-zinc-50 border border-zinc-700 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tailwind v4 Classes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('react')}
            className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
              activeTab === 'react' ? 'bg-zinc-800 text-zinc-50 border border-zinc-700 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            React styles
          </button>
        </div>

        {/* Shortcuts tag helper */}
        {activeTab === 'css' && (
          <div className="hidden sm:flex items-center gap-1.5 select-none pointer-events-none">
            <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500">⌘ C</kbd>
            <span className="text-[10px] font-mono text-zinc-650">Quick Copy CSS</span>
          </div>
        )}
      </div>

      {/* Code Textarea Block */}
      <div className="relative w-full">
        <textarea
          readOnly
          value={getActiveCode()}
          className="w-full bg-canvas border border-border-hairline rounded-lg p-4 font-mono text-xs text-zinc-200 min-h-[140px] focus:outline-none focus:border-zinc-700 select-all"
        />

        {/* Floating Copy Button */}
        <button
          type="button"
          onClick={() => copyCode(getActiveCode(), activeTab)}
          className={`absolute right-3 top-3 px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-all cursor-pointer flex items-center gap-1.5 shadow active:scale-95 select-none ${
            copiedFormat === activeTab
              ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
              : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200 hover:text-zinc-50'
          }`}
        >
          {copiedFormat === activeTab ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
