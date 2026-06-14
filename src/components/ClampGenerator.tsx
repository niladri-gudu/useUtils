import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateClamp,
  generateScaleFromRatios,
  MODULAR_SCALES,
  exportToCssVariables,
  exportToTailwindV4,
  exportToTailwindV3,
  exportToScss,
  type ScaleStep,
  type ModularScaleKey
} from '../utils-engine/clamp';

// Clipboard copy helper
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
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

export const ClampGenerator: React.FC = () => {
  // Mode: 'single' | 'scale'
  const [mode, setMode] = useState<'single' | 'scale'>('single');

  // General Settings
  const [minWidth, setMinWidth] = useState<number>(320);
  const [maxWidth, setMaxWidth] = useState<number>(1200);
  const [rootFontSize, setRootFontSize] = useState<number>(16);
  const [usePixels, setUsePixels] = useState<boolean>(false);
  const [precision, setPrecision] = useState<number>(4);

  // Single Value Settings
  const [minSize, setMinSize] = useState<number>(16);
  const [maxSize, setMaxSize] = useState<number>(48);

  // Typography Scale Settings
  const [minBase, setMinBase] = useState<number>(16);
  const [maxBase, setMaxBase] = useState<number>(18);
  const [minRatioKey, setMinRatioKey] = useState<ModularScaleKey>('perfectFourth');
  const [maxRatioKey, setMaxRatioKey] = useState<ModularScaleKey>('goldenRatio');
  
  // Custom ratios (if user wants a custom ratio)
  const [customMinRatio, setCustomMinRatio] = useState<number>(1.333);
  const [customMaxRatio, setCustomMaxRatio] = useState<number>(1.618);
  const [useCustomRatios, setUseCustomRatios] = useState<boolean>(false);

  // Scale Steps state (for table)
  const [scaleSteps, setScaleSteps] = useState<ScaleStep[]>([]);
  const [isScaleCustomized, setIsScaleCustomized] = useState<boolean>(false);

  // Copy Feedback
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Interactive Preview Width
  const [simWidth, setSimWidth] = useState<number>(768);

  // Output export tab for scale
  const [exportFormat, setExportFormat] = useState<'css' | 'tailwind-v4' | 'tailwind-v3' | 'scss'>('css');
  // Copy format for single value
  const [singleCopyFormat, setSingleCopyFormat] = useState<'css-val' | 'css-decl' | 'tailwind-v4' | 'tailwind-v3' | 'scss'>('css-val');

  const minRatioValue = useCustomRatios ? customMinRatio : MODULAR_SCALES[minRatioKey].value;
  const maxRatioValue = useCustomRatios ? customMaxRatio : MODULAR_SCALES[maxRatioKey].value;

  // Initialize and update modular scale steps
  useEffect(() => {
    if (!isScaleCustomized) {
      const generated = generateScaleFromRatios(minBase, maxBase, minRatioValue, maxRatioValue);
      setScaleSteps(generated);
    }
  }, [minBase, maxBase, minRatioValue, maxRatioValue, isScaleCustomized]);

  // Recalculate single clamp
  const singleResult = useMemo(() => {
    return calculateClamp(minWidth, maxWidth, minSize, maxSize, {
      rootFontSize,
      usePixels,
      precision
    });
  }, [minWidth, maxWidth, minSize, maxSize, rootFontSize, usePixels, precision]);

  // Recalculate all scale clamp outputs
  const scaleResults = useMemo(() => {
    const results: Record<string, string> = {};
    scaleSteps.forEach(step => {
      const res = calculateClamp(minWidth, maxWidth, step.minPx, step.maxPx, {
        rootFontSize,
        usePixels,
        precision
      });
      results[step.name] = res.clampString;
    });
    return results;
  }, [scaleSteps, minWidth, maxWidth, rootFontSize, usePixels, precision]);

  // Computed size for preview based on simulated width
  const previewSize = useMemo(() => {
    if (mode === 'single') {
      const slope = (maxSize - minSize) / (maxWidth - minWidth);
      let size = minSize;
      if (simWidth <= minWidth) {
        size = minSize;
      } else if (simWidth >= maxWidth) {
        size = maxSize;
      } else {
        size = minSize + (simWidth - minWidth) * slope;
      }
      return {
        px: Number(size.toFixed(1)),
        rem: Number((size / rootFontSize).toFixed(3))
      };
    } else {
      // Use 'base' step as preview sizes
      const baseStep = scaleSteps.find(s => s.name === 'base') || { minPx: 16, maxPx: 18 };
      const slope = (baseStep.maxPx - baseStep.minPx) / (maxWidth - minWidth);
      let size = baseStep.minPx;
      if (simWidth <= minWidth) {
        size = baseStep.minPx;
      } else if (simWidth >= maxWidth) {
        size = baseStep.maxPx;
      } else {
        size = baseStep.minPx + (simWidth - minWidth) * slope;
      }
      return {
        px: Number(size.toFixed(1)),
        rem: Number((size / rootFontSize).toFixed(3))
      };
    }
  }, [mode, simWidth, minWidth, maxWidth, minSize, maxSize, scaleSteps, rootFontSize]);

  // Update specific step in the scale steps table
  const handleUpdateStep = (id: string, field: 'minPx' | 'maxPx', val: number) => {
    setIsScaleCustomized(true);
    setScaleSteps(prev => prev.map(step => {
      if (step.id === id) {
        return {
          ...step,
          [field]: Math.max(0, val)
        };
      }
      return step;
    }));
  };

  // Reset customized scale back to ratios
  const handleResetScale = () => {
    setIsScaleCustomized(false);
    const generated = generateScaleFromRatios(minBase, maxBase, minRatioValue, maxRatioValue);
    setScaleSteps(generated);
  };

  // Copy primary single value format code
  const getSingleCodeToCopy = () => {
    const val = singleResult.clampString;
    switch (singleCopyFormat) {
      case 'css-val':
        return val;
      case 'css-decl':
        return `font-size: ${val};`;
      case 'tailwind-v4':
        return `@theme {\n  --font-size-fluid: ${val};\n}`;
      case 'tailwind-v3':
        return `extend: {\n  fontSize: {\n    'fluid': '${val}',\n  }\n}`;
      case 'scss':
        return `$font-size-fluid: ${val};`;
      default:
        return val;
    }
  };

  const handleCopySingle = () => {
    const code = getSingleCodeToCopy();
    const ok = copyToClipboard(code);
    if (ok) {
      setCopiedFormat('single');
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  // Export scale code text
  const scaleExportText = useMemo(() => {
    switch (exportFormat) {
      case 'css':
        return exportToCssVariables(scaleResults);
      case 'tailwind-v4':
        return exportToTailwindV4(scaleResults);
      case 'tailwind-v3':
        return exportToTailwindV3(scaleResults);
      case 'scss':
        return exportToScss(scaleResults);
      default:
        return '';
    }
  }, [scaleResults, exportFormat]);

  const handleCopyScale = () => {
    const ok = copyToClipboard(scaleExportText);
    if (ok) {
      setCopiedFormat('scale');
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  const handleCopyRow = (stepName: string, clampVal: string) => {
    const ok = copyToClipboard(clampVal);
    if (ok) {
      setCopiedFormat(stepName);
      setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  // Keyboard shortcut listener (CMD+C or CTRL+C for current active code block)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (activeNode && (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA' || activeNode.getAttribute('contenteditable') === 'true')) {
          return;
        }
        e.preventDefault();
        if (mode === 'single') {
          handleCopySingle();
        } else {
          handleCopyScale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, singleResult, scaleExportText, singleCopyFormat]);

  // SVG dimensions & scale calculators
  const svgWidth = 500;
  const svgHeight = 120;

  // Viewports to show on graph: 0 to 1600
  const getSvgX = (v: number) => (v / 1600) * svgWidth;

  // Size limit to show on graph: max + 10px or at least 60px
  const graphSizeLimit = Math.max(mode === 'single' ? maxSize : Math.max(...scaleSteps.map(s => s.maxPx), 40)) * 1.25;
  const getSvgY = (s: number) => svgHeight - 10 - (s / graphSizeLimit) * (svgHeight - 20);

  const graphPath = useMemo(() => {
    if (mode === 'single') {
      const x0 = getSvgX(0);
      const y0 = getSvgY(minSize);
      const xMin = getSvgX(minWidth);
      const yMin = getSvgY(minSize);
      const xMax = getSvgX(maxWidth);
      const yMax = getSvgY(maxSize);
      const xEnd = getSvgX(1600);
      const yEnd = getSvgY(maxSize);
      return `M ${x0} ${y0} L ${xMin} ${yMin} L ${xMax} ${yMax} L ${xEnd} ${yEnd}`;
    } else {
      // Use 'base' step for graph path
      const baseStep = scaleSteps.find(s => s.name === 'base') || { minPx: 16, maxPx: 18 };
      const x0 = getSvgX(0);
      const y0 = getSvgY(baseStep.minPx);
      const xMin = getSvgX(minWidth);
      const yMin = getSvgY(baseStep.minPx);
      const xMax = getSvgX(maxWidth);
      const yMax = getSvgY(baseStep.maxPx);
      const xEnd = getSvgX(1600);
      const yEnd = getSvgY(baseStep.maxPx);
      return `M ${x0} ${y0} L ${xMin} ${yMin} L ${xMax} ${yMax} L ${xEnd} ${yEnd}`;
    }
  }, [mode, minWidth, maxWidth, minSize, maxSize, scaleSteps, graphSizeLimit]);

  // Interactive Dot on SVG Graph
  const dotCoords = useMemo(() => {
    let size = minSize;
    if (mode === 'single') {
      const slope = (maxSize - minSize) / (maxWidth - minWidth);
      if (simWidth <= minWidth) size = minSize;
      else if (simWidth >= maxWidth) size = maxSize;
      else size = minSize + (simWidth - minWidth) * slope;
    } else {
      const baseStep = scaleSteps.find(s => s.name === 'base') || { minPx: 16, maxPx: 18 };
      const slope = (baseStep.maxPx - baseStep.minPx) / (maxWidth - minWidth);
      if (simWidth <= minWidth) size = baseStep.minPx;
      else if (simWidth >= maxWidth) size = baseStep.maxPx;
      else size = baseStep.minPx + (simWidth - minWidth) * slope;
    }
    return {
      x: getSvgX(simWidth),
      y: getSvgY(size)
    };
  }, [mode, simWidth, minWidth, maxWidth, minSize, maxSize, scaleSteps, graphSizeLimit]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* Upper Mode Switcher & Global Resets */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-xl p-4">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-border-hairline p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-4 py-1.5 text-xs font-mono rounded-md font-semibold select-none border transition-all ${
              mode === 'single'
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Single Value
          </button>
          <button
            type="button"
            onClick={() => setMode('scale')}
            className={`px-4 py-1.5 text-xs font-mono rounded-md font-semibold select-none border transition-all ${
              mode === 'scale'
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Fluid Type Scale
          </button>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'scale' && isScaleCustomized && (
            <button
              type="button"
              onClick={handleResetScale}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-zinc-300 hover:text-zinc-50 transition-colors font-mono"
            >
              Reset Scale Ratios
            </button>
          )}
          <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded border border-border-hairline/40 uppercase tracking-wider">
            {mode === 'single' ? 'Single Size Calculator' : 'Scale Matrix Planner'}
          </span>
        </div>
      </div>

      {/* Main Split-Pane UI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Controls (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-panel border border-border-hairline rounded-xl p-5">
          
          {/* Section: Viewport Width Limits */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>🖥️</span> Viewport Range Settings
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Min Width (Mobile)</label>
                <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                  <input
                    type="number"
                    value={minWidth}
                    onChange={(e) => setMinWidth(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Max Width (Desktop)</label>
                <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                  <input
                    type="number"
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-hairline/80" />

          {/* Section: Sizing Ranges */}
          {mode === 'single' ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                <span>📏</span> Size Boundaries
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Min Font/Spacing Size</label>
                  <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                    <input
                      type="number"
                      value={minSize}
                      onChange={(e) => setMinSize(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Max Font/Spacing Size</label>
                  <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                    <input
                      type="number"
                      value={maxSize}
                      onChange={(e) => setMaxSize(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                <span>📐</span> Scale Ratio Settings
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Min Base (Mobile)</label>
                  <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                    <input
                      type="number"
                      value={minBase}
                      onChange={(e) => setMinBase(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Max Base (Desktop)</label>
                  <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-3 py-1.5 focus-within:border-accent-emerald transition-colors">
                    <input
                      type="number"
                      value={maxBase}
                      onChange={(e) => setMaxBase(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">PX</span>
                  </div>
                </div>
              </div>

              {/* Ratios selection */}
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-400">Scale Ratio Mode</label>
                  <button
                    type="button"
                    onClick={() => setUseCustomRatios(!useCustomRatios)}
                    className="text-[10px] text-accent-emerald hover:text-emerald-300 font-mono underline"
                  >
                    {useCustomRatios ? 'Use Preset List' : 'Enter Custom Ratios'}
                  </button>
                </div>

                {useCustomRatios ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-mono text-zinc-500">Min Viewport Ratio</label>
                      <input
                        type="number"
                        step="0.001"
                        value={customMinRatio}
                        onChange={(e) => setCustomMinRatio(Math.max(1.001, parseFloat(e.target.value) || 0))}
                        className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent-emerald"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-mono text-zinc-500">Max Viewport Ratio</label>
                      <input
                        type="number"
                        step="0.001"
                        value={customMaxRatio}
                        onChange={(e) => setCustomMaxRatio(Math.max(1.001, parseFloat(e.target.value) || 0))}
                        className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent-emerald"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-mono text-zinc-400">Mobile Scale Ratio</label>
                      <select
                        value={minRatioKey}
                        onChange={(e) => setMinRatioKey(e.target.value as ModularScaleKey)}
                        className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-accent-emerald"
                      >
                        {Object.entries(MODULAR_SCALES).map(([key, value]) => (
                          <option key={key} value={key}>{value.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-mono text-zinc-400">Desktop Scale Ratio</label>
                      <select
                        value={maxRatioKey}
                        onChange={(e) => setMaxRatioKey(e.target.value as ModularScaleKey)}
                        className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-accent-emerald"
                      >
                        {Object.entries(MODULAR_SCALES).map(([key, value]) => (
                          <option key={key} value={key}>{value.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="border-border-hairline/80" />

          {/* Section: Sizing Calculations Config */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>⚙️</span> Engine Specifications
            </h3>

            <div className="flex flex-col gap-4">
              {/* Root Font Size */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-300">Root Font Size</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Used to convert values to rem (standard: 16px)</span>
                </div>
                <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-2.5 py-1 focus-within:border-accent-emerald transition-colors w-24">
                  <input
                    type="number"
                    value={rootFontSize}
                    onChange={(e) => setRootFontSize(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none text-center"
                  />
                  <span className="text-[10px] text-zinc-550 font-mono">PX</span>
                </div>
              </div>

              {/* Decimal Precision */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-300">Rounding Precision</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Decimal places inside CSS clamp function</span>
                </div>
                <div className="flex items-center gap-1.5 bg-canvas border border-border-hairline rounded-lg px-2.5 py-1 focus-within:border-accent-emerald transition-colors w-24">
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={precision}
                    onChange={(e) => setPrecision(Math.max(1, Math.min(6, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent text-zinc-150 font-mono text-xs outline-none text-center"
                  />
                </div>
              </div>

              {/* Unit Switcher */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-zinc-300">Output Value Unit</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Calculate boundaries in rem or px</span>
                </div>
                <div className="bg-canvas border border-border-hairline rounded-lg p-0.5 flex gap-0.5 items-center">
                  <button
                    type="button"
                    onClick={() => setUsePixels(false)}
                    className={`px-3 py-1 text-[10px] font-mono font-semibold rounded transition-all cursor-pointer ${
                      !usePixels
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-50 border border-transparent'
                    }`}
                  >
                    REM
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePixels(true)}
                    className={`px-3 py-1 text-[10px] font-mono font-semibold rounded transition-all cursor-pointer ${
                      usePixels
                        ? 'bg-zinc-800 text-zinc-50 border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-50 border border-transparent'
                    }`}
                  >
                    PX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Outputs, Chart, Previews (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card: Code Output Display */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
            
            {mode === 'single' ? (
              // Code display for Single Mode
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                    <span>⚡</span> Generated CSS clamp()
                  </h3>
                  
                  {/* format options */}
                  <div className="flex flex-wrap gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                    {(['css-val', 'css-decl', 'tailwind-v4', 'tailwind-v3', 'scss'] as const).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSingleCopyFormat(fmt)}
                        className={`px-2 py-1 text-[9px] font-mono uppercase rounded cursor-pointer select-none transition-all ${
                          singleCopyFormat === fmt
                            ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                            : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        {fmt === 'css-val' ? 'Value' : fmt === 'css-decl' ? 'Decl' : fmt === 'tailwind-v4' ? 'TW v4' : fmt === 'tailwind-v3' ? 'TW v3' : 'SCSS'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* The main code display box */}
                <div className="relative group bg-zinc-950 border border-border-hairline rounded-lg p-4 font-mono text-xs text-zinc-100 flex items-center justify-between overflow-x-auto min-h-[58px]">
                  <code className="whitespace-pre text-accent-emerald pr-28">
                    {getSingleCodeToCopy()}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySingle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedFormat === 'single' ? (
                      <span className="text-accent-emerald font-semibold animate-pulse">Copied!</span>
                    ) : (
                      <>
                        <span>Copy</span>
                        <kbd className="font-mono bg-zinc-850 px-1 py-0.2 rounded border border-zinc-700 text-[8px] text-zinc-550 group-hover:text-zinc-400">⌘ C</kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Code display for Scale Mode
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                    <span>⚡</span> System Export: Typographic Scale Config
                  </h3>
                  
                  {/* format options */}
                  <div className="flex gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                    {(['css', 'tailwind-v4', 'tailwind-v3', 'scss'] as const).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={`px-2 py-1 text-[9px] font-mono uppercase rounded cursor-pointer select-none transition-all ${
                          exportFormat === fmt
                            ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                            : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        {fmt === 'css' ? 'CSS Vars' : fmt === 'tailwind-v4' ? 'TW v4' : fmt === 'tailwind-v3' ? 'TW v3' : 'SCSS'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group bg-zinc-950 border border-border-hairline rounded-lg p-4 font-mono text-[11px] text-zinc-300 overflow-hidden">
                  <pre className="max-h-[160px] overflow-y-auto pr-16 select-text text-accent-emerald scrollbar-thin">
                    <code>{scaleExportText}</code>
                  </pre>
                  
                  <button
                    type="button"
                    onClick={handleCopyScale}
                    className="absolute right-3 top-3 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedFormat === 'scale' ? (
                      <span className="text-accent-emerald font-semibold animate-pulse">Copied!</span>
                    ) : (
                      <>
                        <span>Copy All</span>
                        <kbd className="font-mono bg-zinc-850 px-1 py-0.2 rounded border border-zinc-700 text-[8px] text-zinc-550">⌘ C</kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card: SVG Visualization Graph */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>📈</span> Sizing Curve Visualization
            </h3>
            
            <div className="relative w-full bg-zinc-950/80 border border-border-hairline/60 rounded-lg p-2.5 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                {/* Horizontal Guide Lines */}
                <line x1="0" y1={getSvgY(minSize)} x2={svgWidth} y2={getSvgY(minSize)} stroke="#2c2c2e" strokeDasharray="3,3" strokeWidth="1" />
                {mode === 'single' ? (
                  <line x1="0" y1={getSvgY(maxSize)} x2={svgWidth} y2={getSvgY(maxSize)} stroke="#2c2c2e" strokeDasharray="3,3" strokeWidth="1" />
                ) : (
                  <line x1="0" y1={getSvgY(scaleSteps.find(s => s.name === 'base')?.maxPx || 18)} x2={svgWidth} y2={getSvgY(scaleSteps.find(s => s.name === 'base')?.maxPx || 18)} stroke="#2c2c2e" strokeDasharray="3,3" strokeWidth="1" />
                )}

                {/* Vertical Viewport Markers */}
                <line x1={getSvgX(minWidth)} y1="5" x2={getSvgX(minWidth)} y2={svgHeight - 5} stroke="#2c2c2e" strokeWidth="1" />
                <line x1={getSvgX(maxWidth)} y1="5" x2={getSvgX(maxWidth)} y2={svgHeight - 5} stroke="#2c2c2e" strokeWidth="1" />

                {/* Text Labels for Markers */}
                <text x={getSvgX(minWidth) - 4} y="15" fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="end">
                  {minWidth}px
                </text>
                <text x={getSvgX(maxWidth) + 4} y="15" fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="start">
                  {maxWidth}px
                </text>

                {/* Sizing Labels */}
                <text x="5" y={getSvgY(minSize) - 4} fill="#71717a" fontSize="8" fontFamily="monospace">
                  Min size: {mode === 'single' ? minSize : scaleSteps.find(s => s.name === 'base')?.minPx || 16}px
                </text>
                <text x="5" y={getSvgY(mode === 'single' ? maxSize : scaleSteps.find(s => s.name === 'base')?.maxPx || 18) - 4} fill="#71717a" fontSize="8" fontFamily="monospace">
                  Max size: {mode === 'single' ? maxSize : scaleSteps.find(s => s.name === 'base')?.maxPx || 18}px
                </text>

                {/* The main clamp plot curve */}
                <path d={graphPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Hover indicator for simulated viewport width */}
                <line x1={dotCoords.x} y1="0" x2={dotCoords.x} y2={svgHeight} stroke="#34d399" strokeOpacity="0.25" strokeDasharray="2,2" strokeWidth="1.5" />
                
                {/* Intersection Circle Dot */}
                <circle cx={dotCoords.x} cy={dotCoords.y} r="5.5" fill="#1c1c1e" stroke="#34d399" strokeWidth="2.5" />
              </svg>

              {/* Tiny legend */}
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-550 mt-1">
                <span>Viewport width (0px → 1600px)</span>
                <span className="text-accent-emerald flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-ping" />
                  Live marker: {simWidth}px viewport
                </span>
              </div>
            </div>
          </div>

          {/* Card: Live Responsive Preview Sandbox */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                  <span>📱</span> Live Resizing Sandbox
                </h3>
                <p className="text-[10px] text-zinc-550 font-sans mt-0.5">
                  Slide or drag to simulate viewport width and observe typography fluid resizing.
                </p>
              </div>

              {/* Quick Viewport Presets */}
              <div className="flex flex-wrap items-center gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                {[
                  { name: 'Mobile', width: 375, icon: '📱' },
                  { name: 'Tablet', width: 768, icon: '📟' },
                  { name: 'Desktop', width: 1024, icon: '💻' },
                  { name: 'Wide', width: 1440, icon: '🖥️' }
                ].map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSimWidth(item.width)}
                    className={`px-2 py-1 text-[9px] font-mono rounded cursor-pointer select-none transition-all flex items-center gap-1 ${
                      simWidth === item.width
                        ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                        : 'text-zinc-550 hover:text-zinc-350 border border-transparent'
                    }`}
                    title={`Set viewport to ${item.width}px`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider control */}
            <div className="flex flex-col gap-2 bg-zinc-950/60 border border-border-hairline/80 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Simulated Viewport Width</span>
                <span className="text-zinc-150 font-semibold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {simWidth}px
                </span>
              </div>
              <div className="relative h-4 w-full bg-canvas border border-border-hairline rounded-full overflow-hidden flex items-center px-1">
                <input
                  type="range"
                  min="320"
                  max="1600"
                  value={simWidth}
                  onChange={(e) => setSimWidth(parseInt(e.target.value))}
                  className="w-full h-full opacity-0 absolute inset-0 cursor-ew-resize z-10"
                />
                {/* Track styling */}
                <div 
                  className="h-1.5 rounded-full bg-accent-emerald/20 absolute left-2 right-2 pointer-events-none"
                />
                {/* Thumb pointer */}
                <div 
                  className="w-4 h-4 rounded-full bg-zinc-100 border-2 border-accent-emerald shadow-lg absolute pointer-events-none transition-all"
                  style={{ left: `calc(${((simWidth - 320) / (1600 - 320)) * 100}% - ${8 + ((simWidth - 320) / 1280) * 8}px)` }}
                />
              </div>
            </div>

            {/* Resizable Preview Container Frame */}
            <div className="border border-border-hairline rounded-lg overflow-hidden bg-zinc-950/40 flex flex-col items-center p-4 min-h-[160px]">
              <div 
                className="max-w-full bg-panel border border-border-hairline/80 rounded-lg p-5 flex flex-col gap-3 shadow-lg select-text transition-all overflow-hidden"
                style={{ width: `${(simWidth / 1440) * 100}%`, minWidth: '280px' }}
              >
                {/* Header detail */}
                <div className="flex items-center justify-between border-b border-border-hairline pb-2 text-[10px] font-mono text-zinc-550 select-none">
                  <span>Fluid Component Preview</span>
                  <span className="text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2 py-0.5 rounded font-semibold uppercase">
                    computed: {previewSize.px}px ({previewSize.rem}rem)
                  </span>
                </div>

                {/* Font Size Target Text */}
                <div className="flex flex-col gap-2.5">
                  <h4 
                    className="font-semibold text-zinc-50 leading-tight transition-all"
                    style={{ 
                      fontSize: mode === 'single' 
                        ? `${previewSize.px}px` 
                        : `${previewSize.px}px` 
                    }}
                  >
                    Fluid typography adapts to sizes.
                  </h4>
                  <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. This card container matches the current simulated width. The header font-size dynamically resizes completely on the client side according to the calculated viewport slope.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scale Step Table (rendered if Mode is scale) */}
          {mode === 'scale' && (
            <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-3 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                  <span>📊</span> Generated Typographic Matrix
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Double-click or edit values directly</span>
              </div>

              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-hairline/50 text-zinc-500 text-[10px]">
                    <th className="py-2.5 pr-2">Step</th>
                    <th className="py-2.5 px-2 text-center">Min (px)</th>
                    <th className="py-2.5 px-2 text-center">Max (px)</th>
                    <th className="py-2.5 px-2 w-full">Clamp CSS</th>
                    <th className="py-2.5 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline/30 text-zinc-300">
                  {scaleSteps.map((step) => {
                    const clampVal = scaleResults[step.name] || '';
                    return (
                      <tr key={step.id} className="hover:bg-zinc-900/30">
                        {/* Name */}
                        <td className="py-2 pr-2 font-semibold text-zinc-100">{step.name}</td>
                        
                        {/* Min Size input */}
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            value={step.minPx}
                            onChange={(e) => handleUpdateStep(step.id, 'minPx', parseInt(e.target.value) || 0)}
                            className="bg-canvas border border-border-hairline/80 text-zinc-150 font-mono text-xs text-center rounded w-14 py-1 outline-none focus:border-accent-emerald"
                          />
                        </td>

                        {/* Max Size input */}
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            value={step.maxPx}
                            onChange={(e) => handleUpdateStep(step.id, 'maxPx', parseInt(e.target.value) || 0)}
                            className="bg-canvas border border-border-hairline/80 text-zinc-150 font-mono text-xs text-center rounded w-14 py-1 outline-none focus:border-accent-emerald"
                          />
                        </td>

                        {/* Computed Clamp String */}
                        <td className="py-2 px-2 text-accent-emerald select-all text-[11px] truncate max-w-[200px]" title={clampVal}>
                          {clampVal}
                        </td>

                        {/* Individual copy actions */}
                        <td className="py-2 pl-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyRow(step.name, clampVal)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline/80 text-zinc-400 hover:text-accent-emerald rounded text-[10px] cursor-pointer font-mono"
                          >
                            {copiedFormat === step.name ? 'Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
