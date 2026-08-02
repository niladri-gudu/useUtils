export interface CssToken {
  type: 'open' | 'close' | 'semi' | 'colon' | 'string' | 'comment' | 'text' | 'at-close';
  value: string;
}

const isWhitespace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

function tokenize(css: string): CssToken[] {
  const tokens: CssToken[] = [];
  let i = 0;
  const n = css.length;

  while (i < n) {
    const c = css[i];

    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) {
        tokens.push({ type: 'comment', value: css.slice(i) });
        break;
      }
      tokens.push({ type: 'comment', value: css.slice(i, end + 2) });
      i = end + 2;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      let str = c;
      let closed = false;
      while (j < n) {
        str += css[j];
        if (css[j] === '\\') {
          if (j + 1 < n) { str += css[j + 1]; j += 2; continue; }
          break;
        }
        if (css[j] === c) { closed = true; j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: str });
      i = j;
      continue;
    }

    if (c === '{') { tokens.push({ type: 'open', value: '{' }); i++; continue; }
    if (c === '}') { tokens.push({ type: 'close', value: '}' }); i++; continue; }
    if (c === ';') { tokens.push({ type: 'semi', value: ';' }); i++; continue; }
    if (c === ':') { tokens.push({ type: 'colon', value: ':' }); i++; continue; }

    let j = i;
    let text = '';
    while (j < n) {
      const cj = css[j];
      if (cj === '{' || cj === '}' || cj === ';' || cj === ':' ||
          (cj === '/' && css[j + 1] === '*') ||
          cj === '"' || cj === "'") {
        break;
      }
      text += cj;
      j++;
    }
    if (text) {
      tokens.push({ type: 'text', value: text });
      i = j;
      continue;
    }

    i++;
  }

  return tokens;
}

export function minifyCss(css: string): string {
  const tokens = tokenize(css);
  let out = '';
  let prev: CssToken | null = null;

  for (const t of tokens) {
    if (t.type === 'comment') continue;

    if (t.type === 'string' || t.type === 'text') {
      let v = t.value;
      if (t.type === 'text') {
        v = v.replace(/[\s]+/g, ' ');
        if (prev && (prev.type === 'open' || prev.type === 'semi')) v = v.trimStart();
      }
      if (prev && (prev.type === 'open' || prev.type === 'semi' || prev.type === 'close')) v = v.trimStart();
      out += v;
      prev = { ...t, value: v };
      continue;
    }

    if (t.type === 'open') {
      out = out.replace(/\s+$/, '');
      out += '{';
      prev = t;
      continue;
    }
    if (t.type === 'close') {
      out = out.replace(/;?\s*$/, '');
      out += '}';
      prev = t;
      continue;
    }
    if (t.type === 'semi') {
      out = out.replace(/\s+$/, '');
      out += ';';
      prev = t;
      continue;
    }
    if (t.type === 'colon') {
      out = out.replace(/\s+$/, '');
      out += ':';
      if (prev && prev.type === 'text') {
        // avoid space so `: hover` never happens; values are trimmed later
      }
      prev = t;
      continue;
    }
  }

  return out.trim();
}

export function formatCss(css: string, indentSize = 2): string {
  const tokens = tokenize(css);
  const lines: string[] = [];
  let depth = 0;
  const indent = () => ' '.repeat(depth * indentSize);
  let line = '';
  let inBlock = false;

  const pushLine = (addIndent = true) => {
    if (line.trim() === '') return;
    lines.push((addIndent ? indent() : '') + line.trim());
    line = '';
  };

  for (const t of tokens) {
    if (t.type === 'comment') {
      pushLine();
      if (t.value.includes('\n')) {
        for (const cLine of t.value.split('\n')) lines.push(indent() + cLine.trim());
      } else {
        lines.push(indent() + t.value);
      }
      continue;
    }

    if (t.type === 'string') {
      line += t.value;
      continue;
    }

    if (t.type === 'text') {
      const v = t.value.trim();
      if (v) {
        if (!line) line = v;
        else if (/[)}\]]$/.test(line) || /^[)}\].,+>~*]/.test(v)) line += v;
        else line += ' ' + v;
      }
      continue;
    }

    if (t.type === 'colon') {
      line = line.replace(/\s+$/, '');
      line += ': ';
      continue;
    }

    if (t.type === 'semi') {
      line = line.replace(/\s+$/, '');
      line += ';';
      pushLine();
      continue;
    }

    if (t.type === 'open') {
      line = line.replace(/\s+$/, '');
      line += ' {';
      pushLine();
      depth++;
      inBlock = true;
      continue;
    }

    if (t.type === 'close') {
      if (inBlock) {
        const trimmed = line.replace(/\s+$/, '');
        if (trimmed) {
          lines.push(indent() + trimmed);
          line = '';
        }
      }
      depth = Math.max(0, depth - 1);
      if (inBlock) {
        lines.push(indent() + '}');
        inBlock = false;
      } else {
        line += '}';
      }
      continue;
    }
  }

  if (line.trim()) pushLine();

  return lines.join('\n');
}
