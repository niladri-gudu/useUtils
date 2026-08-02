import React, { useState, useMemo } from 'react';

interface StatusInfo {
  code: number;
  name: string;
  class: string;
  classColor: string;
  description: string;
  emoji: string;
}

const STATUS: StatusInfo[] = [
  { code: 100, name: 'Continue', class: 'Informational', classColor: '#38bdf8', emoji: 'ℹ️', description: 'The server received the request headers and the client should proceed with sending the body.' },
  { code: 101, name: 'Switching Protocols', class: 'Informational', classColor: '#38bdf8', emoji: '🔁', description: 'The server is switching protocols as requested by the client, e.g. upgrading to WebSocket.' },
  { code: 102, name: 'Processing', class: 'Informational', classColor: '#38bdf8', emoji: '⏳', description: 'The server has received and is processing the request, but no response is available yet.' },
  { code: 200, name: 'OK', class: 'Success', classColor: '#22c55e', emoji: '✅', description: 'The request succeeded. The meaning of the payload depends on the HTTP method used.' },
  { code: 201, name: 'Created', class: 'Success', classColor: '#22c55e', emoji: '📝', description: 'The request succeeded and a new resource was created, usually after a POST or PUT.' },
  { code: 202, name: 'Accepted', class: 'Success', classColor: '#22c55e', emoji: '📨', description: 'The request was accepted for processing, but processing is not yet complete.' },
  { code: 204, name: 'No Content', class: 'Success', classColor: '#22c55e', emoji: '🫥', description: 'The request succeeded but there is no content to send in the response body.' },
  { code: 206, name: 'Partial Content', class: 'Success', classColor: '#22c55e', emoji: '🔀', description: 'The server is delivering only part of the resource, as requested with a Range header.' },
  { code: 300, name: 'Multiple Choices', class: 'Redirection', classColor: '#a78bfa', emoji: '🔀', description: 'The request has multiple possible responses; the client should choose one.' },
  { code: 301, name: 'Moved Permanently', class: 'Redirection', classColor: '#a78bfa', emoji: '↩️', description: 'The resource has moved permanently to the URL in the Location header.' },
  { code: 302, name: 'Found', class: 'Redirection', classColor: '#a78bfa', emoji: '↩️', description: 'The resource is temporarily found at a different URL. Browsers follow the Location header.' },
  { code: 303, name: 'See Other', class: 'Redirection', classColor: '#a78bfa', emoji: '👀', description: 'The response to the request can be found at another URL, fetched with GET.' },
  { code: 304, name: 'Not Modified', class: 'Redirection', classColor: '#a78bfa', emoji: '♻️', description: 'The cached copy is still valid; the server sends no body. Used for conditional requests.' },
  { code: 307, name: 'Temporary Redirect', class: 'Redirection', classColor: '#a78bfa', emoji: '⏱️', description: 'A temporary redirect that preserves the HTTP method and body of the original request.' },
  { code: 308, name: 'Permanent Redirect', class: 'Redirection', classColor: '#a78bfa', emoji: '🔁', description: 'A permanent redirect that preserves the HTTP method and body of the original request.' },
  { code: 400, name: 'Bad Request', class: 'Client Error', classColor: '#f97316', emoji: '⚠️', description: 'The server cannot process the request due to a client error like malformed syntax.' },
  { code: 401, name: 'Unauthorized', class: 'Client Error', classColor: '#f97316', emoji: '🔒', description: 'Authentication is required and has not been provided, or the credentials are invalid.' },
  { code: 403, name: 'Forbidden', class: 'Client Error', classColor: '#f97316', emoji: '🚫', description: 'The server understood the request but refuses to authorize it. Auth will not help.' },
  { code: 404, name: 'Not Found', class: 'Client Error', classColor: '#f97316', emoji: '🕳️', description: 'The server cannot find the requested resource. The most famous HTTP status code.' },
  { code: 405, name: 'Method Not Allowed', class: 'Client Error', classColor: '#f97316', emoji: '🚷', description: 'The HTTP method is not supported for the requested resource (e.g. DELETE on a read-only path).' },
  { code: 408, name: 'Request Timeout', class: 'Client Error', classColor: '#f97316', emoji: '⏰', description: 'The server timed out waiting for the request from the client.' },
  { code: 409, name: 'Conflict', class: 'Client Error', classColor: '#f97316', emoji: '⚡', description: 'The request conflicts with the current state of the resource (e.g. duplicate record).' },
  { code: 410, name: 'Gone', class: 'Client Error', classColor: '#f97316', emoji: '👻', description: 'The resource is gone and will not return. Unlike 404, the resource intentionally existed.' },
  { code: 413, name: 'Payload Too Large', class: 'Client Error', classColor: '#f97316', emoji: '🐘', description: 'The request payload is larger than the server is willing or able to process.' },
  { code: 415, name: 'Unsupported Media Type', class: 'Client Error', classColor: '#f97316', emoji: '🧱', description: 'The media type of the request body is not supported by the server.' },
  { code: 418, name: "I'm a teapot", class: 'Client Error', classColor: '#f97316', emoji: '🫖', description: 'The server refuses to brew coffee because it is, permanently, a teapot. An April Fools joke (RFC 2324).' },
  { code: 422, name: 'Unprocessable Entity', class: 'Client Error', classColor: '#f97316', emoji: '📦', description: 'The request is well-formed but contains semantic errors (common in API validation).' },
  { code: 429, name: 'Too Many Requests', class: 'Client Error', classColor: '#f97316', emoji: '🐢', description: 'The client sent too many requests in a given time window (rate limiting).' },
  { code: 500, name: 'Internal Server Error', class: 'Server Error', classColor: '#ef4444', emoji: '💥', description: 'An unexpected condition prevented the server from fulfilling the request.' },
  { code: 501, name: 'Not Implemented', class: 'Server Error', classColor: '#ef4444', emoji: '🧩', description: 'The server does not support the functionality required to fulfill the request.' },
  { code: 502, name: 'Bad Gateway', class: 'Server Error', classColor: '#ef4444', emoji: '🌉', description: 'An upstream server returned an invalid response while acting as a gateway or proxy.' },
  { code: 503, name: 'Service Unavailable', class: 'Server Error', classColor: '#ef4444', emoji: '🛠️', description: 'The server is not ready to handle the request, often due to maintenance or overload.' },
  { code: 504, name: 'Gateway Timeout', class: 'Server Error', classColor: '#ef4444', emoji: '⏳', description: 'A gateway or proxy did not receive a timely response from an upstream server.' }
];

const CLASSES = ['All', 'Informational', 'Success', 'Redirection', 'Client Error', 'Server Error'];

const findByCode = (code: number) => STATUS.find(s => s.code === code);

export default function HttpStatusCodes() {
  const [query, setQuery] = useState('');
  const [activeClass, setActiveClass] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STATUS.filter(s => {
      const matchesClass = activeClass === 'All' || s.class === activeClass;
      const matchesQuery =
        !q ||
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [query, activeClass]);

  const parsed = parseInt(query, 10);
  const exact = !isNaN(parsed) ? findByCode(parsed) : undefined;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Quick lookup */}
      <div className="bg-panel border border-border-hairline rounded-lg p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Quick lookup</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code or name — e.g. 404, redirect, gateway…"
            className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-3 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20 placeholder-zinc-600"
          />
        </div>
        {exact && (
          <div className={`flex flex-col gap-1.5 rounded-lg border p-4 ${exact.classColor === '#38bdf8' ? 'border-sky-500/30 bg-sky-500/5' : exact.classColor === '#22c55e' ? 'border-emerald-500/30 bg-emerald-500/5' : exact.classColor === '#a78bfa' ? 'border-violet-500/30 bg-violet-500/5' : exact.classColor === '#f97316' ? 'border-orange-500/30 bg-orange-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{exact.emoji}</span>
              <span className="text-2xl font-mono font-bold" style={{ color: exact.classColor }}>{exact.code}</span>
              <span className="text-sm font-mono text-zinc-200 font-semibold">{exact.name}</span>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: exact.classColor, borderColor: exact.classColor + '55' }}>
                {exact.class}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">{exact.description}</p>
          </div>
        )}
      </div>

      {/* Class filter */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-900 border border-border-hairline/60 p-1 rounded-lg w-full">
        {CLASSES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveClass(c)}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-mono select-none cursor-pointer border transition-all whitespace-nowrap ${
              activeClass === c
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            {c} ({c === 'All' ? STATUS.length : STATUS.filter(s => s.class === c).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(s => (
          <div key={s.code} className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-2 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{s.emoji}</span>
              <span className="text-lg font-mono font-bold" style={{ color: s.classColor }}>{s.code}</span>
              <span className="text-xs font-mono text-zinc-200 font-semibold truncate">{s.name}</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-panel border border-border-hairline rounded-lg p-6 text-center text-xs font-mono text-zinc-500">
          No status codes match "{query}". Try a different search.
        </div>
      )}

      <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono self-start">
        <span className="text-accent-emerald">✓</span>
        Runs entirely in your browser. No requests are made.
      </div>
    </div>
  );
}
