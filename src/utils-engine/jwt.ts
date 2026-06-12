export interface DecodedJWT {
  header: any;
  payload: any;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
  isValid: boolean;
  error?: string;
}

export const CLAIM_EXPLAINERS: Record<string, string> = {
  iss: 'Issuer: Identifies the principal that issued the JWT (RFC 7519 §4.1.1)',
  sub: 'Subject: Identifies the principal that is the subject of the JWT (e.g. user ID) (RFC 7519 §4.1.2)',
  aud: 'Audience: Identifies the recipients that the JWT is intended for (RFC 7519 §4.1.3)',
  exp: 'Expiration Time: The time on or after which the token is invalid (RFC 7519 §4.1.4)',
  nbf: 'Not Before: The time before which the token must not be accepted (RFC 7519 §4.1.5)',
  iat: 'Issued At: The time at which the JWT was issued (RFC 7519 §4.1.6)',
  jti: 'JWT ID: Unique identifier for the token to prevent replay attacks (RFC 7519 §4.1.7)',
};

const getCryptoSubtle = () => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
};

export const extractToken = (rawInput: string): string => {
  const jwtRegex = /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*)/;
  const match = rawInput.match(jwtRegex);
  if (match) {
    return match[1];
  }

  let cleaned = rawInput;
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned;
};

export const base64UrlEncode = (str: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binString = '';
  data.forEach((b) => {
    binString += String.fromCharCode(b);
  });
  const base64 = btoa(binString);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
};

export const decodeSecret = (secretStr: string, isBase64Encoded: boolean): Uint8Array => {
  const encoder = new TextEncoder();
  if (!isBase64Encoded) {
    return encoder.encode(secretStr);
  }
  try {
    let normalized = secretStr.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) {
      normalized += '=';
    }
    const binStr = atob(normalized);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return encoder.encode(secretStr);
  }
};

export const signHMAC = async (
  message: string,
  secretStr: string,
  hashAlgorithm: string,
  isBase64Encoded: boolean = false
): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = decodeSecret(secretStr, isBase64Encoded);
  const data = encoder.encode(message);

  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto subtle API not available in this environment');
  }

  const key = await subtle.importKey(
    'raw',
    keyData as any,
    { name: 'HMAC', hash: hashAlgorithm },
    false,
    ['sign']
  );

  const signatureBuffer = await subtle.sign(
    'HMAC',
    key,
    data
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashString = hashArray.map((b) => String.fromCharCode(b)).join('');
  const base64 = btoa(hashString);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export const verifyHMAC = async (
  headerB64: string,
  payloadB64: string,
  signatureB64: string,
  secretStr: string,
  isBase64Encoded: boolean,
  alg: string
): Promise<boolean> => {
  try {
    const message = `${headerB64}.${payloadB64}`;
    
    let hashAlg = 'SHA-256';
    if (alg === 'HS384') hashAlg = 'SHA-384';
    if (alg === 'HS512') hashAlg = 'SHA-512';

    const data = new TextEncoder().encode(message);
    const keyData = decodeSecret(secretStr, isBase64Encoded);

    const subtle = getCryptoSubtle();
    if (!subtle) {
      throw new Error('Web Crypto subtle API not available in this environment');
    }

    const key = await subtle.importKey(
      'raw',
      keyData as any,
      { name: 'HMAC', hash: hashAlg },
      false,
      ['verify']
    );

    let normalizedSig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (normalizedSig.length % 4) {
      normalizedSig += '=';
    }
    const sigBin = atob(normalizedSig);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) {
      sigBytes[i] = sigBin.charCodeAt(i);
    }

    const isValid = await subtle.verify(
      'HMAC',
      key,
      sigBytes,
      data
    );

    return isValid;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
};

export const getAlgName = (alg: string): string => {
  if (!alg) return 'HMACSHA256';
  const clean = alg.toUpperCase();
  if (clean === 'HS256') return 'HMACSHA256';
  if (clean === 'HS384') return 'HMACSHA384';
  if (clean === 'HS512') return 'HMACSHA512';
  if (clean === 'RS256') return 'RSASHA256';
  if (clean === 'ES256') return 'ECDSASHA256';
  return clean;
};

export const decodeJWT = (token: string): DecodedJWT => {
  const sanitizedToken = token.replace(/\s+/g, '');
  const parts = sanitizedToken.split('.');

  if (parts.length !== 3) {
    return {
      header: null,
      payload: null,
      signature: '',
      headerRaw: '',
      payloadRaw: '',
      isValid: false,
      error: 'JWT must consist of three parts separated by dots (Header.Payload.Signature)',
    };
  }

  const [headerB64, payloadB64, signature] = parts;

  try {
    const headerStr = base64UrlDecode(headerB64);
    let headerObj = null;
    try {
      headerObj = JSON.parse(headerStr);
    } catch {
      return {
        header: null,
        payload: null,
        signature,
        headerRaw: headerStr,
        payloadRaw: '',
        isValid: false,
        error: 'Malformed Header: Failed to parse as valid JSON.',
      };
    }

    const payloadStr = base64UrlDecode(payloadB64);
    let payloadObj = null;
    try {
      payloadObj = JSON.parse(payloadStr);
    } catch {
      return {
        header: headerObj,
        payload: null,
        signature,
        headerRaw: headerStr,
        payloadRaw: payloadStr,
        isValid: false,
        error: 'Malformed Payload: Failed to parse as valid JSON.',
      };
    }

    return {
      header: headerObj,
      payload: payloadObj,
      signature,
      headerRaw: headerStr,
      payloadRaw: payloadStr,
      isValid: true,
    };
  } catch (err: any) {
    return {
      header: null,
      payload: null,
      signature,
      headerRaw: '',
      payloadRaw: '',
      isValid: false,
      error: `Decoding failed: ${err.message || 'Malformed base64 character sequences.'}`,
    };
  }
};
