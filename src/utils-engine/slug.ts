export interface SlugifyOptions {
  separator: string; // e.g. '-', '_', '.', '/', '', ' '
  lowercase: boolean;
  uppercase: boolean;
  stripSpecialCharacters: boolean;
  stripStopWords: boolean;
  transliterateAccents: boolean;
  germanUmlauts: boolean;
  cyrillicToLatin: boolean;
  maxLength: number;
  preserveWholeWords: boolean;
  customReplacements: { pattern: string; replacement: string }[];
  suffixType: 'none' | 'nanoid' | 'counter' | 'timestamp' | 'custom';
  suffixLength?: number;
  counterValue?: number;
  customSuffix?: string;
}

export const DEFAULT_SLUGIFY_OPTIONS: SlugifyOptions = {
  separator: '-',
  lowercase: true,
  uppercase: false,
  stripSpecialCharacters: true,
  stripStopWords: false,
  transliterateAccents: true,
  germanUmlauts: true,
  cyrillicToLatin: true,
  maxLength: 100,
  preserveWholeWords: true,
  customReplacements: [],
  suffixType: 'none',
  suffixLength: 5,
  counterValue: 1,
  customSuffix: '',
};

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
  'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
  'Я': 'Ya'
};

const GERMAN_MAP: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
  'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue'
};

const ENGLISH_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'are', 'was', 'were', 'by', 'as', 'if', 'this', 'that', 'these', 'those'
]);

const SYMBOL_MAP: Record<string, string> = {
  '&': ' and ',
  '@': ' at ',
  '$': ' dollar ',
  '%': ' percent ',
  '+': ' plus ',
  '=': ' equals ',
  '#': ' hash ',
  '*': ' star ',
  '/': ' slash ',
  '\\': ' backslash '
};

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function slugify(text: string, options: Partial<SlugifyOptions> = {}): string {
  const opts: SlugifyOptions = { ...DEFAULT_SLUGIFY_OPTIONS, ...options };
  
  // Resolve suffix first to see if one is enabled
  let suffix = '';
  if (opts.suffixType !== 'none') {
    if (opts.suffixType === 'nanoid') {
      suffix = opts.customSuffix || generateRandomString(opts.suffixLength || 5);
    } else if (opts.suffixType === 'custom') {
      suffix = opts.customSuffix || '';
    } else if (opts.suffixType === 'counter') {
      suffix = String(opts.counterValue !== undefined ? opts.counterValue : 1);
    } else if (opts.suffixType === 'timestamp') {
      suffix = String(Math.floor(Date.now() / 1000));
    }
  }

  if (!text) {
    return suffix; // Return just the suffix if the raw text is empty and a suffix is selected
  }

  let result = text;

  // 1. Custom Replacements
  if (opts.customReplacements && opts.customReplacements.length > 0) {
    for (const rule of opts.customReplacements) {
      if (rule.pattern) {
        // Escape special regex characters in the pattern
        const escapedPattern = rule.pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedPattern, 'g');
        result = result.replace(regex, rule.replacement || '');
      }
    }
  }

  // 2. German Umlauts mapping
  if (opts.germanUmlauts) {
    let temp = '';
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      temp += GERMAN_MAP[char] !== undefined ? GERMAN_MAP[char] : char;
    }
    result = temp;
  }

  // 3. Cyrillic to Latin mapping
  if (opts.cyrillicToLatin) {
    let temp = '';
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      temp += CYRILLIC_MAP[char] !== undefined ? CYRILLIC_MAP[char] : char;
    }
    result = temp;
  }

  // 4. Accent/Diacritics transliteration
  if (opts.transliterateAccents) {
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // 5. Expand basic symbols
  let symbolTemp = '';
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    symbolTemp += SYMBOL_MAP[char] !== undefined ? SYMBOL_MAP[char] : char;
  }
  result = symbolTemp;

  // 6. Casing conversion
  if (opts.lowercase) {
    result = result.toLowerCase();
  } else if (opts.uppercase) {
    result = result.toUpperCase();
  }

  // 7. Remove stop words
  if (opts.stripStopWords) {
    // Split text temporarily by spaces/separators, check English stop words, and filter them out
    const words = result.split(/[^a-zA-Z0-9А-Яа-яЁё]+/);
    const filtered = words.filter(word => {
      const lowerWord = word.toLowerCase();
      return !ENGLISH_STOP_WORDS.has(lowerWord);
    });
    result = filtered.join(' ');
  }

  // 8. Strip Special Characters (keep alphanumeric, whitespaces, and separator)
  if (opts.stripSpecialCharacters) {
    // Matches alphanumeric or whitespace. We also temporarily keep hyphen/underscore/dot/slash/space if they are target separators.
    const escapedSeparator = opts.separator.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexStr = `[^a-zA-Z0-9\\s${escapedSeparator}]`;
    const regex = new RegExp(regexStr, 'g');
    result = result.replace(regex, '');
  }

  // 9. Replace whitespace runs and separator runs with a single separator
  const separatorChar = opts.separator;
  if (separatorChar) {
    const escapedSeparator = separatorChar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Replace multiple spaces/separators with one separator
    const spaceRegex = new RegExp(`[\\s${escapedSeparator}]+`, 'g');
    result = result.replace(spaceRegex, separatorChar);
  } else {
    // If separator is empty string, remove spaces altogether
    result = result.replace(/\s+/g, '');
  }

  // 10. Trim leading and trailing separators
  if (separatorChar) {
    const escapedSeparator = separatorChar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const trimRegex = new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g');
    result = result.replace(trimRegex, '');
  }

  // 11. Length Truncation
  if (opts.maxLength > 0 && result.length > opts.maxLength) {
    let truncated = result.slice(0, opts.maxLength);
    if (opts.preserveWholeWords && separatorChar) {
      // Find the last separator before the limit and slice there
      const lastSeparator = truncated.lastIndexOf(separatorChar);
      if (lastSeparator > 0) {
        truncated = truncated.slice(0, lastSeparator);
      }
    }
    result = truncated;

    // Re-trim in case truncation left a trailing separator
    if (separatorChar) {
      const escapedSeparator = separatorChar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const trimRegex = new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g');
      result = result.replace(trimRegex, '');
    }
  }

  // 12. Append unique suffixes (no leading separator if result is empty)
  if (suffix) {
    if (result) {
      if (separatorChar) {
        result = `${result}${separatorChar}${suffix}`;
      } else {
        result = `${result}${suffix}`;
      }
    } else {
      result = suffix;
    }
  }

  return result;
}

export function bulkSlugify(lines: string[], options: Partial<SlugifyOptions> = {}): string[] {
  let counter = options.counterValue !== undefined ? options.counterValue : 1;
  return lines.map(line => {
    const res = slugify(line, { ...options, counterValue: counter });
    if (options.suffixType === 'counter') {
      counter++;
    }
    return res;
  });
}
