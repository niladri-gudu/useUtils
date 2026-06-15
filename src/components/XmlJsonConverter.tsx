import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  validateXml,
  repairXml,
  xmlToJson,
  jsonToXml,
  generateCodeSnippets,
  type XmlValidationResult
} from '../utils-engine/xml';
import { validateJson } from '../utils-engine/json';

// Clipboard helper
const copyToClipboard = (text: string): boolean => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }
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

const SAMPLE_XML = `<bookstore>
  <book category="cooking" id="b101">
    <title lang="en">Everyday Italian</title>
    <author>Giada De Laurentiis</author>
    <year>2005</year>
    <price>30.00</price>
    <inStock>true</inStock>
  </book>
  <book category="children" id="b102">
    <title lang="en">Harry Potter</title>
    <author>J. K. Rowling</author>
    <year>2005</year>
    <price>29.99</price>
    <inStock>false</inStock>
  </book>
</bookstore>`;

const SAMPLE_SOAP = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.example.com/stock">
  <soapenv:Header/>
  <soapenv:Body>
    <web:GetStockPriceRequest>
      <web:StockSymbol>GOOG</web:StockSymbol>
      <web:PriceCurrency>USD</web:PriceCurrency>
    </web:GetStockPriceRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

const SAMPLE_JSON = `{
  "bookstore": {
    "book": [
      {
        "@category": "cooking",
        "@id": "b101",
        "title": {
          "@lang": "en",
          "#text": "Everyday Italian"
        },
        "author": "Giada De Laurentiis",
        "year": 2005,
        "price": 30,
        "inStock": true
      },
      {
        "@category": "children",
        "@id": "b102",
        "title": {
          "@lang": "en",
          "#text": "Harry Potter"
        },
        "author": "J. K. Rowling",
        "year": 2005,
        "price": 29.99,
        "inStock": false
      }
    ]
  }
}`;

// Collapsible JSON/XML Tree Node component
interface TreeNodeProps {
  data: any;
  name: string | number;
  path: string;
  isLast: boolean;
  depth: number;
  onCopyPath: (path: string) => void;
  onCopyXPath: (xpath: string) => void;
  searchTerm: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  data,
  name,
  path,
  isLast,
  depth,
  onCopyPath,
  onCopyXPath,
  searchTerm
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 3);
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);

  const getXPath = (jsonPath: string): string => {
    if (!jsonPath) return '';
    // E.g. .bookstore.book[0].title -> /bookstore/book[1]/title
    let xpath = jsonPath
      .replace(/^\./, '/')
      .replace(/\./g, '/')
      .replace(/\[(\d+)\]/g, (_, idx) => `[${parseInt(idx, 10) + 1}]`);
    
    // Replace attribute patterns if any
    xpath = xpath.replace(/\/@([a-zA-Z0-9_-]+)/g, '[@$1]');
    return xpath;
  };

  const highlightText = (text: string, search: string) => {
    if (!search) return <span className="text-zinc-300">{text}</span>;
    const parts = text.split(new RegExp(`(${search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-emerald-500/30 text-emerald-300 rounded-sm px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const renderPrimitive = () => {
    let valueElement;
    if (data === null) {
      valueElement = <span className="text-red-400 font-mono text-xs">null</span>;
    } else if (typeof data === 'boolean') {
      valueElement = <span className="text-purple-400 font-mono text-xs font-semibold">{data ? 'true' : 'false'}</span>;
    } else if (typeof data === 'number') {
      valueElement = <span className="text-blue-400 font-mono text-xs font-semibold">{data}</span>;
    } else {
      valueElement = <span className="text-emerald-400 font-mono text-xs font-semibold">"{highlightText(String(data), searchTerm)}"</span>;
    }

    return (
      <div className="flex items-center group/node py-0.5 pl-6 hover:bg-zinc-800/40 rounded transition-colors duration-100">
        <span className="text-zinc-500 font-mono select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>
        <span className="font-mono text-xs break-all">{valueElement}</span>
        {!isLast && <span className="text-zinc-500 mr-2">,</span>}

        <div className="opacity-0 group-hover/node:opacity-100 flex items-center gap-1.5 ml-4">
          <button
            onClick={() => onCopyPath(path)}
            className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
            title="Copy JSON path"
          >
            JSON Path
          </button>
          <button
            onClick={() => onCopyXPath(getXPath(path))}
            className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
            title="Copy XPath locator"
          >
            XPath
          </button>
        </div>
      </div>
    );
  };

  if (!isObject) {
    return renderPrimitive();
  }

  const keys = isArray ? [] : Object.keys(data);
  const size = isArray ? data.length : keys.length;
  const opener = isArray ? '[' : '{';
  const closer = isArray ? ']' : '}';

  return (
    <div className="flex flex-col pl-4">
      <div className="flex items-center group/node py-0.5 hover:bg-zinc-800/40 rounded transition-colors duration-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-500 hover:text-zinc-300 w-4 h-4 flex items-center justify-center font-mono text-[9px] select-none cursor-pointer focus:outline-none"
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <span className="text-zinc-400 font-mono select-none mr-2">
          {typeof name === 'number' ? name : `"${name}"`}:
        </span>

        <span className="text-zinc-500 font-mono text-xs mr-2">{opener}</span>

        {!isExpanded && (
          <span
            onClick={() => setIsExpanded(true)}
            className="text-zinc-500 hover:text-zinc-400 font-mono text-[10px] cursor-pointer italic bg-zinc-900 border border-zinc-800 px-1 rounded select-none mr-2"
          >
            {isArray ? `${size} items` : `${size} keys`}
          </span>
        )}

        {!isExpanded && <span className="text-zinc-500 font-mono text-xs mr-2">{closer}</span>}
        {!isExpanded && !isLast && <span className="text-zinc-500 mr-2">,</span>}

        <div className="opacity-0 group-hover/node:opacity-100 flex items-center gap-1.5 ml-4">
          <button
            onClick={() => onCopyPath(path)}
            className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
          >
            JSON Path
          </button>
          <button
            onClick={() => onCopyXPath(getXPath(path))}
            className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded transition-all font-mono cursor-pointer"
          >
            XPath
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-zinc-800/60 pl-2 mt-0.5 flex flex-col gap-0.5">
          {isArray
            ? data.map((item: any, idx: number) => (
                <TreeNode
                  key={idx}
                  data={item}
                  name={idx}
                  path={`${path}[${idx}]`}
                  isLast={idx === size - 1}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  onCopyXPath={onCopyXPath}
                  searchTerm={searchTerm}
                />
              ))
            : keys.map((key: string, idx: number) => (
                <TreeNode
                  key={key}
                  data={data[key]}
                  name={key}
                  path={`${path}.${/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`}`}
                  isLast={idx === size - 1}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  onCopyXPath={onCopyXPath}
                  searchTerm={searchTerm}
                />
              ))}
        </div>
      )}

      {isExpanded && (
        <div className="pl-4 font-mono text-xs text-zinc-500 py-0.5">
          {closer}
          {!isLast && <span className="text-zinc-500">,</span>}
        </div>
      )}
    </div>
  );
};

export function XmlJsonConverter() {
  const [input, setInput] = useState<string>('');
  const [pathway, setPathway] = useState<'xml-to-json' | 'json-to-xml'>('xml-to-json');
  const [activeTab, setActiveTab] = useState<'text' | 'tree' | 'codegen'>('text');
  
  // XML -> JSON options
  const [attrPrefix, setAttrPrefix] = useState<string>('@');
  const [textKey, setTextKey] = useState<string>('#text');
  const [ignoreAttrs, setIgnoreAttrs] = useState<boolean>(false);
  const [ignoreNamespaces, setIgnoreNamespaces] = useState<boolean>(false);
  const [forceArraysInput, setForceArraysInput] = useState<string>('');
  const [trimText, setTrimText] = useState<boolean>(true);
  const [typeCast, setTypeCast] = useState<boolean>(true);

  // JSON -> XML options
  const [rootTagName, setRootTagName] = useState<string>('root');
  const [minifyXml, setMinifyXml] = useState<boolean>(false);
  const [indentSpacing, setIndentSpacing] = useState<'2' | '4' | 'tab'>('2');

  // UI status feedbacks
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [pathFeedback, setPathFeedback] = useState<string | null>(null);
  const [xmlRepairFeedback, setXmlRepairFeedback] = useState<boolean>(false);
  
  // Tree Viewer search filter
  const [treeSearch, setTreeSearch] = useState<string>('');

  // Code Gen selected language
  const [codeLang, setCodeLang] = useState<'go' | 'python' | 'javascript' | 'java'>('go');

  // Parse URL query parameter for pathway state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'json-to-xml') {
        setPathway('json-to-xml');
      }
    }
  }, []);

  // Sync sample inputs when switching pathways
  const handlePathwayChange = (newPathway: 'xml-to-json' | 'json-to-xml') => {
    setPathway(newPathway);
    setInput('');
    setXmlRepairFeedback(false);
  };

  // Split forced array keys on commas
  const forceArrayKeys = useMemo(() => {
    return forceArraysInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k !== '');
  }, [forceArraysInput]);

  // Validation
  const validation = useMemo(() => {
    if (!input || !input.trim()) {
      return { isValid: true, error: null };
    }
    if (pathway === 'xml-to-json') {
      return validateXml(input);
    } else {
      return validateJson(input);
    }
  }, [input, pathway]);

  // Try to parse to object internally
  const parsedObject = useMemo(() => {
    if (!input || !input.trim() || !validation.isValid) return null;
    
    try {
      if (pathway === 'xml-to-json') {
        const jsonStr = xmlToJson(input, {
          attributePrefix: attrPrefix,
          textKey: textKey,
          ignoreAttributes: ignoreAttrs,
          ignoreNamespaces: ignoreNamespaces,
          forceArrayKeys: forceArrayKeys,
          trimText: trimText,
          typeCast: typeCast
        });
        return JSON.parse(jsonStr);
      } else {
        return JSON.parse(input);
      }
    } catch {
      return null;
    }
  }, [input, pathway, validation.isValid, attrPrefix, textKey, ignoreAttrs, ignoreNamespaces, forceArrayKeys, trimText, typeCast]);

  // Final processed output text
  const processedOutput = useMemo(() => {
    if (!input || !input.trim()) return '';
    if (!validation.isValid) return '';

    try {
      if (pathway === 'xml-to-json') {
        return xmlToJson(input, {
          attributePrefix: attrPrefix,
          textKey: textKey,
          ignoreAttributes: ignoreAttrs,
          ignoreNamespaces: ignoreNamespaces,
          forceArrayKeys: forceArrayKeys,
          trimText: trimText,
          typeCast: typeCast
        });
      } else {
        const obj = JSON.parse(input);
        return jsonToXml(obj, {
          rootName: rootTagName,
          attributePrefix: attrPrefix,
          textKey: textKey,
          ignoreAttributes: ignoreAttrs,
          minify: minifyXml,
          indent: indentSpacing === 'tab' ? 'tab' : parseInt(indentSpacing, 10)
        });
      }
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }, [input, pathway, validation.isValid, attrPrefix, textKey, ignoreAttrs, ignoreNamespaces, forceArrayKeys, trimText, typeCast, rootTagName, minifyXml, indentSpacing]);

  // Auto-generator code snippets
  const generatedCode = useMemo(() => {
    if (!parsedObject) return null;
    return generateCodeSnippets(parsedObject, rootTagName);
  }, [parsedObject, rootTagName]);

  // Stats
  const stats = useMemo(() => {
    const inputChars = input.length;
    const inputLines = input ? input.split('\n').length : 0;
    const outputChars = processedOutput.length;
    const outputLines = processedOutput ? processedOutput.split('\n').length : 0;

    let sizeDiff = 0;
    if (inputChars > 0 && outputChars > 0) {
      sizeDiff = ((inputChars - outputChars) / inputChars) * 100;
    }

    return {
      inputChars,
      inputLines,
      outputChars,
      outputLines,
      sizeDiff
    };
  }, [input, processedOutput]);

  // Actions
  const handleCopy = () => {
    if (!processedOutput) return;
    const success = copyToClipboard(processedOutput);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleCopyPath = (path: string) => {
    const success = copyToClipboard(path);
    if (success) {
      setPathFeedback(`JSON Path copied: ${path}`);
      setTimeout(() => setPathFeedback(null), 2500);
    }
  };

  const handleCopyXPath = (xpath: string) => {
    const success = copyToClipboard(xpath);
    if (success) {
      setPathFeedback(`XPath locator copied: ${xpath}`);
      setTimeout(() => setPathFeedback(null), 2500);
    }
  };

  const handleDownload = () => {
    if (!processedOutput) return;
    const extension = pathway === 'xml-to-json' ? 'json' : 'xml';
    const mime = pathway === 'xml-to-json' ? 'application/json' : 'application/xml';
    
    const blob = new Blob([processedOutput], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `useutils_converted.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRepairXml = () => {
    if (pathway !== 'xml-to-json' || !input) return;
    const repaired = repairXml(input);
    setInput(repaired);
    setXmlRepairFeedback(true);
    setTimeout(() => setXmlRepairFeedback(false), 2000);
  };

  const handleFormat = () => {
    if (!input || !input.trim() || !validation.isValid) return;
    try {
      if (pathway === 'xml-to-json') {
        // XML Beautifier
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'application/xml');
        const serialized = new XMLSerializer().serializeToString(doc);
        
        // Simple XML prettify regex format
        let formatted = '';
        let indent = 0;
        const reg = /(>)(<)(\/*)/g;
        const xml = serialized.replace(reg, '$1\r\n$2$3');
        const pad = '  ';
        
        xml.split('\r\n').forEach(node => {
          let indentLevel = 0;
          if (node.match(/.+<\/\w[^>]*>$/)) {
            indentLevel = 0;
          } else if (node.match(/^<\/\w/)) {
            if (indent !== 0) {
              indent -= 1;
            }
          } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indentLevel = 1;
          } else {
            indentLevel = 0;
          }
          
          formatted += pad.repeat(indent) + node + '\n';
          indent += indentLevel;
        });

        setInput(formatted.trim());
      } else {
        // JSON Beautifier
        const parsed = JSON.parse(input);
        setInput(JSON.stringify(parsed, null, 2));
      }
    } catch {
      // do nothing
    }
  };

  const handleMinify = () => {
    if (!input || !input.trim() || !validation.isValid) return;
    try {
      if (pathway === 'xml-to-json') {
        const minified = input
          .replace(/>\s+</g, '><')
          .trim();
        setInput(minified);
      } else {
        const parsed = JSON.parse(input);
        setInput(JSON.stringify(parsed));
      }
    } catch {
      // do nothing
    }
  };

  const handleSwap = () => {
    if (!processedOutput || processedOutput.startsWith('Error:') || !validation.isValid) return;
    setInput(processedOutput);
    setPathway(pathway === 'xml-to-json' ? 'json-to-xml' : 'xml-to-json');
  };

  const handleClear = () => {
    setInput('');
    setXmlRepairFeedback(false);
  };

  const loadSample = (type: 'basic' | 'soap' | 'json') => {
    if (type === 'basic') {
      setPathway('xml-to-json');
      setInput(SAMPLE_XML);
    } else if (type === 'soap') {
      setPathway('xml-to-json');
      setInput(SAMPLE_SOAP);
    } else if (type === 'json') {
      setPathway('json-to-xml');
      setInput(SAMPLE_JSON);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* Bidirectional Mode Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1c1c1e] border border-[#2c2c2e] p-2 rounded-xl">
        <div className="flex bg-zinc-950 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => handlePathwayChange('xml-to-json')}
            className={`flex-1 sm:flex-initial px-5 py-2 font-mono text-xs font-bold rounded-md transition-all select-none ${
              pathway === 'xml-to-json'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔌 XML → JSON
          </button>
          <button
            onClick={() => handlePathwayChange('json-to-xml')}
            className={`flex-1 sm:flex-initial px-5 py-2 font-mono text-xs font-bold rounded-md transition-all select-none ${
              pathway === 'json-to-xml'
                ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚡ JSON → XML
          </button>
        </div>

        {/* Global Privacy Bar */}
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/40 rounded-lg border border-[#2c2c2e]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34d399]"></span>
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Processed locally in browser. Zero server transmission.
          </span>
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Input Panel */}
        <div className="flex flex-col gap-5 bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 shadow-lg">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Source Document ({pathway === 'xml-to-json' ? 'XML' : 'JSON'})
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {stats.inputChars} chars • {stats.inputLines} lines
              </span>
            </div>

            {/* Load presets */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadSample(pathway === 'xml-to-json' ? 'basic' : 'json')}
                className="px-2 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 transition-colors font-mono cursor-pointer"
              >
                Sample {pathway === 'xml-to-json' ? 'XML' : 'JSON'}
              </button>
              {pathway === 'xml-to-json' && (
                <button
                  type="button"
                  onClick={() => loadSample('soap')}
                  className="px-2 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 transition-colors font-mono cursor-pointer"
                >
                  SOAP XML
                </button>
              )}
              {input && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-[10px] bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 rounded border border-rose-900/30 transition-colors font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Source Text Area with microactions */}
          <div className="relative flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                pathway === 'xml-to-json'
                  ? 'Paste your XML payload here (e.g. <root><name>useUtils</name></root>)...'
                  : 'Paste your JSON object here (e.g. { "root": { "name": "useUtils" } })...'
              }
              rows={16}
              className={`w-full bg-[#151515] border focus:border-zinc-700 outline-none rounded-lg p-3 font-mono text-xs md:text-sm text-zinc-200 resize-none leading-relaxed transition-all focus:ring-1 focus:ring-zinc-800 ${
                !validation.isValid ? 'border-red-900/60 focus:border-red-800' : 'border-[#2c2c2e]'
              }`}
            />
            
            {/* Keyboard shortcut hint if empty */}
            {!input && (
              <div className="absolute right-3 bottom-3 flex items-center gap-1.5 pointer-events-none select-none">
                <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-400">⌘ V</kbd>
              </div>
            )}
            
            {/* Format & Minify Helpers */}
            {input && validation.isValid && (
              <div className="absolute right-3.5 top-3 flex gap-2">
                <button
                  onClick={handleFormat}
                  className="px-2 py-0.5 text-[9px] bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 rounded font-mono transition-all"
                  title="Format source code"
                >
                  Beautify
                </button>
                <button
                  onClick={handleMinify}
                  className="px-2 py-0.5 text-[9px] bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 rounded font-mono transition-all"
                  title="Minify source code"
                >
                  Minify
                </button>
              </div>
            )}

            {/* Validation Alerts */}
            {!validation.isValid && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg p-3.5 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span>🛑</span>
                    <span>Malformed Syntax Error</span>
                  </span>
                  {pathway === 'xml-to-json' && (
                    <button
                      type="button"
                      onClick={handleRepairXml}
                      className="px-2 py-0.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-semibold rounded text-[10px] cursor-pointer"
                    >
                      {xmlRepairFeedback ? 'Auto-closed! ✓' : 'Auto-close unclosed tags'}
                    </button>
                  )}
                </div>
                <p className="text-red-300/90 leading-relaxed text-[11px]">{validation.error}</p>
                {validation.line && (
                  <span className="text-[10px] text-red-400/70">
                    Failed at Line {validation.line}, Column {validation.column}
                  </span>
                )}
              </div>
            )}

            {validation.isValid && input && (
              <div className="bg-emerald-950/10 border border-[#34d399]/20 text-[#34d399] rounded-lg px-3 py-2 flex items-center gap-2 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse"></span>
                Input Document Verified / Syntax Valid
              </div>
            )}
          </div>

          {/* Pathway Custom Options Panel */}
          <div className="border-t border-[#2c2c2e] pt-4 flex flex-col gap-4">
            <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">
              Translation Configurations
            </h3>

            {/* XML -> JSON Options */}
            {pathway === 'xml-to-json' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Attr Prefix & Text Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    Attribute Key Prefix
                  </label>
                  <input
                    type="text"
                    value={attrPrefix}
                    onChange={(e) => setAttrPrefix(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="@"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    Element Text Key
                  </label>
                  <input
                    type="text"
                    value={textKey}
                    onChange={(e) => setTextKey(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="#text"
                  />
                </div>

                {/* Array coercion */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase">
                      Force Array Keys
                    </label>
                    <span className="text-[9px] text-zinc-600 font-mono">
                      Comma separated tags (e.g. book, item)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={forceArraysInput}
                    onChange={(e) => setForceArraysInput(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="e.g. book, item, image"
                  />
                </div>

                {/* Checkbox settings */}
                <div className="flex flex-col gap-2.5 md:col-span-2 pt-1">
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-350 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignoreAttrs}
                        onChange={(e) => setIgnoreAttrs(e.target.checked)}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Ignore Attributes
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-350 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignoreNamespaces}
                        onChange={(e) => setIgnoreNamespaces(e.target.checked)}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Strip XML Namespaces
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-350 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typeCast}
                        onChange={(e) => setTypeCast(e.target.checked)}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Coerce Schema Types
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-350 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trimText}
                        onChange={(e) => setTrimText(e.target.checked)}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Trim Whitespace
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* JSON -> XML Options */}
            {pathway === 'json-to-xml' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Root Name & Indent */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    XML Root Element Tag
                  </label>
                  <input
                    type="text"
                    value={rootTagName}
                    onChange={(e) => setRootTagName(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="root"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    XML Tag Indentation
                  </label>
                  <div className="flex gap-1">
                    {[
                      { id: '2', name: '2 Spaces' },
                      { id: '4', name: '4 Spaces' },
                      { id: 'tab', name: 'Tab' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setIndentSpacing(opt.id as any);
                          setMinifyXml(false);
                        }}
                        className={`flex-grow px-2 py-1 rounded text-[10px] font-mono select-none cursor-pointer border transition-all duration-75 ${
                          indentSpacing === opt.id && !minifyXml
                            ? 'bg-zinc-800 border-zinc-700 text-[#34d399] font-semibold'
                            : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attr Prefix & Text Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    Attribute Key Prefix
                  </label>
                  <input
                    type="text"
                    value={attrPrefix}
                    onChange={(e) => setAttrPrefix(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="@"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">
                    Element Text Key
                  </label>
                  <input
                    type="text"
                    value={textKey}
                    onChange={(e) => setTextKey(e.target.value)}
                    className="bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300"
                    placeholder="#text"
                  />
                </div>

                {/* Minify & Ignore attributes */}
                <div className="flex flex-col gap-2.5 md:col-span-2 pt-1">
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-355 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={minifyXml}
                        onChange={(e) => {
                          setMinifyXml(e.target.checked);
                        }}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Minify Output XML
                    </label>
                    <label className="flex items-center gap-2 text-xs font-mono text-zinc-355 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ignoreAttrs}
                        onChange={(e) => setIgnoreAttrs(e.target.checked)}
                        className="rounded border-[#2c2c2e] bg-zinc-950 text-[#34d399] w-3.5 h-3.5 cursor-pointer accent-[#34d399]"
                      />
                      Ignore Attributes
                    </label>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output & Visualization Pane */}
        <div className="flex flex-col bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
          
          {/* Navigation View Tabs */}
          <div className="flex border-b border-[#2c2c2e] bg-[#171719] select-none p-1">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'text'
                  ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📄 Processed Text
            </button>
            <button
              onClick={() => {
                if (parsedObject) {
                  setActiveTab('tree');
                }
              }}
              disabled={!parsedObject}
              className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
                activeTab === 'tree'
                  ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🌳 Object Tree View
            </button>
            <button
              onClick={() => {
                if (parsedObject) {
                  setActiveTab('codegen');
                }
              }}
              disabled={!parsedObject}
              className={`flex-1 text-center py-2.5 font-mono text-xs font-semibold rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none ${
                activeTab === 'codegen'
                  ? 'bg-[#1c1c1e] text-[#34d399] border border-[#2c2c2e] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📦 Parse Code Gen
            </button>
          </div>

          {/* Action Header panel */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171719] px-4 py-3 border-b border-[#2c2c2e]">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-zinc-500">
                {processedOutput ? `${stats.outputChars} chars • ${stats.outputLines} lines` : 'No parsed output'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Swap pathway */}
              {processedOutput && validation.isValid && (
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-xs font-mono text-zinc-300 rounded transition-all hover:bg-zinc-800"
                  title="Swap output back to input and switch pathway"
                >
                  Swap ⇄
                </button>
              )}

              {/* Download output */}
              {processedOutput && validation.isValid && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-xs font-mono text-zinc-300 rounded transition-all hover:bg-zinc-800"
                  title="Download file to local storage"
                >
                  Download
                </button>
              )}

              {/* Copy action */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!processedOutput || !validation.isValid}
                className="flex items-center gap-1 px-3.5 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[#34d399] rounded font-mono font-bold disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all"
              >
                {copyFeedback ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Output dynamic screen */}
          <div className="p-6 flex-grow overflow-y-auto min-h-[420px] bg-[#1a1a1c]/20 relative">
            
            {/* Copy selector feedbacks */}
            {pathFeedback && (
              <div className="absolute top-4 right-4 bg-[#34d399] text-[#151515] font-mono text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-lg z-20 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
                {pathFeedback}
              </div>
            )}

            {/* TAB 1: Processed Text View */}
            {activeTab === 'text' && (
              <div className="w-full h-full">
                {processedOutput ? (
                  <pre className="text-xs md:text-sm font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap select-all selection:bg-emerald-500/20 selection:text-[#34d399]">
                    {processedOutput}
                  </pre>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center py-24 text-center text-zinc-550 gap-2 font-mono">
                    <span>🔍</span>
                    <span className="text-xs">Provide valid input to evaluate translation output</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Interactive Object Tree Explorer */}
            {activeTab === 'tree' && parsedObject && (
              <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
                
                {/* Search Tree filter */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search keys or values in tree..."
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    className="w-full bg-[#151515] border border-[#2c2c2e] focus:border-zinc-700 outline-none rounded-lg py-1.5 pl-9 pr-8 text-xs font-mono text-zinc-200 placeholder-zinc-600"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-650 text-xs">🔍</span>
                  {treeSearch && (
                    <button
                      onClick={() => setTreeSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="bg-[#151515]/40 border border-[#2c2c2e] rounded-xl p-4 max-h-[360px] overflow-y-auto flex flex-col gap-1 select-none">
                  <TreeNode
                    data={parsedObject}
                    name={pathway === 'xml-to-json' ? (Object.keys(parsedObject)[0] || 'root') : rootTagName}
                    path=""
                    isLast={true}
                    depth={0}
                    onCopyPath={handleCopyPath}
                    onCopyXPath={handleCopyXPath}
                    searchTerm={treeSearch}
                  />
                </div>
                
                <div className="text-[10px] text-zinc-500 font-mono text-center flex items-center justify-center gap-1.5">
                  <span>💡</span>
                  <span>Hover over nodes to copy their explicit JSON Path or XPath locator badges.</span>
                </div>
              </div>
            )}

            {/* TAB 3: Code Snippets Generator */}
            {activeTab === 'codegen' && generatedCode && (
              <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
                
                {/* Languages selector */}
                <div className="flex border border-[#2c2c2e] bg-zinc-950 p-1 rounded-lg">
                  {([
                    { id: 'go', name: 'Go Structs' },
                    { id: 'python', name: 'Python Dataclass' },
                    { id: 'javascript', name: 'JS Fetch/Parser' },
                    { id: 'java', name: 'Java (Jackson)' }
                  ] as const).map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setCodeLang(lang.id)}
                      className={`flex-1 py-1.5 font-mono text-[10px] font-semibold rounded-md transition-all uppercase select-none ${
                        codeLang === lang.id
                          ? 'bg-[#1c1c1e] text-[#34d399] shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-350'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>

                {/* Selected Language Codeblock */}
                <div className="relative group/code flex flex-col">
                  <div className="absolute right-3.5 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        const success = copyToClipboard(generatedCode[codeLang]);
                        if (success) {
                          setPathFeedback('Code block copied!');
                          setTimeout(() => setPathFeedback(null), 2000);
                        }
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-mono text-zinc-300 font-bold cursor-pointer"
                    >
                      Copy Snippet
                    </button>
                  </div>
                  
                  <pre className="bg-[#151515] border border-[#2c2c2e] rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto select-all max-h-[350px]">
                    {generatedCode[codeLang]}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
