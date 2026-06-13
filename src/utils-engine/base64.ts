export interface FileTypeInfo {
  mime: string;
  ext: string;
  isImage: boolean;
}

/**
 * Converts a Uint8Array buffer into a Base64 encoded string using performant chunk iteration.
 */
export const uint8ToBase64 = (arr: Uint8Array): string => {
  let result = '';
  const chunk = 8192;
  for (let i = 0; i < arr.length; i += chunk) {
    const subarr = arr.subarray(i, i + chunk);
    result += String.fromCharCode.apply(null, subarr as any);
  }
  return btoa(result);
};

/**
 * Encodes plain text string to Base64 with support for ASCII validation or robust UTF-8 conversion.
 */
export const encodeBase64 = (input: string, encoding: 'utf-8' | 'ascii'): string => {
  if (encoding === 'ascii') {
    if (/[^\x00-\x7F]/.test(input)) {
      throw new Error('Input contains non-ASCII characters. Use UTF-8 mode instead.');
    }
    return btoa(input);
  } else {
    const bytes = new TextEncoder().encode(input);
    return uint8ToBase64(bytes);
  }
};

/**
 * Decodes a Base64 string back to plain text using ASCII representation or robust UTF-8 verification.
 */
export const decodeBase64 = (b64: string, encoding: 'utf-8' | 'ascii'): string => {
  const binary = atob(b64);
  if (encoding === 'ascii') {
    return binary;
  } else {
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
};

/**
 * Analyzes the magic byte patterns of a Base64 decoded buffer segment to detect file types.
 */
export const detectFileTypeFromB64 = (b64: string): FileTypeInfo => {
  try {
    const binary = atob(b64.slice(0, 24));
    const bytes = Array.from(binary).map(c => c.charCodeAt(0));

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { mime: 'image/png', ext: 'png', isImage: true };
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { mime: 'image/jpeg', ext: 'jpg', isImage: true };
    }
    // GIF: GIF8 (47 49 46 38)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { mime: 'image/gif', ext: 'gif', isImage: true };
    }
    // WebP: RIFF (52 49 46 46) and WEBP (57 45 42 50)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      const we = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (we === 'WEBP') {
        return { mime: 'image/webp', ext: 'webp', isImage: true };
      }
    }
    // PDF: %PDF (25 50 44 46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { mime: 'application/pdf', ext: 'pdf', isImage: false };
    }
    // ZIP: PK (50 4B 03 04)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { mime: 'application/zip', ext: 'zip', isImage: false };
    }
    // XML/SVG check: '<svg' or '<?xml'
    const textChunk = binary.slice(0, 10).toLowerCase().trim();
    if (textChunk.includes('<svg')) {
      return { mime: 'image/svg+xml', ext: 'svg', isImage: true };
    }
    if (textChunk.includes('<?xml')) {
      return { mime: 'text/xml', ext: 'xml', isImage: false };
    }
  } catch (e) {
    // ignore
  }
  return { mime: 'text/plain', ext: 'txt', isImage: false };
};
