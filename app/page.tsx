// @ts-nocheck
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const InstallButton = dynamic(() => import("./install-button"), { ssr: false });
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
  Sun,
  Target,
  Flame,
  Bookmark,
  LayoutDashboard,
  ChevronDown,
  X,
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

const PRESET_30_DAY_PLAN = {
  id: "plan-30day-consistency-reset",
  name: "30-Day Consistency Reset",
  description: "New Testament + Proverbs + Psalms daily structure to build consistency.",
  readings: [
    { day: 1, items: ["Matthew 1-2", "Proverbs 1", "Psalm 1"] },
    { day: 2, items: ["Matthew 3-4", "Proverbs 2", "Psalm 2"] },
    { day: 3, items: ["Matthew 5-6", "Proverbs 3", "Psalm 3"] },
    { day: 4, items: ["Matthew 7-8", "Proverbs 4", "Psalm 4"] },
    { day: 5, items: ["Matthew 9-10", "Proverbs 5", "Psalm 5"] },
    { day: 6, items: ["Matthew 11-12", "Proverbs 6", "Psalm 6"] },
    { day: 7, items: ["Matthew 13", "Proverbs 7", "Psalm 7"] },
    { day: 8, items: ["Matthew 14-15", "Proverbs 8", "Psalm 8"] },
    { day: 9, items: ["Matthew 16-17", "Proverbs 9", "Psalm 9"] },
    { day: 10, items: ["Matthew 18-19", "Proverbs 10", "Psalm 10"] },

    { day: 11, items: ["Matthew 20-21", "Proverbs 11", "Psalm 11"] },
    { day: 12, items: ["Matthew 22-23", "Proverbs 12", "Psalm 12"] },
    { day: 13, items: ["Matthew 24-25", "Proverbs 13", "Psalm 13"] },
    { day: 14, items: ["Matthew 26", "Proverbs 14", "Psalm 14"] },
    { day: 15, items: ["Matthew 27-28", "Proverbs 15", "Psalm 15"] },
    { day: 16, items: ["Acts 1-2", "Proverbs 16", "Psalm 16"] },
    { day: 17, items: ["Acts 3-4", "Proverbs 17", "Psalm 17"] },
    { day: 18, items: ["Acts 5-6", "Proverbs 18", "Psalm 18"] },
    { day: 19, items: ["Acts 7", "Proverbs 19", "Psalm 19"] },
    { day: 20, items: ["Acts 8-9", "Proverbs 20", "Psalm 20"] },

    { day: 21, items: ["Romans 1-2", "Proverbs 21", "Psalm 21"] },
    { day: 22, items: ["Romans 3-4", "Proverbs 22", "Psalm 22"] },
    { day: 23, items: ["Romans 5-6", "Proverbs 23", "Psalm 23"] },
    { day: 24, items: ["Romans 7-8", "Proverbs 24", "Psalm 24"] },
    { day: 25, items: ["Romans 9-10", "Proverbs 25", "Psalm 25"] },
    { day: 26, items: ["Romans 11-12", "Proverbs 26", "Psalm 26"] },
    { day: 27, items: ["Romans 13-14", "Proverbs 27", "Psalm 27"] },
    { day: 28, items: ["Romans 15-16", "Proverbs 28", "Psalm 28"] },
    { day: 29, items: ["James 1-3", "Proverbs 29", "Psalm 29"] },
    { day: 30, items: ["James 4-5", "Proverbs 30", "Psalm 30"] }
  ]
};

const PRESETS = {
  psalmsProverbs: ["Psalms", "Proverbs"],
  oldTestament: BIBLE_BOOKS.filter((b) => b.testament === "OT").map((b) => b.name),
  newTestament: BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => b.name),
  wholeBible: BIBLE_BOOKS.map((b) => b.name),
};

const VERSES_OF_THE_DAY = [
  {
    reference: "Lamentations 3:22-23",
    text: "Because of the Lord’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
  },
  {
    reference: "Psalm 119:105",
    text: "Your word is a lamp for my feet, a light on my path.",
  },
  {
    reference: "Joshua 1:8",
    text: "Keep this Book of the Law always on your lips; meditate on it day and night, so that you may be careful to do everything written in it.",
  },
  {
    reference: "Matthew 6:33",
    text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
  },
  {
    reference: "Philippians 4:6-7",
    text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
  },
  {
    reference: "Isaiah 40:31",
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
  },
];

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDaysInclusive(start: string, end: string) {
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function expandChapters(selectedBooks: string[]) {
  const result: any[] = [];
  for (const bookName of selectedBooks) {
    const book = BIBLE_BOOKS.find((b) => b.name === bookName);
    if (!book) continue;
    for (let ch = 1; ch <= book.chapters; ch++) {
      result.push({
        book: book.name,
        chapter: ch,
        key: `${book.name}-${ch}`,
      });
    }
  }
  return result;
}

function seededShuffle(items: any[], seedString: string) {
  const arr = [...items];
  let seed =
    Array.from(seedString).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1;

  function next() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function buildSchedule(
  selectedBooks: string[],
  startDate: string,
  endDate: string,
  readingMode = "consecutive"
) {
  const rawChapters = expandChapters(selectedBooks);
  const chapters =
    readingMode === "random"
      ? seededShuffle(
          rawChapters,
          `${selectedBooks.join("|")}-${startDate}-${endDate}`
        )
      : rawChapters;

  const days = Math.max(1, diffDaysInclusive(startDate, endDate));
  const assignments: any[] = [];

  for (let i = 0; i < days; i++) {
    assignments.push({
      date: addDays(startDate, i),
      readings: [],
    });
  }

  const basePerDay = Math.floor(chapters.length / days);
  const remainder = chapters.length % days;
  let cursor = 0;

  for (let i = 0; i < days; i++) {
    const count = basePerDay + (i < remainder ? 1 : 0);
    assignments[i].readings = chapters.slice(cursor, cursor + count);
    cursor += count;
  }

  return assignments;
}

function calculateDaysForTargetPace(totalChapters: number, targetChaptersPerDay = 2.5) {
  if (!totalChapters || targetChaptersPerDay <= 0) return 1;
  return Math.max(1, Math.ceil(totalChapters / targetChaptersPerDay));
}

function calculateAutoEndDate(selectedBooks: string[], startDate: string, targetChaptersPerDay = 2.5) {
  const totalChapters = expandChapters(selectedBooks).length;
  const totalDays = calculateDaysForTargetPace(totalChapters, targetChaptersPerDay);
  return addDays(startDate, totalDays - 1);
}

function summarizePlanInput(form: any) {
  const totalChapters = expandChapters(form.selectedBooks).length;
  const totalDays = Math.max(1, diffDaysInclusive(form.startDate, form.endDate));
  const chaptersPerDayExact = totalChapters / totalDays;
  const minPerDay = totalChapters === 0 ? 0 : Math.floor(chaptersPerDayExact);
  const maxPerDay = totalChapters === 0 ? 0 : Math.ceil(chaptersPerDayExact);

  return {
    totalChapters,
    totalDays,
    chaptersPerDayExact,
    minPerDay,
    maxPerDay,
    finishable: totalChapters > 0 && totalDays > 0,
  };
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

function getPlanStats(plan: any) {
  const completedMap = getCompletedMap(plan);
  const totalChapters = plan.assignments.reduce(
    (sum: number, day: any) => sum + day.readings.length,
    0
  );
  const completed = Object.keys(completedMap).filter((key) => completedMap[key]).length;
  const percent = totalChapters === 0 ? 0 : Math.round((completed / totalChapters) * 100);
  const totalDays = Math.max(1, plan.assignments.length);
  const chaptersPerDayExact = totalChapters / totalDays;
  const minPerDay = totalChapters === 0 ? 0 : Math.floor(chaptersPerDayExact);
  const maxPerDay = totalChapters === 0 ? 0 : Math.ceil(chaptersPerDayExact);
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
    chaptersPerDayExact,
    minPerDay,
    maxPerDay,
    remainingChapters,
    remainingDays,
    neededPerRemainingDay,
    onTrack,
  };
}

function getTodaysReading(plan: any, date = todayISO()) {
  return plan.assignments.find((a) => a.date === date);
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

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getVerseOfTheDay() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  return VERSES_OF_THE_DAY[dayOfYear % VERSES_OF_THE_DAY.length];
}

function createPlanObject({
  name,
  selectedBooks,
  startDate,
  endDate,
  color,
  readingMode = "consecutive",
  readingTime = "07:00",
}) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  return {
    id,
    name,
    selectedBooks,
    startDate,
    endDate,
    color,
    readingMode,
    readingTime,
    assignments: buildSchedule(selectedBooks, startDate, endDate, readingMode),
    completed: {},
  };
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
      color: "from-amber-400 via-orange-400 to-rose-500",
      readingMode: "random",
      readingTime: "07:00",
    }),
    createPlanObject({
      name: "New Testament",
      selectedBooks: PRESETS.newTestament,
      startDate: todayISO(),
      endDate: ntEnd,
      color: "from-sky-400 via-cyan-400 to-indigo-500",
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

function getEventTypeLetter(type: string) {
  switch (type) {
    case "prayer":
      return "P";
    case "fast":
      return "F";
    case "church":
      return "C";
    case "bible":
      return "B";
    case "event":
    default:
      return "E";
  }
}

function getEventTypeBadgeClass(type: string) {
  switch (type) {
    case "prayer":
      return "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100";
    case "fast":
      return "border-amber-400/30 bg-amber-500/15 text-amber-100";
    case "church":
      return "border-sky-400/30 bg-sky-500/15 text-sky-100";
    case "bible":
      return "border-violet-400/30 bg-violet-500/15 text-violet-100";
    case "event":
    default:
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
  }
}

function getWeekdayIndex(dateISO: string) {
  return new Date(`${dateISO}T12:00:00`).getDay();
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
      .filter((event) => eventOccursOnDate(event, dateISO))
      .map((event) => materializeEventOccurrence(event, dateISO))
  );
}

function SectionCard({ className = "", children }: any) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

function Pill({ children, accent = false }: any) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs",
        accent
          ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
          : "border-white/10 bg-white/5 text-[#94A3B8]"
      )}
    >
      {children}
    </span>
  );
}

function EventBadge({ type }: any) {
  const styles = {
    prayer: "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-400/20",
    fast: "bg-amber-500/15 text-amber-100 border-amber-400/20",
    church: "bg-sky-500/15 text-sky-100 border-sky-400/20",
    bible: "bg-violet-500/15 text-violet-100 border-violet-400/20",
    event: "bg-emerald-500/15 text-emerald-100 border-emerald-400/20",
  };

  const icons = {
    prayer: <Bell className="h-3.5 w-3.5" />,
    fast: <Clock3 className="h-3.5 w-3.5" />,
    church: <Church className="h-3.5 w-3.5" />,
    bible: <BookMarked className="h-3.5 w-3.5" />,
    event: <HeartHandshake className="h-3.5 w-3.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs capitalize ${styles[type] || styles.event}`}
    >
      {icons[type] || icons.event}
      {type}
    </span>
  );
}

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

function loadLocalDiscipleData() {
  if (typeof window === "undefined") {
    return { events: [], plans: [] };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { events: [], plans: [] };

    const parsed = JSON.parse(saved);

    return {
      events: Array.isArray(parsed.events) ? sortEvents(parsed.events) : [],
      plans: Array.isArray(parsed.plans)
        ? parsed.plans.map((p) => ({
            ...p,
            completed: { ...(p.completed || {}) },
            assignments: Array.isArray(p.assignments) ? [...p.assignments] : [],
          }))
        : [],
    };
  } catch {
    return { events: [], plans: [] };
  }
}

async function savePlanToServer(plan: any) {

  try {
    const response = await fetch("/api/reading/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(plan),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || "Failed to save plan to server");
    }
  } catch (error) {
    console.error("Plan server save failed; local copy kept", error);
  }
}

export default function DiscipleOSApp() {
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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [lastSyncLabel, setLastSyncLabel] = useState("");
  const sentNotificationsRef = useRef(new Set());
  const hasLoadedLocalDataRef = useRef(false);
  const didHydrateRef = useRef(false);
  
  const [form, setForm] = useState({
    name: "",
    preset: "custom",
    selectedBooks: [],
    startDate: todayISO(),
    endDate: todayISO(),
    color: "from-violet-400 via-fuchsia-400 to-cyan-400",
    readingMode: "random",
    readingTime: "07:00",
    autoSchedule: true,
    targetChaptersPerDay: 2.5,
  });

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
  });
  const [editingEventId, setEditingEventId] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    startDate: todayISO(),
    endDate: todayISO(),
    readingMode: "consecutive",
    readingTime: "07:00",
  });

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  const editingPlan = useMemo(
    () => plans.find((p) => p.id === editingPlanId) || null,
    [plans, editingPlanId]
  );

  const presetLoaded = useMemo(
    () => plans.some((p) => p.id === PRESET_30_DAY_PLAN.id),
    [plans]
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
  const verseOfTheDay = useMemo(() => getVerseOfTheDay(), []);
  const reminderEnabledCount = useMemo(() => events.filter((event) => event.remind).length, [events]);

  const todaysPlans = useMemo(() => {
    const today = todayISO();
    return plans
      .map((plan) => ({
        plan,
        todayReading: getTodaysReading(plan, today),
        stats: getPlanStats(plan),
      }))
      .filter((entry) => entry.todayReading && entry.todayReading.readings.length > 0);
  }, [plans]);

  const planStats = selectedPlan ? getPlanStats(selectedPlan) : null;
  const planPreview = useMemo(() => summarizePlanInput(form), [form]);
  const editPreview = useMemo(() => {
    if (!editingPlan) return null;
    return summarizePlanInput({
      selectedBooks: editingPlan.selectedBooks,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
    });
  }, [editingPlan, editForm]);

  const todayFocusItems = useMemo(() => {
    const today = todayISO();
    const manual = getEventInstancesForDate(events, today);
    const reading = plans.flatMap((plan) => {
      const completedMap = getCompletedMap(plan);
      const assignment = plan.assignments.find((day) => day.date === today);
      if (!assignment || assignment.readings.length === 0) return [];
      return assignment.readings.map((readingItem) => ({
        ...readingItem,
        planId: plan.id,
        planName: plan.name,
        planColor: plan.color,
        done: !!completedMap[readingItem.key],
      }));
    });
    return { manual, reading };
  }, [events, plans]);

  const overallProgress = useMemo(() => {
    const total = plans.reduce(
      (sum: number, plan: any) => sum + getPlanStats(plan).totalChapters,
      0
    );
    const completed = plans.reduce(
      (sum: number, plan: any) => sum + getPlanStats(plan).completed,
      0
    );
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [plans]);

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
          planId: plan.id,
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
      .then((registration) => {
      })
      .catch((error) => {
        console.error("SW registration failed:", error);
      });
  }, []);

  useEffect(() => {
    setEventForm((prev) => ({ ...prev, date: selectedCalendarDate }));
  }, [selectedCalendarDate]);

  useEffect(() => {
    if (notificationPermission !== "granted") return undefined;

    const checkReminders = () => {
      const now = new Date();

      events.forEach((event) => {
        if (!event.remind || !event.time) return;
        
        const today = todayISO();
        if (!eventOccursOnDate(event, today)) return;

        const [hours, minutes] = event.time.split(":").map(Number);

        const eventDate = new Date();
        eventDate.setHours(hours || 0, minutes || 0, 0, 0);

        const reminderTime = new Date(
          eventDate.getTime() - Number(event.reminderMinutes || 0) * 60000
);
        const key = `${event.id}-${today}-${event.time}-${event.reminderMinutes}`;

        if (
          now >= reminderTime &&
          now < new Date(reminderTime.getTime() + 60000) &&
          !sentNotificationsRef.current.has(key)
        ) {
          new Notification(event.title, {
            body:
              event.notes ||
              `${event.type} starts at ${formatTime(event.time)}`,          
              });
              
          sentNotificationsRef.current.add(key);
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [events, notificationPermission]);

  const togglePreset = (preset) => {
    setForm((prev) => {
      if (prev.preset === preset) {
        return {
          ...prev,
          preset: "custom",
          selectedBooks: [],
          endDate: prev.autoSchedule ? prev.startDate : prev.endDate,
        };
      }

      const presetBooks = PRESETS[preset] || [];
      return {
        ...prev,
        preset,
        selectedBooks: presetBooks,
        endDate: prev.autoSchedule
          ? calculateAutoEndDate(presetBooks, prev.startDate, prev.targetChaptersPerDay)
          : prev.endDate,
      };
    });
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
        selectedBooks: nextSelectedBooks,
        endDate: prev.autoSchedule
          ? calculateAutoEndDate(nextSelectedBooks, prev.startDate, prev.targetChaptersPerDay)
          : prev.endDate,
      };
    });
  };

async function saveReadingPlanToServer(plan: any) {
  // Local-only launch mode:
  // Plans are saved through the localStorage useEffect.
  return;
}

useEffect(() => {
  if (typeof window === "undefined") return;
  if (!hasHydrated) return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      events,
      plans,
    })
  );

}, [events, plans, hasHydrated]);

useEffect(() => {
  async function loadData() {
    if (typeof window === "undefined") return;

    // 1. Load LOCAL first (this is your source of truth right now)
    const localData = loadLocalDiscipleData();

    setEvents(localData.events);
    setPlans(localData.plans);

    // 2. Try API (non-blocking, won't break app)
    try {
      const res = await fetch(`/api/reading/plans?ts=${Date.now()}`, {
        cache: "no-store",
      });

      const text = await res.text();

      if (res.ok && text) {
        const data = JSON.parse(text);
        if (Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      } else {
        console.error("READING PLANS API FAILED", {
          status: res.status,
          body: text,
        });
      }
    } catch (err) {
      console.error("Reading plans fetch crashed", err);
    }

    hasLoadedLocalDataRef.current = true;
    didHydrateRef.current = true;
    setHasHydrated(true);

  }

  loadData();
}, []);

  const createPlan = () => {
    if (!form.name.trim() || form.selectedBooks.length === 0) return;

    const plan = createPlanObject({
      name: form.name.trim(),
      selectedBooks: form.selectedBooks,
      startDate: form.startDate,
      endDate: form.endDate,
      color: form.color,
      readingMode: form.readingMode,
      readingTime: form.readingTime,
    });


    setPlans((prev) => [plan, ...prev]);
    // Local-only launch mode: localStorage effect handles persistence.
    savePlanToServer(plan);
    setSelectedPlanId(plan.id);
    setActiveTab("plans");
    setForm((prev) => ({ ...prev, name: "" }));
  };

  const beginEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setSelectedPlanId(plan.id);
    setActiveTab("plans");
    setEditForm({
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      readingMode: plan.readingMode,
      readingTime: plan.readingTime || "07:00",
    });
  };

  const savePlanEdit = () => {
    if (!editingPlan) return;

    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== editingPlan.id) return plan;
        return {
          ...plan,
          name: editForm.name.trim() || plan.name,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          readingMode: editForm.readingMode,
          readingTime: editForm.readingTime,
          assignments: buildSchedule(
            plan.selectedBooks,
            editForm.startDate,
            editForm.endDate,
            editForm.readingMode
          ),
        };
      })
    );

    setEditingPlanId(null);
  };

  const cancelPlanEdit = () => {
    setEditingPlanId(null);
  };

 const toggleChapterComplete = (planId, key) => {
  setPlans((prevPlans) =>
    prevPlans.map((plan) => {
      if (plan.id !== planId) return plan;

      const completedMap = getCompletedMap(plan);

      return {
        ...plan,
        completed: {
          ...completedMap,
          [key]: !completedMap[key],
        },
      };
    })
  );
};

const markDayPlanComplete = (planId, dateISO) => {
  setPlans((prevPlans) =>
    prevPlans.map((plan) => {
      if (plan.id !== planId) return plan;

      const assignment = plan.assignments.find((day) => day.date === dateISO);
      if (!assignment || assignment.readings.length === 0) return plan;

      const completedMap = getCompletedMap(plan);
      const dayKeys = assignment.readings.map((r) => r.key);
      const allDone = dayKeys.every((key) => !!completedMap[key]);

      const nextCompleted = { ...completedMap };

      dayKeys.forEach((key) => {
        nextCompleted[key] = !allDone;
      });

      return {
        ...plan,
        completed: nextCompleted,
      };
    })
  );
};

  const resetEventForm = () => {
    setEventForm({
      title: "",
      type: "prayer",
      date: selectedCalendarDate,
      time: "06:30",
      notes: "",
      remind: true,
      reminderMinutes: 10,
      repeat: "none",
      repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
      repeatUntil: "",
    });
    setEditingEventId(null);
  };

  const beginEditEvent = (event) => {
    const sourceEvent = events.find((item) => item.id === (event.sourceEventId || event.id)) || event;
    setEditingEventId(sourceEvent.id);
    setActiveTab("calendar");
    setSelectedCalendarDate(event.date || sourceEvent.date);
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
    });
  };

const createEvent = async () => {
  if (!eventForm.title.trim()) return;

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
  };

  if (editingEventId) {
    const updatedEvent = {
      id: editingEventId,
      ...normalizedEvent,
    };

    const previousEvents = events;
    setEvents((prev) => upsertEvent(prev, updatedEvent));

    try {
      const response = await fetch(`/api/events?ts=${Date.now()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        throw new Error("Failed to save edited event to server");
      }

      const result = await response.json();
      const savedEvent =
        result?.event && typeof result.event === "object" ? result.event : updatedEvent;

      setEvents((prev) => upsertEvent(prev, savedEvent));
      resetEventForm();
    } catch (error) {
      console.error(error);
      setEvents(previousEvents);
    }

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

  const previousEvents = events;
  setEvents((prev) => upsertEvent(prev, newEvent));

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEvent),
    });

    if (!response.ok) {
      throw new Error("Failed to save new event to server");
    }

    const result = await response.json();
    const savedEvent =
      result?.event && typeof result.event === "object" ? result.event : newEvent;

    setEvents((prev) => upsertEvent(prev, savedEvent));
    resetEventForm();
    } catch (error) {
    console.error(error);
    setEvents(previousEvents);
  }
};

const deleteEvent = async (eventId: string) => {
  const previousEvents = events;

  setEvents((prev) => removeEventById(prev, eventId));

  try {
    const response = await fetch("/api/events", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: eventId }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete event from server");
    }

    if (editingEventId === eventId) {
      resetEventForm();
    }
  } catch (error) {
    console.error(error);
    setEvents(previousEvents);
  }
};

const deletePlan = async (planId: string) => {
  const previousPlans = plans;

  setPlans((prev) => prev.filter((p) => p.id !== planId));

  if (selectedPlanId === planId) setSelectedPlanId(null);
  if (editingPlanId === planId) setEditingPlanId(null);

  try {
    const response = await fetch("/api/reading/plans", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: planId }),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("DELETE PLAN API FAILED", {
        status: response.status,
        body: text,
      });

      throw new Error("Failed to delete plan from server");
    }

  } catch (error) {
    console.error(error);
    setPlans(previousPlans);
  }
};

const loadPresetPlan = () => {
  const planData = PRESET_30_DAY_PLAN;

  if (plans.some((p) => p.id === planData.id)) {
    setLastSyncLabel("30-Day Reset already loaded");

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "clicked_existing_30_day_plan",
        userId: getDiscipleUserId(),
        plan: "30-Day Consistency Reset",
      }),
    }).catch(() => {});

    return;
  }

  const start = todayISO();

  const assignments = planData.readings.map((day, index) => ({
    date: addDays(start, index),
    readings: day.items.map((item, i) => ({
      key: `${day.day}-${i}`,
      label: item,
    })),
  }));

  const newPlan = {
    id: planData.id,
    name: planData.name,
    selectedBooks: [],
    startDate: start,
    endDate: addDays(start, planData.readings.length - 1),
    readingTime: "07:00",
    readingMode: "preset",
    color: "from-blue-400 to-indigo-500",
    assignments,
    completed: {},
  };

  setPlans((prev) => [newPlan, ...prev]);
savePlanToServer(newPlan);
setSelectedPlanId(newPlan.id);
setActiveTab("plans");
setLastSyncLabel("30-Day Reset loaded");

// ✅ TRACK FIRST-TIME START
fetch("/api/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: "started_plan_30_day",
    userId: getDiscipleUserId(),
    plan: "30-Day Consistency Reset",
  }),
}).catch(() => {});
};

const enableNotifications = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== "granted") {
    return;
    }

    const registration = await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
if (!vapidPublicKey) {
  return;
}

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const response = await fetch("/api/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    const result = await response.json();

    if (!response.ok) {
      return;
    }

  } catch (error) {
    console.error("Enable notifications failed:", error);
  }
};
  const tabs = [
    { key: "today", label: "Today", icon: LayoutDashboard },
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "plans", label: "Plans", icon: BookOpen },
    { key: "build", label: "Create Plan", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.22),_transparent_28%),radial-gradient(circle_at_right,_rgba(45,212,191,0.12),_transparent_24%),linear-gradient(180deg,_#09090f_0%,_#0f172a_100%)] text-white">
      <div style={{ fontSize: 12, opacity: 0.6, padding: 8 }}>
      Last sync: {lastSyncLabel || "not yet"}
    </div>
      
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <SectionCard className="mb-5 overflow-hidden">
          <div className="relative p-5 sm:p-7">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[#F8FAFC]">
  <Sparkles className="h-4 w-4 text-[#D4A017]" />
  <span className="inline-flex items-baseline leading-none tracking-tight">
    <span className="font-bold text-violet-300">DISCIPLE</span><span className="-ml-[2px] font-bold text-[#D4A017]">OS</span>
  </span>
</div>
                <div>
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
  <span className="text-violet-300 tracking-tight">DISCIPLE</span><span className="text-[#D4A017] tracking-tight -ml-[2px]">OS</span>
</h1>
                  <div className="mt-4 text-lg italic text-[#D4A017]">Discipline that moves mountains.</div>
                </div>
                <div className="mt-2 text-xs text-white/40">
                    Last sync: {lastSyncLabel || "not yet"}
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                  A system for your daily walk with God.
                </p>
                <div className="flex flex-wrap items-center gap-3">
  <button
    onClick={() => setActiveTab("build")}
    className="rounded-2xl bg-[#7C3AED] px-4 py-3 text-sm font-medium text-white transition hover:scale-[0.99] active:scale-[0.98]"
  >
    Create a Plan
  </button>

<button
  onClick={loadPresetPlan}
  disabled={presetLoaded}
  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
    presetLoaded
      ? "cursor-not-allowed border border-green-500/30 bg-green-600/20 text-green-300"
      : "border border-[#D4A017]/30 bg-[#D4A017]/15 text-[#F8FAFC] hover:bg-[#D4A017]/25"
  }`}
>
  {presetLoaded ? "30-Day Plan Loaded" : "Load 30-Day Reset"}
</button>

<InstallButton />

  <button
    onClick={enableNotifications}
    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#F8FAFC] hover:bg-white/10"
  >
    <Bell className="h-4 w-4" />
    {notificationPermission === "granted"
      ? "Notifications enabled"
      : notificationPermission === "denied"
        ? "Notifications blocked"
        : notificationPermission === "unsupported"
          ? "Notifications unavailable"
          : "Enable reminders"}
  </button>
  
</div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                <SectionCard className="min-w-0 p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-xs text-white/55 text-center">Active plans</div>
                  <div className="mt-2 text-2xl font-semibold text-center">{plans.length}</div>
                </SectionCard>
                <SectionCard className="min-w-0 p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] leading-4 text-white/55 text-center">Overall progress</div>
                  <div className="mt-2 break-words text-2xl font-semibold leading-none text-center">{overallProgress}%</div>
                </SectionCard>
                <SectionCard className="min-w-0 p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] leading-4 text-white/55 text-center">Today’s reading</div>
                  <div className="mt-2 break-words text-2xl font-semibold leading-none text-center">{todayFocusItems.reading.length}</div>
                </SectionCard>
                <SectionCard className="min-w-0 p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] leading-4 text-white/55 text-center">Today’s events</div>
                  <div className="mt-2 break-words text-2xl font-semibold leading-none text-center">{todayFocusItems.manual.length}</div>
                </SectionCard>
                <SectionCard className="min-w-0 p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-[11px] leading-4 text-white/55 text-center">Active reminders</div>
                  <div className="mt-2 break-words text-2xl font-semibold leading-none text-center">{reminderEnabledCount}</div>
                </SectionCard>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                  active
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/20 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                    : "border-white/10 bg-white/[0.04] text-[#94A3B8] hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "today" && (
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              {plans.length === 0 ? (
                <SectionCard className="p-5 sm:p-6">
                  <div className="rounded-[24px] border border-dashed border-violet-400/30 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(6,182,212,0.10))] p-5">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Welcome to <span className="font-semibold text-violet-300">Disciple</span><span className="font-semibold text-[#D4A017]">OS</span></div>
                    <div className="mt-2 text-2xl font-semibold text-white">Start by creating your first reading plan.</div>
                    <div className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                      Run multiple plans at once, schedule your reading time, and build a daily rhythm for Scripture, prayer, fasting, and church life.
                    </div>
                    <button
                      onClick={() => setActiveTab("build")}
                      className="mt-4 rounded-2xl bg-[#7C3AED] px-4 py-3 text-sm font-medium text-white transition hover:scale-[0.99] active:scale-[0.98]"
                    >
                      Create Your First Plan
                    </button>
                  </div>
                </SectionCard>
              ) : null}

              {plans.length > 0 ? (
                <SectionCard className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Sun className="h-5 w-5 text-[#D4A017]" />
                    Today’s Walk
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[24px] border border-[#D4A017]/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(212,160,23,0.10))] p-5">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/55">Verse of the day ✦</div>
                      <div className="text-xl font-semibold leading-8 text-white sm:text-2xl">“{verseOfTheDay.text}”</div>
                      <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[#94A3B8]">
                        {verseOfTheDay.reference}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#F8FAFC]">
                          <Target className="h-4 w-4 text-[#D4A017]" />
                          Today’s reading workload
                        </div>
                        <div className="text-3xl font-semibold">{todayFocusItems.reading.length}</div>
                        <div className="text-sm text-white/55">chapters assigned across all active plans</div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#F8FAFC]">
                          <Flame className="h-4 w-4 text-rose-300" />
                          Today’s spiritual rhythm
                        </div>
                        <div className="text-3xl font-semibold">{todayFocusItems.manual.length}</div>
                        <div className="text-sm text-white/55">prayer times, fasts, church, and events today</div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionCard className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="h-5 w-5 text-[#D4A017]" />
                  Today’s schedule
                </div>
                <div className="space-y-3">
                  {todayFocusItems.manual.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 p-5 text-sm text-white/60">
                      No spiritual events scheduled today — add prayer, fasting, church, or a custom event.
                    </div>
                  ) : (
                    todayFocusItems.manual.map((event) => (
                      <div key={event.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <EventBadge type={event.type} />
                          <div className="flex items-center gap-2">
                            {event.remind ? <Pill accent>{event.reminderMinutes} min reminder</Pill> : null}
                            <button
                              onClick={() => beginEditEvent(event)}
                              className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-base font-medium">{event.title}</div>
                        <div className="mt-1 text-sm text-white/55">{formatTime(event.time)} today</div>
                        {event.notes ? <div className="mt-2 text-sm text-white/70">{event.notes}</div> : null}
                        {event.repeat && event.repeat !== "none" ? (
                          <div className="mt-2 text-xs text-white/50">
                            {event.repeat === "daily"
                              ? "Repeats daily until turned off"
                              : `Repeats on ${normalizeWeekdays(event.repeatWeekdays).map((day) => weekdayOptions.find((item) => item.value === day)?.label).join(", ")}${event.repeatUntil ? ` through ${formatDate(event.repeatUntil)}` : " until turned off"}`}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Today’s assigned reading</div>
                    <div className="text-sm text-white/55">Quickly work through what is due right now</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("calendar");
                      setSelectedCalendarDate(todayISO());
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#F8FAFC] hover:bg-white/10"
                  >
                    Open day view
                  </button>
                </div>

                <div className="space-y-4">
                  {todaysPlans.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 p-5 text-sm text-white/60">
                      No reading scheduled today — create a plan to get started.
                    </div>
                  ) : (
                    todaysPlans.map(({ plan, todayReading, stats }) => (
                      <div key={plan.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white ${plan.color}`}>
                              {plan.name}
                            </div>
                            <div className="mt-2 text-sm text-white/55">{stats.percent}% complete</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill>Finish: {formatDate(plan.endDate)}</Pill>
                              <Pill>{formatTime(plan.readingTime || "07:00")}</Pill>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setActiveTab("plans");
                            }}
                            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
                          >
                            Open plan
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {todayReading.readings.map((reading) => {
                            const completedMap = getCompletedMap(plan);
                            const done = !!completedMap[reading.key];
                            return (
                              <button
                                key={reading.key}
                                onClick={() =>
                                    toggleChapterComplete(plan.id, reading.key, !!getCompletedMap(plan)[reading.key])
                                    }
                                className={cn(
                                  "flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                                  done
                                    ? "border-emerald-400/30 bg-emerald-500/10"
                                    : "border-white/10 bg-[#0B1020]/50 hover:bg-white/5"
                                )}
                              >
                                <div>
                                  <div className="font-medium">{reading.label || reading.book}</div>
                                  {reading.chapter ? (
                                    <div className="text-sm text-white/55">Chapter {reading.chapter}</div>
                                  ) : null}
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
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === "build" && (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionCard className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Plus className="h-5 w-5 text-violet-300" />
                Create a plan
              </div>
              <div className="grid gap-3">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Plan name"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/35"
                />

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "psalmsProverbs", label: "Psalms + Proverbs" },
                    { key: "newTestament", label: "New Testament" },
                    { key: "oldTestament", label: "Old Testament" },
                    { key: "wholeBible", label: "Whole Bible" },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => togglePreset(preset.key)}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition",
                        form.preset === preset.key
                          ? "bg-[#7C3AED] text-white"
                          : "border border-white/10 bg-white/5 text-[#F8FAFC] hover:bg-white/10"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[#F8FAFC]">
                    <div className="mb-2">Start date</div>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate: prev.autoSchedule
                            ? calculateAutoEndDate(prev.selectedBooks, e.target.value, prev.targetChaptersPerDay)
                            : prev.endDate,
                        }))
                      }
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                  <label className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[#F8FAFC]">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span>End date</span>
                      {form.autoSchedule ? <span className="text-xs text-violet-200">Auto</span> : null}
                    </div>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, autoSchedule: false, endDate: e.target.value }))}
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[#F8FAFC]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">Auto schedule range</div>
                      <div className="mt-1 text-xs text-white/55">Set the finish date automatically based on selected books and your target pace.</div>
                    </div>
                    <button
                      onClick={() =>
                        setForm((prev) => {
                          const nextAuto = !prev.autoSchedule;
                          return {
                            ...prev,
                            autoSchedule: nextAuto,
                            endDate: nextAuto
                              ? calculateAutoEndDate(prev.selectedBooks, prev.startDate, prev.targetChaptersPerDay)
                              : prev.endDate,
                          };
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition",
                        form.autoSchedule
                          ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                          : "border-white/10 bg-white/5 text-white/70"
                      )}
                    >
                      {form.autoSchedule ? "Auto on" : "Auto off"}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-white/55">Target pace</label>
                    <input
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={form.targetChaptersPerDay}
                      onChange={(e) => {
                        const nextTarget = Number(e.target.value) || 2.5;
                        setForm((prev) => ({
                          ...prev,
                          targetChaptersPerDay: nextTarget,
                          endDate: prev.autoSchedule
                            ? calculateAutoEndDate(prev.selectedBooks, prev.startDate, nextTarget)
                            : prev.endDate,
                        }));
                      }}
                      className="h-10 w-24 rounded-xl border border-white/10 bg-[#0B1020]/40 px-3 outline-none"
                    />
                    <span className="text-xs text-white/55">chapters/day</span>
                  </div>
                </div>

                <label className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[#F8FAFC]">
                  <div className="mb-2">Reading time</div>
                  <input
                    type="time"
                    value={form.readingTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, readingTime: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1020]/40 px-3 outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, readingMode: "consecutive" }))}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      form.readingMode === "consecutive"
                        ? "border-white/30 bg-[#7C3AED] text-white"
                        : "border-white/10 bg-white/5 text-[#F8FAFC] hover:bg-white/10"
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <ArrowDownAZ className="h-4 w-4" />
                      Consecutive
                    </div>
                    <div className="text-xs opacity-75">Read straight through in order</div>
                  </button>
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, readingMode: "random" }))}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      form.readingMode === "random"
                        ? "border-white/30 bg-[#7C3AED] text-white"
                        : "border-white/10 bg-white/5 text-[#F8FAFC] hover:bg-white/10"
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <Shuffle className="h-4 w-4" />
                      Randomized
                    </div>
                    <div className="text-xs opacity-75">Shuffle chapters across the plan</div>
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-sm text-[#F8FAFC]">Selected books ({form.selectedBooks.length})</div>
                  <div className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BIBLE_BOOKS.map((book) => {
                        const active = form.selectedBooks.includes(book.name);
                        return (
                          <button
                            key={book.name}
                            onClick={() => toggleBook(book.name)}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                              active ? "bg-[#7C3AED] text-white" : "bg-white/5 text-[#F8FAFC] hover:bg-white/10"
                            )}
                          >
                            <span>{book.name}</span>
                            <span className="text-xs opacity-70">{book.chapters} ch</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={createPlan}
                  className="rounded-2xl bg-[#7C3AED] px-4 py-3 font-medium text-white transition hover:scale-[0.99] active:scale-[0.98]"
                >
                  Create plan
                </button>
              </div>
            </SectionCard>

            <SectionCard className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 text-emerald-300" />
                Plan summary
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(45,212,191,0.14),rgba(139,92,246,0.08))] p-5">
                <div className="mb-3 text-sm font-medium text-[#F8FAFC]">What this plan will require</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs text-white/55">Total chapters</div>
                    <div className="mt-2 text-2xl font-semibold">{planPreview.totalChapters}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs text-white/55">Total days</div>
                    <div className="mt-2 text-2xl font-semibold">{planPreview.totalDays}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs text-white/55">Average needed</div>
                    <div className="mt-2 text-2xl font-semibold">{planPreview.chaptersPerDayExact.toFixed(2)}</div>
                    <div className="text-xs text-white/50">chapters per day</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs text-white/55">Daily load</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {planPreview.minPerDay === planPreview.maxPerDay
                        ? `${planPreview.maxPerDay}`
                        : `${planPreview.minPerDay}-${planPreview.maxPerDay}`}
                    </div>
                    <div className="text-xs text-white/50">chapters per day</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[#94A3B8]">
                  This plan will finish by <span className="font-medium text-white">{formatDate(form.endDate)}</span>{form.autoSchedule ? ` using an automatic pace of ${form.targetChaptersPerDay} chapters per day.` : ` if the assigned daily reading is completed.`}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[#94A3B8]">
                  Reading sessions will be placed on the calendar at <span className="font-medium text-white">{formatTime(form.readingTime)}</span>.
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "calendar" && (
  <div className="space-y-4">
    <SectionCard className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Calendar className="h-5 w-5 text-[#D4A017]" />
        Faith calendar
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Today’s walk activities</div>
                <div className="text-xs text-white/50">{formatDate(selectedCalendarDate)}</div>
              </div>
              <button
                onClick={() => setSelectedCalendarDate(todayISO())}
                className="text-xs text-white/60 hover:text-white"
              >
                Today
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-auto">
              {dayViewItems.length === 0 ? (
                <div className="text-sm text-white/50">
                  No events for this day — add prayer, fasting, church, or a custom event.
                </div>
              ) : (
                dayViewItems.map((event) => {
                  const isPlanItem = event.kind === "plan";
                  const allDone = isPlanItem && event.completedCount === event.readings.length;

                  return (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-[#0B1020]/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-white">{event.title}</div>
                            <EventBadge type={event.type || "event"} />
                          </div>
                          <div className="mt-1 text-sm text-white/50">{formatTime(event.time || "07:00")}</div>
                          {event.notes ? <div className="mt-2 text-sm text-white/65">{event.notes}</div> : null}
                        </div>

                        {isPlanItem ? (
                          <button
                            onClick={() => markDayPlanComplete(event.planId, selectedCalendarDate)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 hover:bg-white/10"
                          >
                            {allDone ? "Undo day" : "Complete day"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => beginEditEvent(event)}
                              className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEvent(event.sourceEventId || event.id)}
                              className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isPlanItem ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {event.readings.map((reading) => {
                            const plan = plans.find((p) => p.id === event.planId);
                            const completedMap = getCompletedMap(plan);
                            const done = !!completedMap[reading.key];

                            return (
                              <button
                                key={reading.key}
                                onClick={() => toggleChapterComplete(plan.id, reading.key)}
                                className={cn(
                                  "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                                  done
                                    ? "border-emerald-400/30 bg-emerald-500/10"
                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                )}
                              >
                                <span>{reading.label || `${reading.book} ${reading.chapter}`}</span>
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
                })
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">{editingEventId ? "Edit event" : "Add event"}</div>
                <div className="text-xs text-white/50">For {formatDate(eventForm.date)}</div>
              </div>
              {editingEventId ? (
                <button
                  onClick={resetEventForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Title</div>
                <input
                  value={eventForm.title}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Morning prayer"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Type</div>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none"
                >
                  <option value="prayer">Prayer</option>
                  <option value="fast">Fast</option>
                  <option value="church">Church</option>
                  <option value="event">Event</option>
                </select>
              </label>
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Date</div>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Time</div>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Repeats</div>
                <select
                  value={eventForm.repeat}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, repeat: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Ends on</div>
                <input
                  type="date"
                  value={eventForm.repeatUntil}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, repeatUntil: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none [color-scheme:dark]"
                />
              </label>
            </div>

            {eventForm.repeat === "weekly" ? (
              <div className="mt-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Repeat on</div>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => {
                    const active = eventForm.repeatWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
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
                            ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">Reminder</div>
                  <div className="text-xs text-white/50">Send a notification before this event starts</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEventForm((prev) => ({ ...prev, remind: !prev.remind }))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    eventForm.remind
                      ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                      : "border-white/10 bg-white/5 text-white/70"
                  )}
                >
                  {eventForm.remind ? "Reminder on" : "Reminder off"}
                </button>
              </div>
              <select
                value={eventForm.reminderMinutes}
                onChange={(e) => setEventForm((prev) => ({ ...prev, reminderMinutes: Number(e.target.value) }))}
                disabled={!eventForm.remind}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 text-sm text-white outline-none disabled:opacity-50"
              >
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>

            <label className="mt-3 block">
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/45">Notes</div>
              <textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add context, location, or prayer focus"
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-[#0B1020]/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              />
            </label>

            <div className="mt-4 flex gap-3">
              <button
                onClick={createEvent}
                className="rounded-2xl bg-[#7C3AED] px-4 py-3 font-medium text-white"
              >
                {editingEventId ? "Save event" : "Add event"}
              </button>
              <button
                onClick={resetEventForm}
                className="rounded-2xl border border-white/10 px-4 py-3 text-[#F8FAFC]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              Prev
            </button>
            <div className="text-sm font-medium">{formatMonthLabel(calendarMonth)}</div>
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              Next
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-white/40">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
              <div key={`${d}-${index}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const iso = toISODate(day);
              const dayEvents = monthEventMap[iso] || [];
              const hasEvents = dayEvents.length > 0;
              const selected = iso === selectedCalendarDate;
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const isToday = iso === todayISO();
              const badgeTypes = Array.from(
                new Set(
                  dayEvents.map((event) => {
                    if (event.isPlan) return "bible";
                    return event.type || "event";
                  })
                )
              ).slice(0, 4);

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedCalendarDate(iso)}
                  className={cn(
                    "min-h-[88px] rounded-2xl p-2.5 text-left transition",
                    selected && "bg-violet-500/30 ring-1 ring-violet-400/40",
                    !selected && "hover:bg-white/5",
                    hasEvents && "border border-white/10",
                    !hasEvents && "border border-transparent",
                    !isCurrentMonth && "opacity-45"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm", isToday && "font-semibold text-[#D4A017]")}>{day.getDate()}</span>
                    {dayEvents.length > 0 ? <span className="text-[10px] text-white/40">{dayEvents.length}</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
  {badgeTypes.map((type, index) => (
    <span
      key={`${iso}-${type}-${index}`}
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border px-1 text-[10px] font-semibold leading-none",
        getEventTypeBadgeClass(type)
      )}
    >
      {getEventTypeLetter(type)}
    </span>
  ))}
</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  </div>
)}

{activeTab === "plans" && (
  <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
    <div className="space-y-4">
      <SectionCard className="p-5 sm:p-6">
        <div className="mb-3 text-lg font-semibold">Planned reading</div>

        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 p-5 text-sm text-white/60">
              No reading plans yet — create one to start building your daily rhythm.
            </div>
          ) : (
            plans.map((plan) => {
              const stats = getPlanStats(plan);
              const isActive = selectedPlan?.id === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "w-full rounded-[24px] border p-4 text-left transition",
                    isActive
                      ? "border-white/20 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white ${plan.color}`}>
                        {plan.name}
                      </div>

                      <div className="mt-2 text-sm text-white/55">
                        {formatDate(plan.startDate)} – {formatDate(plan.endDate)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{plan.selectedBooks.length} books</Pill>
                        <Pill>{stats.totalChapters} chapters</Pill>
                        <Pill>{plan.readingMode === "random" ? "Randomized" : "Consecutive"}</Pill>
                        <Pill>{formatTime(plan.readingTime || "07:00")}</Pill>
                        <Pill accent>{stats.percent}% complete</Pill>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          beginEditPlan(plan);
                        }}
                        className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlan(plan.id);
                        }}
                        className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
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
      </SectionCard>
    </div>

    <div className="space-y-4">
      <SectionCard className="p-5 sm:p-6">
        {selectedPlan ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white ${selectedPlan.color}`}>
                  {selectedPlan.name}
                </div>
                <h2 className="mt-3 text-2xl font-semibold">Plan details</h2>
                <p className="mt-1 text-sm text-white/60">{selectedPlan.selectedBooks.join(", ")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>
                    {selectedPlan.readingMode === "random" ? "Randomized reading order" : "Consecutive reading order"}
                  </Pill>
                </div>
              </div>
              {planStats && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-right">
                  <div className="text-sm text-white/60">Progress</div>
                  <div className="mt-1 text-3xl font-semibold">{planStats.percent}%</div>
                  <div className="text-sm text-white/60">{planStats.completed} / {planStats.totalChapters} chapters</div>
                </div>
              )}
            </div>

            {editingPlan && editingPlan.id === selectedPlan.id ? (
              <div className="mb-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Pencil className="h-5 w-5" />
                  Edit plan
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 outline-none"
                    placeholder="Plan name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 outline-none"
                    />
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 outline-none"
                    />
                  </div>
                </div>
                <label className="mt-3 block rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-[#F8FAFC]">
                  <div className="mb-2">Reading time</div>
                  <input
                    type="time"
                    value={editForm.readingTime}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, readingTime: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0B1020]/40 px-3 outline-none"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditForm((prev) => ({ ...prev, readingMode: "consecutive" }))}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      editForm.readingMode === "consecutive"
                        ? "border-white/30 bg-[#7C3AED] text-white"
                        : "border-white/10 bg-slate-950/50 text-[#F8FAFC] hover:bg-white/10"
                    )}
                  >
                    <div className="font-medium">Consecutive</div>
                    <div className="text-xs opacity-75">Read in order</div>
                  </button>
                  <button
                    onClick={() => setEditForm((prev) => ({ ...prev, readingMode: "random" }))}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      editForm.readingMode === "random"
                        ? "border-white/30 bg-[#7C3AED] text-white"
                        : "border-white/10 bg-slate-950/50 text-[#F8FAFC] hover:bg-white/10"
                    )}
                  >
                    <div className="font-medium">Randomized</div>
                    <div className="text-xs opacity-75">Shuffle chapters</div>
                  </button>
                </div>
                {editPreview && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-[#0B1020]/50 p-4 text-sm text-white/70">
                    <div className="mb-2 font-medium text-[#F8FAFC]">Updated plan summary</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>Total chapters: <span className="text-white">{editPreview.totalChapters}</span></div>
                      <div>Total days: <span className="text-white">{editPreview.totalDays}</span></div>
                      <div>Average needed: <span className="text-white">{editPreview.chaptersPerDayExact.toFixed(2)} ch/day</span></div>
                      <div>Daily load: <span className="text-white">{editPreview.minPerDay === editPreview.maxPerDay ? `${editPreview.maxPerDay} chapters/day` : `${editPreview.minPerDay}-${editPreview.maxPerDay} chapters/day`}</span></div>
                      <div>Reading time: <span className="text-white">{formatTime(editForm.readingTime)}</span></div>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button onClick={savePlanEdit} className="rounded-2xl bg-[#7C3AED] px-4 py-3 font-medium text-white">Save changes</button>
                  <button onClick={cancelPlanEdit} className="rounded-2xl border border-white/10 px-4 py-3 text-[#F8FAFC]">Cancel</button>
                </div>
              </div>
            ) : null}

            {planStats && (
              <>
                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm text-white/60">Target pace</div>
                    <div className="mt-1 text-xl font-semibold">{planStats.chaptersPerDayExact.toFixed(2)}</div>
                    <div className="text-xs text-white/55">chapters per day</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm text-white/60">Planned load</div>
                    <div className="mt-1 text-xl font-semibold">
                      {planStats.minPerDay === planStats.maxPerDay ? `${planStats.maxPerDay}` : `${planStats.minPerDay}-${planStats.maxPerDay}`}
                    </div>
                    <div className="text-xs text-white/55">chapters per day</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm text-white/60">Remaining</div>
                    <div className="mt-1 text-xl font-semibold">{planStats.remainingChapters}</div>
                    <div className="text-xs text-white/55">chapters left</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm text-white/60">Needed now</div>
                    <div className="mt-1 text-xl font-semibold">{planStats.neededPerRemainingDay.toFixed(2)}</div>
                    <div className="text-xs text-white/55">chapters per remaining day</div>
                  </div>
                </div>

                <div className={cn(
                  "mb-5 rounded-2xl border p-4",
                  planStats.onTrack ? "border-emerald-400/20 bg-emerald-500/10" : "border-amber-400/20 bg-amber-500/10"
                )}>
                  <div className="font-medium">
                    {planStats.onTrack ? "On track to finish on time" : "Current pace is behind the target timeline"}
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    {planStats.onTrack
                      ? `Keep averaging about ${planStats.neededPerRemainingDay.toFixed(2)} chapters per remaining day to finish by ${formatDate(selectedPlan.endDate)}.`
                      : `To finish by ${formatDate(selectedPlan.endDate)}, this plan now needs about ${planStats.neededPerRemainingDay.toFixed(2)} chapters per remaining day.`}
                  </div>
                </div>
              </>
            )}

            <div className="max-h-[700px] space-y-3 overflow-auto pr-1">
              {selectedPlan.assignments.map((day) => (
                <div key={day.date} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/60">{formatDate(day.date)}</div>
                      <div className="mt-1 text-xs text-white/50">Reading time: {formatTime(selectedPlan.readingTime || "07:00")}</div>
                      <div className="text-lg font-medium">{day.readings.length} chapter{day.readings.length === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {day.readings.map((reading) => {
                      const completedMap = getCompletedMap(selectedPlan);
                      const done = !!completedMap[reading.key];
                      return (
                        <button
                          key={reading.key}
                          onClick={() => toggleChapterComplete(selectedPlan.id, reading.key)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                            done
                              ? "border-emerald-400/30 bg-emerald-500/10"
                              : "border-white/10 bg-[#0B1020]/50 hover:bg-white/5"
                          )}
                        >
                          <div>
                            <div className="font-medium">{reading.label || reading.book}</div>
                            {reading.chapter ? (
                              <div className="text-sm text-white/60">Chapter {reading.chapter}</div>
                            ) : null}
                          </div>
                          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5 text-white/35" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-white/60">No reading plan selected yet — create a plan or choose one from the list.</div>
        )}
      </SectionCard>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
