import { Router } from "express";

const router = Router();

// ~230 verse references curated specifically for spiritual discipline:
// Bible reading & meditation, daily prayer, fasting, seeking God,
// holiness, perseverance in practice, fellowship, and the Word of God.
const VERSE_REFERENCES = [
  // --- Scripture reading & meditation ---
  "Joshua 1:8",
  "Psalm 1:1-2",
  "Psalm 19:7-8",
  "Psalm 19:14",
  "Psalm 119:9",
  "Psalm 119:11",
  "Psalm 119:15-16",
  "Psalm 119:18",
  "Psalm 119:97",
  "Psalm 119:103",
  "Psalm 119:105",
  "Psalm 119:130",
  "Psalm 119:148",
  "Psalm 119:160",
  "Deuteronomy 6:6-7",
  "Deuteronomy 17:19",
  "Deuteronomy 32:47",
  "Isaiah 34:16",
  "Isaiah 55:10-11",
  "Jeremiah 15:16",
  "Ezekiel 3:10",
  "Matthew 4:4",
  "John 5:39",
  "John 8:31-32",
  "John 17:17",
  "Acts 17:11",
  "Romans 15:4",
  "Colossians 3:16",
  "2 Timothy 2:15",
  "2 Timothy 3:16-17",
  "Hebrews 4:12",
  "1 Peter 2:2",
  "Revelation 1:3",

  // --- Morning devotion & daily seeking ---
  "Psalm 5:3",
  "Psalm 57:7-8",
  "Psalm 59:16",
  "Psalm 63:1",
  "Psalm 90:14",
  "Psalm 92:1-2",
  "Psalm 130:5-6",
  "Psalm 143:8",
  "Lamentations 3:22-23",
  "Isaiah 50:4",
  "Mark 1:35",
  "Luke 4:16",

  // --- Prayer ---
  "1 Chronicles 16:11",
  "Psalm 17:6",
  "Psalm 32:6",
  "Psalm 55:17",
  "Psalm 62:8",
  "Psalm 86:3",
  "Psalm 102:1-2",
  "Psalm 141:2",
  "Isaiah 56:7",
  "Jeremiah 29:12",
  "Jeremiah 33:3",
  "Matthew 6:6",
  "Matthew 6:7-8",
  "Matthew 7:7-8",
  "Matthew 26:41",
  "Luke 18:1",
  "Luke 21:36",
  "John 15:7",
  "Acts 2:42",
  "Acts 6:4",
  "Romans 8:26",
  "Romans 12:12",
  "Ephesians 6:18",
  "Philippians 4:6-7",
  "Colossians 4:2",
  "1 Thessalonians 5:17",
  "1 Timothy 2:1",
  "Hebrews 4:15-16",
  "James 5:16",
  "1 John 5:14-15",

  // --- Fasting ---
  "Matthew 6:16-17",
  "Matthew 6:18",
  "Isaiah 58:6",
  "Isaiah 58:7",
  "Joel 2:12",
  "Acts 13:2-3",
  "Acts 14:23",
  "2 Corinthians 6:5",
  "2 Corinthians 11:27",

  // --- Self-discipline & holiness ---
  "Leviticus 20:7",
  "Psalm 4:4",
  "Psalm 15:1-2",
  "Psalm 24:3-4",
  "Psalm 51:10",
  "Psalm 101:3",
  "Proverbs 4:23",
  "Proverbs 25:16",
  "Proverbs 25:28",
  "Romans 6:13",
  "Romans 8:13",
  "Romans 12:1",
  "Romans 12:2",
  "Romans 13:14",
  "1 Corinthians 6:19-20",
  "1 Corinthians 9:24-25",
  "1 Corinthians 9:27",
  "1 Corinthians 10:31",
  "2 Corinthians 7:1",
  "2 Corinthians 10:5",
  "Galatians 5:16",
  "Galatians 5:24-25",
  "Ephesians 4:22-24",
  "Ephesians 5:15-16",
  "Colossians 3:5",
  "1 Thessalonians 4:3",
  "1 Thessalonians 4:7",
  "1 Timothy 4:7-8",
  "1 Timothy 6:11",
  "2 Timothy 2:22",
  "Titus 2:11-12",
  "Hebrews 12:14",
  "1 Peter 1:15-16",
  "1 Peter 2:11",
  "2 Peter 1:5-7",
  "1 John 2:6",
  "1 John 3:3",

  // --- Perseverance & consistency in spiritual practice ---
  "Psalm 27:14",
  "Psalm 37:5",
  "Psalm 40:1-2",
  "Isaiah 40:31",
  "Lamentations 3:25",
  "Daniel 6:10",
  "Matthew 10:22",
  "Matthew 24:13",
  "Luke 9:62",
  "John 15:4-5",
  "Romans 5:3-4",
  "Galatians 6:9",
  "Philippians 3:12-14",
  "Colossians 1:23",
  "2 Thessalonians 3:13",
  "1 Timothy 4:15-16",
  "2 Timothy 4:7",
  "Hebrews 10:35-36",
  "Hebrews 12:1-2",
  "Hebrews 12:11",
  "James 1:3-4",
  "James 1:25",
  "Revelation 2:10",
  "Revelation 3:11",

  // --- Seeking God wholeheartedly ---
  "Deuteronomy 4:29",
  "Deuteronomy 6:5",
  "1 Chronicles 28:9",
  "2 Chronicles 7:14",
  "Psalm 27:4",
  "Psalm 27:8",
  "Psalm 42:1-2",
  "Psalm 73:25-26",
  "Psalm 84:10",
  "Psalm 84:11",
  "Proverbs 8:17",
  "Isaiah 55:6",
  "Jeremiah 29:13",
  "Lamentations 3:40-41",
  "Hosea 6:3",
  "Amos 5:4",
  "Zephaniah 2:3",
  "Matthew 6:33",
  "Luke 10:42",
  "Hebrews 11:6",

  // --- Walking with God ---
  "Genesis 5:24",
  "Genesis 17:1",
  "Deuteronomy 10:12",
  "Micah 6:8",
  "Malachi 2:6",
  "John 14:15",
  "John 15:9-10",
  "Galatians 2:20",
  "Ephesians 5:1-2",
  "Colossians 2:6-7",
  "1 John 1:7",
  "2 John 1:6",

  // --- Fellowship & accountability ---
  "Proverbs 11:14",
  "Proverbs 27:17",
  "Ecclesiastes 4:9-10",
  "Malachi 3:16",
  "Matthew 18:20",
  "Acts 2:44-45",
  "Romans 12:10",
  "Hebrews 3:13",
  "Hebrews 10:24-25",
  "1 John 1:7",

  // --- Worship & adoration ---
  "Psalm 29:2",
  "Psalm 95:6",
  "Psalm 96:9",
  "Psalm 100:1-2",
  "Psalm 103:1",
  "Psalm 150:6",
  "Isaiah 6:3",
  "John 4:23-24",
  "Romans 12:1",
  "Revelation 4:11",

  // --- God's Word as daily bread ---
  "Psalm 119:14",
  "Psalm 119:72",
  "Psalm 119:162",
  "Job 23:12",
  "Matthew 4:4",
  "Luke 11:28",
  "John 6:63",
  "1 Peter 1:23",

  // --- Repentance & confession ---
  "Psalm 32:5",
  "Psalm 51:1-2",
  "Psalm 139:23-24",
  "Proverbs 28:13",
  "Isaiah 55:7",
  "Joel 2:13",
  "Acts 3:19",
  "James 4:8",
  "1 John 1:9",
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
