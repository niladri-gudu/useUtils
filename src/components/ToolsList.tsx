import React, { useState, useMemo, useEffect, useRef } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isActive?: boolean;
  isPopular?: boolean;
  href?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

const CATEGORIES: Category[] = [
  { id: 'text', name: 'Text Utilities', icon: '📝', description: 'Manipulate strings, convert cases, test regular expressions, and format markup' },
  { id: 'json', name: 'Data & JSON', icon: '{ }', description: 'Validate, format, convert, and query JSON, XML, YAML, and CSV' },
  { id: 'encoding', name: 'Crypto & Encode', icon: '🔐', description: 'Encode, decode, hash, and validate secure payloads, URLs, and JWTs' },
  { id: 'css', name: 'CSS & Design', icon: '🎨', description: 'Visual generators, color converters, layout utilities, and shadows' },
  { id: 'generators', name: 'Generators & Time', icon: '⚡', description: 'Generate tokens, UUIDs, passwords, mock data, and convert timestamps' }
];

const ALL_TOOLS: Tool[] = [
  // JSON & Data Tools
  { id: 'json-validator', name: 'JSON Validator', description: 'Validate and format JSON', category: 'json', isPopular: true, icon: '✓' },
  { id: 'json-formatter', name: 'JSON Formatter & Validator', description: 'Format, validate, query, and convert JSON documents. Features real-time error pointing, an interactive collapsible tree view with keypath copy, and YAML/XML/CSV translations.', category: 'json', isPopular: true, isActive: true, href: '/tools/json-formatter', icon: '✨' },
  { id: 'json-minifier', name: 'JSON Minifier', description: 'Minify JSON to save space', category: 'json', icon: '⚡' },
  { id: 'json-viewer', name: 'JSON Viewer', description: 'View JSON in tree format', category: 'json', icon: '🌳' },
  { id: 'json-path-tester', name: 'JSON Path Tester', description: 'Test JSON path queries', category: 'json', icon: '🔍' },
  { id: 'json-sorter', name: 'JSON Sorter', description: 'Sort JSON keys', category: 'json', icon: '↕️' },
  { id: 'json-escape', name: 'JSON Escape', description: 'Escape/unescape JSON strings', category: 'json', icon: '\\' },
  { id: 'json-to-table', name: 'JSON to Table', description: 'Convert JSON to HTML table', category: 'json', icon: '📊' },
  { id: 'json-schema-validator', name: 'JSON Schema Validator & Generator', description: 'Validate JSON payloads against draft-04/07/2019-09 specifications and generate schemas from JSON samples in real-time. Features interactive tree previews and local processing.', category: 'json', isPopular: true, isActive: true, href: '/tools/json-schema-validator', icon: '🛡️' },
  { id: 'csv-to-json', name: 'CSV to JSON & JSON to CSV', description: 'Convert CSV spreadsheets, TSVs, or custom delimited files to JSON and back in real-time. Features a live interactive spreadsheet-like grid editor, auto-delimiter detection, and column type schema profiling.', category: 'json', isPopular: true, isActive: true, href: '/tools/csv-to-json', icon: '📊' },
  { id: 'xml-to-json', name: 'XML to JSON & JSON to XML', description: 'Convert XML documents to JSON objects and back. Features real-time tag mismatch alerts, interactive collapsible tree explorer with XPath path copy, custom namespace stripping, and automatic parsing code generation (Go, Python, Java).', category: 'json', isPopular: true, isActive: true, href: '/tools/xml-to-json', icon: '🔌' },
  { id: 'yaml-to-json', name: 'YAML to JSON & JSON to YAML', description: 'Convert YAML structures to JSON objects in real-time. Features anchor/alias expansion, multi-document parsing, live diagnostics, path query filters, interactive tree explorer, and parser code generators (TypeScript, Go, Python).', category: 'json', isPopular: true, isActive: true, href: '/tools/yaml-to-json', icon: '→' },
  { id: 'json-to-typescript', name: 'JSON to TypeScript & Zod Schema', description: 'Convert JSON payloads into TypeScript Interfaces, Type aliases, or Zod validation schemas in real-time. Features recursive schema generation, custom naming, and optional key configurations.', category: 'json', isPopular: true, isActive: true, href: '/tools/json-to-typescript', icon: '→' },
  { id: 'json-to-java', name: 'JSON to Java', description: 'Generate Java classes', category: 'json', icon: '→' },
  { id: 'json-to-python', name: 'JSON to Python', description: 'Generate Python dataclasses', category: 'json', icon: '→' },
  { id: 'json-to-go', name: 'JSON to Go', description: 'Generate Go structs', category: 'json', icon: '→' },
  { id: 'csv-viewer', name: 'CSV Viewer & Editor', description: 'View, format, query, and edit CSV spreadsheet files visually. Features direct cell editing, row/column addition or deletion, column statistics, and CSV-JSON exports.', category: 'json', isActive: true, href: '/tools/csv-to-json?tab=grid', icon: '📊' },

  // Text Utilities
  { id: 'case-converter', name: 'Case Converter', description: 'Convert text between camelCase, PascalCase, snake_case, kebab-case, UPPERCASE, lowercase, and more. Features smart layout, auto-casing detection, and line-by-line conversion.', category: 'text', isPopular: true, isActive: true, href: '/tools/case-converter', icon: 'Aa' },
  { id: 'diff-checker', name: 'Diff Checker & Text Compare', description: 'Compare two texts, code snippets, JSON objects, or files in real-time. Features split & unified views, word-level highlights, semantic JSON key sorting, and interactive merging.', category: 'text', isPopular: true, isActive: true, href: '/tools/diff-checker', icon: '⚖️' },
  { id: 'word-counter', name: 'Word Counter & Text Analyzer', description: 'Analyze text stats, character counts, lines, paragraphs, and adjust reading/speaking speeds. Calculates Flesch ease, Automated Readability Index (ARI), Gunning Fog indices, and keyword density mapping locally.', category: 'text', isPopular: true, isActive: true, href: '/tools/word-counter', icon: '🔢' },
  { id: 'line-sorter', name: 'Line Sorter', description: 'Sort lines alphabetically', category: 'text', icon: '↕️' },
  { id: 'remove-duplicates', name: 'Remove Duplicates', description: 'Remove duplicate lines', category: 'text', icon: '🗑️' },
  { id: 'reverse-text', name: 'Reverse Text', description: 'Reverse text or lines', category: 'text', icon: '↩️' },
  { id: 'find-replace', name: 'Find & Replace', description: 'Find and replace text', category: 'text', icon: '🔄' },
  { id: 'slug-generator', name: 'URL Slug Generator & Sanitizer', description: 'Convert text, article headings, or lists of strings into clean, SEO-friendly, and URL-safe slugs instantly. Features multilingual transliteration, stop-word removal, and bulk options.', category: 'text', isPopular: true, isActive: true, href: '/tools/slug-generator', icon: '🔗' },
  { id: 'text-trimmer', name: 'Text Trimmer', description: 'Trim whitespace from text', category: 'text', icon: '✂️' },
  { id: 'text-splitter', name: 'Text Splitter', description: 'Split and join text', category: 'text', icon: '✂️' },
  { id: 'remove-special-characters', name: 'Remove Special Characters', description: 'Remove special characters', category: 'text', icon: '🧹' },
  { id: 'extract-emails', name: 'Extract Emails', description: 'Extract emails from text', category: 'text', icon: '📧' },
  { id: 'extract-urls', name: 'Extract URLs', description: 'Extract URLs from text', category: 'text', icon: '🔗' },
  { id: 'character-counter', name: 'Character Counter', description: 'Count characters with details', category: 'text', icon: '📊' },
  { id: 'variable-case-converter', name: 'Variable Case Converter', description: 'Convert variable naming cases', category: 'text', icon: '📝' },
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regular expressions in real-time with live match highlighting, detailed capture groups breakdown, flag configuration, replacement testing, and common regex presets.', category: 'text', isPopular: true, isActive: true, href: '/tools/regex-tester', icon: '🔍' },
  { id: 'regex-cheatsheet', name: 'Regex Cheatsheet', description: 'Regular expressions reference', category: 'text', icon: '📖' },
  { id: 'html-minifier', name: 'HTML Minifier', description: 'Minify HTML code', category: 'text', icon: '⚡' },
  { id: 'html-formatter', name: 'HTML Formatter', description: 'Format and beautify HTML', category: 'text', icon: '✨' },
  { id: 'regex-snippets', name: 'Regex Snippets', description: 'Common regex patterns', category: 'text', icon: '📚' },
  { id: 'remove-duplicates-quick', name: 'Remove Duplicates', description: 'Remove duplicates from list', category: 'text', icon: '🗑️' },
  { id: 'count-occurrences', name: 'Count Occurrences', description: 'Count item occurrences', category: 'text', icon: '🔢' },
  { id: 'alphabetize-list', name: 'Alphabetize List', description: 'Alphabetize lists', category: 'text', icon: '🔤' },
  { id: 'shuffle-list', name: 'Shuffle List', description: 'Randomize list order', category: 'text', icon: '🔀' },
  { id: 'list-utilities', name: 'List Utilities & Text Cleaner', description: 'Format, sort, deduplicate, filter, and clean text lists in real-time. Features a visual sandbox editor with drag-and-drop reordering, inline editing, and a duplicate frequency analyzer.', category: 'text', isPopular: true, isActive: true, href: '/tools/list-utilities', icon: '📋' },

  // Cryptography & Encoding
  { id: 'base64-encoder', name: 'Base64 Encoder', description: 'Encode plain text or binary files into Base64 format locally. Supports Data URIs, CSS background-image rules, and HTML tags.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/base64-encoder', icon: '🔐' },
  { id: 'base64-decoder', name: 'Base64 Decoder', description: 'Decode Base64 strings or Data URIs back into plain text or binary files. Includes file-type detection, visual previews, and local download options.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/base64-decoder', icon: '🔓' },
  { id: 'url-encoder', name: 'URL Encoder', description: 'Encode strings for URL parameters with multiple specifications (Standard, Full URI, Strict RFC 3986, Form-encoded, Strict Hex).', category: 'encoding', isPopular: true, isActive: true, href: '/tools/url-encoder', icon: '🔗' },
  { id: 'url-decoder', name: 'URL Decoder', description: 'Decode percent-encoded URL parameters or clean form-encoded data. Features an interactive query parameter builder and structural URL dissection.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/url-decoder', icon: '🔗' },
  { id: 'html-encoder', name: 'HTML Encoder', description: 'Encode/decode HTML entities', category: 'encoding', icon: '🏷️' },
  { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode JSON Web Tokens instantly with live expiration countdown clocks and payload highlighting.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/jwt-decoder', icon: '🎫' },
  { id: 'jwt-encoder', name: 'JWT Encoder', description: 'Construct and sign JSON Web Tokens locally. Customize headers, payloads, and signatures.', category: 'encoding', isActive: true, href: '/tools/jwt-encoder', icon: '🎫' },
  { id: 'hash-generator', name: 'Hash & HMAC Generator', description: 'Generate cryptographically secure MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes or HMAC signatures locally. Features checksum validation, drag-and-drop file support, and bulk string hashing.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/hash-generator', icon: '🔐' },
  { id: 'aes-encrypt-decrypt', name: 'AES Encryption & Decryption', description: 'Encrypt and decrypt text or files locally using AES-GCM or AES-CBC symmetric ciphers. Features secure password key generators, custom iteration configuration, and shareable parameters.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/aes-encrypt-decrypt', icon: '🔐' },
  { id: 'unicode-encoder', name: 'Unicode Encoder', description: 'Encode/decode Unicode', category: 'encoding', icon: '🌐' },
  { id: 'ascii-converter', name: 'ASCII Converter', description: 'Convert text to ASCII codes', category: 'encoding', icon: '🔢' },
  { id: 'binary-converter', name: 'Binary Converter & Bit Sandbox', description: 'Convert plain text to binary, hex, octal, ASCII, and decimal code in real-time. Features an interactive bitwise sandboxed flitter, a scrollable file-drop hex dump viewer, and an arbitrary BigInt base converter.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/binary-converter', icon: '01' },
  { id: 'hex-converter', name: 'Hex Converter', description: 'Convert text to hexadecimal', category: 'encoding', icon: '🔢' },
  { id: 'rot13-encoder', name: 'ROT13 & Caesar Cipher Studio', description: 'Encode, decode, and analyze classical ciphers including ROT13, Caesar, Vigenère, Atbash, and ROT47. Features real-time letter frequency charts and automated brute-force Caesar decryption.', category: 'encoding', isPopular: true, isActive: true, href: '/tools/rot13-encoder', icon: '🔄' },
  { id: 'email-validator', name: 'Email Validator', description: 'Validate email addresses', category: 'encoding', icon: '📧' },
  { id: 'url-validator', name: 'URL Validator', description: 'Validate URLs', category: 'encoding', icon: '🔗' },
  { id: 'password-strength', name: 'Password Strength', description: 'Check password strength', category: 'encoding', icon: '🔒' },
  { id: 'credit-card-validator', name: 'Credit Card Validator', description: 'Validate credit card numbers', category: 'encoding', icon: '💳' },
  { id: 'phone-validator', name: 'Phone Validator', description: 'Validate phone numbers', category: 'encoding', icon: '📱' },
  { id: 'username-validator', name: 'Username Validator', description: 'Validate usernames', category: 'encoding', icon: '👤' },

  // CSS & Design
  { id: 'css-minifier', name: 'CSS Minifier', description: 'Minify CSS code', category: 'css', icon: '⚡' },
  { id: 'css-formatter', name: 'CSS Formatter', description: 'Format and beautify CSS', category: 'css', icon: '✨' },
  { id: 'color-picker', name: 'Color Picker', description: 'Pick and preview colors', category: 'css', icon: '🎨' },
  { id: 'color-converter', name: 'Color Converter', description: 'Convert colors between HEX, RGB, and HSL formats instantly with live accessibility checks.', category: 'css', isActive: true, href: '/tools/color-converter', icon: '🌈' },
  { id: 'gradient-generator', name: 'CSS Gradient Generator & Palette Extractor', description: 'Design complex linear, radial, or conic gradients, extract palettes from images, and generate CSS, Tailwind, SVG or Canvas code.', category: 'css', isPopular: true, isActive: true, href: '/tools/gradient-generator', icon: '🌅' },
  { id: 'box-shadow', name: 'Box Shadow Generator', description: 'Design high-fidelity, multi-layered CSS box shadows visually with interactive sliders.', category: 'css', isPopular: true, isActive: true, href: '/tools/box-shadow', icon: '📦' },
  { id: 'glassmorphism-generator', name: 'CSS Glassmorphism Generator & Backdrop Filter Studio', description: 'Design premium, frosted glass effects visually with backdrop filters, reflections, and ambient shadows. Features live credit card, music player, and dashboard mockups over dynamic animated backgrounds.', category: 'css', isPopular: true, isActive: true, href: '/tools/glassmorphism-generator', icon: '💎' },
  { id: 'border-radius-generator', name: 'Border Radius Generator', description: 'Generate border radius', category: 'css', icon: '⭕' },
  { id: 'flexbox-playground', name: 'Flexbox Playground', description: 'Visual flexbox editor', category: 'css', icon: '📐' },
  { id: 'grid-generator', name: 'CSS Grid Visual Generator & Studio', description: 'Design complex responsive layouts visually with interactive cell-drawing, custom column/row tracks, preset layouts, and screen simulation. Exports CSS, Tailwind v3/v4 utility classes, React code, and HTML templates.', category: 'css', isPopular: true, isActive: true, href: '/tools/grid-generator', icon: '⊞' },
  { id: 'clamp-generator', name: 'CSS Clamp & Fluid Type Scale Generator', description: 'Calculate responsive CSS clamp() functions for fluid typography and spacing. Create custom modular scales, preview sizes in real-time, and export CSS or Tailwind configs.', category: 'css', isPopular: true, isActive: true, href: '/tools/clamp-generator', icon: '📏' },
  { id: 'tailwind-picker', name: 'Tailwind Opacity/Color Picker', description: 'Interactive Tailwind CSS color scales and opacity modifier charts with WCAG testing.', category: 'css', isActive: true, href: '/tools/tailwind-picker', icon: '⚡' },
  { id: 'color-palette', name: 'Color Palette', description: 'Generate color palettes', category: 'css', icon: '🎨' },

  // Generators & Time
  { id: 'uuid-generator', name: 'UUID & Token Generator', description: 'Generate cryptographically secure UUIDs (v4 & v7), NanoIDs, passwords, and random byte sequences locally. Features a built-in UUID v7 timestamp parser and entropy analysis.', category: 'generators', isPopular: true, isActive: true, href: '/tools/uuid-generator', icon: '🆔' },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum', description: 'Generate placeholder text', category: 'generators', icon: '📝' },
  { id: 'random-number', name: 'Random Number', description: 'Generate random numbers', category: 'generators', icon: '🎲' },
  { id: 'fake-user-generator', name: 'Fake User & Mock Data Generator', description: 'Generate fake user profiles, database mock rows, IoT telemetry, and customize schemas in real-time. Exports to JSON, CSV, YAML, SQL, and TypeScript interfaces.', category: 'generators', isPopular: true, isActive: true, href: '/tools/fake-user-generator', icon: '👤' },
  { id: 'qr-code-generator', name: 'QR Code Generator', description: 'Generate QR codes', category: 'generators', icon: '▦' },
  { id: 'barcode-generator', name: 'Barcode Generator', description: 'Generate barcodes', category: 'generators', icon: '▬' },
  { id: 'random-string', name: 'Random String', description: 'Generate random strings', category: 'generators', icon: '🎲' },
  { id: 'image-resize', name: 'Image Resize', description: 'Resize images in browser', category: 'generators', icon: '🖼️' },
  { id: 'image-compress', name: 'Image Compress', description: 'Compress images', category: 'generators', icon: '🗜️' },
  { id: 'image-converter', name: 'Image Converter', description: 'Convert image formats', category: 'generators', icon: '🔄' },
  { id: 'exif-viewer', name: 'EXIF Viewer', description: 'View image EXIF data', category: 'generators', icon: '📷' },
  { id: 'api-request-builder', name: 'API Request Builder', description: 'Build API requests', category: 'generators', icon: '🔌' },
  { id: 'http-status-codes', name: 'HTTP Status Codes', description: 'HTTP status code reference', category: 'generators', icon: '📡' },
  { id: 'mime-types', name: 'MIME Types', description: 'MIME type lookup', category: 'generators', icon: '📄' },
  { id: 'unix-timestamp-converter', name: 'Unix Timestamp Converter & Epoch Tool', description: 'Convert Unix timestamps and epoch dates in real-time. Supports seconds, milliseconds, microseconds, nanoseconds, timeline scrubber sliders, time math offsets, Year 2038 overflow alerts, and raw log batch scanner extraction.', category: 'generators', isPopular: true, isActive: true, href: '/tools/unix-timestamp-converter', icon: '⏱️' },
  { id: 'date-formatter', name: 'Date Formatter', description: 'Format dates in various patterns', category: 'generators', icon: '📅' },
  { id: 'time-zone-converter', name: 'Time Zone Converter & Meeting Planner', description: 'Convert time zones, compare clocks, optimize global meeting schedules, and translate server log timestamps in real-time. Processed 100% locally.', category: 'generators', isPopular: true, isActive: true, href: '/tools/time-zone-converter', icon: '🌍' },
  { id: 'date-calculator', name: 'Date Calculator', description: 'Add/subtract dates and calculate differences', category: 'generators', icon: '🧮' },
  { id: 'relative-time-generator', name: 'Relative Time Generator', description: 'Generate relative time strings', category: 'generators', icon: '⏰' },
  { id: 'cron-expression-generator', name: 'Cron Expression Generator', description: 'Generate, parse, and test cron expressions in real-time. Features interactive visual builder, next execution time list, and dynamic human-readable description.', category: 'generators', isPopular: true, isActive: true, href: '/tools/cron-expression-generator', icon: '⏲️' },
  { id: 'date-range-generator', name: 'Date Range Generator', description: 'Generate date ranges for testing', category: 'generators', icon: '📆' },
  { id: 'iso-8601-parser', name: 'ISO 8601 Parser', description: 'Parse and validate ISO 8601 dates', category: 'generators', icon: '🔍' },
  { id: 'duration-calculator', name: 'Duration Calculator', description: 'Calculate time durations', category: 'generators', icon: '⏳' },
  { id: 'world-clock', name: 'World Clock', description: 'Display time in multiple timezones', category: 'generators', icon: '🕐' },
  { id: 'number-base-converter', name: 'Number Base Converter', description: 'Convert between number bases', category: 'generators', icon: '🔢' },
  { id: 'epoch-converter', name: 'Epoch Converter', description: 'Convert Unix epoch time', category: 'generators', icon: '⏰' },
  { id: 'timestamp-converter', name: 'Timestamp Converter', description: 'Convert timestamps and dates', category: 'generators', icon: '🕐' }
];

export default function ToolsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // all, active, coming-soon
  
  // Pipeline Modal State
  const [selectedPipelineTool, setSelectedPipelineTool] = useState<Tool | null>(null);
  const [upvotes, setUpvotes] = useState<Record<string, number>>({});
  const [hasUpvoted, setHasUpvoted] = useState<Record<string, boolean>>({});
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generate a stable base count of votes based on a simple hash of the tool's ID
  const getBaseVotes = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 150) + 42; // Returns a number between 42 and 191
  };

  // Keyboard shortcut effect to focus search input (CMD+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        // Prevent typing '/' into the search input instantly when focusing via shortcut
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync upvotes from localStorage on load
  useEffect(() => {
    const storedUpvotes = localStorage.getItem('useutils_upvotes_clicked');
    if (storedUpvotes) {
      try {
        setHasUpvoted(JSON.parse(storedUpvotes));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Filter tools matching search query and active tab (ignoring category filter)
  const searchedTools = useMemo(() => {
    return ALL_TOOLS.filter(tool => {
      const matchesSearch = 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === 'all' ||
        (activeTab === 'active' && tool.isActive) ||
        (activeTab === 'coming-soon' && !tool.isActive);

      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab]);

  // Filter tools dynamically based on selected category
  const filteredTools = useMemo(() => {
    return searchedTools.filter(tool => selectedCategory === 'all' || tool.category === selectedCategory);
  }, [searchedTools, selectedCategory]);

  // Group filtered tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<string, Tool[]> = {};
    
    // Initialize groups
    CATEGORIES.forEach(cat => {
      groups[cat.id] = [];
    });

    // Distribute tools to groups
    filteredTools.forEach(tool => {
      if (groups[tool.category]) {
        groups[tool.category].push(tool);
      }
    });

    // Remove empty categories when searching or filtering
    const finalGroups: Record<string, Tool[]> = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        finalGroups[key] = groups[key];
      }
    });

    return finalGroups;
  }, [filteredTools]);

  // Total count stats
  const totalCount = ALL_TOOLS.length;
  const activeCount = ALL_TOOLS.filter(t => t.isActive).length;

  const handleOpenPipelineModal = (tool: Tool) => {
    setSelectedPipelineTool(tool);
    setFeedbackText('');
    setFeedbackSubmitted(false);

    // Calculate current vote count (base count + 1 if previously upvoted)
    const base = getBaseVotes(tool.id);
    const storedVotes = localStorage.getItem(`useutils_votes_${tool.id}`);
    if (storedVotes) {
      setUpvotes(prev => ({ ...prev, [tool.id]: parseInt(storedVotes) }));
    } else {
      setUpvotes(prev => ({ ...prev, [tool.id]: base }));
    }
  };

  const handleUpvote = (toolId: string) => {
    if (hasUpvoted[toolId]) return;

    const currentVotes = upvotes[toolId] || getBaseVotes(toolId);
    const newVotes = currentVotes + 1;
    
    // Save to states
    setUpvotes(prev => ({ ...prev, [toolId]: newVotes }));
    const newHasUpvoted = { ...hasUpvoted, [toolId]: true };
    setHasUpvoted(newHasUpvoted);
    
    // Save to localStorage
    localStorage.setItem(`useutils_votes_${toolId}`, newVotes.toString());
    localStorage.setItem('useutils_upvotes_clicked', JSON.stringify(newHasUpvoted));
  };

  const handleFeedbackSubmit = (e: React.FormEvent, toolId: string) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    // Load existing feedback logs
    let logs = [];
    const existingLogs = localStorage.getItem('useutils_feature_requests');
    if (existingLogs) {
      try {
        logs = JSON.parse(existingLogs);
      } catch (err) {
        console.error(err);
      }
    }

    logs.push({
      toolId,
      requestText: feedbackText,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem('useutils_feature_requests', JSON.stringify(logs));
    setFeedbackSubmitted(true);
    setFeedbackText('');
  };

  return (
    <div className="w-full flex flex-col min-h-screen text-zinc-100 bg-canvas selection:bg-accent-emerald/20 selection:text-accent-emerald font-sans">
      
      {/* Workspace Header */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-8 pb-6 border-b border-border-hairline/60 flex flex-col gap-3">
        <a href="/" className="text-xs font-mono text-accent-emerald hover:text-emerald-300 transition-colors flex items-center gap-1.5 self-start select-none">
          <span>←</span> <span>Back to Dashboard</span>
        </a>
        <div className="flex flex-col gap-2 mt-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-50 flex items-center gap-2.5">
            <span>🛠️</span> Developer Tools
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed font-sans">
            Offline micro-utilities for common formatting, encoding, generation, and validation tasks. Secure, fast, and processed entirely inside your browser.
          </p>
        </div>
      </div>

      {/* Privacy Status Banner */}
      <div className="w-full max-w-7xl mx-auto px-4 mt-6">
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
            100% Offline Sandbox
          </div>
        </div>
      </div>

      {/* Interactive Search Bar & Filters */}
      <div className="w-full max-w-7xl mx-auto px-4 mt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-xl">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tools... (e.g., JSON, Base64, JWT, CSS)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-panel border border-border-hairline hover:border-zinc-700 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-xl py-3 pl-11 pr-20 text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 p-1.5 rounded-md transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none select-none">
              <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ K</kbd>
              <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">/</kbd>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-border-hairline/60 p-1 rounded-lg shadow-inner self-stretch md:self-auto justify-center">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono select-none border transition-colors duration-75 ${
              activeTab === 'all'
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            All Tools ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono select-none border transition-colors duration-75 ${
              activeTab === 'active'
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('coming-soon')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono select-none border transition-colors duration-75 ${
              activeTab === 'coming-soon'
                ? 'bg-panel text-accent-emerald border-border-hairline shadow-sm font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            Pipeline ({totalCount - activeCount})
          </button>
        </div>
      </div>

      {/* Main Grid View & Sidebar */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-grow">
        
        {/* Left Categories Sidebar - Hidden on mobile, sticky on desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 flex flex-col gap-1.5 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-2">
              Categories
            </div>
            
            <button
              onClick={() => setSelectedCategory('all')}
              className={`relative flex items-center justify-between pl-4 pr-3 py-2 rounded-lg text-sm select-none border transition-colors duration-100 ${
                selectedCategory === 'all'
                  ? 'bg-panel border-border-hairline text-accent-emerald font-medium shadow-sm before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-accent-emerald before:rounded-r'
                  : 'border-transparent text-zinc-400 hover:bg-panel/50 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📁</span>
                <span>All Categories</span>
              </span>
              <span className="text-xs font-mono text-zinc-500 bg-zinc-900 border border-border-hairline/40 px-1.5 py-0.5 rounded">
                {searchedTools.length}
              </span>
            </button>

            {CATEGORIES.map(category => {
              const count = ALL_TOOLS.filter(t => t.category === category.id).length;
              const filteredCount = searchedTools.filter(t => t.category === category.id).length;

              // Hide category from list if we are searching and there are no matches
              if (searchQuery && filteredCount === 0) return null;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`relative flex items-center justify-between pl-4 pr-3 py-2 rounded-lg text-sm select-none border transition-colors duration-100 ${
                    selectedCategory === category.id
                      ? 'bg-panel border-border-hairline text-accent-emerald font-medium shadow-sm before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-accent-emerald before:rounded-r'
                      : 'border-transparent text-zinc-400 hover:bg-panel/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>{category.icon}</span>
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-900 border border-border-hairline/40 px-1.5 py-0.5 rounded">
                    {searchQuery ? filteredCount : count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Panels */}
        <div className="flex-grow flex flex-col gap-10">
          
          {/* Active Category Header */}
          {selectedCategory !== 'all' && (
            <div className="bg-panel border border-border-hairline rounded-xl p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                </span>
                <h2 className="text-xl font-semibold text-zinc-50">
                  {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </h2>
              </div>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                {CATEGORIES.find(c => c.id === selectedCategory)?.description || 'List of tools in this category.'}
              </p>
            </div>
          )}

          {/* Grouped Tools list */}
          {Object.keys(groupedTools).length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-20 text-center gap-4 bg-panel border border-border-hairline border-dashed rounded-xl">
              <span className="text-4xl text-zinc-650">🔍</span>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-zinc-50">
                  No tools found
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  We couldn't find any utilities matching "{searchQuery}". Tell us what tool you need!
                </p>
              </div>
              <button
                onClick={() => handleOpenPipelineModal({
                  id: `custom-request-${Date.now()}`,
                  name: searchQuery || 'Custom Tool',
                  description: 'Request a new security/developer utility tool.',
                  category: 'custom',
                  icon: '💡'
                })}
                className="px-4 py-2 bg-accent-emerald hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-md active:scale-98"
              >
                Request Custom Tool
              </button>
            </div>
          ) : (
            CATEGORIES.map(category => {
              // Only render if there's tools under this category in our grouped selection
              const toolsInCategory = groupedTools[category.id];
              if (!toolsInCategory || toolsInCategory.length === 0) return null;
              
              // If selectedCategory is set, only show the selected category
              if (selectedCategory !== 'all' && selectedCategory !== category.id) return null;

              return (
                <div key={category.id} className="flex flex-col gap-4">
                  
                  {/* Category Header */}
                  {selectedCategory === 'all' && (
                    <div className="flex items-center gap-2 border-b border-border-hairline/60 pb-2">
                      <span className="text-lg">{category.icon}</span>
                      <h3 className="text-sm font-semibold text-zinc-300 font-mono tracking-wider uppercase">
                        {category.name}
                      </h3>
                      {category.description && (
                        <span className="hidden sm:inline text-[11px] text-zinc-500 ml-2 font-sans">
                          • {category.description}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Grid layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {toolsInCategory.map(tool => {
                      return (
                        <div
                          key={`${category.id}-${tool.id}`}
                          className={`flex flex-col justify-between bg-panel border rounded-xl p-5 gap-4 transition-all duration-300 ease-out group select-none hover:-translate-y-1 ${
                            tool.isActive 
                              ? 'border-accent-emerald/20 hover:border-accent-emerald/50 hover:shadow-[0_4px_20px_rgba(52,211,153,0.06)] hover:bg-zinc-900/40' 
                              : 'border-border-hairline hover:border-zinc-700 hover:shadow-[0_4px_20px_rgba(255,255,255,0.015)] hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex flex-col gap-2.5">
                            {/* Card Header badges */}
                            <div className="flex items-center justify-between">
                              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-border-hairline flex items-center justify-center text-sm font-mono font-semibold select-none group-hover:border-accent-emerald/30 group-hover:text-accent-emerald transition-colors">
                                {tool.icon}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {tool.isPopular && (
                                  <span className="text-[9px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                    Popular
                                  </span>
                                )}
                                {tool.isActive ? (
                                  <span className="text-[9px] font-mono bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald px-1.5 py-0.5 rounded tracking-wide uppercase font-semibold">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono bg-zinc-900 border border-border-hairline/80 text-zinc-500 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                    Pipeline
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title & Description */}
                            <h4 className="text-base font-semibold text-zinc-50 group-hover:text-accent-emerald transition-colors font-sans mt-1">
                              {tool.name}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-2">
                              {tool.description}
                            </p>
                          </div>

                          {/* CTA Trigger */}
                          <div className="pt-2">
                            {tool.isActive ? (
                              <a
                                href={tool.href}
                                className="inline-flex items-center justify-between w-full bg-zinc-900 border border-border-hairline group-hover:bg-accent-emerald group-hover:text-zinc-950 group-hover:border-accent-emerald text-zinc-300 font-mono text-xs font-semibold py-2 px-3.5 rounded-lg transition-all duration-200"
                              >
                                <span>Try now</span>
                                <span>→</span>
                              </a>
                            ) : (
                              <button
                                onClick={() => handleOpenPipelineModal(tool)}
                                className="flex items-center justify-between w-full bg-zinc-950 border border-border-hairline/60 group-hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 font-mono text-xs py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-zinc-900"
                              >
                                <span>Coming Soon</span>
                                <span className="text-[10px] text-zinc-650 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">Upvote</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upvote & Coming-Soon Modal */}
      {selectedPipelineTool && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-panel border border-border-hairline rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal close button */}
            <button
              onClick={() => setSelectedPipelineTool(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-800"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Header content */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-zinc-900 border border-border-hairline flex items-center justify-center text-lg">
                  {selectedPipelineTool.icon}
                </span>
                <div>
                  <div className="text-[10px] font-mono bg-zinc-900 border border-border-hairline text-zinc-500 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
                    Pipeline Status
                  </div>
                  <h3 className="text-lg font-bold text-zinc-50 mt-1 font-sans">
                    {selectedPipelineTool.name}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {selectedPipelineTool.description}
              </p>

              {/* Local-First Guarantee Box */}
              <div className="bg-zinc-900/60 border border-border-hairline rounded-lg p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-accent-emerald font-semibold font-mono">
                  <span>🛡️</span>
                  <span>100% Secure & Local Sandbox</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  Like all useUtils components, this tool executes completely inside your browser sandbox. Your developer credentials, inputs, and payloads are never sent to any server. To safeguard your absolute privacy, we build each utility in-house without external wrappers.
                </p>
              </div>

              {/* Interactive Upvoting widget */}
              <div className="flex items-center justify-between bg-zinc-950 border border-border-hairline p-3.5 rounded-lg mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-300 font-sans">Early Access Roadmap</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Hashed interest index: {upvotes[selectedPipelineTool.id] || getBaseVotes(selectedPipelineTool.id)} developers
                  </span>
                </div>
                
                <button
                  onClick={() => handleUpvote(selectedPipelineTool.id)}
                  disabled={hasUpvoted[selectedPipelineTool.id]}
                  className={`px-3.5 py-2 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
                    hasUpvoted[selectedPipelineTool.id]
                      ? 'bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald pointer-events-none'
                      : 'bg-accent-emerald hover:bg-emerald-400 text-zinc-950 shadow-md'
                  }`}
                >
                  {hasUpvoted[selectedPipelineTool.id] ? (
                    <>
                      <span>Upvoted</span>
                      <span>✓</span>
                    </>
                  ) : (
                    <>
                      <span>Upvote Tool</span>
                      <span>▲</span>
                    </>
                  )}
                </button>
              </div>

              {/* Custom Feature Request form */}
              <div className="border-t border-border-hairline/80 pt-4 mt-1">
                {feedbackSubmitted ? (
                  <div className="bg-accent-emerald/5 border border-accent-emerald/20 text-accent-emerald rounded-lg p-3 text-center text-xs font-sans">
                    ✨ <strong>Request Captured!</strong> We've stored your request locally and will prioritize this feature during development. Thank you!
                  </div>
                ) : (
                  <form onSubmit={(e) => handleFeedbackSubmit(e, selectedPipelineTool.id)} className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold text-zinc-300 font-sans">
                      Request a specific feature or wrapper:
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="e.g., Support CSV with custom delimiters, JSON5 format, hex parsing offsets..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-border-hairline focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-lg p-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 outline-none resize-none transition-all"
                    ></textarea>
                    <button
                      type="submit"
                      disabled={!feedbackText.trim()}
                      className="w-full py-2 bg-zinc-900 border border-border-hairline hover:border-zinc-700 text-zinc-300 hover:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none font-mono text-xs font-semibold rounded-lg cursor-pointer transition-all active:scale-98"
                    >
                      Submit Feature Request
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
