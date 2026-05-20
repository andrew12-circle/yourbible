import type { PassageVerse } from "./api";

/** Max characters per ElevenLabs request (server trims at 4500). */
export const SCRIPTURE_CHUNK_MAX = 3500;

/** Brief pause between verses (Bible-app style continuous read). */
const VERSE_PAUSE = ".  ";

export function formatVerseForTts(v: PassageVerse): string {
  const line = v.text.replace(/\s+/g, " ").trim();
  if (!line) return "";
  return `Verse ${v.number}. ${line}`;
}

/** Build TTS-sized chunks with a spoken passage reference and verse numbers. */
export function buildScriptureChunks(verses: PassageVerse[], passageRef?: string): string[] {
  const chunks: string[] = [];
  let buf = "";

  for (const v of verses) {
    const line = formatVerseForTts(v);
    if (!line) continue;
    const candidate = buf ? `${buf}${VERSE_PAUSE}${line}` : line;
    if (candidate.length > SCRIPTURE_CHUNK_MAX && buf) {
      chunks.push(buf);
      buf = line;
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf);

  if (!chunks.length) return passageRef ? [`${passageRef}.`] : [""];

  if (passageRef) {
    chunks[0] = `${passageRef}.  ${chunks[0]}`;
  }
  return chunks;
}
