import { youtubeHqThumbnail } from "@/lib/youtube";

export const ARTIFACT_JOURNAL_SOURCE_START = "<!-- yb-artifact-journal-source -->";
export const ARTIFACT_JOURNAL_SOURCE_END = "<!-- /yb-artifact-journal-source -->";

export type ArtifactJournalSourceInput = {
  entryTitle?: string | null;
  channel?: string | null;
  channelUrl?: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  providerName?: string | null;
};

export function splitArtifactJournalBody(body: string): { notes: string; hasSourceBlock: boolean } {
  const start = body.indexOf(ARTIFACT_JOURNAL_SOURCE_START);
  const end = body.indexOf(ARTIFACT_JOURNAL_SOURCE_END);
  if (start === -1 || end === -1 || end < start) {
    return { notes: body, hasSourceBlock: false };
  }
  const afterEnd = end + ARTIFACT_JOURNAL_SOURCE_END.length;
  const notes = body.slice(afterEnd).replace(/^\n+/, "");
  return { notes, hasSourceBlock: true };
}

export function resolveArtifactJournalThumbnail(input: ArtifactJournalSourceInput): string | null {
  const thumb = input.thumbnailUrl?.trim();
  if (thumb) return thumb;
  if (input.youTubeVideoId?.trim()) return youtubeHqThumbnail(input.youTubeVideoId.trim());
  return null;
}

/** Markdown block stored at the top of artifact study journal entries. */
export function buildArtifactJournalSourceMarkdown(input: ArtifactJournalSourceInput): string {
  const title = input.entryTitle?.trim();
  const channel = input.channel?.trim() || input.providerName?.trim() || null;
  const author = input.author?.trim() || null;
  const thumb = resolveArtifactJournalThumbnail(input);
  const lines: string[] = [ARTIFACT_JOURNAL_SOURCE_START];

  if (thumb) {
    const alt = channel || title || "Video";
    lines.push(`![${alt}](${thumb})`, "");
  }
  if (title) {
    lines.push(`## ${title}`, "");
  }
  if (channel) {
    lines.push(
      input.channelUrl?.trim()
        ? `**Channel:** [${channel}](${input.channelUrl.trim()})`
        : `**Channel:** ${channel}`,
    );
  }
  if (author && (!channel || author.localeCompare(channel, undefined, { sensitivity: "accent" }) !== 0)) {
    lines.push(`**Author:** ${author}`);
  }
  lines.push(ARTIFACT_JOURNAL_SOURCE_END);
  return lines.join("\n");
}

export function composeArtifactJournalBody(
  notes: string,
  source: ArtifactJournalSourceInput,
): string {
  const block = buildArtifactJournalSourceMarkdown(source);
  const trimmedNotes = notes.trim();
  return trimmedNotes ? `${block}\n\n${trimmedNotes}` : block;
}

export function hasArtifactJournalSourceContent(input: ArtifactJournalSourceInput): boolean {
  return Boolean(
    input.entryTitle?.trim() ||
      input.channel?.trim() ||
      input.author?.trim() ||
      input.thumbnailUrl?.trim() ||
      input.youTubeVideoId?.trim() ||
      input.providerName?.trim(),
  );
}
