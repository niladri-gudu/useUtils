/**
 * Core utility engine for Fake User & Mock Data Generation.
 * Running 100% locally in the browser with zero server transmission.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type MockDataType =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'avatar'
  | 'email'
  | 'phone'
  | 'username'
  | 'password'
  | 'country'
  | 'countryCode'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'streetAddress'
  | 'latitude'
  | 'longitude'
  | 'companyName'
  | 'jobTitle'
  | 'department'
  | 'industry'
  | 'ipV4'
  | 'ipV6'
  | 'macAddress'
  | 'userAgent'
  | 'uuid'
  | 'nanoid'
  | 'randomNumber'
  | 'randomFloat'
  | 'boolean'
  | 'customList'
  | 'word'
  | 'sentence'
  | 'paragraph'
  | 'loremIpsum';

export interface MockField {
  id: string;
  key: string;
  type: MockDataType;
  options?: {
    min?: number;
    max?: number;
    decimals?: number;
    customList?: string; // Comma-separated
  };
}

export type MockSchema = MockField[];

// ============================================================================
// Local Datasets
// ============================================================================

const FIRST_NAMES_MALE = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
  'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Frank', 'Patrick', 'Raymond', 'Jack', 'Dennis', 'Jerry'
];

const FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Lisa', 'Nancy', 'Betty', 'Sandra', 'Margaret', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Carol', 'Amanda', 'Dorothy', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
  'Kathleen', 'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela', 'Emma', 'Nicole', 'Helen',
  'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel', 'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'example.com'];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderqueer', 'Agender'];

const GEOGRAPHY = [
  { country: 'United States', code: 'US', states: ['California', 'Texas', 'New York', 'Florida', 'Washington', 'Illinois'], cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle'] },
  { country: 'United Kingdom', code: 'GB', states: ['England', 'Scotland', 'Wales', 'Northern Ireland'], cities: ['London', 'Birmingham', 'Glasgow', 'Manchester', 'Edinburgh', 'Belfast'] },
  { country: 'Canada', code: 'CA', states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba'], cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Winnipeg'] },
  { country: 'Germany', code: 'DE', states: ['Bavaria', 'Berlin', 'Hamburg', 'North Rhine-Westphalia', 'Hesse'], cities: ['Munich', 'Berlin', 'Hamburg', 'Cologne', 'Frankfurt'] },
  { country: 'France', code: 'FR', states: ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes'], cities: ['Paris', 'Marseille', 'Lyon', 'Nice', 'Toulouse'] },
  { country: 'India', code: 'IN', states: ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Telangana'], cities: ['Mumbai', 'Bangalore', 'New Delhi', 'Chennai', 'Hyderabad'] },
  { country: 'Japan', code: 'JP', states: ['Tokyo', 'Osaka', 'Kyoto', 'Hokkaido', 'Fukuoka'], cities: ['Tokyo', 'Osaka', 'Kyoto', 'Sapporo', 'Fukuoka'] },
  { country: 'Australia', code: 'AU', states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'], cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
  { country: 'Brazil', code: 'BR', states: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia'], cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador'] },
  { country: 'Netherlands', code: 'NL', states: ['North Holland', 'South Holland', 'Utrecht'], cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'] }
];

const STREET_NAMES = [
  'Maple Street', 'Oak Avenue', 'Pine Road', 'Cedar Lane', 'Elm Boulevard', 'Spruce Way', 'Willow Drive',
  'Birch Court', 'Sunset Highway', 'Broadway', 'Main Street', 'Park Place', 'High Street', 'Market Lane'
];

const COMPANY_PREFIXES = ['Apex', 'Quantum', 'Zenith', 'Nova', 'Synergy', 'Vertex', 'Pulse', 'Cobalt', 'Helix', 'Matrix', 'Catalyst', 'Omni', 'Stellar', 'Orion', 'Vortex', 'Aether', 'Ascent', 'Flux', 'Prism', 'Stratum'];
const COMPANY_SUFFIXES = ['Technologies', 'Solutions', 'Labs', 'Systems', 'Global', 'Group', 'Industries', 'Ventures', 'Partners', 'Networks', 'Software', 'Dynamics', 'Consulting', 'Agency'];

const JOB_AREAS = ['Senior Frontend', 'Junior Backend', 'Full Stack', 'Lead DevOps', 'UX/UI', 'Cloud Security', 'Systems', 'Principal Security', 'Product', 'Data Science', 'Machine Learning', 'Database', 'QA Automation', 'Solutions'];
const JOB_TITLES = ['Developer', 'Engineer', 'Architect', 'Designer', 'Specialist', 'Manager', 'Lead', 'Analyst', 'Director', 'Consultant'];

const DEPARTMENTS = ['Engineering', 'Product Management', 'Design', 'Marketing', 'Sales', 'Customer Success', 'Finance', 'Human Resources', 'Operations', 'Security', 'Legal', 'Communications'];

const INDUSTRIES = ['Software & SaaS', 'Biotechnology', 'Cybersecurity', 'Financial Services', 'E-commerce', 'Aerospace', 'Telecommunications', 'Healthcare', 'Clean Energy', 'Artificial Intelligence', 'Logistics', 'Education'];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/605.1.15'
];

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'ut',
  'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
  'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor',
  'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat',
  'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in',
  'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'author',
  'developer', 'code', 'utility', 'browser', 'local', 'sandbox', 'crypto', 'secure', 'random', 'engine'
];

// Helper: DJB2 simple string hash
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// ============================================================================
// SVG Geometric Avatar Generator (100% Offline & Pure Local Vector)
// ============================================================================
export function generateSvgAvatar(username: string): string {
  const hash = hashString(username || 'seed');
  
  // High quality palettes (Dark and modern contrasting tones)
  const palettes = [
    { bg: '#0f172a', shapes: ['#38bdf8', '#818cf8', '#34d399', '#f472b6'] }, // slate / cool
    { bg: '#172554', shapes: ['#60a5fa', '#a78bfa', '#f472b6', '#38bdf8'] }, // blue / purple
    { bg: '#14532d', shapes: ['#4ade80', '#2dd4bf', '#a3e635', '#fbbf24'] }, // green / emerald
    { bg: '#581c87', shapes: ['#c084fc', '#f472b6', '#60a5fa', '#818cf8'] }, // deep purple
    { bg: '#7c2d12', shapes: ['#fb923c', '#facc15', '#f87171', '#4ade80'] }  // orange / warm
  ];
  
  const paletteIndex = hash % palettes.length;
  const palette = palettes[paletteIndex];
  
  const width = 120;
  const height = 120;
  
  let shapesSvg = '';
  
  // Build a deterministic set of geometric layers using the hash bits
  const shapeCount = 3 + (hash % 3); // 3 to 5 shapes
  for (let i = 0; i < shapeCount; i++) {
    const shapeHash = hashString(username + i);
    const color = palette.shapes[shapeHash % palette.shapes.length];
    const opacity = 0.35 + ((shapeHash % 40) / 100); // 0.35 - 0.75 opacity
    const shapeType = shapeHash % 3; // 0: Circle, 1: Triangle/Polygon, 2: Rect
    
    if (shapeType === 0) {
      // Circle
      const r = 15 + (shapeHash % 25);
      const cx = 20 + (shapeHash % 80);
      const cy = 20 + (shapeHash % 80);
      shapesSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" />`;
    } else if (shapeType === 1) {
      // Triangle / Polygon
      const pointsCount = 3 + (shapeHash % 2); // 3 or 4 points
      let points = '';
      for (let p = 0; p < pointsCount; p++) {
        const pHash = hashString(username + i + 'pt' + p);
        const px = 10 + (pHash % 100);
        const py = 10 + (pHash % 100);
        points += `${px},${py} `;
      }
      shapesSvg += `<polygon points="${points.trim()}" fill="${color}" opacity="${opacity}" />`;
    } else {
      // Rectangle / Square
      const w = 20 + (shapeHash % 45);
      const h = 20 + (shapeHash % 45);
      const x = 10 + (shapeHash % 70);
      const y = 10 + (shapeHash % 70);
      const rx = (shapeHash % 2 === 0) ? 4 : 0;
      shapesSvg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}" opacity="${opacity}" />`;
    }
  }

  // Add a central symmetrical pattern layer to make it look cool/emblematic
  const patternHash = hashString(username + 'pattern');
  const emblemColor = '#ffffff';
  const emblemOpacity = 0.8;
  const patternType = patternHash % 3;
  
  if (patternType === 0) {
    // Symmetrical cross/target
    shapesSvg += `
      <circle cx="60" cy="60" r="18" fill="none" stroke="${emblemColor}" stroke-width="4" opacity="${emblemOpacity}" />
      <line x1="60" y1="30" x2="60" y2="90" stroke="${emblemColor}" stroke-width="4" stroke-linecap="round" opacity="${emblemOpacity}" />
      <line x1="30" y1="60" x2="90" y2="60" stroke="${emblemColor}" stroke-width="4" stroke-linecap="round" opacity="${emblemOpacity}" />
    `;
  } else if (patternType === 1) {
    // Symmetrical diamond grids
    shapesSvg += `
      <rect x="42" y="42" width="36" height="36" transform="rotate(45 60 60)" fill="none" stroke="${emblemColor}" stroke-width="4" opacity="${emblemOpacity}" />
      <circle cx="60" cy="60" r="6" fill="${emblemColor}" opacity="${emblemOpacity}" />
    `;
  } else {
    // Concentric orbital paths
    shapesSvg += `
      <circle cx="60" cy="60" r="24" fill="none" stroke="${emblemColor}" stroke-width="3" stroke-dasharray="6,4" opacity="${emblemOpacity - 0.2}" />
      <circle cx="60" cy="60" r="12" fill="none" stroke="${emblemColor}" stroke-width="4" opacity="${emblemOpacity}" />
      <circle cx="60" cy="60" r="3" fill="${emblemColor}" opacity="${emblemOpacity}" />
    `;
  }
  
  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
      <rect width="120" height="120" rx="20" fill="${palette.bg}" />
      <g>
        ${shapesSvg}
      </g>
    </svg>
  `.replace(/\s+/g, ' ').trim();
  
  // Returns browser-safe inline base64 image URL
  const base64Svg = typeof btoa !== 'undefined' ? btoa(fullSvg) : Buffer.from(fullSvg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// ============================================================================
// Core Data Generator Functions
// ============================================================================

export function generateFieldData(field: MockField, index: number): any {
  // Deterministic seed mixing math + random parameters
  const seedNum = Math.floor(Math.random() * 10000) + index;
  
  const selectRandom = (arr: any[]) => arr[seedNum % arr.length];
  
  const isFemale = seedNum % 2 === 0;
  const firstName = isFemale ? selectRandom(FIRST_NAMES_FEMALE) : selectRandom(FIRST_NAMES_MALE);
  const lastName = selectRandom(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const gender = isFemale ? 'Female' : 'Male';
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seedNum % 100}`;
  
  // Pull a geo block
  const geo = selectRandom(GEOGRAPHY);
  const geoIndex = seedNum % geo.cities.length;
  const city = geo.cities[geoIndex];
  const state = geo.states[seedNum % geo.states.length] || 'Province';
  const country = geo.country;
  const countryCode = geo.code;

  switch (field.type) {
    case 'fullName':
      return fullName;
    case 'firstName':
      return firstName;
    case 'lastName':
      return lastName;
    case 'gender':
      // Select gender from GENDERS or map based on name selection
      return seedNum % 5 === 0 ? selectRandom(GENDERS.slice(2)) : gender;
    case 'avatar':
      return generateSvgAvatar(username);
    case 'email':
      return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seedNum % 10}@${selectRandom(EMAIL_DOMAINS)}`;
    case 'phone':
      return `+1 (${200 + (seedNum % 700)}) 555-${String(1000 + (seedNum % 9000)).substring(0, 4)}`;
    case 'username':
      return username;
    case 'password':
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
      let pass = '';
      for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    case 'country':
      return country;
    case 'countryCode':
      return countryCode;
    case 'city':
      return city;
    case 'state':
      return state;
    case 'zipCode':
      return String(10000 + (seedNum % 90000));
    case 'streetAddress':
      return `${100 + (seedNum % 8900)} ${selectRandom(STREET_NAMES)}`;
    case 'latitude':
      // Range: -90.0 to 90.0
      return parseFloat((-90 + ((seedNum * 1.543) % 180)).toFixed(6));
    case 'longitude':
      // Range: -180.0 to 180.0
      return parseFloat((-180 + ((seedNum * 2.871) % 360)).toFixed(6));
    case 'companyName':
      return `${selectRandom(COMPANY_PREFIXES)} ${selectRandom(COMPANY_SUFFIXES)}`;
    case 'jobTitle':
      return `${selectRandom(JOB_AREAS)} ${selectRandom(JOB_TITLES)}`;
    case 'department':
      return selectRandom(DEPARTMENTS);
    case 'industry':
      return selectRandom(INDUSTRIES);
    case 'ipV4':
      return `${10 + (seedNum % 200)}.${seedNum % 255}.${(seedNum * 3) % 255}.${(seedNum * 7) % 254 + 1}`;
    case 'ipV6':
      const hex = '0123456789abcdef';
      let ipParts = [];
      for (let i = 0; i < 8; i++) {
        let part = '';
        for (let j = 0; j < 4; j++) {
          part += hex.charAt(Math.floor(Math.random() * 16));
        }
        ipParts.push(part);
      }
      return ipParts.join(':');
    case 'macAddress':
      const hexMac = '0123456789ABCDEF';
      let macParts = [];
      for (let i = 0; i < 6; i++) {
        macParts.push(hexMac.charAt(Math.floor(Math.random() * 16)) + hexMac.charAt(Math.floor(Math.random() * 16)));
      }
      return macParts.join(':');
    case 'userAgent':
      return selectRandom(USER_AGENTS);
    case 'uuid':
      // Local fallback v4 UUID format
      const uChars = '0123456789abcdef';
      let uuidVal = '';
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          uuidVal += '-';
        } else if (i === 14) {
          uuidVal += '4';
        } else if (i === 19) {
          uuidVal += uChars.charAt((Math.floor(Math.random() * 4) + 8));
        } else {
          uuidVal += uChars.charAt(Math.floor(Math.random() * 16));
        }
      }
      return uuidVal;
    case 'nanoid':
      const nanoidChars = 'usepaceFHklmnopqrstuwyzIEDNLAOBGHRXJKSTUVWYZbcdfghjklmnpqrstvwxyz0123456789';
      let nanoidVal = '';
      for (let i = 0; i < 21; i++) {
        nanoidVal += nanoidChars.charAt(Math.floor(Math.random() * nanoidChars.length));
      }
      return nanoidVal;
    case 'randomNumber': {
      const min = field.options?.min ?? 0;
      const max = field.options?.max ?? 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    case 'randomFloat': {
      const min = field.options?.min ?? 0.0;
      const max = field.options?.max ?? 1.0;
      const decimals = field.options?.decimals ?? 2;
      const val = Math.random() * (max - min) + min;
      return parseFloat(val.toFixed(decimals));
    }
    case 'boolean':
      return Math.random() > 0.5;
    case 'customList': {
      const listString = field.options?.customList || 'Apple, Orange, Banana';
      const items = listString.split(',').map(item => item.trim()).filter(Boolean);
      if (items.length === 0) return 'Placeholder';
      return selectRandom(items);
    }
    case 'word':
      return selectRandom(LOREM_WORDS);
    case 'sentence': {
      const wordsCount = 5 + (seedNum % 5); // 5 to 9 words
      const words = [];
      for (let i = 0; i < wordsCount; i++) {
        words.push(selectRandom(LOREM_WORDS));
      }
      const sent = words.join(' ');
      return sent.charAt(0).toUpperCase() + sent.slice(1) + '.';
    }
    case 'paragraph': {
      const sentCount = 3 + (seedNum % 3); // 3 to 5 sentences
      const sentences = [];
      for (let s = 0; s < sentCount; s++) {
        const wordsCount = 6 + (Math.floor(Math.random() * 6));
        const words = [];
        for (let i = 0; i < wordsCount; i++) {
          words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
        }
        const sent = words.join(' ');
        sentences.push(sent.charAt(0).toUpperCase() + sent.slice(1) + '.');
      }
      return sentences.join(' ');
    }
    case 'loremIpsum':
      return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
    default:
      return 'MockData';
  }
}

export function generateMockData(schema: MockSchema, count: number): any[] {
  const data = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    schema.forEach(field => {
      row[field.key || 'unnamed_field'] = generateFieldData(field, i);
    });
    data.push(row);
  }
  return data;
}

// ============================================================================
// Formatter Functions
// ============================================================================

export function convertToJson(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

export function convertToCsv(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  
  const escapeCsvValue = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCsvValue).join(',');
  const rowLines = data.map(row => 
    headers.map(header => escapeCsvValue(row[header])).join(',')
  );

  return [headerRow, ...rowLines].join('\n');
}

export function convertToYaml(data: any[]): string {
  if (data.length === 0) return '[]';
  
  const formatValue = (val: any): string => {
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (typeof val === 'string') {
      // Escape if contains special YAML characters or newlines
      if (val.includes('\n') || val.includes(':') || val.includes('"') || val.startsWith('-') || val.startsWith(' ')) {
        return `"${val.replace(/"/g, '\\"')}"`;
      }
      return val;
    }
    return JSON.stringify(val);
  };

  let yaml = '';
  data.forEach((row, i) => {
    const keys = Object.keys(row);
    keys.forEach((key, j) => {
      const prefix = j === 0 ? '- ' : '  ';
      const formattedVal = formatValue(row[key]);
      yaml += `${prefix}${key}: ${formattedVal}\n`;
    });
  });

  return yaml;
}

export function convertToSql(data: any[], tableName: string = 'mock_table'): string {
  if (data.length === 0) return '-- No data generated';
  const table = tableName.replace(/[^a-zA-Z0-9_]/g, '') || 'mock_table';
  const cols = Object.keys(data[0]);
  const columnsList = cols.map(c => `\`${c}\``).join(', ');

  const formatSqlValue = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const insertStatements = data.map(row => {
    const valuesList = cols.map(col => formatSqlValue(row[col])).join(', ');
    return `INSERT INTO \`${table}\` (${columnsList}) VALUES (${valuesList});`;
  });

  return [
    `-- SQL inserts generated by useUtils.com`,
    `-- Table schema placeholder - update column definitions as needed`,
    `-- CREATE TABLE \`${table}\` (`,
    ...cols.map((col, idx) => `--   \`${col}\` ${typeof data[0][col] === 'number' ? 'DOUBLE' : typeof data[0][col] === 'boolean' ? 'BOOLEAN' : 'VARCHAR(255)'}${idx === cols.length - 1 ? '' : ','}`),
    `-- );`,
    ``,
    ...insertStatements
  ].join('\n');
}

export function generateTypeScriptTypes(schema: MockSchema, rootName: string = 'MockDataRow'): string {
  const mapType = (type: MockDataType): string => {
    switch (type) {
      case 'randomNumber':
      case 'randomFloat':
      case 'latitude':
      case 'longitude':
        return 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  };

  const fields = schema.map(field => {
    const tsType = mapType(field.type);
    return `  ${field.key || 'unnamed'}: ${tsType};`;
  }).join('\n');

  const interfaceName = rootName.replace(/[^a-zA-Z0-9_]/g, '') || 'MockDataRow';

  return [
    `export interface ${interfaceName} {`,
    fields,
    `}`,
    ``,
    `// Type definition for list of rows`,
    `export type ${interfaceName}List = ${interfaceName}[];`
  ].join('\n');
}
