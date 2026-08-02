import React, { useState, useMemo } from 'react';

interface Strength {
  score: number;
  label: string;
  color: string;
  crackTime: string;
  suggestions: string[];
}

const WEAK = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

const crackEstimate = (pool: number, length: number): string => {
  if (pool === 0 || length === 0) return '—';
  const guessesPerSecond = 1e10;
  const space = Math.pow(pool, length);
  const seconds = space / guessesPerSecond;
  if (seconds < 60) return 'instantly';
  if (seconds < 3600) return 'under an hour';
  if (seconds < 86400) return 'under a day';
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / (86400 * 30))} months`;
  if (seconds < 86400 * 365 * 1000) return `${Math.round(seconds / (86400 * 365))} years`;
  if (seconds < 86400 * 365 * 1e6) return `${Math.round(seconds / (86400 * 365 * 1000))} thousand years`;
  if (seconds < 86400 * 365 * 1e9) return `${Math.round(seconds / (86400 * 365 * 1e6))} million years`;
  return 'heat death of the universe';
};

const evaluate = (pw: string): Strength => {
  if (!pw) {
    return { score: 0, label: 'Empty', color: '#71717a', crackTime: '—', suggestions: [] };
  }

  const length = pw.length;
  const hasLower = WEAK.test(pw);
  const hasUpper = UPPER.test(pw);
  const hasDigit = DIGIT.test(pw);
  const hasSymbol = SYMBOL.test(pw);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;

  let score = 0;
  const suggestions: string[] = [];

  if (length >= 8) score += 2;
  else if (length >= 5) score += 1;

  if (length >= 12) score += 1;
  if (length >= 16) score += 1;

  let classes = 0;
  if (hasLower) classes++;
  if (hasUpper) classes++;
  if (hasDigit) classes++;
  if (hasSymbol) classes++;
  score += classes >= 3 ? 2 : classes === 2 ? 1 : 0;

  if (/^[A-Za-z]+$/.test(pw) && length >= 8) suggestions.push('Add numbers or symbols.');
  if (!hasUpper) suggestions.push('Add at least one uppercase letter.');
  if (!hasDigit) suggestions.push('Add at least one number.');
  if (!hasSymbol) suggestions.push('Add at least one symbol.');
  if (length < 8) suggestions.push('Use at least 8 characters.');
  if (/(.)\1{2,}/.test(pw)) suggestions.push('Avoid repeating characters like "aaa".');
  if (/^(0123456789|12345678|abcdefgh|qwertyui|password|letmein|iloveyou)$/i.test(pw)) suggestions.push('This is an extremely common password.');
  if (/(?:19|20)\d{2}/.test(pw)) suggestions.push('Avoid years like "1995" — they are guessed quickly.');
  if (/([A-Za-z]{4,})\1/i.test(pw)) suggestions.push('Avoid repeating words.');
  if (pw.length > 0 && /^[0-9]+$/.test(pw)) suggestions.push('Numeric-only passwords are trivial to crack.');

  score = Math.max(0, Math.min(4, Math.round(score / 2)));

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return { score, label: labels[score], color: colors[score], crackTime: crackEstimate(pool, length), suggestions };
};

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', '123456789', 'qwerty', 'abc123',
  'password1', '1234567890', 'iloveyou', 'admin', 'welcome', 'letmein',
  'monkey', 'dragon', 'football', 'baseball', 'sunshine', '123123'
];

export default function PasswordStrengthChecker() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [generated, setGenerated] = useState('');

  const result = useMemo(() => evaluate(password), [password]);
  const pct = Math.max(0, Math.round((result.score / 4) * 100));

  const isCommon = useMemo(
    () => COMMON_PASSWORDS.includes(password.toLowerCase()),
    [password]
  );

  const generate = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = lower.toUpperCase();
    const digits = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{};:,.?/';
    const all = lower + upper + digits + symbols;
    const crypto = window.crypto || (window as any).msCrypto;
    const rand = (n: number) => {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] % n;
    };
    let p = '';
    p += lower[rand(lower.length)];
    p += upper[rand(upper.length)];
    p += digits[rand(digits.length)];
    p += symbols[rand(symbols.length)];
    while (p.length < 20) p += all[rand(all.length)];
    p = p.split('').sort(() => rand(2) - rand(2)).join('');
    setGenerated(p);
  };

  const copyGenerated = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
    } catch { /* ignore */ }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Enter a password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type or paste a password to test…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-3 pr-24 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {password && (
            <p className="text-[10px] text-zinc-500 font-mono">
              {password.length} characters • {isCommon ? <span className="text-red-400">This is a very common password</span> : 'Not found in the common-password list'}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Strength</span>
            <span className="text-xs font-mono font-bold" style={{ color: result.color }}>
              {password ? result.label : '—'}
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex gap-1 p-0.5">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-200"
                style={{ backgroundColor: i < result.score ? result.color : '#3f3f46' }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0%</span>
            <span>{pct}%</span>
            <span>100%</span>
          </div>
        </div>

        {password && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { label: 'Length', value: password.length, ok: password.length >= 8 },
              { label: 'Lowercase', value: /[a-z]/.test(password) ? 'Yes' : 'No', ok: /[a-z]/.test(password) },
              { label: 'Uppercase', value: /[A-Z]/.test(password) ? 'Yes' : 'No', ok: /[A-Z]/.test(password) },
              { label: 'Numbers', value: /[0-9]/.test(password) ? 'Yes' : 'No', ok: /[0-9]/.test(password) },
              { label: 'Symbols', value: /[^A-Za-z0-9]/.test(password) ? 'Yes' : 'No', ok: /[^A-Za-z0-9]/.test(password) }
            ].map(c => (
              <div key={c.label} className={`bg-zinc-900/30 border rounded-lg p-2.5 flex flex-col gap-1 ${c.ok ? 'border-accent-emerald/30' : 'border-red-900/30'}`}>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">{c.label}</span>
                <span className={`text-xs font-mono font-semibold ${c.ok ? 'text-accent-emerald' : 'text-red-400'}`}>{c.value}</span>
              </div>
            ))}
            <div className="bg-zinc-900/30 border border-border-hairline rounded-lg p-2.5 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Est. crack time</span>
              <span className="text-xs font-mono font-semibold text-zinc-200">{result.crackTime}</span>
            </div>
          </div>
        )}

        {result.suggestions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Suggestions</span>
            <ul className="flex flex-col gap-1">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-xs font-mono text-zinc-400 flex items-start gap-2">
                  <span className="text-amber-500">›</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Strong Password Generator</span>
          <button
            type="button"
            onClick={generate}
            className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
          >
            🎲 Generate
          </button>
        </div>
        {generated ? (
          <div className="flex items-center gap-2 bg-canvas border border-border-hairline rounded-lg px-3 py-2.5">
            <span className="font-mono text-sm text-accent-emerald flex-1 break-all">{generated}</span>
            <button
              type="button"
              onClick={copyGenerated}
              className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="text-xs font-mono text-zinc-500">A 20-character password with upper/lowercase, numbers, and symbols appears here.</p>
        )}
      </div>

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Processed locally in browser. Your password never leaves your device.
      </div>
    </div>
  );
}
