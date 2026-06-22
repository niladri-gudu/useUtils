export interface CharDetail {
  charIndex: number;
  codeUnitIndex: number;
  char: string;
  codePoint: number;
  hexCodePoint: string;
  unicodeBlock: string;
  utf8Hex: string;
  utf16Hex: string;
  bin: string;
  dec: number;
  type: 'standard' | 'whitespace' | 'control' | 'invisible' | 'emoji';
  typeName: string;
  description: string;
}

export interface TextAnalysisResult {
  charCount: number; // UTF-16 code units (text.length)
  codePointCount: number; // Actual characters
  wordCount: number;
  lineCount: number;
  byteSizeUtf8: number;
  byteSizeUtf16: number;
  isNormalizedNfc: boolean;
  isNormalizedNfd: boolean;
  hasInvisibleChars: boolean;
  invisibleCharCount: number;
  characterList: CharDetail[];
}

export interface CleanOptions {
  removeInvisible: boolean;
  removeControl: boolean;
  convertTabsToSpaces: boolean;
  tabSize: number;
  normalizeWhitespace: boolean;
  removeEmojis: boolean;
  normalizeForm: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' | 'none';
}

export interface HexDumpLine {
  offset: string;
  hex: string;
  ascii: string;
}

// Map code point ranges to Unicode Block names
export const getUnicodeBlock = (cp: number): string => {
  if (cp >= 0x0000 && cp <= 0x007F) return 'Basic Latin (ASCII)';
  if (cp >= 0x0080 && cp <= 0x00FF) return 'Latin-1 Supplement';
  if (cp >= 0x0100 && cp <= 0x017F) return 'Latin Extended-A';
  if (cp >= 0x0180 && cp <= 0x024F) return 'Latin Extended-B';
  if (cp >= 0x0250 && cp <= 0x02AF) return 'IPA Extensions';
  if (cp >= 0x02B0 && cp <= 0x02FF) return 'Spacing Modifier Letters';
  if (cp >= 0x0300 && cp <= 0x036F) return 'Combining Diacritical Marks';
  if (cp >= 0x0370 && cp <= 0x03FF) return 'Greek and Coptic';
  if (cp >= 0x0400 && cp <= 0x04FF) return 'Cyrillic';
  if (cp >= 0x0530 && cp <= 0x058F) return 'Armenian';
  if (cp >= 0x0590 && cp <= 0x05FF) return 'Hebrew';
  if (cp >= 0x0600 && cp <= 0x06FF) return 'Arabic';
  if (cp >= 0x0700 && cp <= 0x074F) return 'Syriac';
  if (cp >= 0x0780 && cp <= 0x07BF) return 'Thaana';
  if (cp >= 0x07C0 && cp <= 0x07FF) return 'N\'Ko';
  if (cp >= 0x0900 && cp <= 0x097F) return 'Devanagari';
  if (cp >= 0x0980 && cp <= 0x09FF) return 'Bengali';
  if (cp >= 0x0A00 && cp <= 0x0A7F) return 'Gurmukhi';
  if (cp >= 0x0A80 && cp <= 0x0AFF) return 'Gujarati';
  if (cp >= 0x0B00 && cp <= 0x0B7F) return 'Oriya';
  if (cp >= 0x0B80 && cp <= 0x0BFF) return 'Tamil';
  if (cp >= 0x0C00 && cp <= 0x0C7F) return 'Telugu';
  if (cp >= 0x0C80 && cp <= 0x0CFF) return 'Kannada';
  if (cp >= 0x0D00 && cp <= 0x0D7F) return 'Malayalam';
  if (cp >= 0x0D80 && cp <= 0x0DFF) return 'Sinhala';
  if (cp >= 0x0E00 && cp <= 0x0E7F) return 'Thai';
  if (cp >= 0x0E80 && cp <= 0x0EFF) return 'Lao';
  if (cp >= 0x0F00 && cp <= 0x0FFF) return 'Tibetan';
  if (cp >= 0x1000 && cp <= 0x109F) return 'Myanmar';
  if (cp >= 0x10A0 && cp <= 0x10FF) return 'Georgian';
  if (cp >= 0x1100 && cp <= 0x11FF) return 'Hangul Jamo';
  if (cp >= 0x1200 && cp <= 0x137F) return 'Ethiopic';
  if (cp >= 0x13A0 && cp <= 0x13FF) return 'Cherokee';
  if (cp >= 0x1400 && cp <= 0x167F) return 'Unified Canadian Aboriginal Syllabics';
  if (cp >= 0x1680 && cp <= 0x169F) return 'Ogham';
  if (cp >= 0x16A0 && cp <= 0x16FF) return 'Runic';
  if (cp >= 0x1700 && cp <= 0x171F) return 'Tagalog';
  if (cp >= 0x1720 && cp <= 0x173F) return 'Hanunoo';
  if (cp >= 0x1740 && cp <= 0x175F) return 'Buhid';
  if (cp >= 0x1760 && cp <= 0x177F) return 'Tagbanwa';
  if (cp >= 0x1780 && cp <= 0x17FF) return 'Khmer';
  if (cp >= 0x1800 && cp <= 0x18AF) return 'Mongolian';
  if (cp >= 0x1900 && cp <= 0x194F) return 'Limbu';
  if (cp >= 0x19E0 && cp <= 0x19FF) return 'Khmer Symbols';
  if (cp >= 0x1D00 && cp <= 0x1D7F) return 'Phonetic Extensions';
  if (cp >= 0x1E00 && cp <= 0x1EFF) return 'Latin Extended Additional';
  if (cp >= 0x1F00 && cp <= 0x1FFF) return 'Greek Extended';
  if (cp >= 0x2000 && cp <= 0x206F) return 'General Punctuation';
  if (cp >= 0x2070 && cp <= 0x209F) return 'Superscripts and Subscripts';
  if (cp >= 0x20A0 && cp <= 0x20CF) return 'Currency Symbols';
  if (cp >= 0x20D0 && cp <= 0x20FF) return 'Combining Diacritical Marks for Symbols';
  if (cp >= 0x2100 && cp <= 0x214F) return 'Letterlike Symbols';
  if (cp >= 0x2150 && cp <= 0x218F) return 'Number Forms';
  if (cp >= 0x2190 && cp <= 0x21FF) return 'Arrows';
  if (cp >= 0x2200 && cp <= 0x22FF) return 'Mathematical Operators';
  if (cp >= 0x2300 && cp <= 0x23FF) return 'Miscellaneous Technical';
  if (cp >= 0x2400 && cp <= 0x243F) return 'Control Pictures';
  if (cp >= 0x2440 && cp <= 0x245F) return 'Optical Character Recognition';
  if (cp >= 0x2460 && cp <= 0x24FF) return 'Enclosed Alphanumerics';
  if (cp >= 0x2500 && cp <= 0x257F) return 'Box Drawing';
  if (cp >= 0x2580 && cp <= 0x259F) return 'Block Elements';
  if (cp >= 0x25A0 && cp <= 0x25FF) return 'Geometric Shapes';
  if (cp >= 0x2600 && cp <= 0x26FF) return 'Miscellaneous Symbols';
  if (cp >= 0x2700 && cp <= 0x27BF) return 'Dingbats';
  if (cp >= 0x27C0 && cp <= 0x27EF) return 'Miscellaneous Mathematical Symbols-A';
  if (cp >= 0x27F0 && cp <= 0x27FF) return 'Supplemental Arrows-A';
  if (cp >= 0x2800 && cp <= 0x28FF) return 'Braille Patterns';
  if (cp >= 0x2900 && cp <= 0x297F) return 'Supplemental Arrows-B';
  if (cp >= 0x2980 && cp <= 0x29FF) return 'Miscellaneous Mathematical Symbols-B';
  if (cp >= 0x2A00 && cp <= 0x2AFF) return 'Supplemental Mathematical Operators';
  if (cp >= 0x2B00 && cp <= 0x2BFF) return 'Miscellaneous Symbols and Arrows';
  if (cp >= 0x2E80 && cp <= 0x2EFF) return 'CJK Radicals Supplement';
  if (cp >= 0x2F00 && cp <= 0x2FDF) return 'Kangxi Radicals';
  if (cp >= 0x3000 && cp <= 0x303F) return 'CJK Symbols and Punctuation';
  if (cp >= 0x3040 && cp <= 0x309F) return 'Hiragana';
  if (cp >= 0x30A0 && cp <= 0x30FF) return 'Katakana';
  if (cp >= 0x3100 && cp <= 0x312F) return 'Bopomofo';
  if (cp >= 0x3130 && cp <= 0x318F) return 'Hangul Compatibility Jamo';
  if (cp >= 0x31C0 && cp <= 0x31EF) return 'CJK Strokes';
  if (cp >= 0x3200 && cp <= 0x32FF) return 'Enclosed CJK Letters and Months';
  if (cp >= 0x3300 && cp <= 0x33FF) return 'CJK Compatibility';
  if (cp >= 0x3400 && cp <= 0x4DBF) return 'CJK Unified Ideographs Extension A';
  if (cp >= 0x4DC0 && cp <= 0x4DFF) return 'Yijing Hexagram Symbols';
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK Unified Ideographs';
  if (cp >= 0xAC00 && cp <= 0xD7AF) return 'Hangul Syllables';
  if (cp >= 0xD800 && cp <= 0xDB7F) return 'High Surrogates';
  if (cp >= 0xDB80 && cp <= 0xDBFF) return 'High Private Use Surrogates';
  if (cp >= 0xDC00 && cp <= 0xDFFF) return 'Low Surrogates';
  if (cp >= 0xE000 && cp <= 0xF8FF) return 'Private Use Area';
  if (cp >= 0xF900 && cp <= 0xFAFF) return 'CJK Compatibility Ideographs';
  if (cp >= 0xFB00 && cp <= 0xFB4F) return 'Alphabetic Presentation Forms';
  if (cp >= 0xFB50 && cp <= 0xFDFF) return 'Arabic Presentation Forms-A';
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 'Variation Selectors';
  if (cp >= 0xFE20 && cp <= 0xFE2F) return 'Combining Half Marks';
  if (cp >= 0xFE30 && cp <= 0xFE4F) return 'CJK Compatibility Forms';
  if (cp >= 0xFE50 && cp <= 0xFE6F) return 'Small Form Variants';
  if (cp >= 0xFE70 && cp <= 0xFEFF) return 'Arabic Presentation Forms-B';
  if (cp >= 0xFF00 && cp <= 0xFFEF) return 'Halfwidth and Fullwidth Forms';
  if (cp >= 0xFFF0 && cp <= 0xFFFF) return 'Specials';
  
  // Supplementary Planes
  if (cp >= 0x10000 && cp <= 0x1007F) return 'Linear B Syllabary';
  if (cp >= 0x1D000 && cp <= 0x1D0FF) return 'Byzantine Musical Symbols';
  if (cp >= 0x1D100 && cp <= 0x1D1FF) return 'Musical Symbols';
  if (cp >= 0x1D300 && cp <= 0x1D35F) return 'Tai Xuan Jing Symbols';
  if (cp >= 0x1D400 && cp <= 0x1D7FF) return 'Mathematical Alphanumeric Symbols';
  if (cp >= 0x1F000 && cp <= 0x1F09F) return 'Domino Tiles';
  if (cp >= 0x1F0A0 && cp <= 0x1F0FF) return 'Playing Cards';
  if (cp >= 0x1F300 && cp <= 0x1F5FF) return 'Miscellaneous Symbols and Pictographs';
  if (cp >= 0x1F600 && cp <= 0x1F64F) return 'Emoticons (Emojis)';
  if (cp >= 0x1F680 && cp <= 0x1F6FF) return 'Transport and Map Symbols';
  if (cp >= 0x1F700 && cp <= 0x1F77F) return 'Alchemical Symbols';
  if (cp >= 0x1F900 && cp <= 0x1F9FF) return 'Supplemental Symbols and Pictographs';
  if (cp >= 0x1FA70 && cp <= 0x1FAFF) return 'Symbols and Pictographs Extended-A';
  if (cp >= 0x20000 && cp <= 0x2A6DF) return 'CJK Unified Ideographs Extension B';
  if (cp >= 0x2A700 && cp <= 0x2B73F) return 'CJK Unified Ideographs Extension C';
  if (cp >= 0x2B740 && cp <= 0x2B81F) return 'CJK Unified Ideographs Extension D';
  if (cp >= 0x2F800 && cp <= 0x2FA1F) return 'CJK Compatibility Ideographs Supplement';
  if (cp >= 0xE0000 && cp <= 0xE007F) return 'Tags';
  if (cp >= 0xE0100 && cp <= 0xE01EF) return 'Variation Selectors Supplement';
  
  return `Supplementary Plane (U+${cp.toString(16).toUpperCase()})`;
};

// Check for specific invisible or problematic characters
export const getInvisibleCharDetails = (cp: number): { name: string; description: string } | null => {
  switch (cp) {
    case 0x0000:
      return { name: 'Null Character (NUL)', description: 'ASCII value 0. Often terminates strings in C-style systems; can cause truncated parses in database engines.' };
    case 0x0009:
      return { name: 'Horizontal Tab (HT)', description: 'Standard tab space. Used for indentation.' };
    case 0x000A:
      return { name: 'Line Feed (LF)', description: 'Unix newline character. Moves the cursor to the next line.' };
    case 0x000D:
      return { name: 'Carriage Return (CR)', description: 'Classic Mac/Windows carriage return. Often paired with LF (CRLF) on Windows.' };
    case 0x00A0:
      return { name: 'Non-Breaking Space (NBSP)', description: 'Creates a space that prevents automated line wraps. Visually identical to a space but has a different code point (U+00A0).' };
    case 0x00AD:
      return { name: 'Soft Hyphen (SHY)', description: 'Invisible marker indicating where a word can break and hypenate across lines if needed.' };
    case 0x180E:
      return { name: 'Mongolian Vowel Separator', description: 'Zero-width space-like separator specific to Mongolian text scripts.' };
    case 0x2000:
      return { name: 'En Quad', description: 'Whitespace equal to 1/2 of the em font size.' };
    case 0x2001:
      return { name: 'Em Quad', description: 'Whitespace equal to 1 em width.' };
    case 0x2002:
      return { name: 'En Space', description: 'Standard typographical space representing 1/2 em width.' };
    case 0x2003:
      return { name: 'Em Space', description: 'Typographical space equal to 1 em width.' };
    case 0x2004:
      return { name: 'Three-Per-Em Space', description: 'Typographical space equal to 1/3 em width.' };
    case 0x2005:
      return { name: 'Four-Per-Em Space', description: 'Typographical space equal to 1/4 em width.' };
    case 0x2006:
      return { name: 'Six-Per-Em Space', description: 'Typographical space equal to 1/6 em width.' };
    case 0x2007:
      return { name: 'Figure Space', description: 'Space equal in width to a numeric digit, ensuring uniform columns in tabular data.' };
    case 0x2008:
      return { name: 'Punctuation Space', description: 'Space equal in width to standard punctuation marks (period, comma).' };
    case 0x2009:
      return { name: 'Thin Space', description: 'A narrow space (usually 1/5 or 1/6 of an em) used around nested quotation marks or math symbols.' };
    case 0x200A:
      return { name: 'Hair Space', description: 'The narrowest typographical space unit available, thinner than a thin space.' };
    case 0x200B:
      return { name: 'Zero-Width Space (ZWSP)', description: 'An invisible character that specifies a potential boundary for word wraps. Often pasted accidentally from formatted documents, breaking compilers.' };
    case 0x200C:
      return { name: 'Zero-Width Non-Joiner (ZWNJ)', description: 'Invisible character preventing two adjacent letters from connecting in cursive or Arabic-like scripts.' };
    case 0x200D:
      return { name: 'Zero-Width Joiner (ZWJ)', description: 'Invisible character used to glue multiple glyphs together (e.g. compounding emojis like family members or skin-tone modifiers).' };
    case 0x200E:
      return { name: 'Left-to-Right Mark (LRM)', description: 'Invisible bi-directional text control forcing following text to render left-to-right.' };
    case 0x200F:
      return { name: 'Right-to-Left Mark (RLM)', description: 'Invisible bi-directional text control forcing following text to render right-to-left.' };
    case 0x2028:
      return { name: 'Line Separator (LSEP)', description: 'Directs the layout to start a new line without creating a paragraph. Can crash JSON parsers if unescaped.' };
    case 0x2029:
      return { name: 'Paragraph Separator (PSEP)', description: 'Directs the layout to break a new paragraph. Can crash JSON parsers if unescaped.' };
    case 0x202A:
      return { name: 'Left-to-Right Embedding (LRE)', description: 'Bi-directional text override starting an LTR block.' };
    case 0x202B:
      return { name: 'Right-to-Left Embedding (RLE)', description: 'Bi-directional text override starting an RTL block.' };
    case 0x202C:
      return { name: 'Pop Directional Formatting (PDF)', description: 'Ends the scope of the last bi-directional text formatting control.' };
    case 0x202D:
      return { name: 'Left-to-Right Override (LRO)', description: 'Forces nested bi-directional characters to render left-to-right.' };
    case 0x202E:
      return { name: 'Right-to-Left Override (RLO)', description: 'Forces nested bi-directional characters to render right-to-left.' };
    case 0x205F:
      return { name: 'Medium Mathematical Space', description: 'Typographical space used specifically in mathematical equations.' };
    case 0x2060:
      return { name: 'Word Joiner (WJ)', description: 'An invisible character preventing line breaks at its position. Similar to NBSP but zero-width.' };
    case 0x2061:
      return { name: 'Function Application', description: 'Invisible operator indicating a relation between a function and its arguments.' };
    case 0x2062:
      return { name: 'Invisible Times', description: 'Invisible operator indicating mathematical multiplication.' };
    case 0x2063:
      return { name: 'Invisible Separator', description: 'Invisible operator representing punctuation separators in formulas.' };
    case 0x206F:
      return { name: 'Nominal Digit Shapes', description: 'Control character modifying how digits are shaped.' };
    case 0xFEFF:
      return { name: 'Byte Order Mark (BOM) / Zero-Width No-Break Space', description: 'Typically prepended to UTF-8/16 files to signal encoding order. Often causes compilation errors when copy-pasted into config headers.' };
    case 0xFFFC:
      return { name: 'Object Replacement Character', description: 'Placeholder used by text renderers to anchor external attachments like images or media widgets.' };
    case 0xFFFD:
      return { name: 'Replacement Character ()', description: 'Unicode character displayed when a decoder encounters invalid, corrupt, or unmappable byte sequences.' };
    default:
      return null;
  }
};

const isEmoji = (cp: number): boolean => {
  return (
    (cp >= 0x1F600 && cp <= 0x1F64F) || // Emoticons
    (cp >= 0x1F300 && cp <= 0x1F5FF) || // Misc Symbols and Pictographs
    (cp >= 0x1F680 && cp <= 0x1F6FF) || // Transport and Map
    (cp >= 0x1F900 && cp <= 0x1F9FF) || // Supplemental Symbols
    (cp >= 0x2600 && cp <= 0x26FF) ||   // Misc Symbols
    (cp >= 0x2700 && cp <= 0x27BF) ||   // Dingbats
    (cp >= 0x1FA70 && cp <= 0x1FAFF) || // Symbols and Pictographs Ext A
    (cp >= 0x200D && cp <= 0x200D)      // ZWJ (used in emoji combinations, though typed as invisible, can be part of emoji chains)
  );
};

// Helper to convert character string to space-separated hex bytes
const getUtf8Hex = (char: string): string => {
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(char);
    return Array.from(bytes)
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
  } catch {
    return '--';
  }
};

const getUtf16Hex = (char: string): string => {
  const hexes: string[] = [];
  for (let i = 0; i < char.length; i++) {
    hexes.push(char.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'));
  }
  return hexes.join(' ');
};

const getBinary = (codePoint: number): string => {
  const rawBin = codePoint.toString(2);
  // Pad with zeroes to groups of 8 bits
  const paddedLen = Math.ceil(rawBin.length / 8) * 8;
  const padded = rawBin.padStart(paddedLen, '0');
  // Segment into chunks of 8 characters for readability
  const segments: string[] = [];
  for (let i = 0; i < padded.length; i += 8) {
    segments.push(padded.substring(i, i + 8));
  }
  return segments.join(' ');
};

// Analyze the string details
export const analyzeText = (text: string, limitDetailCount: number = 3000): TextAnalysisResult => {
  const codePoints = [...text];
  const totalCodePoints = codePoints.length;
  
  // Word count regex (smart regex ignoring purely symbols)
  const words = text.match(/\b[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?(?:-[a-zA-Z0-9]+)?\b/g) || [];
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
  
  // Calculate byte sizes
  const byteSizeUtf16 = text.length * 2;
  let byteSizeUtf8 = 0;
  try {
    const encoder = new TextEncoder();
    byteSizeUtf8 = encoder.encode(text).length;
  } catch {
    // Fallback if TextEncoder is missing
    byteSizeUtf8 = totalCodePoints; // rough estimate
  }

  // Normalization checks
  const isNormalizedNfc = text === text.normalize('NFC');
  const isNormalizedNfd = text === text.normalize('NFD');

  let invisibleCharCount = 0;
  const characterList: CharDetail[] = [];
  let codeUnitAcc = 0;

  // Build character list up to details limit
  const limit = Math.min(totalCodePoints, limitDetailCount);
  for (let i = 0; i < limit; i++) {
    const char = codePoints[i];
    const cp = char.codePointAt(0) || 0;
    const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    const block = getUnicodeBlock(cp);
    
    const invisibleDetail = getInvisibleCharDetails(cp);
    const isWspace = /^\s$/.test(char);
    const isCtrl = (cp >= 0x0000 && cp <= 0x001F) || (cp >= 0x007F && cp <= 0x009F);
    
    let type: CharDetail['type'] = 'standard';
    let typeName = 'Standard Character';
    let description = '';

    if (invisibleDetail) {
      if (cp === 0x0009 || cp === 0x000A || cp === 0x000D || cp === 0x0020) {
        type = 'whitespace';
        typeName = cp === 0x0020 ? 'Space' : invisibleDetail.name;
        description = invisibleDetail.description;
      } else {
        type = 'invisible';
        typeName = invisibleDetail.name;
        description = invisibleDetail.description;
        invisibleCharCount++;
      }
    } else if (isWspace) {
      type = 'whitespace';
      typeName = 'Whitespace';
    } else if (isCtrl) {
      type = 'control';
      typeName = 'Control Code';
      description = 'System command/control character.';
    } else if (isEmoji(cp)) {
      type = 'emoji';
      typeName = 'Emoji / Pictograph';
    }

    characterList.push({
      charIndex: i,
      codeUnitIndex: codeUnitAcc,
      char,
      codePoint: cp,
      hexCodePoint: hex,
      unicodeBlock: block,
      utf8Hex: getUtf8Hex(char),
      utf16Hex: getUtf16Hex(char),
      bin: getBinary(cp),
      dec: cp,
      type,
      typeName,
      description
    });

    codeUnitAcc += char.length; // increments by 1 or 2 depending on surrogate pair
  }

  // Count invisible characters in the entire string beyond the detail limit
  if (totalCodePoints > limitDetailCount) {
    for (let i = limitDetailCount; i < totalCodePoints; i++) {
      const char = codePoints[i];
      const cp = char.codePointAt(0) || 0;
      const invisibleDetail = getInvisibleCharDetails(cp);
      if (invisibleDetail && cp !== 0x0009 && cp !== 0x000A && cp !== 0x000D && cp !== 0x0020) {
        invisibleCharCount++;
      }
    }
  }

  return {
    charCount: text.length,
    codePointCount: totalCodePoints,
    wordCount: words.length,
    lineCount: lines,
    byteSizeUtf8,
    byteSizeUtf16,
    isNormalizedNfc,
    isNormalizedNfd,
    hasInvisibleChars: invisibleCharCount > 0,
    invisibleCharCount,
    characterList
  };
};

// Clean text with options
export const cleanText = (text: string, options: CleanOptions): string => {
  let result = text;

  // Apply Unicode Normalization first if specified
  if (options.normalizeForm !== 'none') {
    result = result.normalize(options.normalizeForm);
  }

  // Convert tabs to spaces
  if (options.convertTabsToSpaces) {
    const spaces = ' '.repeat(options.tabSize);
    result = result.replace(/\t/g, spaces);
  }

  const codePoints = [...result];
  const cleaned: string[] = [];

  for (const char of codePoints) {
    const cp = char.codePointAt(0) || 0;
    const isWspace = cp === 0x0009 || cp === 0x000A || cp === 0x000D || cp === 0x0020;
    
    // Check if it is an invisible/zero-width character (excluding valid whitespace tabs/newlines/spaces)
    const invisibleDetail = getInvisibleCharDetails(cp);
    const isInvisible = invisibleDetail && !isWspace;

    // Check if control code (excluding spaces/newlines/tabs)
    const isControl = ((cp >= 0x0000 && cp <= 0x001F) || (cp >= 0x007F && cp <= 0x009F)) && !isWspace;

    const isEmojiChar = isEmoji(cp);

    // Filters
    if (options.removeInvisible && isInvisible) {
      continue;
    }

    if (options.removeControl && isControl) {
      continue;
    }

    if (options.removeEmojis && isEmojiChar) {
      continue;
    }

    cleaned.push(char);
  }

  result = cleaned.join('');

  // Normalize excessive spaces
  if (options.normalizeWhitespace) {
    result = result
      .replace(/[ ]{2,}/g, ' ') // collapse multi-spaces
      .replace(/^[ ]+|[ ]+$/gm, ''); // trim lines
  }

  return result;
};

// Format raw text bytes into standard hex dump blocks
export const generateHexDump = (text: string): HexDumpLine[] => {
  if (!text) return [];
  
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const lines: HexDumpLine[] = [];
  
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    
    // Offset
    const offset = i.toString(16).toUpperCase().padStart(8, '0');
    
    // Hex bytes
    const hexParts: string[] = [];
    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        hexParts.push(chunk[j].toString(16).toUpperCase().padStart(2, '0'));
      } else {
        hexParts.push('  ');
      }
    }
    // Split hex block in middle for readability
    const hex = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');
    
    // ASCII representation
    let ascii = '';
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      // Only display standard printable ASCII characters, others display as dot
      if (b >= 32 && b <= 126) {
        ascii += String.fromCharCode(b);
      } else {
        ascii += '·';
      }
    }
    
    lines.push({ offset, hex, ascii });
  }
  
  return lines;
};
