import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  generateGridCSS,
  generateTailwindClasses,
  generateReactComponent,
  generateHTML,
  sanitizeName,
  type GridItem,
  type GridConfig
} from '../utils-engine/grid';

const BEAUTIFUL_COLORS = [
  '#34d399', // Emerald
  '#60a5fa', // Blue
  '#a78bfa', // Purple
  '#f472b6', // Pink
  '#fb923c', // Orange
  '#2dd4bf', // Teal
  '#f87171', // Red
  '#818cf8', // Indigo
  '#fbbf24', // Amber
];

// Helper to copy text to clipboard
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

interface Preset {
  name: string;
  description: string;
  columns: number;
  rows: number;
  columnTracks: string[];
  rowTracks: string[];
  items: Omit<GridItem, 'id'>[];
  useAreas: boolean;
}

const PRESETS: Record<string, Preset> = {
  holyGrail: {
    name: '👑 Holy Grail Layout',
    description: 'Classic website design with header, sidebar, main body, right sidebar, and footer.',
    columns: 3,
    rows: 3,
    columnTracks: ['220px', '1fr', '200px'],
    rowTracks: ['auto', '1fr', 'auto'],
    useAreas: true,
    items: [
      { name: 'Header', colStart: 1, colEnd: 4, rowStart: 1, rowEnd: 2, color: '#34d399', content: 'Header Area', tabletSpan: 3, mobileSpan: 1 },
      { name: 'Sidebar-Left', colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 3, color: '#60a5fa', content: 'Left Sidebar', tabletSpan: 1, mobileSpan: 1 },
      { name: 'Main-Content', colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3, color: '#a78bfa', content: 'Main Content Body', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Sidebar-Right', colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3, color: '#f472b6', content: 'Right Sidebar', tabletSpan: 3, mobileSpan: 1 },
      { name: 'Footer', colStart: 1, colEnd: 4, rowStart: 3, rowEnd: 4, color: '#fb923c', content: 'Footer Area', tabletSpan: 3, mobileSpan: 1 }
    ]
  },
  dashboard: {
    name: '📊 Admin Dashboard',
    description: 'Sidebar layout with top nav, dashboard metrics, main graph, and summary cards.',
    columns: 4,
    rows: 3,
    columnTracks: ['240px', '1fr', '1fr', '1fr'],
    rowTracks: ['70px', '180px', '1fr'],
    useAreas: false,
    items: [
      { name: 'Sidebar', colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 4, color: '#818cf8', content: 'Sidebar Navigation', tabletSpan: 4, mobileSpan: 1 },
      { name: 'Top-Nav', colStart: 2, colEnd: 5, rowStart: 1, rowEnd: 2, color: '#2dd4bf', content: 'Top Header / Search', tabletSpan: 4, mobileSpan: 1 },
      { name: 'Metric-A', colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3, color: '#fb923c', content: 'Sales Metric', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Metric-B', colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3, color: '#facc15', content: 'Visitors Metric', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Metric-C', colStart: 4, colEnd: 5, rowStart: 2, rowEnd: 3, color: '#f87171', content: 'Subscribers Metric', tabletSpan: 4, mobileSpan: 1 },
      { name: 'Chart-Area', colStart: 2, colEnd: 5, rowStart: 3, rowEnd: 4, color: '#a78bfa', content: 'Interactive Analytics Chart', tabletSpan: 4, mobileSpan: 1 }
    ]
  },
  portfolio: {
    name: '🖼️ Asymmetric Gallery',
    description: 'A modern design with varying grid sizes ideal for showcase images.',
    columns: 3,
    rows: 3,
    columnTracks: ['1fr', '1.2fr', '1fr'],
    rowTracks: ['200px', '160px', '220px'],
    useAreas: false,
    items: [
      { name: 'Hero-Image', colStart: 1, colEnd: 3, rowStart: 1, rowEnd: 3, color: '#f472b6', content: 'Featured Project Showcase', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Project-A', colStart: 3, colEnd: 4, rowStart: 1, rowEnd: 2, color: '#60a5fa', content: 'Project Mini-A', tabletSpan: 1, mobileSpan: 1 },
      { name: 'Project-B', colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 4, color: '#34d399', content: 'Tall Vertical Card', tabletSpan: 3, mobileSpan: 1 },
      { name: 'Project-C', colStart: 1, colEnd: 2, rowStart: 3, rowEnd: 4, color: '#fb923c', content: 'Client Logo Reel', tabletSpan: 1, mobileSpan: 1 },
      { name: 'Project-D', colStart: 2, colEnd: 3, rowStart: 3, rowEnd: 4, color: '#a78bfa', content: 'Case Study Text', tabletSpan: 2, mobileSpan: 1 }
    ]
  },
  cardGrid: {
    name: '📇 3-Column Blog Cards',
    description: 'Perfect responsive list of layout cards for articles or store products.',
    columns: 3,
    rows: 2,
    columnTracks: ['1fr', '1fr', '1fr'],
    rowTracks: ['1fr', '1fr'],
    useAreas: false,
    items: [
      { name: 'Blog-1', colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2, color: '#60a5fa', content: 'Latest Article Card', tabletSpan: 1, mobileSpan: 1 },
      { name: 'Blog-2', colStart: 2, colEnd: 3, rowStart: 1, rowEnd: 2, color: '#34d399', content: 'Design Trends Card', tabletSpan: 1, mobileSpan: 1 },
      { name: 'Blog-3', colStart: 3, colEnd: 4, rowStart: 1, rowEnd: 2, color: '#a78bfa', content: 'TypeScript Guide Card', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Blog-4', colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 3, color: '#fb923c', content: 'Tailwind v4 Sneak-peek', tabletSpan: 2, mobileSpan: 1 },
      { name: 'Blog-5', colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 3, color: '#f472b6', content: 'Featured Wide Case Study Banner', tabletSpan: 2, mobileSpan: 1 }
    ]
  }
};

export const GridGenerator: React.FC = () => {
  // Grid Setup States (Initialized to Holy Grail Preset)
  const [columns, setColumns] = useState<number>(3);
  const [rows, setRows] = useState<number>(3);
  const [columnGap, setColumnGap] = useState<number>(16);
  const [columnGapUnit, setColumnGapUnit] = useState<string>('px');
  const [rowGap, setRowGap] = useState<number>(16);
  const [rowGapUnit, setRowGapUnit] = useState<string>('px');
  const [useAreas, setUseAreas] = useState<boolean>(true);
  const [responsive, setResponsive] = useState<boolean>(true);
  const [tabletColumns, setTabletColumns] = useState<number>(2);
  const [mobileColumns, setMobileColumns] = useState<number>(1);

  // Track settings (desktop templates)
  const [columnTracks, setColumnTracks] = useState<string[]>(['220px', '1fr', '200px']);
  const [rowTracks, setRowTracks] = useState<string[]>(['auto', '1fr', 'auto']);

  // Grid Items List State
  const [items, setItems] = useState<GridItem[]>([
    { id: '1', name: 'Header', colStart: 1, colEnd: 4, rowStart: 1, rowEnd: 2, color: '#34d399', content: 'Header Area', tabletSpan: 3, mobileSpan: 1 },
    { id: '2', name: 'Sidebar-Left', colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 3, color: '#60a5fa', content: 'Left Sidebar', tabletSpan: 1, mobileSpan: 1 },
    { id: '3', name: 'Main-Content', colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3, color: '#a78bfa', content: 'Main Content Body', tabletSpan: 2, mobileSpan: 1 },
    { id: '4', name: 'Sidebar-Right', colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3, color: '#f472b6', content: 'Right Sidebar', tabletSpan: 3, mobileSpan: 1 },
    { id: '5', name: 'Footer', colStart: 1, colEnd: 4, rowStart: 3, rowEnd: 4, color: '#fb923c', content: 'Footer Area', tabletSpan: 3, mobileSpan: 1 }
  ]);

  // Selected Preset
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('holyGrail');

  // Drawing State (Visual Canvas Selection)
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ row: number; col: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ row: number; col: number } | null>(null);

  // Width Simulation State (Mobile Responsive preview)
  const [simWidth, setSimWidth] = useState<number | string>('100%');

  // Export Format State
  const [exportTab, setExportTab] = useState<'css' | 'tailwind-v4' | 'tailwind-v3' | 'react' | 'html'>('css');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Edit Item modal/state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');
  const [editingItemContent, setEditingItemContent] = useState<string>('');
  const [editingItemColor, setEditingItemColor] = useState<string>('');
  const [editingItemTabletSpan, setEditingItemTabletSpan] = useState<number>(0);
  const [editingItemMobileSpan, setEditingItemMobileSpan] = useState<number>(0);

  // Moving State
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [dragStartCell, setDragStartCell] = useState<{ row: number; col: number } | null>(null);
  const [movingItemOriginalCoords, setMovingItemOriginalCoords] = useState<{ colStart: number, colEnd: number, rowStart: number, rowEnd: number } | null>(null);

  // Resizing State
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [resizingDirection, setResizingDirection] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [resizingItemOriginalCoords, setResizingItemOriginalCoords] = useState<{ colStart: number, colEnd: number, rowStart: number, rowEnd: number } | null>(null);

  // Sync track lists when columns/rows numbers change
  useEffect(() => {
    setColumnTracks((prev) => {
      const next = [...prev];
      if (next.length < columns) {
        return [...next, ...Array(columns - next.length).fill('1fr')];
      }
      return next.slice(0, columns);
    });
  }, [columns]);

  useEffect(() => {
    setRowTracks((prev) => {
      const next = [...prev];
      if (next.length < rows) {
        return [...next, ...Array(rows - next.length).fill('1fr')];
      }
      return next.slice(0, rows);
    });
  }, [rows]);

  // Clamp items when columns or rows count is shrunk
  useEffect(() => {
    setItems((prev) => {
      return prev
        .map((item) => {
          let colStart = item.colStart;
          let colEnd = item.colEnd;
          let rowStart = item.rowStart;
          let rowEnd = item.rowEnd;

          // Clamp columns
          if (colStart > columns) return null;
          if (colEnd > columns + 1) colEnd = columns + 1;
          if (colStart >= colEnd) return null;

          // Clamp rows
          if (rowStart > rows) return null;
          if (rowEnd > rows + 1) rowEnd = rows + 1;
          if (rowStart >= rowEnd) return null;

          return { ...item, colStart, colEnd, rowStart, rowEnd };
        })
        .filter((item): item is GridItem => item !== null);
    });
  }, [columns, rows]);

  // Computes the grid config object
  const gridConfig = useMemo((): GridConfig => {
    return {
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
      mobileColumns
    };
  }, [
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
    mobileColumns
  ]);

  // Handle Preset Selection
  const applyPreset = (key: string) => {
    setSelectedPresetKey(key);
    if (key === 'custom') {
      setColumns(4);
      setRows(3);
      setColumnTracks(['1fr', '1fr', '1fr', '1fr']);
      setRowTracks(['1fr', '1fr', '1fr']);
      setItems([]);
      return;
    }
    const p = PRESETS[key];
    if (!p) return;

    setColumns(p.columns);
    setRows(p.rows);
    setColumnTracks(p.columnTracks);
    setRowTracks(p.rowTracks);
    setUseAreas(p.useAreas);

    // Build items with ids
    const loadedItems: GridItem[] = p.items.map((item, idx) => ({
      ...item,
      id: `${Date.now()}-${idx}`
    }));
    setItems(loadedItems);
  };

  // Keyboard shortcut listener (CMD+C or CTRL+C for current active code block)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (
          activeNode &&
          (activeNode.tagName === 'INPUT' ||
            activeNode.tagName === 'TEXTAREA' ||
            activeNode.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }
        e.preventDefault();
        handleCopyCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridConfig, exportTab]);

  // Global mouseup event listener to ensure we clean up drag state safely
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (movingItemId || resizingItemId || isDrawing) {
        // Handle drag-to-click transition
        if (movingItemId && movingItemOriginalCoords) {
          const currentItem = items.find((i) => i.id === movingItemId);
          if (currentItem) {
            const hasMoved =
              currentItem.colStart !== movingItemOriginalCoords.colStart ||
              currentItem.colEnd !== movingItemOriginalCoords.colEnd ||
              currentItem.rowStart !== movingItemOriginalCoords.rowStart ||
              currentItem.rowEnd !== movingItemOriginalCoords.rowEnd;

            if (!hasMoved) {
              openEditModal(currentItem);
            }
          }
        }

        setIsDrawing(false);
        setMovingItemId(null);
        setResizingItemId(null);
        setResizingDirection(null);
        setDragStartCell(null);
        setMovingItemOriginalCoords(null);
        setResizingItemOriginalCoords(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [movingItemId, resizingItemId, isDrawing, movingItemOriginalCoords, items]);

  // Get code string to copy
  const codeToExport = useMemo(() => {
    switch (exportTab) {
      case 'css':
        return generateGridCSS(gridConfig);
      case 'tailwind-v4':
        return `@theme {\n  --color-grid-container: var(--color-zinc-950);\n}\n\n/* Tailwind v4 Layout Container Class: */\n/* Container: "${generateTailwindClasses(gridConfig).container}" */\n\n${JSON.stringify(generateTailwindClasses(gridConfig).items, null, 2)}`;
      case 'tailwind-v3':
        const tw3 = generateTailwindClasses(gridConfig);
        return `<!-- Grid Container -->\n<div class="${tw3.container}">\n` +
          items.map(item => `  <!-- Grid Item: ${item.name} -->\n  <div class="${tw3.items[item.id] || ''}">\n    ${item.content || item.name}\n  </div>`).join('\n') +
          `\n</div>`;
      case 'react':
        return generateReactComponent(gridConfig);
      case 'html':
        return generateHTML(gridConfig);
    }
  }, [gridConfig, exportTab, items]);

  const handleCopyCode = () => {
    const ok = copyToClipboard(codeToExport);
    if (ok) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleDownloadHTML = () => {
    const fullHtml = generateHTML(gridConfig);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grid-layout-${sanitizeName(PRESETS[selectedPresetKey]?.name || 'custom')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Visual Cell Check: finds which item occupies cell (r, c) - 1-indexed
  const getItemAtCell = (r: number, c: number): GridItem | undefined => {
    return items.find(
      (item) => r >= item.rowStart && r < item.rowEnd && c >= item.colStart && c < item.colEnd
    );
  };

  // Drawing Math: handles start of dragging
  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    // Check if cell is already occupied
    if (getItemAtCell(r, c)) return;

    e.preventDefault(); // Prevent text selection and browser drag actions

    setIsDrawing(true);
    setDrawStart({ row: r, col: c });
    setDrawEnd({ row: r, col: c });
  };

  // Calculate selection validity (no overlaps with existing items)
  const isSelectionValid = useMemo(() => {
    if (!isDrawing || !drawStart || !drawEnd) return true;
    const minR = Math.min(drawStart.row, drawEnd.row);
    const maxR = Math.max(drawStart.row, drawEnd.row);
    const minC = Math.min(drawStart.col, drawEnd.col);
    const maxC = Math.max(drawStart.col, drawEnd.col);

    for (let row = minR; row <= maxR; row++) {
      for (let col = minC; col <= maxC; col++) {
        if (getItemAtCell(row, col)) {
          return false;
        }
      }
    }
    return true;
  }, [isDrawing, drawStart, drawEnd, items]);

  // Drawing & Dragging Math: handles cell hover while drawing/moving/resizing
  const handleCellMouseEnter = (r: number, c: number) => {
    if (isDrawing && drawStart) {
      setDrawEnd({ row: r, col: c });
      return;
    }

    if (resizingItemId && dragStartCell && resizingItemOriginalCoords && resizingDirection) {
      const item = items.find((i) => i.id === resizingItemId);
      if (!item) return;

      const deltaRow = r - dragStartCell.row;
      const deltaCol = c - dragStartCell.col;

      let newColStart = resizingItemOriginalCoords.colStart;
      let newColEnd = resizingItemOriginalCoords.colEnd;
      let newRowStart = resizingItemOriginalCoords.rowStart;
      let newRowEnd = resizingItemOriginalCoords.rowEnd;

      switch (resizingDirection) {
        case 'br':
          newColEnd = Math.max(newColStart + 1, resizingItemOriginalCoords.colEnd + deltaCol);
          newRowEnd = Math.max(newRowStart + 1, resizingItemOriginalCoords.rowEnd + deltaRow);
          break;
        case 'tr':
          newColEnd = Math.max(newColStart + 1, resizingItemOriginalCoords.colEnd + deltaCol);
          newRowStart = Math.min(newRowEnd - 1, resizingItemOriginalCoords.rowStart + deltaRow);
          break;
        case 'bl':
          newColStart = Math.min(newColEnd - 1, resizingItemOriginalCoords.colStart + deltaCol);
          newRowEnd = Math.max(newRowStart + 1, resizingItemOriginalCoords.rowEnd + deltaRow);
          break;
        case 'tl':
          newColStart = Math.min(newColEnd - 1, resizingItemOriginalCoords.colStart + deltaCol);
          newRowStart = Math.min(newRowEnd - 1, resizingItemOriginalCoords.rowStart + deltaRow);
          break;
      }

      // Check boundaries
      if (newColStart < 1 || newColEnd > columns + 1 || newRowStart < 1 || newRowEnd > rows + 1) {
        return;
      }

      // Check if new shape overlaps other items
      let overlaps = false;
      for (const other of items) {
        if (other.id === resizingItemId) continue;
        const intersectCol = Math.max(newColStart, other.colStart) < Math.min(newColEnd, other.colEnd);
        const intersectRow = Math.max(newRowStart, other.rowStart) < Math.min(newRowEnd, other.rowEnd);
        if (intersectCol && intersectRow) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === resizingItemId
              ? {
                  ...i,
                  colStart: newColStart,
                  colEnd: newColEnd,
                  rowStart: newRowStart,
                  rowEnd: newRowEnd
                }
              : i
          )
        );
        setSelectedPresetKey('custom');
      }
      return;
    }

    if (movingItemId && dragStartCell && movingItemOriginalCoords) {
      const item = items.find((i) => i.id === movingItemId);
      if (!item) return;

      const deltaRow = r - dragStartCell.row;
      const deltaCol = c - dragStartCell.col;

      const colSpan = movingItemOriginalCoords.colEnd - movingItemOriginalCoords.colStart;
      const rowSpan = movingItemOriginalCoords.rowEnd - movingItemOriginalCoords.rowStart;

      const newColStart = movingItemOriginalCoords.colStart + deltaCol;
      const newColEnd = newColStart + colSpan;
      const newRowStart = movingItemOriginalCoords.rowStart + deltaRow;
      const newRowEnd = newRowStart + rowSpan;

      if (newColStart < 1 || newColEnd > columns + 1 || newRowStart < 1 || newRowEnd > rows + 1) {
        return;
      }

      let overlaps = false;
      for (const other of items) {
        if (other.id === movingItemId) continue;
        const intersectCol = Math.max(newColStart, other.colStart) < Math.min(newColEnd, other.colEnd);
        const intersectRow = Math.max(newRowStart, other.rowStart) < Math.min(newRowEnd, other.rowEnd);
        if (intersectCol && intersectRow) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === movingItemId
              ? {
                  ...i,
                  colStart: newColStart,
                  colEnd: newColEnd,
                  rowStart: newRowStart,
                  rowEnd: newRowEnd
                }
              : i
          )
        );
        setSelectedPresetKey('custom');
      }
      return;
    }
  };

  // Drawing Math: finishes dragging and adds item
  const handleMouseUp = () => {
    setIsDrawing(false);
    setMovingItemId(null);
    setResizingItemId(null);
    setResizingDirection(null);
    setDragStartCell(null);
    setMovingItemOriginalCoords(null);
    setResizingItemOriginalCoords(null);

    if (drawStart && drawEnd) {
      if (!isSelectionValid) {
        setDrawStart(null);
        setDrawEnd(null);
        return;
      }

      const rowStart = Math.min(drawStart.row, drawEnd.row);
      const rowEnd = Math.max(drawStart.row, drawEnd.row) + 1;
      const colStart = Math.min(drawStart.col, drawEnd.col);
      const colEnd = Math.max(drawStart.col, drawEnd.col) + 1;

      const newItemNum = items.length + 1;
      const color = BEAUTIFUL_COLORS[(newItemNum - 1) % BEAUTIFUL_COLORS.length];
      const newItem: GridItem = {
        id: `${Date.now()}`,
        name: `item-${newItemNum}`,
        colStart,
        colEnd,
        rowStart,
        rowEnd,
        color,
        content: `Grid Item ${newItemNum}`,
        tabletSpan: 0,
        mobileSpan: 0
      };

      setItems((prev) => [...prev, newItem]);
      setDrawStart(null);
      setDrawEnd(null);
      setSelectedPresetKey('custom');

      openEditModal(newItem);
    }
  };

  // Handle Drag Move Start for existing item
  const handleItemMouseDown = (item: GridItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // left click only

    if ((e.target as HTMLElement).closest('.delete-btn')) {
      return;
    }

    e.preventDefault(); // Stop browser selection/ghost drag

    const isResizeTl = !!(e.target as HTMLElement).closest('.resize-tl');
    const isResizeTr = !!(e.target as HTMLElement).closest('.resize-tr');
    const isResizeBl = !!(e.target as HTMLElement).closest('.resize-bl');
    const isResizeBr = !!(e.target as HTMLElement).closest('.resize-br');

    if (isResizeTl || isResizeTr || isResizeBl || isResizeBr) {
      const direction = isResizeTl ? 'tl' : isResizeTr ? 'tr' : isResizeBl ? 'bl' : 'br';
      
      // Map resizing to the exact corner cells to avoid rounding errors during size contraction
      let startRow = item.rowStart;
      let startCol = item.colStart;

      if (direction === 'br') {
        startRow = item.rowEnd - 1;
        startCol = item.colEnd - 1;
      } else if (direction === 'tr') {
        startRow = item.rowStart;
        startCol = item.colEnd - 1;
      } else if (direction === 'bl') {
        startRow = item.rowEnd - 1;
        startCol = item.colStart;
      }

      setResizingItemId(item.id);
      setResizingDirection(direction);
      setDragStartCell({ row: startRow, col: startCol });
      setResizingItemOriginalCoords({
        colStart: item.colStart,
        colEnd: item.colEnd,
        rowStart: item.rowStart,
        rowEnd: item.rowEnd
      });
    } else {
      // Normal moving: use clicked cell as offset anchor
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const colSpan = item.colEnd - item.colStart;
      const rowSpan = item.rowEnd - item.rowStart;

      const colOffset = Math.floor((clickX / rect.width) * colSpan);
      const rowOffset = Math.floor((clickY / rect.height) * rowSpan);

      const clickedCol = item.colStart + colOffset;
      const clickedRow = item.rowStart + rowOffset;

      setMovingItemId(item.id);
      setDragStartCell({ row: clickedRow, col: clickedCol });
      setMovingItemOriginalCoords({
        colStart: item.colStart,
        colEnd: item.colEnd,
        rowStart: item.rowStart,
        rowEnd: item.rowEnd
      });
    }
  };

  // Cancel drawing if mouse leaves grid visual container
  const handleGridMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
    }
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedPresetKey('custom');
    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  const resetLayout = () => {
    setItems([]);
    setSelectedPresetKey('custom');
  };

  const openEditModal = (item: GridItem) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemContent(item.content || '');
    setEditingItemColor(item.color);
    setEditingItemTabletSpan(item.tabletSpan || 0);
    setEditingItemMobileSpan(item.mobileSpan || 0);
  };

  const saveEditedItem = () => {
    if (!editingItemId) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            name: editingItemName.trim() || item.name,
            content: editingItemContent.trim() || editingItemName.trim() || item.content,
            color: editingItemColor,
            tabletSpan: editingItemTabletSpan,
            mobileSpan: editingItemMobileSpan
          };
        }
        return item;
      })
    );
    setEditingItemId(null);
    setSelectedPresetKey('custom');
  };

  // Determine current active breakpoint based on simulated width
  const simulatedBreakpoint = useMemo(() => {
    if (typeof simWidth === 'string') return 'desktop';
    if (simWidth <= 640) return 'mobile';
    if (simWidth <= 1024) return 'tablet';
    return 'desktop';
  }, [simWidth]);

  const isAnyActive = movingItemId !== null || resizingItemId !== null;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Top Presets bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-xl p-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-zinc-400">Select Template Preset:</label>
          <select
            value={selectedPresetKey}
            onChange={(e) => applyPreset(e.target.value)}
            className="bg-canvas border border-border-hairline text-zinc-100 font-mono text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-zinc-700 focus:border-accent-emerald transition-all"
          >
            <option value="custom">⚙️ Custom (Blank Canvas)</option>
            <option value="holyGrail">👑 Holy Grail Layout</option>
            <option value="dashboard">📊 Admin Dashboard</option>
            <option value="portfolio">🖼️ Asymmetric Gallery</option>
            <option value="cardGrid">📇 3-Column Blog Cards</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetLayout}
            className="px-3.5 py-1.5 text-xs bg-zinc-900 border border-border-hairline hover:bg-zinc-850 hover:text-zinc-50 rounded-lg text-zinc-400 transition-colors font-mono cursor-pointer"
          >
            Clear Grid
          </button>
          <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-2 py-1 rounded border border-border-hairline/40 uppercase tracking-wider">
            Client-Side Sandbox
          </span>
        </div>
      </div>

      {/* Split-pane Main UI Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left pane: Controls & parameters (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-panel border border-border-hairline rounded-xl p-5">
          {/* Section 1: Dimensions */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>📏</span> Grid Matrix Dimensions
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 flex justify-between">
                  <span>Columns</span>
                  <span className="text-accent-emerald">{columns}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value))}
                  className="h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-accent-emerald"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400 flex justify-between">
                  <span>Rows</span>
                  <span className="text-accent-emerald">{rows}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value))}
                  className="h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-accent-emerald"
                />
              </div>
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Section 2: Gaps */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>📐</span> Grid Gaps / Spacing
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Column Gap</label>
                <div className="flex items-center gap-1 bg-canvas border border-border-hairline rounded-lg px-2.5 py-1.5 focus-within:border-accent-emerald transition-colors">
                  <input
                    type="number"
                    min="0"
                    value={columnGap}
                    onChange={(e) => setColumnGap(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-zinc-100 font-mono text-xs outline-none"
                  />
                  <select
                    value={columnGapUnit}
                    onChange={(e) => setColumnGapUnit(e.target.value)}
                    className="bg-transparent text-zinc-500 font-mono text-[10px] outline-none cursor-pointer"
                  >
                    <option value="px">PX</option>
                    <option value="rem">REM</option>
                    <option value="em">EM</option>
                    <option value="%">%</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Row Gap</label>
                <div className="flex items-center gap-1 bg-canvas border border-border-hairline rounded-lg px-2.5 py-1.5 focus-within:border-accent-emerald transition-colors">
                  <input
                    type="number"
                    min="0"
                    value={rowGap}
                    onChange={(e) => setRowGap(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-zinc-100 font-mono text-xs outline-none"
                  />
                  <select
                    value={rowGapUnit}
                    onChange={(e) => setRowGapUnit(e.target.value)}
                    className="bg-transparent text-zinc-500 font-mono text-[10px] outline-none cursor-pointer"
                  >
                    <option value="px">PX</option>
                    <option value="rem">REM</option>
                    <option value="em">EM</option>
                    <option value="%">%</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Section 3: Track Sizing Customization */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>⚙️</span> Custom Track Sizes (Desktop)
            </h3>

            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
              <label className="text-[11px] font-mono text-zinc-500">Columns track sizes:</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {columnTracks.map((track, i) => (
                  <div key={`col-t-${i}`} className="flex items-center gap-1.5 bg-canvas border border-border-hairline px-2 py-1 rounded-md">
                    <span className="text-[10px] font-mono text-zinc-550">Col {i + 1}:</span>
                    <input
                      type="text"
                      value={track}
                      onChange={(e) => {
                        const updated = [...columnTracks];
                        updated[i] = e.target.value || '1fr';
                        setColumnTracks(updated);
                        setSelectedPresetKey('custom');
                      }}
                      className="bg-transparent text-zinc-100 font-mono text-xs outline-none w-full"
                    />
                  </div>
                ))}
              </div>

              <label className="text-[11px] font-mono text-zinc-500">Rows track sizes:</label>
              <div className="grid grid-cols-2 gap-2">
                {rowTracks.map((track, i) => (
                  <div key={`row-t-${i}`} className="flex items-center gap-1.5 bg-canvas border border-border-hairline px-2 py-1 rounded-md">
                    <span className="text-[10px] font-mono text-zinc-550">Row {i + 1}:</span>
                    <input
                      type="text"
                      value={track}
                      onChange={(e) => {
                        const updated = [...rowTracks];
                        updated[i] = e.target.value || '1fr';
                        setRowTracks(updated);
                        setSelectedPresetKey('custom');
                      }}
                      className="bg-transparent text-zinc-100 font-mono text-xs outline-none w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* Section 4: Responsive Breakpoint settings */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                <span>📱</span> Responsive Breakpoints
              </h3>
              <div className="relative flex items-center h-5">
                <input
                  type="checkbox"
                  checked={responsive}
                  onChange={(e) => setResponsive(e.target.checked)}
                  className="w-4 h-4 text-accent-emerald bg-zinc-900 border-zinc-700 rounded focus:ring-accent-emerald focus:ring-1 cursor-pointer"
                  id="resp-check"
                />
              </div>
            </div>

            {responsive && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Tablet columns (≤1024px)</label>
                  <select
                    value={tabletColumns}
                    onChange={(e) => setTabletColumns(parseInt(e.target.value))}
                    className="bg-canvas border border-border-hairline text-zinc-100 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-accent-emerald"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={`t-col-${n}`} value={n}>{n} cols</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-zinc-400">Mobile columns (≤640px)</label>
                  <select
                    value={mobileColumns}
                    onChange={(e) => setMobileColumns(parseInt(e.target.value))}
                    className="bg-canvas border border-border-hairline text-zinc-100 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-accent-emerald"
                  >
                    {Array.from({ length: 4 }, (_, i) => i + 1).map((n) => (
                      <option key={`m-col-${n}`} value={n}>{n} cols</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <hr className="border-border-hairline" />

          {/* Section 5: List Items */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>🏷️</span> Grid Items Manager
            </h3>

            {items.length === 0 ? (
              <div className="text-center py-4 bg-canvas/40 border border-border-hairline border-dashed rounded-lg text-[11px] text-zinc-500 font-sans">
                No items defined. Click and drag in the grid area to draw grid blocks.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 bg-zinc-900/60 border border-border-hairline px-3 py-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-zinc-200 font-mono truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-zinc-500 bg-canvas px-1.5 py-0.5 rounded border border-border-hairline/30">
                        {item.colEnd - item.colStart}x{item.rowEnd - item.rowStart}
                      </span>
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-[10px] text-zinc-400 hover:text-accent-emerald transition-colors font-mono cursor-pointer"
                        title="Edit properties"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors font-mono cursor-pointer"
                        title="Delete item"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Visual Canvas preview + code output (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card: Visual Grid Preview / Studio Canvas */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                  <span>🎨</span> Visual Studio Workspace
                </h3>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                  {simulatedBreakpoint === 'desktop'
                    ? 'Click and drag over empty cells to draw a grid block.'
                    : `Responsive preview layout collapse showing flow on simulated ${simulatedBreakpoint}.`}
                </p>
              </div>

              {/* Viewport resizing tools */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                <button
                  onClick={() => setSimWidth(360)}
                  className={`px-2 py-1 text-[10px] font-mono rounded cursor-pointer transition-all ${
                    simWidth === 360
                      ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  Mobile
                </button>
                <button
                  onClick={() => setSimWidth(768)}
                  className={`px-2 py-1 text-[10px] font-mono rounded cursor-pointer transition-all ${
                    simWidth === 768
                      ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  Tablet
                </button>
                <button
                  onClick={() => setSimWidth('100%')}
                  className={`px-2 py-1 text-[10px] font-mono rounded cursor-pointer transition-all ${
                    simWidth === '100%'
                      ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  Desktop
                </button>
              </div>
            </div>

            {/* Simulating container size bounds */}
            <div
              className="w-full bg-zinc-950 border border-border-hairline rounded-lg p-6 relative overflow-hidden transition-all duration-300 flex items-center justify-center min-h-[340px]"
              style={{ maxWidth: '100%' }}
            >
              <div
                className="w-full h-full transition-all duration-300"
                style={{
                  width: typeof simWidth === 'number' ? `${simWidth}px` : '100%',
                  maxWidth: '100%'
                }}
              >
                {/* Visual grid studio representation */}
                {simulatedBreakpoint === 'desktop' ? (
                  // Active drag-and-draw desktop preview grid
                  <div
                    className="relative grid select-none"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: columnTracks.join(' '),
                      gridTemplateRows: rowTracks.join(' '),
                      columnGap: `${columnGap}${columnGapUnit}`,
                      rowGap: `${rowGap}${rowGapUnit}`,
                      minHeight: '260px'
                    }}
                    onMouseLeave={handleGridMouseLeave}
                    onMouseUp={handleMouseUp}
                  >
                    {/* Background interactive cell blocks */}
                    {Array.from({ length: rows }).map((_, rIdx) => {
                      const r = rIdx + 1;
                      return Array.from({ length: columns }).map((_, cIdx) => {
                        const c = cIdx + 1;
                        const occupied = getItemAtCell(r, c);

                        // Calculate drawing highlight state
                        let isHighlighted = false;
                        let isCellDrawingValid = true;
                        if (isDrawing && drawStart && drawEnd) {
                          const minR = Math.min(drawStart.row, drawEnd.row);
                          const maxR = Math.max(drawStart.row, drawEnd.row);
                          const minC = Math.min(drawStart.col, drawEnd.col);
                          const maxC = Math.max(drawStart.col, drawEnd.col);
                          isHighlighted = r >= minR && r <= maxR && c >= minC && c <= maxC;
                          isCellDrawingValid = isSelectionValid;
                        }

                        return (
                          <div
                            key={`cell-${r}-${c}`}
                            onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                            onMouseEnter={() => handleCellMouseEnter(r, c)}
                            className={`border border-border-hairline border-dashed aspect-video rounded-sm flex items-center justify-center transition-all ${
                              occupied
                                ? `border-transparent ${
                                    isAnyActive || isDrawing ? '' : 'pointer-events-none'
                                  }`
                                : isHighlighted
                                ? isCellDrawingValid
                                  ? 'bg-accent-emerald/10 border-accent-emerald border-solid'
                                  : 'bg-red-500/10 border-red-500 border-solid'
                                : 'bg-zinc-900/10 hover:bg-zinc-900/40 cursor-crosshair'
                            }`}
                            style={{
                              gridColumnStart: c,
                              gridRowStart: r
                            }}
                          >
                            {!occupied && !isHighlighted && (
                              <span className="text-[8px] font-mono text-zinc-650 opacity-40 group-hover:opacity-100">
                                {r},{c}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })}

                    {/* Placed grid item blocks */}
                    {items.map((item) => {
                      const bg = `${item.color}15`;
                      const border = `${item.color}30`;
                      const isDragged = movingItemId === item.id;
                      const isResized = resizingItemId === item.id;

                      return (
                        <div
                          key={`block-${item.id}`}
                          onMouseDown={(e) => handleItemMouseDown(item, e)}
                          className={`flex flex-col items-center justify-center p-3 text-center border rounded-lg transition-all hover:brightness-125 hover:shadow-lg select-none group/item relative overflow-hidden ${
                            isDragged
                              ? 'cursor-grabbing opacity-50 scale-[0.98] pointer-events-none'
                              : isResized
                              ? 'pointer-events-none opacity-85'
                              : isAnyActive
                              ? 'pointer-events-none'
                              : 'cursor-grab'
                          }`}
                          style={{
                            gridColumn: `${item.colStart} / ${item.colEnd}`,
                            gridRow: `${item.rowStart} / ${item.rowEnd}`,
                            backgroundColor: bg,
                            borderColor: border,
                            color: item.color
                          }}
                        >
                          <span className="text-xs font-mono font-semibold truncate max-w-full">
                            {item.name}
                          </span>
                          <span className="text-[9px] font-mono opacity-60 mt-0.5 truncate max-w-full">
                            {item.content || item.name}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="delete-btn absolute inset-0 m-auto w-7 h-7 bg-zinc-950/90 border border-zinc-800/80 text-[10px] text-zinc-400 hover:text-red-400 hover:border-red-500/40 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:scale-105 transition-all duration-200 shadow-xl cursor-pointer"
                            title="Remove item"
                          >
                            ✕
                          </button>
                          {simulatedBreakpoint === 'desktop' && (
                            <>
                              {/* Top Left resize handle */}
                              <div
                                className="resize-handle resize-tl absolute top-1.5 left-1.5 w-2 h-2 cursor-nw-resize rounded-full bg-zinc-600/80 border border-zinc-500 hover:bg-accent-emerald hover:border-transparent opacity-0 group-hover/item:opacity-100 transition-all z-10"
                                title="Drag to resize top-left"
                              />
                              {/* Top Right resize handle */}
                              <div
                                className="resize-handle resize-tr absolute top-1.5 right-1.5 w-2 h-2 cursor-ne-resize rounded-full bg-zinc-600/80 border border-zinc-500 hover:bg-accent-emerald hover:border-transparent opacity-0 group-hover/item:opacity-100 transition-all z-10"
                                title="Drag to resize top-right"
                              />
                              {/* Bottom Left resize handle */}
                              <div
                                className="resize-handle resize-bl absolute bottom-1.5 left-1.5 w-2 h-2 cursor-sw-resize rounded-full bg-zinc-600/80 border border-zinc-500 hover:bg-accent-emerald hover:border-transparent opacity-0 group-hover/item:opacity-100 transition-all z-10"
                                title="Drag to resize bottom-left"
                              />
                              {/* Bottom Right resize handle */}
                              <div
                                className="resize-handle resize-br absolute bottom-1.5 right-1.5 w-2 h-2 cursor-se-resize rounded-full bg-zinc-600/80 border border-zinc-500 hover:bg-accent-emerald hover:border-transparent opacity-0 group-hover/item:opacity-100 transition-all z-10"
                                title="Drag to resize bottom-right"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Responsive collapsed simulated viewport rendering
                  <div
                    className="grid w-full gap-4"
                    style={{
                      gridTemplateColumns:
                        simulatedBreakpoint === 'tablet'
                          ? `repeat(${tabletColumns}, 1fr)`
                          : `repeat(${mobileColumns}, 1fr)`
                    }}
                  >
                    {items.map((item) => {
                      const bg = `${item.color}15`;
                      const border = `${item.color}30`;
                      const span =
                        simulatedBreakpoint === 'tablet'
                          ? item.tabletSpan || Math.min(tabletColumns, item.colEnd - item.colStart)
                          : item.mobileSpan || Math.min(mobileColumns, item.colEnd - item.colStart);

                      return (
                        <div
                          key={`block-sim-${item.id}`}
                          className="flex flex-col items-center justify-center p-6 text-center border rounded-lg"
                          style={{
                            gridColumn: `span ${span}`,
                            backgroundColor: bg,
                            borderColor: border,
                            color: item.color
                          }}
                        >
                          <span className="text-xs font-mono font-semibold">{item.name}</span>
                          <span className="text-[10px] font-mono opacity-65 mt-0.5">
                            {item.content || item.name}
                          </span>
                          <span className="text-[9px] opacity-45 mt-2 font-mono">
                            Spans {span} {span === 1 ? 'col' : 'cols'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Export code blocks */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                <span>⚡</span> Code Export Station
              </h3>

              {/* tabs format switcher */}
              <div className="flex flex-wrap gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                {(['css', 'tailwind-v4', 'tailwind-v3', 'react', 'html'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setExportTab(tab)}
                    className={`px-2 py-1 text-[9px] font-mono uppercase rounded cursor-pointer select-none transition-all ${
                      exportTab === tab
                        ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {tab === 'css'
                      ? 'Pure CSS'
                      : tab === 'tailwind-v4'
                      ? 'TW v4'
                      : tab === 'tailwind-v3'
                      ? 'TW v3'
                      : tab === 'react'
                      ? 'React'
                      : 'HTML'}
                  </button>
                ))}
              </div>
            </div>

            {/* Code output display box */}
            <div className="relative group bg-zinc-950 border border-border-hairline rounded-lg p-4 font-mono text-[11px] text-zinc-300 overflow-hidden">
              <pre className="max-h-[220px] overflow-y-auto pr-24 select-text text-accent-emerald scrollbar-thin">
                <code>{codeToExport}</code>
              </pre>

              <div className="absolute right-3 top-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copyFeedback ? (
                    <span className="text-accent-emerald font-semibold animate-pulse">Copied!</span>
                  ) : (
                    <>
                      <span>Copy</span>
                      <kbd className="font-mono bg-zinc-850 px-1 py-0.2 rounded border border-zinc-700 text-[8px] text-zinc-550">
                        ⌘ C
                      </kbd>
                    </>
                  )}
                </button>

                {exportTab === 'html' && (
                  <button
                    type="button"
                    onClick={handleDownloadHTML}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal overlay */}
      {editingItemId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-panel border border-border-hairline rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col gap-4 p-6">
            <button
              onClick={() => setEditingItemId(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800"
            >
              ✕
            </button>

            <h3 className="text-sm font-bold text-zinc-50 font-sans border-b border-border-hairline pb-2 uppercase tracking-wider font-mono">
              ⚙️ Customize Grid Item
            </h3>

            <div className="flex flex-col gap-4 mt-2">
              {/* Item Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Item Name/CSS Identifier</label>
                <input
                  type="text"
                  value={editingItemName}
                  onChange={(e) => setEditingItemName(e.target.value)}
                  className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-accent-emerald"
                  placeholder="e.g. main-content"
                />
              </div>

              {/* Item Text Content */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Display Label Content</label>
                <input
                  type="text"
                  value={editingItemContent}
                  onChange={(e) => setEditingItemContent(e.target.value)}
                  className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-accent-emerald"
                  placeholder="e.g. Main Content Area"
                />
              </div>

              {/* Responsive custom spans */}
              {responsive && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-zinc-400">Tablet Span (Cols)</label>
                    <select
                      value={editingItemTabletSpan}
                      onChange={(e) => setEditingItemTabletSpan(parseInt(e.target.value))}
                      className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-accent-emerald"
                    >
                      <option value={0}>Auto (Flow)</option>
                      {Array.from({ length: tabletColumns }, (_, i) => i + 1).map((n) => (
                        <option key={`edit-t-col-${n}`} value={n}>{n} span</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-zinc-400">Mobile Span (Cols)</label>
                    <select
                      value={editingItemMobileSpan}
                      onChange={(e) => setEditingItemMobileSpan(parseInt(e.target.value))}
                      className="bg-canvas border border-border-hairline text-zinc-150 font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-accent-emerald"
                    >
                      <option value={0}>Auto (Flow)</option>
                      {Array.from({ length: mobileColumns }, (_, i) => i + 1).map((n) => (
                        <option key={`edit-m-col-${n}`} value={n}>{n} span</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Color Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Color Tag Palette</label>
                <div className="flex flex-wrap gap-2">
                  {BEAUTIFUL_COLORS.map((c) => (
                    <button
                      key={`color-${c}`}
                      onClick={() => setEditingItemColor(c)}
                      className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                        editingItemColor === c ? 'scale-110 border-zinc-200' : 'border-zinc-800'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border-hairline pt-4 mt-2">
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline text-zinc-400 hover:text-zinc-300 font-mono text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedItem}
                className="px-4 py-2 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
