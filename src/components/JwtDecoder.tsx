import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// Robust Clipboard Copy Helper
// ==========================================
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy if writeText fails
    }
  }
  
  // Fallback legacy method (works in insecure contexts/local IPs)
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
};

// ==========================================
// cURL & Bearer Stripper Helper
// ==========================================
const extractToken = (rawInput: string): string => {
  // Extract a 3-part JWT (with optional signature characters, e.g. unsigned tokens)
  const jwtRegex = /([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*)/;
  const match = rawInput.match(jwtRegex);
  if (match) {
    return match[1];
  }

  // Otherwise, return the raw input as-is (just strip outer quotes if present)
  let cleaned = rawInput;
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned;
};

const CLAIM_EXPLAINERS: Record<string, string> = {
  iss: 'Issuer: Identifies the principal that issued the JWT (RFC 7519 §4.1.1)',
  sub: 'Subject: Identifies the principal that is the subject of the JWT (e.g. user ID) (RFC 7519 §4.1.2)',
  aud: 'Audience: Identifies the recipients that the JWT is intended for (RFC 7519 §4.1.3)',
  exp: 'Expiration Time: The time on or after which the token is invalid (RFC 7519 §4.1.4)',
  nbf: 'Not Before: The time before which the token must not be accepted (RFC 7519 §4.1.5)',
  iat: 'Issued At: The time at which the JWT was issued (RFC 7519 §4.1.6)',
  jti: 'JWT ID: Unique identifier for the token to prevent replay attacks (RFC 7519 §4.1.7)',
};

// ==========================================
// Base64Url Encoding Utility (UTF-8 safe)
// ==========================================
const base64UrlEncode = (str: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binString = '';
  data.forEach((b) => {
    binString += String.fromCharCode(b);
  });
  const base64 = btoa(binString);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

// ==========================================
// Base64Url Decoding Utility
// ==========================================
const base64UrlDecode = (str: string): string => {
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

// ==========================================
// Secret Key Decoder (Base64url safe)
// ==========================================
const decodeSecret = (secretStr: string, isBase64Encoded: boolean): Uint8Array => {
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
    // Fallback if base64 decoding fails
    return encoder.encode(secretStr);
  }
};

// ==========================================
// HMAC Signing Helper
// ==========================================
const signHMAC = async (message: string, secretStr: string, isBase64Encoded: boolean, hashAlgorithm: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = decodeSecret(secretStr, isBase64Encoded);
  const data = encoder.encode(message);

  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData as any,
    { name: 'HMAC', hash: hashAlgorithm },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    key,
    data
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashString = hashArray.map((b) => String.fromCharCode(b)).join('');
  const base64 = btoa(hashString);
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

// ==========================================
// Web Crypto HMAC Verification
// ==========================================
const verifyHMAC = async (
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

    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData as any,
      { name: 'HMAC', hash: hashAlg },
      false,
      ['verify']
    );

    // Decode signature
    let normalizedSig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (normalizedSig.length % 4) {
      normalizedSig += '=';
    }
    const sigBin = atob(normalizedSig);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) {
      sigBytes[i] = sigBin.charCodeAt(i);
    }

    const isValid = await window.crypto.subtle.verify(
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

const getAlgName = (alg: string) => {
  if (!alg) return 'HMACSHA256';
  const clean = alg.toUpperCase();
  if (clean === 'HS256') return 'HMACSHA256';
  if (clean === 'HS384') return 'HMACSHA384';
  if (clean === 'HS512') return 'HMACSHA512';
  if (clean === 'RS256') return 'RSASHA256';
  if (clean === 'ES256') return 'ECDSASHA256';
  return clean;
};

interface DecodedJWT {
  header: any;
  payload: any;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
  isValid: boolean;
  error?: string;
}

const decodeJWT = (token: string): DecodedJWT => {
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

// ==========================================
// Live Expiry Countdown Component
// ==========================================
const ExpiryCountdown: React.FC<{ exp: number }> = ({ exp }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = exp - now;
      setTimeLeft(diff);
      setIsExpired(diff <= 0);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [exp]);

  const formatDuration = (seconds: number) => {
    const absSec = Math.abs(seconds);
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  if (isExpired) {
    const elapsed = Math.abs(timeLeft);
    let timeString = '';
    if (elapsed < 60) {
      timeString = 'just now';
    } else if (elapsed < 3600) {
      timeString = `${Math.floor(elapsed / 60)}m ago`;
    } else if (elapsed < 86400) {
      timeString = `${Math.floor(elapsed / 3600)}h ago`;
    } else {
      timeString = `${Math.floor(elapsed / 86400)}d ago`;
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-xs md:text-sm font-mono">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span>🔴 Expired {timeString} (Unix: {exp})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-accent-emerald/10 border border-accent-emerald/20 rounded-lg text-accent-emerald text-xs md:text-sm font-mono">
      <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
      <span>Expires in: {formatDuration(timeLeft)} (Unix: {exp})</span>
    </div>
  );
};

// ==========================================
// Interactive JSON Node Component
// ==========================================
interface JsonNodeProps {
  value: any;
  nodeKey?: string;
  isLast?: boolean;
  indent?: number;
  onCopy: (text: string, label: string) => void;
}

const JsonNode: React.FC<JsonNodeProps> = ({ value, nodeKey, isLast = true, indent = 0, onCopy }) => {
  const [isCopied, setIsCopied] = useState(false);
  const indentStr = '  '.repeat(indent);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyVal = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    onCopy(copyVal, nodeKey || 'value');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const renderValue = () => {
    if (value === null) {
      return <span className="text-zinc-650">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-amber-500">{value ? 'true' : 'false'}</span>;
    }
    if (typeof value === 'number') {
      if (nodeKey === 'exp' || nodeKey === 'iat' || nodeKey === 'nbf') {
        const d = new Date(value * 1000);
        const dateStr = !isNaN(d.getTime()) ? d.toLocaleString() : 'Invalid Date';
        return (
          <span>
            <span className="text-amber-500">{value}</span>
            <span className="text-zinc-500 font-sans text-xs ml-2 select-none">
              // {dateStr}
            </span>
          </span>
        );
      }
      return <span className="text-amber-500">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-emerald-400">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      return (
        <span>
          <span className="text-zinc-500">[</span>
          <div className="pl-4 border-l border-zinc-800/40 my-0.5">
            {value.map((item, idx) => (
              <JsonNode
                key={idx}
                value={item}
                isLast={idx === value.length - 1}
                indent={indent + 1}
                onCopy={onCopy}
              />
            ))}
          </div>
          <span>{indentStr}]</span>
        </span>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span>{"{}"}</span>;
      return (
        <span>
          <span className="text-zinc-500">{"{"}</span>
          <div className="pl-4 border-l border-zinc-800/40 my-0.5">
            {keys.map((key, idx) => (
              <JsonNode
                key={key}
                nodeKey={key}
                value={value[key]}
                isLast={idx === keys.length - 1}
                indent={indent + 1}
                onCopy={onCopy}
              />
            ))}
          </div>
          <span>{indentStr}{"}"}</span>
        </span>
      );
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className="group/row relative py-0.5 font-mono text-sm md:text-base hover:bg-zinc-800/30 rounded px-1.5 transition-colors leading-relaxed">
      {nodeKey && (
        <span className="relative group/claim inline-block">
          <span className={`text-zinc-400 font-medium ${CLAIM_EXPLAINERS[nodeKey] ? 'underline decoration-dotted decoration-zinc-500 underline-offset-4 cursor-help hover:text-zinc-300 transition-colors' : ''}`}>
            "{nodeKey}"
          </span>
          {CLAIM_EXPLAINERS[nodeKey] && (
            <span className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 px-2.5 py-1.5 rounded-lg shadow-2xl opacity-0 group-hover/claim:opacity-100 transition-opacity duration-150 ease-in-out font-sans font-normal normal-case leading-normal">
              {CLAIM_EXPLAINERS[nodeKey]}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
            </span>
          )}
          <span className="text-zinc-600 font-bold">: </span>
        </span>
      )}
      {renderValue()}
      {!isLast && <span className="text-zinc-600">,</span>}

      {indent > 0 && (
        <button
          type="button"
          onClick={handleCopy}
          className="opacity-0 group-hover/row:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-zinc-800 border border-zinc-750 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-50 hover:bg-zinc-750 transition-all cursor-pointer font-sans select-none"
        >
          {isCopied ? (
            <>
              <svg className="w-3 h-3 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-accent-emerald font-medium">Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ==========================================
// Scroll-Synced Color-Coded Editor
// ==========================================
interface ColorCodedTextAreaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ColorCodedTextArea: React.FC<ColorCodedTextAreaProps> = ({
  value,
  onChange,
  placeholder,
  textareaRef,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.currentTarget.scrollTop;
      overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderColoredText = () => {
    if (!value) {
      return <span className="text-zinc-500">{placeholder}</span>;
    }

    const parts = value.split('.');
    if (parts.length < 2) {
      return <span className="text-zinc-200">{value}</span>;
    }

    const [header, payload, signature] = parts;
    return (
      <>
        <span className="text-red-400">{header}</span>
        <span className="text-zinc-600 font-bold">.</span>
        <span className="text-indigo-400">{payload}</span>
        {parts.length > 2 && (
          <>
            <span className="text-zinc-600 font-bold">.</span>
            <span className="text-amber-400">{signature}</span>
          </>
        )}
      </>
    );
  };

  return (
    <div className="relative w-full h-full font-mono text-sm md:text-base leading-relaxed overflow-hidden rounded-lg border border-border-hairline bg-canvas focus-within:border-zinc-750 focus-within:ring-1 focus-within:ring-zinc-750">
      {/* Background layer: colored text */}
      <div
        ref={overlayRef}
        className="absolute inset-0 p-4 whitespace-pre-wrap break-all pointer-events-none select-none text-transparent overflow-y-auto overflow-x-hidden font-mono leading-relaxed"
        style={{
          boxSizing: 'border-box',
          fontSize: 'inherit',
          lineHeight: '1.6',
        }}
      >
        {renderColoredText()}
      </div>

      {/* Front layer: transparent textarea for input & carets */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-zinc-100 resize-none outline-none p-4 overflow-y-auto overflow-x-hidden font-mono leading-relaxed break-all"
        style={{
          boxSizing: 'border-box',
          fontSize: 'inherit',
          lineHeight: '1.6',
          WebkitTextFillColor: 'transparent',
        }}
      />
    </div>
  );
};

// ==========================================
// Main JWT Decoder Component
// ==========================================
export const JwtDecoder: React.FC = () => {
  const [token, setToken] = useState<string>(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  );
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [headerStr, setHeaderStr] = useState<string>('');
  const [payloadStr, setPayloadStr] = useState<string>('');
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [headerMode, setHeaderMode] = useState<'edit' | 'tree'>('edit');
  const [payloadMode, setPayloadMode] = useState<'edit' | 'tree'>('edit');

  useEffect(() => {
    if (headerError) {
      setHeaderMode('edit');
    }
  }, [headerError]);

  useEffect(() => {
    if (payloadError) {
      setPayloadMode('edit');
    }
  }, [payloadError]);

  const lastEditedRef = useRef<'token' | 'json'>('token');

  const handleTokenChange = (val: string) => {
    lastEditedRef.current = 'token';
    setToken(extractToken(val));
  };
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Verification states
  const [secret, setSecret] = useState<string>('your-256-bit-secret'); // defaults to encoder default
  const [isBase64Secret, setIsBase64Secret] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isSigValid, setIsSigValid] = useState<boolean | null>(null);

  // Sync token and secret from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSecret = localStorage.getItem('useutils_jwt_secret');
    if (savedSecret !== null) {
      setSecret(savedSecret);
    }
    const saved = localStorage.getItem('useutils_jwt_token');
    if (saved && saved.split('.').length === 3) {
      lastEditedRef.current = 'token';
      setToken(saved);
      const result = decodeJWT(saved);
      setDecoded(result);
      if (result.isValid) {
        setHeaderStr(JSON.stringify(result.header, null, 2));
        setPayloadStr(JSON.stringify(result.payload, null, 2));
      }
    } else {
      // Decode default token
      const result = decodeJWT(token);
      setDecoded(result);
      if (result.isValid) {
        setHeaderStr(JSON.stringify(result.header, null, 2));
        setPayloadStr(JSON.stringify(result.payload, null, 2));
      }
    }
  }, []);

  // Save active token to localStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token && token.split('.').length === 3) {
      localStorage.setItem('useutils_jwt_token', token);
    }
  }, [token]);

  // Save active secret to localStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('useutils_jwt_secret', secret);
  }, [secret]);

  // Parse token on change & sync to JSON editor panes
  useEffect(() => {
    if (lastEditedRef.current !== 'token') return;

    if (!token.trim()) {
      setDecoded(null);
      setHeaderStr('');
      setPayloadStr('');
      setHeaderError(null);
      setPayloadError(null);
      return;
    }

    const result = decodeJWT(token);
    setDecoded(result);

    if (result.isValid) {
      setHeaderStr(JSON.stringify(result.header, null, 2));
      setPayloadStr(JSON.stringify(result.payload, null, 2));
      setHeaderError(null);
      setPayloadError(null);
    }
  }, [token]);

  // Re-encode & sign JWT when Header or Payload JSON is modified
  useEffect(() => {
    if (lastEditedRef.current !== 'json') return;

    const syncJSONToToken = async () => {
      if (!headerStr.trim() || !payloadStr.trim()) return;

      try {
        let parsedHeader;
        try {
          parsedHeader = JSON.parse(headerStr);
          setHeaderError(null);
        } catch (err: any) {
          setHeaderError(err.message || 'JSON Syntax Error');
          return;
        }

        let parsedPayload;
        try {
          parsedPayload = JSON.parse(payloadStr);
          setPayloadError(null);
        } catch (err: any) {
          setPayloadError(err.message || 'JSON Syntax Error');
          return;
        }

        const encodedHeader = base64UrlEncode(JSON.stringify(parsedHeader));
        const encodedPayload = base64UrlEncode(JSON.stringify(parsedPayload));
        const message = `${encodedHeader}.${encodedPayload}`;

        const alg = parsedHeader.alg || 'HS256';

        let newToken = '';
        if (alg === 'None' || alg === 'none') {
          newToken = `${message}.`;
        } else if (['HS256', 'HS384', 'HS512'].includes(alg)) {
          let hashAlg = 'SHA-256';
          if (alg === 'HS384') hashAlg = 'SHA-384';
          if (alg === 'HS512') hashAlg = 'SHA-512';

          const sig = await signHMAC(message, secret, isBase64Secret, hashAlg);
          newToken = `${message}.${sig}`;
        } else {
          // Asymmetric algorithm: preserve current signature segment if possible
          const currentParts = token.split('.');
          const currentSig = currentParts.length === 3 ? currentParts[2] : '';
          newToken = `${message}.${currentSig}`;
        }

        if (newToken !== token) {
          setToken(newToken);
        }
      } catch (err) {
        console.error('Failed to sync JSON to token:', err);
      }
    };

    syncJSONToToken();
  }, [headerStr, payloadStr, secret, isBase64Secret]);

  // Live Signature Verification Effect
  useEffect(() => {
    const checkSignature = async () => {
      if (!decoded || !decoded.isValid || !token) {
        setIsSigValid(null);
        return;
      }

      const parts = token.replace(/\s+/g, '').split('.');
      const [headerB64, payloadB64, signatureB64] = parts;
      const alg = decoded.header?.alg;

      if (!alg || alg === 'None') {
        setIsSigValid(signatureB64 === '');
        return;
      }

      if (!['HS256', 'HS384', 'HS512'].includes(alg)) {
        // Asymmetric algorithm
        setIsSigValid(null);
        return;
      }

      if (!secret) {
        setIsSigValid(null);
        return;
      }

      const valid = await verifyHMAC(headerB64, payloadB64, signatureB64, secret, isBase64Secret, alg);
      setIsSigValid(valid);
    };

    checkSignature();
  }, [token, decoded, secret, isBase64Secret]);

  // Global Keydown Esc to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        lastEditedRef.current = 'token';
        setToken('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerCopy = (text: string, label: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 1500);
    }
  };

  const handleClear = () => {
    lastEditedRef.current = 'token';
    setToken('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        lastEditedRef.current = 'token';
        setToken(extractToken(text));
      }
    } catch {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleReset = () => {
    lastEditedRef.current = 'token';
    const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const defaultSecret = 'your-256-bit-secret';

    setToken(defaultToken);
    setSecret(defaultSecret);
    setIsBase64Secret(false);

    const result = decodeJWT(defaultToken);
    setDecoded(result);
    if (result.isValid) {
      setHeaderStr(JSON.stringify(result.header, null, 2));
      setPayloadStr(JSON.stringify(result.payload, null, 2));
      setHeaderError(null);
      setPayloadError(null);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_jwt_token', defaultToken);
      localStorage.setItem('useutils_jwt_secret', defaultSecret);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Privacy Guarantee Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-lg px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-emerald"></span>
          </span>
          <span className="text-xs md:text-sm text-zinc-300 font-medium font-sans">
            Processed locally in browser. Zero server transmission.
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
          100% Privacy Assurance
        </div>
      </div>

      {/* Two-Column Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Side: Input Pane */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-2">
              Encoded Token
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded text-zinc-400 hover:text-zinc-50 transition-all cursor-pointer font-sans"
              >
                <span>Reset Default</span>
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
              >
                <span>Paste</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">
                  ⌘ V
                </kbd>
              </button>
              {token && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-850 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900/50 border border-zinc-750 rounded text-zinc-400 hover:text-red-700 dark:hover:text-red-400 transition-all cursor-pointer font-sans"
                >
                  <span>Clear</span>
                  <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">
                    Esc
                  </kbd>
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-grow min-h-[350px] lg:min-h-[500px] flex flex-col">
            <ColorCodedTextArea
              value={token}
              onChange={handleTokenChange}
              placeholder="Paste your encoded Header.Payload.Signature JWT token here..."
              textareaRef={textareaRef}
            />
          </div>
        </div>

        {/* Right Side: Output Pane */}
        <div className="flex flex-col gap-6">
          {!token.trim() ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center bg-panel border border-border-hairline rounded-lg p-8 min-h-[440px] lg:min-h-[580px] gap-4">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-750 flex items-center justify-center text-zinc-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5 font-sans">
                <h3 className="text-sm font-semibold text-zinc-300 font-mono">Awaiting Encoded JWT</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Paste a base64url encoded token in the left panel to inspect its claims, algorithm metadata, and expiration countdown.
                </p>
              </div>

              <div className="border-t border-border-hairline/60 pt-5 mt-2 w-full max-w-xs">
                <div className="flex flex-col gap-2.5 text-left text-xs font-mono text-zinc-500">
                  <div className="flex justify-between items-center">
                    <span>Clear workspace</span>
                    <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">Esc</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Paste token</span>
                    <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
                  </div>
                </div>
              </div>
            </div>
          ) : decoded && !decoded.isValid ? (
            /* Error State */
            <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-6 min-h-[440px] lg:min-h-[580px] gap-4">
              <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-semibold">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Parsing Error</span>
              </div>
              <p className="text-xs text-zinc-300 bg-red-400/10 border border-red-400/20 p-3.5 rounded-lg font-mono leading-relaxed">
                {decoded.error}
              </p>
              <div className="text-xs text-zinc-500 flex flex-col gap-2 mt-2 font-sans">
                <span className="font-semibold text-zinc-400">Common token issues:</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Token doesn't have 3 parts separated by dots.</li>
                  <li>Contains whitespace, quotes, or bearer prefix.</li>
                  <li>Base64url padding length or character encoding is corrupt.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Success State - Decoded Panels */
            <div className="flex flex-col gap-6">
              {decoded?.payload?.exp && (
                <ExpiryCountdown exp={Number(decoded.payload.exp)} />
              )}

              {/* Decoded Header */}
              <div className="flex flex-col bg-panel border border-border-hairline border-l-4 border-l-red-500/80 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 border-b border-border-hairline flex-wrap gap-2">
                  <h3 className="text-sm font-mono font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    Header
                    <span className="text-[10px] text-zinc-500 normal-case font-normal font-sans">
                      (Algorithm & Token Type)
                    </span>
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* View/Edit Toggle */}
                    <div className="bg-zinc-900 border border-border-hairline rounded p-0.5 inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setHeaderMode('edit')}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                          headerMode === 'edit' ? 'bg-zinc-800 text-zinc-50 shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => !headerError && setHeaderMode('tree')}
                        disabled={!!headerError}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                          headerError ? 'opacity-40 cursor-not-allowed text-zinc-500 border border-transparent' : 'cursor-pointer'
                        } ${
                          headerMode === 'tree' ? 'bg-zinc-800 text-zinc-50 shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        Tree
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerCopy(JSON.stringify(decoded?.header, null, 2), 'header')}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 cursor-pointer select-none font-sans"
                    >
                      {copyFeedback === 'header' ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-accent-emerald font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Header</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-panel flex flex-col gap-2">
                  {headerMode === 'edit' ? (
                    <textarea
                      value={headerStr}
                      onChange={(e) => {
                        lastEditedRef.current = 'json';
                        setHeaderStr(e.target.value);
                      }}
                      rows={4}
                      className="w-full bg-canvas/30 border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-sm md:text-base text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
                      placeholder="Header JSON"
                    />
                  ) : (
                    <div className="w-full bg-canvas/30 border border-border-hairline rounded-lg p-3 overflow-auto max-h-[200px]">
                      <JsonNode
                        value={decoded?.header}
                        onCopy={triggerCopy}
                      />
                    </div>
                  )}
                  {headerError && (
                    <div className="text-[10px] text-red-400 font-mono">
                      ⚠️ {headerError}
                    </div>
                  )}
                </div>
              </div>

              {/* Decoded Payload */}
              <div className="flex flex-col bg-panel border border-border-hairline border-l-4 border-l-indigo-500/80 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 border-b border-border-hairline flex-wrap gap-2">
                  <h3 className="text-sm font-mono font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    Payload
                    <span className="text-[10px] text-zinc-500 normal-case font-normal font-sans">
                      (Claims & Data)
                    </span>
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* View/Edit Toggle */}
                    <div className="bg-zinc-900 border border-border-hairline rounded p-0.5 inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setPayloadMode('edit')}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                          payloadMode === 'edit' ? 'bg-zinc-800 text-zinc-50 shadow-sm border border-zinc-750' : 'text-zinc-400 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => !payloadError && setPayloadMode('tree')}
                        disabled={!!payloadError}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                          payloadError ? 'opacity-40 cursor-not-allowed text-zinc-500 border border-transparent' : 'cursor-pointer'
                        } ${
                          payloadMode === 'tree' ? 'bg-zinc-800 text-zinc-50 shadow-sm border border-zinc-750' : 'text-zinc-400 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        Tree
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerCopy(JSON.stringify(decoded?.payload, null, 2), 'payload')}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 cursor-pointer select-none font-sans"
                    >
                      {copyFeedback === 'payload' ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-accent-emerald font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-panel flex flex-col gap-2">
                  {payloadMode === 'edit' ? (
                    <textarea
                      value={payloadStr}
                      onChange={(e) => {
                        lastEditedRef.current = 'json';
                        setPayloadStr(e.target.value);
                      }}
                      rows={8}
                      className="w-full bg-canvas/30 border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-sm md:text-base text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
                      placeholder="Payload JSON"
                    />
                  ) : (
                    <div className="w-full bg-canvas/30 border border-border-hairline rounded-lg p-3 overflow-auto max-h-[300px]">
                      <JsonNode
                        value={decoded?.payload}
                        onCopy={triggerCopy}
                      />
                    </div>
                  )}
                  {payloadError && (
                    <div className="text-[10px] text-red-400 font-mono">
                      ⚠️ {payloadError}
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Portion with Verification Panel */}
              <div className="flex flex-col bg-panel border border-border-hairline border-l-4 border-l-amber-500/80 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 border-b border-border-hairline">
                  <h3 className="text-sm font-mono font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    Signature
                    <span className="text-[10px] text-zinc-500 normal-case font-normal font-sans">
                      (Verification Status)
                    </span>
                  </h3>
                </div>
                          {/* Signature Verification Block */}
                <div className="px-4 py-4 bg-zinc-900/40 border-b border-border-hairline flex flex-col gap-4 font-sans">
                  {/* Header Row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                        JWT Signature Verification
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans italic font-normal">
                        (Optional)
                      </span>
                    </div>
                    {isSigValid === true ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Signature Verified
                      </span>
                    ) : isSigValid === false ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-400/10 border border-red-400/20 text-red-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Invalid Signature
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 border border-zinc-750 text-zinc-400">
                        Unverified (Enter Secret)
                      </span>
                    )}
                  </div>

                  {/* Verification Form */}
                  {['HS256', 'HS384', 'HS512'].includes(decoded?.header?.alg) ? (
                    <div className="flex flex-col gap-3.5">
                      {/* Pseudo-code signing section */}
                      <div className="font-mono text-sm text-zinc-300 p-4 bg-zinc-800/50 dark:bg-zinc-950/40 border border-border-hairline rounded-lg flex flex-col gap-1 leading-relaxed">
                        <div className="text-zinc-500 select-none">
                          {getAlgName(decoded?.header?.alg || 'HS256')}(
                        </div>
                        <div className="pl-6 select-none text-zinc-400">
                          base64UrlEncode(header) + "." +
                        </div>
                        <div className="pl-6 select-none text-zinc-400">
                          base64UrlEncode(payload),
                        </div>
                        <div className="pl-6 flex flex-wrap items-center gap-2 my-0.5">
                          <span className="text-zinc-500 font-sans text-xs uppercase tracking-wider font-semibold mr-1">Secret Key</span>
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="secret"
                            className="bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded px-3 py-1.5 text-zinc-300 transition-all focus:ring-1 focus:ring-zinc-750 font-mono text-sm min-w-[220px] flex-grow md:flex-none"
                          />
                        </div>
                        <div className="text-zinc-500 select-none">)</div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isBase64Secret}
                            onClick={() => setIsBase64Secret(!isBase64Secret)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isBase64Secret ? 'bg-accent-emerald' : 'bg-zinc-800 border-zinc-750'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-[#fafafa] shadow transition duration-200 ease-in-out ${
                                isBase64Secret ? 'translate-x-4 bg-zinc-950' : 'translate-x-0 bg-zinc-400'
                              }`}
                            />
                          </button>
                          <span
                            className="text-xs text-zinc-400 select-none cursor-pointer hover:text-zinc-300 transition-colors"
                            onClick={() => setIsBase64Secret(!isBase64Secret)}
                          >
                            Base64URL Encoded
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 font-sans cursor-pointer transition-colors"
                        >
                          {showSecret ? 'Hide secret key' : 'Show secret key'}
                        </button>
                      </div>

                      {/* Copy / Clear buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => triggerCopy(secret, 'secret')}
                          disabled={!secret}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 disabled:hover:bg-zinc-800 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans disabled:cursor-not-allowed"
                        >
                          {copyFeedback === 'secret' ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-accent-emerald font-semibold">Key Copied</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSecret('')}
                          disabled={!secret}
                          className="px-3 py-1.5 text-xs bg-zinc-850 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:hover:bg-zinc-850 hover:border-red-200 dark:hover:border-red-900/50 border border-zinc-750 rounded text-zinc-400 hover:text-red-700 dark:hover:text-red-400 transition-all cursor-pointer font-sans disabled:cursor-not-allowed"
                        >
                          Clear Key
                        </button>
                      </div>
                    </div>
                  ) : decoded?.header?.alg === 'None' ? (
                    <div className="text-xs text-zinc-500 font-sans leading-relaxed">
                      This is an unsigned token (alg: None). No signature verification is required.
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 font-sans leading-relaxed flex flex-col gap-2">
                      <span>
                        Asymmetric algorithm <strong>{decoded?.header?.alg}</strong> detected. Signature verification requires a public key.
                      </span>
                      <textarea
                        readOnly
                        value="Public key verification (RSA/ECDSA) is currently under development. Symmetric HS256/384/512 algorithms are fully verifiable."
                        className="w-full bg-canvas/30 border border-dashed border-zinc-800 rounded p-2 text-[10px] text-zinc-650 font-mono leading-relaxed resize-none outline-none"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Bottom helper info */}
                  <div className="text-[11px] text-zinc-500 mt-1 font-sans">
                    Enter a secret to verify the JWT signature.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
