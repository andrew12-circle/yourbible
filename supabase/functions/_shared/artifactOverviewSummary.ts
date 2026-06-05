import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { callChatWithTools } from "./aiProvider.ts";

export const OVERVIEW_SUMMARY_TEXT_CAP = 200_000;

export interface BeliefForOverview {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

export interface ArtifactFrameworkOverview {
  summary: string;
  key_points: string[];
  framework_alignment: {
    aligns: string[];
    conflicts: string[];
    new_ground: string[];
  };
  generated_at: string;
}

const OVERVIEW_SYSTEM = `You synthesize artifact content for a personal Christian framework app.
Summarize what the source is saying at a high level and compare that overall message to the user's stated beliefs.
Do NOT declare what is true. Be honest about uncertainty. Never speak as God or a prophet.
Always return strict JSON via the tool call only. No prose outside JSON.`;

export const OVERVIEW_SUMMARY_TOOL = {
  type: "function",
  function: {
    name: "submit_framework_overview",
    description: "Submit a high-level summary of the artifact and how it compares to the user's belief framework.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2–4 sentences: what the source is mainly saying, in plain language.",
        },
        key_points: {
          type: "array",
          description: "3–6 load-bearing themes or arguments from the source (one sentence each).",
          items: { type: "string" },
          minItems: 3,
          maxItems: 6,
        },
        framework_alignment: {
          type: "object",
          properties: {
            aligns: {
              type: "array",
              description: "Where the source's overall message aligns with the user's beliefs (0–4 items).",
              items: { type: "string" },
            },
            conflicts: {
              type: "array",
              description: "Where the source's overall message conflicts with the user's beliefs (0–4 items).",
              items: { type: "string" },
            },
            new_ground: {
              type: "array",
              description:
                "Important themes the source raises that the user's framework does not yet address (0–4 items).",
              items: { type: "string" },
            },
          },
          required: ["aligns", "conflicts", "new_ground"],
        },
      },
      required: ["summary", "key_points", "framework_alignment"],
    },
  },
} as const;

function beliefSummaryBlock(beliefs: BeliefForOverview[]): string {
  if (!beliefs.length) {
    return "(none yet — treat the source as mostly new ground unless clearly universal Christian teaching)";
  }
  return beliefs
    .map(
      (b) =>
        `- id=${b.id} | layer=${b.layer} | topic=${b.topic} | statement="${b.statement}" | answer="${(b.answer ?? "").slice(0, 280)}" | confidence=${b.confidence}`,
    )
    .join("\n");
}

export function buildOverviewSummaryPrompt(
  text: string,
  beliefs: BeliefForOverview[],
  title?: string | null,
): string {
  const clipped = text.slice(0, OVERVIEW_SUMMARY_TEXT_CAP);
  const wasClipped = text.length > OVERVIEW_SUMMARY_TEXT_CAP;
  const titleLine = title?.trim() ? `ARTIFACT TITLE: "${title.trim().replace(/"/g, '\\"')}"\n\n` : "";

  return `${titleLine}USER'S CURRENT BELIEFS:
${beliefSummaryBlock(beliefs)}

ARTIFACT TEXT (sermon / podcast / article / journal):
"""
${clipped}
"""${wasClipped ? "\n\n(Note: the artifact text was very long and was truncated. Summarize the supplied portion.)" : ""}

Task:
1. Write a concise summary of what the source is mainly saying (not a verse-by-verse recap).
2. List 3–6 key points — the load-bearing themes or arguments, ordered roughly as they appear.
3. Compare the OVERALL message to the user's belief framework:
   - aligns: where the source and the user's beliefs clearly agree
   - conflicts: where they clearly disagree or tension exists
   - new_ground: important themes the source raises that the user's framework is silent on

Keep each bullet to one sentence. Reference belief topics by name, not by id.`;
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

function sanitizeStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, maxLen);
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function parseOverviewSummaryPayload(raw: unknown): ArtifactFrameworkOverview | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 2400) : "";
  if (!summary) return null;

  const key_points = sanitizeStringList(o.key_points, 6, 500);
  if (key_points.length < 1) return null;

  const fa = (o.framework_alignment ?? {}) as Record<string, unknown>;
  return {
    summary,
    key_points,
    framework_alignment: {
      aligns: sanitizeStringList(fa.aligns, 4, 500),
      conflicts: sanitizeStringList(fa.conflicts, 4, 500),
      new_ground: sanitizeStringList(fa.new_ground, 4, 500),
    },
    generated_at: new Date().toISOString(),
  };
}

export async function generateArtifactFrameworkOverview(params: {
  rawText: string;
  beliefs: BeliefForOverview[];
  title?: string | null;
}): Promise<ArtifactFrameworkOverview | null> {
  const r = await callChatWithTools(
    [
      { role: "system", content: OVERVIEW_SYSTEM },
      { role: "user", content: buildOverviewSummaryPrompt(params.rawText, params.beliefs, params.title) },
    ],
    [OVERVIEW_SUMMARY_TOOL],
    { type: "function", function: { name: "submit_framework_overview" } },
    4096,
  );
  if (!r.ok) {
    console.error("framework overview summary gateway error:", r.status, await r.text());
    return null;
  }
  const json = await r.json();
  const argsStr = parseToolCall(json, "submit_framework_overview");
  if (!argsStr) {
    console.error("framework overview summary: missing tool call");
    return null;
  }
  try {
    return parseOverviewSummaryPayload(JSON.parse(argsStr));
  } catch (e) {
    console.error("framework overview summary parse fail", e);
    return null;
  }
}

export async function persistArtifactFrameworkOverview(
  supabase: SupabaseClient,
  artifactId: string,
  metadata: unknown,
  overview: ArtifactFrameworkOverview,
): Promise<void> {
  const prevMeta = (metadata as Record<string, unknown> | null | undefined) ?? {};
  const nextMeta = {
    ...prevMeta,
    framework_overview: overview,
  };
  const { error } = await supabase.from("artifacts").update({ metadata: nextMeta }).eq("id", artifactId);
  if (error) console.error("persist framework_overview", error);
}
