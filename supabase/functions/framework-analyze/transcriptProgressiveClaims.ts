/** Progressive sermon claim extraction — from-start batches with per-batch persistence. */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  callChatJson,
  resolveAiProvider,
  type AiProvider,
} from "../_shared/aiProvider.ts";
import {
  collectTranscriptTextsStartingInHalfOpenRange,
  sliceTextByDurationFraction,
  type TranscriptSegment,
} from "../_shared/transcriptSlice.ts";

export type ClaimGeminiResult =
  | { kind: "ok"; json: unknown }
  | { kind: "rate_limit" }
  | { kind: "billing" }
  | { kind: "gateway_err"; status: number; body: string };

export interface BeliefRef {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
}

export interface ClaimOut {
  claim: string;
  tone?: string;
  doctrine_tags?: string[];
  scripture_supports?: { ref: string; note?: string }[];
  scripture_challenges?: { ref: string; note?: string }[];
  matched_belief_id?: string | null;
  match_relation?: "agree" | "disagree" | "new" | null;
  bias_flags?: string[];
}

export interface ClaimWithChapter extends ClaimOut {
  chapter_start_seconds?: number | null;
}

export function normalizeClaimDedupeKey(claim: string): string {
  return claim.toLowerCase().replace(/\s+/g, " ").trim();
}

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const TRANSCRIPT_BATCH_CHARS = envInt("FRAMEWORK_ANALYZE_TRANSCRIPT_BATCH_CHARS", 14_000);
const TRANSCRIPT_FIRST_BATCH_CHARS = envInt("FRAMEWORK_ANALYZE_TRANSCRIPT_FIRST_BATCH_CHARS", 11_000);
const TRANSCRIPT_BATCH_SECONDS = envInt("FRAMEWORK_ANALYZE_TRANSCRIPT_BATCH_SEC", 540);
const TRANSCRIPT_MAX_BATCHES = envInt("FRAMEWORK_ANALYZE_TRANSCRIPT_MAX_BATCHES", 10);
const CLAIM_CHUNK_DELAY_MS = envInt("FRAMEWORK_ANALYZE_CHUNK_DELAY_MS", 700);
const ANALYSIS_TEXT_CAP = 200_000;

function inferDurationSeconds(rawTextLength: number, durationSeconds: number | null): number {
  if (durationSeconds && durationSeconds > 0) return durationSeconds;
  return Math.max(3600, Math.floor(rawTextLength / 20));
}

function transcriptSliceForWindow(params: {
  rawText: string;
  segments: TranscriptSegment[];
  timed: boolean;
  windowStartSec: number;
  windowEndExclusiveSec: number | null;
  durationSeconds: number | null;
}): string {
  const { rawText, segments, timed, windowStartSec, windowEndExclusiveSec } = params;
  let durationSeconds = params.durationSeconds;
  let body = "";
  if (timed) {
    body = collectTranscriptTextsStartingInHalfOpenRange(
      segments,
      windowStartSec,
      windowEndExclusiveSec,
    ).join("\n").trim();
  }
  if (!body) {
    if (durationSeconds == null || durationSeconds <= 0) {
      durationSeconds = inferDurationSeconds(rawText.length, null);
    }
    body = sliceTextByDurationFraction(
      rawText,
      windowStartSec,
      windowEndExclusiveSec ?? durationSeconds,
      durationSeconds,
    );
  }
  return body.slice(0, ANALYSIS_TEXT_CAP);
}

function buildTranscriptSectionPrompt(
  sectionLabel: string,
  sectionText: string,
  beliefs: BeliefRef[],
  totalChars: number,
  minClaims = 6,
  maxClaims = 10,
): string {
  const beliefSummary = beliefs.length
    ? beliefs
        .slice(0, 24)
        .map(
          (b) =>
            `- id=${b.id} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 160)}"`,
        )
        .join("\n")
    : "(none yet — mark every claim match_relation:'new', matched_belief_id:null)";

  const clipped = sectionText.slice(0, ANALYSIS_TEXT_CAP);
  const label =
    sectionLabel === "opening"
      ? "OPENING of the sermon"
      : sectionLabel === "middle"
        ? "MIDDLE of the sermon"
        : sectionLabel === "closing"
          ? "CLOSING of the sermon"
          : `SECTION (${sectionLabel})`;

  return `USER'S CURRENT BELIEFS:
${beliefSummary}

TRANSCRIPT SECTION (${label}; excerpt from a ${totalChars.toLocaleString()}-character talk):
"""
${clipped}
"""

Task:
1. Extract ${minClaims} to ${maxClaims} substantive CLAIMS (1–2 sentences each) grounded in this section only.
2. Skip host intros and production meta — only theology, practice, narrative, and application.
3. Per claim: tone, doctrine_tags, scripture_supports, scripture_challenges, matched_belief_id, match_relation, bias_flags.
4. Optional epistemology: claim_types (1–3 tags) and confidence_level (high|medium|low).

Return ONLY valid JSON: { "claims": [ ... ] }`;
}

function parseClaimsFromJsonText(rawText: string): ClaimOut[] {
  try {
    const parsed = JSON.parse(rawText) as { claims?: ClaimOut[] };
    return Array.isArray(parsed.claims) ? parsed.claims : [];
  } catch {
    return [];
  }
}

export function parseSubmitClaimsFromResponse(json: unknown): ClaimOut[] {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const direct = (json as { claims?: ClaimOut[] }).claims;
    if (Array.isArray(direct)) return direct;
  }
  return [];
}

function isRateLimitError(err: string | undefined): boolean {
  if (!err) return false;
  return /\b429\b/.test(err) || /rate.?limit/i.test(err) || /resource_exhausted/i.test(err);
}

function transcriptClaimProviders(): AiProvider[] {
  const primary = resolveAiProvider();
  const providers: AiProvider[] = [primary];
  const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (primary === "openai" && geminiKey) providers.push("gemini");
  if (primary === "gemini" && openAiKey) providers.push("openai");
  return providers;
}

export async function submitTranscriptClaimsJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<ClaimGeminiResult> {
  const providers = transcriptClaimProviders();
  for (const provider of providers) {
    const maxAttempts = provider === providers[0] ? 3 : 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, [2_500, 7_000][attempt - 1] ?? 12_000));
      }
      const result = await callChatJson(systemPrompt, userPrompt, 0.35, 4096, provider);
      if (result.ok) {
        return { kind: "ok", json: { claims: parseClaimsFromJsonText(result.rawText) } };
      }
      if (isRateLimitError(result.err)) {
        if (attempt < maxAttempts - 1) continue;
        break;
      }
      if (/\b402\b/.test(result.err ?? "") || /billing|insufficient/i.test(result.err ?? "")) {
        return { kind: "billing" };
      }
      console.error("transcript claim json error:", provider, result.err?.slice(0, 240));
      return { kind: "gateway_err", status: 502, body: result.err ?? "unknown" };
    }
  }
  return { kind: "rate_limit" };
}

type TranscriptBatchWindow = { label: string; body: string; startSeconds: number | null };

function buildTranscriptBatchWindows(
  rawText: string,
  segments: TranscriptSegment[],
  timed: boolean,
  durationSeconds: number | null,
): TranscriptBatchWindow[] {
  const out: TranscriptBatchWindow[] = [];
  const dur = inferDurationSeconds(rawText.length, durationSeconds);

  if (timed && dur > 0) {
    for (let t = 0; t < dur && out.length < TRANSCRIPT_MAX_BATCHES; t += TRANSCRIPT_BATCH_SECONDS) {
      const end = Math.min(t + TRANSCRIPT_BATCH_SECONDS, dur);
      const body = transcriptSliceForWindow({
        rawText,
        segments,
        timed: true,
        windowStartSec: t,
        windowEndExclusiveSec: end,
        durationSeconds: dur,
      });
      if (body.trim().length >= 80) {
        out.push({
          label: `${Math.floor(t / 60)}–${Math.floor(end / 60)} min`,
          body,
          startSeconds: t,
        });
      }
    }
    return out;
  }

  const overlap = 350;
  for (let start = 0; start < rawText.length && out.length < TRANSCRIPT_MAX_BATCHES; ) {
    const batchChars = out.length === 0 ? TRANSCRIPT_FIRST_BATCH_CHARS : TRANSCRIPT_BATCH_CHARS;
    const body = rawText.slice(start, Math.min(rawText.length, start + batchChars));
    if (body.trim().length >= 80) {
      out.push({ label: `part ${out.length + 1}`, body, startSeconds: null });
    }
    if (start + batchChars >= rawText.length) break;
    start += batchChars - overlap;
  }
  return out;
}

export async function extractTranscriptClaimsProgressive(params: {
  systemPrompt: string;
  rawText: string;
  beliefsList: BeliefRef[];
  segments: TranscriptSegment[];
  timed: boolean;
  durationSeconds: number | null;
  db: SupabaseClient;
  artifact_id: string;
  processing_token: string;
  maxPersistedClaims: number;
  appendClaims: (
    incoming: ClaimWithChapter[],
  ) => Promise<number>;
}): Promise<{ claims: ClaimOut[]; lastGateway?: ClaimGeminiResult; partial: boolean }> {
  const {
    systemPrompt,
    rawText,
    beliefsList,
    segments,
    timed,
    durationSeconds,
    db,
    artifact_id,
    processing_token,
    maxPersistedClaims,
    appendClaims,
  } = params;

  const windows = buildTranscriptBatchWindows(rawText, segments, timed, durationSeconds);
  if (windows.length === 0) return { claims: [], partial: false };

  const { data: gate } = await db
    .from("artifacts")
    .select("id")
    .eq("id", artifact_id)
    .eq("processing_token", processing_token)
    .maybeSingle();
  if (gate) {
    await db.from("artifact_claims").delete().eq("artifact_id", artifact_id);
  }

  const seen = new Set<string>();
  const collected: ClaimOut[] = [];
  let lastGateway: ClaimGeminiResult | undefined;
  let stoppedEarly = false;

  for (let i = 0; i < windows.length; i++) {
    if (i > 0 && CLAIM_CHUNK_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, CLAIM_CHUNK_DELAY_MS));
    }
    const { label, body, startSeconds } = windows[i]!;
    const isOpening = i === 0;
    const prompt = buildTranscriptSectionPrompt(
      isOpening ? "opening" : label,
      body,
      beliefsList,
      rawText.length,
      isOpening ? 4 : 5,
      isOpening ? 7 : 9,
    );
    const gw = await submitTranscriptClaimsJson(systemPrompt, prompt);
    if (gw.kind !== "ok") {
      lastGateway = gw;
      if (gw.kind === "rate_limit" || gw.kind === "billing") {
        stoppedEarly = true;
        break;
      }
      continue;
    }

    const batchClaims: ClaimWithChapter[] = [];
    for (const c of parseSubmitClaimsFromResponse(gw.json)) {
      const key = normalizeClaimDedupeKey(c.claim);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      collected.push(c);
      batchClaims.push({ ...c, chapter_start_seconds: startSeconds });
    }

    if (batchClaims.length > 0) {
      await appendClaims(batchClaims);
    }

    const { count } = await db
      .from("artifact_claims")
      .select("id", { count: "exact", head: true })
      .eq("artifact_id", artifact_id);
    if ((count ?? 0) >= maxPersistedClaims) break;
  }

  const partial = stoppedEarly && collected.length > 0;
  return { claims: collected.slice(0, maxPersistedClaims), lastGateway, partial };
}
