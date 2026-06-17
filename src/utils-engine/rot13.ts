// ============================================================================
// Classical Cryptography & Encoding Utility Engine
// ============================================================================

export interface LetterFrequency {
  letter: string;
  expected: number; // Standard English frequency in %
  actual: number;   // Actual percentage in current text
}

export interface BruteForceResult {
  shift: number;
  text: string;
  score: number;
}

// Standard English letter frequencies (percentage)
export const ENGLISH_FREQUENCIES: Record<string, number> = {
  A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015,
  H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749,
  O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758,
  V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074
};

// Common English words for scoring heuristic
const COMMON_ENGLISH_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she'
]);

/**
 * Standard ROT13 rotation for alphabetical characters (A-Z, a-z)
 */
export function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const isUppercase = code >= 65 && code <= 90;
    const base = isUppercase ? 65 : 97;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

/**
 * ROT5 rotation for digits (0-9)
 */
export function rot5(text: string): string {
  return text.replace(/[0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(((code - 48 + 5) % 10) + 48);
  });
}

/**
 * ROT18 combines ROT13 (letters) and ROT5 (digits)
 */
export function rot18(text: string): string {
  let result = rot13(text);
  return rot5(result);
}

/**
 * ROT47 rotates printable ASCII characters from 33 ('!') to 126 ('~') by 47 positions
 */
export function rot47(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 33 && code <= 126) {
      result += String.fromCharCode(((code - 33 + 47) % 94) + 33);
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Caesar Cipher encryption/decryption with custom shift (0-25)
 */
export function caesar(text: string, shift: number, decrypt = false): string {
  // Normalize shift to [0, 25] range
  let actualShift = shift % 26;
  if (actualShift < 0) actualShift += 26;
  if (decrypt) {
    actualShift = (26 - actualShift) % 26;
  }

  return text.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const isUppercase = code >= 65 && code <= 90;
    const base = isUppercase ? 65 : 97;
    return String.fromCharCode(((code - base + actualShift) % 26) + base);
  });
}

/**
 * Vigenère Cipher encryption/decryption with keyword
 */
export function vigenere(text: string, key: string, decrypt = false): string {
  if (!key) return text;
  
  // Clean key to uppercase alphabetical characters
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanKey.length === 0) return text;

  let keyIndex = 0;
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    const isUpper = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;

    if (isUpper || isLower) {
      const base = isUpper ? 65 : 97;
      const keyCharShift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
      
      let shift = decrypt ? (26 - keyCharShift) % 26 : keyCharShift;
      
      result += String.fromCharCode(((code - base + shift) % 26) + base);
      keyIndex++;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Atbash Cipher (Reflective Substitution: A <-> Z, B <-> Y, etc.)
 */
export function atbash(text: string): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const isUppercase = code >= 65 && code <= 90;
    if (isUppercase) {
      return String.fromCharCode(90 - (code - 65));
    } else {
      return String.fromCharCode(122 - (code - 97));
    }
  });
}

/**
 * Computes letter frequency analysis of text
 */
export function analyzeLetterFrequency(text: string): LetterFrequency[] {
  const counts: Record<string, number> = {};
  for (const letter of Object.keys(ENGLISH_FREQUENCIES)) {
    counts[letter] = 0;
  }

  let totalLetters = 0;
  const uppercaseText = text.toUpperCase();

  for (let i = 0; i < uppercaseText.length; i++) {
    const char = uppercaseText[i];
    if (char >= 'A' && char <= 'Z') {
      counts[char]++;
      totalLetters++;
    }
  }

  return Object.keys(ENGLISH_FREQUENCIES).map((letter) => {
    const expected = ENGLISH_FREQUENCIES[letter];
    const actual = totalLetters > 0 ? (counts[letter] / totalLetters) * 100 : 0;
    return {
      letter,
      expected,
      actual: parseFloat(actual.toFixed(3))
    };
  });
}

/**
 * Calculates heuristic score of English content likeness for a text string.
 * Higher scores mean more likely to be standard readable English.
 */
export function calculateEnglishScore(text: string): number {
  if (!text) return 0;
  
  const uppercaseText = text.toUpperCase();
  let letterCount = 0;
  const counts: Record<string, number> = {};
  
  for (let i = 0; i < uppercaseText.length; i++) {
    const char = uppercaseText[i];
    if (char >= 'A' && char <= 'Z') {
      counts[char] = (counts[char] || 0) + 1;
      letterCount++;
    }
  }

  if (letterCount === 0) return 0;

  // 1. Calculate frequency distribution dot-product with English distribution
  let frequencyScore = 0;
  for (const [letter, expectedPct] of Object.entries(ENGLISH_FREQUENCIES)) {
    const actualPct = ((counts[letter] || 0) / letterCount) * 100;
    // Overlap metric: minimize difference
    frequencyScore += (100 - Math.abs(expectedPct - actualPct)) * (expectedPct / 100);
  }

  // 2. Scan for common words
  let wordScore = 0;
  const words = text.toLowerCase().split(/[^a-z]+/);
  let matchedWords = 0;

  for (const word of words) {
    if (word && COMMON_ENGLISH_WORDS.has(word)) {
      matchedWords++;
    }
  }

  // Boost score based on word matching percentage
  if (words.length > 0) {
    const matchRatio = matchedWords / words.filter(Boolean).length;
    wordScore = matchRatio * 150; // Give high weight to dictionary matches
  }

  return parseFloat((frequencyScore + wordScore).toFixed(2));
}

/**
 * Brute force Caesar cipher: decodes text using all 25 shifts and returns sorted ratings.
 */
export function bruteForceCaesar(text: string): BruteForceResult[] {
  const results: BruteForceResult[] = [];
  
  // Only brute force if there is text
  if (!text.trim()) return [];

  // Try shifts 1 through 25 (shift 0 is identical to input)
  for (let shift = 0; shift < 26; shift++) {
    const decrypted = caesar(text, shift, true);
    const score = calculateEnglishScore(decrypted);
    results.push({
      shift,
      text: decrypted,
      score
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
