/** Second-pass enrichment: chapters, entities, teachings, framework overview. */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { generateChaptersFromTranscript } from "../_shared/generateTranscriptChapters.ts";
import type { YoutubeChapter } from "../_shared/youtubeChapters.ts";
import type { TranscriptSegment } from "../_shared/transcriptSlice.ts";
import { callChatWithTools, resolveFrameworkAnalyzeProvider } from "../_shared/aiProvider.ts";
import {
  generateArtifactFrameworkOverview,
  persistArtifactFrameworkOverview,
} from "../_shared/artifactOverviewSummary.ts";
import type { ClaimGeminiResult } from "./transcriptProgressiveClaims.ts";

export interface EnrichmentBelief {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

export interface EnrichmentClaim extends Record<string, unknown> {
  claim: string;
  chapter_start_seconds?: number | null;
}

export interface KnowledgeEntitiesPayload {
  books?: { title?: string; author?: string; snippet?: string; confidence?: number }[];
  people?: { name?: string; role?: string; snippet?: string; confidence?: number }[];
  scriptures?: { ref?: string; translation?: string; snippet?: string; confidence?: number }[];
  dreams_visions?: { title?: string; summary?: string; snippet?: string; confidence?: number }[];
  fears?: { title?: string; snippet?: string; confidence?: number }[];
  questions?: { title?: string; snippet?: string; confidence?: number }[];
  projects?: { title?: string; status?: string; snippet?: string; confidence?: number }[];
  businesses?: { title?: string; snippet?: string; confidence?: number }[];
}

export interface EnrichmentContext {
  db: SupabaseClient;
  artifact: Record<string, unknown>;
  artifact_id: string;
  processing_token: string;
  beliefsList: EnrichmentBelief[];
  rawText: string;
  segments: TranscriptSegment[];
  timed: boolean;
  durationSeconds: number | null;
  chapters: YoutubeChapter[];
  metadata: unknown;
  geminiApiKey: string;
  serviceRole: string | undefined;
  supabaseUrl: string;
}

export interface EnrichmentHost {
  entitySystem: string;
  entityTool: unknown;
  teachingSystem: string;
  teachingTool: unknown;
  minDurationChunkPassSec: number;
  chunkSpacingSeconds: number;
  inferArtifactDurationSeconds: (
    metadata: unknown,
    chapters: YoutubeChapter[],
    rawTextLength: number,
  ) => number;
  transcriptSliceForWindow: (params: {
    rawText: string;
    segments: TranscriptSegment[];
    timed: boolean;
    windowStartSec: number;
    windowEndExclusiveSec: number | null;
    durationSeconds: number | null;
  }) => string;
  buildChapterSlicePrompt: (
    sliceText: string,
    beliefs: EnrichmentBelief[],
    chapterTitle: string,
    chapterStartSeconds: number,
    nextChapterStartSeconds: number | null,
    minClaims: number,
    maxClaims: number,
  ) => string;
  buildTimedChunkPrompt: (
    sliceText: string,
    beliefs: EnrichmentBelief[],
    windowLabel: string,
    minClaims: number,
    maxClaims: number,
  ) => string;
  geminiSubmitClaims: (apiKey: string, userPrompt: string) => Promise<ClaimGeminiResult>;
  parseSubmitClaimsFromResponse: (json: unknown) => EnrichmentClaim[];
  appendEnrichmentClaims: (
    db: SupabaseClient,
    artifact_id: string,
    processing_token: string,
    artifact: { user_id: unknown },
    beliefsList: EnrichmentBelief[],
    incoming: EnrichmentClaim[],
    serviceRole: string | undefined,
    supabaseUrl: string,
  ) => Promise<number>;
  buildEntityPrompt: (text: string) => string;
  parseToolCall: (json: unknown, toolName: string) => string | null;
  parseKnowledgeEntitiesPayload: (raw: unknown) => KnowledgeEntitiesPayload;
  persistEntitiesForArtifact: (params: {
    admin: SupabaseClient;
    userId: string;
    artifactId: string;
    rawText: string;
    payload: KnowledgeEntitiesPayload;
  }) => Promise<{ mentionCount: number }>;
  inferInterviewGuestsFromPayload: (
    payload: KnowledgeEntitiesPayload,
    channelTitle?: string | null,
  ) => string[];
  buildTeachingPrompt: (text: string) => string;
  persistTeachingsForArtifact: (params: {
    admin: SupabaseClient;
    userId: string;
    artifactId: string;
    rawText: string;
    teachings: Record<string, unknown>[];
  }) => Promise<{ inserted: number }>;
}

export async function enrichArtifactAnalysis(
  ctx: EnrichmentContext,
  host: EnrichmentHost,
): Promise<void> {
  const {
    db,
    artifact,
    artifact_id,
    processing_token,
    beliefsList,
    rawText,
    segments,
    timed,
    durationSeconds,
    geminiApiKey,
    serviceRole,
    supabaseUrl,
  } = ctx;
  let chapters = ctx.chapters;
  let metadata = ctx.metadata;

  if (chapters.length === 0 && rawText.trim().length >= 400) {
    const chapterDuration =
      durationSeconds ?? host.inferArtifactDurationSeconds(metadata, [], rawText.length);
    const generated = await generateChaptersFromTranscript({
      apiKey: geminiApiKey,
      rawText,
      durationSeconds: chapterDuration,
      title: (artifact.title as string | null | undefined) ?? null,
    });
    if (generated.chapters.length) {
      chapters = generated.chapters;
      const prevMeta = (metadata as Record<string, unknown> | null | undefined) ?? {};
      metadata = {
        ...prevMeta,
        youtube_chapters: generated.chapters,
        youtube_chapters_source: generated.source,
      };
      await db.from("artifacts").update({ metadata }).eq("id", artifact_id);
      console.log(
        `framework-analyze enrichment: chapters=${chapters.length} source=${generated.source}`,
      );
    }
  }

  if (chapters.length >= 2) {
    const perChapMin = 2;
    const perChapMax = 6;
    const extra: EnrichmentClaim[] = [];
    console.log(`framework-analyze enrichment: chapter spine chapters=${chapters.length}`);
    for (let ci = 0; ci < chapters.length; ci += 3) {
      const batch = chapters.slice(ci, ci + 3);
      const batchResults = await Promise.all(
        batch.map(async (ch, offset) => {
          const idx = ci + offset;
          const nextCh = chapters[idx + 1];
          const sliceText = host.transcriptSliceForWindow({
            rawText,
            segments,
            timed,
            windowStartSec: ch.start_seconds,
            windowEndExclusiveSec: nextCh?.start_seconds ?? null,
            durationSeconds,
          });
          if (sliceText.trim().length < 80) return [] as EnrichmentClaim[];
          const userPrompt = host.buildChapterSlicePrompt(
            sliceText,
            beliefsList,
            ch.title,
            ch.start_seconds,
            nextCh?.start_seconds ?? null,
            perChapMin,
            perChapMax,
          );
          const gw = await host.geminiSubmitClaims(geminiApiKey, userPrompt);
          if (gw.kind !== "ok") {
            console.warn(`framework-analyze enrichment: chapter ${idx + 1} gateway ${gw.kind}`);
            return [] as EnrichmentClaim[];
          }
          const claims = host.parseSubmitClaimsFromResponse(gw.json);
          return claims.map((c) => ({ ...c, chapter_start_seconds: ch.start_seconds }));
        }),
      );
      for (const claims of batchResults) extra.push(...claims);
    }
    const appended = await host.appendEnrichmentClaims(
      db,
      artifact_id,
      processing_token,
      artifact,
      beliefsList,
      extra,
      serviceRole,
      supabaseUrl,
    );
    console.log(`framework-analyze enrichment: appended chapter claims=${appended}`);
  } else {
    const useChunkPass =
      timed &&
      durationSeconds != null &&
      durationSeconds >= host.minDurationChunkPassSec;
    if (useChunkPass) {
      const D = durationSeconds;
      const chunkClaims: EnrichmentClaim[] = [];
      for (let t = 0; t < D; t += host.chunkSpacingSeconds) {
        const end = Math.min(t + host.chunkSpacingSeconds, D);
        const sliceText = host.transcriptSliceForWindow({
          rawText,
          segments,
          timed: true,
          windowStartSec: t,
          windowEndExclusiveSec: end,
          durationSeconds: D,
        });
        if (sliceText.trim().length < 200) continue;
        const chunkPrompt = host.buildTimedChunkPrompt(sliceText, beliefsList, `${t}s–${end}s`, 4, 10);
        const gwc = await host.geminiSubmitClaims(geminiApiKey, chunkPrompt);
        if (gwc.kind !== "ok") continue;
        const parsed = host.parseSubmitClaimsFromResponse(gwc.json);
        for (const c of parsed) chunkClaims.push({ ...c, chapter_start_seconds: null });
      }
      const appended = await host.appendEnrichmentClaims(
        db,
        artifact_id,
        processing_token,
        artifact,
        beliefsList,
        chunkClaims,
        serviceRole,
        supabaseUrl,
      );
      console.log(`framework-analyze enrichment: appended chunk claims=${appended}`);
    }
  }

  let entity_mentions_written = 0;
  let teaching_rows_written = 0;

  if (serviceRole) {
    const admin = createClient(supabaseUrl, serviceRole);
    const analyzeProvider = resolveFrameworkAnalyzeProvider();
    try {
      const er = await callChatWithTools(
        [
          { role: "system", content: host.entitySystem },
          { role: "user", content: host.buildEntityPrompt(rawText) },
        ],
        [host.entityTool],
        { type: "function", function: { name: "submit_knowledge_entities" } },
        8192,
        analyzeProvider,
      );
      if (er.ok) {
        const ej = await er.json();
        const eArgs = host.parseToolCall(ej, "submit_knowledge_entities");
        let entitiesParsed: KnowledgeEntitiesPayload = {};
        if (eArgs) {
          try {
            entitiesParsed = host.parseKnowledgeEntitiesPayload(JSON.parse(eArgs));
          } catch (e) {
            console.error("entity parse fail", e);
          }
        }
        const { data: gate2 } = await db
          .from("artifacts")
          .select("id")
          .eq("id", artifact_id)
          .eq("processing_token", processing_token)
          .maybeSingle();
        if (gate2) {
          const res = await host.persistEntitiesForArtifact({
            admin,
            userId: artifact.user_id as string,
            artifactId: artifact_id,
            rawText,
            payload: entitiesParsed,
          });
          entity_mentions_written = res.mentionCount;

          const prevMeta = (metadata as Record<string, unknown> | null | undefined) ?? {};
          const channelTitle =
            typeof prevMeta.channel_title === "string"
              ? prevMeta.channel_title
              : typeof prevMeta.channel === "string"
                ? prevMeta.channel
                : null;
          const interviewGuests = host.inferInterviewGuestsFromPayload(entitiesParsed, channelTitle);
          if (interviewGuests.length > 0) {
            await db
              .from("artifacts")
              .update({
                metadata: {
                  ...prevMeta,
                  interview_guests: interviewGuests,
                },
              })
              .eq("id", artifact_id);
          }
        }
      } else {
        console.error("entity extraction gateway error:", er.status, await er.text());
      }

      const tr = await callChatWithTools(
        [
          { role: "system", content: host.teachingSystem },
          { role: "user", content: host.buildTeachingPrompt(rawText) },
        ],
        [host.teachingTool],
        { type: "function", function: { name: "submit_teachings" } },
        8192,
        analyzeProvider,
      );
      if (tr.ok) {
        const tj = await tr.json();
        const tArgs = host.parseToolCall(tj, "submit_teachings");
        let teachingsParsed: { teachings?: Record<string, unknown>[] } = {};
        if (tArgs) {
          try {
            teachingsParsed = JSON.parse(tArgs) as { teachings?: Record<string, unknown>[] };
          } catch (e) {
            console.error("teaching parse fail", e);
          }
        }
        const { data: gate3 } = await db
          .from("artifacts")
          .select("id")
          .eq("id", artifact_id)
          .eq("processing_token", processing_token)
          .maybeSingle();
        if (gate3) {
          const tres = await host.persistTeachingsForArtifact({
            admin,
            userId: artifact.user_id as string,
            artifactId: artifact_id,
            rawText,
            teachings: teachingsParsed.teachings ?? [],
          });
          teaching_rows_written = tres.inserted;
        }
      } else {
        console.error("teaching extraction gateway error:", tr.status, await tr.text());
      }
    } catch (e) {
      console.error("entity/teaching enrichment failed:", e);
    }
  }

  try {
    const { data: gateOverview } = await db
      .from("artifacts")
      .select("id,metadata")
      .eq("id", artifact_id)
      .eq("processing_token", processing_token)
      .maybeSingle();
    if (gateOverview) {
      const overview = await generateArtifactFrameworkOverview({
        rawText,
        beliefs: beliefsList,
        title: (artifact.title as string | null | undefined) ?? null,
      });
      if (overview) {
        await persistArtifactFrameworkOverview(
          db,
          artifact_id,
          (gateOverview as { metadata?: unknown }).metadata ?? metadata,
          overview,
        );
        console.log("framework-analyze enrichment: framework_overview persisted");
      }
    }
  } catch (e) {
    console.error("framework overview enrichment failed:", e);
  }

  console.log(
    `framework-analyze enrichment: done entities=${entity_mentions_written} teachings=${teaching_rows_written}`,
  );
}
