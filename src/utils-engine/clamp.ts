/**
 * CSS Clamp Generator Core Mathematics Engine
 * Designed to run completely on the client-side. Zero dependencies.
 */

export interface ClampOptions {
  rootFontSize?: number;
  usePixels?: boolean;
  precision?: number;
}

export interface ClampResult {
  clampString: string;
  minSize: string;
  maxSize: string;
  slope: number;
  slopeVw: number;
  intersection: number;
  intersectionSize: string;
  formula: string;
}

export interface ScaleStep {
  id: string;
  name: string;
  minPx: number;
  maxPx: number;
}

// Preset ratios for Modular Scales
export const MODULAR_SCALES = {
  minorSecond: { name: 'Minor Second (1.067)', value: 1.067 },
  majorSecond: { name: 'Major Second (1.125)', value: 1.125 },
  minorThird: { name: 'Minor Third (1.200)', value: 1.2 },
  majorThird: { name: 'Major Third (1.250)', value: 1.25 },
  perfectFourth: { name: 'Perfect Fourth (1.333)', value: 1.333 },
  augmentedFourth: { name: 'Augmented Fourth (1.414)', value: 1.414 },
  perfectFifth: { name: 'Perfect Fifth (1.500)', value: 1.5 },
  minorSixth: { name: 'Minor Sixth (1.600)', value: 1.6 },
  goldenRatio: { name: 'Golden Ratio (1.618)', value: 1.618 },
  majorSixth: { name: 'Major Sixth (1.667)', value: 1.667 },
  minorSeventh: { name: 'Minor Seventh (1.778)', value: 1.778 },
  majorSeventh: { name: 'Major Seventh (1.875)', value: 1.875 },
  octave: { name: 'Octave (2.000)', value: 2.0 }
};

export type ModularScaleKey = keyof typeof MODULAR_SCALES;

/**
 * Format numerical values to a clean precision string, removing trailing zeroes.
 */
export const formatNumber = (value: number, precision: number = 4): string => {
  const rounded = Number(value.toFixed(precision));
  return String(rounded);
};

/**
 * Computes the clamp mathematical components and returns details + formatted CSS expression.
 */
export const calculateClamp = (
  minWidth: number,
  maxWidth: number,
  minSize: number,
  maxSize: number,
  options: ClampOptions = {}
): ClampResult => {
  const rootFontSize = options.rootFontSize ?? 16;
  const usePixels = options.usePixels ?? false;
  const precision = options.precision ?? 4;

  // Handle boundary issues
  if (minWidth === maxWidth) {
    maxWidth = minWidth + 1;
  }
  if (minSize === maxSize) {
    maxSize = minSize + 0.1;
  }

  // Slope of the scaling curve
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const slopeVw = slope * 100;
  
  // Y-intersection with the y-axis (viewport width = 0)
  const intersection = minSize - minWidth * slope;

  let clampString = '';
  let minSizeStr = '';
  let maxSizeStr = '';
  let intersectionSizeStr = '';

  if (usePixels) {
    minSizeStr = `${formatNumber(minSize, precision)}px`;
    maxSizeStr = `${formatNumber(maxSize, precision)}px`;
    const formattedSlope = formatNumber(slopeVw, precision);
    const formattedIntersection = formatNumber(intersection, precision);
    
    if (intersection === 0) {
      clampString = `clamp(${minSizeStr}, ${formattedSlope}vw, ${maxSizeStr})`;
    } else if (intersection < 0) {
      clampString = `clamp(${minSizeStr}, ${formattedSlope}vw - ${Math.abs(Number(formattedIntersection))}px, ${maxSizeStr})`;
    } else {
      clampString = `clamp(${minSizeStr}, ${formattedIntersection}px + ${formattedSlope}vw, ${maxSizeStr})`;
    }
    intersectionSizeStr = `${formattedIntersection}px`;
  } else {
    // Convert to rem units
    const minSizeRem = minSize / rootFontSize;
    const maxSizeRem = maxSize / rootFontSize;
    const intersectionRem = intersection / rootFontSize;

    minSizeStr = `${formatNumber(minSizeRem, precision)}rem`;
    maxSizeStr = `${formatNumber(maxSizeRem, precision)}rem`;
    const formattedSlope = formatNumber(slopeVw, precision);
    const formattedIntersection = formatNumber(intersectionRem, precision);

    if (intersectionRem === 0) {
      clampString = `clamp(${minSizeStr}, ${formattedSlope}vw, ${maxSizeStr})`;
    } else if (intersectionRem < 0) {
      clampString = `clamp(${minSizeStr}, ${formattedSlope}vw - ${Math.abs(Number(formattedIntersection))}rem, ${maxSizeStr})`;
    } else {
      clampString = `clamp(${minSizeStr}, ${formattedIntersection}rem + ${formattedSlope}vw, ${maxSizeStr})`;
    }
    intersectionSizeStr = `${formattedIntersection}rem`;
  }

  const formula = `minSize + ((viewportWidth - minWidth) / (maxWidth - minWidth)) * (maxSize - minSize)`;

  return {
    clampString,
    minSize: minSizeStr,
    maxSize: maxSizeStr,
    slope,
    slopeVw,
    intersection,
    intersectionSize: intersectionSizeStr,
    formula
  };
};

/**
 * Calculates a specific modular scale value given step, base, and ratio.
 * Steps are integers: ... -2, -1, 0, 1, 2 ...
 */
export const calculateModularStep = (
  baseSize: number,
  stepValue: number,
  ratio: number
): number => {
  return baseSize * Math.pow(ratio, stepValue);
};

/**
 * Generates an array of scale steps (from xs to 7xl) automatically.
 */
export const generateScaleFromRatios = (
  minBase: number,
  maxBase: number,
  minRatio: number,
  maxRatio: number
): ScaleStep[] => {
  const stepsDef = [
    { name: 'xs', step: -2 },
    { name: 'sm', step: -1 },
    { name: 'base', step: 0 },
    { name: 'lg', step: 1 },
    { name: 'xl', step: 2 },
    { name: '2xl', step: 3 },
    { name: '3xl', step: 4 },
    { name: '4xl', step: 5 },
    { name: '5xl', step: 6 },
    { name: '6xl', step: 7 },
    { name: '7xl', step: 8 }
  ];

  return stepsDef.map(({ name, step }) => {
    const minPx = Math.round(calculateModularStep(minBase, step, minRatio));
    const maxPx = Math.round(calculateModularStep(maxBase, step, maxRatio));
    return {
      id: name,
      name,
      minPx,
      maxPx
    };
  });
};

/**
 * Formats a key-value scale map into standard CSS custom properties.
 */
export const exportToCssVariables = (scale: Record<string, string>, prefix: string = 'font-size'): string => {
  let output = ':root {\n';
  Object.entries(scale).forEach(([key, value]) => {
    output += `  --${prefix}-${key}: ${value};\n`;
  });
  output += '}';
  return output;
};

/**
 * Formats a key-value scale map into Tailwind v4 @theme CSS rule format.
 */
export const exportToTailwindV4 = (scale: Record<string, string>, type: 'font' | 'spacing' = 'font'): string => {
  const prefix = type === 'font' ? '--font-size-' : '--spacing-';
  let output = '@theme {\n';
  Object.entries(scale).forEach(([key, value]) => {
    output += `  ${prefix}${key}: ${value};\n`;
  });
  output += '}';
  return output;
};

/**
 * Formats a key-value scale map into Tailwind v3 tailwind.config.js style object.
 */
export const exportToTailwindV3 = (scale: Record<string, string>, type: 'font' | 'spacing' = 'font'): string => {
  const keyName = type === 'font' ? 'fontSize' : 'spacing';
  let output = `module.exports = {\n  theme: {\n    extend: {\n      ${keyName}: {\n`;
  Object.entries(scale).forEach(([key, value]) => {
    output += `        '${key}': '${value}',\n`;
  });
  output += `      }\n    }\n  }\n}`;
  return output;
};

/**
 * Formats a key-value scale map into SCSS variables.
 */
export const exportToScss = (scale: Record<string, string>, prefix: string = 'font-size'): string => {
  let output = '';
  Object.entries(scale).forEach(([key, value]) => {
    output += `$${prefix}-${key}: ${value};\n`;
  });
  return output;
};
