export interface GridItem {
  id: string;
  name: string;
  colStart: number; // 1-indexed, inclusive
  colEnd: number;   // 1-indexed, exclusive
  rowStart: number; // 1-indexed, inclusive
  rowEnd: number;   // 1-indexed, exclusive
  color: string;
  content?: string;
  tabletSpan?: number; // custom span, 0 means auto/flow
  mobileSpan?: number; // custom span, 0 means auto/flow
}

export interface GridConfig {
  columns: number;
  rows: number;
  columnGap: number;
  columnGapUnit: string;
  rowGap: number;
  rowGapUnit: string;
  columnTracks: string[]; // e.g. ["1fr", "2fr", "120px"]
  rowTracks: string[];
  items: GridItem[];
  useAreas: boolean;
  responsive: boolean;
  tabletColumns: number;
  mobileColumns: number;
}

// Sanitizes item name to a valid CSS class name or grid area identifier
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generates the grid-template-areas matrix string
export function generateAreasMatrix(columns: number, rows: number, items: GridItem[]): string[][] {
  const matrix: string[][] = Array.from({ length: rows }, () => Array(columns).fill('.'));

  // Place items in matrix. We place larger items or items in order.
  for (const item of items) {
    const nameId = sanitizeName(item.name) || `item-${item.id}`;
    const rStart = Math.max(1, Math.min(rows, item.rowStart)) - 1;
    const rEnd = Math.max(1, Math.min(rows + 1, item.rowEnd)) - 1;
    const cStart = Math.max(1, Math.min(columns, item.colStart)) - 1;
    const cEnd = Math.max(1, Math.min(columns + 1, item.colEnd)) - 1;

    for (let r = rStart; r < rEnd; r++) {
      for (let c = cStart; c < cEnd; c++) {
        matrix[r][c] = nameId;
      }
    }
  }

  return matrix;
}

export function generateGridCSS(config: GridConfig): string {
  const {
    columns,
    rows,
    columnGap,
    columnGapUnit,
    rowGap,
    rowGapUnit,
    columnTracks,
    rowTracks,
    items,
    useAreas,
    responsive,
    tabletColumns,
    mobileColumns,
  } = config;

  const colGapStr = `${columnGap}${columnGapUnit}`;
  const rowGapStr = `${rowGap}${rowGapUnit}`;
  const gapStr = colGapStr === rowGapStr ? colGapStr : `${rowGapStr} ${colGapStr}`;

  // Column track definition
  let colTemplate = '';
  if (columnTracks && columnTracks.length === columns) {
    colTemplate = columnTracks.join(' ');
  } else {
    colTemplate = `repeat(${columns}, 1fr)`;
  }

  // Row track definition
  let rowTemplate = '';
  if (rowTracks && rowTracks.length === rows) {
    rowTemplate = rowTracks.join(' ');
  } else {
    rowTemplate = `repeat(${rows}, 1fr)`;
  }

  let css = `/* CSS Grid Layout */\n`;
  css += `.grid-container {\n`;
  css += `  display: grid;\n`;
  css += `  grid-template-columns: ${colTemplate};\n`;
  css += `  grid-template-rows: ${rowTemplate};\n`;
  css += `  gap: ${gapStr};\n`;

  if (useAreas && items.length > 0) {
    css += `  grid-template-areas:\n`;
    const matrix = generateAreasMatrix(columns, rows, items);
    matrix.forEach((row, i) => {
      const isLast = i === matrix.length - 1;
      css += `    "${row.join(' ')}"${isLast ? ';' : '\n'}`;
    });
  }
  css += `}\n\n`;

  // Item styles
  items.forEach((item) => {
    const itemClass = sanitizeName(item.name) || `item-${item.id}`;
    css += `.${itemClass} {\n`;
    if (useAreas) {
      css += `  grid-area: ${itemClass};\n`;
    } else {
      css += `  grid-column: ${item.colStart} / ${item.colEnd};\n`;
      css += `  grid-row: ${item.rowStart} / ${item.rowEnd};\n`;
    }
    css += `}\n\n`;
  });

  // Responsive breakpoints
  if (responsive) {
    // Tablet Breakpoint
    css += `/* Tablet Layout */\n`;
    css += `@media (max-width: 1024px) {\n`;
    css += `  .grid-container {\n`;
    css += `    grid-template-columns: repeat(${tabletColumns}, 1fr);\n`;
    if (useAreas) {
      css += `    grid-template-areas: none;\n`;
    }
    css += `  }\n\n`;

    items.forEach((item) => {
      const itemClass = sanitizeName(item.name) || `item-${item.id}`;
      const tSpan = item.tabletSpan || Math.min(tabletColumns, item.colEnd - item.colStart);
      css += `  .${itemClass} {\n`;
      if (useAreas) {
        css += `    grid-area: auto;\n`;
      }
      css += `    grid-column: span ${tSpan};\n`;
      css += `    grid-row: auto;\n`;
      css += `  }\n\n`;
    });
    css += `}\n\n`;

    // Mobile Breakpoint
    css += `/* Mobile Layout */\n`;
    css += `@media (max-width: 640px) {\n`;
    css += `  .grid-container {\n`;
    css += `    grid-template-columns: repeat(${mobileColumns}, 1fr);\n`;
    css += `  }\n\n`;

    items.forEach((item) => {
      const itemClass = sanitizeName(item.name) || `item-${item.id}`;
      const mSpan = item.mobileSpan || Math.min(mobileColumns, item.colEnd - item.colStart);
      css += `  .${itemClass} {\n`;
      css += `    grid-column: span ${mSpan};\n`;
      css += `  }\n\n`;
    });
    css += `}\n`;
  }

  return css;
}

export function generateTailwindClasses(config: GridConfig): { container: string; items: Record<string, string> } {
  const {
    columns,
    columnGap,
    columnGapUnit,
    rowGap,
    rowGapUnit,
    columnTracks,
    items,
    responsive,
    tabletColumns,
    mobileColumns,
  } = config;

  // Container classes
  let container = 'grid';

  // Base mobile / desktop responsive columns
  if (responsive) {
    // Mobile first: mobileColumns -> tabletColumns -> columns (desktop)
    container += ` grid-cols-${mobileColumns}`;
    container += ` md:grid-cols-${tabletColumns}`;
    
    // Desktop columns (supports custom tracks)
    const isCustomCols = columnTracks.some((t) => t !== '1fr');
    if (isCustomCols) {
      container += ` lg:grid-cols-[${columnTracks.join('_')}]`;
    } else {
      container += ` lg:grid-cols-${columns}`;
    }
  } else {
    const isCustomCols = columnTracks.some((t) => t !== '1fr');
    if (isCustomCols) {
      container += ` grid-cols-[${columnTracks.join('_')}]`;
    } else {
      container += ` grid-cols-${columns}`;
    }
  }

  // Gap mapping
  const getGapClass = (val: number, unit: string, prefix = 'gap') => {
    if (unit === 'px' && val === 0) return `${prefix}-0`;
    if (unit === 'px' && val === 4) return `${prefix}-1`;
    if (unit === 'px' && val === 8) return `${prefix}-2`;
    if (unit === 'px' && val === 12) return `${prefix}-3`;
    if (unit === 'px' && val === 16) return `${prefix}-4`;
    if (unit === 'px' && val === 20) return `${prefix}-5`;
    if (unit === 'px' && val === 24) return `${prefix}-6`;
    if (unit === 'px' && val === 32) return `${prefix}-8`;
    if (unit === 'rem' && val === 0.25) return `${prefix}-1`;
    if (unit === 'rem' && val === 0.5) return `${prefix}-2`;
    if (unit === 'rem' && val === 0.75) return `${prefix}-3`;
    if (unit === 'rem' && val === 1) return `${prefix}-4`;
    if (unit === 'rem' && val === 1.25) return `${prefix}-5`;
    if (unit === 'rem' && val === 1.5) return `${prefix}-6`;
    if (unit === 'rem' && val === 2) return `${prefix}-8`;

    // Arbitrary value
    return `${prefix}-[${val}${unit}]`;
  };

  const colGapClass = getGapClass(columnGap, columnGapUnit, 'gap-x');
  const rowGapClass = getGapClass(rowGap, rowGapUnit, 'gap-y');

  if (colGapClass.replace('gap-x', 'gap') === rowGapClass.replace('gap-y', 'gap')) {
    container += ` ${colGapClass.replace('gap-x', 'gap')}`;
  } else {
    container += ` ${rowGapClass} ${colGapClass}`;
  }

  // Item classes
  const itemClasses: Record<string, string> = {};

  items.forEach((item) => {
    let classes = '';

    const colSpan = item.colEnd - item.colStart;
    const rowSpan = item.rowEnd - item.rowStart;

    if (responsive) {
      // Mobile classes: span mobileSpan or default colSpan
      const mSpan = item.mobileSpan || Math.min(mobileColumns, colSpan);
      classes += `col-span-${mSpan}`;

      // Tablet classes
      const tSpan = item.tabletSpan || Math.min(tabletColumns, colSpan);
      classes += ` md:col-span-${tSpan}`;

      // Desktop classes (explicit columns start/end or just span)
      // Since it's an explicit grid, we use explicit positioning on desktop:
      classes += ` lg:col-start-${item.colStart} lg:col-span-${colSpan}`;
      classes += ` lg:row-start-${item.rowStart} lg:row-span-${rowSpan}`;
    } else {
      classes += `col-start-${item.colStart} col-span-${colSpan}`;
      classes += ` row-start-${item.rowStart} row-span-${rowSpan}`;
    }

    itemClasses[item.id] = classes;
  });

  return { container, items: itemClasses };
}

export function generateReactComponent(config: GridConfig): string {
  const { items } = config;
  const tw = generateTailwindClasses(config);
  const nameComponent = 'ResponsiveGrid';

  let code = `import React from 'react';\n\n`;
  code += `export default function ${nameComponent}() {\n`;
  code += `  return (\n`;
  code += `    <div className="${tw.container} w-full min-h-[400px] p-4 bg-zinc-950 border border-zinc-800 rounded-xl">\n`;

  items.forEach((item) => {
    const itemClass = tw.items[item.id] || '';
    const name = item.name;
    const content = item.content || name;
    
    code += `      {/* Grid Item: ${name} */}\n`;
    code += `      <div \n`;
    code += `        className="${itemClass} flex flex-col items-center justify-center p-6 text-center text-sm font-semibold rounded-lg border border-zinc-800/80"\n`;
    code += `        style={{ backgroundColor: '${item.color}15', color: '${item.color}', borderColor: '${item.color}30' }}\n`;
    code += `      >\n`;
    code += `        <span>${content}</span>\n`;
    code += `      </div>\n\n`;
  });

  code += `    </div>\n`;
  code += `  );\n`;
  code += `}\n`;

  return code;
}

export function generateHTML(config: GridConfig): string {
  const { items } = config;
  const cssStyles = generateGridCSS({ ...config, responsive: false }); // inline CSS handles structure cleanly

  let html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n`;
  html += `  <meta charset="UTF-8">\n`;
  html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
  html += `  <title>CSS Grid Visual Prototype</title>\n`;
  html += `  <style>\n`;
  html += `    body {\n`;
  html += `      background-color: #0c0c0e;\n`;
  html += `      color: #f4f4f5;\n`;
  html += `      font-family: system-ui, -apple-system, sans-serif;\n`;
  html += `      margin: 0;\n`;
  html += `      padding: 40px 20px;\n`;
  html += `      display: flex;\n`;
  html += `      justify-content: center;\n`;
  html += `    }\n`;
  html += `    .wrapper {\n`;
  html += `      width: 100%;\n`;
  html += `      max-width: 1200px;\n`;
  html += `    }\n`;
  html += `    .demo-item {\n`;
  html += `      display: flex;\n`;
  html += `      align-items: center;\n`;
  html += `      justify-content: center;\n`;
  html += `      padding: 24px;\n`;
  html += `      border-radius: 8px;\n`;
  html += `      font-weight: 600;\n`;
  html += `      font-size: 14px;\n`;
  html += `      border: 1px solid;\n`;
  html += `    }\n`;
  
  // Append generated CSS
  html += `\n    ${cssStyles.replace(/\n/g, '\n    ')}\n`;
  html += `  </style>\n</head>\n<body>\n`;
  html += `  <div class="wrapper">\n`;
  html += `    <div class="grid-container">\n`;

  items.forEach((item) => {
    const itemClass = sanitizeName(item.name) || `item-${item.id}`;
    const content = item.content || item.name;
    const itemBg = `${item.color}15`;
    const itemBorder = `${item.color}30`;
    
    html += `      <div class="demo-item ${itemClass}" style="background-color: ${itemBg}; border-color: ${itemBorder}; color: ${item.color};">\n`;
    html += `        ${content}\n`;
    html += `      </div>\n`;
  });

  html += `    </div>\n`;
  html += `  </div>\n</body>\n</html>`;

  return html;
}
