export interface DiffNode {
  type: 'added' | 'removed' | 'common';
  value: string;
}

export interface CaseOption {
  id: string;
  name: string;
  example: string;
  converter: (s: string) => string;
  isProgramming: boolean;
}

export const getTokens = (str: string): string[] => {
  const withSpaces = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  return withSpaces.split(/[^a-zA-Z0-9]+/).filter(Boolean);
};

export const toCamelCase = (str: string): string => {
  const tokens = getTokens(str);
  if (tokens.length === 0) return '';
  return tokens
    .map((token, index) => {
      const lower = token.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

export const toPascalCase = (str: string): string => {
  const tokens = getTokens(str);
  if (tokens.length === 0) return '';
  return tokens
    .map((token) => {
      const lower = token.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

export const toSnakeCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('_');
};

export const toKebabCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('-');
};

export const toConstantCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toUpperCase()).join('_');
};

export const toDotCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('.');
};

export const toPathCase = (str: string): string => {
  const tokens = getTokens(str);
  return tokens.map((t) => t.toLowerCase()).join('/');
};

export const toTitleCase = (str: string): string => {
  const minorWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v\.?|via|vs\.?|with)$/i;
  return str.replace(/([^\s\-_.\/\\,;:!?()]+)/g, (word, index, fullText) => {
    const isFirst = index === 0;
    const isLast = index + word.length === fullText.length;
    if (!isFirst && !isLast && minorWords.test(word)) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

export const toSentenceCase = (str: string): string => {
  if (!str) return '';
  const lower = str.toLowerCase();
  let result = lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });
  result = result.replace(/\bi\b/g, 'I');
  return result;
};

export const toAlternatingCase = (str: string): string => {
  let uppercase = true;
  return str
    .split('')
    .map((c) => {
      if (/[a-zA-Z]/.test(c)) {
        const res = uppercase ? c.toUpperCase() : c.toLowerCase();
        uppercase = !uppercase;
        return res;
      }
      return c;
    })
    .join('');
};

export const toInverseCase = (str: string): string => {
  return str
    .split('')
    .map((c) => {
      if (c === c.toUpperCase()) return c.toLowerCase();
      return c.toUpperCase();
    })
    .join('');
};

export const detectCase = (str: string): string => {
  const trimmed = str.trim();
  if (!trimmed) return 'None';

  const hasSpace = trimmed.includes(' ');
  const hasUnderscore = trimmed.includes('_');
  const hasDash = trimmed.includes('-');
  const hasDot = trimmed.includes('.');
  const hasSlash = trimmed.includes('/');

  if (hasSpace) {
    if (trimmed === trimmed.toUpperCase()) return 'UPPERCASE';
    if (trimmed === trimmed.toLowerCase()) return 'lowercase';
    
    const words = trimmed.split(/\s+/);
    const isTitle = words.every((w) => {
      if (w.length === 0) return true;
      const first = w.charAt(0);
      const isUpper = first === first.toUpperCase() && /[A-Z]/.test(first);
      const isMinor = /^(a|an|and|as|at|but|by|for|if|in|of|on|or|the|to|with)$/i.test(w);
      return isUpper || isMinor;
    });
    if (isTitle && words.some((w) => /[A-Z]/.test(w.charAt(0)))) return 'Title Case';

    const firstChar = trimmed.charAt(0);
    const startsWithUpper = firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar);
    const rest = trimmed.slice(1);
    const restMostlyLower = (rest.match(/[A-Z]/g) || []).length < (rest.match(/[a-z]/g) || []).length * 0.2;
    if (startsWithUpper && restMostlyLower) return 'Sentence case';

    return 'Mixed Space Text';
  }

  if (hasUnderscore) {
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return 'CONSTANT_CASE';
    if (trimmed === trimmed.toLowerCase()) return 'snake_case';
    return 'Mixed Underscore';
  }

  if (hasDash) {
    if (trimmed === trimmed.toLowerCase()) return 'kebab-case';
    return 'Mixed Dash';
  }

  if (hasDot) {
    if (trimmed === trimmed.toLowerCase()) return 'dot.case';
    return 'Mixed Dot';
  }

  if (hasSlash) {
    if (trimmed === trimmed.toLowerCase()) return 'path/case';
    return 'Mixed Path';
  }

  if (/^[a-z]+[A-Z0-9]/.test(trimmed)) {
    return 'camelCase';
  }
  if (/^[A-Z][a-z0-9]+[A-Z]/.test(trimmed)) {
    return 'PascalCase';
  }
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return 'UPPERCASE';
  }
  if (trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed)) {
    return 'lowercase';
  }

  return 'Plain Text / Identifier';
};

export const diffChars = (oldStr: string, newStr: string): DiffNode[] => {
  const n = oldStr.length;
  const m = newStr.length;
  
  if (n > 1200 || m > 1200) {
    return [
      { type: 'removed', value: oldStr },
      { type: 'added', value: newStr }
    ];
  }

  const dp: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldStr[i - 1] === newStr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n, j = m;
  const result: DiffNode[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
      result.unshift({ type: 'common', value: oldStr[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: newStr[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: oldStr[i - 1] });
      i--;
    }
  }

  return result;
};

export const CASE_OPTIONS: CaseOption[] = [
  { id: 'camel', name: 'camelCase', example: 'camelCase', converter: toCamelCase, isProgramming: true },
  { id: 'pascal', name: 'PascalCase', example: 'PascalCase', converter: toPascalCase, isProgramming: true },
  { id: 'snake', name: 'snake_case', example: 'snake_case', converter: toSnakeCase, isProgramming: true },
  { id: 'kebab', name: 'kebab-case', example: 'kebab-case', converter: toKebabCase, isProgramming: true },
  { id: 'constant', name: 'CONSTANT_CASE', example: 'CONSTANT_CASE', converter: toConstantCase, isProgramming: true },
  { id: 'dot', name: 'dot.case', example: 'dot.case', converter: toDotCase, isProgramming: true },
  { id: 'path', name: 'path/case', example: 'path/case', converter: toPathCase, isProgramming: true },
  { id: 'upper', name: 'UPPERCASE', example: 'UPPERCASE', converter: (s) => s.toUpperCase(), isProgramming: false },
  { id: 'lower', name: 'lowercase', example: 'lowercase', converter: (s) => s.toLowerCase(), isProgramming: false },
  { id: 'title', name: 'Title Case', example: 'Title Case', converter: toTitleCase, isProgramming: false },
  { id: 'sentence', name: 'Sentence case', example: 'Sentence case', converter: toSentenceCase, isProgramming: false },
  { id: 'alternating', name: 'aLtErNaTiNg CaSe', example: 'aLtErNaTiNg CaSe', converter: toAlternatingCase, isProgramming: false },
  { id: 'inverse', name: 'iNvErSe CaSe', example: 'iNvErSe CaSe', converter: toInverseCase, isProgramming: false },
];
