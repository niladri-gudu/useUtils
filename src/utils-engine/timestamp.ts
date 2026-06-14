/**
 * Core cryptographic/date utility engine for Unix Timestamp & Epoch calculations.
 * Supports seconds, milliseconds, microseconds, nanoseconds, time math, and code generation.
 */

// ============================================================================
// Core Date & Timestamp Parsers
// ============================================================================

/**
 * Parses a numeric value or string representing a timestamp in a given unit into a Date.
 */
export function parseTimestamp(val: string | number, unit: 's' | 'ms' | 'us' | 'ns'): Date | null {
  if (val === undefined || val === null || val === '') return null;
  
  // Clean string inputs
  let numVal = typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
  if (isNaN(numVal)) return null;

  let msVal = 0;
  switch (unit) {
    case 's':
      msVal = numVal * 1000;
      break;
    case 'ms':
      msVal = numVal;
      break;
    case 'us':
      msVal = numVal / 1000;
      break;
    case 'ns':
      msVal = numVal / 1000000;
      break;
    default:
      return null;
  }

  const date = new Date(msVal);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parses natural language relative terms or standard date strings into a Date.
 * Supports: "now", "yesterday", "tomorrow", "last week", "next year", and formats like "5 days ago", "in 2 hours".
 */
export function parseHumanDate(val: string): Date | null {
  const clean = val.trim().toLowerCase();
  if (!clean) return null;

  const now = new Date();

  // Basic shortcuts
  if (clean === 'now') return now;
  if (clean === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (clean === 'yesterday') return new Date(now.getTime() - 86400000);
  if (clean === 'tomorrow') return new Date(now.getTime() + 86400000);

  // Relative intervals: "5 days ago" or "in 2 hours"
  const agoRegex = /^(\d+)\s+(year|month|week|day|hour|minute|second)s?\s+ago$/i;
  const inRegex = /^in\s+(\d+)\s+(year|month|week|day|hour|minute|second)s?$/i;

  let match = clean.match(agoRegex);
  if (match) {
    const quantity = parseInt(match[1]);
    const unit = match[2];
    return getOffsetDate(now, -quantity, unit);
  }

  match = clean.match(inRegex);
  if (match) {
    const quantity = parseInt(match[1]);
    const unit = match[2];
    return getOffsetDate(now, quantity, unit);
  }

  // Handle standard date strings fallback
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

function getOffsetDate(baseDate: Date, quantity: number, unit: string): Date {
  const result = new Date(baseDate.getTime());
  switch (unit) {
    case 'year':
      result.setFullYear(result.getFullYear() + quantity);
      break;
    case 'month':
      result.setMonth(result.getMonth() + quantity);
      break;
    case 'week':
      result.setDate(result.getDate() + quantity * 7);
      break;
    case 'day':
      result.setDate(result.getDate() + quantity);
      break;
    case 'hour':
      result.setHours(result.getHours() + quantity);
      break;
    case 'minute':
      result.setMinutes(result.getMinutes() + quantity);
      break;
    case 'second':
      result.setSeconds(result.getSeconds() + quantity);
      break;
  }
  return result;
}

// ============================================================================
// Time offset math helper
// ============================================================================
export function addTimeOffset(date: Date, value: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'): Date {
  const res = new Date(date.getTime());
  switch (unit) {
    case 'seconds': res.setSeconds(res.getSeconds() + value); break;
    case 'minutes': res.setMinutes(res.getMinutes() + value); break;
    case 'hours': res.setHours(res.getHours() + value); break;
    case 'days': res.setDate(res.getDate() + value); break;
    case 'weeks': res.setDate(res.getDate() + value * 7); break;
    case 'months': res.setMonth(res.getMonth() + value); break;
    case 'years': res.setFullYear(res.getFullYear() + value); break;
  }
  return res;
}

// ============================================================================
// Log scanner (batch parser)
// ============================================================================
export interface ScannedTimestamp {
  raw: string;
  value: number;
  unit: 's' | 'ms';
  index: number;
  dateStr: string;
}

/**
 * Searches a raw block of text for numbers that resemble Unix timestamps.
 * Extracts 10-digit (seconds) and 13-digit (milliseconds) timestamps.
 */
export function scanLogsForTimestamps(text: string): ScannedTimestamp[] {
  if (!text) return [];

  // Match:
  // - 13 digits starting with '1' or '2' (Milliseconds from 2001 to 2095)
  // - 10 digits starting with '1' or '2' (Seconds from 2001 to 2095)
  // Bound checks verify it is not flanked by letters or other digits.
  const regex = /\b([12]\d{12})\b|\b([12]\d{9})\b/g;
  const matches: ScannedTimestamp[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const rawVal = match[1] || match[2];
    const unit = match[1] ? 'ms' : 's';
    const value = parseInt(rawVal, 10);
    const index = match.index;
    
    const parsedDate = parseTimestamp(value, unit);
    const dateStr = parsedDate ? parsedDate.toISOString() : 'Invalid date';

    // Prevent duplicates at the same index
    if (!matches.some(m => m.index === index)) {
      matches.push({
        raw: rawVal,
        value,
        unit,
        index,
        dateStr
      });
    }
  }

  // Cap at 200 matches to prevent lockups on massive inputs
  return matches.slice(0, 200);
}

// ============================================================================
// Formatting Utilities
// ============================================================================

export function getRelativeTimeString(timeMs: number): string {
  const elapsed = Date.now() - timeMs;
  const isFuture = elapsed < 0;
  const absElapsed = Math.abs(elapsed);
  
  if (absElapsed < 1000) return 'just now';
  
  const seconds = Math.floor(absElapsed / 1000);
  if (seconds < 60) return isFuture ? `in ${seconds}s` : `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return isFuture ? `in ${days} days` : `${days} days ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return isFuture ? `in ${months} mo` : `${months} mo ago`;
  
  const years = Math.floor(months / 12);
  return isFuture ? `in ${years} yr` : `${years} yr ago`;
}

/**
 * Computes the day of the year (1-366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Computes the ISO week number of the year
 */
export function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Converts Date into a Julian Date format
 */
export function getJulianDate(date: Date): number {
  const time = date.getTime();
  const julianDate = (time / 86400000) + 2440587.5;
  return Math.round(julianDate * 10000) / 10000;
}

/**
 * Checks if year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Compiles a rich set of formatted timestamp outputs.
 */
export function formatDateAll(date: Date, timezone: string = 'UTC'): Record<string, string> {
  const timeMs = date.getTime();
  const seconds = Math.floor(timeMs / 1000);
  const microseconds = Math.floor(timeMs * 1000);
  const nanoseconds = Math.floor(timeMs * 1000000);

  // Custom formatting based on user selected timezone
  let localString = '';
  try {
    localString = date.toLocaleString('en-US', { timeZone: timezone });
  } catch {
    localString = date.toLocaleString(); // fallback
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];

  return {
    seconds: seconds.toString(),
    milliseconds: timeMs.toString(),
    microseconds: microseconds.toString(),
    nanoseconds: nanoseconds.toString(),
    utc: date.toUTCString(),
    iso: date.toISOString(),
    local: localString,
    relative: getRelativeTimeString(timeMs),
    dayOfYear: getDayOfYear(date).toString(),
    weekOfYear: getWeekOfYear(date).toString(),
    dayOfWeek: dayOfWeek,
    julian: getJulianDate(date).toFixed(4),
    leapYear: isLeapYear(date.getFullYear()) ? 'Yes' : 'No'
  };
}

// ============================================================================
// Multi-Language Snippet Generator
// ============================================================================

export interface CodeSnippet {
  lang: string;
  title: string;
  code: string;
}

export function generateCodeSnippets(timestampSec: number): CodeSnippet[] {
  const ms = timestampSec * 1000;
  
  return [
    {
      lang: 'javascript',
      title: 'JavaScript / TS',
      code: `// 1. Get current Unix timestamp (seconds)
const nowSeconds = Math.floor(Date.now() / 1000);

// 2. Convert Unix timestamp to Date object
const date = new Date(${ms}); // expects milliseconds

// 3. Convert Date back to Unix timestamp
const timestamp = Math.floor(date.getTime() / 1000);`
    },
    {
      lang: 'python',
      title: 'Python',
      code: `import time
from datetime import datetime

# 1. Get current Unix timestamp
now_seconds = int(time.time())

# 2. Convert Unix timestamp to datetime object
dt = datetime.fromtimestamp(${timestampSec})
print(dt.strftime('%Y-%m-%d %H:%M:%S'))

# 3. Convert datetime object back to timestamp
epoch_timestamp = int(dt.timestamp())`
    },
    {
      lang: 'go',
      title: 'Go',
      code: `package main

import (
\t"fmt"
\t"time"
)

func main() {
\t// 1. Get current Unix timestamp
\tnowSeconds := time.Now().Unix()

\t// 2. Convert Unix timestamp to Time object
\ttm := time.Unix(${timestampSec}, 0)
\tfmt.Println(tm.Format("2006-01-02 15:04:05"))

\t// 3. Convert Time object back to timestamp
\tepochTimestamp := tm.Unix()
}`
    },
    {
      lang: 'java',
      title: 'Java',
      code: `import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

public class TimestampExample {
    public static void main(String[] args) {
        // 1. Get current Unix timestamp
        long nowSeconds = Instant.now().getEpochSecond();

        // 2. Convert Unix timestamp to LocalDateTime
        LocalDateTime dt = LocalDateTime.ofInstant(
            Instant.ofEpochSecond(${timestampSec}), 
            ZoneId.systemDefault()
        );
        System.out.println(dt);

        // 3. Convert LocalDateTime back to timestamp
        long epoch = dt.atZone(ZoneId.systemDefault()).toEpochSecond();
    }
}`
    },
    {
      lang: 'rust',
      title: 'Rust',
      code: `use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    // 1. Get current Unix timestamp
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    // 2. Convert Unix timestamp to SystemTime/Date
    // Rust typically uses crates like 'chrono' for date manipulations:
    // let datetime = chrono::DateTime::<chrono::Utc>::from_utc(
    //     chrono::NaiveDateTime::from_timestamp(${timestampSec}, 0), 
    //     chrono::Utc
    // );
}`
    },
    {
      lang: 'csharp',
      title: 'C# .NET',
      code: `using System;

class Program {
    static void Main() {
        // 1. Get current Unix timestamp
        long nowSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // 2. Convert Unix timestamp to DateTime
        DateTimeOffset dateTimeOffset = DateTimeOffset.FromUnixTimeSeconds(${timestampSec});
        DateTime dateTime = dateTimeOffset.LocalDateTime;
        Console.WriteLine(dateTime.ToString("yyyy-MM-dd HH:mm:ss"));

        // 3. Convert DateTime back to timestamp
        long epoch = dateTimeOffset.ToUnixTimeSeconds();
    }
}`
    },
    {
      lang: 'php',
      title: 'PHP',
      code: `<?php
// 1. Get current Unix timestamp
$nowSeconds = time();

// 2. Convert Unix timestamp to Date string
$dateString = date('Y-m-d H:i:s', ${timestampSec});
echo $dateString;

// 3. Convert Date string back to timestamp
$epoch = strtotime($dateString);
?>`
    },
    {
      lang: 'ruby',
      title: 'Ruby',
      code: `# 1. Get current Unix timestamp
now_seconds = Time.now.to_i

# 2. Convert Unix timestamp to Time object
t = Time.at(${timestampSec})
puts t.strftime("%Y-%m-%d %H:%M:%S")

# 3. Convert Time object back to timestamp
epoch = t.to_i`
    },
    {
      lang: 'swift',
      title: 'Swift',
      code: `import Foundation

// 1. Get current Unix timestamp (TimeInterval is Double)
let nowSeconds = Date().timeIntervalSince1970

// 2. Convert Unix timestamp to Date
let date = Date(timeIntervalSince1970: ${timestampSec})

// 3. Convert Date back to timestamp
let epoch = date.timeIntervalSince1970`
    },
    {
      lang: 'bash',
      title: 'Bash Shell',
      code: `# 1. Get current Unix timestamp
date +%s

# 2. Convert Unix timestamp to Date string (GNU date)
date -d @${timestampSec}

# 3. Convert Unix timestamp to Date string (macOS / BSD date)
date -r ${timestampSec}`
    }
  ];
}
