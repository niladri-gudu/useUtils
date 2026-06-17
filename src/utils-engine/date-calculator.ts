/**
 * Core Date & Duration Calculator utility engine.
 * Provides functions for difference, adjuster, and duration accumulator calculations.
 * 100% dependency-free, running locally on standard JS Date/Math objects.
 */

export interface DateDiffResult {
  isNegative: boolean;
  totalDays: number;
  businessDays: number;
  weeks: number;
  remainingDays: number;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Calculates the difference between two Dates.
 * Handles chronological differences, business days (Mon-Fri), and detailed Y/M/D breakdowns.
 */
export function calculateDateDiff(
  d1: Date,
  d2: Date,
  includeEndDay: boolean = false,
  onlyBusinessDays: boolean = false
): DateDiffResult {
  const start = new Date(d1);
  const end = new Date(d2);

  // Determine chronological ordering
  const isNegative = start.getTime() > end.getTime();
  const dateA = isNegative ? end : start;
  const dateB = isNegative ? start : end;

  // Clone dateB for inclusive computations
  if (includeEndDay && !isNegative) {
    dateB.setDate(dateB.getDate() + 1);
  } else if (includeEndDay && isNegative) {
    dateA.setDate(dateA.getDate() - 1);
  }

  const t1 = dateA.getTime();
  const t2 = dateB.getTime();

  // Basic numeric differences
  const diffMs = Math.abs(t2 - t1);
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // Weeks & Remaining days representation
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  // Calculate Business/Working Days (Monday through Friday)
  let businessDays = 0;
  if (totalDays > 0) {
    const tempDate = new Date(dateA.getTime());
    // Normalize to date level for iterating
    tempDate.setHours(0, 0, 0, 0);
    const endCompare = new Date(dateB.getTime());
    endCompare.setHours(0, 0, 0, 0);

    while (tempDate < endCompare) {
      const day = tempDate.getDay();
      // 0 = Sunday, 6 = Saturday
      if (day !== 0 && day !== 6) {
        businessDays++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
  }

  // Detailed breakdown in Years, Months, and Days
  // Calculates difference like: 1 Year, 3 Months, 12 Days
  let years = dateB.getFullYear() - dateA.getFullYear();
  let months = dateB.getMonth() - dateA.getMonth();
  let days = dateB.getDate() - dateA.getDate();

  if (days < 0) {
    months--;
    // Find number of days in the previous month
    const prevMonth = new Date(dateB.getFullYear(), dateB.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  // Hours, minutes, and seconds remainder
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  return {
    isNegative,
    totalDays,
    businessDays,
    weeks,
    remainingDays,
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
  };
}

/**
 * Adjusts a Date by adding or subtracting calendar increments.
 * Supports standard calendar units and skipping weekends (business day math).
 */
export function adjustDate(
  startDate: Date,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years' | 'hours' | 'minutes',
  onlyBusinessDays: boolean = false
): Date {
  const result = new Date(startDate.getTime());

  if (onlyBusinessDays && (unit === 'days' || unit === 'weeks')) {
    let daysToAdd = unit === 'weeks' ? amount * 5 : amount;
    const direction = daysToAdd > 0 ? 1 : -1;
    daysToAdd = Math.abs(daysToAdd);

    while (daysToAdd > 0) {
      result.setDate(result.getDate() + direction);
      const day = result.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (day !== 0 && day !== 6) {
        daysToAdd--;
      }
    }
    return result;
  }

  // Standard date adjustments
  switch (unit) {
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
  }

  return result;
}

/**
 * Parses a relative time string (e.g. "1h 30m", "45 mins", "1.5 hours") into minutes.
 * Returns 0 if invalid format.
 */
export function parseDurationStringToMinutes(str: string): number {
  const clean = str.trim().toLowerCase();
  if (!clean) return 0;

  // Check for hour-minute patterns: "1h 30m", "2h30", "1:30"
  const colonRegex = /^(\d+):(\d{2})$/;
  const colonMatch = clean.match(colonRegex);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    return h * 60 + m;
  }

  // Parse segments like: 1.5h, 2 hours, 45m, 10mins
  const hourRegex = /(\d+(?:\.\d+)?)\s*(?:h|hour|hr)s?/g;
  const minRegex = /(\d+)\s*(?:m|min|minute)s?/g;
  const dayRegex = /(\d+(?:\.\d+)?)\s*(?:d|day)s?/g;

  let totalMinutes = 0;
  let matchesFound = false;

  // Days match
  let match;
  while ((match = dayRegex.exec(clean)) !== null) {
    totalMinutes += parseFloat(match[1]) * 24 * 60;
    matchesFound = true;
  }

  // Hours match
  hourRegex.lastIndex = 0;
  while ((match = hourRegex.exec(clean)) !== null) {
    totalMinutes += parseFloat(match[1]) * 60;
    matchesFound = true;
  }

  // Minutes match
  minRegex.lastIndex = 0;
  while ((match = minRegex.exec(clean)) !== null) {
    totalMinutes += parseInt(match[1], 10);
    matchesFound = true;
  }

  // If no unit matches, but it is a raw number, assume minutes
  if (!matchesFound) {
    const rawVal = parseFloat(clean);
    if (!isNaN(rawVal)) {
      return rawVal;
    }
  }

  return totalMinutes;
}

/**
 * Computes the difference in minutes between two clock time strings (e.g. "09:00" and "17:30").
 */
export function parseTimeRangeToMinutes(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  
  const [h1, m1] = startStr.split(':').map(Number);
  const [h2, m2] = endStr.split(':').map(Number);
  
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  
  let startMin = h1 * 60 + m1;
  let endMin = h2 * 60 + m2;
  
  // Handles overnight shifts (e.g., 22:00 to 06:00 is 8 hours)
  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  
  return endMin - startMin;
}

export interface AccumulateItem {
  id: string;
  type: 'range' | 'duration';
  startTime?: string; // e.g. "09:00"
  endTime?: string;   // e.g. "17:00"
  durationText?: string; // e.g. "1h 30m"
  note?: string;
}

export interface AccumulateResult {
  totalMinutes: number;
  formattedDuration: string;
  averageMinutes: number;
  formattedAverage: string;
  totalCost: number;
  itemResults: Array<{ id: string; minutes: number; formatted: string }>;
}

/**
 * Formats a duration in minutes to a readable string like "45h 15m"
 */
export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Sums up multiple duration and clock time-range records.
 * Projects cost based on hourly wage.
 */
export function accumulateDurations(
  items: AccumulateItem[],
  hourlyRate: number = 0
): AccumulateResult {
  let totalMinutes = 0;
  const itemResults: Array<{ id: string; minutes: number; formatted: string }> = [];

  const activeItems = items.filter(
    (item) =>
      item.type === 'duration'
        ? !!item.durationText?.trim()
        : !!item.startTime && !!item.endTime
  );

  activeItems.forEach((item) => {
    let minutes = 0;
    if (item.type === 'duration') {
      minutes = parseDurationStringToMinutes(item.durationText || '');
    } else {
      minutes = parseTimeRangeToMinutes(item.startTime || '', item.endTime || '');
    }
    totalMinutes += minutes;
    itemResults.push({
      id: item.id,
      minutes,
      formatted: formatMinutes(minutes),
    });
  });

  const averageMinutes = activeItems.length > 0 ? Math.round(totalMinutes / activeItems.length) : 0;
  const totalCost = (totalMinutes / 60) * hourlyRate;

  return {
    totalMinutes,
    formattedDuration: formatMinutes(totalMinutes),
    averageMinutes,
    formattedAverage: formatMinutes(averageMinutes),
    totalCost: Math.round(totalCost * 100) / 100,
    itemResults,
  };
}
