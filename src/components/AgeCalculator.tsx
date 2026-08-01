import React, { useState, useMemo, useEffect } from 'react';

interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
}

const computeAge = (birth: Date, now: Date): AgeBreakdown => {
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
};

const zodiacSign = (month: number, day: number): string => {
  const signs = [
    { sign: '♑ Capricorn', m: 12, d: 22 },
    { sign: '♒ Aquarius', m: 1, d: 20 },
    { sign: '♓ Pisces', m: 2, d: 19 },
    { sign: '♈ Aries', m: 3, d: 21 },
    { sign: '♉ Taurus', m: 4, d: 20 },
    { sign: '♊ Gemini', m: 5, d: 21 },
    { sign: '♋ Cancer', m: 6, d: 22 },
    { sign: '♌ Leo', m: 7, d: 23 },
    { sign: '♍ Virgo', m: 8, d: 23 },
    { sign: '♎ Libra', m: 9, d: 23 },
    { sign: '♏ Scorpio', m: 10, d: 24 },
    { sign: '♐ Sagittarius', m: 11, d: 23 }
  ];
  const value = month * 100 + day;
  let selected = signs[0];
  for (const s of signs) {
    if (value >= s.m * 100 + s.d) selected = s;
  }
  return selected.sign;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const nextBirthday = (birth: Date, now: Date): { date: Date; daysLeft: number; turningAge: number } => {
  const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (next <= now) next.setFullYear(next.getFullYear() + 1);
  const daysLeft = Math.ceil((next.getTime() - now.getTime()) / 86400000);
  const turningAge = next.getFullYear() - birth.getFullYear();
  return { date: next, daysLeft, turningAge };
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState<string>('1995-06-15');
  const [now, setNow] = useState<Date>(new Date());

  const age = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate + 'T00:00:00');
    if (isNaN(birth.getTime()) || birth > new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return null;
    }
    const breakdown = computeAge(birth, now);
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    const totalMonths = breakdown.years * 12 + breakdown.months;
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = Math.floor((now.getTime() - birth.getTime()) / 3600000);
    const totalMinutes = Math.floor((now.getTime() - birth.getTime()) / 60000);
    const totalSeconds = Math.floor((now.getTime() - birth.getTime()) / 1000);
    const bornOn = DAY_NAMES[birth.getDay()];
    const zodiac = zodiacSign(birth.getMonth() + 1, birth.getDate());
    const nbd = nextBirthday(birth, now);
    return {
      birth,
      breakdown,
      totalDays,
      totalMonths,
      totalWeeks,
      totalHours,
      totalMinutes,
      totalSeconds,
      bornOn,
      zodiac,
      nbd
    };
  }, [birthDate, now]);

  // Refresh "today" periodically
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-panel border border-border-hairline rounded-lg p-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">Date of Birth</label>
            <input
              type="date"
              value={birthDate}
              max={todayISO()}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-canvas border border-border-hairline text-zinc-200 font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-accent-emerald/40 focus:ring-1 focus:ring-accent-emerald/20"
            />
          </div>
          <div className="bg-zinc-900/35 border border-border-hairline/80 rounded-lg p-3.5 flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Current Age</span>
            {age ? (
              <span className="text-3xl font-bold text-accent-emerald font-mono">
                {age.breakdown.years}
                <span className="text-sm text-zinc-400"> years</span>
              </span>
            ) : (
              <span className="text-sm text-zinc-500 font-mono">Enter a valid date</span>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/40 border border-border-hairline/80 rounded-md p-2.5 text-[10px] text-zinc-500 font-mono">
            <span className="text-accent-emerald">✓</span>
            Processed locally in browser. Zero server transmission.
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {!age ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-panel border border-border-hairline rounded-lg p-12 text-center">
              <span className="text-3xl">📅</span>
              <span className="text-xs text-zinc-500 font-mono max-w-sm leading-relaxed">
                Enter a valid date of birth to calculate age in years, months, days, and more.
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-1 text-center">
                  <span className="text-2xl font-bold text-accent-emerald font-mono">{age.breakdown.years}</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Years</span>
                </div>
                <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-1 text-center">
                  <span className="text-2xl font-bold text-zinc-200 font-mono">{age.breakdown.months}</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Months</span>
                </div>
                <div className="bg-panel border border-border-hairline rounded-lg p-4 flex flex-col gap-1 text-center">
                  <span className="text-2xl font-bold text-zinc-200 font-mono">{age.breakdown.days}</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Days</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.totalMonths.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Months</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.totalWeeks.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Weeks</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.totalDays.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Days</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-accent-emerald font-mono">{age.totalHours.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Hours</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.totalMinutes.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Minutes</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.totalSeconds.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Total Seconds</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.bornOn}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Born On</span>
                </div>
                <div className="bg-zinc-900/20 border border-border-hairline/50 rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-zinc-200 font-mono">{age.zodiac}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Zodiac Sign</span>
                </div>
              </div>

              <div className="bg-panel border border-accent-emerald/30 rounded-lg p-4 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold font-mono">Next Birthday</span>
                <span className="text-sm text-zinc-200 font-mono">
                  {age.nbd.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-xs text-accent-emerald font-mono font-semibold">
                  {age.nbd.daysLeft === 0 ? '🎉 It\'s today!' : `In ${age.nbd.daysLeft} days • turning ${age.nbd.turningAge}`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
