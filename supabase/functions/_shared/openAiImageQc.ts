/**
 * Optional post-generation quality control (Section 16).
 *
 * A vision model scores the generated image against the approved references and
 * the studio checklist and returns structured JSON. QC is OFF unless the
 * CHILDREN_BOOK_QC env flag is set, and it NEVER blocks the pipeline: any error
 * or unparseable response returns null and the generated image is kept. The edge
 * function permits at most ONE automatic corrected retry to avoid cost loops.
 */

import type { ResolvedReferenceBytes } from "./childrenBookGeneration.ts";

export type QcScores = {
  lillyIdentity: number;
  supportingIdentity: number;
  ageAccuracy: number;
  hairAccuracy: number;
  studioStyle: number;
  brightness: number;
  palette: number;
  composition: number;
};

export type QcResult = {
  approved: boolean;
  scores: Partial<QcScores>;
  violations: string[];
  retryInstruction: string | null;
};

export function qcEnabled(): boolean {
  return /^(1|true|on|yes)$/i.test(Deno.env.get("CHILDREN_BOOK_QC")?.trim() ?? "");
}

function getQcModel(): string {
  return Deno.env.get("OPENAI_QC_MODEL")?.trim() || "gpt-4o-mini";
}

/** Automatic-approval thresholds from Section 16. */
export function passesThresholds(
  scores: Partial<QcScores>,
  opts: { lillyPresent: boolean },
): boolean {
  const n = (v: number | undefined) => (typeof v === "number" ? v : 0);
  if (n(scores.lillyIdentity) < 90 && opts.lillyPresent) return false;
  if (n(scores.supportingIdentity) < 90) return false;
  if (n(scores.ageAccuracy) < 90) return false;
  if (opts.lillyPresent && n(scores.hairAccuracy) < 95) return false;
  if (n(scores.studioStyle) < 90) return false;
  if (n(scores.brightness) < 85) return false;
  return true;
}

function toDataUrl(bytes: Uint8Array, contentType: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${contentType};base64,${btoa(binary)}`;
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function reviewGeneratedImage(
  imageBytes: Uint8Array,
  references: ResolvedReferenceBytes[],
  characterIds: string[],
): Promise<QcResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) return null;

  const checklist = [
    "You are a strict art-director QC reviewer for the Lilly Storybooks studio.",
    "Compare the FIRST image (the generated scene) to the following approved reference images.",
    "Score 0-100 how well the generated scene matches the approved characters and the bright, airy, clean 2D-animation studio style.",
    `Characters expected in the scene: ${characterIds.join(", ") || "none"}.`,
    "Critical style rules: whites stay white; no amber/beige/sepia/orange wash; clean animation-style character rendering (not textured watercolor); age-proportionate heads; Lilly (if present) has short ear-to-jaw curls, never long hair.",
    'Respond ONLY with strict JSON: {"approved":boolean,"scores":{"lillyIdentity":0-100,"supportingIdentity":0-100,"ageAccuracy":0-100,"hairAccuracy":0-100,"studioStyle":0-100,"brightness":0-100,"palette":0-100,"composition":0-100},"violations":string[],"retryInstruction":string|null}.',
  ].join("\n");

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: checklist },
    {
      type: "image_url",
      image_url: { url: toDataUrl(imageBytes, "image/png"), detail: "low" },
    },
  ];
  for (const ref of references) {
    content.push({ type: "text", text: `Reference (${ref.role}${ref.characterId ? ` ${ref.characterId}` : ""}):` });
    content.push({
      type: "image_url",
      image_url: { url: toDataUrl(ref.bytes, ref.contentType), detail: "low" },
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getQcModel(),
        messages: [{ role: "user", content }],
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = extractJson(text) as Partial<QcResult> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      approved: parsed.approved === true,
      scores: (parsed.scores as Partial<QcScores>) ?? {},
      violations: Array.isArray(parsed.violations) ? parsed.violations.map(String) : [],
      retryInstruction:
        typeof parsed.retryInstruction === "string" ? parsed.retryInstruction : null,
    };
  } catch {
    return null;
  }
}
