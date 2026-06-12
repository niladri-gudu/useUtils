import React, { useState, useEffect, useRef } from 'react';
import { 
  base64UrlEncode, 
  base64UrlDecode, 
  signHMAC 
} from '../utils-engine/jwt';

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
// Mock Profile Generator Constants & Helpers
// ==========================================
const MOCK_PROFILES = [
  {
    sub: 'usr_9j2k3l4m5n6p',
    name: 'Sarah Connor',
    email: 's.connor@cyberdyne.io',
    role: 'system_administrator',
    permissions: ['read:all', 'write:configs', 'deploy:nodes', 'restart:services'],
    iss: 'https://auth.cyberdyne.io',
    aud: 'cyberdyne-cloud-platform',
  },
  {
    sub: 'usr_8f7g6h5j4k3l',
    name: 'Tony Stark',
    email: 'tony@starkindustries.com',
    role: 'billing_manager',
    permissions: ['read:invoices', 'approve:budget', 'pay:vendors'],
    iss: 'https://identity.starkindustries.com',
    aud: 'stark-internal-portal',
  },
  {
    sub: 'usr_1a2b3c4d5e6f',
    name: 'Bruce Wayne',
    email: 'bwayne@waynecorp.org',
    role: 'security_auditor',
    permissions: ['read:logs', 'audit:vault', 'decrypt:payloads'],
    iss: 'https://waynecorp.org/oauth',
    aud: 'wayne-security-vault',
  },
  {
    sub: 'usr_4p5q6r7s8t9u',
    name: 'Alan Turing',
    email: 'turing@bletchleypark.org',
    role: 'senior_developer',
    permissions: ['read:repos', 'write:code', 'merge:pull_requests'],
    iss: 'https://bletchley.ac.uk',
    aud: 'decryption-service',
  }
];

// ==========================================
// Main JWT Encoder Component
// ==========================================
export const JwtEncoder: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<string>('HS256');
  const [headerStr, setHeaderStr] = useState<string>(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2)
  );
  const [payloadStr, setPayloadStr] = useState<string>(
    JSON.stringify(
      {
        sub: '1234567890',
        name: 'John Doe',
        admin: true,
        iat: 1516239022,
      },
      null,
      2
    )
  );
  const [secret, setSecret] = useState<string>('your-256-bit-secret');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [encodedToken, setEncodedToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSecret = localStorage.getItem('useutils_jwt_secret');
    if (savedSecret !== null) {
      setSecret(savedSecret);
    }
    const saved = localStorage.getItem('useutils_jwt_token');
    if (saved) {
      try {
        const parts = saved.split('.');
        if (parts.length === 3) {
          const headerObj = JSON.parse(base64UrlDecode(parts[0]));
          const payloadObj = JSON.parse(base64UrlDecode(parts[1]));
          
          if (headerObj.alg) {
            setAlgorithm(headerObj.alg);
          }
          setHeaderStr(JSON.stringify(headerObj, null, 2));
          setPayloadStr(JSON.stringify(payloadObj, null, 2));
        }
      } catch (e) {
        console.error('Failed to parse saved token in Encoder:', e);
      }
    }
  }, []);

  // Save generated token to localStorage for Decoder page sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (encodedToken) {
      localStorage.setItem('useutils_jwt_token', encodedToken);
    }
  }, [encodedToken]);

  // Save secret key to localStorage for Decoder page sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('useutils_jwt_secret', secret);
  }, [secret]);

  const injectMockProfile = () => {
    try {
      const randomIdx = Math.floor(Math.random() * MOCK_PROFILES.length);
      const profile = MOCK_PROFILES[randomIdx];
      const now = Math.floor(Date.now() / 1000);
      
      const newPayload = {
        ...profile,
        iat: now,
        exp: now + 86400, // 24 hours
        jti: 'jti_' + Math.random().toString(36).substring(2, 15),
      };
      
      setPayloadStr(JSON.stringify(newPayload, null, 2));
      setError(null);
    } catch {
      setError('Failed to inject mock profile.');
    }
  };

  // Synchronize inputs and generate signed token
  useEffect(() => {
    const generateToken = async () => {
      setError(null);
      try {
        let parsedHeader;
        try {
          parsedHeader = JSON.parse(headerStr);
        } catch {
          setError('Header pane contains invalid JSON syntax.');
          return;
        }

        let parsedPayload;
        try {
          parsedPayload = JSON.parse(payloadStr);
        } catch {
          setError('Payload pane contains invalid JSON syntax.');
          return;
        }

        // Sync dropdown algorithm with header JSON "alg" key
        if (parsedHeader.alg !== algorithm) {
          const updatedHeader = { ...parsedHeader, alg: algorithm };
          setHeaderStr(JSON.stringify(updatedHeader, null, 2));
          parsedHeader = updatedHeader;
        }

        const encodedHeader = base64UrlEncode(JSON.stringify(parsedHeader));
        const encodedPayload = base64UrlEncode(JSON.stringify(parsedPayload));
        const message = `${encodedHeader}.${encodedPayload}`;

        if (algorithm === 'None') {
          setEncodedToken(`${message}.`);
          return;
        }

        let hashAlg = 'SHA-256';
        if (algorithm === 'HS384') hashAlg = 'SHA-384';
        if (algorithm === 'HS512') hashAlg = 'SHA-512';

        const signature = await signHMAC(message, secret, hashAlg);
        setEncodedToken(`${message}.${signature}`);
      } catch (err: any) {
        setError(`Encoding failed: ${err.message || 'Signature calculation error.'}`);
      }
    };

    generateToken();
  }, [headerStr, payloadStr, secret, algorithm]);

  const handleHeaderChange = (newVal: string) => {
    setHeaderStr(newVal);
    try {
      const parsed = JSON.parse(newVal);
      if (parsed.alg && ['HS256', 'HS384', 'HS512', 'None'].includes(parsed.alg)) {
        setAlgorithm(parsed.alg);
      }
    } catch {
      // Ignore parse failure while user is actively typing
    }
  };

  const handleAlgChange = (newAlg: string) => {
    setAlgorithm(newAlg);
    try {
      const parsed = JSON.parse(headerStr);
      if (parsed.alg !== newAlg) {
        parsed.alg = newAlg;
        setHeaderStr(JSON.stringify(parsed, null, 2));
      }
    } catch {
      // If header string is invalid JSON, rebuild it from template
      setHeaderStr(JSON.stringify({ alg: newAlg, typ: 'JWT' }, null, 2));
    }
  };

  const setIatNow = () => {
    try {
      const parsed = JSON.parse(payloadStr);
      parsed.iat = Math.floor(Date.now() / 1000);
      setPayloadStr(JSON.stringify(parsed, null, 2));
    } catch {
      setError('Cannot inject iat. Please fix Payload JSON formatting first.');
    }
  };

  const addExpOneHour = () => {
    try {
      const parsed = JSON.parse(payloadStr);
      parsed.exp = Math.floor(Date.now() / 1000) + 3600;
      setPayloadStr(JSON.stringify(parsed, null, 2));
    } catch {
      setError('Cannot inject exp. Please fix Payload JSON formatting first.');
    }
  };

  const copyToken = () => {
    const success = copyToClipboard(encodedToken);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleReset = () => {
    const defaultHeader = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
    const defaultPayload = JSON.stringify(
      {
        sub: '1234567890',
        name: 'John Doe',
        admin: true,
        iat: 1516239022,
      },
      null,
      2
    );
    const defaultSecret = 'your-256-bit-secret';
    const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

    setAlgorithm('HS256');
    setHeaderStr(defaultHeader);
    setPayloadStr(defaultPayload);
    setSecret(defaultSecret);
    setError(null);

    if (typeof window !== 'undefined') {
      localStorage.setItem('useutils_jwt_token', defaultToken);
      localStorage.setItem('useutils_jwt_secret', defaultSecret);
    }
  };

  const renderColoredToken = (tokenStr: string) => {
    const parts = tokenStr.split('.');
    if (parts.length < 2) return <span className="text-zinc-400">{tokenStr}</span>;

    const [header, payload, signature] = parts;
    return (
      <div className="font-mono text-xs md:text-sm break-all leading-relaxed whitespace-pre-wrap select-all selection:bg-emerald-400/20">
        <span className="text-red-400" title="Header (base64url encoded)">{header}</span>
        <span className="text-zinc-600 font-bold">.</span>
        <span className="text-indigo-400" title="Payload (base64url encoded)">{payload}</span>
        {parts.length > 2 && (
          <>
            <span className="text-zinc-600 font-bold">.</span>
            <span className="text-amber-400" title="Signature (cryptographic hash)">{signature}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Two Column Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-5 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Token Settings & JSON Primitives
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
            >
              Reset Default
            </button>
          </div>

          {/* Algorithm Choice */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-zinc-400 font-semibold">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => handleAlgChange(e.target.value)}
              className="bg-canvas border border-border-hairline text-zinc-300 rounded px-3 py-1.5 text-sm outline-none focus:border-zinc-750 font-mono"
            >
              <option value="HS256">HS256 (HMAC using SHA-256)</option>
              <option value="HS384">HS384 (HMAC using SHA-384)</option>
              <option value="HS512">HS512 (HMAC using SHA-512)</option>
              <option value="None">None (Unsigned Token)</option>
            </select>
          </div>

          {/* Header Inputs */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-zinc-400 font-semibold">Header (JSON)</label>
            <textarea
              value={headerStr}
              onChange={(e) => handleHeaderChange(e.target.value)}
              rows={4}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
            />
          </div>

          {/* Payload Inputs */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-zinc-400 font-semibold">Payload (JSON)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={setIatNow}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-750 cursor-pointer transition-colors"
                  >
                    Set iat (now)
                  </button>
                  <button
                    type="button"
                    onClick={addExpOneHour}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-750 cursor-pointer transition-colors"
                  >
                    Add exp (+1h)
                  </button>
                  <button
                    type="button"
                    onClick={injectMockProfile}
                    className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-750 cursor-pointer transition-colors"
                  >
                    Mock Profile
                  </button>
                </div>
            </div>
            <textarea
              value={payloadStr}
              onChange={(e) => setPayloadStr(e.target.value)}
              rows={8}
              className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-750"
            />
          </div>

          {/* Key Secret */}
          {algorithm !== 'None' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-zinc-400 font-semibold">HMAC Secret Key</label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-50 font-sans cursor-pointer"
                >
                  {showSecret ? 'Hide key' : 'Show key'}
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-canvas border border-border-hairline focus:border-zinc-750 outline-none rounded px-3 py-1.5 font-mono text-xs md:text-sm text-zinc-200 transition-all focus:ring-1 focus:ring-zinc-750"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-lg font-mono leading-relaxed mt-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Right Column: Output */}
        <div className="flex flex-col bg-panel border border-border-hairline rounded-lg p-5 gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Encoded JWT Output
            </h2>
            <button
              type="button"
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 rounded text-zinc-300 hover:text-zinc-50 transition-all cursor-pointer font-sans"
            >
              {copyFeedback ? (
                <>
                  <svg className="w-3.5 h-3.5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-accent-emerald font-semibold">Token Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Token</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-grow bg-canvas border border-border-hairline rounded-lg p-4 h-[350px] lg:h-[500px] overflow-y-auto">
            {encodedToken ? (
              renderColoredToken(encodedToken)
            ) : (
              <span className="text-zinc-650 font-mono text-sm">Waiting for JSON settings...</span>
            )}
          </div>

          <div className="border-t border-border-hairline/60 pt-4 mt-1 flex flex-col gap-2">
            <div className="flex gap-2.5 items-start text-xs text-zinc-500 font-sans leading-relaxed">
              <svg className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                The colors in the output block correlate to the parts of the token:{' '}
                <span className="text-red-400 font-mono">Header</span>,{' '}
                <span className="text-indigo-400 font-mono">Payload</span>, and{' '}
                <span className="text-amber-400 font-mono">Signature</span>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
