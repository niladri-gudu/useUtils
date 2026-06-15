/**
 * Binary & Hex Converter Utility Engine
 * Processed 100% locally in browser. Zero server transmission.
 */

// Format Uint8Array to binary string representation
export const uint8ToBinary = (arr: Uint8Array, delimiter: string = ' '): string => {
  const parts = Array.from(arr).map(b => b.toString(2).padStart(8, '0'));
  return parts.join(delimiter === 'none' ? '' : delimiter);
};

// Parse binary string representation back to Uint8Array
export const binaryToUint8 = (binaryStr: string, delimiter: string = ' '): Uint8Array => {
  let tokens: string[] = [];
  const cleanStr = binaryStr.trim();
  if (!cleanStr) return new Uint8Array(0);

  if (delimiter === 'none' || !binaryStr.includes(delimiter)) {
    // Remove non-binary characters and split into 8-bit groups
    const normalized = cleanStr.replace(/[^01]/g, '');
    const matched = normalized.match(/.{1,8}/g);
    tokens = matched ? matched : [];
  } else {
    tokens = cleanStr.split(delimiter).map(t => t.trim().replace(/[^01]/g, '')).filter(Boolean);
  }

  const bytes = tokens.map(token => {
    const val = parseInt(token, 2);
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid binary token: "${token}"`);
    }
    return val;
  });

  return new Uint8Array(bytes);
};

// Format Uint8Array to Hexadecimal representation
export const uint8ToHex = (arr: Uint8Array, delimiter: string = ' ', uppercase: boolean = false): string => {
  const parts = Array.from(arr).map(b => {
    const hex = b.toString(16).padStart(2, '0');
    return uppercase ? hex.toUpperCase() : hex.toLowerCase();
  });
  return parts.join(delimiter === 'none' ? '' : delimiter);
};

// Parse Hexadecimal string back to Uint8Array
export const hexToUint8 = (hexStr: string, delimiter: string = ' '): Uint8Array => {
  let tokens: string[] = [];
  const cleanStr = hexStr.trim();
  if (!cleanStr) return new Uint8Array(0);

  // Clean formatted hex characters like 0x or \x prefixes
  const cleanToken = (t: string) => t.trim().replace(/^(0x|\\x|%|\$)/i, '').replace(/[^0-9a-fA-F]/g, '');

  if (delimiter === 'none' || !hexStr.includes(delimiter)) {
    const normalized = cleanStr.replace(/^(0x|\\x|%|\$)/i, '').replace(/[^0-9a-fA-F]/g, '');
    const matched = normalized.match(/.{1,2}/g);
    tokens = matched ? matched : [];
  } else {
    tokens = cleanStr.split(delimiter).map(cleanToken).filter(Boolean);
  }

  const bytes = tokens.map(token => {
    if (token.length === 0) return 0;
    const val = parseInt(token, 16);
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid hex token: "${token}"`);
    }
    return val;
  });

  return new Uint8Array(bytes);
};

// Format Uint8Array to Decimal representation
export const uint8ToDecimal = (arr: Uint8Array, delimiter: string = ' '): string => {
  const parts = Array.from(arr).map(b => b.toString(10));
  // Decimals must have a separator to remain unambiguous, fall back to space if 'none'
  return parts.join(delimiter === 'none' ? ' ' : delimiter);
};

// Parse Decimal string back to Uint8Array
export const decimalToUint8 = (decimalStr: string, delimiter: string = ' '): Uint8Array => {
  const cleanStr = decimalStr.trim();
  if (!cleanStr) return new Uint8Array(0);

  const splitDelim = (delimiter === 'none' || !decimalStr.includes(delimiter)) ? /\s+/ : delimiter;
  const tokens = cleanStr.split(splitDelim).map(t => t.trim().replace(/[^0-9]/g, '')).filter(Boolean);

  const bytes = tokens.map(token => {
    const val = parseInt(token, 10);
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid decimal token: "${token}"`);
    }
    return val;
  });

  return new Uint8Array(bytes);
};

// Format Uint8Array to Octal representation
export const uint8ToOctal = (arr: Uint8Array, delimiter: string = ' '): string => {
  const parts = Array.from(arr).map(b => b.toString(8).padStart(3, '0'));
  return parts.join(delimiter === 'none' ? '' : delimiter);
};

// Parse Octal string back to Uint8Array
export const octalToUint8 = (octalStr: string, delimiter: string = ' '): Uint8Array => {
  let tokens: string[] = [];
  const cleanStr = octalStr.trim();
  if (!cleanStr) return new Uint8Array(0);

  if (delimiter === 'none' || !octalStr.includes(delimiter)) {
    const normalized = cleanStr.replace(/[^0-7]/g, '');
    const matched = normalized.match(/.{1,3}/g);
    tokens = matched ? matched : [];
  } else {
    tokens = cleanStr.split(delimiter).map(t => t.trim().replace(/[^0-7]/g, '')).filter(Boolean);
  }

  const bytes = tokens.map(token => {
    const val = parseInt(token, 8);
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid octal token: "${token}"`);
    }
    return val;
  });

  return new Uint8Array(bytes);
};

// Convert text to Uint8Array bytes
export const textToUint8 = (text: string, encoding: 'utf-8' | 'ascii' = 'utf-8'): Uint8Array => {
  if (encoding === 'ascii') {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 127) {
        throw new Error(`Character "${text[i]}" at index ${i} is non-ASCII (value: ${code}). Use UTF-8 encoding.`);
      }
      bytes[i] = code;
    }
    return bytes;
  } else {
    return new TextEncoder().encode(text);
  }
};

// Convert Uint8Array bytes to text representation
export const uint8ToText = (arr: Uint8Array, encoding: 'utf-8' | 'ascii' = 'utf-8'): string => {
  if (encoding === 'ascii') {
    let result = '';
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > 127) {
        result += ''; // Replacement char
      } else {
        result += String.fromCharCode(arr[i]);
      }
    }
    return result;
  } else {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(arr);
    } catch {
      // Lossy decoding if UTF-8 contains invalid byte sequences
      return new TextDecoder('utf-8', { fatal: false }).decode(arr);
    }
  }
};

// Convert Uint8Array to Base64
export const uint8ToBase64 = (arr: Uint8Array): string => {
  let binary = '';
  const len = arr.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    const subarr = arr.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, subarr as any);
  }
  return btoa(binary);
};

// Convert Base64 back to Uint8Array
export const base64ToUint8 = (b64: string): Uint8Array => {
  const clean = b64.replace(/\s/g, '');
  if (!clean) return new Uint8Array(0);
  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error('Invalid Base64 string format.');
  }
};

// Format Uint8Array as a classic text Hex Dump view
export const generateHexDump = (arr: Uint8Array): string => {
  if (arr.length === 0) return '';
  const lines: string[] = [];
  for (let i = 0; i < arr.length; i += 16) {
    const address = i.toString(16).padStart(8, '0');
    const chunk = arr.subarray(i, i + 16);
    
    // Hex representations
    const hexParts: string[] = [];
    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        hexParts.push(chunk[j].toString(16).padStart(2, '0'));
      } else {
        hexParts.push('  ');
      }
    }
    
    // Add spacer between columns for 8-byte blocks
    const hexString = `${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}`;
    
    // Plain text ASCII representations
    let asciiString = '';
    for (let j = 0; j < chunk.length; j++) {
      const byte = chunk[j];
      if (byte >= 32 && byte <= 126) {
        asciiString += String.fromCharCode(byte);
      } else {
        asciiString += '.';
      }
    }
    
    lines.push(`${address}:  ${hexString}  |${asciiString}|`);
  }
  return lines.join('\n');
};
