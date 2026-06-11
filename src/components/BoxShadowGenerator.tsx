import React, { useState, useEffect } from 'react';

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
// Interfaces
// ==========================================
interface ShadowLayer {
  id: string;
  active: boolean;
  inset: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  name?: string;
}

interface ShadowPreset {
  name: string;
  description: string;
  layers: Omit<ShadowLayer, 'id'>[];
}

// ==========================================
// Presets Definitions
// ==========================================
const PRESETS: Record<string, ShadowPreset> = {
  soft: {
    name: 'Soft Ambient',
    description: 'Beautiful, multi-layered realistic ambient shadow.',
    layers: [
      { active: true, inset: false, offsetX: 0, offsetY: 10, blur: 25, spread: -5, color: '#000000', opacity: 0.1 },
      { active: true, inset: false, offsetX: 0, offsetY: 8, blur: 10, spread: -4, color: '#000000', opacity: 0.06 },
    ]
  },
  sharp: {
    name: 'Sharp Retro',
    description: 'Crisp, offset hard shadow typical of retro designs.',
    layers: [
      { active: true, inset: false, offsetX: 6, offsetY: 6, blur: 0, spread: 0, color: '#000000', opacity: 1.0 },
    ]
  },
  neon: {
    name: 'Emerald Glow',
    description: 'Vibrant green glowing outline using dual layering.',
    layers: [
      { active: true, inset: false, offsetX: 0, offsetY: 0, blur: 25, spread: 4, color: '#34d399', opacity: 0.5 },
      { active: true, inset: false, offsetX: 0, offsetY: 0, blur: 6, spread: 1, color: '#34d399', opacity: 0.7 },
    ]
  },
  floating: {
    name: 'Floating Elevation',
    description: 'Subtle shadow with heavy blur for high-elevation dialogs.',
    layers: [
      { active: true, inset: false, offsetX: 0, offsetY: 25, blur: 50, spread: -12, color: '#000000', opacity: 0.25 },
      { active: true, inset: false, offsetX: 0, offsetY: 12, blur: 30, spread: -8, color: '#000000', opacity: 0.15 },
      { active: true, inset: false, offsetX: 0, offsetY: 4, blur: 8, spread: -4, color: '#000000', opacity: 0.05 },
    ]
  },
  inner: {
    name: 'Inner Depth',
    description: 'Sunken/carved shadow styling with light reflections.',
    layers: [
      { active: true, inset: true, offsetX: 2, offsetY: 2, blur: 6, spread: 0, color: '#000000', opacity: 0.35 },
      { active: true, inset: true, offsetX: -2, offsetY: -2, blur: 6, spread: 0, color: '#ffffff', opacity: 0.15 },
    ]
  }
};

const DEFAULT_LAYERS: ShadowLayer[] = [
  { id: '1', active: true, inset: false, offsetX: 0, offsetY: 10, blur: 25, spread: -5, color: '#000000', opacity: 0.1 },
  { id: '2', active: true, inset: false, offsetX: 0, offsetY: 8, blur: 10, spread: -4, color: '#000000', opacity: 0.06 },
];

export const BoxShadowGenerator: React.FC = () => {
  // State variables
  const [layers, setLayers] = useState<ShadowLayer[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('useutils_boxshadow_layers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return DEFAULT_LAYERS;
  });

  const [selectedId, setSelectedId] = useState<string>(() => {
    return layers.length > 0 ? layers[0].id : '1';
  });

  // Canvas config state
  const [boxColor, setBoxColor] = useState<string>('#34d399');
  const [boxRadius, setBoxRadius] = useState<number>(16);
  const [boxSize, setBoxSize] = useState<number>(180);
  const [canvasBg, setCanvasBg] = useState<'dark' | 'light' | 'grid' | 'accent'>('light');

  // Clipboard copy feedbacks
  const [copiedFormat, setCopiedFormat] = useState<'css' | 'tailwind' | null>(null);

  // Renaming states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_boxshadow_layers', JSON.stringify(layers));
    }
  }, [layers]);

  // Sync selectedId if the selected layer is deleted
  useEffect(() => {
    if (layers.length > 0 && !layers.some(l => l.id === selectedId)) {
      setSelectedId(layers[0].id);
    }
  }, [layers, selectedId]);

  // Color helper hex-to-rgb
  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
  };

  // Compile CSS Shadow String
  const getShadowCssValue = (shadowLayers: ShadowLayer[]) => {
    const active = shadowLayers.filter(l => l.active);
    if (active.length === 0) return 'none';
    return active.map(l => {
      const [r, g, b] = hexToRgb(l.color);
      const insetStr = l.inset ? 'inset ' : '';
      return `${insetStr}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${l.opacity})`;
    }).join(',\n  ');
  };

  const getShadowCssSingleLine = (shadowLayers: ShadowLayer[]) => {
    const active = shadowLayers.filter(l => l.active);
    if (active.length === 0) return 'none';
    return active.map(l => {
      const [r, g, b] = hexToRgb(l.color);
      const insetStr = l.inset ? 'inset ' : '';
      return `${insetStr}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${l.opacity})`;
    }).join(', ');
  };

  // Compile Tailwind CSS value
  const getTailwindValue = (shadowLayers: ShadowLayer[]) => {
    const active = shadowLayers.filter(l => l.active);
    if (active.length === 0) return 'shadow-none';
    const parts = active.map(l => {
      const [r, g, b] = hexToRgb(l.color);
      const insetStr = l.inset ? 'inset_' : '';
      return `${insetStr}${l.offsetX}px_${l.offsetY}px_${l.blur}px_${l.spread}px_rgba(${r},${g},${b},${l.opacity})`;
    }).join(',');
    return `shadow-[${parts}]`;
  };

  const cssCode = `box-shadow: ${getShadowCssValue(layers)};`;
  const tailwindCode = getTailwindValue(layers);

  const selectedLayer = layers.find(l => l.id === selectedId);

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveName = (id: string) => {
    setLayers(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, name: editName.trim() };
      }
      return l;
    }));
    setEditingId(null);
  };

  // Edit layer properties
  const updateSelectedLayer = (field: keyof Omit<ShadowLayer, 'id'>, value: any) => {
    setLayers(prev => prev.map(l => {
      if (l.id === selectedId) {
        return { ...l, [field]: value };
      }
      return l;
    }));
  };

  // Preset trigger
  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const newLayers = preset.layers.map((l, i) => ({
      ...l,
      id: String(Date.now() + i)
    }));
    setLayers(newLayers);
    if (newLayers.length > 0) {
      setSelectedId(newLayers[0].id);
    }
    // Auto-adjust canvas background to suit the preset style
    if (key === 'neon') {
      setCanvasBg('dark');
    } else {
      setCanvasBg('light');
    }
  };

  // Re-ordering layers
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === layers.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...layers];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setLayers(updated);
  };

  const addLayer = () => {
    const newId = String(Date.now());
    const newLayer: ShadowLayer = {
      id: newId,
      active: true,
      inset: false,
      offsetX: 0,
      offsetY: 6,
      blur: 16,
      spread: 0,
      color: '#000000',
      opacity: 0.08,
      name: `Shadow #${layers.length + 1}`
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedId(newId);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return; // Don't delete last remaining layer
    setLayers(prev => prev.filter(l => l.id !== id));
  };

  const toggleLayerActive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the layer
    setLayers(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, active: !l.active };
      }
      return l;
    }));
  };

  const resetToDefault = () => {
    setLayers(DEFAULT_LAYERS);
    setSelectedId(DEFAULT_LAYERS[0].id);
    setBoxColor('#34d399');
    setBoxRadius(16);
    setBoxSize(180);
    setCanvasBg('light');
  };

  const copyCodeToClipboard = (text: string, format: 'css' | 'tailwind') => {
    const ok = copyToClipboard(text);
    if (ok) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  // Hotkey copy support (⌘ C / Ctrl+C for CSS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        // Prevent default only if user isn't selecting text inside inputs
        const activeNode = document.activeElement;
        if (activeNode && (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        copyCodeToClipboard(cssCode, 'css');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cssCode]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Upper Options: Presets & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
            Shadow Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 text-zinc-300 hover:text-zinc-50 rounded transition-all cursor-pointer font-sans"
                title={value.description}
              >
                {value.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={resetToDefault}
          className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
        >
          Reset Defaults
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Shadow Layers and Configuration Sliders */}
        <div className="flex flex-col gap-6 bg-panel border border-border-hairline rounded-lg p-5">
          
          {/* Layer Management Block */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Shadow Layers ({layers.length})
              </h2>
              <button
                type="button"
                onClick={addLayer}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-accent-emerald/10 hover:bg-accent-emerald/20 border border-accent-emerald/30 text-accent-emerald rounded font-semibold cursor-pointer transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Layer</span>
              </button>
            </div>

            {/* Layer Items List */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {layers.map((layer, index) => {
                const isSelected = layer.id === selectedId;
                const [r, g, b] = hexToRgb(layer.color);
                
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedId(layer.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-850 border-accent-emerald/60 shadow-md'
                        : 'bg-canvas border-border-hairline/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mini preview patch */}
                      <div 
                        className="w-5 h-5 rounded border border-zinc-700 bg-white relative flex-shrink-0"
                        style={{
                          boxShadow: layer.active 
                            ? `${layer.inset ? 'inset ' : ''}${layer.offsetX / 4}px ${layer.offsetY / 4}px ${layer.blur / 4}px ${layer.spread / 4}px rgba(${r},${g},${b},${layer.opacity})`
                            : 'none'
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        {editingId === layer.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => saveName(layer.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveName(layer.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-canvas border border-accent-emerald text-zinc-150 rounded px-1.5 py-0.5 text-xs font-mono w-full outline-none focus:ring-1 focus:ring-accent-emerald"
                          />
                        ) : (
                          <span 
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startEditing(layer.id, layer.name || `${layer.inset ? 'Inset ' : ''}Shadow #${layers.length - index}`);
                            }}
                            className="text-xs font-mono font-semibold text-zinc-200 hover:text-zinc-50 select-none cursor-text truncate"
                            title="Double-click to rename"
                          >
                            {layer.name || `${layer.inset ? 'Inset ' : ''}Shadow #${layers.length - index}`}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500 truncate">
                          {layer.offsetX}px {layer.offsetY}px {layer.blur}px {layer.spread}px
                        </span>
                      </div>
                    </div>

                    {/* Layer Quick Controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Toggle Active */}
                      <button
                        type="button"
                        onClick={(e) => toggleLayerActive(layer.id, e)}
                        className={`p-1.5 rounded cursor-pointer transition-colors ${
                          layer.active ? 'text-zinc-300 hover:text-zinc-50' : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                        title={layer.active ? 'Mute layer shadow' : 'Unmute layer shadow'}
                      >
                        {layer.active ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </button>

                      {/* Move Layer Up */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveLayer(index, 'up'); }}
                        disabled={index === 0}
                        className={`p-1 rounded transition-colors ${
                          index === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-150 cursor-pointer'
                        }`}
                        title="Move Up"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>

                      {/* Move Layer Down */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveLayer(index, 'down'); }}
                        disabled={index === layers.length - 1}
                        className={`p-1 rounded transition-colors ${
                          index === layers.length - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-150 cursor-pointer'
                        }`}
                        title="Move Down"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Delete Layer */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                        disabled={layers.length <= 1}
                        className={`p-1 rounded transition-colors ${
                          layers.length <= 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-red-400/60 hover:text-red-400 cursor-pointer'
                        }`}
                        title="Delete layer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-border-hairline/60" />

          {/* Active Layer Parameters Section */}
          {selectedLayer ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Layer Configurations
                </h3>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-750 text-zinc-400 font-mono">
                  Editing: {selectedLayer.name || `Shadow #${layers.length - layers.findIndex(l => l.id === selectedId)}`}
                </span>
              </div>

              {/* Layer Name Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Layer Name</label>
                <input
                  type="text"
                  value={selectedLayer.name || ''}
                  onChange={(e) => updateSelectedLayer('name', e.target.value)}
                  placeholder={`Shadow #${layers.length - layers.findIndex(l => l.id === selectedId)}`}
                  className="w-full bg-canvas border border-border-hairline focus:border-accent-emerald text-zinc-150 rounded px-3 py-1.5 text-xs font-mono outline-none transition-all focus:ring-1 focus:ring-accent-emerald"
                />
              </div>

              {/* Inset Outset Toggle */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Shadow Type</label>
                <div className="bg-canvas border border-border-hairline rounded-lg p-1 flex gap-1 items-center max-w-[200px]">
                  <button
                    type="button"
                    onClick={() => updateSelectedLayer('inset', false)}
                    className={`flex-1 text-center py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                      !selectedLayer.inset
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-50'
                    }`}
                  >
                    Outset
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedLayer('inset', true)}
                    className={`flex-1 text-center py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                      selectedLayer.inset
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-50'
                    }`}
                  >
                    Inset
                  </button>
                </div>
              </div>

              {/* Offset X Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Offset X</span>
                  <span className="text-zinc-200 font-semibold">{selectedLayer.offsetX}px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={selectedLayer.offsetX}
                      onChange={(e) => updateSelectedLayer('offsetX', parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${((selectedLayer.offsetX + 100) / 200) * 100}% - 8px)` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={selectedLayer.offsetX}
                    onChange={(e) => updateSelectedLayer('offsetX', parseInt(e.target.value) || 0)}
                    className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
                  />
                </div>
              </div>

              {/* Offset Y Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Offset Y</span>
                  <span className="text-zinc-200 font-semibold">{selectedLayer.offsetY}px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={selectedLayer.offsetY}
                      onChange={(e) => updateSelectedLayer('offsetY', parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${((selectedLayer.offsetY + 100) / 200) * 100}% - 8px)` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={selectedLayer.offsetY}
                    onChange={(e) => updateSelectedLayer('offsetY', parseInt(e.target.value) || 0)}
                    className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
                  />
                </div>
              </div>

              {/* Blur Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Blur Radius</span>
                  <span className="text-zinc-200 font-semibold">{selectedLayer.blur}px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer.blur}
                      onChange={(e) => updateSelectedLayer('blur', parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${(selectedLayer.blur / 100) * 100}% - 8px)` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedLayer.blur}
                    onChange={(e) => updateSelectedLayer('blur', parseInt(e.target.value) || 0)}
                    className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
                  />
                </div>
              </div>

              {/* Spread Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Spread Radius</span>
                  <span className="text-zinc-200 font-semibold">{selectedLayer.spread}px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="-50"
                      max="100"
                      value={selectedLayer.spread}
                      onChange={(e) => updateSelectedLayer('spread', parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${((selectedLayer.spread + 50) / 150) * 100}% - 8px)` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="-50"
                    max="100"
                    value={selectedLayer.spread}
                    onChange={(e) => updateSelectedLayer('spread', parseInt(e.target.value) || 0)}
                    className="w-16 bg-canvas border border-border-hairline text-zinc-350 text-xs font-mono text-center rounded py-1 outline-none focus:border-zinc-750"
                  />
                </div>
              </div>

              {/* Color & Opacity Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400 font-semibold">Shadow Color</label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850 flex-shrink-0">
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onChange={(e) => updateSelectedLayer('color', e.target.value)}
                        className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={7}
                      value={selectedLayer.color.toUpperCase()}
                      onChange={(e) => updateSelectedLayer('color', e.target.value)}
                      className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-zinc-750"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                    <span>Opacity</span>
                    <span className="text-zinc-200 font-semibold">{Math.round(selectedLayer.opacity * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(selectedLayer.opacity * 100)}
                        onChange={(e) => updateSelectedLayer('opacity', parseFloat(e.target.value) / 100)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                        style={{ left: `calc(${selectedLayer.opacity * 100}% - 8px)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500 font-mono text-xs">
              No shadow layers available. Add a layer to begin.
            </div>
          )}

          <hr className="border-border-hairline/60" />

          {/* Preview Canvas Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Preview Box & Background Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Box Color</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850 flex-shrink-0">
                    <input
                      type="color"
                      value={boxColor}
                      onChange={(e) => setBoxColor(e.target.value)}
                      className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-none"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={7}
                    value={boxColor.toUpperCase()}
                    onChange={(e) => setBoxColor(e.target.value)}
                    className="w-full bg-canvas border border-border-hairline text-zinc-250 font-mono text-xs rounded px-3 py-1.5 outline-none focus:border-zinc-750"
                  />
                </div>
              </div>

              {/* Box Radius */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Border Radius</span>
                  <span className="text-zinc-200 font-semibold">{boxRadius}px</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={boxRadius}
                      onChange={(e) => setBoxRadius(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${boxRadius}% - 8px)` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Size */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Box Size</span>
                  <span className="text-zinc-200 font-semibold">{boxSize}px</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-grow relative h-3 bg-canvas border border-border-hairline rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="100"
                      max="300"
                      value={boxSize}
                      onChange={(e) => setBoxSize(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-50 border-2 border-zinc-950 shadow pointer-events-none"
                      style={{ left: `calc(${((boxSize - 100) / 200) * 100}% - 8px)` }}
                    />
                  </div>
                </div>
              </div>

              {/* Canvas Background */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 font-semibold">Canvas Background</label>
                <div className="grid grid-cols-4 gap-1 bg-canvas border border-border-hairline rounded-lg p-1">
                  {(['dark', 'light', 'grid', 'accent'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCanvasBg(type)}
                      className={`text-[10px] text-center py-1 font-semibold rounded capitalize cursor-pointer transition-all ${
                        canvasBg === type
                          ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview Panel and Code Output */}
        <div className="flex flex-col gap-6 items-stretch">
          
          {/* Visual Preview Canvas */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono mb-4">
              Real-time Preview
            </h2>

            {/* The actual Canvas Box */}
            <div 
              className={`w-full h-[320px] rounded-lg border border-border-hairline relative flex items-center justify-center overflow-hidden transition-all ${
                canvasBg === 'dark' ? 'bg-[#151515]' : 
                canvasBg === 'light' ? 'bg-[#fafafa]' : 
                canvasBg === 'accent' ? 'bg-[#34d399]/20' : ''
              }`}
              style={
                canvasBg === 'grid' 
                  ? {
                      backgroundImage: `linear-gradient(45deg, #e4e4e7 25%, transparent 25%), 
                                        linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), 
                                        linear-gradient(45deg, transparent 75%, #e4e4e7 75%), 
                                        linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)`,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                      backgroundColor: '#ffffff'
                    }
                  : {}
              }
            >
              {/* Outer boundary info */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500">
                Canvas Preview Area
              </div>

              {/* The Styled Preview Box */}
              <div 
                className="transition-all duration-75"
                style={{
                  width: `${boxSize}px`,
                  height: `${boxSize}px`,
                  borderRadius: `${boxRadius}px`,
                  backgroundColor: boxColor,
                  boxShadow: getShadowCssSingleLine(layers)
                }}
              />
            </div>
          </div>

          {/* Generated Code Output Panel */}
          <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4 flex-grow">
            
            {/* CSS Selector Block */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  CSS Code (Standard)
                </h2>
                <button
                  type="button"
                  onClick={() => copyCodeToClipboard(cssCode, 'css')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
                >
                  {copiedFormat === 'css' ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-accent-emerald font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy CSS</span>
                    </>
                  )}
                </button>
              </div>

              {/* CSS Code Box */}
              <div className="bg-canvas border border-border-hairline rounded-lg p-4 font-mono text-xs md:text-sm text-zinc-200 overflow-x-auto min-h-[100px] leading-relaxed relative group select-all">
                <span className="text-indigo-400">box-shadow:</span>{' '}
                {layers.filter(l => l.active).length === 0 ? (
                  <span className="text-zinc-500">none;</span>
                ) : (
                  layers.filter(l => l.active).map((l, i, arr) => {
                    const [r, g, b] = hexToRgb(l.color);
                    const isLast = i === arr.length - 1;
                    return (
                      <span key={l.id} className="block pl-4">
                        {l.inset && <span className="text-red-400">inset </span>}
                        <span className="text-amber-400">{l.offsetX}px {l.offsetY}px {l.blur}px {l.spread}px</span>{' '}
                        <span className="text-zinc-500">rgba(</span>
                        <span className="text-red-400">{r}</span>
                        <span className="text-zinc-500">, </span>
                        <span className="text-red-400">{g}</span>
                        <span className="text-zinc-500">, </span>
                        <span className="text-red-400">{b}</span>
                        <span className="text-zinc-500">, </span>
                        <span className="text-emerald-400">{l.opacity}</span>
                        <span className="text-zinc-500">)</span>
                        <span className="text-zinc-150">{isLast ? ';' : ','}</span>
                      </span>
                    );
                  })
                )}

                {/* Keyboard badge */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">
                    ⌘ C
                  </kbd>
                </div>
              </div>
            </div>

            {/* Tailwind arbitrary value Block */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Tailwind CSS Class
                </h2>
                <button
                  type="button"
                  onClick={() => copyCodeToClipboard(tailwindCode, 'tailwind')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
                >
                  {copiedFormat === 'tailwind' ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-accent-emerald font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy Class</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tailwind Code Box */}
              <div className="bg-canvas border border-border-hairline rounded-lg p-4 font-mono text-xs md:text-sm text-zinc-200 overflow-x-auto min-h-[50px] leading-relaxed select-all">
                <span className="text-emerald-400">{tailwindCode}</span>
              </div>
            </div>

            {/* Privacy indicator pill */}
            <div className="border-t border-border-hairline/60 pt-4 mt-auto flex flex-col gap-2">
              <div className="flex gap-2.5 items-start text-xs text-zinc-500 font-sans leading-relaxed">
                <svg className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  All calculations happen on your device. The tool does not store or transmit shadow configurations to any external server.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
