/**
 * Strip curse words from speech-to-text transcripts.
 * STT (browser Web Speech + ElevenLabs) often hallucinates or mishears strong swears.
 * Keeps theological words like "hell" / "damn" alone so sermon journals stay readable.
 */

/** Strong profanity only — word-boundary matched, case-insensitive. */
const PROFANITY_PATTERN =
  /\b(?:f+u+c+k(?:ing|in'|in|ed|er|ers|s)?|motherf+u+c+k(?:ing|er|ers|in'|in|ed|s)?|bull\s*sh[i1!]t(?:ting|ty|s)?|sh[i1!]t(?:ting|ty|s|head|heads)?|assholes?|b[i1!]tch(?:es|ing|y)?|cunts?|dickheads?|pricks?|twats?|wank(?:er|ers|ing)?|god\s*damn(?:ed|it)?|god\s*dammit)\b/gi;

/** Obfuscated spellings like f*ck / f**k that still leak into captions. */
const OBFUSCATED_PATTERN = /\bf[\W_]{0,3}u[\W_]{0,3}c[\W_]{0,3}k(?:[\W_]*ing|[\W_]*ed|[\W_]*er)?\b/gi;

function tidyAfterRemoval(text: string): string {
  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove curse words from transcript / dictation text. */
export function scrubTranscriptProfanity(text: string): string {
  if (!text) return text;
  let out = text.replace(PROFANITY_PATTERN, "");
  out = out.replace(OBFUSCATED_PATTERN, "");
  return tidyAfterRemoval(out);
}
