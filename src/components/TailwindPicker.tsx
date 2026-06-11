import React, { useState, useEffect, useRef } from 'react';

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
// Color Conversion Helpers
// ==========================================
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number, a: number = 1): string => {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) {
    const alphaHex = toHex(Math.round(a * 255));
    return `${hex}${alphaHex}`.toUpperCase();
  }
  return hex.toUpperCase();
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(l * 100)
  ];
};

// ==========================================
// Robust Color Parser
// ==========================================
interface ParsedColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  a: number;
  format: 'hex' | 'rgb' | 'hsl';
}

const parseColorString = (input: string): ParsedColor | null => {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // 1. HEX/HEXA matching
  const hexRegex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
  const hexMatch = str.match(hexRegex);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    let a = 1;
    if (hex.length === 8) {
      a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100;
    }
    if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
      const [h, s, l] = rgbToHsl(r, g, b);
      return { r, g, b, h, s, l, a, format: 'hex' };
    }
  }

  // 2. RGB/RGBA matching
  const rgbLegacyRegex = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*(?:,\s*([\d.]+%?)\s*)?\)$/;
  const rgbModernRegex = /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/;
  const matchRgb = str.match(rgbLegacyRegex) || str.match(rgbModernRegex);
  if (matchRgb) {
    const parseChannel = (val: string, max: number): number => {
      if (val.endsWith('%')) {
        return Math.min(max, Math.max(0, (parseFloat(val) / 100) * max));
      }
      return Math.min(max, Math.max(0, parseFloat(val)));
    };

    const r = Math.round(parseChannel(matchRgb[1], 255));
    const g = Math.round(parseChannel(matchRgb[2], 255));
    const b = Math.round(parseChannel(matchRgb[3], 255));
    
    let a = 1;
    if (matchRgb[4] !== undefined) {
      const val = matchRgb[4];
      if (val.endsWith('%')) {
        a = Math.min(1, Math.max(0, parseFloat(val) / 100));
      } else {
        a = Math.min(1, Math.max(0, parseFloat(val)));
      }
      a = Math.round(a * 100) / 100;
    }

    if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
      const [h, s, l] = rgbToHsl(r, g, b);
      return { r, g, b, h, s, l, a, format: 'rgb' };
    }
  }

  // 3. HSL/HSLA matching
  const hslLegacyRegex = /^hsla?\(\s*([\d.]+)(deg|rad|turn)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?)\s*)?\)$/;
  const hslModernRegex = /^hsla?\(\s*([\d.]+)(deg|rad|turn)?\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+%?)\s*)?\)$/;
  const matchHsl = str.match(hslLegacyRegex) || str.match(hslModernRegex);
  if (matchHsl) {
    let h = parseFloat(matchHsl[1]);
    const unit = matchHsl[2];
    if (unit === 'rad') {
      h = Math.round((h * 180) / Math.PI);
    } else if (unit === 'turn') {
      h = Math.round(h * 360);
    }
    h = ((h % 360) + 360) % 360;

    const s = Math.min(100, Math.max(0, parseFloat(matchHsl[3])));
    const l = Math.min(100, Math.max(0, parseFloat(matchHsl[4])));

    let a = 1;
    if (matchHsl[5] !== undefined) {
      const val = matchHsl[5];
      if (val.endsWith('%')) {
        a = Math.min(1, Math.max(0, parseFloat(val) / 100));
      } else {
        a = Math.min(1, Math.max(0, parseFloat(val)));
      }
      a = Math.round(a * 100) / 100;
    }

    if (!isNaN(h) && !isNaN(s) && !isNaN(l) && !isNaN(a)) {
      const [r, g, b] = hslToRgb(h, s, l);
      return { r, g, b, h, s, l, a, format: 'hsl' };
    }
  }

  // 4. Raw color strings (e.g. "red" or hex without hash)
  const namesMap: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
    yellow: '#eab308', purple: '#a855f7', orange: '#f97316', pink: '#ec4899', gray: '#6b7280'
  };
  if (namesMap[str]) {
    const [r, g, b] = hexToRgb(namesMap[str]);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { r, g, b, h, s, l, a: 1, format: 'hex' };
  }

  return null;
};

// ==========================================
// Contrast Ratio Helpers (WCAG 2.1)
// ==========================================
const getLuminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrastRatio = (lum1: number, lum2: number): number => {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

const getWcagRating = (ratio: number) => {
  if (ratio >= 7) return { label: 'AAA Pass', bg: 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald', pass: true };
  if (ratio >= 4.5) return { label: 'AA Pass', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', pass: true };
  if (ratio >= 3) return { label: 'AA Large', bg: 'bg-amber-400/10 border-amber-400/20 text-amber-400', pass: true };
  return { label: 'Fail', bg: 'bg-red-400/10 border-red-400/20 text-red-400', pass: false };
};

// ==========================================
// Tailwind Colors Dictionary (v4 Spec)
// ==========================================
const TAILWIND_COLORS: Record<string, string[]> = {
  // Grays
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
  zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'],
  neutral: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d8', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'],
  stone: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09'],
  
  // Warms
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
  orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
  yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'],
  
  // Greens
  lime: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'],
  green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
  
  // Cyans / Blues
  teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
  cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
  sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  
  // Violets / Purples
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
  violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
  purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
  
  // Pinks / Warm Accents
  fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
  pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
  rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
};

const COLOR_CATEGORIES = [
  { name: 'Neutral Grays', families: ['slate', 'gray', 'zinc', 'neutral', 'stone'] },
  { name: 'Warm Red/Orange', families: ['red', 'orange', 'amber', 'yellow'] },
  { name: 'Fresh Green/Emerald', families: ['lime', 'green', 'emerald'] },
  { name: 'Cool Teal/Cyan/Sky', families: ['teal', 'cyan', 'sky', 'blue'] },
  { name: 'Deep Indigo/Purple', families: ['indigo', 'violet', 'purple'] },
  { name: 'Vibrant Pink/Rose', families: ['fuchsia', 'pink', 'rose'] },
];

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const OPACITIES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

const findNearestTailwindColor = (r: number, g: number, b: number): { name: string; shade: number; hex: string; distance: number } => {
  let minDistance = Infinity;
  let nearestFamily = 'slate';
  let nearestShade = 500;
  let nearestHex = '#64748b';

  Object.entries(TAILWIND_COLORS).forEach(([name, hexList]) => {
    hexList.forEach((hex, idx) => {
      const [tr, tg, tb] = hexToRgb(hex);
      // Euclidean distance in RGB space
      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFamily = name;
        nearestShade = SHADES[idx];
        nearestHex = hex;
      }
    });
  });

  return { 
    name: nearestFamily, 
    shade: nearestShade, 
    hex: nearestHex, 
    distance: Math.round(minDistance * 10) / 10 
  };
};

export const TailwindPicker: React.FC = () => {
  // Main Selection State
  const [activeFamily, setActiveFamily] = useState<string>('slate');
  const [activeShadeIndex, setActiveShadeIndex] = useState<number>(5); // Index of shade 500
  const [opacity, setOpacity] = useState<number>(100);
  const [prefix, setPrefix] = useState<'bg' | 'text' | 'border' | 'decoration' | 'from' | 'to' | 'via'>('bg');

  // Reverse Matcher State
  const [customInput, setCustomInput] = useState<string>('');
  const [matchResult, setMatchResult] = useState<{ name: string; shade: number; hex: string; distance: number } | null>(null);
  const [matchError, setMatchError] = useState<boolean>(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Sandbox Settings
  const [sandboxBg, setSandboxBg] = useState<string>('bg-zinc-900/50');
  const [sandboxText, setSandboxText] = useState<string>('text-zinc-100');
  const [sandboxBorder, setSandboxBorder] = useState<string>('border-zinc-800');
  const [sandboxAccent, setSandboxAccent] = useState<string>('bg-accent-emerald');

  // Copy Feedback UI States
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copyTip, setCopyTip] = useState<string>('');

  const rightPanelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          (activeElement as HTMLElement).blur();
        }
        return;
      }

      // Key: o or / -> focus search
      if (e.key === '/' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      const allFamilies = Object.keys(TAILWIND_COLORS);
      const currentFamilyIdx = allFamilies.indexOf(activeFamily);

      switch (e.key) {
        // Arrow Keys: Navigate shades & families
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setActiveShadeIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setActiveShadeIndex((prev) => Math.min(SHADES.length - 1, prev + 1));
          break;
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          if (currentFamilyIdx > 0) {
            setActiveFamily(allFamilies[currentFamilyIdx - 1]);
          }
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (currentFamilyIdx < allFamilies.length - 1) {
            setActiveFamily(allFamilies[currentFamilyIdx + 1]);
          }
          break;

        // Copy actions
        case 'c':
        case 'C': {
          e.preventDefault();
          const baseName = `${activeFamily}-${SHADES[activeShadeIndex]}`;
          const finalClass = opacity === 100 ? `${prefix}-${baseName}` : `${prefix}-${baseName}/${opacity}`;
          triggerCopy(finalClass, `Class copied: ${finalClass}`);
          break;
        }
        case 'x':
        case 'X': {
          e.preventDefault();
          const hexBase = TAILWIND_COLORS[activeFamily][activeShadeIndex];
          const rgbArr = hexToRgb(hexBase);
          const finalHex = rgbToHex(...rgbArr, opacity / 100);
          triggerCopy(finalHex, `HEX copied: ${finalHex}`);
          break;
        }
        case 'r':
        case 'R': {
          e.preventDefault();
          const hexBase = TAILWIND_COLORS[activeFamily][activeShadeIndex];
          const rgbArr = hexToRgb(hexBase);
          const finalRgba = opacity === 100 
            ? `rgb(${rgbArr[0]}, ${rgbArr[1]}, ${rgbArr[2]})`
            : `rgba(${rgbArr[0]}, ${rgbArr[1]}, ${rgbArr[2]}, ${opacity / 100})`;
          triggerCopy(finalRgba, `RGBA copied: ${finalRgba}`);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFamily, activeShadeIndex, opacity, prefix]);

  // Handle custom hex/rgb input parser
  const handleCustomInputChange = (val: string) => {
    setCustomInput(val);
    if (!val.trim()) {
      setMatchResult(null);
      setMatchError(false);
      return;
    }

    const parsed = parseColorString(val);
    if (parsed) {
      setMatchError(false);
      const match = findNearestTailwindColor(parsed.r, parsed.g, parsed.b);
      setMatchResult(match);
      
      // Auto select the matched color
      setActiveFamily(match.name);
      const shadeIdx = SHADES.indexOf(match.shade);
      if (shadeIdx !== -1) {
        setActiveShadeIndex(shadeIdx);
      }
      if (parsed.a < 1) {
        // Round opacity to nearest 5
        const approxOpacity = Math.round((parsed.a * 100) / 5) * 5;
        setOpacity(approxOpacity);
      } else {
        setOpacity(100);
      }
    } else {
      setMatchError(true);
    }
  };

  const triggerCopy = (text: string, tip: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopiedText(text);
      setCopyTip(tip);
      setTimeout(() => {
        setCopiedText(null);
      }, 1500);
    }
  };

  // Get active shade properties
  const activeColorHex = TAILWIND_COLORS[activeFamily][activeShadeIndex];
  const activeRgb = hexToRgb(activeColorHex);
  const activeComputedHex = rgbToHex(...activeRgb, opacity / 100);
  const activeComputedRgba = opacity === 100 
    ? `rgb(${activeRgb[0]}, ${activeRgb[1]}, ${activeRgb[2]})`
    : `rgba(${activeRgb[0]}, ${activeRgb[1]}, ${activeRgb[2]}, ${opacity / 100})`;

  const activeClassName = opacity === 100 
    ? `${prefix}-${activeFamily}-${SHADES[activeShadeIndex]}`
    : `${prefix}-${activeFamily}-${SHADES[activeShadeIndex]}/${opacity}`;

  // WCAG evaluations
  const activeLuminance = getLuminance(...activeRgb);
  const contrastWhite = getContrastRatio(activeLuminance, 1.0);
  const contrastBlack = getContrastRatio(activeLuminance, 0.0);
  const whiteRating = getWcagRating(contrastWhite);
  const blackRating = getWcagRating(contrastBlack);

  // Native color picker trigger
  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleCustomInputChange(e.target.value);
  };

  // Quick preset loader
  const loadRandomColor = () => {
    const randomR = Math.floor(Math.random() * 256);
    const randomG = Math.floor(Math.random() * 256);
    const randomB = Math.floor(Math.random() * 256);
    const randomHex = rgbToHex(randomR, randomG, randomB);
    handleCustomInputChange(randomHex);
  };

  // Filtered families based on Search Query
  const filteredCategories = COLOR_CATEGORIES.map(category => {
    const families = category.families.filter(fam => 
      fam.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...category, families };
  }).filter(cat => cat.families.length > 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 2-Column Split Pane Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: controls & sandbox (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          
          {/* Section: Custom Color Matcher */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono mb-2 flex items-center justify-between">
              <span>Tailwind reverse matcher</span>
              <kbd className="text-[10px] text-zinc-500 font-normal border border-zinc-800 bg-zinc-900/50 px-1 py-0.5 rounded font-mono">
                Press / to focus
              </kbd>
            </h3>
            
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={customInput}
                onChange={(e) => handleCustomInputChange(e.target.value)}
                placeholder="Paste HEX, RGB, HSL... (e.g. #34d399)"
                className={`w-full pl-9 pr-24 bg-canvas border ${
                  matchError ? 'border-red-400/50 focus:border-red-400' : 'border-border-hairline focus:border-accent-emerald'
                } text-zinc-150 rounded-lg py-2.5 text-xs outline-none font-mono transition-all`}
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRandomColor}
                  title="Random color"
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-50 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>
                <div className="relative w-5 h-5 rounded border border-zinc-700 overflow-hidden cursor-pointer bg-zinc-850">
                  <input
                    type="color"
                    value={activeColorHex}
                    onChange={handleNativePicker}
                    className="absolute inset-0 w-8 h-8 -translate-x-1.5 -translate-y-1.5 cursor-pointer border-none p-0 bg-none"
                  />
                </div>
              </div>
            </div>

            {matchError && (
              <p className="text-[10px] text-red-400 font-mono mt-1">
                ⚠️ Invalid color format. Support HEX, RGB, RGBA, HSL, HSLA.
              </p>
            )}

            {matchResult && !matchError && (
              <div className="mt-2.5 p-2 bg-zinc-900/60 border border-zinc-800/80 rounded-lg flex items-center justify-between text-[11px] font-mono text-zinc-350">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: matchResult.hex }}></span>
                  <span>Closest match:</span>
                  <span className="text-accent-emerald font-semibold">{matchResult.name}-{matchResult.shade}</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Distance: {matchResult.distance} ({(100 - Math.min(100, matchResult.distance * 2)).toFixed(0)}% match)
                </div>
              </div>
            )}
          </div>

          <hr className="border-border-hairline" />

          {/* Section: Color Families Selector */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Color families
              </h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-canvas border border-border-hairline text-zinc-350 text-[11px] font-mono rounded px-2 py-0.5 w-28 outline-none focus:border-zinc-700"
              />
            </div>

            <div className="flex flex-col gap-3.5 lg:max-h-56 lg:overflow-y-auto pr-1 no-scrollbar">
              {filteredCategories.map((cat, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold font-mono">
                    {cat.name}
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
                    {cat.families.map((fam) => {
                      const baseHex = TAILWIND_COLORS[fam][5]; // Use 500 shade for preview
                      const isActive = activeFamily === fam;
                      return (
                        <button
                          key={fam}
                          type="button"
                          onClick={() => {
                            setActiveFamily(fam);
                            setMatchResult(null);
                            setCustomInput('');
                          }}
                          className={`group flex flex-col items-center justify-center py-2.5 rounded border ${
                            isActive 
                              ? 'border-accent-emerald bg-accent-emerald/5' 
                              : 'border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/60'
                          } transition-all cursor-pointer`}
                          title={`Select ${fam} family`}
                        >
                          <span 
                            className="w-4.5 h-4.5 rounded-full border border-zinc-950/40 shadow-sm mb-1 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: baseHex }}
                          />
                          <span className="text-[9px] font-mono font-medium text-zinc-400 group-hover:text-zinc-150 capitalize truncate max-w-full px-0.5">
                            {fam}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="text-xs text-zinc-500 font-mono py-2 text-center">
                  No color families found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Section: Opacity Selector */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-wider text-zinc-400 font-semibold">
                Opacity modifier
              </span>
              <span className="text-accent-emerald font-semibold bg-accent-emerald/10 border border-accent-emerald/20 px-1.5 py-0.5 rounded text-[11px]">
                /{opacity}
              </span>
            </div>

            {/* Slider track */}
            <div className="relative h-6 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center px-2">
              <div 
                className="absolute inset-y-0.5 left-0.5 right-0.5 rounded opacity-40 bg-zinc-950 checkerboard-pattern"
                style={{ zIndex: 0 }}
              />
              <div 
                className="absolute inset-y-0.5 left-0.5 right-0.5 rounded"
                style={{ 
                  zIndex: 1, 
                  background: `linear-gradient(to right, transparent, ${activeColorHex})` 
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full relative h-4 opacity-0 z-10 cursor-pointer"
              />
              {/* Fake thumb */}
              <div 
                className="absolute w-4 h-4 rounded-full bg-zinc-50 border border-zinc-950 shadow-md pointer-events-none"
                style={{ 
                  zIndex: 2, 
                  left: `calc(8px + ${(opacity / 100)} * (100% - 16px))`,
                  transform: 'translateX(-50%)'
                }}
              />
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOpacity(op)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono border rounded ${
                    opacity === op
                      ? 'border-accent-emerald bg-accent-emerald/10 text-accent-emerald'
                      : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
                  } cursor-pointer transition-colors`}
                >
                  {op}%
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Section: Sandbox Preview Card */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center justify-between">
              <span>Interactive UI Preview</span>
              <span className="text-[10px] text-zinc-500 font-normal">Click components to colorize</span>
            </h3>

            {/* Sandbox Card Container */}
            <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4 flex flex-col gap-3 shadow-inner relative overflow-hidden">
              <div className="absolute top-1 right-2 text-[8px] font-mono text-zinc-600 uppercase tracking-widest pointer-events-none">
                Sandbox Mode
              </div>

              {/* Sample Card */}
              <div 
                className={`rounded-lg p-3 border transition-colors flex flex-col gap-2`}
                style={{ 
                  backgroundColor: sandboxBg.startsWith('#') ? sandboxBg : undefined,
                  color: sandboxText.startsWith('#') ? sandboxText : undefined,
                  borderColor: sandboxBorder.startsWith('#') ? sandboxBorder : undefined
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sandboxAccent }}
                    />
                    <span className="text-xs font-semibold font-mono tracking-tight">Component.tsx</span>
                  </div>
                  <span 
                    className="text-[9px] font-mono px-1 rounded-full uppercase tracking-wider font-semibold border"
                    style={{ 
                      borderColor: sandboxAccent, 
                      color: sandboxAccent, 
                      backgroundColor: `${sandboxAccent}1a` 
                    }}
                  >
                    Active
                  </span>
                </div>

                {/* Body Paragraph */}
                <p className="text-[10px] leading-relaxed opacity-85 font-sans">
                  Apply Tailwind classes to container frames, texts, borders, and accent buttons. Try creating high-contrast states.
                </p>

                {/* Action buttons */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-zinc-850">
                  <span className="text-[9px] opacity-60">Zero server calls</span>
                  <button 
                    type="button"
                    className="px-2.5 py-1 text-[9px] rounded font-mono font-semibold transition-transform active:scale-95 text-zinc-950"
                    style={{ backgroundColor: sandboxAccent }}
                  >
                    Deploy
                  </button>
                </div>
              </div>

              {/* Painter Controls */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSandboxBg(activeComputedHex)}
                  className="px-2 py-1.5 text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:border-zinc-700 text-left truncate flex items-center justify-between cursor-pointer"
                  title="Apply selected color to sandbox card background"
                >
                  <span>Set Card BG</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxText(activeComputedHex)}
                  className="px-2 py-1.5 text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:border-zinc-700 text-left truncate flex items-center justify-between cursor-pointer"
                  title="Apply selected color to sandbox card text"
                >
                  <span>Set Card Text</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxBorder(activeComputedHex)}
                  className="px-2 py-1.5 text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:border-zinc-700 text-left truncate flex items-center justify-between cursor-pointer"
                  title="Apply selected color to sandbox card border"
                >
                  <span>Set Card Border</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxAccent(activeComputedHex)}
                  className="px-2 py-1.5 text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:border-zinc-700 text-left truncate flex items-center justify-between cursor-pointer"
                  title="Apply selected color to sandbox accent details"
                >
                  <span>Set Accents</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                </button>
              </div>

              {/* Reset Sandbox */}
              <button
                type="button"
                onClick={() => {
                  setSandboxBg('bg-zinc-900/50');
                  setSandboxText('text-zinc-100');
                  setSandboxBorder('border-zinc-800');
                  setSandboxAccent('#34d399');
                }}
                className="w-full text-center py-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-350 cursor-pointer"
              >
                Reset Sandbox Styles
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: shade rows & computed details (7 cols on lg) */}
        <div ref={rightPanelRef} className="lg:col-span-7 flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5 justify-between">
          
          <div className="flex flex-col gap-4">
            {/* Header controls: Copy Format (prefix) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-hairline/60">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 capitalize font-mono flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-zinc-950/40" style={{ backgroundColor: activeColorHex }}></span>
                  {activeFamily} Palette scale
                </h2>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Tailwind scale from 50 to 950 with active opacity modifier
                </p>
              </div>

              {/* Utility Prefix Toggler */}
              <div className="flex items-center gap-1 bg-canvas border border-border-hairline rounded p-0.5">
                {(['bg', 'text', 'border', 'decoration'] as const).map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setPrefix(pref)}
                    className={`px-2 py-1 text-[10px] font-mono rounded font-semibold transition-all ${
                      prefix === pref 
                        ? 'bg-zinc-800 text-zinc-100' 
                        : 'text-zinc-400 hover:text-zinc-100'
                    } cursor-pointer`}
                  >
                    {pref}-
                  </button>
                ))}
              </div>
            </div>

            {/* List of Shade Rows */}
            <div className="flex flex-col gap-1.5 lg:max-h-[520px] lg:overflow-y-auto pr-1 no-scrollbar">
              {TAILWIND_COLORS[activeFamily].map((hex, idx) => {
                const shade = SHADES[idx];
                const isSelected = activeShadeIndex === idx;
                const rgb = hexToRgb(hex);
                const computedHex = rgbToHex(...rgb, opacity / 100);
                const computedRgba = opacity === 100 
                  ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
                  : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity / 100})`;
                
                const classNameStr = opacity === 100 
                  ? `${prefix}-${activeFamily}-${shade}`
                  : `${prefix}-${activeFamily}-${shade}/${opacity}`;

                // WCAG calculations for each shade
                const lum = getLuminance(...rgb);
                const ratioW = getContrastRatio(lum, 1.0);
                const ratioB = getContrastRatio(lum, 0.0);

                return (
                  <div
                    key={shade}
                    onClick={() => setActiveShadeIndex(idx)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-accent-emerald bg-accent-emerald/5 shadow-sm' 
                        : 'border-zinc-900/60 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/30'
                    }`}
                  >
                    {/* Left: Swatch & Name */}
                    <div className="flex items-center gap-3 min-w-[150px]">
                      {/* Checkerboard container for opacity overlay */}
                      <div className="relative w-8 h-8 rounded border border-zinc-850 overflow-hidden flex-shrink-0 bg-zinc-950">
                        <div className="absolute inset-0 opacity-40 checkerboard-pattern" />
                        <div 
                          className="absolute inset-0 transition-colors"
                          style={{ backgroundColor: computedHex }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-zinc-150">
                          {activeFamily}-{shade}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 text-left">
                          {computedHex}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Class Name Display */}
                    <div className="flex-grow flex items-center justify-start sm:justify-center sm:px-4 my-2 sm:my-0">
                      <span className="text-xs font-mono font-medium text-accent-emerald bg-accent-emerald/5 border border-accent-emerald/15 rounded px-2 py-0.5 break-all">
                        {classNameStr}
                      </span>
                    </div>

                    {/* Right: Quick actions and Contrast */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5">
                      {/* Contrast badges */}
                      <div className="flex items-center gap-1.5" title={`Contrast Ratio: White text ${ratioW}:1, Black text ${ratioB}:1`}>
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 ${ratioW >= 4.5 ? 'text-zinc-200 bg-zinc-850' : 'text-zinc-550'}`}>
                          <span>W</span>
                          <span className={ratioW >= 4.5 ? 'text-accent-emerald' : 'text-red-400'}>{ratioW >= 4.5 ? '✓' : '✗'}</span>
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 ${ratioB >= 4.5 ? 'text-zinc-200 bg-zinc-850' : 'text-zinc-550'}`}>
                          <span>B</span>
                          <span className={ratioB >= 4.5 ? 'text-accent-emerald' : 'text-red-400'}>{ratioB >= 4.5 ? '✓' : '✗'}</span>
                        </span>
                      </div>

                      {/* Copy Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCopy(classNameStr, `Copied class: ${classNameStr}`);
                          }}
                          title="Copy Tailwind class"
                          className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCopy(computedHex, `Copied HEX: ${computedHex}`);
                          }}
                          title="Copy HEX value"
                          className="px-1.5 py-1 text-[9px] font-mono rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all cursor-pointer"
                        >
                          HEX
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCopy(computedRgba, `Copied RGBA: ${computedRgba}`);
                          }}
                          title="Copy RGBA value"
                          className="px-1.5 py-1 text-[9px] font-mono rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all cursor-pointer"
                        >
                          RGBA
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Highlight Summary card (WCAG Analyzer and details) */}
          <div className="mt-2 p-4 bg-zinc-900/40 border border-border-hairline rounded-lg flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                  Active selection:
                </span>
                <span className="text-xs font-mono font-bold text-zinc-150">
                  {activeFamily}-{SHADES[activeShadeIndex]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-zinc-550 font-mono">Copy Shortcuts:</span>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-750">
                  <kbd>C</kbd> Class
                </span>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-750">
                  <kbd>X</kbd> Hex
                </span>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-750">
                  <kbd>R</kbd> RGBA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
              {/* HEX details */}
              <div className="bg-canvas border border-zinc-850 p-2.5 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-0.5">Hex color code</span>
                  <span className="text-xs font-mono font-semibold text-zinc-200 select-all">{activeComputedHex}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerCopy(activeComputedHex, `Copied HEX: ${activeComputedHex}`)}
                  className="mt-1.5 text-left text-[9px] font-mono text-accent-emerald hover:underline cursor-pointer"
                >
                  Copy Hex
                </button>
              </div>

              {/* RGBA details */}
              <div className="bg-canvas border border-zinc-850 p-2.5 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-0.5">Rgba format</span>
                  <span className="text-xs font-mono font-semibold text-zinc-200 select-all">{activeComputedRgba}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerCopy(activeComputedRgba, `Copied RGBA: ${activeComputedRgba}`)}
                  className="mt-1.5 text-left text-[9px] font-mono text-accent-emerald hover:underline cursor-pointer"
                >
                  Copy RGBA
                </button>
              </div>

              {/* WCAG Contrast check */}
              <div className="bg-canvas border border-zinc-850 p-2.5 rounded-lg flex flex-col justify-between gap-1.5">
                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Wcag 2.1 accessibility</span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-400">On White:</span>
                    <span className={`px-1 py-0.5 rounded font-semibold ${whiteRating.bg}`}>
                      {contrastWhite}:1 ({whiteRating.label})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-400">On Black:</span>
                    <span className={`px-1 py-0.5 rounded font-semibold ${blackRating.bg}`}>
                      {contrastBlack}:1 ({blackRating.label})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Macro Copy Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-850">
              <span className="text-[10px] font-mono text-zinc-400">
                Active class name syntax preview:
              </span>
              <button
                type="button"
                onClick={() => triggerCopy(activeClassName, `Copied class: ${activeClassName}`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-accent-emerald/25 bg-accent-emerald/5 hover:bg-accent-emerald/10 text-xs font-mono font-semibold text-accent-emerald transition-colors text-left cursor-pointer"
              >
                <span>{activeClassName}</span>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Copy Alert Popup Notification */}
      {copiedText && (
        <div className="fixed bottom-6 right-6 bg-zinc-950 border border-accent-emerald/40 text-zinc-150 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in z-50">
          <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-xs font-mono font-medium">{copyTip}</span>
          <span className="text-[9px] font-mono text-zinc-550 border border-zinc-850 bg-zinc-900/80 px-1 py-0.5 rounded">
            Copied!
          </span>
        </div>
      )}

      {/* Add Custom Style for Checkerboard Pattern & Alert Animations */}
      <style>{`
        .checkerboard-pattern {
          background-image: 
            linear-gradient(45deg, #1f1f23 25%, transparent 25%), 
            linear-gradient(-45deg, #1f1f23 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #1f1f23 75%), 
            linear-gradient(-45deg, transparent 75%, #1f1f23 75%);
          background-size: 10px 10px;
          background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
