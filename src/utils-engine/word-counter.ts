/**
 * Core text utilities and analytical algorithms for the Word Counter & Text Analyzer.
 * Processed entirely locally on the client-side.
 */

// Common English stop words for frequency analysis filtering
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'from', 'into', 'about', 'than',
  'then', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'he',
  'him', 'his', 'she', 'her', 'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my', 'myself',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can',
  'could', 'may', 'might', 'must', 'so', 'just', 'no', 'not', 'only', 'very', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'own', 'same', 'too', 's', 't', 'd', 'm', 're', 've', 'll'
]);

/**
 * Counts characters in the given text.
 */
export const countCharacters = (text: string, includeSpaces: boolean = true): number => {
  if (includeSpaces) {
    return text.length;
  }
  return text.replace(/\s/g, '').length;
};

/**
 * Extracts clean words from the text, ignoring standalone symbols.
 * Handles contractions and hyphens correctly.
 */
export const getWords = (text: string): string[] => {
  if (!text.trim()) return [];
  // Matches words with letters, numbers, apostrophes, and internal hyphens
  const matches = text.match(/\b[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?(?:-[a-zA-Z0-9]+)?\b/g);
  return matches || [];
};

/**
 * Counts words in the text.
 */
export const countWords = (text: string): number => {
  return getWords(text).length;
};

/**
 * Counts sentences in the text using punctuation boundaries.
 * Correctly ignores common abbreviations (e.g. Mr., Dr., Jan.) to avoid false matches.
 */
export const countSentences = (text: string): number => {
  const clean = text.trim();
  if (!clean) return 0;

  // Split by sentence terminators followed by spaces or end of string
  const parts = clean.split(/[.!?]+(?:\s+|$)/);
  let count = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Check if the word before the split was an abbreviation
    const words = part.split(/\s+/);
    const lastWord = words[words.length - 1];
    const isAbbreviation = /^(mr|mrs|ms|dr|prof|sr|jr|vs|st|gen|col|lt|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|approx|appt|apt|avg|dept|est|min|max|misc|temp|w\/o)$/i.test(lastWord);

    if (isAbbreviation && i < parts.length - 1) {
      // Skip sentence count increment since this period belongs to an abbreviation
      continue;
    }
    count++;
  }

  return count > 0 ? count : 1;
};

/**
 * Counts paragraphs in the text (delimited by double newlines).
 */
export const countParagraphs = (text: string): number => {
  if (!text.trim()) return 0;
  return text
    .split(/\r?\n\s*\r?\n/)
    .filter((p) => p.trim().length > 0).length;
};

/**
 * Counts lines in the text.
 */
export const countLines = (text: string): number => {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
};

/**
 * Estimates the number of syllables in a single word using heuristics.
 */
export const countSyllables = (word: string): number => {
  word = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;

  // Heuristic adjustments: Remove trailing 'e' unless it ends with 'le'
  if (word.endsWith('e') && !word.endsWith('le')) {
    word = word.slice(0, -1);
  }

  // Count consecutive vowel groups
  const vowelMatches = word.match(/[aeiouy]+/g);
  let count = vowelMatches ? vowelMatches.length : 0;

  // Adjust for double-vowel splits/endings
  if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded')) {
    // Usually silent 'ed' unless preceded by t or d
    const precededByTOrD = word.slice(-3, -2) === 't' || word.slice(-3, -2) === 'd';
    if (!precededByTOrD && count > 1) count--;
  }

  return count > 0 ? count : 1;
};

/**
 * Calculates the Flesch Reading Ease score.
 * Formula: 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
 */
export const calculateFleschReadingEase = (
  words: number,
  sentences: number,
  syllables: number
): { score: number; label: string; schoolLevel: string; colorClass: string } => {
  if (words === 0 || sentences === 0) {
    return { score: 100, label: 'Very Easy', schoolLevel: '5th grade', colorClass: 'text-emerald-400' };
  }

  const score = Math.max(0, Math.min(100, 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)));
  const rounded = Math.round(score * 10) / 10;

  if (rounded >= 90) {
    return { score: rounded, label: 'Very Easy', schoolLevel: '5th grade level (Average 11-year-old)', colorClass: 'text-emerald-400' };
  } else if (rounded >= 80) {
    return { score: rounded, label: 'Easy', schoolLevel: '6th grade level (Conversational language)', colorClass: 'text-emerald-400/90' };
  } else if (rounded >= 70) {
    return { score: rounded, label: 'Fairly Easy', schoolLevel: '7th grade level', colorClass: 'text-emerald-400/80' };
  } else if (rounded >= 60) {
    return { score: rounded, label: 'Standard', schoolLevel: '8th & 9th grade level (Easy for 13-15 years)', colorClass: 'text-zinc-300' };
  } else if (rounded >= 50) {
    return { score: rounded, label: 'Fairly Difficult', schoolLevel: '10th to 12th grade level', colorClass: 'text-amber-400/80' };
  } else if (rounded >= 30) {
    return { score: rounded, label: 'Difficult', schoolLevel: 'College student level', colorClass: 'text-amber-500' };
  } else {
    return { score: rounded, label: 'Very Difficult', schoolLevel: 'College graduate level (Scientific/Legal)', colorClass: 'text-rose-500' };
  }
};

/**
 * Calculates the Automated Readability Index (ARI).
 * Formula: 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
 */
export const calculateARI = (
  charsNoSpaces: number,
  words: number,
  sentences: number
): { score: number; grade: string; age: string } => {
  if (words === 0 || sentences === 0) {
    return { score: 1, grade: 'Kindergarten', age: '5-6' };
  }

  const score = Math.max(1, 4.71 * (charsNoSpaces / words) + 0.5 * (words / sentences) - 21.43);
  const rounded = Math.round(score * 10) / 10;
  const gradeInt = Math.min(14, Math.max(1, Math.round(score)));

  const grades: Record<number, { grade: string; age: string }> = {
    1: { grade: 'Kindergarten', age: '5-6' },
    2: { grade: 'First Grade', age: '6-7' },
    3: { grade: 'Second Grade', age: '7-8' },
    4: { grade: 'Third Grade', age: '8-9' },
    5: { grade: 'Fourth Grade', age: '9-10' },
    6: { grade: 'Fifth Grade', age: '10-11' },
    7: { grade: 'Sixth Grade', age: '11-12' },
    8: { grade: 'Seventh Grade', age: '12-13' },
    9: { grade: 'Eighth Grade', age: '13-14' },
    10: { grade: 'Ninth Grade', age: '14-15' },
    11: { grade: 'Tenth Grade', age: '15-16' },
    12: { grade: 'Eleventh Grade', age: '16-17' },
    13: { grade: 'Twelfth Grade', age: '17-18' },
    14: { grade: 'College Level', age: '18-22' }
  };

  const info = grades[gradeInt] || { grade: 'Professional Level', age: '23+' };
  return { score: rounded, ...info };
};

/**
 * Calculates the Gunning Fog Index.
 * Formula: 0.4 * ((words / sentences) + 100 * (complexWords / words))
 * Where complex words are defined as words with 3 or more syllables.
 */
export const calculateGunningFog = (
  words: number,
  sentences: number,
  complexWords: number
): number => {
  if (words === 0 || sentences === 0) return 0;
  const score = 0.4 * ((words / sentences) + 100 * (complexWords / words));
  return Math.round(score * 10) / 10;
};

/**
 * Compiles a word density map.
 * Allows filtering out common English stop words.
 */
export const getWordDensity = (
  text: string,
  filterStopWords: boolean = false
): Array<{ word: string; count: number; percentage: number }> => {
  const words = getWords(text);
  if (words.length === 0) return [];

  const freq: Record<string, number> = {};
  let totalCount = 0;

  for (const w of words) {
    const norm = w.toLowerCase();
    if (filterStopWords && STOP_WORDS.has(norm)) {
      continue;
    }
    freq[norm] = (freq[norm] || 0) + 1;
    totalCount++;
  }

  const result = Object.entries(freq).map(([word, count]) => ({
    word,
    count,
    percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0
  }));

  // Sort by frequency (highest first) and alphabetically as fallback
  return result.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
};

/**
 * Regex extraction rules.
 */
export const extractPatterns = (
  text: string,
  patternType: 'emails' | 'urls' | 'ips' | 'numbers'
): string[] => {
  if (!text) return [];

  let regex: RegExp;
  switch (patternType) {
    case 'emails':
      regex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      break;
    case 'urls':
      regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
      break;
    case 'ips':
      regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
      break;
    case 'numbers':
      regex = /\b\d+(?:\.\d+)?\b/g;
      break;
    default:
      return [];
  }

  const matches = text.match(regex);
  if (!matches) return [];

  // Return unique matches
  return Array.from(new Set(matches));
};

/**
 * Multi-action text cleaners for one-click updates.
 */
export const cleanText = (
  text: string,
  action: 'trim' | 'double-spaces' | 'empty-lines' | 'duplicates' | 'html' | 'special'
): string => {
  switch (action) {
    case 'trim':
      return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .join('\n');
    case 'double-spaces':
      return text.replace(/[ \t]+/g, ' ');
    case 'empty-lines':
      return text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .join('\n');
    case 'duplicates': {
      const lines = text.split(/\r?\n/);
      const seen = new Set<string>();
      const result: string[] = [];
      for (const line of lines) {
        if (!seen.has(line)) {
          seen.add(line);
          result.push(line);
        }
      }
      return result.join('\n');
    }
    case 'html':
      return text.replace(/<[^>]*>/g, '');
    case 'special':
      return text.replace(/[^a-zA-Z0-9\s'-]/g, '');
    default:
      return text;
  }
};
