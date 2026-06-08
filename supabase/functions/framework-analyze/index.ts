// Framework Analyze — extracts claims from an artifact and compares them
// against the user's existing belief framework using Gemini (OpenAI-compat API).
// Also extracts grounded knowledge entities and actionable teachings (with service role).
// Epistemology v1: per-claim layers in artifact_claims.epistemology (see docs/EPistemology.md for v2 roadmap).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { generateChaptersFromTranscript } from "../_shared/generateTranscriptChapters.ts";
import type { YoutubeChapter } from "../_shared/youtubeChapters.ts";
import {
  collectTranscriptTextsStartingInHalfOpenRange,
  sliceTextByDurationFraction,
  splitTranscript,
  type TranscriptSegment,
} from "../_shared/transcriptSlice.ts";
import {
  CLAIM_TYPES,
  CONFIDENCE_LEVELS,
  EPISTEMOLOGY_PROMPT_BLOCK,
  SUGGESTED_ACTIONS,
  sanitizeEpistemology,
} from "../_shared/epistemology.ts";
import { callChatWithTools, getChatConfig } from "../_shared/aiProvider.ts";
import {
  generateArtifactFrameworkOverview,
  persistArtifactFrameworkOverview,
} from "../_shared/artifactOverviewSummary.ts";
import { drainPendingEmbeddingJobs } from "../_shared/embeddingJobDrain.ts";
import { clearAiUsageContext, setAiUsageContext } from "../_shared/logAiUsage.ts";
/** Max transcript characters fed to a single extraction prompt. Gemini 2.5 Pro has a 1M-token window; this is well within it. */
const ANALYSIS_TEXT_CAP = 200_000;

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Hard cap on persisted rows per artifact (DB + UI cost). Default 120 supports ~10 chapters × ~12 claims
 * while staying bounded; raise via `FRAMEWORK_ANALYZE_MAX_CLAIMS` if your workspace needs more.
 */
const MAX_PERSISTED_CLAIMS = envInt("FRAMEWORK_ANALYZE_MAX_CLAIMS", 120);
/** When no YouTube chapters exist, optional second pass uses this spacing (seconds). Override: `FRAMEWORK_ANALYZE_CHUNK_SPACING_SEC`. */
const CHUNK_SPACING_SECONDS = envInt("FRAMEWORK_ANALYZE_CHUNK_SPACING_SEC", 540);
/** Minimum video duration (seconds) before we add the optional timed chunk pass (no-chapters path). */
const MIN_DURATION_FOR_CHUNK_PASS_SEC = envInt("FRAMEWORK_ANALYZE_MIN_DURATION_CHUNK_PASS_SEC", 1500);
/** Max persisted teachings from a single artifact. Bumped from 20. */
const MAX_PERSISTED_TEACHINGS = 30;

interface Belief {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

interface ClaimOut {
  claim: string;
  tone?: string;
  doctrine_tags?: string[];
  scripture_supports?: { ref: string; note?: string }[];
  scripture_challenges?: { ref: string; note?: string }[];
  matched_belief_id?: string | null;
  match_relation?: "agree" | "disagree" | "new" | null;
  bias_flags?: string[];
  epistemology?: Record<string, unknown>;
}

type EntityKindDb =
  | "book"
  | "person"
  | "scripture"
  | "dream_vision"
  | "fear"
  | "question"
  | "project"
  | "business";

interface EntityBook {
  title?: string;
  author?: string;
  snippet?: string;
  confidence?: number;
}
interface EntityPerson {
  name?: string;
  role?: string;
  snippet?: string;
  confidence?: number;
}
interface EntityScripture {
  ref?: string;
  translation?: string;
  snippet?: string;
  confidence?: number;
}
interface EntityDream {
  title?: string;
  summary?: string;
  snippet?: string;
  confidence?: number;
}
interface EntitySimple {
  title?: string;
  snippet?: string;
  confidence?: number;
}
interface EntityProject {
  title?: string;
  status?: string;
  snippet?: string;
  confidence?: number;
}

interface KnowledgeEntitiesPayload {
  books?: EntityBook[];
  people?: EntityPerson[];
  scriptures?: EntityScripture[];
  dreams_visions?: EntityDream[];
  fears?: EntitySimple[];
  questions?: EntitySimple[];
  projects?: EntityProject[];
  businesses?: EntitySimple[];
}

type TeachingCategory =
  | "practice"
  | "principle"
  | "warning"
  | "identity"
  | "prayer"
  | "discipline"
  | "strategy"
  | "question";

interface TeachingOut {
  title?: string;
  summary?: string;
  category?: string;
  scriptures?: string[];
  snippet?: string;
  confidence?: number;
}

interface TeachingsPayload {
  teachings?: TeachingOut[];
}

interface ClaimWithChapter extends ClaimOut {
  chapter_start_seconds?: number | null;
}

function parseYoutubeChaptersFromMetadata(metadata: unknown): YoutubeChapter[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).youtube_chapters;
  if (!Array.isArray(raw)) return [];
  const out: YoutubeChapter[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const ss = typeof r.start_seconds === "number" ? r.start_seconds : Number(r.start_seconds);
    if (!title || !Number.isFinite(ss)) continue;
    out.push({ title, start_seconds: Math.floor(ss) });
  }
  out.sort((a, b) => a.start_seconds - b.start_seconds);
  const dedup: YoutubeChapter[] = [];
  for (const c of out) {
    const last = dedup[dedup.length - 1];
    if (last && last.start_seconds === c.start_seconds) continue;
    dedup.push(c);
  }
  return dedup;
}

function parseDurationSeconds(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const d = (metadata as Record<string, unknown>).duration_seconds;
  if (typeof d === "number" && Number.isFinite(d) && d > 0) return Math.floor(d);
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function transcriptSliceForWindow(params: {
  rawText: string;
  segments: TranscriptSegment[];
  timed: boolean;
  windowStartSec: number;
  windowEndExclusiveSec: number | null;
  durationSeconds: number | null;
}): string {
  const { rawText, segments, timed, windowStartSec, windowEndExclusiveSec, durationSeconds } = params;
  let body = "";
  if (timed) {
    body = collectTranscriptTextsStartingInHalfOpenRange(
      segments,
      windowStartSec,
      windowEndExclusiveSec,
    ).join("\n").trim();
  }
  if (!body && durationSeconds != null && durationSeconds > 0) {
    body = sliceTextByDurationFraction(
      rawText,
      windowStartSec,
      windowEndExclusiveSec ?? durationSeconds,
      durationSeconds,
    );
  }
  return body.slice(0, ANALYSIS_TEXT_CAP);
}

const SYSTEM = `You are a careful theology research assistant.
Your job is NOT to declare what is true. Your job is to surface claims, compare them to the user's stated beliefs, and cite scriptures that support or challenge the claim.
Be honest about uncertainty. Never speak as God or a prophet. Never push a denomination.
Always return strict JSON matching the requested schema. No prose outside JSON.`;

const ENTITY_SYSTEM = `You extract structured knowledge entities from a single artifact text for a personal knowledge base.
You must never invent or guess entities. Be extremely conservative.
Always return strict JSON via the tool call only. No prose outside JSON.`;

const TEACHING_SYSTEM = `You extract actionable TEACHINGS from a single artifact (sermon, podcast, article, etc.) for a personal Christian framework app.
Teachings are what the source proposes the listener should believe, practice, pray, avoid, or examine — distinct from neutral factual "claims".
You must never invent teachings not grounded in the text. Each teaching MUST include a verbatim snippet copied from the artifact.
For scriptures: only include a reference if that reference (or its verse text) clearly appears in the artifact text; otherwise use an empty array.
Always return strict JSON via the tool call only. No prose outside JSON.`;

function buildFullArtifactPrompt(text: string, beliefs: Belief[], minClaims: number, maxClaims: number) {
  const beliefSummary = beliefs.length
    ? beliefs
        .map(
          (b) =>
            `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 280)}" | confidence=${b.confidence}`,
        )
        .join("\n")
    : "(none yet — every claim should be marked match_relation:'new', matched_belief_id:null)";

  const clipped = text.slice(0, ANALYSIS_TEXT_CAP);
  const wasClipped = text.length > ANALYSIS_TEXT_CAP;

  return `USER'S CURRENT BELIEFS:
${beliefSummary}

ARTIFACT TEXT (sermon / podcast / lyrics / journal):
"""
${clipped}
"""${wasClipped ? "\n\n(Note: the artifact text was very long and was truncated to fit context. Cover the supplied text as fully as possible.)" : ""}

Task:
1. Extract ${minClaims} to ${maxClaims} of the most load-bearing CLAIMS from the artifact (1–2 sentences each). DISTRIBUTE COVERAGE across the beginning, middle, AND end of the transcript — do NOT cluster claims only in the opening minutes.
2. Order the claims roughly by their position in the transcript (earliest first).
3. For each claim, fill in:
   - tone: one of peace, fear, urgency, shame, hope, conviction, neutral, anger, comfort
   - doctrine_tags: 1–3 short tags (e.g. "soteriology", "suffering", "prosperity", "spiritual gifts")
   - scripture_supports: 0–3 verses that support the claim, with a one-line note
   - scripture_challenges: 0–3 verses that challenge or complicate the claim, with a one-line note
   - matched_belief_id: the user belief id this claim most closely relates to, or null
   - match_relation: "agree" if the user's belief agrees with the claim, "disagree" if it conflicts, "new" if there is no clear matching belief
   - bias_flags: 0–3 short flags such as "fear-based framing", "guilt appeal", "out-of-context proof-text", "emotional manipulation", "denominational assumption" — only when clearly present
${EPISTEMOLOGY_PROMPT_BLOCK}

Return ONLY valid JSON of shape:
{ "claims": ClaimOut[] } (each claim may include an "epistemology" object with the fields above).`;
}

function buildChapterSlicePrompt(
  sliceText: string,
  beliefs: Belief[],
  chapterTitle: string,
  chapterStartSeconds: number,
  nextChapterStartSeconds: number | null,
  minClaims: number,
  maxClaims: number,
) {
  const beliefSummary = beliefs.length
    ? beliefs
        .map(
          (b) =>
            `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 280)}" | confidence=${b.confidence}`,
        )
        .join("\n")
    : "(none yet — every claim should be marked match_relation:'new', matched_belief_id:null)";

  const clipped = sliceText.slice(0, ANALYSIS_TEXT_CAP);
  const wasClipped = sliceText.length > ANALYSIS_TEXT_CAP;
  const windowNote =
    nextChapterStartSeconds != null
      ? `This slice covers transcript time roughly ${chapterStartSeconds}s up to (but not including) ${nextChapterStartSeconds}s.`
      : `This slice begins at ${chapterStartSeconds}s through the end of the talk.`;

  return `USER'S CURRENT BELIEFS:
${beliefSummary}

YOUTUBE CHAPTER SPINE (one section of the longer artifact):
- Chapter title: "${chapterTitle.replace(/"/g, '\\"')}"
- ${windowNote}

TRANSCRIPT SLICE FOR THIS CHAPTER ONLY:
"""
${clipped}
"""${wasClipped ? "\n\n(Note: slice was truncated for context — cover the supplied slice as fully as possible.)" : ""}

Task:
1. Extract ${minClaims} to ${maxClaims} load-bearing CLAIMS grounded ONLY in this slice (1–2 sentences each). Stay specific to this chapter; do not invent content from other parts of the video.
2. Order claims by their order within this slice (earliest first).
3. For each claim, fill in the same fields as in the full-artifact task (tone, doctrine_tags, scripture_supports/challenges, matched_belief_id, match_relation, bias_flags, epistemology).
${EPISTEMOLOGY_PROMPT_BLOCK}

Return ONLY valid JSON of shape:
{ "claims": ClaimOut[] }`;
}

function buildTimedChunkPrompt(sliceText: string, beliefs: Belief[], windowLabel: string, minClaims: number, maxClaims: number) {
  const beliefSummary = beliefs.length
    ? beliefs
        .map(
          (b) =>
            `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 280)}" | confidence=${b.confidence}`,
        )
        .join("\n")
    : "(none yet — every claim should be marked match_relation:'new', matched_belief_id:null)";

  const clipped = sliceText.slice(0, ANALYSIS_TEXT_CAP);

  return `USER'S CURRENT BELIEFS:
${beliefSummary}

ADDITIONAL TRANSCRIPT WINDOW (${windowLabel}) — use when the full-pass may have under-covered the middle or late portions:
"""
${clipped}
"""

Task:
1. Extract ${minClaims} to ${maxClaims} NEW load-bearing CLAIMS found primarily in this window. Skip near-duplicates of claims you would expect from an earlier full-pass on the entire transcript; focus on additional theses, qualifications, or applications that appear here.
2. Order by position within this window.
3. Same per-claim fields as the full-artifact extraction task (including epistemology).
${EPISTEMOLOGY_PROMPT_BLOCK}

Return ONLY valid JSON of shape:
{ "claims": ClaimOut[] }`;
}

function buildEntityPrompt(text: string) {
  return `ARTIFACT TEXT (verbatim source; your snippets MUST be copied from this):
"""
${text.slice(0, ANALYSIS_TEXT_CAP)}
"""

Extract structured knowledge entities that are DIRECTLY evidenced in the text above.

Strict rules:
- Only include entities directly evidenced in the text. Each entity MUST include a quoted \`snippet\` field: a contiguous substring copied VERBATIM from the artifact text (≤200 characters). If you cannot copy an exact substring, OMIT the entity.
- \`confidence\` must be between 0.4 and 0.95 (use 0.4–0.6 when somewhat implicit; 0.8+ only when very explicit).
- Books: plausible published work titles only; if author is unknown, omit \`author\` (never guess).
- People: real individuals named or clearly identified; \`role\` only if stated (e.g. pastor, author); omit if unknown.
- Scriptures: normalize \`ref\` to the form "Book Chapter:Verse" or "Book Chapter:Verse–Verse" (en dash between verse numbers when a range). \`translation\` only if the text names one; otherwise omit.
- Dreams/visions: only when the text describes a dream or vision; \`summary\` must paraphrase only what the snippet supports.
- Fears, questions, projects, businesses: short human-readable \`title\`; do not invent details not grounded in the snippet.
- Do NOT output entities the user "might" have meant, hypotheticals, or filler.

Return via the tool with this shape (arrays may be empty):
{
  "books": [{ "title": "...", "author": "...", "snippet": "...", "confidence": 0.0 }],
  "people": [{ "name": "...", "role": "...", "snippet": "...", "confidence": 0.0 }],
  "scriptures": [{ "ref": "John 3:16", "translation": "ESV", "snippet": "...", "confidence": 0.0 }],
  "dreams_visions": [{ "title": "...", "summary": "...", "snippet": "...", "confidence": 0.0 }],
  "fears": [{ "title": "...", "snippet": "...", "confidence": 0.0 }],
  "questions": [{ "title": "...", "snippet": "...", "confidence": 0.0 }],
  "projects": [{ "title": "...", "status": "...", "snippet": "...", "confidence": 0.0 }],
  "businesses": [{ "title": "...", "snippet": "...", "confidence": 0.0 }]
}`;
}

function buildTeachingPrompt(text: string) {
  return `ARTIFACT TEXT (verbatim source; your snippet MUST be copied from this):
"""
${text.slice(0, ANALYSIS_TEXT_CAP)}
"""

Extract 8–22 TEACHINGS the source proposes: practices, principles, warnings, identity postures, prayers, disciplines, strategies, or reflective questions. DISTRIBUTE coverage across the beginning, middle, AND end of the transcript — do not cluster teachings only in the opening minutes.

Strict rules:
- Each teaching MUST include \`snippet\`: a contiguous substring copied VERBATIM from the artifact text (≤200 characters). If you cannot copy an exact substring, OMIT the teaching.
- \`confidence\` must be between 0.4 and 0.95.
- \`summary\`: 1–2 sentences in second person ("you") describing what the source is inviting you toward.
- \`category\` must be one of: practice, principle, warning, identity, prayer, discipline, strategy, question.
- \`scriptures\`: only verses explicitly present or clearly cited in the artifact; otherwise [].
- \`title\`: short, specific (≤120 chars).

Return via the tool with shape: { "teachings": [ { "title", "summary", "category", "scriptures", "snippet", "confidence" } ] }`;
}

const TEACHING_TOOL = {
  type: "function",
  function: {
    name: "submit_teachings",
    description: "Submit extracted teachings grounded in the artifact text.",
    parameters: {
      type: "object",
      properties: {
        teachings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              category: {
                type: "string",
                enum: ["practice", "principle", "warning", "identity", "prayer", "discipline", "strategy", "question"],
              },
              scriptures: { type: "array", items: { type: "string" } },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "summary", "category", "scriptures", "snippet", "confidence"],
          },
        },
      },
      required: ["teachings"],
    },
  },
} as const;

const TOOL = {
  type: "function",
  function: {
    name: "submit_claims",
    description: "Submit the extracted claim analysis.",
    parameters: {
      type: "object",
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              tone: { type: "string" },
              doctrine_tags: { type: "array", items: { type: "string" } },
              scripture_supports: {
                type: "array",
                items: {
                  type: "object",
                  properties: { ref: { type: "string" }, note: { type: "string" } },
                  required: ["ref"],
                },
              },
              scripture_challenges: {
                type: "array",
                items: {
                  type: "object",
                  properties: { ref: { type: "string" }, note: { type: "string" } },
                  required: ["ref"],
                },
              },
              matched_belief_id: { type: ["string", "null"] },
              match_relation: { type: ["string", "null"], enum: ["agree", "disagree", "new", null] },
              bias_flags: { type: "array", items: { type: "string" } },
              epistemology: {
                type: "object",
                properties: {
                  claim_types: { type: "array", items: { type: "string", enum: [...CLAIM_TYPES] } },
                  confidence_level: { type: "string", enum: [...CONFIDENCE_LEVELS] },
                  hermeneutics: {
                    type: "object",
                    properties: {
                      reasoning_bridge: { type: "string" },
                      assumptions: { type: "array", items: { type: "string" } },
                      potential_weaknesses: { type: "array", items: { type: "string" } },
                    },
                  },
                  fruits: { type: "array", items: { type: "string" } },
                  suggested_actions: {
                    type: "array",
                    items: { type: "string", enum: [...SUGGESTED_ACTIONS] },
                  },
                },
              },
            },
            required: ["claim"],
          },
        },
      },
      required: ["claims"],
    },
  },
} as const;

const ENTITY_TOOL = {
  type: "function",
  function: {
    name: "submit_knowledge_entities",
    description: "Submit extracted knowledge entities grounded in the artifact text.",
    parameters: {
      type: "object",
      properties: {
        books: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              author: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
        people: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["name", "snippet", "confidence"],
          },
        },
        scriptures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string" },
              translation: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["ref", "snippet", "confidence"],
          },
        },
        dreams_visions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
        fears: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              status: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
        businesses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              snippet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["title", "snippet", "confidence"],
          },
        },
      },
      required: [
        "books",
        "people",
        "scriptures",
        "dreams_visions",
        "fears",
        "questions",
        "projects",
        "businesses",
      ],
    },
  },
} as const;

function normalizeTextForMatch(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function snippetIsGrounded(rawText: string, snippet: string): boolean {
  const t = normalizeTextForMatch(rawText);
  const sn = normalizeTextForMatch((snippet ?? "").trim());
  if (!sn || sn.length > 200) return false;
  return t.includes(sn);
}

function clampConfidence(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? n : 0.5;
  return Math.min(0.95, Math.max(0.4, x));
}

function emptyEntityCounts() {
  return {
    books: 0,
    people: 0,
    scriptures: 0,
    dreams_visions: 0,
    fears: 0,
    questions: 0,
    projects: 0,
    businesses: 0,
  };
}

const TEACHING_CATEGORIES = new Set<string>([
  "practice",
  "principle",
  "warning",
  "identity",
  "prayer",
  "discipline",
  "strategy",
  "question",
]);

function emptyTeachingCounts() {
  return {
    practice: 0,
    principle: 0,
    warning: 0,
    identity: 0,
    prayer: 0,
    discipline: 0,
    strategy: 0,
    question: 0,
  };
}

function parseTeachingCategory(raw: unknown): TeachingCategory | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toLowerCase();
  return TEACHING_CATEGORIES.has(c) ? (c as TeachingCategory) : null;
}

function scriptureRefLikelyInText(rawText: string, ref: string): boolean {
  const t = normalizeTextForMatch(rawText).toLowerCase();
  const r = normalizeTextForMatch(ref).trim().toLowerCase();
  if (!r || r.length < 3) return false;
  if (t.includes(r)) return true;
  const compact = r.replace(/\s+/g, "");
  return compact.length >= 4 && t.replace(/\s+/g, "").includes(compact);
}

function filterTeachingsScriptures(rawText: string, refs: unknown): string[] {
  if (!Array.isArray(refs)) return [];
  const out: string[] = [];
  for (const x of refs) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    if (!scriptureRefLikelyInText(rawText, s)) continue;
    if (out.length < 12 && !out.some((y) => y.toLowerCase() === s.toLowerCase())) out.push(s.slice(0, 120));
  }
  return out;
}

async function persistTeachingsForArtifact(params: {
  admin: SupabaseClient;
  userId: string;
  artifactId: string;
  rawText: string;
  teachings: TeachingOut[];
}): Promise<{ counts: ReturnType<typeof emptyTeachingCounts>; inserted: number }> {
  const { admin, userId, artifactId, rawText } = params;
  const counts = emptyTeachingCounts();

  await admin.from("teachings").delete().eq("artifact_id", artifactId).eq("status", "proposed");

  const rows: {
    user_id: string;
    artifact_id: string;
    title: string;
    summary: string | null;
    category: TeachingCategory;
    scriptures: string[];
    source_snippet: string;
    confidence: number;
    status: string;
  }[] = [];

  for (const tg of params.teachings.slice(0, MAX_PERSISTED_TEACHINGS)) {
    const sn = (tg.snippet ?? "").trim();
    if (!snippetIsGrounded(rawText, sn)) continue;
    const title = (tg.title ?? "").trim().slice(0, 500);
    if (!title) continue;
    const cat = parseTeachingCategory(tg.category);
    if (!cat) continue;
    const summary = typeof tg.summary === "string" ? tg.summary.trim().slice(0, 1200) || null : null;
    rows.push({
      user_id: userId,
      artifact_id: artifactId,
      title,
      summary,
      category: cat,
      scriptures: filterTeachingsScriptures(rawText, tg.scriptures),
      source_snippet: sn.slice(0, 200),
      confidence: clampConfidence(tg.confidence),
      status: "proposed",
    });
    counts[cat]++;
  }

  if (rows.length > 0) {
    const { error } = await admin.from("teachings").insert(rows);
    if (error) console.error("teachings insert", error);
  }

  return { counts, inserted: rows.length };
}

function parseKnowledgeEntitiesPayload(raw: unknown): KnowledgeEntitiesPayload {
  if (!raw || typeof raw !== "object") return {};
  return raw as KnowledgeEntitiesPayload;
}

function parseToolCall(json: unknown, toolName: string): string | null {
  const j = json as {
    choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
  };
  const toolCalls = j?.choices?.[0]?.message?.tool_calls;
  const match = toolCalls?.find((t) => t?.function?.name === toolName);
  if (match?.function?.arguments) return match.function.arguments;
  return null;
}

async function persistEntitiesForArtifact(params: {
  admin: SupabaseClient;
  userId: string;
  artifactId: string;
  rawText: string;
  payload: KnowledgeEntitiesPayload;
}) {
  const { admin, userId, artifactId, rawText } = params;
  const payload = params.payload;

  await admin.from("entity_mentions").delete().eq("artifact_id", artifactId);

  type WorkItem = {
    kind: EntityKindDb;
    title: string;
    subtitle: string | null;
    metadata: Record<string, unknown>;
    snippet: string;
    confidence: number;
  };

  const items: WorkItem[] = [];

  const push = (w: Omit<WorkItem, "snippet" | "confidence"> & { snippet?: string; confidence?: number }) => {
    const sn = (w.snippet ?? "").trim();
    if (!snippetIsGrounded(rawText, sn)) return;
    const title = w.title.trim().slice(0, 500);
    if (!title) return;
    items.push({
      kind: w.kind,
      title,
      subtitle: w.subtitle,
      metadata: w.metadata ?? {},
      snippet: sn.slice(0, 200),
      confidence: clampConfidence(w.confidence),
    });
  };

  for (const b of payload.books ?? []) {
    const title = (b.title ?? "").trim();
    if (!title) continue;
    push({
      kind: "book",
      title,
      subtitle: (b.author ?? "").trim() || null,
      metadata: {},
      snippet: b.snippet,
      confidence: b.confidence,
    });
  }
  for (const p of payload.people ?? []) {
    const title = (p.name ?? "").trim();
    if (!title) continue;
    push({
      kind: "person",
      title,
      subtitle: (p.role ?? "").trim() || null,
      metadata: {},
      snippet: p.snippet,
      confidence: p.confidence,
    });
  }
  for (const s of payload.scriptures ?? []) {
    const title = (s.ref ?? "").trim();
    if (!title) continue;
    push({
      kind: "scripture",
      title,
      subtitle: (s.translation ?? "").trim() || null,
      metadata: {},
      snippet: s.snippet,
      confidence: s.confidence,
    });
  }
  for (const d of payload.dreams_visions ?? []) {
    const title = (d.title ?? "").trim();
    if (!title) continue;
    const summary = (d.summary ?? "").trim();
    push({
      kind: "dream_vision",
      title,
      subtitle: null,
      metadata: summary ? { summary } : {},
      snippet: d.snippet,
      confidence: d.confidence,
    });
  }
  for (const f of payload.fears ?? []) {
    const title = (f.title ?? "").trim();
    if (!title) continue;
    push({
      kind: "fear",
      title,
      subtitle: null,
      metadata: {},
      snippet: f.snippet,
      confidence: f.confidence,
    });
  }
  for (const q of payload.questions ?? []) {
    const title = (q.title ?? "").trim();
    if (!title) continue;
    push({
      kind: "question",
      title,
      subtitle: null,
      metadata: {},
      snippet: q.snippet,
      confidence: q.confidence,
    });
  }
  for (const pr of payload.projects ?? []) {
    const title = (pr.title ?? "").trim();
    if (!title) continue;
    push({
      kind: "project",
      title,
      subtitle: (pr.status ?? "").trim() || null,
      metadata: {},
      snippet: pr.snippet,
      confidence: pr.confidence,
    });
  }
  for (const bu of payload.businesses ?? []) {
    const title = (bu.title ?? "").trim();
    if (!title) continue;
    push({
      kind: "business",
      title,
      subtitle: null,
      metadata: {},
      snippet: bu.snippet,
      confidence: bu.confidence,
    });
  }

  const mentionRows: {
    user_id: string;
    entity_id: string;
    artifact_id: string;
    snippet: string;
    confidence: number;
  }[] = [];

  const counts = emptyEntityCounts();

  for (const it of items) {
    const { data: entityId, error: rpcErr } = await admin.rpc("merge_knowledge_entity", {
      p_user_id: userId,
      p_kind: it.kind,
      p_title: it.title,
      p_subtitle: it.subtitle ?? "",
      p_metadata: it.metadata,
      p_confidence: it.confidence,
    });
    if (rpcErr || !entityId) {
      console.error("merge_knowledge_entity", rpcErr);
      continue;
    }
    if (it.kind === "book") counts.books++;
    else if (it.kind === "person") counts.people++;
    else if (it.kind === "scripture") counts.scriptures++;
    else if (it.kind === "dream_vision") counts.dreams_visions++;
    else if (it.kind === "fear") counts.fears++;
    else if (it.kind === "question") counts.questions++;
    else if (it.kind === "project") counts.projects++;
    else if (it.kind === "business") counts.businesses++;

    mentionRows.push({
      user_id: userId,
      entity_id: entityId as string,
      artifact_id: artifactId,
      snippet: it.snippet,
      confidence: it.confidence,
    });
  }

  if (mentionRows.length > 0) {
    const { error: insM } = await admin.from("entity_mentions").insert(mentionRows);
    if (insM) console.error("entity_mentions insert", insM);
  }

  return { counts, mentionCount: mentionRows.length };
}

function parseSubmitClaimsFromResponse(json: unknown): ClaimOut[] {
  const argsStr = parseToolCall(json, "submit_claims");
  if (argsStr) {
    try {
      const parsed = JSON.parse(argsStr) as { claims?: ClaimOut[] };
      return parsed.claims ?? [];
    } catch (e) {
      console.error("parse fail", e);
    }
  }
  const j = json as { choices?: { message?: { content?: string } }[] };
  const content = j?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content) as { claims?: ClaimOut[] };
      return parsed.claims ?? [];
    } catch {
      /* ignore */
    }
  }
  return [];
}

type ClaimGeminiResult =
  | { kind: "ok"; json: unknown }
  | { kind: "rate_limit" }
  | { kind: "billing" }
  | { kind: "gateway_err"; status: number; body: string };

async function geminiSubmitClaims(
  _apiKeyUnused: string,
  userPrompt: string,
): Promise<ClaimGeminiResult> {
  const r = await callChatWithTools(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ],
    [TOOL],
    { type: "function", function: { name: "submit_claims" } },
    8192,
  );
  if (r.status === 429) return { kind: "rate_limit" };
  if (r.status === 402) return { kind: "billing" };
  if (!r.ok) {
    const t = await r.text();
    console.error("AI gateway error:", r.status, t);
    return { kind: "gateway_err", status: r.status, body: t };
  }
  return { kind: "ok", json: await r.json() };
}

/** Returns a finished HTTP Response on rate limit / billing; throws on gateway error; `null` when OK to continue. */
async function abortClaimsIfBadGateway(
  supabase: SupabaseClient,
  artifact_id: string,
  gw: ClaimGeminiResult,
): Promise<Response | null> {
  if (gw.kind === "ok") return null;
  if (gw.kind === "rate_limit" || gw.kind === "billing") {
    const msg =
      gw.kind === "rate_limit"
        ? "Rate limited — try again in a moment."
        : "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
    const status = gw.kind === "rate_limit" ? 429 : 402;
    await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await supabase.from("artifacts").update({ status: "error", error: "AI gateway error" }).eq("id", artifact_id);
  throw new Error("AI gateway error");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const chatCfg = getChatConfig();
    if ("error" in chatCfg) throw new Error(chatCfg.error);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });

    const { artifact_id, processing_token } = (await req.json()) as { artifact_id?: string; processing_token?: string };
    if (!artifact_id || !processing_token) {
      return new Response(JSON.stringify({ error: "artifact_id and processing_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: artifact, error: aErr } = await supabase
      .from("artifacts")
      .select("id,user_id,title,raw_text,processing_token,metadata")
      .eq("id", artifact_id)
      .maybeSingle();
    if (aErr || !artifact) throw new Error("Artifact not found");
    if (artifact.processing_token !== processing_token) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    setAiUsageContext({
      functionName: "framework-analyze",
      userId: artifact.user_id as string,
      artifactId: artifact_id,
    });

    const { data: beliefs } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement,answer,confidence")
      .eq("user_id", artifact.user_id);

    const rawText = artifact.raw_text as string;
    const beliefsList = (beliefs as Belief[]) ?? [];
    const metadata = (artifact as { metadata?: unknown }).metadata;
    let chapters = parseYoutubeChaptersFromMetadata(metadata);
    const durationSeconds = parseDurationSeconds(metadata);
    const { segments, timed } = splitTranscript(rawText);

    if (chapters.length === 0 && rawText.trim().length >= 400) {
      const generated = await generateChaptersFromTranscript({
        apiKey: GEMINI_API_KEY,
        rawText,
        durationSeconds,
        title: (artifact as { title?: string | null }).title ?? null,
      });
      if (generated.chapters.length) {
        chapters = generated.chapters;
        const prevMeta = (metadata as Record<string, unknown> | null | undefined) ?? {};
        const nextMeta = {
          ...prevMeta,
          youtube_chapters: generated.chapters,
          youtube_chapters_source: generated.source,
        };
        await supabase.from("artifacts").update({ metadata: nextMeta }).eq("id", artifact_id);
        console.log(
          `framework-analyze: transcript chapters=${chapters.length} source=${generated.source}`,
        );
      }
    }

    const collected: ClaimWithChapter[] = [];

    if (chapters.length >= 1) {
      const perChapMin = 5;
      const perChapMax = 12;
      console.log(`framework-analyze: chapter spine chapters=${chapters.length}`);
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const nextCh = chapters[ci + 1];
        const sliceText = transcriptSliceForWindow({
          rawText,
          segments,
          timed,
          windowStartSec: ch.start_seconds,
          windowEndExclusiveSec: nextCh?.start_seconds ?? null,
          durationSeconds,
        });
        if (sliceText.trim().length < 80) {
          console.log(`framework-analyze: skip sparse chapter idx=${ci} start=${ch.start_seconds}`);
          continue;
        }
        const userPrompt = buildChapterSlicePrompt(
          sliceText,
          beliefsList,
          ch.title,
          ch.start_seconds,
          nextCh?.start_seconds ?? null,
          perChapMin,
          perChapMax,
        );
        const gw = await geminiSubmitClaims(GEMINI_API_KEY, userPrompt);
        const bad = await abortClaimsIfBadGateway(supabase, artifact_id, gw);
        if (bad) return bad;
        const claims = parseSubmitClaimsFromResponse((gw as { kind: "ok"; json: unknown }).json);
        for (const c of claims) {
          collected.push({ ...c, chapter_start_seconds: ch.start_seconds });
        }
        console.log(`framework-analyze: chapter ${ci + 1}/${chapters.length} claims=${claims.length}`);
      }
      if (collected.length === 0) {
        console.warn("framework-analyze: chapter spine produced 0 claims; falling back to full pass");
        const userPrompt = buildFullArtifactPrompt(rawText, beliefsList, 14, 36);
        const gw = await geminiSubmitClaims(GEMINI_API_KEY, userPrompt);
        const bad = await abortClaimsIfBadGateway(supabase, artifact_id, gw);
        if (bad) return bad;
        const claims = parseSubmitClaimsFromResponse((gw as { kind: "ok"; json: unknown }).json);
        for (const c of claims) collected.push({ ...c, chapter_start_seconds: null });
      }
    } else {
      const userPrompt = buildFullArtifactPrompt(rawText, beliefsList, 18, 45);
      const gw = await geminiSubmitClaims(GEMINI_API_KEY, userPrompt);
      const bad = await abortClaimsIfBadGateway(supabase, artifact_id, gw);
      if (bad) return bad;
      const claims = parseSubmitClaimsFromResponse((gw as { kind: "ok"; json: unknown }).json);
      for (const c of claims) collected.push({ ...c, chapter_start_seconds: null });
      console.log(`framework-analyze: no-chapters full pass claims=${claims.length}`);

      const useChunkPass =
        timed &&
        durationSeconds != null &&
        durationSeconds >= MIN_DURATION_FOR_CHUNK_PASS_SEC;
      if (useChunkPass) {
        const D = durationSeconds;
        for (let t = 0; t < D; t += CHUNK_SPACING_SECONDS) {
          const end = Math.min(t + CHUNK_SPACING_SECONDS, D);
          const sliceText = transcriptSliceForWindow({
            rawText,
            segments,
            timed: true,
            windowStartSec: t,
            windowEndExclusiveSec: end,
            durationSeconds: D,
          });
          if (sliceText.trim().length < 200) continue;
          const chunkPrompt = buildTimedChunkPrompt(
            sliceText,
            beliefsList,
            `${t}s–${end}s`,
            4,
            10,
          );
          const gwc = await geminiSubmitClaims(GEMINI_API_KEY, chunkPrompt);
          const badc = await abortClaimsIfBadGateway(supabase, artifact_id, gwc);
          if (badc) return badc;
          const chunkClaims = parseSubmitClaimsFromResponse((gwc as { kind: "ok"; json: unknown }).json);
          for (const c of chunkClaims) collected.push({ ...c, chapter_start_seconds: null });
          console.log(`framework-analyze: chunk pass ${t}-${end}s claims=${chunkClaims.length}`);
        }
      }
    }

    const validBeliefIds = new Set(beliefsList.map((b) => b.id));
    const rows = collected
      .filter((c) => typeof c.claim === "string" && c.claim.trim().length > 0)
      .slice(0, MAX_PERSISTED_CLAIMS)
      .map((c) => ({
      user_id: artifact.user_id,
      artifact_id,
      claim: c.claim,
      tone: c.tone ?? null,
      doctrine_tags: c.doctrine_tags ?? [],
      scripture_supports: c.scripture_supports ?? [],
      scripture_challenges: c.scripture_challenges ?? [],
      matched_belief_id:
        c.matched_belief_id && validBeliefIds.has(c.matched_belief_id)
          ? c.matched_belief_id
          : null,
      match_relation:
        c.match_relation ??
        (c.matched_belief_id && validBeliefIds.has(c.matched_belief_id) ? "agree" : "new"),
      bias_flags: c.bias_flags ?? [],
      chapter_start_seconds: c.chapter_start_seconds ?? null,
      epistemology: sanitizeEpistemology(c.epistemology) ?? {},
    }));

    console.log(
      `framework-analyze: persisted_claims=${rows.length} cap=${MAX_PERSISTED_CLAIMS} chapters=${chapters.length} timed=${timed}`,
    );

    const { data: gate } = await supabase
      .from("artifacts")
      .select("id")
      .eq("id", artifact_id)
      .eq("processing_token", processing_token)
      .maybeSingle();
    if (!gate) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("artifact_claims").delete().eq("artifact_id", artifact_id);

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("artifact_claims").insert(rows);
      if (insErr) console.error("insert claims err", insErr);
      else if (SERVICE_ROLE) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const userId = artifact.user_id as string;
        const embedJob = drainPendingEmbeddingJobs(admin, {
          userId,
          tableName: "artifact_claims",
          limit: 40,
          maxRounds: 12,
        });
        const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
          .EdgeRuntime;
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(embedJob);
        else await embedJob.catch((e) => console.error("claim embedding drain err", e));
      }
    }

    let entity_counts = emptyEntityCounts();
    let entity_mentions_written = 0;
    let teaching_counts = emptyTeachingCounts();
    let teaching_rows_written = 0;

    if (SERVICE_ROLE) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      try {
        const er = await callChatWithTools(
          [
            { role: "system", content: ENTITY_SYSTEM },
            { role: "user", content: buildEntityPrompt(artifact.raw_text as string) },
          ],
          [ENTITY_TOOL],
          { type: "function", function: { name: "submit_knowledge_entities" } },
        );
        if (er.ok) {
          const ej = await er.json();
          const eArgs = parseToolCall(ej, "submit_knowledge_entities");
          let entitiesParsed: KnowledgeEntitiesPayload = {};
          if (eArgs) {
            try {
              entitiesParsed = parseKnowledgeEntitiesPayload(JSON.parse(eArgs));
            } catch (e) {
              console.error("entity parse fail", e);
            }
          }
          const { data: gate2 } = await supabase
            .from("artifacts")
            .select("id")
            .eq("id", artifact_id)
            .eq("processing_token", processing_token)
            .maybeSingle();
          if (gate2) {
            const res = await persistEntitiesForArtifact({
              admin,
              userId: artifact.user_id as string,
              artifactId: artifact_id,
              rawText: artifact.raw_text as string,
              payload: entitiesParsed,
            });
            entity_counts = res.counts;
            entity_mentions_written = res.mentionCount;
          }
        } else {
          console.error("entity extraction gateway error:", er.status, await er.text());
        }

        const tr = await callChatWithTools(
          [
            { role: "system", content: TEACHING_SYSTEM },
            { role: "user", content: buildTeachingPrompt(artifact.raw_text as string) },
          ],
          [TEACHING_TOOL],
          { type: "function", function: { name: "submit_teachings" } },
        );
        if (tr.ok) {
          const tj = await tr.json();
          const tArgs = parseToolCall(tj, "submit_teachings");
          let teachingsParsed: TeachingsPayload = {};
          if (tArgs) {
            try {
              teachingsParsed = JSON.parse(tArgs) as TeachingsPayload;
            } catch (e) {
              console.error("teaching parse fail", e);
            }
          }
          const { data: gate3 } = await supabase
            .from("artifacts")
            .select("id")
            .eq("id", artifact_id)
            .eq("processing_token", processing_token)
            .maybeSingle();
          if (gate3) {
            const tres = await persistTeachingsForArtifact({
              admin,
              userId: artifact.user_id as string,
              artifactId: artifact_id,
              rawText: artifact.raw_text as string,
              teachings: teachingsParsed.teachings ?? [],
            });
            teaching_counts = tres.counts;
            teaching_rows_written = tres.inserted;
          }
        } else {
          console.error("teaching extraction gateway error:", tr.status, await tr.text());
        }
      } catch (e) {
        console.error("entity/teaching extraction failed:", e);
      }
    } else {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY missing — skipping knowledge entity + teaching persistence",
      );
    }

    let framework_overview_written = false;
    try {
      const { data: gateOverview } = await supabase
        .from("artifacts")
        .select("id,metadata")
        .eq("id", artifact_id)
        .eq("processing_token", processing_token)
        .maybeSingle();
      if (gateOverview) {
        const overview = await generateArtifactFrameworkOverview({
          rawText,
          beliefs: beliefsList,
          title: (artifact as { title?: string | null }).title ?? null,
        });
        if (overview) {
          await persistArtifactFrameworkOverview(
            supabase,
            artifact_id,
            (gateOverview as { metadata?: unknown }).metadata ?? metadata,
            overview,
          );
          framework_overview_written = true;
          console.log("framework-analyze: framework_overview persisted");
        }
      }
    } catch (e) {
      console.error("framework overview summary failed:", e);
    }

    await supabase
      .from("artifacts")
      .update({ status: "ready", error: rows.length === 0 ? "No claims could be extracted." : null })
      .eq("id", artifact_id)
      .eq("processing_token", processing_token);

    return new Response(
      JSON.stringify({
        ok: true,
        count: rows.length,
        entity_counts,
        entity_mentions_written,
        teaching_counts,
        teaching_rows_written,
        framework_overview_written,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("framework-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    clearAiUsageContext();
  }
});
