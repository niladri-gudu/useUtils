import React, { useState } from 'react';
import { format } from 'sql-formatter';

const LANGUAGES = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL / MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'tsql', label: 'SQL Server (T-SQL)' },
  { value: 'oracle', label: 'Oracle PL/SQL' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'redshift', label: 'Redshift' },
  { value: 'spark', label: 'Spark SQL' },
  { value: 'hive', label: 'Hive' },
  { value: 'n1ql', label: 'N1QL (Couchbase)' },
  { value: 'trino', label: 'Trino / Presto' },
  { value: 'singlestoredb', label: 'SingleStore' }
];

const KEYWORD_CASES = [
  { value: 'upper', label: 'UPPER' },
  { value: 'lower', label: 'lower' },
  { value: 'preserve', label: 'Preserve' },
  { value: 'camel', label: 'camelCase' }
];

const INDENT_STYLES = [
  { value: 'standard', label: 'Standard' },
  { value: 'tabularLeft', label: 'Tabular Left' },
  { value: 'tabularRight', label: 'Tabular Right' }
];

export default function SqlFormatter() {
  const [input, setInput] = useState<string>("SELECT id, name, email FROM users WHERE active = 1 AND created_at > '2024-01-01' ORDER BY name ASC LIMIT 20;");
  const [output, setOutput] = useState<string>('');
  const [language, setLanguage] = useState('sql');
  const [tabWidth, setTabWidth] = useState(2);
  const [keywordCase, setKeywordCase] = useState('upper');
  const [indentStyle, setIndentStyle] = useState('standard');
  const [linesBetweenQueries, setLinesBetweenQueries] = useState(1);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const runFormat = () => {
    setError('');
    setCopied(false);
    if (!input.trim()) {
      setError('Enter SQL to format.');
      setOutput('');
      return;
    }
    try {
      const formatted = format(input, {
        language,
        tabWidth,
        keywordCase,
        indentStyle,
        linesBetweenQueries
      });
      setOutput(formatted);
    } catch (e: any) {
      setError(e?.message || 'Failed to format SQL.');
      setOutput('');
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not access clipboard.');
    }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const inputSize = new TextEncoder().encode(input).length;
  const outputSize = new TextEncoder().encode(output).length;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Input */}
        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">SQL Input</span>
            <span className="text-[10px] font-mono text-zinc-500">{inputSize.toLocaleString()} B</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste your SQL query here…"
            className="w-full h-72 bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput(`SELECT c.name, COUNT(o.id) AS orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.country = 'US' GROUP BY c.id HAVING COUNT(o.id) > 5 ORDER BY orders DESC;`)}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Sample Query
            </button>
            <button
              type="button"
              onClick={() => { setInput(''); setOutput(''); setError(''); }}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2 bg-panel border border-border-hairline rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Formatted Output</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500">{outputSize.toLocaleString()} B</span>
              <button
                type="button"
                onClick={copyOutput}
                disabled={!output}
                className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output}
                className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 cursor-pointer font-mono disabled:opacity-30 disabled:pointer-events-none"
              >
                ⬇️
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            placeholder="Formatted SQL appears here…"
            className="w-full h-72 bg-canvas border border-border-hairline text-accent-emerald font-mono text-xs leading-relaxed rounded-lg p-3 outline-none resize-y focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Options */}
      <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Dialect</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-2.5 py-2 outline-none focus:border-accent-emerald/40 cursor-pointer"
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Keyword Case</label>
            <select
              value={keywordCase}
              onChange={(e) => setKeywordCase(e.target.value)}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-2.5 py-2 outline-none focus:border-accent-emerald/40 cursor-pointer"
            >
              {KEYWORD_CASES.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Indent Style</label>
            <select
              value={indentStyle}
              onChange={(e) => setIndentStyle(e.target.value)}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-xs rounded-lg px-2.5 py-2 outline-none focus:border-accent-emerald/40 cursor-pointer"
            >
              {INDENT_STYLES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Tab Width: {tabWidth}</label>
            <input
              type="range"
              min={1}
              max={8}
              value={tabWidth}
              onChange={(e) => setTabWidth(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Lines Between Queries</label>
            <input
              type="range"
              min={0}
              max={3}
              value={linesBetweenQueries}
              onChange={(e) => setLinesBetweenQueries(parseInt(e.target.value))}
              className="w-full accent-accent-emerald cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={runFormat}
          className="w-full bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono font-semibold text-xs py-3 rounded-lg transition-all shadow-md active:scale-98 cursor-pointer"
        >
          ✨ Format SQL
        </button>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono rounded-lg p-3">
          ⚠️ {error}
        </div>
      )}

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Processed locally in browser. Your SQL never leaves your device.
      </div>
    </div>
  );
}
