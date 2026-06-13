export interface CronValidation {
  isValid: boolean;
  error?: string;
}

const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses a single cron field and returns an array of matching integer values.
 */
function parseField(field: string, min: number, max: number, aliases?: Record<string, number>): number[] {
  let normalized = field.toLowerCase();
  
  if (aliases) {
    for (const [alias, val] of Object.entries(aliases)) {
      normalized = normalized.replaceAll(alias, val.toString());
    }
  }

  const values: Set<number> = new Set();
  const parts = normalized.split(',');

  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }

    // Step/Interval: e.g. */5, 1-15/3, 2/4
    const intervalMatch = part.match(/^(\*|\d+-\d+|\d+)\/(\d+)$/);
    if (intervalMatch) {
      const rangePart = intervalMatch[1];
      const step = parseInt(intervalMatch[2], 10);
      if (isNaN(step) || step <= 0) {
        throw new Error(`Invalid step increment: "${part}"`);
      }

      let start = min;
      let end = max;

      if (rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [sStr, eStr] = rangePart.split('-');
          const s = parseInt(sStr, 10);
          const e = parseInt(eStr, 10);
          if (isNaN(s) || isNaN(e) || s < min || e > max || s > e) {
            throw new Error(`Invalid range for step: "${rangePart}"`);
          }
          start = s;
          end = e;
        } else {
          const s = parseInt(rangePart, 10);
          if (isNaN(s) || s < min || s > max) {
            throw new Error(`Invalid start value for step: "${rangePart}"`);
          }
          start = s;
        }
      }

      for (let i = start; i <= end; i += step) {
        values.add(i);
      }
      continue;
    }

    // Range: e.g. 1-5
    if (part.includes('-')) {
      const [sStr, eStr] = part.split('-');
      const s = parseInt(sStr, 10);
      const e = parseInt(eStr, 10);
      if (isNaN(s) || isNaN(e) || s < min || e > max || s > e) {
        throw new Error(`Invalid range: "${part}"`);
      }
      for (let i = s; i <= e; i++) {
        values.add(i);
      }
      continue;
    }

    // Single number
    const num = parseInt(part, 10);
    if (isNaN(num) || num < min || num > max) {
      throw new Error(`Value "${part}" is out of bounds [${min}-${max}]`);
    }
    values.add(num);
  }

  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Validates a cron expression string.
 */
export function validateCron(expression: string): CronValidation {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      isValid: false,
      error: `Expression has ${parts.length} fields. Standard cron requires exactly 5 fields (minute, hour, day-of-month, month, day-of-week).`
    };
  }

  const [min, hour, dom, month, dow] = parts;

  try {
    parseField(min, 0, 59);
  } catch (err: any) {
    return { isValid: false, error: `Minute field error: ${err.message}` };
  }

  try {
    parseField(hour, 0, 23);
  } catch (err: any) {
    return { isValid: false, error: `Hour field error: ${err.message}` };
  }

  try {
    parseField(dom, 1, 31);
  } catch (err: any) {
    return { isValid: false, error: `Day of Month field error: ${err.message}` };
  }

  try {
    parseField(month, 1, 12, MONTH_ALIASES);
  } catch (err: any) {
    return { isValid: false, error: `Month field error: ${err.message}` };
  }

  try {
    parseField(dow, 0, 7, WEEKDAY_ALIASES);
  } catch (err: any) {
    return { isValid: false, error: `Day of Week field error: ${err.message}` };
  }

  return { isValid: true };
}

/**
 * Formats a list of integers into a readable range/comma representation.
 */
function formatNumberList(nums: number[], transform?: (n: number) => string): string {
  if (nums.length === 0) return 'never';
  const displayNums = transform ? nums.map(transform) : nums.map(String);
  
  if (nums.length === 1) return displayNums[0];
  if (nums.length === 2) return `${displayNums[0]} and ${displayNums[1]}`;
  
  // Check if it is a complete consecutive range
  let isConsecutive = true;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive && nums.length > 2) {
    return `from ${displayNums[0]} through ${displayNums[displayNums.length - 1]}`;
  }

  return `${displayNums.slice(0, -1).join(', ')}, and ${displayNums[displayNums.length - 1]}`;
}

/**
 * Formats 24h hour/minute to human-readable AM/PM string.
 */
function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${ampm}`;
}

/**
 * Translates a cron expression into a human-readable English description.
 */
export function describeCron(expression: string): string {
  const validation = validateCron(expression);
  if (!validation.isValid) {
    return `Invalid cron expression: ${validation.error}`;
  }

  const parts = expression.trim().split(/\s+/);
  const [minStr, hourStr, domStr, monthStr, dowStr] = parts;

  // Check simple common combinations for cleaner descriptions
  if (expression.trim() === '* * * * *') return 'Every minute';
  if (expression.trim() === '0 * * * *') return 'Every hour, at minute 0';
  if (expression.trim() === '0 0 * * *') return 'Daily at midnight (12:00 AM)';
  if (expression.trim() === '0 0 * * 1-5') return 'Every weekday (Monday through Friday) at midnight (12:00 AM)';
  if (expression.trim() === '0 0 1 * *') return 'First day of every month at midnight (12:00 AM)';

  try {
    const minutes = parseField(minStr, 0, 59);
    const hours = parseField(hourStr, 0, 23);
    const doms = parseField(domStr, 1, 31);
    const months = parseField(monthStr, 1, 12, MONTH_ALIASES);
    let dows = parseField(dowStr, 0, 7, WEEKDAY_ALIASES);

    // Normalize Sunday (0 and 7 are Sunday)
    if (dows.includes(7)) {
      if (!dows.includes(0)) dows.push(0);
      dows = dows.filter(x => x !== 7).sort((a, b) => a - b);
    }

    let minDesc = '';
    if (minStr === '*') {
      minDesc = 'every minute';
    } else if (minStr.includes('/') && minStr.split('/')[0] === '*') {
      const step = minStr.split('/')[1];
      minDesc = `every ${step} minutes`;
    } else {
      minDesc = `at minute ${formatNumberList(minutes)}`;
    }

    let hourDesc = '';
    if (hourStr === '*') {
      hourDesc = 'of every hour';
    } else if (hourStr.includes('/') && hourStr.split('/')[0] === '*') {
      const step = hourStr.split('/')[1];
      hourDesc = `of every ${step} hours`;
    } else {
      const times = [];
      // If minutes are specific and hours are specific, output absolute times if lists are short
      if (minutes.length <= 3 && hours.length <= 3) {
        for (const h of hours) {
          for (const m of minutes) {
            times.push(formatTime(h, m));
          }
        }
        return `At ${formatNumberList(times)}`;
      }
      hourDesc = `during hour ${formatNumberList(hours, h => h.toString().padStart(2, '0'))}`;
    }

    let dayDesc = '';
    const isDomWildcard = domStr === '*';
    const isDowWildcard = dowStr === '*';

    if (isDomWildcard && isDowWildcard) {
      dayDesc = 'every day';
    } else if (!isDomWildcard && isDowWildcard) {
      dayDesc = `on day ${formatNumberList(doms)} of the month`;
    } else if (isDomWildcard && !isDowWildcard) {
      dayDesc = `on ${formatNumberList(dows, d => WEEKDAY_NAMES[d])}`;
    } else {
      // Both restricted
      dayDesc = `on day ${formatNumberList(doms)} of the month and on ${formatNumberList(dows, d => WEEKDAY_NAMES[d])}`;
    }

    let monthDesc = '';
    if (monthStr === '*') {
      monthDesc = 'of every month';
    } else {
      monthDesc = `in ${formatNumberList(months, m => MONTH_NAMES[m])}`;
    }

    // Capitalize first letter of result
    const result = `${minDesc} ${hourDesc}, ${dayDesc}, ${monthDesc}`;
    return result.charAt(0).toUpperCase() + result.slice(1);

  } catch (err: any) {
    return `Error building description: ${err.message}`;
  }
}

/**
 * Calculates the next N execution dates for a given cron expression.
 */
export function getNextExecutions(
  expression: string,
  count: number = 5,
  startDate: Date = new Date()
): Date[] {
  const validation = validateCron(expression);
  if (!validation.isValid) {
    throw new Error(`Cannot compute executions for invalid cron: ${validation.error}`);
  }

  const parts = expression.trim().split(/\s+/);
  const [minStr, hourStr, domStr, monthStr, dowStr] = parts;

  const minutes = parseField(minStr, 0, 59);
  const hours = parseField(hourStr, 0, 23);
  const doms = parseField(domStr, 1, 31);
  const months = parseField(monthStr, 1, 12, MONTH_ALIASES);
  let dows = parseField(dowStr, 0, 7, WEEKDAY_ALIASES);

  if (dows.includes(7)) {
    if (!dows.includes(0)) dows.push(0);
    dows = dows.filter(x => x !== 7).sort((a, b) => a - b);
  }

  const isDomRestricted = domStr !== '*';
  const isDowRestricted = dowStr !== '*';

  const results: Date[] = [];
  
  // Clone start date and set seconds/milliseconds to 0
  const current = new Date(startDate.getTime());
  current.setSeconds(0);
  current.setMilliseconds(0);
  
  // Move 1 minute forward from start time to avoid matching current minute
  current.setMinutes(current.getMinutes() + 1);

  let iterations = 0;
  const maxIterations = 50000; // safety ceiling

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const m = current.getMonth() + 1; // JS Month is 0-11, Cron is 1-12
    if (!months.includes(m)) {
      // Skip month if not matching. Jump to start of next month.
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
      current.setMonth(current.getMonth() + 1);
      continue;
    }

    const d = current.getDate();
    const dayOfWeek = current.getDay();

    let matchesDay = false;
    if (isDomRestricted && isDowRestricted) {
      // If both DOM and DOW are restricted, matches if either is true
      matchesDay = doms.includes(d) || dows.includes(dayOfWeek);
    } else {
      // If one or both are wildcard, matches only if both match
      matchesDay = doms.includes(d) && dows.includes(dayOfWeek);
    }

    if (!matchesDay) {
      // Skip to tomorrow
      current.setHours(0, 0, 0, 0);
      current.setDate(current.getDate() + 1);
      continue;
    }

    const h = current.getHours();
    if (!hours.includes(h)) {
      // Skip to next hour
      current.setMinutes(0);
      current.setHours(current.getHours() + 1);
      continue;
    }

    const min = current.getMinutes();
    if (!minutes.includes(min)) {
      // Increment minute
      current.setMinutes(current.getMinutes() + 1);
      continue;
    }

    // All match!
    results.push(new Date(current.getTime()));
    current.setMinutes(current.getMinutes() + 1);
  }

  return results;
}
