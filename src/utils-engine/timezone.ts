/**
 * Core utility engine for timezone conversions, meeting time optimizations,
 * calendar link generation, and log timezone parsing.
 * Utilizes native Intl APIs for zero-dependency local performance.
 */

export interface TimeZoneDetails {
  id: string;             // IANA ID, e.g., "America/New_York"
  cityName: string;       // e.g., "New York"
  regionName: string;     // e.g., "America"
  currentTime: string;    // e.g., "14:30"
  currentDate: string;    // e.g., "Mon, Jun 15"
  offsetMinutes: number;  // Offset in minutes
  offsetString: string;   // e.g., "UTC-04:00"
  isDst: boolean;         // True if currently in Daylight Saving Time
  hasDst: boolean;        // True if the zone ever shifts for DST
}

export interface OverlapWindow {
  hourIndex: number;      // 0 to 23 (base timezone hour index)
  utcHour: number;        // UTC hour (0-23)
  score: number;          // 0 to 100 based on overlap quality
  classification: 'core' | 'shoulder' | 'sleeping'; // Overall classification
  zoneStatus: Record<string, {
    hour: number;
    type: 'core' | 'shoulder' | 'sleeping';
  }>;
}

// Map of popular timezones with friendly shorthand descriptions for quick access
export const POPULAR_TIMEZONES = [
  { id: 'UTC', cityName: 'Coordinated Universal Time', regionName: 'Global' },
  { id: 'America/New_York', cityName: 'New York', regionName: 'Eastern Time' },
  { id: 'America/Chicago', cityName: 'Chicago', regionName: 'Central Time' },
  { id: 'America/Denver', cityName: 'Denver', regionName: 'Mountain Time' },
  { id: 'America/Los_Angeles', cityName: 'Los Angeles', regionName: 'Pacific Time' },
  { id: 'Europe/London', cityName: 'London', regionName: 'Western Europe' },
  { id: 'Europe/Paris', cityName: 'Paris', regionName: 'Central Europe' },
  { id: 'Europe/Moscow', cityName: 'Moscow', regionName: 'Russia' },
  { id: 'Asia/Dubai', cityName: 'Dubai', regionName: 'Gulf Time' },
  { id: 'Asia/Kolkata', cityName: 'Kolkata', regionName: 'India Standard Time' },
  { id: 'Asia/Singapore', cityName: 'Singapore', regionName: 'Singapore' },
  { id: 'Asia/Tokyo', cityName: 'Tokyo', regionName: 'Japan Standard Time' },
  { id: 'Australia/Sydney', cityName: 'Sydney', regionName: 'Eastern Australia' },
  { id: 'Pacific/Auckland', cityName: 'Auckland', regionName: 'New Zealand' }
];

/**
 * Returns a list of all IANA timezone identifiers supported by the environment.
 */
export function getIanaTimeZones(): string[] {
  try {
    const rawZones = Intl.supportedValuesOf('timeZone');
    // Filter out legacy aliases (like Asia/Calcutta in favor of Asia/Kolkata)
    return rawZones.filter(z => z !== 'Asia/Calcutta');
  } catch (e) {
    // Fallback list if unsupported
    return POPULAR_TIMEZONES.map(z => z.id);
  }
}

/**
 * Parses IANA timezone ID to extract region and city names.
 */
export function parseIanaName(tzId: string): { city: string; region: string } {
  const parts = tzId.split('/');
  if (parts.length === 1) {
    return { city: parts[0], region: 'Global' };
  }
  const region = parts[0];
  const city = parts[parts.length - 1].replace(/_/g, ' ');
  return { city, region };
}

/**
 * Calculates timezone offset in minutes at a given date.
 */
export function getTimeZoneOffset(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        partMap[part.type] = parseInt(part.value, 10);
      }
    }
    
    const targetUtc = Date.UTC(
      partMap.year,
      partMap.month - 1,
      partMap.day,
      partMap.hour === 24 ? 0 : partMap.hour,
      partMap.minute,
      partMap.second || 0
    );
    
    const sourceUtc = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    
    return Math.round((targetUtc - sourceUtc) / 60000);
  } catch (e) {
    // Default fallback to local timezone offset if calculation fails
    return -date.getTimezoneOffset();
  }
}

/**
 * Returns detailed timezone stats including DST flags, dates, and offsets.
 */
export function getTimeZoneDetails(date: Date, timeZone: string): TimeZoneDetails {
  const offsetMinutes = getTimeZoneOffset(date, timeZone);
  const offsetHrs = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetString = `UTC${sign}${offsetHrs.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;

  const { city, region } = parseIanaName(timeZone);

  // DST calculations
  const year = date.getFullYear();
  const offsetJan = getTimeZoneOffset(new Date(year, 0, 1), timeZone);
  const offsetJul = getTimeZoneOffset(new Date(year, 6, 1), timeZone);
  const hasDst = offsetJan !== offsetJul;
  
  let isDst = false;
  if (hasDst) {
    // Standard offset is usually the smaller offset (winter)
    const standardOffset = Math.min(offsetJan, offsetJul);
    // DST offset is the larger offset (summer daylight shift)
    isDst = offsetMinutes !== standardOffset;
  }

  // Format current time and date in the target timezone
  let currentTime = '00:00';
  let currentDate = '';
  
  try {
    currentTime = date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    currentDate = date.toLocaleDateString('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    // Fallback formats
    const localAdjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
    currentTime = `${localAdjusted.getUTCHours().toString().padStart(2, '0')}:${localAdjusted.getUTCMinutes().toString().padStart(2, '0')}`;
    currentDate = localAdjusted.toUTCString().slice(0, 11);
  }

  return {
    id: timeZone,
    cityName: city,
    regionName: region,
    currentTime,
    currentDate,
    offsetMinutes,
    offsetString,
    isDst,
    hasDst
  };
}

/**
 * Hour Classification: core working hours vs shoulders vs sleep.
 */
export function classifyHour(hour: number, workStart = 9, workEnd = 17): 'core' | 'shoulder' | 'sleeping' {
  if (hour >= workStart && hour < workEnd) {
    return 'core';
  }
  // Shoulder hours: 7-9 AM, or 5-9 PM (17:00 to 21:00)
  if ((hour >= 7 && hour < workStart) || (hour >= workEnd && hour < 21)) {
    return 'shoulder';
  }
  return 'sleeping';
}

/**
 * Optimizes meeting schedules for a list of target timezones.
 * Returns overlap windows for all 24 hours of the base date.
 */
export function getTimelineOverlap(
  baseDate: Date,
  baseZone: string,
  targetZones: string[],
  workStart = 9,
  workEnd = 18
): OverlapWindow[] {
  const timeline: OverlapWindow[] = [];
  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);

  // For each hour index in the base date
  for (let hourIndex = 0; hourIndex < 24; hourIndex++) {
    const activeTime = new Date(startOfDay.getTime() + hourIndex * 3600000);
    const baseHour = activeTime.getHours();
    
    // Convert to UTC hour
    const utcHour = activeTime.getUTCHours();
    
    const zoneStatus: Record<string, { hour: number; type: 'core' | 'shoulder' | 'sleeping' }> = {};
    let coreCount = 0;
    let shoulderCount = 0;
    let sleepingCount = 0;

    // Check base zone status
    const baseTzHour = baseHour;
    const baseClass = classifyHour(baseTzHour, workStart, workEnd);
    zoneStatus[baseZone] = { hour: baseTzHour, type: baseClass };
    if (baseClass === 'core') coreCount++;
    else if (baseClass === 'shoulder') shoulderCount++;
    else sleepingCount++;

    // Check target zones status
    for (const zone of targetZones) {
      const offsetMinutes = getTimeZoneOffset(activeTime, zone);
      const zoneTime = new Date(activeTime.getTime() + (offsetMinutes + activeTime.getTimezoneOffset()) * 60000);
      const zoneHour = zoneTime.getHours();
      
      const zoneClass = classifyHour(zoneHour, workStart, workEnd);
      zoneStatus[zone] = { hour: zoneHour, type: zoneClass };
      if (zoneClass === 'core') coreCount++;
      else if (zoneClass === 'shoulder') shoulderCount++;
      else sleepingCount++;
    }

    const totalZones = targetZones.length + 1;
    
    // Scoring logic:
    // Core = 100 points, Shoulder = 50 points, Sleeping = 0 points.
    const rawScore = (coreCount * 100 + shoulderCount * 50) / totalZones;
    const score = Math.round(rawScore);

    // Group classification
    let groupClass: 'core' | 'shoulder' | 'sleeping' = 'sleeping';
    if (coreCount === totalZones) {
      groupClass = 'core';
    } else if (sleepingCount > 0 && coreCount === 0) {
      groupClass = 'sleeping';
    } else {
      groupClass = 'shoulder';
    }

    timeline.push({
      hourIndex,
      utcHour,
      score,
      classification: groupClass,
      zoneStatus
    });
  }

  return timeline;
}

/**
 * Standard templates to convert timestamps inside raw log blocks.
 */
export interface LogMatch {
  index: number;
  originalText: string;
  parsedDate: Date;
  convertedText: string;
}

export function parseLogs(logText: string, targetZone: string): { rewrittenText: string; matches: LogMatch[] } {
  const matches: LogMatch[] = [];
  let indexCounter = 0;

  // Regex patterns to detect dates
  // Pattern 1: ISO 8601 timestamps e.g. 2026-06-15T06:53:02.000Z or 2026-06-15 06:53:02Z or 2026-06-15T12:22:18+05:30
  const isoRegex = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/g;

  // Pattern 2: Apache/Nginx standard log dates e.g. 15/Jun/2026:12:22:18 +0530
  const commonLogRegex = /(\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})/g;

  let rewrittenText = logText;

  // We scan the log for ISO matches first
  const parsedIsos = new Set<string>();
  let match;
  
  // Re-run regex on clean copies
  const textToProcess = logText;
  
  // Track replacements to do in order
  const replacements: { original: string; replacement: string; date: Date }[] = [];

  // Parse ISO stamps
  const isoMatches = textToProcess.matchAll(isoRegex);
  for (const m of isoMatches) {
    const raw = m[0];
    if (parsedIsos.has(raw)) continue;
    parsedIsos.add(raw);
    
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      const date = new Date(parsed);
      const convertedStr = formatInTimeZone(date, targetZone);
      replacements.push({ original: raw, replacement: convertedStr, date });
    }
  }

  // Parse Apache/Common format stamps
  const clMatches = textToProcess.matchAll(commonLogRegex);
  for (const m of clMatches) {
    const raw = m[0];
    if (parsedIsos.has(raw)) continue; // avoid duplicates
    parsedIsos.add(raw);

    // Format: 15/Jun/2026:12:22:18 +0530
    // We rewrite to standard parseable format: Jun 15 2026 12:22:18 +0530
    const parts = raw.split(':');
    if (parts.length >= 4) {
      const datePart = parts[0]; // 15/Jun/2026
      const dateSubparts = datePart.split('/');
      if (dateSubparts.length === 3) {
        const day = dateSubparts[0];
        const month = dateSubparts[1];
        const year = dateSubparts[2];
        const timePart = `${parts[1]}:${parts[2]}:${parts[3]}`; // 12:22:18 +0530
        const parseableStr = `${month} ${day} ${year} ${timePart}`;
        const parsed = Date.parse(parseableStr);
        if (!isNaN(parsed)) {
          const date = new Date(parsed);
          const convertedStr = formatInTimeZone(date, targetZone);
          replacements.push({ original: raw, replacement: convertedStr, date });
        }
      }
    }
  }

  // Perform replacements in order of length descending to prevent substring issues
  replacements.sort((a, b) => b.original.length - a.original.length);

  for (const item of replacements) {
    // Avoid double matching
    const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapeRegex(item.original), 'g');
    rewrittenText = rewrittenText.replace(regex, item.replacement);
    
    matches.push({
      index: ++indexCounter,
      originalText: item.original,
      parsedDate: item.date,
      convertedText: item.replacement
    });
  }

  return { rewrittenText, matches };
}

/**
 * Formats a date into a clean ISO-like string using the local target timezone offset.
 */
export function formatInTimeZone(date: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const m: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        m[part.type] = part.value;
      }
    }

    const offset = getTimeZoneOffset(date, timeZone);
    const absOffset = Math.abs(offset);
    const hrs = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const mins = (absOffset % 60).toString().padStart(2, '0');
    const sign = offset >= 0 ? '+' : '-';
    
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second} (UTC${sign}${hrs}:${mins})`;
  } catch (e) {
    return date.toISOString();
  }
}

/**
 * Calendar link generator utilities.
 */
export function generateCalendarLinks(
  title: string,
  startTime: Date,
  durationMins: number,
  description = ''
): { google: string; outlook: string; yahoo: string; ics: string } {
  const endTime = new Date(startTime.getTime() + durationMins * 60000);
  
  const formatDateISO = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startStr = formatDateISO(startTime);
  const endStr = formatDateISO(endTime);

  // Google Calendar
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description)}&sf=true&output=xml`;

  // Outlook Calendar
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${startStr}&enddt=${endStr}&body=${encodeURIComponent(description)}`;

  // Yahoo Calendar
  const yahoo = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(title)}&st=${startStr}&et=${endStr}&desc=${encodeURIComponent(description)}`;

  // ICS File Content URL (Data URI)
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//useUtils//Meeting Planner//EN',
    'BEGIN:VEVENT',
    `UID:${startTime.getTime()}@useutils.com`,
    `DTSTAMP:${formatDateISO(new Date())}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { google, outlook, yahoo, ics };
}
