export interface DiffOptions {
  caseInsensitive?: boolean;
  ignoreWhitespace?: boolean;
  ignoreEmptyLines?: boolean;
}

export interface DiffWord {
  type: 'added' | 'removed' | 'common';
  value: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'common' | 'modified';
  value: string;
  oldValue?: string;
  newValue?: string;
  oldLineNum?: number;
  newLineNum?: number;
  inlineDiffs?: DiffWord[];
}

interface PathNode {
  x: number;
  y: number;
  prev: PathNode | null;
}

function normalizeLine(line: string, options: DiffOptions): string {
  let val = line;
  if (options.caseInsensitive) {
    val = val.toLowerCase();
  }
  if (options.ignoreWhitespace) {
    val = val.trim().replace(/\s+/g, ' ');
  }
  return val;
}

function tokenizeLineToWords(line: string): string[] {
  // Split by word boundaries, spaces, and punctuation tokens
  return line.split(/([a-zA-Z0-9_]+|[^a-zA-Z0-9_\s]|\s+)/).filter(Boolean);
}

function myers(a: number[], b: number[]): PathNode {
  const N = a.length;
  const M = b.length;
  const maxD = 1000; // Cap search space for complex diffs to avoid UI freeze

  const V: Record<number, number> = {};
  const paths: Record<number, PathNode> = {};

  V[1] = 0;
  paths[1] = { x: 0, y: -1, prev: null };

  for (let d = 0; d <= N + M; d++) {
    if (d > maxD) {
      return fallbackDiff(a, b);
    }

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      let prevNode: PathNode | null = null;

      if (k === -d || (k !== d && (V[k - 1] ?? -1) < (V[k + 1] ?? -1))) {
        x = V[k + 1] ?? 0;
        prevNode = paths[k + 1] ?? null;
      } else {
        x = (V[k - 1] ?? 0) + 1;
        prevNode = paths[k - 1] ?? null;
      }

      let y = x - k;
      let node: PathNode = { x, y, prev: prevNode };

      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
        node = { x, y, prev: node };
      }

      V[k] = x;
      paths[k] = node;

      if (x >= N && y >= M) {
        return node;
      }
    }
  }

  return { x: N, y: M, prev: null };
}

function fallbackDiff(a: number[], b: number[]): PathNode {
  const N = a.length;
  const M = b.length;
  let x = 0;
  let y = 0;
  let root: PathNode = { x: 0, y: 0, prev: null };
  let curr = root;

  while (x < N || y < M) {
    if (x < N && y < M && a[x] === b[y]) {
      curr = { x: x + 1, y: y + 1, prev: curr };
      x++;
      y++;
    } else if (N - x > M - y) {
      curr = { x: x + 1, y, prev: curr };
      x++;
    } else {
      curr = { x, y: y + 1, prev: curr };
      y++;
    }
  }
  return curr;
}

function myersWords(a: string[], b: string[]): PathNode {
  const N = a.length;
  const M = b.length;

  const V: Record<number, number> = {};
  const paths: Record<number, PathNode> = {};

  V[1] = 0;
  paths[1] = { x: 0, y: -1, prev: null };

  for (let d = 0; d <= N + M; d++) {
    if (d > 300) {
      return fallbackWords(a, b);
    }

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      let prevNode: PathNode | null = null;

      if (k === -d || (k !== d && (V[k - 1] ?? -1) < (V[k + 1] ?? -1))) {
        x = V[k + 1] ?? 0;
        prevNode = paths[k + 1] ?? null;
      } else {
        x = (V[k - 1] ?? 0) + 1;
        prevNode = paths[k - 1] ?? null;
      }

      let y = x - k;
      let node: PathNode = { x, y, prev: prevNode };

      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
        node = { x, y, prev: node };
      }

      V[k] = x;
      paths[k] = node;

      if (x >= N && y >= M) {
        return node;
      }
    }
  }

  return { x: N, y: M, prev: null };
}

function fallbackWords(a: string[], b: string[]): PathNode {
  const N = a.length;
  const M = b.length;
  let x = 0;
  let y = 0;
  let root: PathNode = { x: 0, y: 0, prev: null };
  let curr = root;

  while (x < N || y < M) {
    if (x < N && y < M && a[x] === b[y]) {
      curr = { x: x + 1, y: y + 1, prev: curr };
      x++;
      y++;
    } else if (N - x > M - y) {
      curr = { x: x + 1, y, prev: curr };
      x++;
    } else {
      curr = { x, y: y + 1, prev: curr };
      y++;
    }
  }
  return curr;
}

function buildWordDiff(endNode: PathNode, a: string[], b: string[]): DiffWord[] {
  const path: PathNode[] = [];
  let curr: PathNode | null = endNode;
  while (curr !== null) {
    path.push(curr);
    curr = curr.prev;
  }
  path.reverse();

  const diffWords: DiffWord[] = [];
  const cleanPath = path.filter(node => node.x >= 0 && node.y >= 0);

  for (let i = 0; i < cleanPath.length - 1; i++) {
    const p1 = cleanPath[i];
    const p2 = cleanPath[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 1 && dy === 1) {
      diffWords.push({
        type: 'common',
        value: b[p2.y - 1],
      });
    } else if (dx === 1 && dy === 0) {
      diffWords.push({
        type: 'removed',
        value: a[p2.x - 1],
      });
    } else if (dx === 0 && dy === 1) {
      diffWords.push({
        type: 'added',
        value: b[p2.y - 1],
      });
    }
  }

  return diffWords;
}

export function diffWords(oldLine: string, newLine: string): DiffWord[] {
  const a = tokenizeLineToWords(oldLine);
  const b = tokenizeLineToWords(newLine);

  if (oldLine === newLine) {
    return a.map(val => ({ type: 'common', value: val }));
  }

  const path = myersWords(a, b);
  return buildWordDiff(path, a, b);
}

function postProcessDiff(lines: DiffLine[]): DiffLine[] {
  const result: DiffLine[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].type === 'removed') {
      const removedBlock: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'removed') {
        removedBlock.push(lines[i]);
        i++;
      }

      const addedBlock: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'added') {
        addedBlock.push(lines[i]);
        i++;
      }

      if (addedBlock.length > 0) {
        const minLen = Math.min(removedBlock.length, addedBlock.length);

        for (let j = 0; j < minLen; j++) {
          const rem = removedBlock[j];
          const add = addedBlock[j];
          const inline = diffWords(rem.value, add.value);

          result.push({
            type: 'modified',
            value: rem.value,
            oldValue: rem.value,
            newValue: add.value,
            oldLineNum: rem.oldLineNum,
            newLineNum: add.newLineNum,
            inlineDiffs: inline,
          });
        }

        if (removedBlock.length > minLen) {
          for (let j = minLen; j < removedBlock.length; j++) {
            result.push(removedBlock[j]);
          }
        }

        if (addedBlock.length > minLen) {
          for (let j = minLen; j < addedBlock.length; j++) {
            result.push(addedBlock[j]);
          }
        }
      } else {
        result.push(...removedBlock);
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result;
}

function buildLineDiff(
  endNode: PathNode,
  oldLines: string[],
  newLines: string[],
  a: number[],
  b: number[]
): DiffLine[] {
  const path: PathNode[] = [];
  let curr: PathNode | null = endNode;
  while (curr !== null) {
    path.push(curr);
    curr = curr.prev;
  }
  path.reverse();

  const diffLines: DiffLine[] = [];
  const cleanPath = path.filter(node => node.x >= 0 && node.y >= 0);

  for (let i = 0; i < cleanPath.length - 1; i++) {
    const p1 = cleanPath[i];
    const p2 = cleanPath[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 1 && dy === 1) {
      diffLines.push({
        type: 'common',
        value: newLines[p2.y - 1],
        oldLineNum: p2.x,
        newLineNum: p2.y,
      });
    } else if (dx === 1 && dy === 0) {
      diffLines.push({
        type: 'removed',
        value: oldLines[p2.x - 1],
        oldLineNum: p2.x,
      });
    } else if (dx === 0 && dy === 1) {
      diffLines.push({
        type: 'added',
        value: newLines[p2.y - 1],
        newLineNum: p2.y,
      });
    }
  }

  return postProcessDiff(diffLines);
}

export function diffLines(
  oldText: string,
  newText: string,
  options: DiffOptions = {}
): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  if (oldText === newText) {
    return oldLines.map((line, idx) => ({
      type: 'common',
      value: line,
      oldLineNum: idx + 1,
      newLineNum: idx + 1,
    }));
  }

  const lineToId = new Map<string, number>();
  let nextId = 1;

  const getId = (line: string) => {
    const norm = normalizeLine(line, options);
    if (options.ignoreEmptyLines && norm === '') {
      return 0;
    }
    let id = lineToId.get(norm);
    if (id === undefined) {
      id = nextId++;
      lineToId.set(norm, id);
    }
    return id;
  };

  const a = oldLines.map(getId);
  const b = newLines.map(getId);

  const path = myers(a, b);
  return buildLineDiff(path, oldLines, newLines, a, b);
}

export function sortJsonKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = sortJsonKeys(obj[key]);
  }
  return result;
}

export function diffJson(
  oldJsonStr: string,
  newJsonStr: string,
  options: DiffOptions = {},
  semanticJson: boolean = true
): { diffLines: DiffLine[]; error?: string } {
  try {
    let oldObj = JSON.parse(oldJsonStr);
    let newObj = JSON.parse(newJsonStr);

    if (semanticJson) {
      oldObj = sortJsonKeys(oldObj);
      newObj = sortJsonKeys(newObj);
    }

    const formattedOld = JSON.stringify(oldObj, null, 2);
    const formattedNew = JSON.stringify(newObj, null, 2);

    return {
      diffLines: diffLines(formattedOld, formattedNew, options),
    };
  } catch (e: any) {
    return {
      diffLines: [],
      error: e.message || 'Invalid JSON input',
    };
  }
}

export function calculateSimilarity(diffLines: DiffLine[]): number {
  let common = 0;
  let total = 0;

  for (const line of diffLines) {
    if (line.type === 'common') {
      common += 2;
      total += 2;
    } else if (line.type === 'modified') {
      let inlineCommon = 0;
      let inlineTotal = 0;
      if (line.inlineDiffs) {
        for (const w of line.inlineDiffs) {
          if (w.type === 'common') {
            inlineCommon += 2;
            inlineTotal += 2;
          } else {
            inlineTotal++;
          }
        }
      }
      const inlineRatio = inlineTotal > 0 ? inlineCommon / inlineTotal : 0;
      common += inlineRatio * 2;
      total += 2;
    } else {
      total++;
    }
  }

  if (total === 0) return 100;
  return Math.round((common / total) * 100);
}
