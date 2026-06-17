import {
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
  toDotCase,
  toPathCase,
  toTitleCase,
  toSentenceCase,
  toAlternatingCase,
  toInverseCase
} from './text';

export type SortType = 'alphabetical' | 'natural' | 'length' | 'reverse' | 'shuffle';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  type: SortType;
  direction: SortDirection;
  caseSensitive: boolean;
}

export type DedupePolicy = 'keep-first' | 'keep-last' | 'remove-all';

export interface DedupeOptions {
  policy: DedupePolicy;
  caseSensitive: boolean;
}

export interface LineNumberOptions {
  enabled: boolean;
  format: '1.' | '01.' | '001.' | '[1]' | 'Line 1:' | '1:';
  startFrom: number;
}

export interface PrefixSuffixOptions {
  prefix: string;
  suffix: string;
  lineNumbers?: LineNumberOptions;
}

export type FilterType = 'none' | 'keep-containing' | 'remove-containing' | 'keep-regex' | 'remove-regex' | 'keep-length' | 'remove-length';

export interface FilterOptions {
  removeEmpty: boolean;
  trimBeforeEmptyCheck: boolean;
  filterType: FilterType;
  filterValue: string; // substring or regex string
  minLength?: number;
  maxLength?: number;
}

export type TrimType = 'trim-both' | 'trim-start' | 'trim-end' | 'collapse-spaces' | 'none';

export type CleanType = 'none' | 'alphanumeric-only' | 'strip-special' | 'strip-numbers' | 'strip-html-markdown';

export interface SplitJoinOptions {
  splitBy: 'newline' | 'comma' | 'tab' | 'pipe' | 'space' | 'custom';
  customSplitVal: string;
  joinBy: 'newline' | 'comma' | 'tab' | 'pipe' | 'space' | 'custom' | 'json';
  customJoinVal: string;
}

export interface DuplicateMetric {
  item: string;
  count: number;
}

export interface ListStatistics {
  totalItems: number;
  uniqueCount: number;
  duplicateCount: number;
  emptyCount: number;
  charCount: number;
  wordCount: number;
  averageLength: number;
}

/**
 * Split a raw input string into an array of items based on the configuration.
 */
export const splitRawText = (text: string, options: SplitJoinOptions): string[] => {
  if (!text) return [];

  let separator: string | RegExp = '\n';
  switch (options.splitBy) {
    case 'newline':
      separator = /\r?\n/;
      break;
    case 'comma':
      separator = ',';
      break;
    case 'tab':
      separator = '\t';
      break;
    case 'pipe':
      separator = '|';
      break;
    case 'space':
      separator = /\s+/;
      break;
    case 'custom':
      if (options.customSplitVal) {
        // Safe check: if it's a regex format (e.g. /.../g), parse it safely or treat as string
        if (options.customSplitVal.startsWith('/') && options.customSplitVal.endsWith('/')) {
          try {
            separator = new RegExp(options.customSplitVal.slice(1, -1));
          } catch {
            separator = options.customSplitVal;
          }
        } else {
          separator = options.customSplitVal;
        }
      } else {
        separator = '\n';
      }
      break;
  }

  return text.split(separator);
};

/**
 * Join an array of items into a final string based on the configuration.
 */
export const joinItems = (items: string[], options: SplitJoinOptions): string => {
  if (options.joinBy === 'json') {
    return JSON.stringify(items, null, 2);
  }

  let separator = '\n';
  switch (options.joinBy) {
    case 'newline':
      separator = '\n';
      break;
    case 'comma':
      separator = ', ';
      break;
    case 'tab':
      separator = '\t';
      break;
    case 'pipe':
      separator = ' | ';
      break;
    case 'space':
      separator = ' ';
      break;
    case 'custom':
      separator = options.customJoinVal !== undefined ? options.customJoinVal : '\n';
      break;
  }

  return items.join(separator);
};

/**
 * Compute detailed statistics of a list.
 */
export const calculateStatistics = (items: string[]): ListStatistics => {
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      uniqueCount: 0,
      duplicateCount: 0,
      emptyCount: 0,
      charCount: 0,
      wordCount: 0,
      averageLength: 0
    };
  }

  let emptyCount = 0;
  let charCount = 0;
  let wordCount = 0;
  let totalLength = 0;
  
  const counts = new Map<string, number>();

  items.forEach((item) => {
    totalLength += item.length;
    charCount += item.length;
    
    if (item.trim() === '') {
      emptyCount++;
    } else {
      const words = item.trim().split(/\s+/).filter(Boolean);
      wordCount += words.length;
    }

    counts.set(item, (counts.get(item) || 0) + 1);
  });

  let uniqueCount = 0;
  let duplicateCount = 0;

  counts.forEach((val) => {
    uniqueCount++;
    if (val > 1) {
      duplicateCount += (val - 1);
    }
  });

  return {
    totalItems,
    uniqueCount,
    duplicateCount,
    emptyCount,
    charCount,
    wordCount,
    averageLength: Math.round((totalLength / totalItems) * 10) / 10
  };
};

/**
 * Find and analyze duplicates in a list, sorted by frequency descending.
 */
export const getDuplicateMetrics = (items: string[], caseSensitive = true): DuplicateMetric[] => {
  const counts = new Map<string, number>();
  const originalRepresentation = new Map<string, string>(); // to map back to original casing

  items.forEach((item) => {
    const key = caseSensitive ? item : item.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!originalRepresentation.has(key) || (item !== key && caseSensitive)) {
      originalRepresentation.set(key, item);
    }
  });

  const duplicates: DuplicateMetric[] = [];
  counts.forEach((count, key) => {
    if (count > 1) {
      duplicates.push({
        item: originalRepresentation.get(key) || key,
        count
      });
    }
  });

  return duplicates.sort((a, b) => b.count - a.count);
};

/**
 * Trim whitespace from each item.
 */
export const trimWhitespace = (items: string[], type: TrimType): string[] => {
  if (type === 'none') return items;
  return items.map((item) => {
    switch (type) {
      case 'trim-both':
        return item.trim();
      case 'trim-start':
        return item.trimStart();
      case 'trim-end':
        return item.trimEnd();
      case 'collapse-spaces':
        return item.trim().replace(/\s+/g, ' ');
      default:
        return item;
    }
  });
};

/**
 * Filter list items based on configurations.
 */
export const filterList = (items: string[], options: FilterOptions): string[] => {
  return items.filter((item) => {
    // 1. Empty lines check
    if (options.removeEmpty) {
      const checkVal = options.trimBeforeEmptyCheck ? item.trim() : item;
      if (checkVal === '') return false;
    }

    // 2. Text filters
    if (options.filterType === 'none') return true;

    if (options.filterType === 'keep-containing' && options.filterValue) {
      return item.includes(options.filterValue);
    }

    if (options.filterType === 'remove-containing' && options.filterValue) {
      return !item.includes(options.filterValue);
    }

    if (options.filterType === 'keep-regex' && options.filterValue) {
      try {
        const regex = new RegExp(options.filterValue);
        return regex.test(item);
      } catch {
        return true; // invalid regex acts as pass-through
      }
    }

    if (options.filterType === 'remove-regex' && options.filterValue) {
      try {
        const regex = new RegExp(options.filterValue);
        return !regex.test(item);
      } catch {
        return true;
      }
    }

    if (options.filterType === 'keep-length') {
      const len = item.length;
      if (options.minLength !== undefined && len < options.minLength) return false;
      if (options.maxLength !== undefined && len > options.maxLength) return false;
      return true;
    }

    if (options.filterType === 'remove-length') {
      const len = item.length;
      if (options.minLength !== undefined && len >= options.minLength && (options.maxLength === undefined || len <= options.maxLength)) {
        return false;
      }
      return true;
    }

    return true;
  });
};

/**
 * Remove duplicates from the list.
 */
export const deduplicateList = (items: string[], options: DedupeOptions): string[] => {
  const seen = new Set<string>();
  const firstSeenIndex = new Map<string, number>();
  const lastSeenIndex = new Map<string, number>();
  const counts = new Map<string, number>();

  items.forEach((item, index) => {
    const key = options.caseSensitive ? item : item.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!firstSeenIndex.has(key)) {
      firstSeenIndex.set(key, index);
    }
    lastSeenIndex.set(key, index);
  });

  if (options.policy === 'remove-all') {
    // Keep only elements that occur exactly once
    return items.filter((item) => {
      const key = options.caseSensitive ? item : item.toLowerCase();
      return (counts.get(key) || 0) === 1;
    });
  }

  if (options.policy === 'keep-first') {
    return items.filter((item, index) => {
      const key = options.caseSensitive ? item : item.toLowerCase();
      return firstSeenIndex.get(key) === index;
    });
  }

  if (options.policy === 'keep-last') {
    return items.filter((item, index) => {
      const key = options.caseSensitive ? item : item.toLowerCase();
      return lastSeenIndex.get(key) === index;
    });
  }

  return items;
};

/**
 * Sort the items in the list.
 */
export const sortList = (items: string[], options: SortOptions): string[] => {
  const working = [...items];

  if (options.type === 'reverse') {
    return working.reverse();
  }

  if (options.type === 'shuffle') {
    for (let i = working.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [working[i], working[j]] = [working[j], working[i]];
    }
    return working;
  }

  working.sort((a, b) => {
    let valA = a;
    let valB = b;

    if (!options.caseSensitive) {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (options.type === 'length') {
      if (valA.length !== valB.length) {
        return valA.length - valB.length;
      }
      // if same length, fall back to alphabetical
      return valA.localeCompare(valB, undefined, { numeric: true });
    }

    if (options.type === 'natural') {
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    }

    // Default alphabetical
    return valA.localeCompare(valB);
  });

  if (options.direction === 'desc') {
    working.reverse();
  }

  return working;
};

/**
 * Add prefix, suffix, and line numbers to items.
 */
export const addPrefixSuffix = (items: string[], options: PrefixSuffixOptions): string[] => {
  const { prefix, suffix, lineNumbers } = options;
  const length = items.length;

  return items.map((item, index) => {
    let result = item;
    
    // Add prefix/suffix
    if (prefix) result = prefix + result;
    if (suffix) result = result + suffix;

    // Add line numbers if enabled
    if (lineNumbers && lineNumbers.enabled) {
      const num = lineNumbers.startFrom + index;
      let numStr = num.toString();

      if (lineNumbers.format === '01.' && num < 100) {
        numStr = num.toString().padStart(2, '0');
      } else if (lineNumbers.format === '001.' && num < 1000) {
        numStr = num.toString().padStart(3, '0');
      }

      let numberPrefix = '';
      switch (lineNumbers.format) {
        case '1.':
        case '01.':
        case '001.':
          numberPrefix = `${numStr}. `;
          break;
        case '[1]':
          numberPrefix = `[${numStr}] `;
          break;
        case 'Line 1:':
          numberPrefix = `Line ${numStr}: `;
          break;
        case '1:':
          numberPrefix = `${numStr}: `;
          break;
        default:
          numberPrefix = `${numStr} `;
          break;
      }

      result = numberPrefix + result;
    }

    return result;
  });
};

/**
 * Clean text within items.
 */
export const cleanList = (items: string[], type: CleanType): string[] => {
  if (type === 'none') return items;
  return items.map((item) => {
    switch (type) {
      case 'alphanumeric-only':
        return item.replace(/[^a-zA-Z0-9\s]/g, '');
      case 'strip-special':
        return item.replace(/[^\x20-\x7E]/g, ''); // Keep standard printable ASCII
      case 'strip-numbers':
        return item.replace(/[0-9]/g, '');
      case 'strip-html-markdown':
        return item
          .replace(/<[^>]*>/g, '') // strip HTML tags
          .replace(/[*_~`#\-+>[\]()]/g, ''); // strip basic Markdown symbols
      default:
        return item;
    }
  });
};

/**
 * Convert the case of all items in the list.
 */
export const changeCaseOfList = (items: string[], caseType: string): string[] => {
  let converter: (s: string) => string = (s) => s;
  
  switch (caseType) {
    case 'upper':
      converter = (s) => s.toUpperCase();
      break;
    case 'lower':
      converter = (s) => s.toLowerCase();
      break;
    case 'camel':
      converter = toCamelCase;
      break;
    case 'pascal':
      converter = toPascalCase;
      break;
    case 'snake':
      converter = toSnakeCase;
      break;
    case 'kebab':
      converter = toKebabCase;
      break;
    case 'constant':
      converter = toConstantCase;
      break;
    case 'dot':
      converter = toDotCase;
      break;
    case 'path':
      converter = toPathCase;
      break;
    case 'title':
      converter = toTitleCase;
      break;
    case 'sentence':
      converter = toSentenceCase;
      break;
    case 'alternating':
      converter = toAlternatingCase;
      break;
    case 'inverse':
      converter = toInverseCase;
      break;
  }

  return items.map(converter);
};
