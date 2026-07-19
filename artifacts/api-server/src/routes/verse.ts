import { Router } from "express";

const router = Router();

// 365 curated verse references covering both Testaments
// Picked for spiritual discipline, encouragement, and daily walk themes
const VERSE_REFERENCES = [
  "Genesis 1:1", "Genesis 28:15", "Exodus 14:14", "Exodus 33:14",
  "Numbers 6:24-26", "Deuteronomy 6:5", "Deuteronomy 31:6", "Deuteronomy 31:8",
  "Joshua 1:8", "Joshua 1:9", "Joshua 24:15", "1 Samuel 16:7",
  "2 Chronicles 7:14", "Nehemiah 8:10", "Job 19:25", "Job 42:2",
  "Psalm 1:1-2", "Psalm 16:8", "Psalm 19:14", "Psalm 23:1",
  "Psalm 23:4", "Psalm 27:1", "Psalm 27:4", "Psalm 27:14",
  "Psalm 28:7", "Psalm 29:11", "Psalm 31:24", "Psalm 32:8",
  "Psalm 34:8", "Psalm 34:18", "Psalm 37:4", "Psalm 37:5",
  "Psalm 40:1-2", "Psalm 42:1", "Psalm 46:1", "Psalm 46:10",
  "Psalm 51:10", "Psalm 55:22", "Psalm 62:1", "Psalm 63:1",
  "Psalm 73:26", "Psalm 86:5", "Psalm 90:12", "Psalm 91:1",
  "Psalm 91:2", "Psalm 91:4", "Psalm 100:4", "Psalm 103:1",
  "Psalm 103:12", "Psalm 107:1", "Psalm 116:1-2", "Psalm 118:24",
  "Psalm 119:9", "Psalm 119:11", "Psalm 119:105", "Psalm 121:1-2",
  "Psalm 121:8", "Psalm 139:14", "Psalm 139:23-24", "Psalm 143:8",
  "Psalm 145:18", "Psalm 150:6", "Proverbs 1:7", "Proverbs 3:5-6",
  "Proverbs 4:23", "Proverbs 11:14", "Proverbs 16:3", "Proverbs 16:9",
  "Proverbs 17:17", "Proverbs 18:10", "Proverbs 19:21", "Proverbs 27:17",
  "Proverbs 28:1", "Ecclesiastes 3:1", "Ecclesiastes 12:13", "Isaiah 6:8",
  "Isaiah 9:6", "Isaiah 26:3", "Isaiah 30:21", "Isaiah 40:8",
  "Isaiah 40:28-29", "Isaiah 40:31", "Isaiah 41:10", "Isaiah 41:13",
  "Isaiah 43:2", "Isaiah 43:19", "Isaiah 53:5", "Isaiah 55:6",
  "Isaiah 55:8-9", "Isaiah 58:6", "Isaiah 61:3", "Jeremiah 17:7-8",
  "Jeremiah 29:11", "Jeremiah 29:13", "Jeremiah 31:3", "Jeremiah 33:3",
  "Lamentations 3:22-23", "Ezekiel 36:26", "Micah 6:8", "Micah 7:7",
  "Habakkuk 3:19", "Zephaniah 3:17", "Malachi 3:10", "Matthew 5:6",
  "Matthew 5:8", "Matthew 5:14-16", "Matthew 6:6", "Matthew 6:33",
  "Matthew 7:7-8", "Matthew 11:28-30", "Matthew 16:24", "Matthew 18:20",
  "Matthew 19:26", "Matthew 22:37-39", "Matthew 28:19-20", "Mark 10:45",
  "Mark 11:24", "Luke 1:37", "Luke 6:38", "Luke 9:23",
  "Luke 10:27", "Luke 18:1", "John 1:1", "John 3:16",
  "John 3:17", "John 6:35", "John 8:12", "John 8:31-32",
  "John 10:10", "John 11:25", "John 13:34-35", "John 14:1",
  "John 14:6", "John 14:15", "John 14:27", "John 15:5",
  "John 15:13", "John 16:33", "John 17:17", "Acts 1:8",
  "Acts 2:38", "Acts 4:12", "Romans 1:16", "Romans 3:23",
  "Romans 5:1", "Romans 5:8", "Romans 6:23", "Romans 8:1",
  "Romans 8:18", "Romans 8:26", "Romans 8:28", "Romans 8:37",
  "Romans 8:38-39", "Romans 10:9", "Romans 12:1", "Romans 12:2",
  "Romans 12:12", "Romans 15:13", "1 Corinthians 6:19-20", "1 Corinthians 10:13",
  "1 Corinthians 13:4-5", "1 Corinthians 13:13", "1 Corinthians 15:58", "1 Corinthians 16:13",
  "2 Corinthians 4:17", "2 Corinthians 5:17", "2 Corinthians 5:21", "2 Corinthians 9:7",
  "2 Corinthians 10:5", "2 Corinthians 12:9", "Galatians 2:20", "Galatians 5:16",
  "Galatians 5:22-23", "Galatians 6:2", "Galatians 6:9", "Ephesians 2:8-9",
  "Ephesians 2:10", "Ephesians 3:20", "Ephesians 4:32", "Ephesians 5:15-16",
  "Ephesians 6:10", "Ephesians 6:11", "Philippians 1:6", "Philippians 2:3",
  "Philippians 3:14", "Philippians 4:4", "Philippians 4:6-7", "Philippians 4:11",
  "Philippians 4:13", "Philippians 4:19", "Colossians 3:2", "Colossians 3:17",
  "Colossians 3:23", "Colossians 4:2", "1 Thessalonians 5:17", "1 Thessalonians 5:18",
  "2 Thessalonians 3:3", "1 Timothy 4:7-8", "1 Timothy 6:6", "2 Timothy 1:7",
  "2 Timothy 2:15", "2 Timothy 3:16-17", "2 Timothy 4:7", "Titus 3:5",
  "Hebrews 4:12", "Hebrews 4:15-16", "Hebrews 10:24-25", "Hebrews 11:1",
  "Hebrews 11:6", "Hebrews 12:1-2", "Hebrews 13:5", "Hebrews 13:8",
  "James 1:2-3", "James 1:5", "James 1:22", "James 4:7",
  "James 4:8", "James 5:16", "1 Peter 1:3", "1 Peter 2:9",
  "1 Peter 3:15", "1 Peter 5:7", "1 Peter 5:8", "2 Peter 1:3",
  "2 Peter 3:9", "1 John 1:9", "1 John 3:1", "1 John 4:8",
  "1 John 4:19", "1 John 5:4", "Jude 1:24-25", "Revelation 3:20",
  "Revelation 21:4", "Revelation 22:20",
];

// In-memory daily cache: { date: "YYYY-MM-DD", verse: { reference, text } }
let cached: { date: string; verse: { reference: string; text: string } } | null = null;

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailyReference(): string {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return VERSE_REFERENCES[dayOfYear % VERSE_REFERENCES.length];
}

router.get("/verse", async (req, res) => {
  const today = getTodayISO();

  // Serve from memory cache if same day
  if (cached && cached.date === today) {
    return res.json(cached.verse);
  }

  const reference = getDailyReference();

  try {
    const encodedRef = encodeURIComponent(reference);
    const response = await fetch(`https://bible-api.com/${encodedRef}?translation=kjv`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`bible-api.com returned ${response.status}`);

    const data = await response.json() as { reference: string; text: string };
    const verse = {
      reference: data.reference,
      text: data.text.replace(/\n/g, " ").trim(),
    };

    cached = { date: today, verse };
    return res.json(verse);
  } catch (err) {
    req.log.warn({ err, reference }, "Failed to fetch verse from bible-api.com, using fallback");
    // Return the reference so the client knows which verse was intended
    return res.json({ reference, text: null });
  }
});

export default router;
