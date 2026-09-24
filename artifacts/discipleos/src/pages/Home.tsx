// @ts-nocheck
import { apiFetch } from "@/lib/api-fetch";
const fetch = apiFetch;
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useAuth } from "../lib/auth";
import { Link } from "wouter";
import {
  estimateChapterMinutes,
  estimateChapterMinutesAtWpm,
  estimateDayMinutes,
  formatMinutes,
} from "../bible-data";
import {
  buildReadingSchedule,
  buildReadingJourneySchedule,
  expandScheduledChapters,
  getJourneyEndDate,
  getReadingJourney,
  isOversizedReadingJourneyPlan,
  normalizeReadingJourneyPlan,
  summarizeReadingSchedule,
} from "../lib/reading-schedule";
import InstallButton from "../install-button";
import FirstPlanOnboarding from "../components/FirstPlanOnboarding";
import {
  type PendingOp,
  addPendingOp,
  flushPendingOps,
  loadLocalOnlyAfterSignOut,
  loadPendingOpsState,
  loadDashboardDisclosureState,
  reconcileSessionBoundary,
  saveDashboardDisclosureState,
  saveLocalOnlyAfterSignOut,
  savePendingOps,
} from "../lib/sync";
import {
  applyReadingDefaultsToPlanForm,
  DEFAULT_READING_DEFAULTS,
  DEFAULT_READING_WPM,
  loadReadingDefaults,
  normalizeReadingDefaults,
  saveReadingDefaults,
  type ReadingDefaults,
} from "../lib/reading-settings";
import {
  buildPushRegistrationPayload,
  getPushDeviceId,
} from "../lib/push-device";
import {
  isPushSubscriptionCompatible,
  subscribeAndConfirmPush,
} from "../lib/push-subscription";
import {
  calculateMountainRhythm,
  isStructuredClimbPlan,
  mergeLocalCompletionHistory,
  resolveStructuredClimbPlanId,
} from "../lib/mountain-rhythm";
import {
  isConsistencyResetPlan,
  isRetiredConsistencyResetPlan,
  normalizeConsistencyResetPlan,
  resolveSelectedPlanId,
} from "../lib/consistency-reset";
import {
  addDaysISO as addDays,
  diffDaysInclusive,
  formatLocalDate as formatDate,
  getLocalDayOfYear,
  getLocalWeekday,
  todayISO,
  toISODate,
} from "../lib/local-date";
import {
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Bell,
  Clock3,
  Church,
  HeartHandshake,
  Shuffle,
  ArrowDownAZ,
  BookMarked,
  Pencil,
  Sparkles,
  Bookmark,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  X,
  Mountain,
  Settings as SettingsIcon,
} from "lucide-react";

const BIBLE_BOOKS = [
  { name: "Genesis", testament: "OT", chapters: 50 },
  { name: "Exodus", testament: "OT", chapters: 40 },
  { name: "Leviticus", testament: "OT", chapters: 27 },
  { name: "Numbers", testament: "OT", chapters: 36 },
  { name: "Deuteronomy", testament: "OT", chapters: 34 },
  { name: "Joshua", testament: "OT", chapters: 24 },
  { name: "Judges", testament: "OT", chapters: 21 },
  { name: "Ruth", testament: "OT", chapters: 4 },
  { name: "1 Samuel", testament: "OT", chapters: 31 },
  { name: "2 Samuel", testament: "OT", chapters: 24 },
  { name: "1 Kings", testament: "OT", chapters: 22 },
  { name: "2 Kings", testament: "OT", chapters: 25 },
  { name: "1 Chronicles", testament: "OT", chapters: 29 },
  { name: "2 Chronicles", testament: "OT", chapters: 36 },
  { name: "Ezra", testament: "OT", chapters: 10 },
  { name: "Nehemiah", testament: "OT", chapters: 13 },
  { name: "Esther", testament: "OT", chapters: 10 },
  { name: "Job", testament: "OT", chapters: 42 },
  { name: "Psalms", testament: "OT", chapters: 150 },
  { name: "Proverbs", testament: "OT", chapters: 31 },
  { name: "Ecclesiastes", testament: "OT", chapters: 12 },
  { name: "Song of Solomon", testament: "OT", chapters: 8 },
  { name: "Isaiah", testament: "OT", chapters: 66 },
  { name: "Jeremiah", testament: "OT", chapters: 52 },
  { name: "Lamentations", testament: "OT", chapters: 5 },
  { name: "Ezekiel", testament: "OT", chapters: 48 },
  { name: "Daniel", testament: "OT", chapters: 12 },
  { name: "Hosea", testament: "OT", chapters: 14 },
  { name: "Joel", testament: "OT", chapters: 3 },
  { name: "Amos", testament: "OT", chapters: 9 },
  { name: "Obadiah", testament: "OT", chapters: 1 },
  { name: "Jonah", testament: "OT", chapters: 4 },
  { name: "Micah", testament: "OT", chapters: 7 },
  { name: "Nahum", testament: "OT", chapters: 3 },
  { name: "Habakkuk", testament: "OT", chapters: 3 },
  { name: "Zephaniah", testament: "OT", chapters: 3 },
  { name: "Haggai", testament: "OT", chapters: 2 },
  { name: "Zechariah", testament: "OT", chapters: 14 },
  { name: "Malachi", testament: "OT", chapters: 4 },
  { name: "Matthew", testament: "NT", chapters: 28 },
  { name: "Mark", testament: "NT", chapters: 16 },
  { name: "Luke", testament: "NT", chapters: 24 },
  { name: "John", testament: "NT", chapters: 21 },
  { name: "Acts", testament: "NT", chapters: 28 },
  { name: "Romans", testament: "NT", chapters: 16 },
  { name: "1 Corinthians", testament: "NT", chapters: 16 },
  { name: "2 Corinthians", testament: "NT", chapters: 13 },
  { name: "Galatians", testament: "NT", chapters: 6 },
  { name: "Ephesians", testament: "NT", chapters: 6 },
  { name: "Philippians", testament: "NT", chapters: 4 },
  { name: "Colossians", testament: "NT", chapters: 4 },
  { name: "1 Thessalonians", testament: "NT", chapters: 5 },
  { name: "2 Thessalonians", testament: "NT", chapters: 3 },
  { name: "1 Timothy", testament: "NT", chapters: 6 },
  { name: "2 Timothy", testament: "NT", chapters: 4 },
  { name: "Titus", testament: "NT", chapters: 3 },
  { name: "Philemon", testament: "NT", chapters: 1 },
  { name: "Hebrews", testament: "NT", chapters: 13 },
  { name: "James", testament: "NT", chapters: 5 },
  { name: "1 Peter", testament: "NT", chapters: 5 },
  { name: "2 Peter", testament: "NT", chapters: 3 },
  { name: "1 John", testament: "NT", chapters: 5 },
  { name: "2 John", testament: "NT", chapters: 1 },
  { name: "3 John", testament: "NT", chapters: 1 },
  { name: "Jude", testament: "NT", chapters: 1 },
  { name: "Revelation", testament: "NT", chapters: 22 },
];

const PRESETS = {
  psalmsProverbs: ["Psalms", "Proverbs"],
  oldTestament: BIBLE_BOOKS.filter((b) => b.testament === "OT").map((b) => b.name),
  newTestament: BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => b.name),
  gospels: ["Matthew", "Mark", "Luke", "John"],
  wholeBible: BIBLE_BOOKS.map((b) => b.name),
};

function getSuggestedPlanName(form: any) {
  const journey = getReadingJourney(form?.journeyKey);
  if (journey) return journey.name;

  const selectedBooks = Array.isArray(form?.selectedBooks) ? form.selectedBooks : [];
  const presetNames = [
    ["psalmsProverbs", "Psalms + Proverbs"],
    ["newTestament", "New Testament"],
    ["oldTestament", "Old Testament"],
  ];

  for (const [key, label] of presetNames) {
    const presetBooks = PRESETS[key];
    if (
      selectedBooks.length === presetBooks.length &&
      presetBooks.every((book) => selectedBooks.includes(book))
    ) {
      return label;
    }
  }

  if (selectedBooks.length === 1) return selectedBooks[0];
  return "My Bible Reading Plan";
}

// Fallback verses used when the API and localStorage cache are both unavailable
const VERSES_FALLBACK = [
  {
    reference: "Lamentations 3:22-23",
    text: "Because of the LORD's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
  },
  {
    reference: "Psalm 119:105",
    text: "Thy word is a lamp unto my feet, and a light unto my path.",
  },
  {
    reference: "Joshua 1:9",
    text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
  },
  {
    reference: "Matthew 6:33",
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
  },
  {
    reference: "Philippians 4:6-7",
    text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
  },
  {
    reference: "Isaiah 40:31",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  },
];

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(timeString: string) {
  if (!timeString) return "";
  const [h, m] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function expandChapters(selectedBooks: string[], readingWpm = DEFAULT_READING_WPM) {
  const estimate = (book: string, chapter: number) =>
    estimateChapterMinutesAtWpm(book, chapter, readingWpm);
  return expandScheduledChapters(selectedBooks, BIBLE_BOOKS, estimate);
}

function buildSchedule(
  selectedBooks: string[],
  startDate: string,
  endDate: string,
  readingMode = "consecutive",
  readingWpm = DEFAULT_READING_WPM,
) {
  return buildReadingSchedule({
    selectedBooks,
    startDate,
    endDate,
    paceMode: "chapters",
    readingMode,
    bookCatalog: BIBLE_BOOKS,
    estimateChapterMinutes: (book, chapter) =>
      estimateChapterMinutesAtWpm(book, chapter, readingWpm),
  });
}

// Time-based scheduler: fills each day up to dailyMinutes using real verse counts.
// Never splits a chapter; if one chapter exceeds the budget it gets its own day.
function buildTimeBasedSchedule(
  selectedBooks: string[],
  startDate: string,
  dailyMinutes: number,
  readingMode = "consecutive",
  readingWpm = DEFAULT_READING_WPM,
) {
  return buildReadingSchedule({
    selectedBooks,
    startDate,
    paceMode: "time",
    dailyMinutes,
    readingMode,
    bookCatalog: BIBLE_BOOKS,
    estimateChapterMinutes: (book, chapter) =>
      estimateChapterMinutesAtWpm(book, chapter, readingWpm),
  });
}

function calculateDaysForTargetPace(totalChapters: number, targetChaptersPerDay = 2.5) {
  if (!totalChapters || targetChaptersPerDay <= 0) return 1;
  return Math.max(1, Math.ceil(totalChapters / targetChaptersPerDay));
}

function calculateAutoEndDate(
  selectedBooks: string[],
  startDate: string,
  targetChaptersPerDay = 2.5,
  paceMode = "chapters",
  dailyMinutes = 20,
  readingWpm = DEFAULT_READING_WPM,
) {
  const summary = summarizeReadingSchedule({
    selectedBooks,
    startDate,
    endDate: addDays(
      startDate,
      calculateDaysForTargetPace(expandChapters(selectedBooks, readingWpm).length, targetChaptersPerDay) - 1,
    ),
    paceMode,
    dailyMinutes,
    targetChaptersPerDay,
    bookCatalog: BIBLE_BOOKS,
    estimateChapterMinutes: (book, chapter) =>
      estimateChapterMinutesAtWpm(book, chapter, readingWpm),
  });
  return paceMode === "time"
    ? summary.actualEndDate
    : addDays(startDate, summary.totalDays - 1);
}

function summarizePlanInput(form: any) {
  return summarizeReadingSchedule({
    selectedBooks: form.selectedBooks,
    startDate: form.startDate,
    endDate: form.endDate,
    paceMode: form.paceMode,
    dailyMinutes: form.dailyMinutes,
    targetChaptersPerDay: form.targetChaptersPerDay,
    readingMode: form.readingMode,
    bookCatalog: BIBLE_BOOKS,
    estimateChapterMinutes: (book, chapter) =>
      estimateChapterMinutesAtWpm(book, chapter, form.readingWpm || DEFAULT_READING_WPM),
  });
}

function getCompletedMap(plan: any) {
  const completed = plan?.completed;

  if (completed && typeof completed === "object" && !Array.isArray(completed)) {
    return completed;
  }

  const legacyKeys = Array.isArray(plan?.completedChapterKeys)
    ? plan.completedChapterKeys
    : [];

  return legacyKeys.reduce((map: any, key: string) => {
    map[key] = true;
    return map;
  }, {});
}

function getEarnedDayKeys(plan: any) {
  const completedMap = getCompletedMap(plan);
  const earned = new Set(
    Array.isArray(plan?.earnedDayKeys) ? plan.earnedDayKeys : [],
  );
  for (const assignment of plan?.assignments || []) {
    if (
      assignment?.date &&
      assignment?.readings?.length &&
      assignment.readings.every((reading: any) => Boolean(completedMap[reading.key]))
    ) {
      earned.add(assignment.date);
    }
  }
  return earned;
}

function getReadingChapters(reading: any) {
  if (reading?.book && reading?.chapter) {
    return [{ book: reading.book, chapter: reading.chapter }];
  }

  const label = typeof reading?.label === "string" ? reading.label.trim() : "";
  const match = label.match(/^(.*?)(?:\s+)(\d+)(?:-(\d+))?$/);
  if (!match) return [];

  const displayBook = match[1];
  const book = displayBook === "Psalm" ? "Psalms" : displayBook;
  const start = Number(match[2]);
  const end = Number(match[3] || match[2]);
  return Array.from({ length: end - start + 1 }, (_, index) => ({
    book,
    chapter: start + index,
  }));
}

function getAssignmentMinutes(day: any) {
  if (typeof day?.estimatedMinutes === "number") return day.estimatedMinutes;
  return (day?.readings || []).reduce(
    (sum: number, reading: any) =>
      sum + (typeof reading.estimatedMinutes === "number"
        ? reading.estimatedMinutes
        : getReadingChapters(reading).reduce(
          (readingSum: number, chapter: any) =>
            readingSum + estimateChapterMinutes(chapter.book, chapter.chapter),
          0,
        )),
    0,
  );
}

function getPlanStats(plan: any) {
  const completedMap = getCompletedMap(plan);
  const totalChapters = plan.assignments.reduce(
    (sum: number, day: any) =>
      sum + day.readings.reduce(
        (daySum: number, reading: any) => daySum + Math.max(1, getReadingChapters(reading).length),
        0,
      ),
    0
  );
  const dayMinutes = plan.assignments.map(getAssignmentMinutes);
  const dayChapterCounts = plan.assignments.map((day: any) =>
    day.readings.reduce(
      (sum: number, reading: any) => sum + Math.max(1, getReadingChapters(reading).length),
      0,
    ),
  );
  const totalMinutes = dayMinutes.reduce((sum: number, minutes: number) => sum + minutes, 0);
  const completed = plan.assignments.reduce(
    (sum: number, day: any) =>
      sum + day.readings.reduce(
        (daySum: number, reading: any) =>
          daySum + (completedMap[reading.key] ? Math.max(1, getReadingChapters(reading).length) : 0),
        0,
      ),
    0,
  );
  const percent = totalChapters === 0 ? 0 : Math.round((completed / totalChapters) * 100);
  const totalDays = Math.max(1, plan.assignments.length);
  const chaptersPerDayExact = totalChapters / totalDays;
  const minPerDay = totalChapters === 0 ? 0 : Math.min(...dayChapterCounts);
  const maxPerDay = totalChapters === 0 ? 0 : Math.max(...dayChapterCounts);
  const minMinutesPerDay = dayMinutes.length > 0 ? Math.min(...dayMinutes) : 0;
  const maxMinutesPerDay = dayMinutes.length > 0 ? Math.max(...dayMinutes) : 0;
  const remainingChapters = Math.max(0, totalChapters - completed);
  const completedDates = new Set();

  plan.assignments.forEach((day: any) => {
    const allDone =
      day.readings.length > 0 &&
      day.readings.every((reading: any) => !!completedMap[reading.key]);
    if (allDone) completedDates.add(day.date);
  });

  const today = todayISO();
  const remainingDays = plan.assignments.filter(
    (day: any) => day.date >= today && !completedDates.has(day.date)
  ).length;
  const neededPerRemainingDay =
    remainingDays > 0 ? remainingChapters / remainingDays : remainingChapters;
  const onTrack = remainingDays === 0 ? remainingChapters === 0 : neededPerRemainingDay <= maxPerDay + 0.01;

  return {
    totalChapters,
    completed,
    percent,
    totalDays,
    totalMinutes,
    averageMinutesPerDay: totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0,
    minMinutesPerDay,
    maxMinutesPerDay,
    chaptersPerDayExact,
    minPerDay,
    maxPerDay,
    remainingChapters,
    remainingDays,
    neededPerRemainingDay,
    onTrack,
    completedDays: completedDates.size,
  };
}

function getTodaysReading(plan: any, date = todayISO()) {
  return plan.assignments.find((a) => a.date === date);
}

function getReadingBookName(reading: any) {
  const chapters = getReadingChapters(reading);
  if (chapters[0]?.book) return chapters[0].book;
  if (reading?.book) return reading.book;

  const label = typeof reading?.label === "string" ? reading.label.trim() : "";
  return label.replace(/\s+\d+(?:-\d+)?$/, "") || "Reading";
}

function getMonthGrid(baseDate: Date) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay()));

  const days = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function getFallbackVerse() {
  const dayOfYear = getLocalDayOfYear();
  return VERSES_FALLBACK[dayOfYear % VERSES_FALLBACK.length];
}

const VERSE_CACHE_KEY = "discipleos_verse_cache";

async function fetchVerseOfTheDay(): Promise<{ reference: string; text: string }> {
  const todayStr = todayISO();

  // Check localStorage first
  try {
    const raw = localStorage.getItem(VERSE_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.date === todayStr && cached.verse?.text) {
        return cached.verse;
      }
    }
  } catch { }

  // Fetch from API
  try {
    const res = await fetch(`/api/verse`);
    if (res.ok) {
      const verse = await res.json();
      if (verse?.text) {
        try {
          localStorage.setItem(VERSE_CACHE_KEY, JSON.stringify({ date: todayStr, verse }));
        } catch { }
        return verse;
      }
    }
  } catch { }

  return getFallbackVerse();
}

function createPlanObject({
  name,
  selectedBooks,
  startDate,
  endDate,
  color,
  readingMode = "consecutive",
  readingTime = "07:00",
  paceMode = "chapters",
  readingPaceMode = "standard",
  readingCustomMinutesPerChapter = null,
  dailyMinutes = 20,
  readingWpm = DEFAULT_READING_WPM,
  journeyKey = null,
}) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const journey = getReadingJourney(journeyKey);
  const scheduledEndDate = journey
    ? getJourneyEndDate(startDate, journey.durationDays)
    : endDate;

  const assignments = journey
    ? buildReadingJourneySchedule({
      journeyKey: journey.key,
      selectedBooks,
      startDate,
      bookCatalog: BIBLE_BOOKS,
      estimateChapterMinutes,
    })
    : buildReadingSchedule({
      selectedBooks,
      startDate,
      endDate: scheduledEndDate,
      paceMode,
      dailyMinutes,
      readingMode,
      bookCatalog: BIBLE_BOOKS,
      estimateChapterMinutes: (book, chapter) =>
        estimateChapterMinutesAtWpm(book, chapter, readingWpm),
    });

  const actualEndDate =
    paceMode === "time" && assignments.length > 0
      ? assignments[assignments.length - 1].date
      : scheduledEndDate;

  return {
    id,
    name: journey?.name || name,
    selectedBooks,
    startDate,
    endDate: actualEndDate,
    color,
    readingMode,
    readingTime,
    paceMode,
    readingPaceMode,
    ...(readingCustomMinutesPerChapter
      ? { readingCustomMinutesPerChapter }
      : {}),
    dailyMinutes,
    readingWpm,
    assignments,
    completed: {},
    ...(journey
      ? {
        journeyKey: journey.key,
        journeyType: journey.type,
        journeyDays: journey.durationDays,
        durationDays: journey.durationDays,
        totalDays: journey.durationDays,
      }
      : {}),
  };
}

function getPlanPaceLabel(plan: any) {
  const savedMode = plan?.readingPaceMode;
  if (savedMode === "relaxed") return "Relaxed";
  if (savedMode === "fast") return "Fast";
  if (savedMode === "custom") return "Custom";
  if (savedMode === "standard") return "Standard";
  if (plan?.paceMode === "chapters") return "Custom";

  const readingWpm = Number(plan?.readingWpm || DEFAULT_READING_WPM);
  if (readingWpm >= 240) return "Fast";
  if (readingWpm <= 170) return "Relaxed";
  return "Standard";
}

function getPlanPaceWpm(plan: any) {
  const readingWpm = Number(plan?.readingWpm);
  if (Number.isFinite(readingWpm) && readingWpm > 0) {
    return Math.round(readingWpm);
  }

  if (plan?.readingPaceMode === "relaxed") return 140;
  if (plan?.readingPaceMode === "fast") return 275;
  if (plan?.readingPaceMode === "custom") {
    const customMinutes = Number(plan?.readingCustomMinutesPerChapter);
    if (Number.isFinite(customMinutes) && customMinutes > 0) {
      return Math.max(40, Math.round(676 / customMinutes));
    }
  }

  return DEFAULT_READING_WPM;
}

function defaultPlans() {
  const yearFromNow = addDays(todayISO(), 364);
  const ntEnd = addDays(todayISO(), 179);

  return [
    createPlanObject({
      name: "Psalms + Proverbs",
      selectedBooks: PRESETS.psalmsProverbs,
      startDate: todayISO(),
      endDate: addDays(todayISO(), 59),
      color: "from-amber-400 via-orange-400 to-amber-700",
      readingMode: "random",
      readingTime: "07:00",
    }),
    createPlanObject({
      name: "New Testament",
      selectedBooks: PRESETS.newTestament,
      startDate: todayISO(),
      endDate: ntEnd,
      color: "from-sky-400 via-cyan-400 to-teal-500",
      readingMode: "consecutive",
      readingTime: "07:00",
    }),
    createPlanObject({
      name: "Old Testament",
      selectedBooks: PRESETS.oldTestament,
      startDate: todayISO(),
      endDate: yearFromNow,
      color: "from-emerald-400 via-teal-400 to-cyan-500",
      readingMode: "consecutive",
      readingTime: "07:00",
    }),
  ];
}

function defaultEvents() {
  const today = todayISO();
  const id = () =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  return [
    {
      id: id(),
      title: "Morning Prayer",
      type: "prayer",
      date: today,
      time: "06:30",
      notes: "Personal prayer and thanksgiving",
      remind: true,
      reminderMinutes: 10,
    },
    {
      id: id(),
      title: "Midday Prayer",
      type: "prayer",
      date: today,
      time: "12:00",
      notes: "Pause and pray",
      remind: true,
      reminderMinutes: 10,
    },
    {
      id: id(),
      title: "Wednesday Fast",
      type: "fast",
      date: addDays(today, 1),
      time: "06:00",
      notes: "Sunrise to sunset",
      remind: true,
      reminderMinutes: 30,
    },
    {
      id: id(),
      title: "Sunday Church",
      type: "church",
      date: addDays(today, 4),
      time: "10:00",
      notes: "Main service",
      remind: true,
      reminderMinutes: 60,
    },
    {
      id: id(),
      title: "Men’s Bible Study",
      type: "event",
      date: addDays(today, 6),
      time: "18:30",
      notes: "Church fellowship hall",
      remind: true,
      reminderMinutes: 30,
    },
  ];
}

function sortEvents(items: any[]) {
  return [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function upsertEvent(items: any[], nextEvent: any) {
  const existingIndex = items.findIndex((item) => item.id === nextEvent.id);

  if (existingIndex === -1) {
    return sortEvents([...items, nextEvent]);
  }

  const updated = [...items];
  updated[existingIndex] = nextEvent;
  return sortEvents(updated);
}

function removeEventById(items: any[], eventId: string) {
  return sortEvents(items.filter((item) => item.id !== eventId));
}

function getWeekdayIndex(dateISO: string) {
  return getLocalWeekday(dateISO);
}

function normalizeWeekdays(weekdays: any[] = []) {
  return [...new Set(weekdays.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
}

function eventOccursOnDate(event: any, dateISO: string) {
  if (!event?.repeat || event.repeat === "none") {
    return event.date === dateISO;
  }

  if (dateISO < event.date) return false;
  if (event.repeatUntil && dateISO > event.repeatUntil) return false;

  if (event.repeat === "daily") return true;

  if (event.repeat === "weekly") {
    const weekdays = normalizeWeekdays(event.repeatWeekdays);
    return weekdays.includes(getWeekdayIndex(dateISO));
  }

  return false;
}

function materializeEventOccurrence(event: any, dateISO: string) {
  return {
    ...event,
    id: `${event.id}-${dateISO}`,
    sourceEventId: event.id,
    sourceDate: event.date,
    date: dateISO,
    isRecurringInstance: event.repeat && event.repeat !== "none",
  };
}

function getEventInstancesForDate(events: any[], dateISO: string) {
  return sortEvents(
    events
      .filter((event) => !isRemovedEventType(event))
      .filter((event) => eventOccursOnDate(event, dateISO))
      .map((event) => materializeEventOccurrence(event, dateISO))
  );
}

const CALENDAR_ACTIVITY_MARKERS = [
  { key: "prayer", letter: "P", label: "Prayer" },
  { key: "fast", letter: "F", label: "Fasting" },
  { key: "church", letter: "C", label: "Church" },
  { key: "event", letter: "E", label: "Event" },
];

function getCalendarActivityMarkers(dayEvents: any[], eventCompletions: Record<string, boolean> = {}) {
  const presentTypes = new Set<string>();
  const completedTypes = new Set<string>();
  const hasCompletedBibleReading = dayEvents.some(
    (event) =>
      event?.isPlan &&
      !event?.isMountainRhythm &&
      Number(event?.readingCount || 0) > 0 &&
      Number(event?.completedCount || 0) === Number(event.readingCount),
  );
  const hasMountainRhythm = dayEvents.some((event) => event?.isPlan && event?.isMountainRhythm);
  const hasCompletedMountainRhythm = dayEvents.some(
    (event) =>
      event?.isPlan &&
      event?.isMountainRhythm &&
      Number(event?.readingCount || 0) > 0 &&
      Number(event?.completedCount || 0) === Number(event.readingCount),
  );
  const hasBibleReading = dayEvents.some((event) => {
    if (event?.isPlan) return !event?.isMountainRhythm;
    return String(event?.type || "").toLowerCase() === "bible";
  });

  dayEvents.forEach((event) => {
    const type = String(event?.type || "event").toLowerCase();
    if (event?.isPlan || type === "bible" || type === "birthday") return;
    if (type === "prayer") {
      presentTypes.add("prayer");
    } else if (type === "fast" || type === "fasting") {
      presentTypes.add("fast");
    } else if (type === "church") {
      presentTypes.add("church");
    } else {
      presentTypes.add("event");
    }

    if (eventCompletions[`${event.sourceEventId || event.id}:${event.date}`] === true) {
      completedTypes.add(
        type === "prayer" ? "prayer" : type === "fast" || type === "fasting" ? "fast" : type === "church" ? "church" : "event",
      );
    }
  });

  return [
    ...(hasBibleReading
      ? [{ key: "bible", label: "Bible reading", icon: "book", completed: hasCompletedBibleReading }]
      : []),
    ...CALENDAR_ACTIVITY_MARKERS.filter((marker) => presentTypes.has(marker.key)),
    ...(hasMountainRhythm
      ? [{ key: "mountain", label: "Mountain Rhythm", icon: "mountain", completed: hasCompletedMountainRhythm }]
      : []),
  ].map((marker) => ({
    ...marker,
    completed:
      marker.key === "bible" || marker.key === "mountain"
        ? Boolean(marker.completed)
        : completedTypes.has(marker.key),
  }));
}

function ClimbProgressSummaryBar({ score }: any) {
  const hasJourney = Number(score?.journeyDays || 0) > 0;
  const climbName = hasJourney ? score.journeyLabel : "No active climb";
  const journeyProgress = hasJourney ? `${score.journeyProgress}%` : "Not started";
  const journeyDetail = hasJourney
    ? `${score.completedDays} of ${score.journeyDays} planned days`
    : "Choose a climb to begin";
  const todayClimbComplete = Boolean(
    hasJourney && score.todayPlanned && score.todayPercentage >= 100,
  );

  return (
    <ResponsiveSection
      testId="dashboard-mountain-rhythm"
      title="Mountain Rhythm"
      icon={Mountain}
      summary="Long-term climb progress"
      summaryTestId="dashboard-mountain-rhythm-description"
      disclosureKey="mountainRhythm"
      collapsible
      headerAction={
        <Link
          href="/mountain-rhythm"
          data-testid="dashboard-mountain-rhythm-details"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-white/70 hover:text-[#F4D77A]"
        >
          Details
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      <div data-testid="dashboard-mountain-rhythm-summary" className="grid grid-cols-3 gap-1 sm:gap-2">
        <div className="min-w-0 border-l border-white/10 px-2 py-1 text-center first:border-l-0 sm:px-3">
          <div className="discipleos-meta-copy flex min-h-8 items-start justify-center text-[10px] leading-4 sm:text-[11px]">
            Active climb
          </div>
          <div
            data-testid="dashboard-mountain-rhythm-climb"
            className="discipleos-safe-text mt-1 break-words text-sm font-semibold leading-5 sm:text-base"
          >
            {climbName}
          </div>
        </div>
        <div className="min-w-0 border-l border-white/10 px-2 py-1 text-center sm:px-3">
          <div className="discipleos-meta-copy flex min-h-8 items-start justify-center text-[10px] leading-4 sm:text-[11px]">
            Journey progress
          </div>
          <div
            data-testid="dashboard-mountain-rhythm-progress"
            className="mt-1 text-xl font-semibold leading-none text-emerald-200 sm:text-2xl"
          >
            {journeyProgress}
          </div>
          <div className="discipleos-meta-copy mt-1 break-words text-[10px] leading-4 sm:text-xs">
            {journeyDetail}
          </div>
        </div>
        <div className="min-w-0 border-l border-white/10 px-2 py-1 text-center sm:px-3">
          <div className="discipleos-meta-copy flex min-h-8 items-start justify-center text-[10px] leading-4 sm:text-[11px]">
            Today’s Climb
          </div>
          <div
            data-testid="dashboard-mountain-rhythm-today-status"
            className={`discipleos-safe-text mt-1 break-words text-sm font-semibold leading-5 sm:text-base ${
              todayClimbComplete ? "text-emerald-200" : "text-[#F4D77A]"
            }`}
          >
            {todayClimbComplete ? "Complete" : "Not complete"}
          </div>
          {todayClimbComplete ? (
            <div className="discipleos-meta-copy mt-1 break-words text-[10px] leading-4 sm:text-xs">
              Today’s reading finished
            </div>
          ) : (
            <Link
              href="/mountain-rhythm"
              data-testid="dashboard-mountain-rhythm-today-action"
              aria-label="Open today’s Mountain Rhythm reading"
              className="mt-1 inline-flex min-h-8 items-center justify-center break-words text-[10px] font-semibold leading-4 text-[#F4D77A] underline decoration-[#F4D77A]/50 underline-offset-2 hover:text-white sm:text-xs"
            >
              Open today’s reading
            </Link>
          )}
        </div>
      </div>
    </ResponsiveSection>
  );
}

function SectionCard({ className = "", children, ...props }: any) {
  return (
    <div
      {...props}
      className={cn(
        "discipleos-functional-surface",
        className
      )}
    >
      {children}
    </div>
  );
}

function PlanDisclosure({
  id,
  title,
  summary,
  icon: Icon,
  open,
  onToggle,
  children,
}: any) {
  return (
    <section data-testid={`plan-section-${id}`} className="border-t border-white/10 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`plan-section-${id}-content`}
        onClick={onToggle}
        className="discipleos-action flex w-full items-center justify-between gap-3 py-3 text-left hover:text-white sm:py-4"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[#D4A017]" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[#F8FAFC]">{title}</span>
            <span className="discipleos-meta-copy mt-0.5 block truncate text-xs">{summary}</span>
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/55 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        id={`plan-section-${id}-content`}
        data-testid={`plan-section-${id}-content`}
        className={cn("pb-4 sm:pb-5", !open && "hidden md:block")}
      >
        {children}
      </div>
    </section>
  );
}

function ResponsiveSection({
  testId,
  title,
  icon: Icon,
  children,
  disclosureKey,
  summary = "",
  summaryTestId,
  collapsible = false,
  plain = false,
  headerAction = null,
  className = "",
}: any) {
  const [open, setOpen] = useState(() => {
    if (!disclosureKey) return true;
    return loadDashboardDisclosureState()[disclosureKey];
  });
  const contentId = `${testId}-content`;
  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (disclosureKey) {
        const state = loadDashboardDisclosureState();
        saveDashboardDisclosureState({ ...state, [disclosureKey]: next });
      }
      return next;
    });
  };

  return (
    <section
      data-testid={testId}
      className={cn(
        plain ? "min-w-0" : "discipleos-functional-surface min-w-0 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        {plain ? (
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              <Icon className="discipleos-section-heading__icon" />
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-white sm:text-lg">{title}</span>
                {summary ? (
                  <span
                    data-testid={summaryTestId || `${testId}-summary`}
                    className="discipleos-secondary-copy mt-1 block truncate text-xs leading-5"
                  >
                    {summary}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={toggle}
            className={cn(
              "group flex min-w-0 flex-1 items-center justify-between gap-3 text-left",
              !collapsible && "lg:pointer-events-none",
            )}
          >
            <span className="flex min-w-0 items-start gap-2">
              <Icon className="discipleos-section-heading__icon" />
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-white sm:text-lg">{title}</span>
                {summary ? (
                  <span
                    data-testid={summaryTestId || `${testId}-summary`}
                    className="discipleos-secondary-copy mt-1 block truncate text-xs leading-5"
                  >
                    {summary}
                  </span>
                ) : null}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-white/50 transition-transform",
                !collapsible && "lg:hidden",
                open && "rotate-180",
              )}
            />
          </button>
        )}
        {headerAction}
      </div>
      <div
        id={contentId}
        className={cn(plain ? "mt-4" : "mt-5", !open && "hidden", !collapsible && "lg:block")}
      >
        {children}
      </div>
    </section>
  );
}

function VerseOfTheDay({
  verse,
}: {
  verse: { reference: string; text: string };
}) {
  return (
    <div
      data-testid="dashboard-verse-of-day"
      className="min-w-0"
    >
      <div>
        <div className="discipleos-field-label mb-2 text-xs uppercase tracking-[0.18em]">Verse of the day</div>
        <div className="text-lg font-semibold leading-8 text-white sm:text-xl">“{verse.text}”</div>
        <div className="mt-3 text-sm text-[#94A3B8]">
          {verse.reference}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, accent = false }: any) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs",
        accent
          ? "border-[#D4A017]/35 bg-[#D4A017]/15 text-[#F4D77A]"
          : "border-white/10 bg-white/5 text-[#94A3B8]"
      )}
    >
      {children}
    </span>
  );
}

function EventBadge({ type }: any) {
  const styles = {
    prayer: "bg-[#B87333]/15 text-[#E7C29A] border-[#B87333]/30",
    fast: "bg-amber-500/15 text-amber-100 border-amber-400/20",
    church: "bg-sky-500/15 text-sky-100 border-sky-400/20",
    bible: "bg-[#D4A017]/15 text-[#F4D77A] border-[#D4A017]/30",
    event: "bg-emerald-500/15 text-emerald-100 border-emerald-400/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs capitalize ${styles[type] || styles.event}`}
    >
      {type}
    </span>
  );
}

const activityTypeChoices = [
  {
    value: "prayer",
    label: "Prayer",
    description: "Set aside time to pray",
    icon: HeartHandshake,
    suggestedTitle: "Prayer",
  },
  {
    value: "fast",
    label: "Fast",
    description: "Plan a time of fasting",
    icon: Sparkles,
    suggestedTitle: "Fast",
  },
  {
    value: "church",
    label: "Church",
    description: "Make room for church",
    icon: Church,
    suggestedTitle: "Church",
  },
  {
    value: "event",
    label: "Event",
    description: "Add a custom activity",
    icon: Calendar,
    suggestedTitle: "Personal event",
  },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

const STORAGE_KEY = "discipleos-data";

function defaultRhythmOptIn(type: string) {
  const normalized = String(type || "").trim().toLowerCase();
  return ["prayer", "fast", "fasting", "church"].includes(normalized);
}

function isRemovedEventType(event: any) {
  const type = String(event?.type || "").trim().toLowerCase();
  return type === "birthday" || type === "birthdays";
}

function isCompletableEvent(event: any) {
  return !isRemovedEventType(event);
}

function normalizeStoredEvents(events: any[]) {
  return sortEvents(events.filter((event) => !isRemovedEventType(event)));
}

function isResetPlan(plan: any) {
  return isConsistencyResetPlan(plan);
}

function isNamedJourneyPlan(plan: any) {
  return Boolean(getReadingJourney(plan?.journeyKey));
}

function isOrdinaryPlan(plan: any) {
  return !isResetPlan(plan) && !isNamedJourneyPlan(plan);
}

function normalizeStoredPlan(plan: any) {
  const normalized = normalizeConsistencyResetPlan({
    ...plan,
    completed: { ...(plan.completed || {}) },
    assignments: Array.isArray(plan.assignments) ? [...plan.assignments] : [],
  });
  return normalizeReadingJourneyPlan(normalized, BIBLE_BOOKS, estimateChapterMinutes);
}

function loadLocalDiscipleData() {
  if (typeof window === "undefined") {
    return { ownerId: null, events: [], plans: [], eventCompletions: {}, selectedPlanId: null };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ownerId: null, events: [], plans: [], eventCompletions: {}, selectedPlanId: null };

    const parsed = JSON.parse(saved);
    const storedPlans = Array.isArray(parsed.plans) ? parsed.plans : [];
    const cleanedPlans = storedPlans.filter((plan) => !isRetiredConsistencyResetPlan(plan));

    if (cleanedPlans.length !== storedPlans.length) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...parsed,
          plans: cleanedPlans,
        }),
      );
    }

    return {
      ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : null,
      events: Array.isArray(parsed.events) ? normalizeStoredEvents(parsed.events) : [],
      plans: cleanedPlans.map(normalizeStoredPlan),
      eventCompletions:
        parsed.eventCompletions && typeof parsed.eventCompletions === "object"
          ? parsed.eventCompletions
          : {},
      selectedPlanId:
        typeof parsed.selectedPlanId === "string"
          ? parsed.selectedPlanId
          : null,
    };
  } catch {
    return { ownerId: null, events: [], plans: [], eventCompletions: {}, selectedPlanId: null };
  }
}

/**
 * Saves a plan to the server. Throws on failure so transactional activations
 * remain uncommitted and can present a retry action.
 */
async function savePlanToServer(plan: any): Promise<void> {
  const response = await fetch("/api/reading/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error: any = new Error(text || "Failed to save plan to server");
    error.status = response.status;
    throw error;
  }
}

async function saveEventToServer(event: any): Promise<void> {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error: any = new Error(text || "Failed to save event to server");
    error.status = response.status;
    throw error;
  }
}

function AccountControls() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useAccount();

  if (!isSignedIn) {
    return (
      <a
        href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`}
        className="discipleos-action inline-flex items-center border border-[#D4A017]/40 bg-[#111820]/90 px-2.5 text-xs font-semibold text-[#F2D37B] transition hover:border-[#D4A017] hover:bg-[#211A0D] sm:px-4 sm:text-sm"
      >
         Continue with email
      </a>
    );
  }

  const displayName = user?.firstName || user?.email?.split("@")[0] || "Account";
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      <span className="hidden max-w-[min(18rem,40vw)] whitespace-normal break-words text-right text-sm text-white/70 sm:inline">{displayName}</span>
      <Link
        href="/settings"
        aria-label="Open settings"
        data-testid="account-settings-link"
        className="discipleos-action inline-flex items-center justify-center border border-white/15 bg-[#111820]/90 px-3 text-white/75 transition hover:border-[#D4A017]/45 hover:bg-[#211A0D] hover:text-[#F4D77A]"
      >
        <SettingsIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        className="discipleos-action inline-flex items-center border border-white/15 bg-[#111820]/90 px-3 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10"
      >
        Sign out
      </button>
    </div>
  );
}

export default function DiscipleOSApp() {
  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
    userId,
    refresh: refreshAuth,
  } = useAuth();
  const getDiscipleUserId = () => {
    if (typeof window === "undefined") return "server";

    const existing = localStorage.getItem("discipleos-user-id");
    if (existing) return existing;

    const nextId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    localStorage.setItem("discipleos-user-id", nextId);
    return nextId;
  };

  const [plans, setPlans] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventCompletions, setEventCompletions] = useState({});
  const [rhythmAccessTier, setRhythmAccessTier] = useState<"basic" | "full">("basic");
  const [namedJourneysAccess, setNamedJourneysAccess] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasInitialSyncCompleted, setHasInitialSyncCompleted] = useState(false);
  const [serverOwnerId, setServerOwnerId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  // True only after the browser PushSubscription is successfully registered on
  // the server. Drives the button label — never set from permission alone.
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationEnablementState, setNotificationEnablementState] = useState<
    "idle" | "enabling" | "success" | "error"
  >("idle");
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const notificationFeedbackTimeoutRef = useRef<number | null>(null);

  const clearNotificationFeedbackTimer = () => {
    if (notificationFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(notificationFeedbackTimeoutRef.current);
      notificationFeedbackTimeoutRef.current = null;
    }
  };

  const showTemporaryNotificationFeedback = (message: string) => {
    clearNotificationFeedbackTimer();
    setNotificationFeedback(message);
    notificationFeedbackTimeoutRef.current = window.setTimeout(() => {
      setNotificationFeedback("");
      notificationFeedbackTimeoutRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => clearNotificationFeedbackTimer();
  }, []);
  const [lastSyncLabel, setLastSyncLabel] = useState("");
  const [readingDefaults, setReadingDefaults] = useState<ReadingDefaults>(() =>
    loadReadingDefaults(),
  );
  // Tracks both visible-tab and pushed reminders so one event only appears once.
  const sentNotificationsRef = useRef(new Set<string>());
  const hasLoadedLocalDataRef = useRef(false);
  const didHydrateRef = useRef(false);
  const localDataRef = useRef(loadLocalDiscipleData());
  // Pending offline writes — populated when a mutation's API call fails.
  // Flushed on the next successful reconnect before re-hydrating from the server.
  const pendingOpsStateRef = useRef(loadPendingOpsState());
  const pendingOpsRef = useRef(pendingOpsStateRef.current.ops);
  const pendingOpsOwnerRef = useRef(pendingOpsStateRef.current.ownerId);
  const serverOwnerRef = useRef<string | null>(null);
  // In-flight guard — prevents concurrent sync runs triggered by overlapping events.
  const isSyncingRef = useRef(false);
  const authIdentityRef = useRef({ isSignedIn, userId });
  const authGenerationRef = useRef(0);
  const authTransitionRef = useRef<"signed-in" | "signed-out" | null>(null);
  const localOnlyAfterSignOutRef = useRef(loadLocalOnlyAfterSignOut());

  // A cross-tab logout changes the AuthProvider identity before its network
  // refresh finishes. Advance the generation during render so any in-flight
  // sync/mutation callbacks can see the new identity immediately.
  if (
    authIdentityRef.current.isSignedIn !== isSignedIn ||
    authIdentityRef.current.userId !== userId
  ) {
    const previous = authIdentityRef.current;
    authIdentityRef.current = { isSignedIn, userId };
    authGenerationRef.current += 1;
    authTransitionRef.current =
      previous.isSignedIn && !isSignedIn
        ? "signed-out"
        : isSignedIn
          ? "signed-in"
          : null;
  }

  useEffect(() => {
    const transition = authTransitionRef.current;
    if (transition === "signed-out") {
      // Keep the visible data local-first, but detach it from the old account.
      // Do not replay the old account's queue through a newly anonymous
      // session after the server session has been destroyed in another tab.
      localOnlyAfterSignOutRef.current = true;
      saveLocalOnlyAfterSignOut(true);
      serverOwnerRef.current = null;
      pendingOpsRef.current = [];
      pendingOpsOwnerRef.current = null;
      savePendingOps([], null);
      setServerOwnerId(null);
      setEvents([]);
      setPlans([]);
      setEventCompletions({});
      setSelectedPlanId(null);
      setRhythmAccessTier("basic");
      setNamedJourneysAccess(false);
      setIsSubscribed(false);
      setLastSyncLabel("Using this device only");
    } else if (transition === "signed-in") {
      localOnlyAfterSignOutRef.current = false;
      saveLocalOnlyAfterSignOut(false);
    }
    authTransitionRef.current = null;
  }, [isSignedIn, userId]);
  const [customMinutes, setCustomMinutes] = useState("");
  const planSessionStartedRef = useRef(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    preset: "custom",
    journeyKey: "custom",
    selectedBooks: [],
    startDate: todayISO(),
    endDate: todayISO(),
    color: "from-[#D4A017] via-[#C8921D] to-[#8A6414]",
    readingMode: "consecutive",
    readingTime: "07:00",
    autoSchedule: true,
    ...applyReadingDefaultsToPlanForm(DEFAULT_READING_DEFAULTS),
  });
  const [planCreationStep, setPlanCreationStep] = useState(1);
  const [isPlanTuneOpen, setIsPlanTuneOpen] = useState(false);
  const [planCreatedFeedback, setPlanCreatedFeedback] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    type: "prayer",
    date: todayISO(),
    time: "06:30",
    notes: "",
    remind: true,
    reminderMinutes: 10,
    repeat: "none",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: "",
    countsTowardRhythm: true,
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventCreationStep, setEventCreationStep] = useState(1);
  const [eventTypeChosen, setEventTypeChosen] = useState(false);
  const [isEventMoreOptionsOpen, setIsEventMoreOptionsOpen] = useState(false);
  const [eventTitleError, setEventTitleError] = useState("");
  const [eventSavedFeedback, setEventSavedFeedback] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    startDate: todayISO(),
    endDate: todayISO(),
    readingMode: "consecutive",
    readingTime: "07:00",
    paceMode: "chapters",
    dailyMinutes: 20,
    targetChaptersPerDay: 2.5,
  });

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());

  useEffect(() => {
    if (!isAuthLoaded) return;
    const nextDefaults = loadReadingDefaults(isSignedIn ? userId : null);
    setReadingDefaults(nextDefaults);
    if (!planSessionStartedRef.current) {
      setForm((current) => ({
        ...current,
        ...applyReadingDefaultsToPlanForm(nextDefaults),
      }));
    }
  }, [isAuthLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load settings");
        const payload = await response.json();
        return normalizeReadingDefaults(payload?.settings);
      })
      .then((nextDefaults) => {
        const normalized = saveReadingDefaults(nextDefaults, userId);
        setReadingDefaults(normalized);
        if (!planSessionStartedRef.current) {
          setForm((current) => ({
            ...current,
            ...applyReadingDefaultsToPlanForm(normalized),
          }));
        }
      })
      .catch(() => {
        // Device defaults remain usable when the settings service is unavailable.
      });
  }, [isSignedIn, userId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  const planViewPlans = useMemo(
    () => plans.filter((plan) => !isStructuredClimbPlan(plan)),
    [plans],
  );
  const planViewSelectedPlan = useMemo(
    () =>
      planViewPlans.find((plan) => plan.id === selectedPlanId) ||
      planViewPlans[0] ||
      null,
    [planViewPlans, selectedPlanId],
  );

  const selectedRhythmPlanId = useMemo(() => {
    return resolveStructuredClimbPlanId(plans, selectedPlanId);
  }, [plans, selectedPlanId]);

  const mountainRhythm = useMemo(
    () =>
      calculateMountainRhythm({
        today: todayISO(),
        plans,
        accessTier: rhythmAccessTier,
        selectedPlanId: selectedRhythmPlanId,
      }),
    [plans, rhythmAccessTier, selectedRhythmPlanId],
  );

  const editingPlan = useMemo(
    () => plans.find((p) => p.id === editingPlanId) || null,
    [plans, editingPlanId]
  );

  const upcomingEvents = useMemo(() => sortEvents(events), [events]);
  const weekdayOptions = useMemo(
    () => [
      { label: "S", value: 0 },
      { label: "M", value: 1 },
      { label: "T", value: 2 },
      { label: "W", value: 3 },
      { label: "T", value: 4 },
      { label: "F", value: 5 },
      { label: "S", value: 6 },
    ],
    []
  );
  const monthDays = useMemo(() => getMonthGrid(calendarMonth), [calendarMonth]);
  const [verseOfTheDay, setVerseOfTheDay] = useState(() => getFallbackVerse());
  useEffect(() => {
    fetchVerseOfTheDay().then(setVerseOfTheDay);
  }, []);
  const ordinaryPlans = useMemo(() => plans.filter(isOrdinaryPlan), [plans]);

  const todaysPlans = useMemo(() => {
    const today = todayISO();
    return ordinaryPlans
      .map((plan) => ({
        plan,
        todayReading: getTodaysReading(plan, today),
      }))
      .filter((entry) => entry.todayReading && entry.todayReading.readings.length > 0);
  }, [ordinaryPlans]);

  const todayAssignedReadingSummary = useMemo(() => {
    const books = new Set<string>();
    let total = 0;
    let completed = 0;
    let totalMinutes = 0;

    todaysPlans.forEach(({ plan, todayReading }) => {
      const completedMap = getCompletedMap(plan);
      totalMinutes += getAssignmentMinutes(todayReading);
      todayReading.readings.forEach((reading: any) => {
        const units = Math.max(1, getReadingChapters(reading).length);
        total += units;
        if (completedMap[reading.key]) completed += units;
        books.add(getReadingBookName(reading));
      });
    });

    const bookList = Array.from(books);
    const visibleBooks = bookList.slice(0, 3);
    const extraBookCount = Math.max(0, bookList.length - visibleBooks.length);
    const booksLabel =
      visibleBooks.length === 0
        ? "No books scheduled today"
        : `${visibleBooks.join(" · ")}${extraBookCount > 0 ? ` +${extraBookCount} more` : ""}`;

    return {
      booksLabel,
      completed,
      total,
      totalMinutes,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      label: total === 0 ? "No ordinary reading scheduled today" : `${completed} of ${total} chapters complete`,
    };
  }, [todaysPlans]);

  const planStats = selectedPlan ? getPlanStats(selectedPlan) : null;
  const planViewStats = planViewSelectedPlan ? getPlanStats(planViewSelectedPlan) : null;
  const planPreview = useMemo(() => summarizePlanInput(form), [form]);
  const editPreview = useMemo(() => {
    if (!editingPlan) return null;
    const endDate = editForm.paceMode === "time"
      ? calculateAutoEndDate(
        editingPlan.selectedBooks,
        editForm.startDate,
        editForm.targetChaptersPerDay,
        "time",
        editForm.dailyMinutes,
        editingPlan.readingWpm || DEFAULT_READING_WPM,
      )
      : editForm.endDate;
    return summarizePlanInput({
      selectedBooks: editingPlan.selectedBooks,
      startDate: editForm.startDate,
      endDate,
      paceMode: editForm.paceMode,
      dailyMinutes: editForm.dailyMinutes,
      readingWpm: editingPlan.readingWpm || DEFAULT_READING_WPM,
    });
  }, [editingPlan, editForm]);

  const todayFocusItems = useMemo(() => {
    const today = todayISO();
    const manual = getEventInstancesForDate(events, today).map((event) => ({
      ...event,
      completionEligible: isCompletableEvent(event),
      rhythmCompleted: eventCompletions[`${event.sourceEventId || event.id}:${today}`] === true,
    }));
    return { manual };
  }, [events, eventCompletions]);

  const monthEventMap = useMemo(() => {
    const map = {};

    monthDays.forEach((day) => {
      const iso = toISODate(day);
      const eventInstances = getEventInstancesForDate(events, iso);
      if (eventInstances.length > 0) {
        map[iso] = eventInstances;
      }
    });

    plans.forEach((plan) => {
      const completedMap = getCompletedMap(plan);
      plan.assignments.forEach((day) => {
        if (!day.readings || day.readings.length === 0) return;
        if (!map[day.date]) map[day.date] = [];
        map[day.date].push({
          id: `plan-${plan.id}-${day.date}`,
          title: plan.name,
          type: "bible",
          date: day.date,
          time: plan.readingTime || "07:00",
          notes: `${day.readings.length} chapters`,
          isPlan: true,
          isMountainRhythm: isStructuredClimbPlan(plan),
          planId: plan.id,
           readingCount: day.readings.length,
           completedCount: day.readings.filter((reading) => !!completedMap[reading.key]).length,
        });
      });
    });

    return map;
  }, [events, monthDays, plans]);

  const dayViewItems = useMemo(() => {
    const manualItems = getEventInstancesForDate(events, selectedCalendarDate).map((event) => ({
      ...event,
      kind: "event",
    }));

    const readingItems = plans.flatMap((plan) => {
      const completedMap = getCompletedMap(plan);
      const assignment = plan.assignments.find((day) => day.date === selectedCalendarDate);
      if (!assignment || assignment.readings.length === 0) return [];

      return [
        {
          id: `dayview-${plan.id}-${selectedCalendarDate}`,
          kind: "plan",
          type: "bible",
          title: plan.name,
          planId: plan.id,
          date: selectedCalendarDate,
          time: plan.readingTime || "07:00",
          notes: `${assignment.readings.length} chapters assigned`,
          readings: assignment.readings,
          completedCount: assignment.readings.filter(
            (reading) => !!completedMap[reading.key]
          ).length,
        },
      ];
    });

    return [...manualItems, ...readingItems].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
  }, [events, plans, selectedCalendarDate]);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        // Restore subscribed state across page reloads: if the browser already
        // holds a PushSubscription the server also has it (it was registered
        // together). Show "Notifications enabled" without requiring the user to
        // press the button again.
        try {
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) return;

          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            if (!isPushSubscriptionCompatible(existing, applicationServerKey)) {
              // This subscription cannot be used with the current VAPID key.
              // It is safe to retire locally; the server still protects its
              // endpoint ownership and will only delete an old row owned by
              // this account during the next explicit registration.
              await existing.unsubscribe();
              setIsSubscribed(false);
              setNotificationEnablementState("idle");
              setNotificationFeedback(
                "Your old reminder connection was refreshed. Enable reminders to finish setup.",
              );
              return;
            }

            const response = await fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                buildPushRegistrationPayload(existing, undefined, getPushDeviceId()),
              ),
            });
            setIsSubscribed(response.ok);
            if (response.ok) {
              setNotificationEnablementState("success");
              showTemporaryNotificationFeedback("Reminders are enabled on this device.");
            } else if (response.status === 403) {
              setNotificationEnablementState("error");
              setNotificationFeedback(
                "This browser's reminder subscription is linked to another account.",
              );
            }
          }
        } catch {
          // PushManager unavailable (plain HTTP, very old browser) — leave false
        }
      })
      .catch((error) => {
        console.error("SW registration failed:", error);
      });
  }, []);

  useEffect(() => {
    if (notificationPermission !== "granted") return undefined;

    const showForegroundReminder = (reminder: {
      title: string;
      body: string;
      tag: string;
    }) => {
      if (sentNotificationsRef.current.has(reminder.tag)) return;

      new Notification(reminder.title, {
        body: reminder.body,
        tag: reminder.tag,
      });
      sentNotificationsRef.current.add(reminder.tag);
    };

    const receivePushInVisibleTab = (event: MessageEvent) => {
      if (event.data?.type !== "discipleos-push-received") return;
      if (document.visibilityState !== "visible") return;

      const reminder = event.data.reminder;
      if (!reminder?.title || !reminder?.tag) return;

      showForegroundReminder({
        title: reminder.title,
        body: reminder.body || "You have an upcoming reminder.",
        tag: reminder.tag,
      });
    };

    navigator.serviceWorker?.addEventListener("message", receivePushInVisibleTab);

    const checkReminders = () => {
      // Web Push owns background delivery. A visible tab provides the immediate
      // foreground fallback, which also makes reminders work in development.
      if (document.visibilityState !== "visible") return;

      const now = new Date();
      const today = todayISO();

      events.forEach((event) => {
        if (!event.remind || !event.time) return;
        if (!eventOccursOnDate(event, today)) return;

        const [hours, minutes] = event.time.split(":").map(Number);
        const eventDate = new Date();
        eventDate.setHours(hours || 0, minutes || 0, 0, 0);

        const reminderTime = new Date(
          eventDate.getTime() - Number(event.reminderMinutes || 0) * 60_000,
        );
        const tag = `discipleos-${event.id}-${today}`;

        if (
          now >= reminderTime &&
          now < new Date(reminderTime.getTime() + 60_000)
        ) {
          showForegroundReminder({
            title: event.title || "DiscipleOS Reminder",
            body: event.notes || `${event.type || "Event"} starts at ${formatTime(event.time)}`,
            tag,
          });
        }
      });
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, 30_000);

    return () => {
      window.clearInterval(interval);
      navigator.serviceWorker?.removeEventListener("message", receivePushInVisibleTab);
    };
  }, [events, notificationPermission]);

  useEffect(() => {
    if (editingEventId) return;

    setEventForm((prev) => ({
      ...prev,
      date: selectedCalendarDate,
    }));
  }, [selectedCalendarDate, editingEventId]);

  const selectJourney = (journeyKey: string) => {
    if (journeyKey === "40-day-climb") {
      setLastSyncLabel("40-Day Climb is coming later");
      return;
    }
    if (journeyKey !== "custom" && !namedJourneysAccess) {
      setLastSyncLabel("Named journeys are not available for this account");
      return;
    }

    const journey = getReadingJourney(journeyKey);
    if (!journey) {
      setForm((prev) => ({
        ...prev,
        journeyKey: "custom",
        name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
        autoSchedule: true,
        paceMode: "time",
        endDate: calculateAutoEndDate(
          prev.selectedBooks,
          prev.startDate,
          prev.targetChaptersPerDay,
          "time",
          prev.dailyMinutes,
          prev.readingWpm,
        ),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      journeyKey: journey.key,
      name: journey.name,
      preset: "custom",
      selectedBooks: prev.selectedBooks.length > 0 ? prev.selectedBooks : [...journey.defaultBooks],
      startDate: prev.startDate,
      endDate: getJourneyEndDate(prev.startDate, journey.durationDays),
      color: journey.color,
      autoSchedule: false,
      paceMode: "chapters",
      readingMode: "consecutive",
    }));
  };

  const togglePreset = (preset) => {
    setForm((prev) => {
      if (preset === "oldTestament" || preset === "newTestament") {
        const presetBooks = PRESETS[preset] || [];
        const presetBookSet = new Set(presetBooks);
        const allPresetBooksSelected = presetBooks.every((book) => prev.selectedBooks.includes(book));
        const nextSelectedBooks = allPresetBooksSelected
          ? prev.selectedBooks.filter((book) => !presetBookSet.has(book))
          : BIBLE_BOOKS
            .filter((book) => prev.selectedBooks.includes(book.name) || presetBookSet.has(book.name))
            .map((book) => book.name);

        return {
          ...prev,
          preset: "custom",
          journeyKey: "custom",
          name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
          selectedBooks: nextSelectedBooks,
          endDate: prev.autoSchedule
            ? calculateAutoEndDate(
              nextSelectedBooks,
              prev.startDate,
              prev.targetChaptersPerDay,
              prev.paceMode,
              prev.dailyMinutes,
              prev.readingWpm,
            )
            : prev.endDate,
        };
      }

      if (prev.preset === preset) {
        return {
          ...prev,
          preset: "custom",
          journeyKey: "custom",
          name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
          selectedBooks: [],
          endDate: prev.autoSchedule ? prev.startDate : prev.endDate,
        };
      }

      const presetBooks = PRESETS[preset] || [];
      return {
        ...prev,
        preset,
        journeyKey: "custom",
        name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
        selectedBooks: presetBooks,
        endDate: prev.autoSchedule
          ? calculateAutoEndDate(
            presetBooks,
            prev.startDate,
            prev.targetChaptersPerDay,
            prev.paceMode,
            prev.dailyMinutes,
            prev.readingWpm,
          )
          : prev.endDate,
      };
    });
  };

  const openCustomBookPicker = () => {
    setForm((prev) => {
      const alreadyCustom = prev.preset === "custom" && prev.journeyKey === "custom";
      return {
        ...prev,
        preset: "custom",
        journeyKey: "custom",
        name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
        selectedBooks: alreadyCustom ? prev.selectedBooks : [],
        endDate: alreadyCustom || !prev.autoSchedule ? prev.endDate : prev.startDate,
      };
    });
    setIsBookPickerOpen(true);
  };

  const toggleBook = (bookName) => {
    setForm((prev) => {
      const exists = prev.selectedBooks.includes(bookName);
      const nextSelectedBooks = exists
        ? prev.selectedBooks.filter((b) => b !== bookName)
        : [...prev.selectedBooks, bookName];

      return {
        ...prev,
        preset: "custom",
        journeyKey: "custom",
        name: getReadingJourney(prev.journeyKey) ? "" : prev.name,
        selectedBooks: nextSelectedBooks,
        endDate: prev.autoSchedule
          ? calculateAutoEndDate(
            nextSelectedBooks,
            prev.startDate,
            prev.targetChaptersPerDay,
            prev.paceMode,
            prev.dailyMinutes,
            prev.readingWpm,
          )
          : prev.endDate,
      };
    });
  };

  async function saveReadingPlanToServer(plan: any) {
    return savePlanToServer(plan);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydrated) return;

    localDataRef.current = {
      ownerId: serverOwnerId,
      events,
      plans,
      eventCompletions,
      selectedPlanId,
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ownerId: serverOwnerId,
        events,
        plans,
        eventCompletions,
        selectedPlanId,
      })
    );

  }, [events, plans, eventCompletions, hasHydrated, selectedPlanId, serverOwnerId]);

  useEffect(() => {
    setSelectedPlanId((current) => resolveSelectedPlanId(plans, current));
  }, [plans]);

  /**
   * Central sync function — used on mount, and on every reconnect event.
   *
   * Strategy (push-before-pull):
   * 1. Flush any pending ops that failed while offline, in insertion order.
   *    This ensures locally-created/edited data reaches the server before we
   *    pull the authoritative server state. All ops are idempotent on the API.
   * 2. Re-hydrate from the server using the defensive hydration rule:
   *    - Established session: server state is always authoritative (even empty).
   *    - Unestablished session + empty server: keep localStorage; do not wipe it.
   * 3. On any network failure the current UI and localStorage are untouched.
   */
  const syncWithServer = useCallback(async () => {
    if (isSyncingRef.current) return;
    const syncGeneration = authGenerationRef.current;
    const syncIsSignedIn = isSignedIn;
    const syncUserId = userId;
    const syncIsCurrent = () =>
      syncGeneration === authGenerationRef.current &&
      authIdentityRef.current.isSignedIn === syncIsSignedIn &&
      authIdentityRef.current.userId === syncUserId;

    // A tab that learned about a logout remains local-only until a new
    // explicit sign-in. This avoids creating an anonymous server session or
    // replaying account-bound work just because focus/visibility fired.
    if (!syncIsSignedIn && localOnlyAfterSignOutRef.current) return;

    isSyncingRef.current = true;
    try {
      // Establish and validate ownership before replaying any local writes.
      const sessionRes = await fetch("/api/session/info", { cache: "no-store" });
      if (!sessionRes.ok) {
        throw new Error("Failed to establish server session");
      }

      const sessionData = await sessionRes.json();
      if (!syncIsCurrent()) return;
      if (typeof sessionData.capabilities?.mountainRhythm === "string") {
        const tier = sessionData.capabilities.mountainRhythm;
        if (tier === "basic" || tier === "full") setRhythmAccessTier(tier);
      }
      if (typeof sessionData.capabilities?.namedJourneys === "boolean") {
        setNamedJourneysAccess(sessionData.capabilities.namedJourneys);
      }
      const currentOwnerId =
        typeof sessionData.userId === "string" ? sessionData.userId : null;
      if (!currentOwnerId) {
        throw new Error("Server session did not provide an owner");
      }
      if (
        syncIsSignedIn &&
        (sessionData.authenticated !== true || currentOwnerId !== syncUserId)
      ) {
        await refreshAuth();
        return;
      }
      if (!syncIsCurrent()) return;

      // A sign-in is the explicit ownership proof for migrating records from
      // this browser's anonymous session. Keep local state intact if the
      // claim fails so the next reconnect can retry it safely.
      if (isSignedIn && userId) {
        const claimRes = await fetch("/api/account/claim", {
          method: "POST",
          cache: "no-store",
        });
        if (!claimRes.ok) {
          const text = await claimRes.text().catch(() => "");
          throw new Error(text || "Could not claim account data");
        }
      }
      if (!syncIsCurrent()) return;

      const reconciled = reconcileSessionBoundary(
        {
          ownerId: localDataRef.current.ownerId,
          events: localDataRef.current.events,
          plans: localDataRef.current.plans,
          pendingOps: pendingOpsRef.current,
          pendingOpsOwnerId: pendingOpsOwnerRef.current,
        },
        currentOwnerId,
      );

      serverOwnerRef.current = currentOwnerId;
      setServerOwnerId(currentOwnerId);
      localDataRef.current.ownerId = currentOwnerId;

      if (reconciled.localDataWasCleared) {
        localDataRef.current.events = [];
        localDataRef.current.plans = [];
        localDataRef.current.eventCompletions = {};
        setEvents([]);
        setPlans([]);
        setEventCompletions({});
        setSelectedPlanId(null);
      }

      pendingOpsRef.current = reconciled.pendingOps;
      pendingOpsOwnerRef.current = currentOwnerId;
      savePendingOps(reconciled.pendingOps, currentOwnerId);

      // Step 1: flush offline writes to the server before pulling
      if (pendingOpsRef.current.length > 0) {
        const hadPendingReset = pendingOpsRef.current.some(
          (op) => op.type === "upsert-plan" && isResetPlan(op.payload)
        );
        const remaining = await flushPendingOps(
          pendingOpsRef.current,
          syncIsCurrent,
        );
        if (!syncIsCurrent()) return;
        pendingOpsRef.current = remaining;
        savePendingOps(remaining, currentOwnerId);
        const resetStillPending = remaining.some(
          (op) => op.type === "upsert-plan" && isResetPlan(op.payload)
        );
        if (hadPendingReset && !resetStillPending) {
          setPresetSaveState("saved");
          setLastSyncLabel("20-Day Reset saved");
        }
        // If any ops still could not be delivered, skip the server pull entirely.
        // The local UI and localStorage already reflect the user's intent; applying
        // a server response that does not contain those changes would overwrite
        // local state with stale data. The failed ops will be retried on the next
        // reconnect trigger (online / focus / visibilitychange).
        if (remaining.length > 0) return;
      }

      // Step 2: re-hydrate with the defensive hydration rule (only reached when
      // the queue is empty — i.e. server has received every local change)
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const [eventsRes, plansRes, rhythmRes] = await Promise.all([
        fetch("/api/events", { cache: "no-store" }),
        fetch("/api/reading/plans", { cache: "no-store" }),
        fetch(
          `/api/rhythm/score?timeZone=${encodeURIComponent(timeZone)}${
            localDataRef.current.selectedPlanId
              ? `&planId=${encodeURIComponent(localDataRef.current.selectedPlanId)}`
              : ""
          }`,
          { cache: "no-store" },
        ),
      ]);
      if (!syncIsCurrent()) return;

      const sessionEstablished = sessionData.established === true;

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (eventsData.success && Array.isArray(eventsData.events)) {
          const serverEvents = eventsData.events;
          if (sessionEstablished || serverEvents.length > 0) {
            setEvents(normalizeStoredEvents(serverEvents));
          }
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (plansData.success && Array.isArray(plansData.plans)) {
          const serverPlans = plansData.plans;
          if (sessionEstablished || serverPlans.length > 0) {
            const localPlansById = new Map(
              localDataRef.current.plans.map((plan) => [plan.id, plan]),
            );
            const oversizedServerPlanIds = new Set(
              serverPlans
                .filter((plan) =>
                  isOversizedReadingJourneyPlan(plan, BIBLE_BOOKS, estimateChapterMinutes),
                )
                .map((plan) => plan.id),
            );
            const normalizedPlans = serverPlans.map((serverPlan) =>
              mergeLocalCompletionHistory(
                normalizeStoredPlan(serverPlan),
                localPlansById.get(serverPlan.id),
              ),
            );
            setPlans(normalizedPlans);
            if (oversizedServerPlanIds.size > 0) {
             void Promise.all(
                normalizedPlans
                  .filter((plan) => oversizedServerPlanIds.has(plan.id))
                  .map((plan) =>
                    localOnlyAfterSignOutRef.current || !syncIsCurrent()
                      ? Promise.resolve()
                      : savePlanToServer(plan),
                  ),
              ).catch(() => {
                console.warn("Could not persist repaired reading journey");
              });
            }
            setSelectedPlanId((current) =>
              resolveSelectedPlanId(normalizedPlans, current),
            );
          }
        }
      }

      if (rhythmRes.ok) {
        const rhythmData = await rhythmRes.json();
        if (rhythmData.success) {
          if (rhythmData.accessTier === "basic" || rhythmData.accessTier === "full") {
            setRhythmAccessTier(rhythmData.accessTier);
          }
          const serverCompletions = {};
          const persistedCompletions = Array.isArray(rhythmData.eventCompletions)
            ? rhythmData.eventCompletions
            : rhythmData.commitments || [];
          persistedCompletions.forEach((completion) => {
            if (completion.eventId && completion.occurrenceDate) {
              serverCompletions[`${completion.eventId}:${completion.occurrenceDate}`] = Boolean(completion.completed);
            }
          });
          if (Object.keys(serverCompletions).length > 0) {
            setEventCompletions((current) => ({ ...current, ...serverCompletions }));
          }
        }
      }
    } catch (err) {
      // Network unavailable — current UI and localStorage are retained
      console.warn("Server sync failed, retaining local data", err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [isSignedIn, refreshAuth, userId]); // refs and state setters are stable; auth identity selects claim behavior

  // On first sign-in, claim only the data tied to this browser's anonymous
  // session before reconciling against the signed-in account.
  useEffect(() => {
    async function loadData() {
      if (typeof window === "undefined" || !isAuthLoaded) return;
      setHasInitialSyncCompleted(false);
      const localData = loadLocalDiscipleData();
      localDataRef.current = localData;
      const hideLocalDataAfterSignOut =
        !isSignedIn && loadLocalOnlyAfterSignOut();
      const visibleLocalData = hideLocalDataAfterSignOut
        ? { ...localData, events: [], plans: [], eventCompletions: {}, selectedPlanId: null }
        : localData;
      setEvents(visibleLocalData.events);
      setPlans(visibleLocalData.plans);
      setEventCompletions(visibleLocalData.eventCompletions || {});
      setSelectedPlanId(
        resolveSelectedPlanId(visibleLocalData.plans, visibleLocalData.selectedPlanId),
      );
      hasLoadedLocalDataRef.current = true;
      didHydrateRef.current = true;
      setHasHydrated(true);
      try {
        await syncWithServer();
      } finally {
        setHasInitialSyncCompleted(true);
      }
    }
    loadData();
  }, [isAuthLoaded, isSignedIn, userId, syncWithServer]);

  // Reconnect triggers: online event, tab focus, visibility change.
  // Debounced so focus + visibilitychange firing together produce one sync.
  useEffect(() => {
    const DEBOUNCE_MS = 400;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncWithServer, DEBOUNCE_MS);
    };

    const handleOnline = () => debouncedSync();
    const handleFocus = () => debouncedSync();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") debouncedSync();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncWithServer]); // syncWithServer is stable, so this runs once

  const queuePendingOp = (op: PendingOp) => {
    if (localOnlyAfterSignOutRef.current) return;
    const ownerId = serverOwnerRef.current ?? localDataRef.current.ownerId;
    pendingOpsRef.current = addPendingOp(pendingOpsRef.current, op, ownerId);
    pendingOpsOwnerRef.current = ownerId;
  };

  const createPlan = ({ onboarding = false } = {}) => {
    const suggestedName = getSuggestedPlanName(form);
    if (form.selectedBooks.length === 0) return;
    const journey = getReadingJourney(form.journeyKey);
    if (journey && !namedJourneysAccess) {
      setLastSyncLabel("Named journeys are not available for this account");
      return;
    }

    const plan = createPlanObject({
      name:
        form.name.trim() ||
        (onboarding
          ? form.selectedBooks.length === PRESETS.newTestament.length &&
            PRESETS.newTestament.every((book) => form.selectedBooks.includes(book))
            ? "New Testament"
            : form.selectedBooks.length === PRESETS.gospels.length &&
                PRESETS.gospels.every((book) => form.selectedBooks.includes(book))
              ? "Gospels"
              : "My Bible Reading Plan"
          : suggestedName),
      selectedBooks: form.selectedBooks,
      startDate: form.startDate,
      endDate: form.endDate,
      color: form.color,
      readingMode: form.readingMode,
      readingTime: form.readingTime,
      paceMode: form.paceMode,
      readingPaceMode: form.readingPaceMode,
      readingCustomMinutesPerChapter: form.readingCustomMinutesPerChapter,
      dailyMinutes: form.dailyMinutes,
      readingWpm: form.readingWpm,
      journeyKey: journey?.key || null,
    });


    setPlans((prev) => [plan, ...prev]);
    if (!localOnlyAfterSignOutRef.current) {
      savePlanToServer(plan).catch((error: any) => {
        if (error?.status === 403 && journey) {
          setPlans((prev) => prev.filter((item) => item.id !== plan.id));
          setSelectedPlanId(null);
          setLastSyncLabel("Named journeys are not available for this account");
          return;
        }
        queuePendingOp({ type: "upsert-plan", payload: plan, ts: Date.now() });
      });
    }
    setSelectedPlanId(plan.id);
    setActiveTab(onboarding ? "today" : "plans");
    if (!onboarding) {
      setPlanCreatedFeedback({ id: plan.id, name: plan.name });
    }
    setForm((prev) => ({ ...prev, name: "" }));
  };

  const beginCreatePlan = () => {
    planSessionStartedRef.current = true;
    const scheduleDefaults = applyReadingDefaultsToPlanForm(readingDefaults);
    setForm((prev) => ({
      ...prev,
      name: "",
      preset: "custom",
      journeyKey: "custom",
      selectedBooks: [],
      startDate: todayISO(),
      endDate: todayISO(),
      autoSchedule: true,
      ...scheduleDefaults,
      paceMode: "time",
    }));
    setCustomMinutes("");
    setPlanCreationStep(1);
    setIsPlanTuneOpen(false);
    setPlanCreatedFeedback(null);
    setIsNavigationOpen(false);
    setActiveTab("build");
  };

  const beginEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setSelectedPlanId(plan.id);
    setActiveTab("plans");
    const paceMode = plan.paceMode || "chapters";
    const totalChapters = expandChapters(plan.selectedBooks, plan.readingWpm || DEFAULT_READING_WPM).length;
    const totalDays = Math.max(1, diffDaysInclusive(plan.startDate, plan.endDate));
    const derivedChaptersPerDay = totalChapters > 0 ? parseFloat((totalChapters / totalDays).toFixed(1)) : 2.5;
    setEditForm({
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      readingMode: plan.readingMode || "consecutive",
      readingTime: plan.readingTime || "07:00",
      paceMode,
      dailyMinutes: plan.dailyMinutes || 20,
      readingWpm: plan.readingWpm || DEFAULT_READING_WPM,
      targetChaptersPerDay: derivedChaptersPerDay,
    });
  };

  const savePlanEdit = () => {
    if (!editingPlan) return;

    const isTimeBased = editForm.paceMode === "time";
    const assignments = isTimeBased
      ? buildTimeBasedSchedule(
        editingPlan.selectedBooks,
        editForm.startDate,
        editForm.dailyMinutes,
        editForm.readingMode,
        editingPlan.readingWpm || DEFAULT_READING_WPM,
      )
      : buildSchedule(
        editingPlan.selectedBooks,
        editForm.startDate,
        editForm.endDate,
        editForm.readingMode,
        editingPlan.readingWpm || DEFAULT_READING_WPM,
      );
    const actualEndDate = isTimeBased && assignments.length > 0
      ? assignments[assignments.length - 1].date
      : editForm.endDate;

    const updatedPlan = {
      ...editingPlan,
      name: editForm.name.trim() || editingPlan.name,
      startDate: editForm.startDate,
      endDate: actualEndDate,
      readingMode: editForm.readingMode,
      readingTime: editForm.readingTime,
      paceMode: editForm.paceMode,
      dailyMinutes: editForm.dailyMinutes,
      readingWpm: editingPlan.readingWpm || DEFAULT_READING_WPM,
      assignments,
    };

    setPlans((prev) => prev.map((plan) => plan.id !== editingPlan.id ? plan : updatedPlan));
    if (!localOnlyAfterSignOutRef.current) {
      savePlanToServer(updatedPlan).catch(() => {
        queuePendingOp({ type: "upsert-plan", payload: updatedPlan, ts: Date.now() });
      });
    }
    setEditingPlanId(null);
  };

  const cancelPlanEdit = () => {
    setEditingPlanId(null);
  };

  const toggleChapterComplete = (planId, key) => {
    let newValue = false;
    let earnedDay;
    let completionDate;
    setPlans((prevPlans) =>
      prevPlans.map((plan) => {
        if (plan.id !== planId) return plan;
        const completedMap = getCompletedMap(plan);
        newValue = !completedMap[key];
        const nextCompleted = { ...completedMap, [key]: newValue };
        const assignment = plan.assignments.find((day) =>
          day.readings.some((reading) => reading.key === key),
        );
        const wasDayComplete =
          assignment?.readings.length > 0 &&
          assignment.readings.every((reading) => Boolean(completedMap[reading.key]));
        if (
          assignment?.date &&
          (wasDayComplete ||
            (newValue &&
              assignment.readings.every((reading) => Boolean(nextCompleted[reading.key]))))
        ) {
          earnedDay = assignment.date;
          if (newValue) completionDate = todayISO();
        }
        const earnedDayKeys = getEarnedDayKeys(plan);
        if (earnedDay) earnedDayKeys.add(earnedDay);
        const dayCompletionDates = { ...(plan.dayCompletionDates || {}) };
        if (earnedDay && completionDate && !dayCompletionDates[earnedDay]) {
          dayCompletionDates[earnedDay] = completionDate;
        }
        return {
          ...plan,
          completed: nextCompleted,
          earnedDayKeys: [...earnedDayKeys],
          dayCompletionDates,
        };
      })
    );
    if (!localOnlyAfterSignOutRef.current) {
      fetch("/api/reading/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, key, completed: newValue, earnedDay, completionDate }),
      }).then((response) => {
        if (!response.ok) throw new Error("Failed to save reading progress");
      }).catch(() => {
        queuePendingOp({
          type: "chapter-complete",
          planId,
          key,
          completed: newValue,
          earnedDay,
          completionDate,
          ts: Date.now(),
        });
      });
    }
  };

  const markDayPlanComplete = (planId, dateISO) => {
    const currentPlan = plans.find((plan) => plan.id === planId);
    const currentAssignment = currentPlan?.assignments?.find((day) => day.date === dateISO);
    if (!currentPlan || !currentAssignment?.readings?.length) return;
    const currentCompleted = getCompletedMap(currentPlan);
    const allDone = currentAssignment.readings.every((reading) => !!currentCompleted[reading.key]);
    if (allDone) return;
    const newValue = true;
    const completionDate = todayISO();
    setPlans((prevPlans) =>
      prevPlans.map((plan) => {
        if (plan.id !== planId) return plan;

        const assignment = plan.assignments.find((day) => day.date === dateISO);
        if (!assignment || assignment.readings.length === 0) return plan;

        const completedMap = getCompletedMap(plan);
        const dayKeys = assignment.readings.map((r) => r.key);

        const nextCompleted = { ...completedMap };
        dayKeys.forEach((key) => {
          nextCompleted[key] = newValue;
        });
        const earnedDayKeys = getEarnedDayKeys(plan);
        const dayCompletionDates = { ...(plan.dayCompletionDates || {}) };
        if (newValue) earnedDayKeys.add(dateISO);
        if (newValue && !dayCompletionDates[dateISO]) {
          dayCompletionDates[dateISO] = completionDate;
        }

        return {
          ...plan,
          completed: nextCompleted,
          earnedDayKeys: [...earnedDayKeys],
          dayCompletionDates,
        };
      })
    );
    if (!localOnlyAfterSignOutRef.current) {
      fetch("/api/reading/day-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, date: dateISO, completed: newValue, completionDate }),
      }).then((response) => {
        if (!response.ok) throw new Error("Failed to save day progress");
      }).catch(() => {
        queuePendingOp({
          type: "day-complete",
          planId,
          date: dateISO,
          completed: newValue,
          completionDate,
          ts: Date.now(),
        });
      });
    }
  };

  const toggleEventComplete = (event) => {
    const eventId = event.sourceEventId || event.id;
    const occurrenceDate = event.date;
    if (!eventId || !occurrenceDate || !isCompletableEvent(event)) return;

    const key = `${eventId}:${occurrenceDate}`;
    const nextValue = !eventCompletions[key];
    setEventCompletions((current) => ({ ...current, [key]: nextValue }));

    if (!localOnlyAfterSignOutRef.current) {
      fetch("/api/events/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, occurrenceDate, completed: nextValue }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to save event completion");
        })
        .catch(() => {
          queuePendingOp({
            type: "event-complete",
            eventId,
            occurrenceDate,
            completed: nextValue,
            ts: Date.now(),
          });
        });
    }
  };

  const showEventDate = (date: string) => {
    if (!date) return;
    setSelectedCalendarDate(date);
    const parsed = new Date(`${date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  };

  const resetEventForm = (nextDate = selectedCalendarDate) => {
    setEventForm({
      title: "",
      type: "prayer",
      date: nextDate,
      time: "06:30",
      notes: "",
      remind: true,
      reminderMinutes: 10,
      repeat: "none",
      repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
      repeatUntil: "",
      countsTowardRhythm: true,
    });
    setEditingEventId(null);
    setEventCreationStep(1);
    setEventTypeChosen(false);
    setIsEventMoreOptionsOpen(false);
    setEventTitleError("");
  };

  const beginEditEvent = (event) => {
    const sourceEvent = events.find((item) => item.id === (event.sourceEventId || event.id)) || event;
    setEditingEventId(sourceEvent.id);
    setIsEventFormOpen(true);
    setEventCreationStep(3);
    setActiveTab("calendar");
    setSelectedCalendarDate(event.date || sourceEvent.date);
    setEventSavedFeedback(null);
    setEventTitleError("");
    setIsEventMoreOptionsOpen(
      Boolean(sourceEvent.repeat && sourceEvent.repeat !== "none") ||
      Boolean(sourceEvent.repeatUntil) ||
      Boolean(sourceEvent.notes) ||
      !Boolean(sourceEvent.remind) ||
      Number(sourceEvent.reminderMinutes || 10) !== 10 ||
      sourceEvent.type === "event",
    );
    setEventForm({
      title: sourceEvent.title,
      type: sourceEvent.type,
      date: sourceEvent.date,
      time: sourceEvent.time,
      notes: sourceEvent.notes || "",
      remind: Boolean(sourceEvent.remind),
      reminderMinutes: Number(sourceEvent.reminderMinutes || 10),
      repeat: sourceEvent.repeat || "none",
      repeatWeekdays: normalizeWeekdays(sourceEvent.repeatWeekdays?.length ? sourceEvent.repeatWeekdays : [0, 1, 2, 3, 4, 5, 6]),
      repeatUntil: sourceEvent.repeatUntil || "",
      countsTowardRhythm:
        typeof sourceEvent.countsTowardRhythm === "boolean"
          ? sourceEvent.countsTowardRhythm
          : defaultRhythmOptIn(sourceEvent.type),
    });
  };

  const createEvent = () => {
    if (!eventForm.title.trim()) {
      setEventTitleError("Add a title before saving this activity.");
      return;
    }
    setEventTitleError("");

    const normalizedEvent = {
      title: eventForm.title.trim(),
      type: eventForm.type,
      date: eventForm.date,
      time: eventForm.time,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: eventForm.notes.trim(),
      remind: eventForm.remind,
      reminderMinutes: Number(eventForm.reminderMinutes || 0),
      repeat: eventForm.repeat,
      repeatWeekdays:
        eventForm.repeat === "weekly"
          ? normalizeWeekdays(eventForm.repeatWeekdays)
          : eventForm.repeat === "daily"
            ? [0, 1, 2, 3, 4, 5, 6]
            : [],
      repeatUntil: eventForm.repeatUntil || "",
      countsTowardRhythm:
        defaultRhythmOptIn(eventForm.type) || eventForm.countsTowardRhythm,
    };

    if (editingEventId) {
      const originalEvent = events.find((event) => event.id === editingEventId);
      const replacementEventId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const updatedEvent = {
        id: replacementEventId,
        ...normalizedEvent,
      };
      const replacementPayload = {
        ...updatedEvent,
        replacesEventId: editingEventId,
      };

      setEvents((prev) => upsertEvent(removeEventById(prev, editingEventId), updatedEvent));
      if (!localOnlyAfterSignOutRef.current) {
        saveEventToServer(replacementPayload).catch((error: any) => {
          if (error?.status >= 400 && error.status < 500) {
            setEvents((prev) =>
              originalEvent
                ? upsertEvent(removeEventById(prev, updatedEvent.id), originalEvent)
                : removeEventById(prev, updatedEvent.id),
            );
            setEventSavedFeedback(null);
            setLastSyncLabel("Event was not saved — please try again");
            return;
          }
          queuePendingOp({ type: "upsert-event", payload: replacementPayload, ts: Date.now() });
        });
      }
      showEventDate(updatedEvent.date);
      setEventSavedFeedback({
        id: updatedEvent.id,
        title: updatedEvent.title,
        type: updatedEvent.type,
        date: updatedEvent.date,
        mode: "updated",
      });
      resetEventForm(updatedEvent.date);
      return;
    }

    const eventId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const newEvent = {
      id: eventId,
      ...normalizedEvent,
    };

    setEvents((prev) => upsertEvent(prev, newEvent));
    if (!localOnlyAfterSignOutRef.current) {
      saveEventToServer(newEvent).catch((error: any) => {
        if (error?.status >= 400 && error.status < 500) {
          setEvents((prev) => removeEventById(prev, newEvent.id));
          setEventSavedFeedback(null);
          setLastSyncLabel("Event was not saved — please try again");
          return;
        }
        queuePendingOp({ type: "upsert-event", payload: newEvent, ts: Date.now() });
      });
    }
    showEventDate(newEvent.date);
    setEventSavedFeedback({
      id: newEvent.id,
      title: newEvent.title,
      type: newEvent.type,
      date: newEvent.date,
      mode: "added",
    });
    resetEventForm(newEvent.date);
    setIsEventFormOpen(false);
  };

  const chooseEventType = (type: string) => {
    setEventForm((prev) => {
      const previousSuggestion =
        activityTypeChoices.find((choice) => choice.value === prev.type)?.suggestedTitle || "";
      const shouldSuggestTitle = !prev.title.trim() || prev.title.trim() === previousSuggestion;
      const nextChoice = activityTypeChoices.find((choice) => choice.value === type);
      return {
        ...prev,
        type,
        title: shouldSuggestTitle ? nextChoice?.suggestedTitle || "" : prev.title,
        countsTowardRhythm: defaultRhythmOptIn(type),
      };
    });
    setEventTypeChosen(true);
    setEventTitleError("");
  };

  const chooseEventDate = (date: string) => {
    setEventForm((prev) => ({ ...prev, date }));
    showEventDate(date);
  };

  const renderEventRecurrenceControls = () => (
    <div data-testid="calendar-repeat-controls" className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
            Repeat pattern
          </div>
          <select
            aria-label="Repeat pattern"
            value={eventForm.repeat}
            onChange={(e) => setEventForm((prev) => ({ ...prev, repeat: e.target.value }))}
            className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>
          <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
            Ends on <span className="font-normal normal-case tracking-normal text-white/45">optional</span>
          </div>
          <input
            aria-label="Ends on"
            type="date"
            value={eventForm.repeatUntil}
            onChange={(e) => setEventForm((prev) => ({ ...prev, repeatUntil: e.target.value }))}
            className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
          />
        </label>
      </div>

      {eventForm.repeat === "weekly" ? (
        <div>
          <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
            Repeat on
          </div>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((day) => {
              const active = eventForm.repeatWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setEventForm((prev) => {
                      const exists = prev.repeatWeekdays.includes(day.value);
                      const nextDays = exists
                        ? prev.repeatWeekdays.filter((value) => value !== day.value)
                        : [...prev.repeatWeekdays, day.value];
                      return {
                        ...prev,
                        repeatWeekdays: normalizeWeekdays(nextDays.length ? nextDays : [day.value]),
                      };
                    })
                  }
                  className={cn(
                    "h-10 w-10 rounded-full border text-sm transition",
                    active
                      ? "border-[#D4A017]/40 bg-[#D4A017]/15 text-[#F4D77A]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderEventOptionalDetails = () => (
    <div data-testid="calendar-optional-details" className="grid gap-4 border border-white/10 bg-white/[0.03] p-4">
      <div>
        <div className="text-sm font-medium text-white">Optional details</div>
        <div className="discipleos-secondary-copy mt-1 text-xs">
          Add a reminder, notes, or Spiritual Rhythm participation if helpful.
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">Reminder</div>
            <div className="discipleos-secondary-copy text-xs">
              Send a notification before this activity starts.
            </div>
          </div>
          <button
            type="button"
            aria-pressed={eventForm.remind}
            onClick={() => setEventForm((prev) => ({ ...prev, remind: !prev.remind }))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              eventForm.remind
                ? "border-[#D4A017]/40 bg-[#D4A017]/15 text-[#F4D77A]"
                : "border-white/10 bg-white/5 text-white/70",
            )}
          >
            {eventForm.remind ? "Reminder on" : "Reminder off"}
          </button>
        </div>
        {eventForm.remind ? (
          <select
            aria-label="Reminder lead time"
            value={eventForm.reminderMinutes}
            onChange={(e) => setEventForm((prev) => ({ ...prev, reminderMinutes: Number(e.target.value) }))}
            className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
          >
            <option value={5}>5 minutes before</option>
            <option value={10}>10 minutes before</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
          </select>
        ) : null}
      </div>

      <label>
        <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
          Notes <span className="font-normal normal-case tracking-normal text-white/45">optional</span>
        </div>
        <textarea
          aria-label="Notes"
          value={eventForm.notes}
          onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Add context, location, or prayer focus"
          className="min-h-[96px] w-full rounded-md border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>

      {eventForm.type === "event" ? (
        <label className="flex items-start gap-3 border-t border-white/10 pt-4">
          <input
            type="checkbox"
            aria-label="Count toward my spiritual rhythm"
            checked={Boolean(eventForm.countsTowardRhythm)}
            onChange={(e) =>
              setEventForm((prev) => ({
                ...prev,
                countsTowardRhythm: e.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 accent-[#D4A017]"
          />
          <span>
            <span className="block text-sm font-medium text-white">
              Count toward my Spiritual Rhythm
            </span>
            <span className="discipleos-secondary-copy mt-1 block text-xs leading-5">
              Optional for events; Prayer, Fast, and Church activities count automatically.
            </span>
          </span>
        </label>
      ) : (
        <div className="border-t border-white/10 pt-4">
          <div className="text-sm font-medium text-white">Spiritual Rhythm</div>
          <div className="discipleos-secondary-copy mt-1 text-xs leading-5">
            This activity counts toward Spiritual Rhythm automatically.
          </div>
        </div>
      )}
    </div>
  );

  const renderEventMoreOptions = () => (
    <div className="mt-4 border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        data-testid="calendar-more-options-toggle"
        aria-expanded={isEventMoreOptionsOpen}
        onClick={() => setIsEventMoreOptionsOpen((open) => !open)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-white">More options</span>
          <span className="discipleos-meta-copy mt-1 block text-xs">
            Repeats, reminders, notes, and Spiritual Rhythm participation
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/55 transition-transform",
            isEventMoreOptionsOpen && "rotate-180",
          )}
        />
      </button>

      {isEventMoreOptionsOpen ? (
        <div data-testid="calendar-more-options" className="grid gap-4 border-t border-white/10 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
                Repeats
              </div>
              <select
                aria-label="Repeats"
                value={eventForm.repeat}
                onChange={(e) => setEventForm((prev) => ({ ...prev, repeat: e.target.value }))}
                className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            {eventForm.repeat !== "none" ? (
              <label>
                <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
                  Ends on
                </div>
                <input
                  aria-label="Ends on"
                  type="date"
                  value={eventForm.repeatUntil}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, repeatUntil: e.target.value }))}
                  className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
            ) : null}
          </div>

          {eventForm.repeat === "weekly" ? (
            <div>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
                Repeat on
              </div>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => {
                  const active = eventForm.repeatWeekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setEventForm((prev) => {
                          const exists = prev.repeatWeekdays.includes(day.value);
                          const nextDays = exists
                            ? prev.repeatWeekdays.filter((value) => value !== day.value)
                            : [...prev.repeatWeekdays, day.value];
                          return {
                            ...prev,
                            repeatWeekdays: normalizeWeekdays(nextDays.length ? nextDays : [day.value]),
                          };
                        })
                      }
                      className={cn(
                        "h-10 w-10 rounded-full border text-sm transition",
                        active
                          ? "border-[#D4A017]/40 bg-[#D4A017]/15 text-[#F4D77A]"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {renderEventOptionalDetails()}
        </div>
      ) : null}
    </div>
  );

  const renderCalendarItem = (event: any) => {
    const isPlanItem = event.kind === "plan";
    const allDone = isPlanItem && event.completedCount === event.readings.length;
    const eventCompletionEligible = !isPlanItem && isCompletableEvent(event);
    const eventCompleted =
      eventCompletionEligible &&
      eventCompletions[`${event.sourceEventId || event.id}:${selectedCalendarDate}`] === true;

    return (
      <div
        key={event.id}
        className={cn(
          "discipleos-flat-row discipleos-safe-text",
          isPlanItem
            ? "py-3 first:pt-3 last:pb-3 sm:py-4"
            : "py-2 first:pt-0 last:pb-0 sm:py-3",
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="discipleos-safe-text font-medium text-white">{event.title}</div>
              <EventBadge type={event.type || "event"} />
            </div>
            <div className="discipleos-meta-copy mt-0.5 text-sm">{formatTime(event.time || "07:00")}</div>
            {event.notes ? <div className="discipleos-safe-text mt-2 text-sm text-white/65">{event.notes}</div> : null}
          </div>

          {isPlanItem ? (
            <button
              onClick={() => markDayPlanComplete(event.planId, selectedCalendarDate)}
              className="discipleos-control--compact shrink-0 border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 hover:border-[#D4A017]/30 hover:bg-[#D4A017]/10 hover:text-[#F4D77A]"
            >
              {allDone ? "Undo day" : "Complete day"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {eventCompletionEligible ? (
                <button
                  type="button"
                  onClick={() => toggleEventComplete(event)}
                  aria-label={eventCompleted ? "Reopen activity" : "Complete activity"}
                  className="discipleos-control--icon border border-white/10 p-2 text-white/45 hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  {eventCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <button
                onClick={() => beginEditEvent(event)}
                aria-label={`Edit ${event.title}`}
                className="discipleos-control--icon border border-white/10 p-2 text-white/45 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteEvent(event.sourceEventId || event.id)}
                aria-label={`Delete ${event.title}`}
                className="discipleos-control--icon border border-white/10 p-2 text-white/45 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {isPlanItem ? (
          <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
            {event.readings.map((reading) => {
              const plan = plans.find((p) => p.id === event.planId);
              const completedMap = getCompletedMap(plan);
              const done = !!completedMap[reading.key];

              return (
                <button
                  key={reading.key}
                  onClick={() => toggleChapterComplete(plan.id, reading.key)}
                  className={cn(
                    "discipleos-flat-row flex min-w-0 items-center justify-between gap-3 px-3 py-3 text-left text-sm transition",
                    done
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span className="discipleos-safe-text">{reading.label || `${reading.book} ${reading.chapter}`}</span>
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/35" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEventCreationFlow = () => {
    if (editingEventId) {
      return (
        <div data-testid="calendar-event-form" className="border-t border-white/10 pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">Edit activity</div>
              <div className="discipleos-meta-copy text-xs">Editing activity on {formatDate(eventForm.date)}</div>
            </div>
            <button
              type="button"
              onClick={() => resetEventForm()}
              className="discipleos-control--compact inline-flex items-center gap-1 border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden min-[430px]:inline">Cancel edit</span>
              <span className="min-[430px]:hidden">Cancel</span>
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2 md:gap-3">
            <label>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Title</div>
              <input
                aria-label="Title"
                aria-invalid={Boolean(eventTitleError)}
                value={eventForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEventForm((prev) => ({ ...prev, title }));
                  if (title.trim()) setEventTitleError("");
                }}
                onBlur={() => {
                  if (!eventForm.title.trim()) setEventTitleError("Add a title before saving this activity.");
                }}
                className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
              />
              {eventTitleError ? <div className="mt-1.5 text-xs text-red-300" role="alert">{eventTitleError}</div> : null}
            </label>
            <label>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Type</div>
              <select
                aria-label="Type"
                value={eventForm.type}
                onChange={(e) => chooseEventType(e.target.value)}
                className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
              >
                {activityTypeChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </label>
            <label>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Date</div>
              <input
                aria-label="Date"
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))}
                className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
              />
            </label>
            <label>
              <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Time</div>
              <input
                aria-label="Time"
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))}
                className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
              />
            </label>
          </div>

          {renderEventMoreOptions()}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="calendar-save-activity"
              onClick={createEvent}
              disabled={!eventForm.title.trim()}
              className="discipleos-action bg-[#C8921D] px-4 font-medium text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              Save Activity
            </button>
            <button type="button" onClick={() => resetEventForm()} className="discipleos-action border border-white/10 px-4 text-[#F8FAFC]">
              Reset
            </button>
          </div>
        </div>
      );
    }

    const selectedChoice = activityTypeChoices.find((choice) => choice.value === eventForm.type);
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const isToday = eventForm.date === today;
    const isTomorrow = eventForm.date === tomorrow;
    const isRecurring = eventForm.repeat !== "none";
    const creationSteps = [
      { id: 1, label: "Activity" },
      { id: 2, label: "When" },
      { id: 3, label: "Repeat" },
      { id: 4, label: "Review" },
    ];
    const recurrenceSummary = !isRecurring
      ? "One time"
      : eventForm.repeat === "daily"
        ? `Daily${eventForm.repeatUntil ? ` through ${formatDate(eventForm.repeatUntil)}` : ""}`
        : `Weekly on ${normalizeWeekdays(eventForm.repeatWeekdays)
          .map((day) => weekdayOptions.find((item) => item.value === day)?.label)
          .filter(Boolean)
          .join(", ")}${eventForm.repeatUntil ? ` through ${formatDate(eventForm.repeatUntil)}` : ""}`;
    const rhythmSummary = defaultRhythmOptIn(eventForm.type)
      ? "Counts automatically"
      : eventForm.countsTowardRhythm
        ? "Included"
        : "Not included";

    return (
      <div data-testid="calendar-event-form" className="border-t border-white/10 pt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">Add activity</div>
            <div className="discipleos-meta-copy mt-1 text-xs">A few quick choices, then you’re ready.</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsEventFormOpen(false)}
              className="discipleos-control--compact inline-flex items-center gap-1 border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              <span className="hidden min-[380px]:inline">Hide flow</span>
              <span className="min-[380px]:hidden">Hide</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetEventForm();
                setIsEventFormOpen(true);
              }}
              className="discipleos-control--compact border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>

        <div
          className="mb-5 flex items-center gap-1.5 sm:gap-2"
          aria-label={`Add activity steps. Step ${eventCreationStep} of 4: ${creationSteps[eventCreationStep - 1].label}`}
        >
          {creationSteps.map((step) => {
            const complete = eventCreationStep > step.id;
            const current = eventCreationStep === step.id;
            return (
              <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      complete || current
                        ? "border-[#D4A017]/60 bg-[#D4A017]/20 text-[#F4D77A]"
                        : "border-white/15 bg-white/5 text-white/45",
                    )}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : step.id}
                  </div>
                  <span className={cn("truncate text-xs", current ? "font-medium text-[#F4D77A]" : "text-white/50", "hidden min-[430px]:inline")}>
                    {step.label}
                  </span>
                </div>
                {step.id < 4 ? (
                  <div className={cn("h-px min-w-2 flex-1", eventCreationStep > step.id ? "bg-[#D4A017]/50" : "bg-white/10")} />
                ) : null}
              </div>
            );
          })}
        </div>

        {eventCreationStep === 1 ? (
          <div data-testid="calendar-step-activity">
            <div className="mb-3">
              <div className="text-lg font-semibold text-white">What are you adding?</div>
              <div className="discipleos-meta-copy mt-1 text-sm">Choose an activity to get started.</div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {activityTypeChoices.map((choice) => {
                const Icon = choice.icon;
                const selected = eventForm.type === choice.value && eventTypeChosen;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    data-testid={`calendar-activity-type-${choice.value}`}
                    aria-pressed={selected}
                    onClick={() => chooseEventType(choice.value)}
                    className={cn(
                      "flex min-h-28 flex-col items-start justify-between gap-3 rounded-md border p-3 text-left transition",
                      selected
                        ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]"
                        : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.07]",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold">{choice.label}</span>
                      <span className="mt-1 block text-xs text-white/50">{choice.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {eventTypeChosen ? (
              <label className="mt-4 block">
                <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">
                  Activity name
                </div>
                <input
                  autoFocus
                  aria-label="Activity name"
                  aria-invalid={Boolean(eventTitleError)}
                  value={eventForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setEventForm((prev) => ({ ...prev, title }));
                    if (title.trim()) setEventTitleError("");
                  }}
                  onBlur={() => {
                    if (!eventForm.title.trim()) setEventTitleError("Add a name before continuing.");
                  }}
                  placeholder={selectedChoice?.suggestedTitle || "Morning prayer"}
                  className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-base text-white outline-none placeholder:text-white/30"
                />
                {eventTitleError ? <div className="mt-1.5 text-xs text-red-300" role="alert">{eventTitleError}</div> : null}
              </label>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                data-testid="calendar-step-continue"
                disabled={!eventTypeChosen || !eventForm.title.trim()}
                onClick={() => {
                  if (!eventForm.title.trim()) {
                    setEventTitleError("Add a name before continuing.");
                    return;
                  }
                  setEventCreationStep(2);
                }}
                className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {eventCreationStep === 2 ? (
          <div data-testid="calendar-step-when">
            <div className="mb-3">
              <div className="text-lg font-semibold text-white">When?</div>
              <div className="discipleos-meta-copy mt-1 text-sm">Pick a day and time that feels right.</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="calendar-date-today"
                aria-pressed={isToday}
                onClick={() => chooseEventDate(today)}
                className={cn("discipleos-action border px-3 text-sm", isToday ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/10 text-white/70")}
              >
                Today
              </button>
              <button
                type="button"
                data-testid="calendar-date-tomorrow"
                aria-pressed={isTomorrow}
                onClick={() => chooseEventDate(tomorrow)}
                className={cn("discipleos-action border px-3 text-sm", isTomorrow ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/10 text-white/70")}
              >
                Tomorrow
              </button>
              <button
                type="button"
                data-testid="calendar-date-pick"
                aria-pressed={!isToday && !isTomorrow}
                onClick={() => document.getElementById("calendar-guided-date")?.focus()}
                className={cn("discipleos-action border px-3 text-sm", !isToday && !isTomorrow ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/10 text-white/70")}
              >
                Pick a date
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Selected date</div>
                <input
                  id="calendar-guided-date"
                  aria-label="Selected date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => chooseEventDate(e.target.value)}
                  className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
              <label>
                <div className="discipleos-field-label mb-1.5 text-xs font-medium uppercase tracking-[0.16em]">Time</div>
                <input
                  aria-label="Time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
            </div>
            <div className="mt-3 text-sm text-white/65">
              Selected: <span className="font-medium text-white">{formatDate(eventForm.date)} at {formatTime(eventForm.time)}</span>
            </div>
            <div className="mt-4 flex justify-between gap-3">
              <button type="button" onClick={() => setEventCreationStep(1)} className="discipleos-action border border-white/10 px-4 text-white/75">Back</button>
              <button type="button" data-testid="calendar-step-continue" onClick={() => setEventCreationStep(3)} className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black">Next</button>
            </div>
          </div>
        ) : null}

        {eventCreationStep === 3 ? (
          <div data-testid="calendar-step-repeat">
            <div className="mb-3">
              <div className="text-lg font-semibold text-white">Is this a recurring activity?</div>
              <div className="discipleos-meta-copy mt-1 text-sm">Choose once, or set a schedule.</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                data-testid="calendar-repeat-no"
                aria-pressed={!isRecurring}
                onClick={() =>
                  setEventForm((prev) => ({
                    ...prev,
                    repeat: "none",
                    repeatUntil: "",
                  }))
                }
                className={cn(
                  "rounded-md border px-4 py-3 text-left text-sm transition",
                  !isRecurring
                    ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07]",
                )}
              >
                <span className="block font-semibold">No</span>
                <span className="mt-1 block text-xs text-white/55">Just this one time</span>
              </button>
              <button
                type="button"
                data-testid="calendar-repeat-yes"
                aria-pressed={isRecurring}
                onClick={() =>
                  setEventForm((prev) => ({
                    ...prev,
                    repeat: prev.repeat === "none" ? "daily" : prev.repeat,
                  }))
                }
                className={cn(
                  "rounded-md border px-4 py-3 text-left text-sm transition",
                  isRecurring
                    ? "border-[#D4A017]/60 bg-[#D4A017]/15 text-[#F4D77A]"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07]",
                )}
              >
                <span className="block font-semibold">Yes</span>
                <span className="mt-1 block text-xs text-white/55">Repeat on a schedule</span>
              </button>
            </div>
            {isRecurring ? (
              <div className="mt-4 border-t border-white/10 pt-4">
                {renderEventRecurrenceControls()}
              </div>
            ) : null}
            <div className="mt-4 flex justify-between gap-3">
              <button type="button" onClick={() => setEventCreationStep(2)} className="discipleos-action border border-white/10 px-4 text-white/75">Back</button>
              <button type="button" data-testid="calendar-step-continue" onClick={() => setEventCreationStep(4)} className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black">Next</button>
            </div>
          </div>
        ) : null}

        {eventCreationStep === 4 ? (
          <div data-testid="calendar-step-review">
            <div className="mb-3">
              <div className="text-lg font-semibold text-white">Review &amp; Add</div>
              <div className="discipleos-meta-copy mt-1 text-sm">Add any optional details, then save your activity.</div>
            </div>
            {renderEventOptionalDetails()}
            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-sm font-medium text-white">Review</div>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <EventBadge type={eventForm.type} />
                  <span className="font-medium text-white">{eventForm.title}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/65">
                  <span>{formatDate(eventForm.date)} at {formatTime(eventForm.time)}</span>
                  <span>{recurrenceSummary}</span>
                </div>
                <div className="grid gap-1 text-white/65 sm:grid-cols-3">
                  <span>{eventForm.remind ? `Reminder: ${eventForm.reminderMinutes} minutes before` : "No reminder"}</span>
                  <span>{eventForm.notes.trim() ? "Notes added" : "No notes"}</span>
                  <span>Spiritual Rhythm: {rhythmSummary}</span>
                </div>
                {eventForm.notes.trim() ? (
                  <div className="border-t border-white/10 pt-3 text-white/65">
                    {eventForm.notes.trim()}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <button type="button" onClick={() => setEventCreationStep(3)} className="discipleos-action border border-white/10 px-4 text-white/75">Back</button>
              <button
                type="button"
                data-testid="calendar-save-activity"
                onClick={createEvent}
                disabled={!eventForm.title.trim()}
                className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Add Activity
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const deleteEvent = (eventId: string) => {
    setEvents((prev) => removeEventById(prev, eventId));
    if (!localOnlyAfterSignOutRef.current) {
      fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId }),
      }).catch(() => {
        queuePendingOp({ type: "delete-event", id: eventId, ts: Date.now() });
      });
    }

    if (editingEventId === eventId) {
      resetEventForm();
    }
  };

  const deletePlan = (planId: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    if (!localOnlyAfterSignOutRef.current) {
      fetch("/api/reading/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planId }),
      }).catch(() => {
        queuePendingOp({ type: "delete-plan", id: planId, ts: Date.now() });
      });
    }

    if (selectedPlanId === planId) {
      setSelectedPlanId(null);
    }

    if (editingPlanId === planId) {
      setEditingPlanId(null);
    }
  };

  const enableNotifications = async () => {
    if (!isSignedIn) {
      window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`);
      return;
    }

    const fail = (message: string) => {
      clearNotificationFeedbackTimer();
      setIsSubscribed(false);
      setNotificationEnablementState("error");
      setNotificationFeedback(message);
    };

    clearNotificationFeedbackTimer();
    setNotificationEnablementState("enabling");
    setNotificationFeedback("Allowing notifications and preparing this device…");

    try {
      if (typeof window === "undefined" || !("Notification" in window)) {
        setNotificationPermission("unsupported");
        fail("This browser does not support reminder notifications.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        setNotificationPermission("unsupported");
        fail("This browser cannot run reminder notifications.");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        fail(
          permission === "denied"
            ? "Notifications are blocked. Allow them in this site's browser settings, then try again."
            : "Notification permission was not granted. Try again when you are ready.",
        );
        return;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("VITE_VAPID_PUBLIC_KEY is not set — cannot create push subscription");
        fail("Reminders are not configured for this app yet.");
        return;
      }

      // Resolve every non-destructive prerequisite before replacing a working
      // browser subscription.
      const deviceId = getPushDeviceId();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("service-worker-timeout")), 10000),
        ),
      ]);
      let existingSubscription = await registration.pushManager.getSubscription();
      let previousEndpoint: string | undefined;

      if (
        existingSubscription &&
        !isPushSubscriptionCompatible(existingSubscription, applicationServerKey)
      ) {
        previousEndpoint = existingSubscription.endpoint;
        await existingSubscription.unsubscribe();
        existingSubscription = null;
      }

      await subscribeAndConfirmPush({
        existingSubscription,
        previousEndpoint,
        subscribe: () =>
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          }),
        save: async (nextSubscription, retiredEndpoint) => {
          const response = await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              buildPushRegistrationPayload(nextSubscription, retiredEndpoint, deviceId),
            ),
          });
          if (!response.ok) {
            const error = new Error(`Push subscription registration failed: ${response.status}`);
            (error as Error & { status?: number }).status = response.status;
            throw error;
          }
          return true;
        },
      });

      setIsSubscribed(true);
      setNotificationEnablementState("success");
      showTemporaryNotificationFeedback("Reminders are enabled on this device.");
    } catch (error) {
      console.error("Enable notifications failed:", error);
      const status = (error as Error & { status?: number })?.status;
      if (status === 403) {
        fail(
          "This browser's reminder subscription is linked to another account. Reminders were not changed.",
        );
      } else if ((error as Error)?.message === "service-worker-timeout") {
        fail("The reminder service is not ready. Reload this page and try again.");
      } else {
        fail("Reminders could not be enabled. Check browser permissions and try again.");
      }
    }
  };
  const notificationButtonLabel =
    notificationEnablementState === "enabling"
      ? "Enabling reminders…"
      : isSubscribed
        ? "Reminders enabled"
        : notificationPermission === "denied"
          ? "Notifications blocked"
          : notificationPermission === "unsupported"
            ? "Notifications unavailable"
            : notificationEnablementState === "error"
              ? "Try again"
              : "Enable reminders";
  const notificationFeedbackTone =
    notificationEnablementState === "error"
      ? "text-red-200"
      : notificationEnablementState === "success"
        ? "text-emerald-200"
        : "text-white/60";
  const renderNotificationFeedback = () =>
    notificationFeedback ? (
      <div
        className={`basis-full text-center text-[11px] leading-4 ${notificationFeedbackTone}`}
        role={notificationEnablementState === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {notificationFeedback}
      </div>
    ) : null;
  const tabs = [
    { key: "today", label: "Today", icon: LayoutDashboard },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "plans", label: "Plans", icon: BookOpen },
  ];
  const hasReturningExperience = plans.length > 0;
  const hasExistingActivity =
    events.length > 0 || Object.keys(eventCompletions).length > 0;
  const showFirstPlanOnboarding =
    hasHydrated &&
    hasInitialSyncCompleted &&
    plans.length === 0 &&
    !hasExistingActivity &&
    (isSignedIn || !localOnlyAfterSignOutRef.current);
  const showFirstPlanSyncState =
    hasHydrated &&
    !hasInitialSyncCompleted &&
    plans.length === 0 &&
    !hasExistingActivity &&
    (isSignedIn || !localOnlyAfterSignOutRef.current);
  const showHomeBootstrapState =
    !isAuthLoaded || !hasHydrated || showFirstPlanSyncState;

  const setOnboardingPreset = (preset: "newTestament" | "gospels") => {
    togglePreset(preset);
  };

  const openOnboardingBookPicker = () => {
    setForm((prev) => ({
      ...prev,
      preset: "custom",
      journeyKey: "custom",
      name: "",
      autoSchedule: true,
      paceMode: "time",
    }));
    setIsBookPickerOpen(true);
  };

  const setOnboardingMinutes = (minutes: number) => {
    setForm((prev) => ({
      ...prev,
      paceMode: "time",
      dailyMinutes: minutes,
      autoSchedule: true,
      endDate: calculateAutoEndDate(
        prev.selectedBooks,
        prev.startDate,
        prev.targetChaptersPerDay,
        "time",
        minutes,
        prev.readingWpm,
      ),
    }));
  };

  const setOnboardingStartDate = (startDate: string) => {
    setForm((prev) => ({
      ...prev,
      startDate,
      endDate: prev.autoSchedule
        ? calculateAutoEndDate(
            prev.selectedBooks,
            startDate,
            prev.targetChaptersPerDay,
            "time",
            prev.dailyMinutes,
            prev.readingWpm,
          )
        : prev.endDate,
    }));
  };

  const useOnboardingSuggestedEndDate = () => {
    setForm((prev) => ({
      ...prev,
      autoSchedule: true,
      paceMode: "time",
      endDate: calculateAutoEndDate(
        prev.selectedBooks,
        prev.startDate,
        prev.targetChaptersPerDay,
        "time",
        prev.dailyMinutes,
        prev.readingWpm,
      ),
    }));
  };

  useEffect(() => {
    if (!isNavigationOpen) return;
    const handleNavigationKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNavigationOpen(false);
      }
    };
    document.addEventListener("keydown", handleNavigationKeyDown);
    return () => document.removeEventListener("keydown", handleNavigationKeyDown);
  }, [isNavigationOpen]);

  useEffect(() => {
    if (!isBookPickerOpen) return;
    const handleBookPickerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsBookPickerOpen(false);
    };
    document.addEventListener("keydown", handleBookPickerKeyDown);
    return () => document.removeEventListener("keydown", handleBookPickerKeyDown);
  }, [isBookPickerOpen]);

  if (showHomeBootstrapState) {
    return (
      <div className="discipleos-shell min-h-screen text-white">
        <div className="discipleos-content discipleos-content--home">
          <header className="flex items-center justify-between gap-4 py-3 sm:py-4">
            <h1 className="shrink-0 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              <span className="text-white">DISCIPLE</span>
              <span className="text-[#D4A017]">OS</span>
            </h1>
            <AccountControls />
          </header>
          <div
            role="status"
            data-testid="first-plan-sync-state"
            className="mx-auto flex min-h-[50vh] w-full max-w-2xl items-center justify-center text-center text-sm text-white/60"
          >
            Preparing your reading space…
          </div>
        </div>
      </div>
    );
  }

  if (showFirstPlanOnboarding) {
    return (
      <div className="discipleos-shell min-h-screen text-white">
        <div className="discipleos-content discipleos-content--home">
          <header className="flex items-center justify-between gap-4 py-3 sm:py-4">
            <h1 className="shrink-0 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              <span className="text-white">DISCIPLE</span>
              <span className="text-[#D4A017]">OS</span>
            </h1>
            <AccountControls />
          </header>
          <FirstPlanOnboarding
            form={form}
            step={onboardingStep}
            planPreview={planPreview}
            formatDate={formatDate}
            presetBooks={{
              newTestament: PRESETS.newTestament,
              gospels: PRESETS.gospels,
            }}
            books={BIBLE_BOOKS}
            isBookPickerOpen={isBookPickerOpen}
            onStepChange={setOnboardingStep}
            onSelectPreset={setOnboardingPreset}
            onChooseBooks={openOnboardingBookPicker}
            onToggleBook={toggleBook}
            onCloseBookPicker={() => setIsBookPickerOpen(false)}
            onMinutesChange={setOnboardingMinutes}
            onStartDateChange={setOnboardingStartDate}
            onEndDateChange={(endDate) =>
              setForm((prev) => ({ ...prev, autoSchedule: false, endDate }))
            }
            onUseSuggestedEndDate={useOnboardingSuggestedEndDate}
            onCreatePlan={() => createPlan({ onboarding: true })}
            isSignedIn={isSignedIn}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="discipleos-shell min-h-screen text-white">
      <div className="discipleos-content discipleos-content--home">
        <section className={cn("relative mb-5", hasReturningExperience ? "py-3 sm:py-4" : "py-8 sm:py-12")}>
          <header className="flex items-center justify-between gap-4">
            <h1 className={cn("shrink-0 font-bold tracking-[-0.03em]", hasReturningExperience ? "text-xl sm:text-2xl" : "text-xl sm:text-3xl")}>
              <span className="text-white">DISCIPLE</span>
              <span className="text-[#D4A017]">OS</span>
            </h1>
            <AccountControls />
          </header>

          <div className={cn("min-w-0 max-w-2xl", hasReturningExperience ? "mt-1" : "mt-8 sm:mt-10")}>
            {hasReturningExperience ? (
              <p className="discipleos-secondary-copy text-sm leading-6 sm:text-base">
                Today’s reading <span className="text-white/35">·</span> keep taking the next faithful step
              </p>
            ) : (
              <>
                <p className="max-w-[620px] text-4xl font-bold leading-[0.94] tracking-[-0.035em] text-white sm:text-6xl">
                  <span className="block">Discipline that</span>
                  <span className="block">moves mountains.</span>
                </p>

                <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                  Build steady habits in Scripture, prayer, and your daily walk with God.
                </p>
              </>
            )}
          </div>
        </section>

          <div
          data-testid="dashboard-navigation"
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-40 flex items-end justify-center px-4 md:static md:mb-5 md:w-full md:items-start md:justify-center md:px-0"
        >
          <div className="pointer-events-auto relative">
            <button
              type="button"
              data-testid="dashboard-navigation-toggle"
              aria-expanded={isNavigationOpen}
              aria-controls="dashboard-navigation-panel"
              aria-label={isNavigationOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsNavigationOpen((open) => !open)}
              className="group relative z-20 inline-flex min-h-11 w-[min(14rem,calc(100vw-2rem))] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-[#11161D]/95 px-5 py-3 text-sm font-semibold text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur transition hover:border-[#D4A017]/45 hover:bg-[#1A2029] hover:text-white md:hidden"
            >
              {isNavigationOpen ? <X className="h-4 w-4 text-[#D4A017]" /> : <ChevronDown className="h-4 w-4 rotate-180 text-[#D4A017]" />}
              <span>{isNavigationOpen ? "Close menu" : "Menu"}</span>
            </button>

          <div
              data-testid="dashboard-navigation-row"
              role="navigation"
              aria-label="Dashboard navigation"
              className="hidden w-full max-w-full flex-wrap items-center justify-center gap-1 overflow-visible md:mx-auto md:flex lg:gap-2"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => (tab.key === "build" ? beginCreatePlan() : setActiveTab(tab.key))}
                    className={cn(
                       "discipleos-action inline-flex shrink-0 items-center justify-center gap-1.5 border px-3 py-2 text-xs transition",
                      active
                        ? "border-[#D4A017]/45 bg-[#D4A017]/15 text-white shadow-[0_0_18px_rgba(212,160,23,0.22)]"
                        : "border-white/10 bg-white/[0.04] text-[#94A3B8] hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
              <Link
                href="/mountain-rhythm"
                data-testid="link-mountain-rhythm-entry"
                aria-label={`Mountain Rhythm${mountainRhythm.journeyDays > 0 ? `, ${mountainRhythm.journeyLabel}` : ""}`}
                   className="discipleos-action group inline-flex shrink-0 items-center justify-center gap-1.5 border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[#94A3B8] transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-[#D4A017]/50 hover:bg-white/10 hover:text-white"
              >
                 <Mountain className="h-4 w-4 shrink-0 text-[#D4A017]" />
                <span className="whitespace-nowrap">Mountain Rhythm</span>
              </Link>
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 lg:flex-nowrap">
                 <div className="w-28 shrink-0">
                     <InstallButton compact />
                 </div>
                 <button
                   type="button"
                    onClick={() => void enableNotifications()}
                    disabled={notificationEnablementState === "enabling"}
                    aria-busy={notificationEnablementState === "enabling"}
                   className="discipleos-action inline-flex w-auto min-w-32 shrink-0 items-center justify-center gap-2 whitespace-nowrap border border-[#D4A017]/50 bg-[#211A0D]/90 px-3 py-2 text-xs text-white transition-[background-color,transform] hover:bg-[#33280E] active:translate-y-px"
                 >
                    <Bell size="1em" strokeWidth={2.25} fill="currentColor" className="shrink-0 text-[#D4A017]" />
                    {notificationButtonLabel}
                 </button>
                  {renderNotificationFeedback()}
               </div>
            </div>

            {isNavigationOpen ? (
              <div
                id="dashboard-navigation-panel"
                data-testid="dashboard-navigation-panel"
                role="navigation"
                aria-label="Dashboard navigation"
                className="fixed left-1/2 top-1/2 z-10 max-h-[calc(100dvh-6rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/15 bg-[#11161D]/[0.98] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur sm:p-3 md:hidden"
              >
                <div className="grid grid-cols-1 gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (tab.key === "build") {
                            beginCreatePlan();
                            return;
                          }
                          setActiveTab(tab.key);
                          setIsNavigationOpen(false);
                        }}
                        className={cn(
                          tab.key === "build" ? "hidden md:inline-flex" : "inline-flex",
                           "discipleos-action w-full min-w-0 items-center justify-center gap-1.5 border px-2 py-2 text-center text-xs transition",
                          active
                            ? "border-[#D4A017]/45 bg-[#D4A017]/15 text-white shadow-[0_0_18px_rgba(212,160,23,0.22)]"
                            : "border-white/10 bg-white/[0.04] text-[#94A3B8] hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </button>
                    );
                  })}
                  <Link
                    href="/mountain-rhythm"
                    data-testid="link-mountain-rhythm-entry"
                    aria-label={`Mountain Rhythm${mountainRhythm.journeyDays > 0 ? `, ${mountainRhythm.journeyLabel}` : ""}`}
                    onClick={() => setIsNavigationOpen(false)}
                     className="discipleos-action group flex w-full min-w-0 items-center justify-center gap-1.5 border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-xs text-[#94A3B8] transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-[#D4A017]/50 hover:bg-white/10 hover:text-white"
                  >
                     <Mountain className="h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span className="whitespace-normal text-center leading-tight">Mountain Rhythm</span>
                  </Link>
                  <div
                    data-testid="dashboard-navigation-secondary-actions"
                    className="mt-3 border-t border-white/10 pt-3 md:mt-0 md:border-0 md:pt-0"
                  >
                    <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                      <span className="h-px w-8 bg-white/10" />
                      <span>Setup</span>
                      <span className="h-px w-8 bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {isSignedIn ? (
                        <Link
                          href="/settings"
                          data-testid="mobile-settings-link"
                          onClick={() => setIsNavigationOpen(false)}
                          className="discipleos-control--compact inline-flex h-9 w-full items-center justify-center border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition hover:border-[#D4A017]/45 hover:bg-[#211A0D] hover:text-[#F4D77A]"
                        >
                          <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                          Settings
                        </Link>
                      ) : null}
                      <InstallButton compact />
                      <button
                        type="button"
                        onClick={() => void enableNotifications()}
                        disabled={notificationEnablementState === "enabling"}
                        aria-busy={notificationEnablementState === "enabling"}
                        className="discipleos-control--compact inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap border border-[#D4A017]/50 bg-[#211A0D]/90 px-3 py-2 text-xs text-white transition-[background-color,transform] hover:bg-[#33280E] active:translate-y-px md:h-11 md:px-4 md:text-sm"
                      >
                        <Bell size="1em" strokeWidth={2.25} fill="currentColor" className="shrink-0 text-[#D4A017]" />
                        {notificationButtonLabel}
                      </button>
                      {notificationFeedback ? (
                        <div
                          className={`text-center text-[11px] leading-4 ${notificationFeedbackTone}`}
                          role={notificationEnablementState === "error" ? "alert" : "status"}
                          aria-live="polite"
                        >
                          {notificationFeedback}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {activeTab === "today" && (
          <div
            data-testid="dashboard-today-content"
            className="discipleos-section-stack flex min-w-0 flex-col gap-5"
          >
            <div className="min-w-0 px-4 sm:px-5">
              <VerseOfTheDay verse={verseOfTheDay} />
            </div>

            <ResponsiveSection
              testId="dashboard-assigned-reading"
              title="Today’s Reading"
              icon={BookOpen}
              disclosureKey="assignedReading"
              summary={todayAssignedReadingSummary.label}
              collapsible
            >
              <div
                data-testid="dashboard-assigned-reading-overview"
                className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4"
              >
                <div>
                  <div className="discipleos-field-label text-[10px] uppercase tracking-[0.16em]">
                    Today’s completion
                  </div>
                  <div
                    data-testid="dashboard-assigned-reading-values"
                    className="mt-1 text-xl font-semibold text-white"
                  >
                    {todayAssignedReadingSummary.label}
                  </div>
                  {todayAssignedReadingSummary.totalMinutes > 0 ? (
                    <div
                      data-testid="dashboard-assigned-reading-estimate"
                      className="discipleos-secondary-copy mt-1 text-sm"
                    >
                      ~{formatMinutes(todayAssignedReadingSummary.totalMinutes)} estimated reading
                    </div>
                  ) : null}
                </div>
                {todayAssignedReadingSummary.total > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("calendar");
                      setSelectedCalendarDate(todayISO());
                    }}
                    className="discipleos-action inline-flex min-h-11 items-center border border-white/10 bg-white/5 px-4 text-sm text-[#F8FAFC] hover:border-[#D4A017]/30 hover:bg-[#D4A017]/10 hover:text-[#F4D77A]"
                  >
                    Open day view
                  </button>
                ) : null}
              </div>

              {todaysPlans.length === 0 ? (
                <div className="discipleos-empty-state text-sm">
                  <div>No ordinary reading is scheduled today.</div>
                  <button
                    type="button"
                    data-testid="today-empty-create-plan"
                    onClick={beginCreatePlan}
                    className="discipleos-action mt-3 inline-flex min-h-11 items-center justify-center border border-[#E0B449]/50 bg-[#C8921D] px-4 text-sm font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px"
                  >
                    Create a Plan
                  </button>
                </div>
              ) : (
                todaysPlans.map(({ plan, todayReading }) => {
                  const completedMap = getCompletedMap(plan);
                  const dayComplete = todayReading.readings.every((reading) => Boolean(completedMap[reading.key]));

                  return (
                    <div
                      key={plan.id}
                      className="discipleos-safe-text border-t border-white/10 py-4 first:border-t-0 first:pt-0 last:pb-0"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="inline-block max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-full border border-[#D4A017]/35 bg-[#D4A017]/15 px-3 py-1 text-xs font-medium text-[#F4D77A]">
                            {plan.name}
                          </div>
                          <div className="discipleos-meta-copy mt-2 text-sm">
                            {todayReading.readings.length} reading{todayReading.readings.length === 1 ? "" : "s"} · ~{formatMinutes(getAssignmentMinutes(todayReading))}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            data-testid={`today-complete-day-${plan.id}`}
                            onClick={() => markDayPlanComplete(plan.id, todayISO())}
                            disabled={dayComplete}
                            aria-label={dayComplete ? "Day complete" : "Complete day"}
                            className={cn(
                              "discipleos-control--compact inline-flex min-h-11 items-center gap-1.5 border px-3 py-2 text-xs font-semibold transition",
                              dayComplete
                                ? "cursor-default border-[#10B981]/35 bg-[#10B981]/10 text-[#86EFAC]"
                                : "border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D77A] hover:border-[#D4A017]/60 hover:bg-[#D4A017]/20",
                            )}
                          >
                            {dayComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {dayComplete ? "Day complete" : "Complete day"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setActiveTab("plans");
                            }}
                            className="inline-flex min-h-11 items-center gap-1 text-sm text-white/70 hover:text-[#F4D77A]"
                          >
                            Open plan
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="discipleos-flat-list grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {todayReading.readings.map((reading) => {
                          const done = !!completedMap[reading.key];
                          const readingMinutes = getAssignmentMinutes({ readings: [reading] });
                          return (
                            <button
                              key={reading.key}
                              type="button"
                              onClick={() => toggleChapterComplete(plan.id, reading.key)}
                              className={cn(
                                "discipleos-flat-row flex items-center justify-between px-3 py-3 text-left transition",
                                done
                                  ? "border-emerald-400/30 bg-emerald-500/10"
                                  : "border-white/10 bg-black/30 hover:bg-white/5",
                              )}
                            >
                              <div className="min-w-0">
                                <div className="discipleos-safe-text font-medium">{reading.label || reading.book}</div>
                                <div className="discipleos-meta-copy text-sm">
                                  {reading.chapter ? `Chapter ${reading.chapter}` : "Reading"}
                                  {readingMinutes > 0 ? (
                                    <span className="discipleos-meta-copy ml-2">~{formatMinutes(readingMinutes)}</span>
                                  ) : null}
                                </div>
                              </div>
                              {done ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                              ) : (
                                <Circle className="h-5 w-5 text-white/35" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </ResponsiveSection>

            <ResponsiveSection
              testId="dashboard-schedule"
              title="Today’s Activities"
              icon={Calendar}
              disclosureKey="schedule"
            >
              <div className="discipleos-flat-list">
                {todayFocusItems.manual.length === 0 ? (
                  <div className="discipleos-empty-state text-sm">
                    No spiritual events scheduled today — add prayer, fasting, church, or a custom event.
                  </div>
                ) : (
                  todayFocusItems.manual.map((event) => (
                    <div key={event.id} className="discipleos-flat-row discipleos-safe-text py-4 first:pt-0 last:pb-0">
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                        <EventBadge type={event.type} />
                        <div className="flex items-center gap-2">
                          {event.remind ? <Pill accent>{event.reminderMinutes} min reminder</Pill> : null}
                          {event.completionEligible ? (
                            <button
                              type="button"
                              onClick={() => toggleEventComplete(event)}
                              aria-label={event.rhythmCompleted ? "Reopen activity" : "Complete activity"}
                              className="discipleos-control--icon border border-white/10 p-2 text-white/60 hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                            >
                              {event.rhythmCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => beginEditEvent(event)}
                            aria-label={`Edit ${event.title}`}
                            className="discipleos-control--icon border border-[#D4A017]/20 p-2 text-[#D4A017]/75 hover:bg-[#D4A017]/10 hover:text-[#F4D77A]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="discipleos-safe-text text-base font-medium">{event.title}</div>
                      <div className="discipleos-meta-copy mt-1 text-sm">{formatTime(event.time)} today</div>
                      {event.notes ? <div className="discipleos-safe-text mt-2 text-sm text-white/70">{event.notes}</div> : null}
                      {event.repeat && event.repeat !== "none" ? (
                        <div className="discipleos-meta-copy mt-2 text-xs">
                          {event.repeat === "daily"
                            ? "Repeats daily until turned off"
                            : `Repeats on ${normalizeWeekdays(event.repeatWeekdays).map((day) => weekdayOptions.find((item) => item.value === day)?.label).join(", ")}${event.repeatUntil ? ` through ${formatDate(event.repeatUntil)}` : " until turned off"}`}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </ResponsiveSection>

            <ResponsiveSection
              testId="dashboard-progress"
              title="Progress"
              icon={Bookmark}
              disclosureKey="progress"
              summary="Ordinary reading plans"
              collapsible
            >
              <div data-testid="dashboard-progress-list" className="discipleos-flat-list">
                {ordinaryPlans.length === 0 ? (
                  <div className="discipleos-empty-state text-sm">No ordinary reading plans yet.</div>
                ) : (
                  ordinaryPlans.map((plan) => {
                    const stats = getPlanStats(plan);
                    return (
                      <div key={plan.id} className="discipleos-flat-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="discipleos-safe-text font-medium">{plan.name}</div>
                          <div className="discipleos-meta-copy mt-1 text-sm">
                            {stats.percent}% complete · {stats.remainingChapters} chapters remaining
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlanId(plan.id);
                            setActiveTab("plans");
                          }}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-white/70 hover:text-[#F4D77A]"
                        >
                          Open plan
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </ResponsiveSection>

            <ClimbProgressSummaryBar score={mountainRhythm} />
          </div>
        )}

         {activeTab === "build" && (
           <div className="discipleos-section-stack min-w-0">
            <SectionCard data-testid="dashboard-build-form" className="min-w-0 p-4 sm:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="discipleos-section-heading">
                  <Plus className="discipleos-section-heading__icon" />
                  Create a plan
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("plans")}
                  className="discipleos-control--compact border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Back to Plans
                </button>
              </div>

              <div className="mb-6" data-testid="plan-create-progress">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium uppercase tracking-[0.16em] text-[#F4D77A]">
                    Step {planCreationStep} of 5
                  </span>
                  <span className="discipleos-meta-copy">
                    {["Choose reading", "Basic schedule", "Tune this plan", "Name your plan", "Review"][planCreationStep - 1]}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "h-1 rounded-full",
                        step <= planCreationStep ? "bg-[#D4A017]" : "bg-white/10",
                      )}
                    />
                  ))}
                </div>
              </div>

              {planCreationStep === 1 ? (
                <div data-testid="plan-create-step-1" className="grid gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      What do you want to read?
                    </h2>
                    <p className="discipleos-secondary-copy mt-1 text-sm leading-6">
                      Start with a simple reading choice. You can fine-tune the plan later.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: "psalmsProverbs", label: "Psalms + Proverbs", detail: "A focused wisdom and worship plan." },
                      { key: "newTestament", label: "New Testament", detail: "Read through the New Testament." },
                      { key: "oldTestament", label: "Old Testament", detail: "Read through the Old Testament." },
                      { key: "custom", label: "Choose Books", detail: "Build a plan from the books you want to read." },
                    ].map((preset) => {
                      const isPresetSelected =
                        preset.key === "oldTestament" || preset.key === "newTestament"
                          ? PRESETS[preset.key].every((book) => form.selectedBooks.includes(book)) &&
                            form.selectedBooks.length === PRESETS[preset.key].length
                          : form.preset === preset.key;

                      return (
                        <button
                          key={preset.key}
                          type="button"
                          data-testid={`plan-create-preset-${preset.key}`}
                          aria-pressed={isPresetSelected}
                          onClick={() => (preset.key === "custom" ? openCustomBookPicker() : togglePreset(preset.key))}
                          className={cn(
                            "discipleos-choice-row min-h-[76px] px-4 py-3 text-left transition",
                            isPresetSelected
                              ? "border-[#D4A017]/50 bg-[#D4A017]/15 text-[#F4D77A]"
                              : "text-[#F8FAFC] hover:bg-white/5",
                          )}
                        >
                          <div className="font-medium">{preset.label}</div>
                          <div className="mt-1 text-xs opacity-70">{preset.detail}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <div className="text-sm font-medium text-white">
                      {form.selectedBooks.length > 0
                        ? `${form.selectedBooks.length} ${form.selectedBooks.length === 1 ? "book" : "books"} selected`
                        : "Choose at least one book to continue"}
                    </div>
                    {form.selectedBooks.length > 0 ? (
                      <div className="discipleos-meta-copy mt-1 line-clamp-2 text-xs">
                        {form.selectedBooks.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {planCreationStep === 2 ? (
                <div data-testid="plan-create-step-2" className="grid gap-5">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      Set your basic schedule
                    </h2>
                    <p className="discipleos-secondary-copy mt-1 text-sm leading-6">
                      Choose when to start and how much time you can give each day.
                    </p>
                  </div>

                  <label className="text-sm text-white">
                    <div className="mb-2 font-medium">Start date</div>
                    <input
                      aria-label="Start date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate: prev.autoSchedule
                            ? calculateAutoEndDate(
                              prev.selectedBooks,
                              e.target.value,
                              prev.targetChaptersPerDay,
                              "time",
                              prev.dailyMinutes,
                              prev.readingWpm,
                            )
                            : prev.endDate,
                        }))
                      }
                      className="discipleos-form-control w-full border border-white/10 bg-black/30 px-3 outline-none"
                    />
                  </label>

                  <div>
                    <div className="mb-2 font-medium text-white">Daily reading time</div>
                    <div className="flex flex-wrap gap-2">
                      {[10, 15, 20, 30, 45, 60].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          data-testid={`plan-create-minutes-${minutes}`}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              paceMode: "time",
                              dailyMinutes: minutes,
                              endDate: prev.autoSchedule
                                ? calculateAutoEndDate(
                                  prev.selectedBooks,
                                  prev.startDate,
                                  prev.targetChaptersPerDay,
                                  "time",
                                  minutes,
                                  prev.readingWpm,
                                )
                                : prev.endDate,
                            }))
                          }
                          className={cn(
                            "discipleos-control--compact border px-3 py-2 text-sm transition",
                            form.paceMode === "time" && form.dailyMinutes === minutes
                              ? "border-[#D4A017]/50 bg-[#D4A017]/20 text-[#F4D77A]"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                          )}
                        >
                          {minutes} minutes
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#D4A017]/25 bg-[#D4A017]/[0.07] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">Suggested finish date</div>
                        <div className="discipleos-meta-copy mt-1 text-xs">
                          Calculated from your books, start date, and daily reading time.
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold text-[#F4D77A]">
                        {form.selectedBooks.length > 0 ? formatDate(planPreview.actualEndDate) : "Choose books first"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {planCreationStep === 3 ? (
                <div data-testid="plan-create-step-3" className="grid gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      Tune this plan
                    </h2>
                    <p className="discipleos-secondary-copy mt-1 text-sm leading-6">
                      Optional. The defaults are ready to use, or open More options to customize the details.
                    </p>
                  </div>

                  <div className="border border-white/10 bg-white/[0.03]">
                    <button
                      type="button"
                      data-testid="plan-tune-toggle"
                      aria-expanded={isPlanTuneOpen}
                      onClick={() => setIsPlanTuneOpen((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <span>
                        <span className="block text-sm font-medium text-white">More options</span>
                        <span className="discipleos-meta-copy mt-1 block text-xs">
                          Reading order, pacing, reading speed, time of day, and date override
                        </span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/55 transition-transform", isPlanTuneOpen && "rotate-180")} />
                    </button>

                    {isPlanTuneOpen ? (
                      <div className="grid gap-5 border-t border-white/10 p-4">
                        <div>
                          <div className="mb-2 text-sm font-medium text-white">Reading order</div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, readingMode: "consecutive" }))}
                              className={cn(
                                "discipleos-choice-row px-3 py-3 text-left",
                                form.readingMode === "consecutive" && "border-[#D4A017]/50 bg-[#D4A017]/15 text-[#F4D77A]",
                              )}
                            >
                              <div className="flex items-center gap-2 font-medium"><ArrowDownAZ className="h-4 w-4" />Consecutive</div>
                              <div className="mt-1 text-xs opacity-70">Read straight through in order.</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, readingMode: "random" }))}
                              className={cn(
                                "discipleos-choice-row px-3 py-3 text-left",
                                form.readingMode === "random" && "border-[#D4A017]/50 bg-[#C8921D] text-black",
                              )}
                            >
                              <div className="flex items-center gap-2 font-medium"><Shuffle className="h-4 w-4" />Randomized</div>
                              <div className="mt-1 text-xs opacity-70">Shuffle chapters across the plan.</div>
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-medium text-white">Pacing</div>
                          <div className="flex flex-wrap gap-2">
                            {["time", "chapters"].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    paceMode: mode,
                                    endDate: prev.autoSchedule
                                      ? calculateAutoEndDate(
                                        prev.selectedBooks,
                                        prev.startDate,
                                        prev.targetChaptersPerDay,
                                        mode,
                                        prev.dailyMinutes,
                                        prev.readingWpm,
                                      )
                                      : prev.endDate,
                                  }))
                                }
                                className={cn(
                                  "discipleos-control--compact border px-3 py-2 text-sm",
                                  form.paceMode === mode
                                    ? "border-[#D4A017]/50 bg-[#D4A017]/15 text-[#F4D77A]"
                                    : "border-white/10 bg-white/5 text-white/70",
                                )}
                              >
                                {mode === "time" ? "By time" : "By chapters"}
                              </button>
                            ))}
                          </div>

                          {form.paceMode === "time" ? (
                            <div className="mt-3">
                              <div className="discipleos-meta-copy mb-2 text-xs">Minutes per day</div>
                              <div className="flex flex-wrap gap-2">
                                {[10, 15, 20, 30, 45, 60].map((minutes) => (
                                  <button
                                    key={minutes}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        dailyMinutes: minutes,
                                        endDate: prev.autoSchedule
                                          ? calculateAutoEndDate(
                                            prev.selectedBooks,
                                            prev.startDate,
                                            prev.targetChaptersPerDay,
                                            "time",
                                            minutes,
                                            prev.readingWpm,
                                          )
                                          : prev.endDate,
                                      }))
                                    }
                                    className={cn(
                                      "discipleos-control--compact border px-3 py-1.5 text-xs",
                                      form.dailyMinutes === minutes
                                        ? "border-[#D4A017]/50 bg-[#D4A017]/15 text-[#F4D77A]"
                                        : "border-white/10 bg-white/5 text-white/70",
                                    )}
                                  >
                                    {minutes}m
                                  </button>
                                ))}
                                <label className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Custom"
                                    value={customMinutes}
                                    onChange={(e) => {
                                      const digitsOnly = e.target.value.replace(/\D/g, "");
                                      setCustomMinutes(digitsOnly);
                                      if (!digitsOnly) return;
                                      const minutes = Math.min(240, Number(digitsOnly));
                                      setForm((prev) => ({
                                        ...prev,
                                        dailyMinutes: minutes,
                                        endDate:
                                          prev.autoSchedule && minutes >= 5
                                            ? calculateAutoEndDate(
                                              prev.selectedBooks,
                                              prev.startDate,
                                              prev.targetChaptersPerDay,
                                              "time",
                                              minutes,
                                              prev.readingWpm,
                                            )
                                            : prev.endDate,
                                      }));
                                    }}
                                    onBlur={() => {
                                      if (!customMinutes || Number(customMinutes) < 5) setCustomMinutes("");
                                    }}
                                    className="discipleos-control--compact h-9 w-20 border border-white/10 bg-black/30 px-2 text-sm outline-none placeholder:text-white/30"
                                  />
                                  <span className="discipleos-meta-copy text-xs">min</span>
                                </label>
                              </div>
                            </div>
                          ) : (
                            <label className="mt-3 flex items-center gap-3 text-sm">
                              <span className="discipleos-meta-copy text-xs">Chapters per day</span>
                              <input
                                type="number"
                                min="0.5"
                                max="20"
                                step="0.5"
                                value={form.targetChaptersPerDay}
                                onChange={(e) => {
                                  const target = Number(e.target.value) || 2.5;
                                  setForm((prev) => ({
                                    ...prev,
                                    targetChaptersPerDay: target,
                                    endDate: prev.autoSchedule
                                      ? calculateAutoEndDate(
                                        prev.selectedBooks,
                                        prev.startDate,
                                        target,
                                        "chapters",
                                        prev.dailyMinutes,
                                        prev.readingWpm,
                                      )
                                      : prev.endDate,
                                  }));
                                }}
                                className="discipleos-control--compact h-10 w-24 border border-white/10 bg-black/30 px-3 outline-none"
                              />
                            </label>
                          )}
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-medium text-white">Reading speed</div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "relaxed", label: "Relaxed", detail: "140 wpm", wpm: 140 },
                              { key: "standard", label: "Standard", detail: "200 wpm", wpm: 200 },
                              { key: "fast", label: "Fast", detail: "275 wpm", wpm: 275 },
                              { key: "custom", label: "Custom", detail: "Set minutes/chapter", wpm: null },
                            ].map((pace) => (
                              <button
                                key={pace.key}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    readingPaceMode: pace.key,
                                    readingWpm: pace.wpm || Math.max(40, Math.round(676 / (prev.readingCustomMinutesPerChapter || 5))),
                                    endDate:
                                      prev.autoSchedule
                                        ? calculateAutoEndDate(
                                          prev.selectedBooks,
                                          prev.startDate,
                                          prev.targetChaptersPerDay,
                                          prev.paceMode,
                                          prev.dailyMinutes,
                                          pace.wpm || Math.max(40, Math.round(676 / (prev.readingCustomMinutesPerChapter || 5))),
                                        )
                                        : prev.endDate,
                                  }))
                                }
                                className={cn(
                                  "discipleos-control--compact border px-3 py-2 text-left text-xs",
                                  form.readingPaceMode === pace.key
                                    ? "border-[#D4A017]/50 bg-[#D4A017]/15 text-[#F4D77A]"
                                    : "border-white/10 bg-white/5 text-white/70",
                                )}
                              >
                                <span className="block font-medium">{pace.label}</span>
                                <span className="mt-0.5 block opacity-70">{pace.detail}</span>
                              </button>
                            ))}
                          </div>
                          {form.readingPaceMode === "custom" ? (
                            <label className="mt-3 flex items-center gap-3 text-sm">
                              <span className="discipleos-meta-copy text-xs">Minutes per chapter</span>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                step="1"
                                value={form.readingCustomMinutesPerChapter || ""}
                                onChange={(e) => {
                                  const minutes = Math.min(60, Math.max(1, Number(e.target.value) || 1));
                                  const wpm = Math.max(40, Math.round(676 / minutes));
                                  setForm((prev) => ({
                                    ...prev,
                                    readingCustomMinutesPerChapter: minutes,
                                    readingWpm: wpm,
                                    endDate: prev.autoSchedule
                                      ? calculateAutoEndDate(
                                        prev.selectedBooks,
                                        prev.startDate,
                                        prev.targetChaptersPerDay,
                                        prev.paceMode,
                                        prev.dailyMinutes,
                                        wpm,
                                      )
                                      : prev.endDate,
                                  }));
                                }}
                                className="discipleos-control--compact h-10 w-24 border border-white/10 bg-black/30 px-3 outline-none"
                              />
                            </label>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-white">
                            <div className="mb-2 font-medium">Reading time of day</div>
                            <input
                              type="time"
                              value={form.readingTime}
                              onChange={(e) => setForm((prev) => ({ ...prev, readingTime: e.target.value }))}
                              className="discipleos-form-control w-full border border-white/10 bg-black/30 px-3 outline-none"
                            />
                          </label>
                          <label className="text-sm text-white">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span>Finish date</span>
                              <span className="text-xs text-[#F4D77A]">{form.autoSchedule ? "Suggested" : "Manual"}</span>
                            </div>
                            <input
                              type="date"
                              value={form.endDate}
                              onChange={(e) => setForm((prev) => ({ ...prev, autoSchedule: false, endDate: e.target.value }))}
                              className="discipleos-form-control w-full border border-white/10 bg-black/30 px-3 outline-none"
                            />
                            {!form.autoSchedule ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    autoSchedule: true,
                                    endDate: calculateAutoEndDate(
                                      prev.selectedBooks,
                                      prev.startDate,
                                      prev.targetChaptersPerDay,
                                      prev.paceMode,
                                      prev.dailyMinutes,
                                      prev.readingWpm,
                                    ),
                                  }))
                                }
                                className="mt-2 text-xs text-[#F4D77A] hover:text-white"
                              >
                                Use suggested date
                              </button>
                            ) : null}
                          </label>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                          <button
                            type="button"
                            onClick={() => selectJourney("custom")}
                            className="text-sm font-medium text-white hover:text-[#F4D77A]"
                          >
                            Custom plan
                          </button>
                          <p className="discipleos-secondary-copy mt-1 text-xs leading-5">
                            Named journeys and Mountain Rhythm remain available through their existing entry points.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {planCreationStep === 4 ? (
                <div data-testid="plan-create-step-4" className="grid gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      Name your plan
                    </h2>
                    <p className="discipleos-secondary-copy mt-1 text-sm leading-6">
                      We suggested a name based on your reading. Change it if you like.
                    </p>
                  </div>
                  <label className="text-sm text-white">
                    <div className="mb-2 font-medium">Plan name</div>
                    <input
                      data-testid="plan-create-name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      readOnly={form.journeyKey !== "custom"}
                      placeholder={getSuggestedPlanName(form)}
                      className="discipleos-form-control w-full border border-white/10 bg-white/5 px-4 outline-none placeholder:text-white/45"
                    />
                  </label>
                  <div className="border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    <span className="discipleos-meta-copy">Suggested name</span>
                    <span className="ml-2 font-medium text-[#F4D77A]">{getSuggestedPlanName(form)}</span>
                  </div>
                </div>
              ) : null}

              {planCreationStep === 5 ? (
                <div data-testid="plan-create-step-5" className="grid gap-5">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                      Review your plan
                    </h2>
                    <p className="discipleos-secondary-copy mt-1 text-sm leading-6">
                      Everything looks ready. You can still go back and change any choice.
                    </p>
                  </div>

                  <div data-testid="plan-create-review" className="grid gap-4">
                    <div className="border border-white/10 bg-white/[0.03] p-4">
                      <div className="discipleos-meta-copy text-xs">Plan</div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {form.name.trim() || getSuggestedPlanName(form)}
                      </div>
                      <div className="discipleos-secondary-copy mt-2 text-sm">
                        {form.selectedBooks.length} {form.selectedBooks.length === 1 ? "book" : "books"} ·{" "}
                        {form.selectedBooks.slice(0, 6).join(", ")}
                        {form.selectedBooks.length > 6 ? ` +${form.selectedBooks.length - 6} more` : ""}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="border-l border-white/10 pl-3">
                        <div className="discipleos-meta-copy text-xs">Daily pace</div>
                        <div className="mt-1 font-medium text-white">
                          {form.paceMode === "time" ? `${form.dailyMinutes} min` : `${form.targetChaptersPerDay} chapters`}
                        </div>
                      </div>
                      <div className="border-l border-white/10 pl-3">
                        <div className="discipleos-meta-copy text-xs">Starts</div>
                        <div className="mt-1 font-medium text-white">{formatDate(form.startDate)}</div>
                      </div>
                      <div className="border-l border-white/10 pl-3">
                        <div className="discipleos-meta-copy text-xs">Ends</div>
                        <div className="mt-1 font-medium text-white">{formatDate(planPreview.actualEndDate)}</div>
                      </div>
                      <div className="border-l border-white/10 pl-3">
                        <div className="discipleos-meta-copy text-xs">Length</div>
                        <div className="mt-1 font-medium text-white">{planPreview.totalDays} days</div>
                      </div>
                    </div>

                    <div className="discipleos-secondary-copy text-sm">
                      {planPreview.totalChapters} chapters · {formatMinutes(planPreview.totalMinutes)} total reading ·{" "}
                      {form.readingMode === "random" ? "Randomized" : "Consecutive"} · {formatTime(form.readingTime)}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  data-testid="plan-create-back"
                  onClick={() => (planCreationStep === 1 ? setActiveTab("plans") : setPlanCreationStep((step) => step - 1))}
                  className="discipleos-action border border-white/10 px-4 text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {planCreationStep === 1 ? "Cancel" : "Back"}
                </button>

                {planCreationStep < 5 ? (
                  <button
                    type="button"
                    data-testid="plan-create-next"
                    disabled={planCreationStep <= 2 && form.selectedBooks.length === 0}
                    onClick={() => setPlanCreationStep((step) => Math.min(5, step + 1))}
                    className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black hover:bg-[#D4A017] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="plan-create-submit"
                    onClick={createPlan}
                    disabled={form.selectedBooks.length === 0 || (form.journeyKey !== "custom" && !namedJourneysAccess)}
                    className="discipleos-action bg-[#C8921D] px-5 font-semibold text-black hover:bg-[#D4A017] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Create Plan
                  </button>
                )}
              </div>
            </SectionCard>
          </div>
        )}

         {activeTab === "calendar" && (
           <div data-testid="dashboard-calendar-content" className="discipleos-section-stack">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5">
                <div
                  data-testid="dashboard-calendar-activities"
                   className="discipleos-functional-surface order-1 min-w-0 space-y-4 p-4 lg:order-1 lg:space-y-5 sm:p-5"
                >
                  <div className="discipleos-section-heading mb-5">
                    <Calendar className="discipleos-section-heading__icon" />
                    Faith calendar
                  </div>
                  <section>
                     <div className="mb-2 flex min-w-0 items-center justify-between gap-3 sm:mb-3">
                      <div className="min-w-0">
                         <div className="text-sm font-medium text-white">Activities for {formatDate(selectedCalendarDate)}</div>
                          <div className="discipleos-meta-copy text-xs">
                            {selectedCalendarDate === todayISO() ? "Today" : "Selected day"}
                          </div>
                      </div>
                      <button
                        onClick={() => setSelectedCalendarDate(todayISO())}
                        className="shrink-0 text-xs text-white/60 hover:text-white"
                      >
                        Today
                      </button>
                    </div>

                     <div className="mb-5">
                       {!isEventFormOpen ? (
                         <button
                           type="button"
                           data-testid="calendar-add-event-control"
                           onClick={() => {
                             setEventSavedFeedback(null);
                             setIsEventFormOpen(true);
                           }}
                           className="discipleos-action inline-flex min-h-14 w-full items-center justify-between gap-3 border border-[#D4A017]/45 bg-[#211A0D]/85 px-4 text-left text-sm font-semibold text-[#F4D77A] hover:border-[#D4A017]/70 hover:bg-[#33280E]"
                         >
                           <span className="inline-flex min-w-0 items-center gap-2">
                             <Plus className="h-5 w-5 shrink-0" />
                             <span>
                               <span className="block">Add Activity</span>
                               <span className="mt-0.5 block text-xs font-normal text-[#F4D77A]/65">A short guided flow</span>
                             </span>
                           </span>
                           <ChevronDown className="h-4 w-4 shrink-0" />
                         </button>
                       ) : (
                         renderEventCreationFlow()
                       )}
                     </div>

                     {eventSavedFeedback ? (
                       <div data-testid="calendar-activity-feedback" role="status" className="border border-emerald-400/25 bg-emerald-500/10 p-4">
                         <div className="flex items-start gap-3">
                           <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                           <div className="min-w-0">
                             <div className="font-medium text-emerald-100">
                               {eventSavedFeedback.mode === "added" ? "Activity added" : "Activity updated"}
                             </div>
                             <div className="mt-1 truncate text-sm text-emerald-100/75">
                               {eventSavedFeedback.title} · {formatDate(eventSavedFeedback.date)}
                             </div>
                           </div>
                         </div>
                         <div className="mt-3 flex flex-wrap gap-2 pl-8">
                           <button
                             type="button"
                             onClick={() => {
                               const savedEvent = events.find((event) => event.id === eventSavedFeedback.id);
                               if (savedEvent) beginEditEvent(savedEvent);
                             }}
                             className="discipleos-control--compact border border-emerald-300/25 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-400/10"
                           >
                             Edit activity
                           </button>
                           <button
                             type="button"
                             onClick={() =>
                               toggleEventComplete({
                                 id: eventSavedFeedback.id,
                                 date: eventSavedFeedback.date,
                                 type: eventSavedFeedback.type,
                               })
                             }
                             className="discipleos-control--compact border border-emerald-300/25 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-400/10"
                           >
                             Complete activity
                           </button>
                           <button
                             type="button"
                             onClick={() => {
                               setEventSavedFeedback(null);
                               resetEventForm();
                               setIsEventFormOpen(true);
                             }}
                             className="discipleos-control--compact border border-white/10 px-3 py-2 text-xs text-white/75 hover:bg-white/10 hover:text-white"
                           >
                             Add another
                           </button>
                            <button
                              type="button"
                              onClick={() => setEventSavedFeedback(null)}
                              className="discipleos-control--compact border border-white/10 px-3 py-2 text-xs text-white/75 hover:bg-white/10 hover:text-white"
                            >
                              Done
                            </button>
                         </div>
                       </div>
                     ) : null}

                     <div data-testid="calendar-items-list" className="space-y-5">
                       {dayViewItems.some((event) => event.kind === "plan") ? (
                         <div>
                           <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F4D77A]/75">
                             <BookOpen className="h-3.5 w-3.5" />
                             Reading
                           </div>
                           <div className="discipleos-flat-list">
                             {dayViewItems.filter((event) => event.kind === "plan").map(renderCalendarItem)}
                           </div>
                         </div>
                       ) : null}
                       {dayViewItems.some((event) => event.kind !== "plan") ? (
                         <div>
                           <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                             <Calendar className="h-3.5 w-3.5" />
                             Activities
                           </div>
                           <div className="discipleos-flat-list">
                             {dayViewItems.filter((event) => event.kind !== "plan").map(renderCalendarItem)}
                           </div>
                         </div>
                       ) : null}
                       {dayViewItems.length === 0 ? (
                         <div className="discipleos-empty-state text-sm">
                           No activities for this day yet.
                         </div>
                       ) : null}
                     </div>

                  </section>

                </div>

                  <section data-testid="dashboard-calendar-month" className="discipleos-functional-surface order-2 min-w-0 self-start p-4 sm:p-5 lg:order-2">
                    <div className="discipleos-section-heading mb-5">
                      <Calendar className="discipleos-section-heading__icon" />
                      Month overview
                    </div>
                    <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="discipleos-control--compact border border-white/10 px-3 py-2 text-sm hover:border-[#D4A017]/30 hover:bg-[#D4A017]/10 hover:text-[#F4D77A]"
                    >
                      Prev
                    </button>
                     <div className="min-w-0 text-center text-sm font-medium">{formatMonthLabel(calendarMonth)}</div>
                    <button
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="discipleos-control--compact border border-white/10 px-3 py-2 text-sm hover:border-[#D4A017]/30 hover:bg-[#D4A017]/10 hover:text-[#F4D77A]"
                    >
                      Next
                    </button>
                  </div>

                   <div className="discipleos-meta-copy mb-2 grid grid-cols-7 gap-2 text-center text-xs">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
                      <div key={`${d}-${index}`}>{d}</div>
                    ))}
                  </div>

                   <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {monthDays.map((day) => {
                      const iso = toISODate(day);
                      const dayEvents = monthEventMap[iso] || [];
                      const hasEvents = dayEvents.length > 0;
                      const activityMarkers = getCalendarActivityMarkers(dayEvents, eventCompletions);
                      const selected = iso === selectedCalendarDate;
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                      const isToday = iso === todayISO();
                       const markerLabels = activityMarkers.map((marker) => marker.label);
                      return (
                        <button
                          key={iso}
                          onClick={() => setSelectedCalendarDate(iso)}
                          aria-label={`${formatDate(iso)}${markerLabels.length ? `, ${markerLabels.join(", ")}` : hasEvents ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}${selected ? ", selected" : ""}`}
                          data-testid={`calendar-day-${iso}`}
                          className={cn(
                             "relative min-h-[52px] rounded-md p-1.5 text-left transition sm:min-h-[72px] sm:p-2.5 lg:min-h-[88px]",
                             activityMarkers.length > 2 && "min-h-[84px]",
                            selected && "bg-[#D4A017]/20 ring-1 ring-[#D4A017]/50",
                            !selected && "hover:bg-white/5",
                            hasEvents && "border border-white/10",
                            !hasEvents && "border border-transparent",
                            !isCurrentMonth && "opacity-45"
                          )}
                        >
                           <span className={cn("relative z-10 block text-sm", isToday && "font-semibold text-[#D4A017]")}>{day.getDate()}</span>
                          {activityMarkers.length > 0 ? (
                            <span
                              className="absolute bottom-0.5 left-1.5 right-1.5 flex max-w-full flex-wrap items-center gap-x-0.5 gap-y-0 text-[9px] font-bold leading-[10px] tracking-[0.06em] text-[#F4D77A] sm:bottom-2.5 sm:left-2.5 sm:right-2.5 sm:gap-x-1 sm:text-[10px] sm:leading-3 sm:tracking-[0.08em]"
                              aria-hidden="true"
                            >
                              {activityMarkers.map((marker) => (
                                <span
                                  key={marker.key}
                                   data-testid={`calendar-marker-${iso}-${marker.key === "bible" || marker.key === "mountain" ? marker.key : marker.letter}`}
                                   className={cn(
                                     "inline-flex max-w-full shrink-0 items-center",
                                     marker.completed && "text-emerald-400",
                                   )}
                                >
                                  {marker.key === "bible" ? (
                                    <BookOpen className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={2.25} />
                                   ) : marker.key === "mountain" ? (
                                     <Mountain className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={2.25} />
                                  ) : (
                                    marker.letter
                                  )}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
        )}

         {activeTab === "plans" && (
             <div className={cn(
             "discipleos-section-stack grid min-w-0",
             planViewPlans.length > 0 && "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]",
           )}>
             <div
               data-testid="dashboard-plans-list"
                className={cn(
                  "discipleos-functional-surface min-w-0 space-y-5 p-4 sm:p-5",
                  planViewPlans.length === 0 && "lg:max-w-3xl",
                )}
             >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="discipleos-section-heading">
                      <BookMarked className="discipleos-section-heading__icon" />
                      Planned reading
                    </div>
                    <button
                      type="button"
                      data-testid="plans-create-button"
                      onClick={beginCreatePlan}
                      className="discipleos-action inline-flex items-center justify-center gap-2 border border-[#D4A017]/45 bg-[#C8921D] px-3 py-2 text-sm font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px"
                    >
                      <Plus className="h-4 w-4" />
                      Add plan
                    </button>
                  </div>

                  {planCreatedFeedback ? (
                    <div
                      data-testid="plan-created-feedback"
                      role="status"
                      aria-live="polite"
                      className="border border-emerald-400/30 bg-emerald-500/10 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium text-emerald-200">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Plan created
                          </div>
                          <div className="mt-1 truncate text-sm text-white/75">
                            {planCreatedFeedback.name} is ready for your daily reading.
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            data-testid="plan-created-view-today"
                            onClick={() => {
                              setPlanCreatedFeedback(null);
                              setActiveTab("today");
                            }}
                            className="discipleos-control--compact border border-emerald-300/35 bg-emerald-300/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-300/25"
                          >
                            View Today’s Walk
                          </button>
                          <button
                            type="button"
                            data-testid="plan-created-go-plans"
                            onClick={() => setPlanCreatedFeedback(null)}
                            className="discipleos-control--compact border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                          >
                            Go to Plans
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="discipleos-flat-list">
                  {planViewPlans.length === 0 ? (
                   <div
                     data-testid="dashboard-plans-empty-state"
                     className="discipleos-empty-state flex min-w-0 flex-wrap items-center justify-between gap-4 text-sm"
                   >
                       <div className="min-w-0 flex-1">
                         <div className="font-medium text-white">No reading plans yet.</div>
                         <div className="mt-1">Create a plan to start building your daily rhythm.</div>
                       </div>
                       <button
                         type="button"
                         data-testid="plans-empty-create-button"
                         onClick={beginCreatePlan}
                         className="discipleos-action inline-flex shrink-0 items-center justify-center border border-[#D4A017]/45 bg-[#C8921D] px-4 text-sm font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px"
                       >
                         Create a plan
                       </button>
                    </div>
                  ) : (
                    planViewPlans.map((plan) => {
                      const stats = getPlanStats(plan);
                      const isActive = planViewSelectedPlan?.id === plan.id;

                      return (
                        <div
                          key={plan.id}
                          data-testid={`planned-reading-card-${plan.id}`}
                          onClick={() => setSelectedPlanId(plan.id)}
                            className={cn(
                              "discipleos-flat-row discipleos-safe-text w-full py-4 text-left transition first:border-t-0",
                            isActive
                              ? "border-[#D4A017]/40 bg-[#D4A017]/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          )}
                        >
                           <div className="flex min-w-0 items-start justify-between gap-3">
                             <div className="min-w-0 flex-1">
                               <div className="discipleos-safe-text text-lg font-semibold text-white">
                                {plan.name}
                              </div>

                                <div className="discipleos-secondary-copy mt-2 text-sm">
                                {formatDate(plan.startDate)} – {formatDate(plan.endDate)}
                              </div>

                               <div className="discipleos-safe-text mt-2 text-xs leading-5 text-white/55">
                                {isResetPlan(plan)
                                  ? "20-day Reset"
                                  : isNamedJourneyPlan(plan)
                                    ? `${plan.journeyDays}-day journey`
                                    : `${plan.selectedBooks.length} ${plan.selectedBooks.length === 1 ? "book" : "books"}`}
                                {" · "}
                                {stats.totalChapters} chapters · {stats.totalDays} days · {formatMinutes(stats.totalMinutes)} total
                                {" · "}
                                {plan.readingMode === "random" ? "Randomized" : "Consecutive"} · {formatTime(plan.readingTime || "07:00")}
                                <span className="ml-2 text-[#F4D77A]">{stats.percent}% complete</span>
                              </div>
                            </div>

                             <div className="flex shrink-0 items-center gap-2">
                              {!isResetPlan(plan) && !isNamedJourneyPlan(plan) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    beginEditPlan(plan);
                                  }}
                                  className="discipleos-control--icon border border-white/10 p-2 text-white/45 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePlan(plan.id);
                                }}
                                className="discipleos-control--icon border border-white/10 p-2 text-white/45 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
            </div>

              {planViewPlans.length > 0 && (
                <div data-testid="dashboard-plan-details" className="discipleos-functional-surface min-w-0 space-y-5 p-4 sm:p-5">
              <div>
                {planViewSelectedPlan ? (
                  <>
                          <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
                       <div className="min-w-0 flex-1">
                          <div className="discipleos-safe-text text-2xl font-semibold tracking-[-0.03em] text-white">
                          {planViewSelectedPlan.name}
                        </div>
                         <h2 className="discipleos-section-heading mt-3">
                           <BookOpen className="discipleos-section-heading__icon" />
                          Plan details
                        </h2>
                          <p className="discipleos-secondary-copy discipleos-safe-text mt-1 text-sm">{planViewSelectedPlan.selectedBooks.join(", ")}</p>
                           <div className="discipleos-secondary-copy discipleos-safe-text mt-3 text-sm">
                           {planViewSelectedPlan.readingMode === "random" ? "Randomized reading order" : "Consecutive reading order"} · {planViewSelectedPlan.dailyMinutes} min/day
                        </div>
                      </div>
                      {planViewStats && (
                             <div className="min-w-[8rem] shrink-0 border-l border-[#D4A017]/35 pl-4 text-right">
                            <div className="discipleos-meta-copy text-sm">
                             {isResetPlan(planViewSelectedPlan) ? "Reset progress" : "Progress"}
                           </div>
                           <div className="mt-1 text-3xl font-semibold text-[#F4D77A]">
                             {isResetPlan(planViewSelectedPlan)
                               ? `${planViewStats.completedDays}/${planViewStats.totalDays}`
                               : `${planViewStats.percent}%`}
                           </div>
                            <div className="discipleos-meta-copy mt-1 text-xs">
                             {isResetPlan(planViewSelectedPlan) ? "days complete" : "chapters complete"}
                           </div>
                           <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                             <div
                               className="h-full rounded-full bg-[#D4A017]"
                               style={{
                                 width: `${isResetPlan(planViewSelectedPlan)
                                   ? Math.round((planViewStats.completedDays / Math.max(1, planViewStats.totalDays)) * 100)
                                   : planViewStats.percent}%`,
                               }}
                             />
                           </div>
                        </div>
                      )}
                    </div>

                    {editingPlan && editingPlan.id === planViewSelectedPlan.id ? (
                      <div data-testid="dashboard-plan-edit-form" className="mb-5 border-t border-white/10 pt-5">
                         <div className="discipleos-section-heading mb-3">
                          <Pencil className="h-5 w-5" />
                          Edit plan
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                             className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 outline-none"
                            placeholder="Plan name"
                          />
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                               <div className="discipleos-meta-copy mb-1 text-xs">Start date</div>
                              <input
                                type="date"
                                value={editForm.startDate}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                                 className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 outline-none"
                              />
                            </div>
                            <div>
                               <div className="discipleos-meta-copy mb-1 text-xs">End date</div>
                              <input
                                type="date"
                                value={editForm.endDate}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                                 className="discipleos-form-control w-full border border-white/10 bg-black/40 px-4 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        {/* Pace mode */}
                         <div className="mt-3 border-t border-white/10 pt-3 text-sm text-[#F8FAFC]">
                          <div className="mb-2 font-medium">Daily reading budget</div>
                          <div className="mb-3 flex gap-2">
                            {["time", "chapters"].map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setEditForm((prev) => ({ ...prev, paceMode: mode }))}
                                className={cn(
                                   "discipleos-control--compact border px-3 py-1.5 text-xs transition",
                                  editForm.paceMode === mode
                                    ? "border-[#D4A017]/40 bg-[#D4A017]/15 text-[#F4D77A]"
                                    : "border-white/10 bg-white/5 text-white/70"
                                )}
                              >
                                {mode === "time" ? "By time" : "By chapters"}
                              </button>
                            ))}
                          </div>

                          {editForm.paceMode === "time" ? (
                            <div>
                               <div className="discipleos-field-label mb-2 text-xs">How many minutes can you read each day?</div>
                              <div className="flex flex-wrap gap-2">
                                {[10, 15, 20, 30, 45, 60].map((mins) => (
                                  <button
                                    key={mins}
                                    onClick={() => setEditForm((prev) => ({ ...prev, dailyMinutes: mins }))}
                                    className={cn(
                                       "discipleos-control--compact border px-3 py-2 text-sm transition",
                                      editForm.dailyMinutes === mins
                                        ? "border-[#D4A017]/40 bg-[#D4A017]/20 text-[#F4D77A]"
                                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                                    )}
                                  >
                                    {mins}m
                                  </button>
                                ))}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="5"
                                    max="240"
                                    step="5"
                                    placeholder="Custom"
                                    value={[5, 10, 15, 20, 30, 45, 60].includes(editForm.dailyMinutes) ? "" : editForm.dailyMinutes}
                                    onChange={(e) => {
                                      const rawValue = e.target.value;
                                      const mins = rawValue === "" ? 5 : Number(rawValue);
                                      setEditForm((prev) => ({ ...prev, dailyMinutes: mins }));
                                    }}
                                     className="discipleos-control--compact h-9 w-20 border border-white/10 bg-black/30 px-2 text-sm outline-none placeholder:text-white/30"
                                  />
                                   <span className="discipleos-meta-copy text-xs">min</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                               <label className="discipleos-field-label text-xs">Chapters per day</label>
                              <input
                                type="number"
                                min="0.5"
                                max="20"
                                step="0.5"
                                value={editForm.targetChaptersPerDay}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, targetChaptersPerDay: Number(e.target.value) || 2.5 }))}
                                 className="discipleos-control--compact h-10 w-24 border border-white/10 bg-black/30 px-3 outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* Alarm time */}
                        <label className="mt-3 block border-t border-white/10 pt-3 text-sm text-[#F8FAFC]">
                          <div className="mb-2">Reading time</div>
                          <input
                            type="time"
                            value={editForm.readingTime}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, readingTime: e.target.value }))}
                             className="discipleos-form-control w-full border border-white/10 bg-black/30 px-3 outline-none"
                          />
                        </label>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setEditForm((prev) => ({ ...prev, readingMode: "consecutive" }))}
                            className={cn(
                               "discipleos-choice-row px-2 py-3 text-left transition",
                              editForm.readingMode === "consecutive"
                                ? "border-white/30 bg-[#C8921D] text-black"
                                 : "text-[#F8FAFC]"
                            )}
                          >
                            <div className="font-medium">Consecutive</div>
                            <div className="text-xs opacity-75">Read in order</div>
                          </button>
                          <button
                            onClick={() => setEditForm((prev) => ({ ...prev, readingMode: "random" }))}
                            className={cn(
                               "discipleos-choice-row px-2 py-3 text-left transition",
                              editForm.readingMode === "random"
                                ? "border-white/30 bg-[#C8921D] text-black"
                                 : "text-[#F8FAFC]"
                            )}
                          >
                            <div className="font-medium">Randomized</div>
                            <div className="text-xs opacity-75">Shuffle chapters</div>
                          </button>
                        </div>
                        {editPreview && (
                          <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                            <div className="mb-2 font-medium text-[#F8FAFC]">Updated plan summary</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>Total chapters: <span className="text-white">{editPreview.totalChapters}</span></div>
                              <div>Total reading time: <span className="text-white">{formatMinutes(editPreview.totalMinutes)}</span></div>
                              <div>Plan length: <span className="text-white">{editPreview.totalDays} days</span></div>
                              <div>Daily: <span className="text-white">~{formatMinutes(editPreview.minsPerDay)} · {editPreview.minPerDay === editPreview.maxPerDay ? `${editPreview.maxPerDay} ch` : `${editPreview.minPerDay}–${editPreview.maxPerDay} ch`}</span></div>
                            </div>
                          </div>
                        )}
                         <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                           <button onClick={savePlanEdit} className="discipleos-action bg-[#C8921D] px-4 font-medium text-black">Save changes</button>
                           <button onClick={cancelPlanEdit} className="discipleos-action border border-white/10 px-4 text-[#F8FAFC]">Cancel</button>
                        </div>
                      </div>
                    ) : null}

                      {planViewStats && (
                      <>
                          {isResetPlan(planViewSelectedPlan) ? (
                            <div className="mb-5 border-l-2 border-[#D4A017]/45 pl-4 text-sm text-[#F4D77A]">
                              {planViewStats.completedDays === planViewStats.totalDays
                                ? `${planViewStats.totalDays} of ${planViewStats.totalDays} Reset days complete.`
                                : `Day ${planViewStats.completedDays + 1} of ${planViewStats.totalDays} is next.`}
                            <span className="discipleos-secondary-copy ml-2">
                                Chapter progress: {planViewStats.percent}%.
                             </span>
                           </div>
                         ) : null}
                          <div className="mb-5 grid min-w-0 gap-x-4 gap-y-4 border-y border-white/10 py-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="min-w-0 border-l border-white/10 pl-3">
                             <div className="text-sm text-white/70">Pace</div>
                                <div data-testid="plan-pace-value" className="mt-1 text-xl font-semibold">{getPlanPaceLabel(planViewSelectedPlan)}</div>
                                <div data-testid="plan-pace-speed" className="discipleos-meta-copy text-xs">{getPlanPaceWpm(planViewSelectedPlan)} wpm</div>
                           </div>
                            <div className="min-w-0 border-l border-white/10 pl-3">
                             <div className="text-sm text-white/70">Time</div>
                              <div className="mt-1 text-xl font-semibold">{formatMinutes(planViewStats.totalMinutes)}</div>
                              <div className="discipleos-meta-copy text-xs">total reading time</div>
                           </div>
                            <div className="min-w-0 border-l border-white/10 pl-3">
                             <div className="text-sm text-white/70">Timeline</div>
                              <div className="mt-1 text-xl font-semibold">{planViewStats.totalDays} days</div>
                               <div className="discipleos-meta-copy text-xs">{planViewStats.completedDays} complete</div>
                           </div>
                            <div className="min-w-0 border-l border-[#D4A017]/40 pl-3">
                             <div className="text-sm text-white/70">Remaining</div>
                              <div className="mt-1 text-xl font-semibold text-[#F4D77A]">{planViewStats.remainingChapters} chapters</div>
                               <div className="discipleos-meta-copy text-xs">~{planViewStats.neededPerRemainingDay.toFixed(2)} per day</div>
                           </div>
                         </div>

                        <div className={cn(
                           "mb-5 border-l-2 pl-4",
                           planViewStats.onTrack ? "border-[#10B981]/40" : "border-[#F59E0B]/40"
                        )}>
                          <div className="flex items-center gap-2 font-medium">
                            {planViewStats.onTrack ? (
                              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                            ) : (
                              <Clock3 className="h-4 w-4 text-[#F59E0B]" />
                            )}
                            <span>
                              {planViewStats.onTrack
                                ? "On track to finish on time"
                                : "Current pace is behind the target timeline"}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-white/70">
                            {planViewStats.onTrack
                              ? `Keep averaging about ${planViewStats.neededPerRemainingDay.toFixed(2)} chapters per remaining day to finish by ${formatDate(planViewSelectedPlan.endDate)}.`
                              : `To finish by ${formatDate(planViewSelectedPlan.endDate)}, this plan now needs about ${planViewStats.neededPerRemainingDay.toFixed(2)} chapters per remaining day.`}
                          </div>
                        </div>
                       </>
                    )}

                    <div className="space-y-3">
                        {planViewSelectedPlan.assignments.map((day, dayIndex) => {
                          const completedMap = getCompletedMap(planViewSelectedPlan);
                          const dayComplete =
                            day.readings.length > 0 &&
                            day.readings.every((reading) => Boolean(completedMap[reading.key]));

                          return (
                          <div key={day.date} className="border-t border-white/10 py-4 first:border-t-0 first:pt-0">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                               <div className="text-sm text-[#F4D77A]">
                                  {isResetPlan(planViewSelectedPlan) ? `Day ${dayIndex + 1} of ${planViewSelectedPlan.assignments.length} · ` : ""}
                                 {formatDate(day.date)}
                               </div>
                              <div className="discipleos-meta-copy mt-1 flex items-center gap-1 text-xs">
                                <Clock3 className="h-3.5 w-3.5 text-[#D4A017]/70" />
                                Reading time: {formatTime(planViewSelectedPlan.readingTime || "07:00")}
                              </div>
                               <div className="mt-2 text-sm font-medium text-white/70">
                                {day.readings.length} chapter{day.readings.length === 1 ? "" : "s"} · ~{formatMinutes(getAssignmentMinutes(day))}
                              </div>
                            </div>
                            <button
                              type="button"
                              data-testid={`button-complete-plan-day-${dayIndex + 1}`}
                               onClick={() => markDayPlanComplete(planViewSelectedPlan.id, day.date)}
                              disabled={dayComplete}
                              aria-label={dayComplete ? "Day complete" : "Complete day"}
                              className={cn(
                                "discipleos-control--compact inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition",
                                dayComplete
                                  ? "cursor-default border-[#10B981]/35 bg-[#10B981]/10 text-[#86EFAC]"
                                  : "border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D77A] hover:border-[#D4A017]/60 hover:bg-[#D4A017]/20",
                              )}
                            >
                              {dayComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                              {dayComplete ? "Day complete" : "Complete day"}
                            </button>
                          </div>
                           <div className="discipleos-flat-list grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {day.readings.map((reading) => {
                              const done = !!completedMap[reading.key];
                              return (
                                <button
                                  key={reading.key}
                                  data-testid={`plan-reading-${reading.key}`}
                                   onClick={() => toggleChapterComplete(planViewSelectedPlan.id, reading.key)}
                                  className={cn(
                                     "discipleos-flat-row flex items-center justify-between px-3 py-3 text-left transition",
                                    done
                                      ? "border-[#10B981]/30 bg-[#10B981]/10"
                                      : "border-white/10 bg-transparent hover:bg-white/[0.04]"
                                  )}
                                >
                                  <div>
                                   <div className="discipleos-safe-text font-medium">{reading.label || reading.book}</div>
                                    {reading.chapter ? (
                                      <div className="discipleos-meta-copy text-sm">Chapter {reading.chapter}</div>
                                    ) : null}
                                  </div>
                                  {done ? <CheckCircle2 className="h-5 w-5 text-[#10B981]" /> : <Circle className="h-5 w-5 text-white/35" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                          );
                        })}
                    </div>
                  </>
                ) : null}
              </div>
             </div>
             )}
          </div>
        )}

        {isBookPickerOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center"
            onClick={() => setIsBookPickerOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="custom-book-picker-title"
              className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col border border-white/15 bg-[#0B1115] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
                <div>
                  <h2 id="custom-book-picker-title" className="text-lg font-semibold text-white">
                    Choose books
                  </h2>
                  <p className="discipleos-secondary-copy mt-1 text-sm leading-5">
                    Select the books you want in this custom plan.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close book picker"
                  onClick={() => setIsBookPickerOpen(false)}
                  className="discipleos-control--icon border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                {(["OT", "NT"] as const).map((testament) => (
                  <section key={testament} className={cn(testament === "NT" && "mt-5")}>
                    <div className="discipleos-field-label mb-2 text-xs">
                      {testament === "OT" ? "Old Testament" : "New Testament"}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BIBLE_BOOKS.filter((book) => book.testament === testament).map((book) => {
                        const active = form.selectedBooks.includes(book.name);
                        return (
                          <button
                            key={book.name}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleBook(book.name)}
                            className={cn(
                              "flex items-center justify-between border px-3 py-2.5 text-left text-sm transition",
                              active
                                ? "border-[#D4A017]/45 bg-[#D4A017]/12 text-[#F4D77A]"
                                : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.08]",
                            )}
                          >
                            <span>{book.name}</span>
                            <span className="text-xs opacity-60">{book.chapters} ch</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="discipleos-secondary-copy text-sm">
                  {form.selectedBooks.length}{" "}
                  {form.selectedBooks.length === 1 ? "book" : "books"} selected
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookPickerOpen(false)}
                  className="discipleos-action bg-[#C8921D] px-5 font-medium text-black hover:bg-[#D4A017]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div >
  );
}
