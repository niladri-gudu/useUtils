import { hexToRgb } from './color';

export interface GlassConfig {
  blur: number;
  bgHex: string;
  bgOpacity: number;
  borderHex: string;
  borderOpacity: number;
  borderWidth: number;
  borderRadius: number;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
}

export interface GlassPreset {
  name: string;
  description: string;
  config: GlassConfig;
}

export const GLASS_PRESETS: Record<string, GlassPreset> = {
  frosted: {
    name: 'Frosted Ice',
    description: 'Standard elegant white-frosted glass design.',
    config: {
      blur: 16,
      bgHex: '#FFFFFF',
      bgOpacity: 0.1,
      borderHex: '#FFFFFF',
      borderOpacity: 0.2,
      borderWidth: 1,
      borderRadius: 16,
      shadowColor: '#000000',
      shadowOpacity: 0.15,
      shadowBlur: 24,
      shadowX: 0,
      shadowY: 8,
    }
  },
  obsidian: {
    name: 'Deep Obsidian',
    description: 'Sleek, premium dark mode glass panel.',
    config: {
      blur: 20,
      bgHex: '#000000',
      bgOpacity: 0.4,
      borderHex: '#FFFFFF',
      borderOpacity: 0.08,
      borderWidth: 1,
      borderRadius: 20,
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowBlur: 32,
      shadowX: 0,
      shadowY: 12,
    }
  },
  neon: {
    name: 'Emerald Neon',
    description: 'Vibrant green glowing outline and tinted surface.',
    config: {
      blur: 12,
      bgHex: '#10B981',
      bgOpacity: 0.08,
      borderHex: '#34D399',
      borderOpacity: 0.35,
      borderWidth: 1.5,
      borderRadius: 24,
      shadowColor: '#10B981',
      shadowOpacity: 0.25,
      shadowBlur: 20,
      shadowX: 0,
      shadowY: 4,
    }
  },
  sunset: {
    name: 'Purple Sunset',
    description: 'Aesthetic indigo-purple tinted glass card.',
    config: {
      blur: 14,
      bgHex: '#8B5CF6',
      bgOpacity: 0.12,
      borderHex: '#A78BFA',
      borderOpacity: 0.25,
      borderWidth: 1,
      borderRadius: 16,
      shadowColor: '#8B5CF6',
      shadowOpacity: 0.2,
      shadowBlur: 25,
      shadowX: 0,
      shadowY: 8,
    }
  },
  ghost: {
    name: 'Pure Ghost',
    description: 'Minimalistic frame with sharp border and low tint.',
    config: {
      blur: 6,
      bgHex: '#FFFFFF',
      bgOpacity: 0.03,
      borderHex: '#FFFFFF',
      borderOpacity: 0.35,
      borderWidth: 1,
      borderRadius: 12,
      shadowColor: '#000000',
      shadowOpacity: 0.05,
      shadowBlur: 10,
      shadowX: 0,
      shadowY: 2,
    }
  }
};

export const DEFAULT_GLASS_CONFIG: GlassConfig = GLASS_PRESETS.frosted.config;

export const getGlassCssProperties = (config: GlassConfig) => {
  const [bgR, bgG, bgB] = hexToRgb(config.bgHex);
  const [borderR, borderG, borderB] = hexToRgb(config.borderHex);
  const [shadowR, shadowG, shadowB] = hexToRgb(config.shadowColor);

  return {
    background: `rgba(${bgR}, ${bgG}, ${bgB}, ${config.bgOpacity})`,
    backdropFilter: `blur(${config.blur}px)`,
    webkitBackdropFilter: `blur(${config.blur}px)`,
    border: `${config.borderWidth}px solid rgba(${borderR}, ${borderG}, ${borderB}, ${config.borderOpacity})`,
    borderRadius: `${config.borderRadius}px`,
    boxShadow: config.shadowOpacity > 0 
      ? `${config.shadowX}px ${config.shadowY}px ${config.shadowBlur}px rgba(${shadowR}, ${shadowG}, ${shadowB}, ${config.shadowOpacity})`
      : 'none'
  };
};

export const getGlassCssString = (config: GlassConfig): string => {
  const props = getGlassCssProperties(config);
  return `background: ${props.background};
backdrop-filter: ${props.backdropFilter};
-webkit-backdrop-filter: ${props.webkitBackdropFilter};
border: ${props.border};
border-radius: ${props.borderRadius};
box-shadow: ${props.boxShadow};`;
};

export const getGlassTailwindClasses = (config: GlassConfig): string => {
  const [bgR, bgG, bgB] = hexToRgb(config.bgHex);
  const [borderR, borderG, borderB] = hexToRgb(config.borderHex);
  const [shadowR, shadowG, shadowB] = hexToRgb(config.shadowColor);

  // Background blur mapping for standard Tailwind classes if possible, else arbitrary
  let blurClass = `backdrop-blur-[${config.blur}px]`;
  if (config.blur === 0) blurClass = '';
  else if (config.blur === 4) blurClass = 'backdrop-blur-sm';
  else if (config.blur === 8) blurClass = 'backdrop-blur-md';
  else if (config.blur === 12) blurClass = 'backdrop-blur-lg';
  else if (config.blur === 16) blurClass = 'backdrop-blur-xl';
  else if (config.blur === 24) blurClass = 'backdrop-blur-2xl';
  else if (config.blur === 40) blurClass = 'backdrop-blur-3xl';

  // Rounded corners mapping
  let roundClass = `rounded-[${config.borderRadius}px]`;
  if (config.borderRadius === 0) roundClass = 'rounded-none';
  else if (config.borderRadius === 4) roundClass = 'rounded-sm';
  else if (config.borderRadius === 6) roundClass = 'rounded';
  else if (config.borderRadius === 8) roundClass = 'rounded-md';
  else if (config.borderRadius === 12) roundClass = 'rounded-lg';
  else if (config.borderRadius === 16) roundClass = 'rounded-xl';
  else if (config.borderRadius === 24) roundClass = 'rounded-2xl';
  else if (config.borderRadius === 32) roundClass = 'rounded-3xl';
  else if (config.borderRadius >= 999) roundClass = 'rounded-full';

  // Build arbitrary bg and border utility classes
  const bgClass = `bg-[rgba(${bgR},${bgG},${bgB},${config.bgOpacity})]`;
  const borderClass = `border-[${config.borderWidth}px] border-[rgba(${borderR},${borderG},${borderB},${config.borderOpacity})]`;
  
  // Shadow
  const shadowClass = config.shadowOpacity > 0
    ? `shadow-[${config.shadowX}px_${config.shadowY}px_${config.shadowBlur}px_rgba(${shadowR},${shadowG},${shadowB},${config.shadowOpacity})]`
    : 'shadow-none';

  return `${bgClass} ${blurClass} ${borderClass} ${roundClass} ${shadowClass}`.trim().replace(/\s+/g, ' ');
};

export const getGlassReactStyles = (config: GlassConfig): string => {
  const props = getGlassCssProperties(config);
  return `const glassStyle = {
  background: "${props.background}",
  backdropFilter: "${props.backdropFilter}",
  WebkitBackdropFilter: "${props.webkitBackdropFilter}",
  border: "${props.border}",
  borderRadius: "${props.borderRadius}",
  boxShadow: "${props.boxShadow}"
};`;
};
