export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  a: number;
  format: 'hex' | 'rgb' | 'hsl';
}

export const TAILWIND_COLORS: Record<string, string[]> = {
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

export const COLOR_CATEGORIES = [
  { name: 'Neutral Grays', families: ['slate', 'gray', 'zinc', 'neutral', 'stone'] },
  { name: 'Warm Red/Orange', families: ['red', 'orange', 'amber', 'yellow'] },
  { name: 'Fresh Green/Emerald', families: ['lime', 'green', 'emerald'] },
  { name: 'Cool Teal/Cyan/Sky', families: ['teal', 'cyan', 'sky', 'blue'] },
  { name: 'Deep Indigo/Purple', families: ['indigo', 'violet', 'purple'] },
  { name: 'Vibrant Pink/Rose', families: ['fuchsia', 'pink', 'rose'] },
];

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export const OPACITIES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
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

export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
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

export const rgbToHex = (r: number, g: number, b: number, a: number = 1): string => {
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

export const parseColorString = (input: string): ParsedColor | null => {
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

  // 4. Raw color strings / names matching
  const namesMap: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
    yellow: '#eab308', purple: '#a855f7', orange: '#f97316', pink: '#ec4899', gray: '#6b7280'
  };
  if (namesMap[str]) {
    const cleanHex = namesMap[str];
    const r = parseInt(cleanHex.slice(1, 3), 16);
    const g = parseInt(cleanHex.slice(3, 5), 16);
    const b = parseInt(cleanHex.slice(5, 7), 16);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { r, g, b, h, s, l, a: 1, format: 'hex' };
  }

  // 5. Raw triple digit integers
  const rawRgbRegex = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;
  const rawRgbSpaceRegex = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/;
  const rawMatch = str.match(rawRgbRegex) || str.match(rawRgbSpaceRegex);
  if (rawMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rawMatch[1])));
    const g = Math.min(255, Math.max(0, parseInt(rawMatch[2])));
    const b = Math.min(255, Math.max(0, parseInt(rawMatch[3])));
    const [h, s, l] = rgbToHsl(r, g, b);
    return { r, g, b, h, s, l, a: 1, format: 'rgb' };
  }

  return null;
};

export const getLuminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

export const getContrastRatio = (lum1: number, lum2: number): number => {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

export const getWcagRating = (ratio: number) => {
  if (ratio >= 7) return { label: 'AAA Pass', bg: 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald', pass: true };
  if (ratio >= 4.5) return { label: 'AA Pass', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', pass: true };
  if (ratio >= 3) return { label: 'AA Large', bg: 'bg-amber-400/10 border-amber-400/20 text-amber-400', pass: true };
  return { label: 'Fail', bg: 'bg-red-400/10 border-red-400/20 text-red-400', pass: false };
};

export const findNearestTailwindColor = (r: number, g: number, b: number): { name: string; shade: number; hex: string; distance: number; fullName: string } => {
  let minDistance = Infinity;
  let nearestFamily = 'slate';
  let nearestShade = 500;
  let nearestHex = '#64748b';

  Object.entries(TAILWIND_COLORS).forEach(([name, hexList]) => {
    hexList.forEach((hex, idx) => {
      const clean = hex.replace('#', '');
      const tr = parseInt(clean.slice(0, 2), 16);
      const tg = parseInt(clean.slice(2, 4), 16);
      const tb = parseInt(clean.slice(4, 6), 16);
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
    distance: Math.round(minDistance * 10) / 10,
    fullName: `${nearestFamily}-${nearestShade}`
  };
};
export const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
};
