import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  POPULAR_TIMEZONES,
  getIanaTimeZones,
  getTimeZoneDetails,
  getTimeZoneOffset,
  getTimelineOverlap,
  parseLogs,
  generateCalendarLinks,
  classifyHour,
  type TimeZoneDetails,
  type OverlapWindow,
  type LogMatch
} from '../utils-engine/timezone';

export function TimeZoneConverter() {
  // --------------------------------------------------------------------------
  // State variables
  // --------------------------------------------------------------------------
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [baseZone, setBaseZone] = useState<string>('');
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [workStart, setWorkStart] = useState<number>(9);
  const [workEnd, setWorkEnd] = useState<number>(18);
  const [activeTab, setActiveTab] = useState<'planner' | 'logs'>('planner');

  // Meeting Details
  const [meetingTitle, setMeetingTitle] = useState<string>('Sync Meeting');
  const [meetingDuration, setMeetingDuration] = useState<number>(60); // in minutes
  const [meetingDescription, setMeetingDescription] = useState<string>('Sync across global timezone team members.');

  // Logs converter state
  const [rawLogs, setRawLogs] = useState<string>('');
  const [convertedLogs, setConvertedLogs] = useState<string>('');
  const [logMatches, setLogMatches] = useState<LogMatch[]>([]);
  const [logTargetZone, setLogTargetZone] = useState<string>('UTC');
  const [copyLogsSuccess, setCopyLogsSuccess] = useState<boolean>(false);

  // General Notification
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [copyInviteSuccess, setCopyInviteSuccess] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Retrieve IANA timezone list
  const ianaTimeZones = useMemo(() => getIanaTimeZones(), []);

  // --------------------------------------------------------------------------
  // Initialization & URL State Hydration
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Set default base timezone from user system (mapping legacy Asia/Calcutta to Asia/Kolkata)
    const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const systemZone = resolvedZone === 'Asia/Calcutta' ? 'Asia/Kolkata' : resolvedZone;
    setBaseZone(systemZone);
    setLogTargetZone(systemZone);

    // Default target timezones
    const defaults = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata'];
    const filteredDefaults = defaults.filter(d => d !== systemZone);
    setTargetZones(filteredDefaults);

    // Read URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBase = params.get('base');
      const urlTargets = params.get('targets');
      const urlTime = params.get('time');
      const urlTab = params.get('tab');

      if (urlBase) {
        const normalizedBase = urlBase === 'Asia/Calcutta' ? 'Asia/Kolkata' : urlBase;
        if (ianaTimeZones.includes(normalizedBase)) {
          setBaseZone(normalizedBase);
        }
      }
      if (urlTargets) {
        const parsedTargets = urlTargets
          .split(',')
          .map(t => t === 'Asia/Calcutta' ? 'Asia/Kolkata' : t)
          .filter(t => ianaTimeZones.includes(t));
        if (parsedTargets.length > 0) {
          setTargetZones(parsedTargets);
        }
      }
      if (urlTime) {
        const parsedMs = parseInt(urlTime, 10);
        if (!isNaN(parsedMs)) {
          setBaseDate(new Date(parsedMs));
          setIsLiveClock(false);
        }
      }
      if (urlTab === 'logs') {
        setActiveTab('logs');
      }
    }
  }, [ianaTimeZones]);

  // --------------------------------------------------------------------------
  // Live ticking clock loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isLiveClock) return;
    const interval = setInterval(() => {
      setBaseDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveClock]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --------------------------------------------------------------------------
  // Timezone Details Lists
  // --------------------------------------------------------------------------
  const baseZoneDetails = useMemo(() => {
    if (!baseZone) return null;
    return getTimeZoneDetails(baseDate, baseZone);
  }, [baseDate, baseZone]);

  const targetZonesDetails = useMemo(() => {
    return targetZones.map(zone => {
      const details = getTimeZoneDetails(baseDate, zone);
      // Calculate offset difference in hours relative to base zone
      if (baseZoneDetails) {
        const diffMinutes = details.offsetMinutes - baseZoneDetails.offsetMinutes;
        const diffHours = diffMinutes / 60;
        const diffStr = diffHours === 0 ? 'same time' : diffHours > 0 ? `+${diffHours}h` : `${diffHours}h`;
        return { ...details, relativeDiff: diffStr };
      }
      return { ...details, relativeDiff: '' };
    });
  }, [baseDate, targetZones, baseZoneDetails]);

  const allSelectedZones = useMemo(() => {
    if (!baseZone) return targetZones;
    return [baseZone, ...targetZones];
  }, [baseZone, targetZones]);

  // --------------------------------------------------------------------------
  // Timeline Scrubber & Optimizer Calculations
  // --------------------------------------------------------------------------
  const timelineData = useMemo(() => {
    if (!baseZone) return [];
    return getTimelineOverlap(baseDate, baseZone, targetZones, workStart, workEnd);
  }, [baseDate, baseZone, targetZones, workStart, workEnd]);

  const currentTimelineHour = useMemo(() => {
    return baseDate.getHours();
  }, [baseDate]);

  // Extract top 3 suggested meeting slots
  const suggestedSlots = useMemo(() => {
    if (timelineData.length === 0) return [];
    
    // Sort slots by score descending, then by proximity to standard business daytime
    return [...timelineData]
      .filter(slot => slot.classification !== 'sleeping')
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Prefer times closer to midday in base zone (12 PM)
        return Math.abs(a.hourIndex - 12) - Math.abs(b.hourIndex - 12);
      })
      .slice(0, 3);
  }, [timelineData]);

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------
  const handleAddZone = (zoneId: string) => {
    if (zoneId === baseZone) return;
    if (targetZones.includes(zoneId)) return;
    setTargetZones(prev => [...prev, zoneId]);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleRemoveZone = (zoneId: string) => {
    setTargetZones(prev => prev.filter(z => z !== zoneId));
  };

  const handleSetBaseZone = (zoneId: string) => {
    if (zoneId === baseZone) return;
    
    // Switch target lists
    const oldBase = baseZone;
    setBaseZone(zoneId);
    
    setTargetZones(prev => {
      const filtered = prev.filter(z => z !== zoneId);
      if (oldBase && !filtered.includes(oldBase)) {
        return [...filtered, oldBase];
      }
      return filtered;
    });
  };

  // Adjust hours globally from scrubber or input boxes
  const handleSetHour = (hour: number) => {
    setIsLiveClock(false);
    setBaseDate(prev => {
      const next = new Date(prev);
      next.setHours(hour, 0, 0, 0);
      return next;
    });
  };

  const handleSetDate = (dateStr: string) => {
    setIsLiveClock(false);
    setBaseDate(prev => {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return prev;
      
      const next = new Date(prev);
      next.setFullYear(parsed.getFullYear());
      next.setMonth(parsed.getMonth());
      next.setDate(parsed.getDate());
      return next;
    });
  };

  const handleAdjustCardHour = (zoneId: string, inputHour: number) => {
    setIsLiveClock(false);
    setBaseDate(prev => {
      // 1. Calculate timezone offset for the card in minutes
      const offsetTarget = getTimeZoneOffset(prev, zoneId);
      
      // 2. Adjust target base time
      // Determine what base timezone timestamp corresponds to the entered hour in target zone
      const targetDate = new Date(prev);
      targetDate.setHours(inputHour, 0, 0, 0);

      // Target timestamp to base conversion:
      // Target time = UTC + offsetTarget
      // We want to calculate the offset difference
      const baseOffset = getTimeZoneOffset(prev, baseZone);
      const diffMinutes = baseOffset - offsetTarget;
      
      const adjustedDate = new Date(targetDate.getTime() + diffMinutes * 60000);
      return adjustedDate;
    });
  };

  // Auto-fill meeting parameters
  const selectOptimizedHour = (hourIndex: number) => {
    handleSetHour(hourIndex);
  };

  // Log convert processing
  const handleConvertLogs = () => {
    if (!rawLogs.trim()) return;
    const { rewrittenText, matches } = parseLogs(rawLogs, logTargetZone);
    setConvertedLogs(rewrittenText);
    setLogMatches(matches);
  };

  const handleCopyLogs = () => {
    if (!convertedLogs) return;
    navigator.clipboard.writeText(convertedLogs);
    setCopyLogsSuccess(true);
    setTimeout(() => setCopyLogsSuccess(false), 2000);
  };

  // Share link copy
  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('base', baseZone);
    url.searchParams.set('targets', targetZones.join(','));
    url.searchParams.set('time', baseDate.getTime().toString());
    if (activeTab === 'logs') {
      url.searchParams.set('tab', 'logs');
    }
    
    navigator.clipboard.writeText(url.toString());
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  // Calendar Links
  const calendarLinks = useMemo(() => {
    if (!baseDate) return null;
    return generateCalendarLinks(
      meetingTitle,
      baseDate,
      meetingDuration,
      meetingDescription
    );
  }, [meetingTitle, baseDate, meetingDuration, meetingDescription]);

  // Timezone search suggestions
  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Return popular ones not currently added
      return POPULAR_TIMEZONES.filter(z => z.id !== baseZone && !targetZones.includes(z.id));
    }

    return ianaTimeZones
      .filter(zone => {
        // Exclude already added
        if (zone === baseZone || targetZones.includes(zone)) return false;
        
        const zoneLower = zone.toLowerCase();
        const { city, region } = parseIanaName(zone);
        return (
          zoneLower.includes(query) ||
          city.toLowerCase().includes(query) ||
          region.toLowerCase().includes(query)
        );
      })
      .slice(0, 100) // cap dropdown lists
      .map(zone => {
        const { city, region } = parseIanaName(zone);
        return { id: zone, cityName: city, regionName: region };
      });
  }, [searchQuery, baseZone, targetZones, ianaTimeZones]);

  // Formatted date string for HTML date inputs (YYYY-MM-DD)
  const htmlDateString = useMemo(() => {
    const year = baseDate.getFullYear();
    const month = (baseDate.getMonth() + 1).toString().padStart(2, '0');
    const day = baseDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [baseDate]);

  // Formatted time string for HTML time inputs (HH:MM)
  const htmlTimeString = useMemo(() => {
    const hours = baseDate.getHours().toString().padStart(2, '0');
    const minutes = baseDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [baseDate]);

  const handleTimeChange = (timeStr: string) => {
    setIsLiveClock(false);
    const [hrs, mins] = timeStr.split(':').map(Number);
    setBaseDate(prev => {
      const next = new Date(prev);
      next.setHours(hrs, mins, 0, 0);
      return next;
    });
  };

  // Render Day/Night SVG dials dynamically
  const renderSkyDial = (hour: number, cityName: string) => {
    const status = classifyHour(hour, workStart, workEnd);
    let gradient = 'from-indigo-950 to-slate-900'; // sleep
    let icon = (
      <svg className="w-4 h-4 text-amber-200" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    );

    if (status === 'core') {
      gradient = 'from-sky-400 to-indigo-500'; // working core
      icon = (
        <svg className="w-5 h-5 text-amber-300 animate-spin-slow" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
        </svg>
      );
    } else if (status === 'shoulder') {
      gradient = 'from-amber-600 to-indigo-900'; // shoulder transition
      icon = (
        <svg className="w-4.5 h-4.5 text-orange-200" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center border border-zinc-700/60 shadow-md`}>
        {icon}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 font-sans">
      
      {/* ----------------------------------------------------------------------
          LEFT COLUMN: Configuration Panels
          ---------------------------------------------------------------------- */}
      <div className="w-full lg:w-5/12 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/60 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🗓️ MEETING PLANNER
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-zinc-800 text-accent-emerald border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📁 LOG CONVERTER
          </button>
        </div>

        {activeTab === 'planner' ? (
          <>
            {/* Timezone Autocomplete Search Panel */}
            <div className="bg-panel border border-zinc-800 rounded-xl p-5 relative">
              <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <span>➕</span> Add Global Timezones
              </h3>
              
              <div className="relative" ref={dropdownRef}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search city, country or timezone... (e.g. Tokyo, EST)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald/30 rounded-lg py-2.5 pl-4 pr-10 text-xs font-mono text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                />
                
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    ✕
                  </button>
                )}

                {/* Dropdown Menu */}
                {showSearchDropdown && (
                  <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 divide-y divide-zinc-800/60 scrollbar-thin">
                    {searchSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-zinc-500 text-center font-mono">
                        No results found
                      </div>
                    ) : (
                      searchSuggestions.map(zone => (
                        <button
                          key={zone.id}
                          onClick={() => handleAddZone(zone.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 flex items-center justify-between text-xs font-mono transition-colors group cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-zinc-200 group-hover:text-accent-emerald font-semibold">{zone.cityName}</span>
                            <span className="text-zinc-500 text-[10px]">{zone.regionName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-zinc-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
                              {zone.id}
                            </span>
                            <span className="text-accent-emerald opacity-0 group-hover:opacity-100 transition-opacity">
                              + Add
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Standard active timezone summary count */}
              <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-500 font-mono border-t border-zinc-800/60 pt-3">
                <span>Selected zones: <strong className="text-zinc-300">{allSelectedZones.length}</strong></span>
                <button 
                  onClick={() => setTargetZones([])}
                  disabled={targetZones.length === 0}
                  className="text-zinc-500 hover:text-red-400 disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors cursor-pointer"
                >
                  Clear Targets
                </button>
              </div>
            </div>

            {/* Anchored Base Date & Time Editor */}
            <div className="bg-panel border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <span>📅</span> Date & Time Anchor
                </h3>
                
                {/* Live Clock toggle */}
                <button
                  onClick={() => setIsLiveClock(p => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    isLiveClock
                      ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isLiveClock ? 'bg-accent-emerald animate-pulse' : 'bg-zinc-500'}`}></span>
                  {isLiveClock ? 'LIVE CLOCK ON' : 'CLOCK FREEZED'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={htmlDateString}
                    onChange={(e) => handleSetDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    value={htmlTimeString}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-800/60 pt-3.5">
                <span>Working Hours Definition:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={workStart}
                    onChange={(e) => setWorkStart(parseInt(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 rounded px-1 outline-none"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    value={workEnd}
                    onChange={(e) => setWorkEnd(parseInt(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 rounded px-1 outline-none"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Meeting & Schedule Details */}
            <div className="bg-panel border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span>⚡</span> Invite & Calendar Planner
              </h3>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g. Weekly Standup, Technical Sync"
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Duration (Minutes)</label>
                    <select
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(parseInt(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={90}>1.5 Hours</option>
                      <option value={120}>2 Hours</option>
                      <option value={180}>3 Hours</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 justify-end">
                    <button
                      onClick={handleCopyShareLink}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center justify-between transition-all active:scale-98 cursor-pointer"
                    >
                      <span>Share Configuration</span>
                      <span className="text-[9px] bg-zinc-800 border border-zinc-700 px-1 rounded text-zinc-400">
                        {copyLinkSuccess ? 'Copied! ✓' : 'Copy link'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    value={meetingDescription}
                    onChange={(e) => setMeetingDescription(e.target.value)}
                    placeholder="Brief agenda..."
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none resize-none"
                  />
                </div>

                {calendarLinks && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/60">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Calendar Exports:</span>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <a
                        href={calendarLinks.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>📅</span> Google Calendar
                      </a>
                      <a
                        href={calendarLinks.outlook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>📅</span> Outlook Web
                      </a>
                      <a
                        href={calendarLinks.ics}
                        download={`${meetingTitle.replace(/\s+/g, '_')}.ics`}
                        className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 flex items-center justify-center gap-1.5 transition-colors col-span-2"
                      >
                        <span>📥</span> Download .iCal / .ics File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* LOG TIMESTAMPS CONVERTER SUBPANEL */
          <div className="bg-panel border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span>📁</span> Log Timestamp Relocator
              </h3>
              <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                Paste raw log files containing standard strings (ISO, UTC formats) and convert them instantly to a target timezone.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Raw Server Logs</label>
                <textarea
                  rows={6}
                  value={rawLogs}
                  onChange={(e) => setRawLogs(e.target.value)}
                  placeholder="Paste log traces here... e.g.
[2026-06-15 12:22:18 +0000] [DEBUG] User verified.
2026-06-15T06:53:02.123Z [INFO] Processing request."
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2.5 text-xs font-mono text-zinc-200 outline-none resize-none whitespace-pre scrollbar-thin"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Target Timezone</label>
                <select
                  value={logTargetZone}
                  onChange={(e) => setLogTargetZone(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-accent-emerald rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  {ianaTimeZones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleConvertLogs}
                disabled={!rawLogs.trim()}
                className="w-full bg-accent-emerald text-zinc-950 font-mono text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-accent-emerald disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>🔄</span> Convert Logs
              </button>
            </div>

            {convertedLogs && (
              <div className="flex flex-col gap-3.5 border-t border-zinc-800/60 pt-4 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Matches: <strong className="text-accent-emerald">{logMatches.length}</strong></span>
                  <button
                    onClick={handleCopyLogs}
                    className="text-xs font-mono text-accent-emerald hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📋</span> {copyLogsSuccess ? 'Logs Copied!' : 'Copy Converted Logs'}
                  </button>
                </div>
                
                <textarea
                  readOnly
                  rows={6}
                  value={convertedLogs}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-2.5 text-xs font-mono text-zinc-400 outline-none resize-none whitespace-pre scrollbar-thin"
                />

                {logMatches.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Identified Replacements:</span>
                    <div className="max-h-36 overflow-y-auto border border-zinc-800/80 rounded-lg bg-zinc-900/40 divide-y divide-zinc-850 scrollbar-thin">
                      {logMatches.map(m => (
                        <div key={m.index} className="p-2 text-[10px] font-mono flex flex-col gap-1">
                          <div className="flex items-center justify-between text-zinc-500">
                            <span>Original</span>
                            <span>Converted</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-300">
                            <span className="text-red-400 line-through truncate max-w-[45%]">{m.originalText}</span>
                            <span className="text-zinc-500 font-sans">→</span>
                            <span className="text-accent-emerald font-semibold truncate max-w-[48%]">{m.convertedText}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------
          RIGHT COLUMN: Live Timelines, Cards, and Optimizer
          ---------------------------------------------------------------------- */}
      <div className="w-full lg:w-7/12 flex flex-col gap-6">
        
        {/* Timeline Scrubber Card */}
        <div className="bg-panel border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                24-Hour Scrubber Timeline
              </h3>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                Drag to shift times across all target slots simultaneously.
              </p>
            </div>
            {baseZoneDetails && (
              <span className="text-xs font-mono font-semibold text-accent-emerald bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                Base: {baseZoneDetails.currentTime} ({baseZoneDetails.offsetString})
              </span>
            )}
          </div>

          {/* Timeline Bar */}
          <div className="relative pt-6 pb-2">
            {/* Scrubber hours scale */}
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 select-none px-1 mb-2">
              <span>12 AM</span>
              <span>4 AM</span>
              <span>8 AM</span>
              <span>12 PM</span>
              <span>4 PM</span>
              <span>8 PM</span>
              <span className="text-right">11 PM</span>
            </div>

            {/* Visual Timeline strip showing block divisions */}
            <div className="w-full h-6 rounded-lg bg-zinc-950 border border-zinc-800 flex overflow-hidden relative select-none">
              {timelineData.map((slot, index) => {
                let blockBg = 'bg-red-500/10 hover:bg-red-500/20'; // sleep
                let labelColor = 'border-red-500/30';
                
                if (slot.classification === 'core') {
                  blockBg = 'bg-accent-emerald/25 hover:bg-accent-emerald/35 border-x border-accent-emerald/30';
                  labelColor = 'border-accent-emerald/60';
                } else if (slot.classification === 'shoulder') {
                  blockBg = 'bg-amber-500/15 hover:bg-amber-500/25 border-x border-amber-500/20';
                  labelColor = 'border-amber-500/40';
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSetHour(slot.hourIndex)}
                    title={`Slot ${slot.hourIndex.toString().padStart(2, '0')}:00 (Score: ${slot.score}%)`}
                    className={`flex-1 h-full relative transition-colors duration-100 border-r border-zinc-900/30 cursor-pointer ${blockBg}`}
                  />
                );
              })}

              {/* Dynamic thumb line representing the active scrubber time */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-accent-emerald pointer-events-none transition-all shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                style={{ left: `${(currentTimelineHour / 24) * 100}%` }}
              >
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-accent-emerald border-2 border-zinc-900 flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                </div>
              </div>
            </div>
            
            {/* Range input slider */}
            <input
              type="range"
              min={0}
              max={23}
              value={currentTimelineHour}
              onChange={(e) => handleSetHour(parseInt(e.target.value))}
              className="absolute top-11 left-0 right-0 w-full h-6 opacity-0 cursor-ew-resize z-10"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono border-t border-zinc-800/60 pt-3 text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-accent-emerald/25 border border-accent-emerald/40"></span> Core Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/15 border border-amber-500/30"></span> Shoulder Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-500/10 border border-red-500/20"></span> Sleep/Rest hours
            </span>
          </div>
        </div>

        {/* Meeting Overlap Optimizer */}
        <div className="bg-panel border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <span>💡</span> Meeting Hour Optimizer
          </h3>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            We analyzed overlapping time ranges across all targets. Below are the optimal times to schedule your {meetingDuration}-min meeting:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-1">
            {suggestedSlots.length === 0 ? (
              <div className="col-span-3 bg-zinc-900/50 border border-zinc-850 p-4 rounded-lg text-center text-xs font-mono text-zinc-500">
                No overlapping working windows found. Adjust working hours definition or timezone targets.
              </div>
            ) : (
              suggestedSlots.map((slot, index) => {
                const hourFormatted = `${slot.hourIndex.toString().padStart(2, '0')}:00`;
                const isSelected = currentTimelineHour === slot.hourIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => selectOptimizedHour(slot.hourIndex)}
                    className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 group cursor-pointer hover:border-zinc-650 hover:bg-zinc-900/20 active:scale-98 ${
                      isSelected
                        ? 'bg-zinc-900 border-accent-emerald text-zinc-100 shadow-[0_0_10px_rgba(52,211,153,0.04)]'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20' 
                          : 'bg-zinc-950 text-zinc-500 border border-zinc-850'
                      }`}>
                        Option {index + 1}
                      </span>
                      <span className={`text-xs font-semibold font-mono ${isSelected ? 'text-accent-emerald' : 'text-zinc-400'}`}>
                        Score: {slot.score}%
                      </span>
                    </div>

                    <div className="mt-3.5 flex flex-col gap-1">
                      <span className="text-sm font-bold font-mono text-zinc-200">
                        {hourFormatted}
                      </span>
                      <span className="text-[10px] text-zinc-500 leading-snug">
                        Base Timezone Time
                      </span>
                    </div>

                    <span className="text-[9px] font-mono text-accent-emerald opacity-0 group-hover:opacity-100 transition-opacity mt-2.5 font-bold">
                      Set Scrubber →
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Global Timezone Cards List */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 px-1 flex items-center justify-between">
            <span>Target Zone Cards</span>
            <span className="text-[10px] text-zinc-500 font-normal">Select anchor house to swap base timezone</span>
          </div>

          {/* Base Zone Display Card */}
          {baseZoneDetails && (
            <div className="bg-panel border-2 border-accent-emerald/45 rounded-xl p-5 shadow-[0_4px_20px_rgba(52,211,153,0.03)] relative overflow-hidden group">
              {/* Highlight ribbon */}
              <div className="absolute top-0 right-0 bg-accent-emerald text-zinc-950 font-mono font-bold text-[8px] uppercase px-3.5 py-0.5 rounded-bl tracking-widest shadow-md">
                BASE ZONE
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  {renderSkyDial(baseDate.getHours(), baseZoneDetails.cityName)}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">
                      {baseZoneDetails.cityName}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mt-0.5">
                      {baseZoneDetails.regionName} • {baseZoneDetails.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-zinc-50 font-mono tracking-tight">
                      {baseZoneDetails.currentTime}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {baseZoneDetails.currentDate}
                    </span>
                  </div>

                  {/* Manual clock inputs */}
                  <div className="flex flex-col items-end gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={baseDate.getHours()}
                      onChange={(e) => handleAdjustCardHour(baseZone, parseInt(e.target.value))}
                      className="w-12 bg-zinc-900 border border-zinc-800 text-center text-xs font-mono py-1 rounded text-zinc-100 outline-none focus:border-accent-emerald hover:border-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer detail */}
              <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-3 relative z-10">
                <span>Current status: <strong className="text-accent-emerald uppercase font-bold">{classifyHour(baseDate.getHours(), workStart, workEnd)} hours</strong></span>
                <span>{baseZoneDetails.offsetString} {baseZoneDetails.isDst ? '• DST Active' : ''}</span>
              </div>
            </div>
          )}

          {/* List of target cards */}
          {targetZonesDetails.length === 0 ? (
            <div className="bg-panel border border-zinc-800 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
              <span className="text-3xl text-zinc-700">🌍</span>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-zinc-300 font-sans">No target timezones selected</h4>
                <p className="text-[11px] text-zinc-500 font-sans max-w-xs leading-relaxed">
                  Use the left search tool to add target cities and compare meeting windows in real-time.
                </p>
              </div>
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="mt-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Focus search input
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {targetZonesDetails.map(zone => {
                // Calculate target time hour index for render
                const offsetMinutes = getTimeZoneOffset(baseDate, zone.id);
                const zoneTime = new Date(baseDate.getTime() + (offsetMinutes + baseDate.getTimezoneOffset()) * 60000);
                const zoneHour = zoneTime.getHours();
                const status = classifyHour(zoneHour, workStart, workEnd);

                let cardBorder = 'border-zinc-800';
                if (status === 'core') cardBorder = 'border-emerald-900/30 hover:border-emerald-600/40 bg-emerald-950/2';
                else if (status === 'shoulder') cardBorder = 'border-amber-900/20 hover:border-amber-600/30';

                return (
                  <div
                    key={zone.id}
                    className={`bg-panel border rounded-xl p-5 hover:bg-zinc-900/10 transition-all duration-300 relative group/card flex flex-col justify-between ${cardBorder}`}
                  >
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        {renderSkyDial(zoneHour, zone.cityName)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-zinc-150">
                              {zone.cityName}
                            </h4>
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 px-1 rounded">
                              {zone.relativeDiff}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mt-0.5">
                            {zone.regionName} • {zone.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-zinc-50 font-mono tracking-tight">
                            {zone.currentTime}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {zone.currentDate}
                          </span>
                        </div>

                        {/* Direct card hour adjustment input */}
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={zoneHour}
                          onChange={(e) => handleAdjustCardHour(zone.id, parseInt(e.target.value))}
                          className="w-12 bg-zinc-900 border border-zinc-800 text-center text-xs font-mono py-1 rounded text-zinc-100 outline-none hover:border-zinc-700 focus:border-accent-emerald"
                        />
                      </div>
                    </div>

                    {/* Card Actions overlay (Delete & Set base toggles) */}
                    <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSetBaseZone(zone.id)}
                          className="text-zinc-500 hover:text-accent-emerald font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Make base timezone"
                        >
                          <span>🏠</span> Make Base
                        </button>
                        <button
                          onClick={() => handleRemoveZone(zone.id)}
                          className="text-zinc-500 hover:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>✕</span> Remove
                        </button>
                      </div>

                      <span>{zone.offsetString} {zone.isDst ? '• DST Active' : ''}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
