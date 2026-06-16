import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  generateMockData,
  convertToJson,
  convertToCsv,
  convertToYaml,
  convertToSql,
  generateTypeScriptTypes,
  type MockSchema,
  type MockField,
  type MockDataType
} from '../utils-engine/fake-user';

// Clipboard copy helper
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

// Available Mock Data Type Metadata
interface DataTypeOption {
  value: MockDataType;
  label: string;
  category: string;
  description: string;
}

const DATA_TYPES: DataTypeOption[] = [
  // Personal
  { value: 'fullName', label: 'Full Name', category: 'Personal', description: 'Combined first and last name' },
  { value: 'firstName', label: 'First Name', category: 'Personal', description: 'Random male/female first name' },
  { value: 'lastName', label: 'Last Name', category: 'Personal', description: 'Random last name' },
  { value: 'gender', label: 'Gender', category: 'Personal', description: 'Male, Female, Non-binary, etc.' },
  { value: 'avatar', label: 'SVG Geometric Avatar', category: 'Personal', description: 'Unique, local-generated base64 vector' },
  
  // Contact
  { value: 'email', label: 'Email Address', category: 'Contact', description: 'Formatted mock email address' },
  { value: 'phone', label: 'Phone Number', category: 'Contact', description: 'North American style phone string' },
  { value: 'username', label: 'Username', category: 'Contact', description: 'Lowercase dot-separated username' },
  { value: 'password', label: 'Password', category: 'Contact', description: 'Secure 12-character alphanumeric code' },
  
  // Location
  { value: 'country', label: 'Country Name', category: 'Location', description: 'Country (e.g. United States, Japan)' },
  { value: 'countryCode', label: 'Country Code (ISO)', category: 'Location', description: 'Two-character ISO code' },
  { value: 'city', label: 'City Name', category: 'Location', description: 'Major global city' },
  { value: 'state', label: 'State / Province', category: 'Location', description: 'State or regional province' },
  { value: 'zipCode', label: 'ZIP / Postal Code', category: 'Location', description: 'Five-digit zip code' },
  { value: 'streetAddress', label: 'Street Address', category: 'Location', description: 'Street number and name' },
  { value: 'latitude', label: 'Latitude Coordinate', category: 'Location', description: 'Float value (-90.0 to 90.0)' },
  { value: 'longitude', label: 'Longitude Coordinate', category: 'Location', description: 'Float value (-180.0 to 180.0)' },
  
  // Company
  { value: 'companyName', label: 'Company Name', category: 'Job & Corporate', description: 'Random company name' },
  { value: 'jobTitle', label: 'Job Title', category: 'Job & Corporate', description: 'Tech job title' },
  { value: 'department', label: 'Department', category: 'Job & Corporate', description: 'Corporate department' },
  { value: 'industry', label: 'Industry Sector', category: 'Job & Corporate', description: 'Business industry type' },
  
  // Internet & Identifiers
  { value: 'ipV4', label: 'IPv4 Address', category: 'Network', description: 'Random public/private IP address' },
  { value: 'ipV6', label: 'IPv6 Address', category: 'Network', description: 'Formatted random IPv6 address' },
  { value: 'macAddress', label: 'MAC Address', category: 'Network', description: 'Standard hex MAC address' },
  { value: 'userAgent', label: 'User Agent String', category: 'Network', description: 'Modern browser client header' },
  { value: 'uuid', label: 'UUID v4', category: 'Network', description: 'Secure 36-char unique identifier' },
  { value: 'nanoid', label: 'NanoID', category: 'Network', description: 'Cryptographic 21-char identifier' },
  
  // Custom
  { value: 'randomNumber', label: 'Random Integer', category: 'Custom Controls', description: 'Custom min/max integer range' },
  { value: 'randomFloat', label: 'Random Decimal', category: 'Custom Controls', description: 'Custom min/max float with custom decimals' },
  { value: 'boolean', label: 'Boolean Toggle', category: 'Custom Controls', description: 'Random true or false state' },
  { value: 'customList', label: 'Custom List Picker', category: 'Custom Controls', description: 'Pick random value from custom comma-separated list' },
  
  // Text & Prose
  { value: 'word', label: 'Random Word', category: 'Text & Prose', description: 'Single random lorem word' },
  { value: 'sentence', label: 'Lorem Sentence', category: 'Text & Prose', description: 'Grammatical sentence structure' },
  { value: 'paragraph', label: 'Lorem Paragraph', category: 'Text & Prose', description: 'Multi-sentence paragraphs' },
  { value: 'loremIpsum', label: 'Lorem Ipsum Blocks', category: 'Text & Prose', description: 'Standard lorem placeholder block' }
];

// Preset Templates
const PRESETS: Record<string, { label: string; schema: MockSchema }> = {
  users: {
    label: 'User Accounts Profile',
    schema: [
      { id: 'u1', key: 'id', type: 'uuid' },
      { id: 'u2', key: 'name', type: 'fullName' },
      { id: 'u3', key: 'username', type: 'username' },
      { id: 'u4', key: 'email', type: 'email' },
      { id: 'u5', key: 'avatar_data', type: 'avatar' },
      { id: 'u6', key: 'gender', type: 'gender' },
      { id: 'u7', key: 'role', type: 'customList', options: { customList: 'Admin, Moderator, Editor, Guest, User' } },
      { id: 'u8', key: 'active', type: 'boolean' }
    ]
  },
  products: {
    label: 'E-commerce Inventory',
    schema: [
      { id: 'p1', key: 'sku', type: 'nanoid' },
      { id: 'p2', key: 'product_name', type: 'companyName' },
      { id: 'p3', key: 'price', type: 'randomFloat', options: { min: 4.99, max: 899.99, decimals: 2 } },
      { id: 'p4', key: 'stock_quantity', type: 'randomNumber', options: { min: 0, max: 250 } },
      { id: 'p5', key: 'department', type: 'department' },
      { id: 'p6', key: 'featured', type: 'boolean' }
    ]
  },
  telemetry: {
    label: 'IoT Device Logs',
    schema: [
      { id: 't1', key: 'device_uuid', type: 'uuid' },
      { id: 't2', key: 'ip_address', type: 'ipV4' },
      { id: 't3', key: 'temperature_c', type: 'randomFloat', options: { min: -15.5, max: 48.2, decimals: 1 } },
      { id: 't4', key: 'humidity_percent', type: 'randomNumber', options: { min: 20, max: 95 } },
      { id: 't5', key: 'status_ok', type: 'boolean' },
      { id: 't6', key: 'latitude', type: 'latitude' },
      { id: 't7', key: 'longitude', type: 'longitude' }
    ]
  },
  blog: {
    label: 'Blog Post Editor List',
    schema: [
      { id: 'b1', key: 'post_id', type: 'nanoid' },
      { id: 'b2', key: 'headline', type: 'sentence' },
      { id: 'b3', key: 'author_name', type: 'fullName' },
      { id: 'b4', key: 'views_count', type: 'randomNumber', options: { min: 10, max: 85000 } },
      { id: 'b5', key: 'category', type: 'customList', options: { customList: 'Technology, Career, Design, Lifestyle, Finance' } },
      { id: 'b6', key: 'published', type: 'boolean' },
      { id: 'b7', key: 'summary', type: 'paragraph' }
    ]
  }
};

export const FakeUserGenerator: React.FC = () => {
  // Config States
  const [count, setCount] = useState<number>(10);
  const [schema, setSchema] = useState<MockSchema>(PRESETS.users.schema);
  const [activeTab, setActiveTab] = useState<'json' | 'csv' | 'yaml' | 'sql' | 'ts'>('json');
  const [sqlTableName, setSqlTableName] = useState<string>('users');
  const [presetKey, setPresetKey] = useState<string>('users');
  
  // Generation triggers & results
  const [mockData, setMockData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const outputPreRef = useRef<HTMLPreElement>(null);

  // Generate data locally when count, schema, or refreshTrigger shifts
  useEffect(() => {
    const data = generateMockData(schema, count);
    setMockData(data);
  }, [schema, count, refreshTrigger]);

  // Handle format conversion mapping
  const outputCode = useMemo(() => {
    switch (activeTab) {
      case 'csv':
        return convertToCsv(mockData);
      case 'yaml':
        return convertToYaml(mockData);
      case 'sql':
        return convertToSql(mockData, sqlTableName);
      case 'ts':
        return generateTypeScriptTypes(schema, sqlTableName ? `${sqlTableName.charAt(0).toUpperCase()}${sqlTableName.slice(1)}` : 'MockRow');
      case 'json':
      default:
        return convertToJson(mockData);
    }
  }, [mockData, activeTab, sqlTableName, schema]);

  // Load Preset Schema
  const handleLoadPreset = (key: string) => {
    if (PRESETS[key]) {
      setSchema(PRESETS[key].schema);
      setPresetKey(key);
      if (key === 'products') setSqlTableName('products');
      else if (key === 'telemetry') setSqlTableName('iot_telemetry');
      else if (key === 'blog') setSqlTableName('posts');
      else setSqlTableName('users');
    } else {
      setPresetKey('custom');
    }
  };

  // Field Manipulation Modifiers
  const addField = () => {
    const newField: MockField = {
      id: `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      key: `field_${schema.length + 1}`,
      type: 'fullName',
      options: {
        min: 0,
        max: 100,
        decimals: 2,
        customList: 'Option A, Option B, Option C'
      }
    };
    setSchema([...schema, newField]);
    setPresetKey('custom');
  };

  const removeField = (id: string) => {
    setSchema(schema.filter(f => f.id !== id));
    setPresetKey('custom');
  };

  const updateFieldKey = (id: string, newKey: string) => {
    setSchema(schema.map(f => f.id === id ? { ...f, key: newKey.replace(/\s+/g, '_').toLowerCase() } : f));
    setPresetKey('custom');
  };

  const updateFieldType = (id: string, newType: MockDataType) => {
    setSchema(schema.map(f => {
      if (f.id === id) {
        // Initialize appropriate options structure
        let options = f.options || {};
        if (newType === 'randomNumber') {
          options = { ...options, min: 0, max: 100 };
        } else if (newType === 'randomFloat') {
          options = { ...options, min: 0.0, max: 1.0, decimals: 2 };
        } else if (newType === 'customList') {
          options = { ...options, customList: 'Item 1, Item 2, Item 3' };
        }
        return { ...f, type: newType, options };
      }
      return f;
    }));
    setPresetKey('custom');
  };

  const updateFieldOptions = (id: string, newOptions: Partial<Exclude<MockField['options'], undefined>>) => {
    setSchema(schema.map(f => f.id === id ? { ...f, options: { ...f.options, ...newOptions } } : f));
    setPresetKey('custom');
  };

  // Reordering helpers
  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newSchema = [...schema];
    const temp = newSchema[index];
    newSchema[index] = newSchema[index - 1];
    newSchema[index - 1] = temp;
    setSchema(newSchema);
    setPresetKey('custom');
  };

  const moveFieldDown = (index: number) => {
    if (index === schema.length - 1) return;
    const newSchema = [...schema];
    const temp = newSchema[index];
    newSchema[index] = newSchema[index + 1];
    newSchema[index + 1] = temp;
    setSchema(newSchema);
    setPresetKey('custom');
  };

  // Copy output string to clipboard
  const handleCopy = () => {
    const success = copyToClipboard(outputCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download logic
  const handleDownload = () => {
    let extension = 'json';
    let mimeType = 'application/json';
    
    if (activeTab === 'csv') {
      extension = 'csv';
      mimeType = 'text/csv';
    } else if (activeTab === 'yaml') {
      extension = 'yaml';
      mimeType = 'text/yaml';
    } else if (activeTab === 'sql') {
      extension = 'sql';
      mimeType = 'text/plain';
    } else if (activeTab === 'ts') {
      extension = 'ts';
      mimeType = 'text/plain';
    }

    const blob = new Blob([outputCode], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sqlTableName || 'mock_data'}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut listener (CMD+C or CTRL+C to copy current tabs code)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const activeNode = document.activeElement;
        if (
          activeNode &&
          (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA' || activeNode.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [outputCode]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* Global Presets & Row Quantity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-border-hairline rounded-xl p-4">
        
        {/* Preset Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 select-none">Schema Preset:</span>
          <select
            value={presetKey}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="bg-zinc-900 border border-border-hairline text-zinc-150 text-xs font-mono rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-accent-emerald transition-colors"
          >
            <option value="users">User Profile Matrix</option>
            <option value="products">E-commerce Inventory</option>
            <option value="telemetry">IoT Telemetry Metrics</option>
            <option value="blog">Blog Articles / Posts</option>
            <option value="custom">Custom Configuration</option>
          </select>
        </div>

        {/* Quantity Controller & SQL Title */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* SQL Table Name */}
          {(activeTab === 'sql' || activeTab === 'ts') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 select-none">{activeTab === 'sql' ? 'Table Name:' : 'Type Name:'}</span>
              <input
                type="text"
                value={sqlTableName}
                onChange={(e) => setSqlTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="bg-zinc-900 border border-border-hairline text-zinc-100 text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none w-28 focus:border-accent-emerald transition-colors"
                placeholder={activeTab === 'sql' ? 'table_name' : 'TypeName'}
              />
            </div>
          )}

          {/* Record Count */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-border-hairline rounded-lg px-3 py-1.5">
            <span className="text-xs font-mono text-zinc-400 select-none">Quantity:</span>
            <input
              type="number"
              min="1"
              max="200"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 0)))}
              className="bg-transparent text-zinc-100 text-xs font-mono outline-none w-10 text-center"
            />
            <input
              type="range"
              min="1"
              max="150"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-20 md:w-28 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent-emerald"
            />
          </div>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-zinc-300 hover:text-zinc-100 transition-colors text-xs font-mono cursor-pointer flex items-center gap-1.5"
            title="Generate a new batch of random data values"
          >
            <span>🔄</span>
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Main Split-Pane UI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Schema Designer Fields (5 Cols) */}
        <div className="lg:col-span-6 flex flex-col gap-5 bg-panel border border-border-hairline rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-border-hairline/60 pb-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
              <span>📋</span> Schema Definition Setup
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-border-hairline/40">
              {schema.length} Fields Configured
            </span>
          </div>

          {/* Fields List */}
          <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
            {schema.length === 0 ? (
              <div className="w-full text-center py-12 border border-border-hairline border-dashed rounded-xl flex flex-col items-center gap-3">
                <span className="text-3xl">🧹</span>
                <p className="text-xs text-zinc-500 font-sans">No fields defined in schema. Add some fields below to start generating mock records.</p>
              </div>
            ) : (
              schema.map((field, idx) => {
                const groupTypes = DATA_TYPES.reduce((groups, item) => {
                  if (!groups[item.category]) groups[item.category] = [];
                  groups[item.category].push(item);
                  return groups;
                }, {} as Record<string, DataTypeOption[]>);

                return (
                  <div
                    key={field.id}
                    className="flex flex-col gap-2.5 bg-zinc-900/40 border border-border-hairline/60 rounded-xl p-3.5 hover:border-zinc-700 transition-colors group relative"
                  >
                    
                    {/* Header: Key & Type select & Action list */}
                    <div className="flex flex-wrap items-center gap-2">
                      
                      {/* Drag / Sorting Badges */}
                      <div className="flex items-center gap-0.5 border border-border-hairline/40 rounded bg-zinc-950 p-0.5">
                        <button
                          type="button"
                          onClick={() => moveFieldUp(idx)}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 text-[10px] cursor-pointer"
                          title="Move field up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFieldDown(idx)}
                          disabled={idx === schema.length - 1}
                          className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 text-[10px] cursor-pointer"
                          title="Move field down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Key Identifier Input */}
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateFieldKey(field.id, e.target.value)}
                        className="bg-zinc-950 border border-border-hairline text-zinc-100 text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none flex-grow focus:border-accent-emerald transition-colors"
                        placeholder="property_name"
                        title="Key name in final output document"
                      />

                      {/* Data Type Select */}
                      <select
                        value={field.type}
                        onChange={(e) => updateFieldType(field.id, e.target.value as MockDataType)}
                        className="bg-zinc-950 border border-border-hairline text-zinc-150 text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none cursor-pointer w-44 focus:border-accent-emerald transition-colors"
                      >
                        {Object.entries(groupTypes).map(([category, items]) => (
                          <optgroup key={category} label={category} className="bg-zinc-950 text-zinc-400 font-mono text-[11px]">
                            {items.map(item => (
                              <option key={item.value} value={item.value} className="text-zinc-200">
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="w-8 h-8 flex items-center justify-center bg-zinc-950 hover:bg-red-400/15 border border-border-hairline hover:border-red-400 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer text-xs"
                        title="Delete field"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Sub Option Parameters (Numerical min/max, Float precision, list picker) */}
                    {(field.type === 'randomNumber' || field.type === 'randomFloat' || field.type === 'customList') && (
                      <div className="bg-zinc-950/60 border border-border-hairline/40 rounded-lg p-2.5 flex flex-col gap-2 mt-0.5">
                        {/* Numerical custom range */}
                        {(field.type === 'randomNumber' || field.type === 'randomFloat') && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">Min Value</span>
                              <input
                                type="number"
                                step={field.type === 'randomFloat' ? '0.1' : '1'}
                                value={field.options?.min ?? 0}
                                onChange={(e) => updateFieldOptions(field.id, { min: parseFloat(e.target.value) || 0 })}
                                className="bg-zinc-900 border border-border-hairline/80 text-zinc-100 text-[11px] font-mono rounded-md px-2 py-1 outline-none focus:border-accent-emerald"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">Max Value</span>
                              <input
                                type="number"
                                step={field.type === 'randomFloat' ? '0.1' : '1'}
                                value={field.options?.max ?? 100}
                                onChange={(e) => updateFieldOptions(field.id, { max: parseFloat(e.target.value) || 0 })}
                                className="bg-zinc-900 border border-border-hairline/80 text-zinc-100 text-[11px] font-mono rounded-md px-2 py-1 outline-none focus:border-accent-emerald"
                              />
                            </div>
                            {field.type === 'randomFloat' && (
                              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                <span className="text-[10px] font-mono text-zinc-500 uppercase">Decimals</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={field.options?.decimals ?? 2}
                                  onChange={(e) => updateFieldOptions(field.id, { decimals: Math.max(1, Math.min(5, parseInt(e.target.value) || 2)) })}
                                  className="bg-zinc-900 border border-border-hairline/80 text-zinc-100 text-[11px] font-mono rounded-md px-2 py-1 outline-none focus:border-accent-emerald"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Custom list choices */}
                        {field.type === 'customList' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Comma-Separated Selection List</span>
                            <textarea
                              rows={1}
                              value={field.options?.customList || ''}
                              onChange={(e) => updateFieldOptions(field.id, { customList: e.target.value })}
                              className="bg-zinc-900 border border-border-hairline/80 text-zinc-100 text-[11px] font-mono rounded-md px-2 py-1 outline-none focus:border-accent-emerald resize-none"
                              placeholder="Red, Green, Blue, Alpha"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tooltip Description */}
                    <div className="text-[10px] text-zinc-500 font-sans italic pl-1 leading-snug">
                      {DATA_TYPES.find(d => d.value === field.type)?.description}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Field Button */}
          <button
            type="button"
            onClick={addField}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-border-hairline hover:border-zinc-650 text-zinc-300 hover:text-zinc-50 font-mono text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
          >
            <span>+</span>
            <span>Add Field Property</span>
          </button>
        </div>

        {/* Right Column: Parsed Document Output Terminal (7 Cols) */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          
          {/* Output Pane */}
          <div className="bg-panel border border-border-hairline rounded-xl p-5 flex flex-col gap-4">
            
            {/* Header: format toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline/60 pb-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold font-mono flex items-center gap-1.5">
                <span>⚡</span> Format Output Code
              </h3>
              
              {/* Toggles */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-border-hairline p-0.5 rounded-lg">
                {(['json', 'csv', 'yaml', 'sql', 'ts'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded-md cursor-pointer select-none transition-all ${
                      activeTab === tab
                        ? 'bg-zinc-800 text-accent-emerald border border-zinc-700 font-semibold shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {tab === 'ts' ? 'TypeScript' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Document display window */}
            <div className="relative group bg-zinc-950 border border-border-hairline rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-hidden">
              <pre
                ref={outputPreRef}
                className="max-h-[440px] overflow-y-auto pr-16 select-text text-accent-emerald scrollbar-thin whitespace-pre leading-relaxed"
              >
                <code>{outputCode}</code>
              </pre>

              {/* Absolute Action Buttons on Box */}
              <div className="absolute right-4 top-4 flex flex-col sm:flex-row gap-2">
                
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {copied ? (
                    <span className="text-accent-emerald font-semibold animate-pulse">Copied!</span>
                  ) : (
                    <>
                      <span>Copy</span>
                      <kbd className="font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700 text-[8px] text-zinc-500 group-hover:text-zinc-400">⌘ C</kbd>
                    </>
                  )}
                </button>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-border-hairline/80 text-zinc-300 hover:text-accent-emerald text-[11px] font-mono rounded-md shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title={`Download local file with data`}
                >
                  <span>⬇</span>
                  <span>Download</span>
                </button>
              </div>
            </div>
            
            {/* 100% Privacy status bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-zinc-550 border-t border-border-hairline/60 pt-3 select-none">
              <span className="flex items-center gap-1.5 text-accent-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
                Processed locally in browser. Zero server transmission.
              </span>
              <span>100% Offline Secured sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
