import { hexToRgb } from './color';

export interface ShadowLayer {
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

export interface ShadowPreset {
  name: string;
  description: string;
  layers: Omit<ShadowLayer, 'id'>[];
}

export const PRESETS: Record<string, ShadowPreset> = {
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

export const DEFAULT_LAYERS: ShadowLayer[] = [
  { id: '1', active: true, inset: false, offsetX: 0, offsetY: 10, blur: 25, spread: -5, color: '#000000', opacity: 0.1 },
  { id: '2', active: true, inset: false, offsetX: 0, offsetY: 8, blur: 10, spread: -4, color: '#000000', opacity: 0.06 },
];

export const getShadowCssValue = (shadowLayers: ShadowLayer[]): string => {
  const active = shadowLayers.filter(l => l.active);
  if (active.length === 0) return 'none';
  return active.map(l => {
    const [r, g, b] = hexToRgb(l.color);
    const insetStr = l.inset ? 'inset ' : '';
    return `${insetStr}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${l.opacity})`;
  }).join(',\n  ');
};

export const getShadowCssSingleLine = (shadowLayers: ShadowLayer[]): string => {
  const active = shadowLayers.filter(l => l.active);
  if (active.length === 0) return 'none';
  return active.map(l => {
    const [r, g, b] = hexToRgb(l.color);
    const insetStr = l.inset ? 'inset ' : '';
    return `${insetStr}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${l.opacity})`;
  }).join(', ');
};

export const getTailwindValue = (shadowLayers: ShadowLayer[]): string => {
  const active = shadowLayers.filter(l => l.active);
  if (active.length === 0) return 'shadow-none';
  const parts = active.map(l => {
    const [r, g, b] = hexToRgb(l.color);
    const insetStr = l.inset ? 'inset_' : '';
    return `${insetStr}${l.offsetX}px_${l.offsetY}px_${l.blur}px_${l.spread}px_rgba(${r},${g},${b},${l.opacity})`;
  }).join(',');
  return `shadow-[${parts}]`;
};
