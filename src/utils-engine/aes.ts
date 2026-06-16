/**
 * Core AES Cryptographic Engine
 * Processed entirely client-side in the browser memory using the Web Crypto API.
 */

const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  return null;
};

const getCryptoSubtle = () => {
  const crypto = getCrypto();
  return crypto ? crypto.subtle : null;
};

// ============================================================================
// Format Conversions (Hex & Base64)
// ============================================================================

export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const length = cleanHex.length / 2;
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = atob(b64.trim().replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binString = '';
  // Use chunking to avoid call stack size exceeded on large arrays
  const chunk = 8192;
  for (let i = 0; i < arr.length; i += chunk) {
    const subarr = arr.subarray(i, i + chunk);
    binString += String.fromCharCode.apply(null, subarr as any);
  }
  return btoa(binString);
}

// ============================================================================
// Random Generators (Secure Keys & Passwords)
// ============================================================================

export function generateRandomBytes(size: number): Uint8Array {
  const crypto = getCrypto();
  if (!crypto) {
    throw new Error('Web Crypto API not available');
  }
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateSecureKey(keySize: 128 | 192 | 256, format: 'hex' | 'base64'): string {
  const byteLength = keySize / 8;
  const bytes = generateRandomBytes(byteLength);
  return format === 'hex' ? uint8ArrayToHex(bytes) : uint8ArrayToBase64(bytes);
}

export function generateSecurePassword(
  length = 16,
  options = { upper: true, lower: true, numbers: true, symbols: true }
): string {
  const crypto = getCrypto();
  if (!crypto) {
    throw new Error('Web Crypto API not available');
  }

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let allowedChars = '';
  if (options.lower) allowedChars += lowercase;
  if (options.upper) allowedChars += uppercase;
  if (options.numbers) allowedChars += numbers;
  if (options.symbols) allowedChars += symbols;

  if (allowedChars.length === 0) {
    allowedChars = lowercase + uppercase + numbers + symbols;
  }

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += allowedChars[randomValues[i] % allowedChars.length];
  }
  return result;
}

// ============================================================================
// Key Derivation and Import
// ============================================================================

export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  keySize: 128 | 192 | 256,
  aesMode: 'AES-GCM' | 'AES-CBC'
): Promise<CryptoKey> {
  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API not available');
  }

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // Import raw password bytes as a key material
  const keyMaterial = await subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the AES key
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: aesMode,
      length: keySize,
    },
    false, // not exportable
    ['encrypt', 'decrypt']
  );
}

export async function importRawKey(
  rawKey: Uint8Array,
  aesMode: 'AES-GCM' | 'AES-CBC'
): Promise<CryptoKey> {
  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Raw key length validation
  const keyBits = rawKey.length * 8;
  if (keyBits !== 128 && keyBits !== 192 && keyBits !== 256) {
    throw new Error(`Invalid key size: ${keyBits} bits. Must be 128, 192, or 256 bits.`);
  }

  return await subtle.importKey(
    'raw',
    rawKey,
    { name: aesMode },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// Encryption & Decryption Functions
// ============================================================================

export async function encryptAES(
  plaintext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
  aesMode: 'AES-GCM' | 'AES-CBC'
): Promise<Uint8Array> {
  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API not available');
  }

  let encryptParams: any = { name: aesMode, iv };
  if (aesMode === 'AES-GCM') {
    encryptParams.tagLength = 128; // Standard tag size (16 bytes)
  }

  const ciphertextBuffer = await subtle.encrypt(encryptParams, key, plaintext);
  return new Uint8Array(ciphertextBuffer);
}

export async function decryptAES(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
  aesMode: 'AES-GCM' | 'AES-CBC'
): Promise<Uint8Array> {
  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API not available');
  }

  let decryptParams: any = { name: aesMode, iv };
  if (aesMode === 'AES-GCM') {
    decryptParams.tagLength = 128;
  }

  const plaintextBuffer = await subtle.decrypt(decryptParams, key, ciphertext);
  return new Uint8Array(plaintextBuffer);
}

// ============================================================================
// Combined Serialization Envelopes
// ============================================================================

export interface EncryptedPayload {
  mode: 'AES-GCM' | 'AES-CBC';
  keySize: 128 | 192 | 256;
  iterations?: number;
  salt?: string; // Hex encoded
  iv: string; // Hex encoded
  ciphertext: string; // Base64 encoded
}

/**
 * Builds a JSON-string payload envelope containing ciphertext and configurations.
 */
export function buildJsonPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parses a JSON-string payload envelope.
 */
export function parseJsonPayload(jsonStr: string): EncryptedPayload {
  const payload = JSON.parse(jsonStr);
  if (!payload.mode || !payload.keySize || !payload.iv || !payload.ciphertext) {
    throw new Error('Invalid payload structure: missing required fields');
  }
  if (payload.mode !== 'AES-GCM' && payload.mode !== 'AES-CBC') {
    throw new Error(`Unsupported mode in payload: ${payload.mode}`);
  }
  return payload;
}

/**
 * Encodes salt, iv, and ciphertext into a single binary block, return Base64 or Hex representation.
 */
export function buildConcatenatedPayload(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  salt?: Uint8Array,
  format: 'hex' | 'base64' = 'base64'
): string {
  const saltLen = salt ? salt.length : 0;
  const ivLen = iv.length;
  
  // Layout: [1 byte saltLen] [1 byte ivLen] [saltBytes] [ivBytes] [ciphertextBytes]
  const totalLength = 1 + 1 + saltLen + ivLen + ciphertext.length;
  const combined = new Uint8Array(totalLength);
  
  combined[0] = saltLen;
  combined[1] = ivLen;
  
  let offset = 2;
  if (salt) {
    combined.set(salt, offset);
    offset += saltLen;
  }
  
  combined.set(iv, offset);
  offset += ivLen;
  
  combined.set(ciphertext, offset);
  
  return format === 'hex' ? uint8ArrayToHex(combined) : uint8ArrayToBase64(combined);
}

/**
 * Decodes a concatenated payload string back into its individual components.
 */
export function parseConcatenatedPayload(
  payloadStr: string,
  format: 'hex' | 'base64' = 'base64'
): { ciphertext: Uint8Array; iv: Uint8Array; salt?: Uint8Array } {
  let combined: Uint8Array;
  try {
    combined = format === 'hex' ? hexToUint8Array(payloadStr) : base64ToUint8Array(payloadStr);
  } catch (err) {
    // Attempt auto-detection if it fails
    try {
      if (/^[0-9a-fA-F]+$/.test(payloadStr.trim())) {
        combined = hexToUint8Array(payloadStr);
      } else {
        combined = base64ToUint8Array(payloadStr);
      }
    } catch {
      throw new Error('Failed to parse concatenated payload. Not a valid Hex or Base64 string.');
    }
  }
  
  if (combined.length < 2) {
    throw new Error('Payload is too short to be a valid concatenated structure.');
  }
  
  const saltLen = combined[0];
  const ivLen = combined[1];
  
  if (2 + saltLen + ivLen > combined.length) {
    throw new Error('Malformed payload headers: metadata size exceeds block length.');
  }
  
  let offset = 2;
  let salt: Uint8Array | undefined;
  if (saltLen > 0) {
    salt = combined.slice(offset, offset + saltLen);
    offset += saltLen;
  }
  
  const iv = combined.slice(offset, offset + ivLen);
  offset += ivLen;
  
  const ciphertext = combined.slice(offset);
  
  return { ciphertext, iv, salt };
}
