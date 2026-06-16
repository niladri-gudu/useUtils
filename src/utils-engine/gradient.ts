import { hexToRgb, rgbToHex, rgbToHsl } from './color';

export type GradientType = 'linear' | 'radial' | 'conic';

export interface GradientStop {
  id: string;
  color: string; // Hex format e.g., #34d399
  position: number; // 0 to 100
  opacity: number; // 0 to 1
}

export interface GradientPreset {
  id: string;
  name: string;
  type: GradientType;
  direction: string | number;
  stops: { color: string; position: number; opacity: number }[];
}

export const PRESETS: GradientPreset[] = [
  {
    id: 'emerald-glow',
    name: 'Emerald Glow',
    type: 'linear',
    direction: 135,
    stops: [
      { color: '#10b981', position: 0, opacity: 1 },
      { color: '#3b82f6', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'sunset-boulevard',
    name: 'Sunset Boulevard',
    type: 'linear',
    direction: 90,
    stops: [
      { color: '#f97316', position: 0, opacity: 1 },
      { color: '#ec4899', position: 50, opacity: 1 },
      { color: '#8b5cf6', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    type: 'linear',
    direction: 45,
    stops: [
      { color: '#d946ef', position: 0, opacity: 1 },
      { color: '#06b6d4', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    type: 'linear',
    direction: 180,
    stops: [
      { color: '#38bdf8', position: 0, opacity: 1 },
      { color: '#1d4ed8', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    type: 'linear',
    direction: 135,
    stops: [
      { color: '#051937', position: 0, opacity: 1 },
      { color: '#004d7a', position: 40, opacity: 1 },
      { color: '#008793', position: 70, opacity: 1 },
      { color: '#00bf72', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight',
    type: 'radial',
    direction: 'circle at center',
    stops: [
      { color: '#2e1065', position: 0, opacity: 1 },
      { color: '#0f051d', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    type: 'linear',
    direction: 60,
    stops: [
      { color: '#a7f3d0', position: 0, opacity: 1 },
      { color: '#34d399', position: 30, opacity: 0.8 },
      { color: '#6366f1', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'glass-reflection',
    name: 'Glass Reflection',
    type: 'linear',
    direction: 135,
    stops: [
      { color: '#ffffff', position: 0, opacity: 0.15 },
      { color: '#ffffff', position: 40, opacity: 0.03 },
      { color: '#000000', position: 100, opacity: 0.1 }
    ]
  },
  {
    id: 'sweet-cantaloupe',
    name: 'Sweet Cantaloupe',
    type: 'linear',
    direction: 135,
    stops: [
      { color: '#ff9a9e', position: 0, opacity: 1 },
      { color: '#fecfef', position: 99, opacity: 1 },
      { color: '#fecfef', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    type: 'linear',
    direction: 90,
    stops: [
      { color: '#ff007f', position: 0, opacity: 1 },
      { color: '#7f00ff', position: 50, opacity: 1 },
      { color: '#00ffff', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'conic-spiral',
    name: 'Radar Sweep',
    type: 'conic',
    direction: 'from 0deg at center',
    stops: [
      { color: '#34d399', position: 0, opacity: 1 },
      { color: '#1e293b', position: 50, opacity: 1 },
      { color: '#34d399', position: 100, opacity: 1 }
    ]
  },
  {
    id: 'metallic-chrome',
    name: 'Metallic Chrome',
    type: 'linear',
    direction: 90,
    stops: [
      { color: '#f3f4f6', position: 0, opacity: 1 },
      { color: '#9ca3af', position: 25, opacity: 1 },
      { color: '#f3f4f6', position: 50, opacity: 1 },
      { color: '#4b5563', position: 75, opacity: 1 },
      { color: '#f3f4f6', position: 100, opacity: 1 }
    ]
  }
];

// Helper to format a single stop for CSS rules
const formatStopCss = (stop: GradientStop): string => {
  const [r, g, b] = hexToRgb(stop.color);
  return `rgba(${r}, ${g}, ${b}, ${stop.opacity}) ${stop.position}%`;
};

// Generates CSS value for background
export const getGradientCssValue = (
  type: GradientType,
  direction: string | number,
  stops: GradientStop[]
): string => {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops.map(formatStopCss).join(', ');

  switch (type) {
    case 'linear': {
      const angle = typeof direction === 'number' ? `${direction}deg` : '90deg';
      return `linear-gradient(${angle}, ${stopsStr})`;
    }
    case 'radial': {
      const radialDir = typeof direction === 'string' ? direction : 'circle at center';
      return `radial-gradient(${radialDir}, ${stopsStr})`;
    }
    case 'conic': {
      const conicDir = typeof direction === 'string' ? direction : 'from 0deg at center';
      return `conic-gradient(${conicDir}, ${stopsStr})`;
    }
    default:
      return '';
  }
};

// Generates Tailwind class (arbitrary background)
export const getTailwindValue = (
  type: GradientType,
  direction: string | number,
  stops: GradientStop[]
): string => {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  
  // Format stops as color_pos% without spaces
  const stopsStr = sortedStops
    .map(s => {
      const [r, g, b] = hexToRgb(s.color);
      const colorPart = s.opacity < 1 ? `rgba(${r},${g},${b},${s.opacity})` : s.color;
      return `${colorPart}_${s.position}%`;
    })
    .join(',');

  switch (type) {
    case 'linear': {
      const angle = typeof direction === 'number' ? `${direction}deg` : '90deg';
      return `bg-[linear-gradient(${angle},${stopsStr})]`;
    }
    case 'radial': {
      const radialDir = typeof direction === 'string' ? direction : 'circle_at_center';
      const cleanDir = radialDir.replace(/\s+/g, '_');
      return `bg-[radial-gradient(${cleanDir},${stopsStr})]`;
    }
    case 'conic': {
      const conicDir = typeof direction === 'string' ? direction : 'from_0deg_at_center';
      const cleanDir = conicDir.replace(/\s+/g, '_');
      return `bg-[conic-gradient(${cleanDir},${stopsStr})]`;
    }
    default:
      return '';
  }
};

// Generates SVG XML code
export const getSvgValue = (
  type: GradientType,
  direction: string | number,
  stops: GradientStop[]
): string => {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const stopsXml = sortedStops
    .map(s => `    <stop offset="${s.position}%" stop-color="${s.color}" stop-opacity="${s.opacity}" />`)
    .join('\n');

  if (type === 'linear') {
    // Convert angle to SVG line coordinates
    const angle = typeof direction === 'number' ? direction : 90;
    const angleRad = (angle * Math.PI) / 180;
    const x1 = Math.round(50 - Math.cos(angleRad) * 50);
    const y1 = Math.round(50 + Math.sin(angleRad) * 50);
    const x2 = Math.round(50 + Math.cos(angleRad) * 50);
    const y2 = Math.round(50 - Math.sin(angleRad) * 50);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stopsXml}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;
  } else {
    // Radial approximation
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <radialGradient id="gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
${stopsXml}
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;
  }
};

// Generates HTML Canvas JS snippet
export const getCanvasCode = (
  type: GradientType,
  direction: string | number,
  stops: GradientStop[]
): string => {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  let creationLine = '';

  if (type === 'linear') {
    const angle = typeof direction === 'number' ? direction : 90;
    const angleRad = (angle * Math.PI) / 180;
    const x1 = Math.round(150 - Math.cos(angleRad) * 150);
    const y1 = Math.round(150 + Math.sin(angleRad) * 150);
    const x2 = Math.round(150 + Math.cos(angleRad) * 150);
    const y2 = Math.round(150 - Math.sin(angleRad) * 150);
    creationLine = `const gradient = ctx.createLinearGradient(${x1}, ${y1}, ${x2}, ${y2});`;
  } else {
    creationLine = `const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);`;
  }

  const stopLines = sortedStops
    .map(s => {
      const [r, g, b] = hexToRgb(s.color);
      return `gradient.addColorStop(${s.position / 100}, 'rgba(${r}, ${g}, ${b}, ${s.opacity})');`;
    })
    .join('\n');

  return `// Canvas size assumed: 300x300
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

${creationLine}
${stopLines}

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 300, 300);`;
};

// Generates React Inline Styles Object
export const getReactCssObject = (
  type: GradientType,
  direction: string | number,
  stops: GradientStop[]
): string => {
  const cssVal = getGradientCssValue(type, direction, stops);
  return `const divStyle = {
  background: '${cssVal}'
};`;
};

// Extracts sequence of colors from a canvas to create a smooth gradient
export const extractGradientFromCanvas = (
  canvas: HTMLCanvasElement,
  count: number = 3
): string[] => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  
  const width = canvas.width;
  const height = canvas.height;
  
  // Sample pixels to find dominant colors
  const imgData = ctx.getImageData(0, 0, width, height).data;
  const colors: { r: number; g: number; b: number; count: number }[] = [];
  
  // Sample roughly 200 pixels evenly across the canvas
  const step = Math.max(1, Math.floor(imgData.length / 4 / 200)) * 4;
  
  for (let i = 0; i < imgData.length; i += step) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const a = imgData[i + 3];
    
    // Ignore highly transparent pixels
    if (a < 128) continue;
    
    // Cluster colors that are visually close (Euclidean distance threshold)
    let clustered = false;
    for (const c of colors) {
      const dist = Math.sqrt((c.r - r) ** 2 + (c.g - g) ** 2 + (c.b - b) ** 2);
      if (dist < 45) {
        c.count++;
        // Keep shifting the cluster center slightly towards new sample
        c.r = Math.round((c.r * 3 + r) / 4);
        c.g = Math.round((c.g * 3 + g) / 4);
        c.b = Math.round((c.b * 3 + b) / 4);
        clustered = true;
        break;
      }
    }
    
    if (!clustered) {
      colors.push({ r, g, b, count: 1 });
    }
  }

  // Sort clusters by count descending
  colors.sort((a, b) => b.count - a.count);
  
  // Slice to the requested number of colors
  const dominant = colors.slice(0, count);

  // Map to HEX and HSL Hue value, then sort by Hue so the gradient is smooth
  const sortedDominant = dominant.map(c => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const [h] = rgbToHsl(c.r, c.g, c.b);
    return { hex, h };
  });

  sortedDominant.sort((a, b) => a.h - b.h);
  
  return sortedDominant.map(c => c.hex);
};
