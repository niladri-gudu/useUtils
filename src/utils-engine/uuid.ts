/**
 * Core cryptographic utility engine for UUID, NanoID, Password and Byte generation.
 * All generation uses the browser's native window.crypto APIs for high-entropy secure randomness.
 */

// ============================================================================
// UUID v4 Generator
// ============================================================================
export function generateUuidV4(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Set version 4 (0100) on high bits of byte 6
  array[6] = (array[6] & 0x0f) | 0x40;
  // Set variant RFC 4122 (10xx) on byte 8
  array[8] = (array[8] & 0x3f) | 0x80;
  
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
}

// ============================================================================
// UUID v7 Generator (Timestamp-Ordered)
// ============================================================================
export function generateUuidV7(timestampMs?: number): string {
  const ts = timestampMs ?? Date.now();
  const hexTs = ts.toString(16).padStart(12, '0'); // 48 bits of timestamp
  
  const randomBytes = new Uint8Array(10);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Version 7: set high 4 bits of byte 6 to 0111 (0x70)
  const byte6 = 0x70 | (randomBytes[0] & 0x0f);
  const byte7 = randomBytes[1];

  // Variant RFC 4122: set high 2 bits of byte 8 to 10 (0x80)
  const byte8 = 0x80 | (randomBytes[2] & 0x3f);
  const byte9 = randomBytes[3];

  const hexPart5 = Array.from(randomBytes.subarray(4, 10))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const part1 = hexTs.substring(0, 8);
  const part2 = hexTs.substring(8, 12);
  const part3 = byte6.toString(16).padStart(2, '0') + byte7.toString(16).padStart(2, '0');
  const part4 = byte8.toString(16).padStart(2, '0') + byte9.toString(16).padStart(2, '0');
  
  return `${part1}-${part2}-${part3}-${part4}-${hexPart5}`;
}

// ============================================================================
// UUID v7 Parser
// ============================================================================
export interface ParsedUuidV7 {
  timestamp: number;
  date: Date;
}

export function parseUuidV7(uuid: string): ParsedUuidV7 | null {
  const clean = uuid.replace(/[\s-]/g, '').toLowerCase();
  if (clean.length !== 32) return null;
  
  // Verify UUID v7 identifier (character at index 12 must be '7')
  if (clean.charAt(12) !== '7') return null;
  
  const hexTs = clean.substring(0, 12);
  const timestamp = parseInt(hexTs, 16);
  if (isNaN(timestamp)) return null;
  
  return {
    timestamp,
    date: new Date(timestamp)
  };
}

// ============================================================================
// NanoID Generator
// ============================================================================
export function generateNanoId(length: number = 21, alphabet: string = 'usepaceFHklmnopqrstuwyzIEDNLAOBGHRXJKSTUVWYZbcdfghjklmnpqrstvwxyz0123456789-_'): string {
  const alphabetLength = alphabet.length;
  const randomValues = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  
  let id = '';
  for (let i = 0; i < length; i++) {
    id += alphabet.charAt(randomValues[i] % alphabetLength);
  }
  return id;
}

// ============================================================================
// Secure Random Password Generator
// ============================================================================
export interface PasswordOptions {
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export function generateSecurePassword(length: number, options: PasswordOptions): string {
  let uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  let digitChars = '0123456789';
  let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.excludeAmbiguous) {
    // Avoid visually similar characters (l, 1, I, o, 0, O, etc.)
    uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O
    lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // No l, o
    digitChars = '23456789'; // No 0, 1
    symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'; 
  }

  const pools: { chars: string; name: string }[] = [];
  if (options.uppercase) pools.push({ chars: uppercaseChars, name: 'upper' });
  if (options.lowercase) pools.push({ chars: lowercaseChars, name: 'lower' });
  if (options.digits) pools.push({ chars: digitChars, name: 'digits' });
  if (options.symbols) pools.push({ chars: symbolChars, name: 'symbols' });

  if (pools.length === 0) {
    // Fallback if nothing selected
    pools.push({ chars: lowercaseChars, name: 'lower' });
  }

  const allChars = pools.map(p => p.chars).join('');
  const passwordArray: string[] = [];

  // Guarantee at least one character from each selected set
  pools.forEach(pool => {
    const rand = new Uint8Array(1);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(rand);
    } else {
      rand[0] = Math.floor(Math.random() * 256);
    }
    passwordArray.push(pool.chars.charAt(rand[0] % pool.chars.length));
  });

  // Fill the remainder
  const remaining = length - passwordArray.length;
  if (remaining > 0) {
    const randomBytes = new Uint8Array(remaining);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < remaining; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < remaining; i++) {
      passwordArray.push(allChars.charAt(randomBytes[i] % allChars.length));
    }
  }

  // Cryptographically shuffle the elements using Fisher-Yates
  const shuffleBytes = new Uint8Array(passwordArray.length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(shuffleBytes);
  } else {
    for (let i = 0; i < passwordArray.length; i++) {
      shuffleBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = passwordArray[i];
    passwordArray[i] = passwordArray[j];
    passwordArray[j] = temp;
  }

  return passwordArray.join('');
}

// ============================================================================
// Secure Random Bytes Generator
// ============================================================================
export function generateRandomBytes(bytesCount: number, format: 'hex' | 'base64' | 'base64url' | 'base58'): string {
  const bytes = new Uint8Array(bytesCount);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytesCount; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  if (format === 'hex') {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  if (format === 'base64') {
    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binString);
  }

  if (format === 'base64url') {
    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  if (format === 'base58') {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const digits = [0];
    
    for (let i = 0; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    
    // Prefix leading zeros in bytes with the first base58 character
    let string = '';
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      string += ALPHABET[0];
    }
    
    for (let i = digits.length - 1; i >= 0; i--) {
      string += ALPHABET[digits[i]];
    }
    
    return string;
  }

  return '';
}

// ============================================================================
// Entropy Analysis (Shannon Entropy)
// ============================================================================
export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const freqs: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const c = str.charAt(i);
    freqs[c] = (freqs[c] || 0) + 1;
  }
  let entropy = 0;
  for (const c in freqs) {
    const p = freqs[c] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
