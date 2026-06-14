/**
 * Cryptographic Hashing and HMAC Utilities
 * Processed entirely client-side in the browser memory.
 */

// Helper to obtain Web Crypto subtle API in various JS contexts
const getCryptoSubtle = () => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
};

/**
 * Pure JavaScript MD5 Implementation
 * Standard MD5 algorithm for environments without native MD5 support (like Web Crypto API).
 */
export function md5(bytes: Uint8Array): Uint8Array {
  const bitLen = bytes.length * 8;
  const padLen = ((56 - (bytes.length + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(bytes.length + 1 + padLen + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  view.setUint32(padded.length - 8, bitLen, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  const s = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
  ];

  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];

  const rotateLeft = (n: number, c: number) => (n << c) | (n >>> (32 - c));

  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) {
      M[i] = view.getUint32(offset + i * 4, true);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;

    for (let i = 0; i < 64; i++) {
      let g = 0;
      let f = 0;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + K[i] + M[g]) | 0, s[i])) | 0;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  const result = new Uint8Array(16);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, true);
  resultView.setUint32(4, h1, true);
  resultView.setUint32(8, h2, true);
  resultView.setUint32(12, h3, true);

  return result;
}

/**
 * Generate cryptographic hash for standard inputs.
 */
export async function generateHash(input: string | Uint8Array, algorithm: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const upperAlgo = algorithm.toUpperCase();

  if (upperAlgo === 'MD5') {
    return md5(data);
  }

  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto API not available in this environment');
  }

  let webCryptoAlg = '';
  if (upperAlgo === 'SHA-1' || upperAlgo === 'SHA1') webCryptoAlg = 'SHA-1';
  else if (upperAlgo === 'SHA-256' || upperAlgo === 'SHA256') webCryptoAlg = 'SHA-256';
  else if (upperAlgo === 'SHA-384' || upperAlgo === 'SHA384') webCryptoAlg = 'SHA-384';
  else if (upperAlgo === 'SHA-512' || upperAlgo === 'SHA512') webCryptoAlg = 'SHA-512';
  else {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  const hashBuffer = await subtle.digest(webCryptoAlg, data);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate HMAC signature.
 */
export async function generateHMAC(
  input: string | Uint8Array,
  keyStr: string,
  algorithm: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const keyBytes = encoder.encode(keyStr);
  const upperAlgo = algorithm.toUpperCase();

  if (upperAlgo !== 'MD5') {
    const subtle = getCryptoSubtle();
    if (subtle) {
      let hashAlg = 'SHA-256';
      if (upperAlgo === 'SHA-1' || upperAlgo === 'SHA1') hashAlg = 'SHA-1';
      else if (upperAlgo === 'SHA-384' || upperAlgo === 'SHA384') hashAlg = 'SHA-384';
      else if (upperAlgo === 'SHA-512' || upperAlgo === 'SHA512') hashAlg = 'SHA-512';

      const key = await subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: hashAlg },
        false,
        ['sign']
      );
      const signatureBuffer = await subtle.sign('HMAC', key, data);
      return new Uint8Array(signatureBuffer);
    }
  }

  // Pure JavaScript HMAC-MD5 fallback
  const blockSize = 64;
  let key = keyBytes;

  if (key.length > blockSize) {
    key = md5(key);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const innerMsg = new Uint8Array(blockSize + data.length);
  innerMsg.set(ipad);
  innerMsg.set(data, blockSize);
  const innerHash = md5(innerMsg);

  const outerMsg = new Uint8Array(blockSize + innerHash.length);
  outerMsg.set(opad);
  outerMsg.set(innerHash, blockSize);
  return md5(outerMsg);
}

/**
 * Output format utilities
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binString = '';
  arr.forEach((b) => {
    binString += String.fromCharCode(b);
  });
  return btoa(binString);
}

export function uint8ArrayToBase64Url(arr: Uint8Array): string {
  const base64 = uint8ArrayToBase64(arr);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function uint8ArrayToDecimal(arr: Uint8Array): string {
  return `[${Array.from(arr).join(', ')}]`;
}
