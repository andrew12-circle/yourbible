/**
 * Scene-prompt sanitizer.
 *
 * Book/page scene text (Layer 4) historically contained terms that fight the
 * studio style — golden hour, warm/cinematic lighting, magical glows, sparkles,
 * thought bubbles, glowing heart patterns, and (for Lilly) long flowing hair.
 * This module scrubs those terms programmatically so a single scene edit cannot
 * reintroduce them, and so every book benefits without hand-editing ~90 prompts.
 *
 * Bump `SANITIZER_VERSION` when the rules change (feeds the generation fingerprint).
 */

export const SANITIZER_VERSION = "v1";

export type SanitizeSceneOptions = {
  /** Heroine display name; enables Lilly-specific hair enforcement. */
  heroName?: string;
};

type Rule = { pattern: RegExp; replacement: string };

/** Atmosphere / effect terms that always contradict the studio style. */
const ATMOSPHERE_RULES: Rule[] = [
  { pattern: /\bgolden[-\s]?hour\b/gi, replacement: "clear daylight" },
  { pattern: /\bcinematic(?:ally)?\b/gi, replacement: "clean storybook" },
  { pattern: /\bmovie[-\s]?poster\b/gi, replacement: "clean storybook" },
  { pattern: /\bwarm heavenly light\b/gi, replacement: "soft pale daylight" },
  { pattern: /\bheavenly light\b/gi, replacement: "soft pale light" },
  { pattern: /\bwarm candle[-\s]?light\b/gi, replacement: "soft daylight" },
  { pattern: /\bwarm,? candle[-\s]?lit\b/gi, replacement: "softly lit" },
  { pattern: /\bcandle[-\s]?lit\b/gi, replacement: "softly lit" },
  { pattern: /\bwarm chandelier light\b/gi, replacement: "clean bright light" },
  { pattern: /\bwarm lamplight\b/gi, replacement: "gentle lamplight" },
  { pattern: /\bwarm,? (?:morning|afternoon|evening) (?:sun)?light\b/gi, replacement: "clear daylight" },
  { pattern: /\bwarm sunlight\b/gi, replacement: "clear daylight" },
  { pattern: /\bwarm light\b/gi, replacement: "soft pale light" },
  { pattern: /\bglowing swirls?\b/gi, replacement: "soft pale highlight" },
  { pattern: /\bglowing ribbons?\b/gi, replacement: "soft pale highlight" },
  { pattern: /\bmagical? (?:glow|energy)\b/gi, replacement: "soft pale light" },
  { pattern: /\bmagical? ribbons?\b/gi, replacement: "soft pale highlight" },
  { pattern: /\bfirefly-like lights?\b/gi, replacement: "soft pale highlights" },
  { pattern: /\bfairy dust\b/gi, replacement: "" },
  { pattern: /\bsparkles?\b/gi, replacement: "" },
  { pattern: /\bthought[-\s]?bubble\b/gi, replacement: "gentle vignette" },
  { pattern: /\bglowing heart[-\s]?shaped pattern\b/gi, replacement: "soft heart motif" },
  { pattern: /\bglowing heart[-\s]?shaped\b/gi, replacement: "soft heart motif" },
  { pattern: /\bglowing heart pattern\b/gi, replacement: "soft heart motif" },
  { pattern: /\bpainterly fantasy\b/gi, replacement: "softly illustrated" },
  { pattern: /\bpainterly\b/gi, replacement: "softly illustrated" },
  { pattern: /\bexcessive coral\b/gi, replacement: "restrained coral" },
];

/** Explicit forbidden Lilly-hair phrases (never touch other characters' hair). */
const LILLY_HAIR_RULES: Rule[] = [
  { pattern: /\blong,? flowing lilly hair\b/gi, replacement: "Lilly's short chestnut curls" },
  { pattern: /\blilly'?s long,? flowing hair\b/gi, replacement: "Lilly's short chestnut curls" },
  { pattern: /\blilly'?s long hair\b/gi, replacement: "Lilly's short chestnut curls" },
];

/** Collapse whitespace/punctuation artifacts left by removals. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/([,;])\s*(?=[,;])/g, "")
    .replace(/,\s*(?=[.!?])/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function sanitizeScenePrompt(
  scene: string,
  options: SanitizeSceneOptions = {},
): string {
  let next = scene;
  for (const rule of ATMOSPHERE_RULES) next = next.replace(rule.pattern, rule.replacement);
  if ((options.heroName ?? "").trim().toLowerCase() === "lilly") {
    for (const rule of LILLY_HAIR_RULES) next = next.replace(rule.pattern, rule.replacement);
  }
  return tidy(next);
}

/** True when the (already localized) prompt still contains a forbidden term. */
export function findForbiddenSceneTerms(
  scene: string,
  options: SanitizeSceneOptions = {},
): string[] {
  const hits: string[] = [];
  for (const rule of ATMOSPHERE_RULES) {
    const m = scene.match(rule.pattern);
    if (m) hits.push(...m.map((s) => s.toLowerCase()));
  }
  if ((options.heroName ?? "").trim().toLowerCase() === "lilly") {
    for (const rule of LILLY_HAIR_RULES) {
      const m = scene.match(rule.pattern);
      if (m) hits.push(...m.map((s) => s.toLowerCase()));
    }
  }
  return [...new Set(hits)];
}
