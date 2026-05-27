export type LiveClaimSignal =
  | "revelation"
  | "theological_claim"
  | "emotional_intensity"
  | "actionable_wisdom"
  | "contradiction"
  | "prophetic_language"
  | "scripture_reference"
  | "mindset_shift";

export type LiveTranscriptChunk = {
  id: string;
  text: string;
  startSeconds: number;
  speaker?: string | null;
};

export type LiveClaimCandidate = {
  id: string;
  claim: string;
  chunkId: string;
  startSeconds: number;
  category: LiveClaimSignal;
  confidence: number;
  emotionalWeight: number;
  signals: LiveClaimSignal[];
  linkedScriptures: string[];
};

const SCRIPTURE_BOOKS =
  "(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\\s?Samuel|2\\s?Samuel|1\\s?Kings|2\\s?Kings|1\\s?Chronicles|2\\s?Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs?|Ecclesiastes|Song\\s+of\\s+Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\\s?Corinthians|2\\s?Corinthians|Galatians|Ephesians|Philippians|Colossians|1\\s?Thessalonians|2\\s?Thessalonians|1\\s?Timothy|2\\s?Timothy|Titus|Philemon|Hebrews|James|1\\s?Peter|2\\s?Peter|1\\s?John|2\\s?John|3\\s?John|Jude|Revelation)";

const SCRIPTURE_RE = new RegExp(`\\b${SCRIPTURE_BOOKS}\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`, "gi");

const SIGNAL_PATTERNS: Array<{ signal: LiveClaimSignal; weight: number; re: RegExp }> = [
  {
    signal: "revelation",
    weight: 3,
    re: /\b(revelation|reveals?|what god showed|opened my eyes|now i understand|the lord showed)\b/i,
  },
  {
    signal: "theological_claim",
    weight: 3,
    re: /\b(god|jesus|christ|holy spirit|lord|faith|grace|sin|salvation|kingdom|covenant|scripture|prayer)\b.{0,80}\b(is|means|shows|requires|calls|does|will|cannot|must)\b/i,
  },
  {
    signal: "emotional_intensity",
    weight: 2,
    re: /\b(fear|anxiety|shame|grief|hope|joy|peace|surrender|breakthrough|wounded|healing|heart)\b/i,
  },
  {
    signal: "actionable_wisdom",
    weight: 2,
    re: /\b(you need to|we need to|must|should|practice|choose|stop|start|repent|forgive|pray|move|obey)\b/i,
  },
  {
    signal: "contradiction",
    weight: 2,
    re: /\b(but|however|instead|not .{0,50} but|contradict|tension|against)\b/i,
  },
  {
    signal: "prophetic_language",
    weight: 2,
    re: /\b(prophetic|prophecy|the lord says|god is saying|season|calling|anointing|vision)\b/i,
  },
  {
    signal: "mindset_shift",
    weight: 2,
    re: /\b(mindset|shift|renew|reframe|no longer|instead of|from .{2,40} to )\b/i,
  },
];

function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 33) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function parseClock(raw: string): number {
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function extractLeadingTimestamp(line: string): { seconds: number | null; text: string } {
  const match = line.match(/^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*/);
  if (!match) return { seconds: null, text: line.trim() };
  return {
    seconds: parseClock(match[1]),
    text: line.slice(match[0].length).trim(),
  };
}

function extractSpeaker(text: string): { speaker: string | null; text: string } {
  const match = text.match(/^([A-Z][A-Za-z .'-]{1,31}):\s+(.+)$/);
  if (!match || match[1].split(/\s+/).length > 4) return { speaker: null, text };
  return { speaker: match[1].trim(), text: match[2].trim() };
}

export function formatLiveClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function parseLiveTranscriptInput(raw: string, startAtSeconds = 0): LiveTranscriptChunk[] {
  let cursor = Math.max(0, Math.floor(startAtSeconds));
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const stamped = extractLeadingTimestamp(line);
      const startSeconds = stamped.seconds ?? cursor + index * 8;
      if (stamped.seconds != null) cursor = stamped.seconds;
      const speaker = extractSpeaker(stamped.text);
      const text = speaker.text.trim();
      return {
        id: `live-${startSeconds}-${stableHash(text)}`,
        startSeconds,
        speaker: speaker.speaker,
        text,
      };
    })
    .filter((chunk) => chunk.text.length > 0);
}

function splitClaimSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 18);
}

function scriptureRefs(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(SCRIPTURE_RE)).map((match) => match[0].replace(/\s+/g, " "))));
}

export function detectLiveClaimCandidates(chunks: LiveTranscriptChunk[]): LiveClaimCandidate[] {
  const seen = new Set<string>();
  const candidates: LiveClaimCandidate[] = [];

  for (const chunk of chunks) {
    for (const sentence of splitClaimSentences(chunk.text)) {
      const refs = scriptureRefs(sentence);
      const signalWeights = SIGNAL_PATTERNS.filter((pattern) => pattern.re.test(sentence));
      const signals = signalWeights.map((pattern) => pattern.signal);
      if (refs.length) signals.push("scripture_reference");

      const score = signalWeights.reduce((sum, pattern) => sum + pattern.weight, 0) + refs.length * 3;
      if (score < 3) continue;

      const normalized = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);

      const category = signals[0] ?? "theological_claim";
      const emotionalWeight =
        (signals.includes("emotional_intensity") ? 2 : 0) +
        (signals.includes("revelation") ? 1 : 0) +
        (signals.includes("prophetic_language") ? 1 : 0);

      candidates.push({
        id: `claim-${chunk.startSeconds}-${stableHash(sentence)}`,
        claim: sentence,
        chunkId: chunk.id,
        startSeconds: chunk.startSeconds,
        category,
        confidence: Math.min(0.98, Number((0.46 + score * 0.075).toFixed(2))),
        emotionalWeight: Math.min(5, emotionalWeight),
        signals: Array.from(new Set(signals)),
        linkedScriptures: refs,
      });
    }
  }

  return candidates.sort((a, b) => a.startSeconds - b.startSeconds);
}

export function buildLiveArtifactRawText(chunks: LiveTranscriptChunk[]): string {
  return chunks
    .slice()
    .sort((a, b) => a.startSeconds - b.startSeconds)
    .map((chunk) => `[${formatLiveClock(chunk.startSeconds)}] ${chunk.speaker ? `${chunk.speaker}: ` : ""}${chunk.text}`)
    .join("\n");
}
