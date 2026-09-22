import { isStreamSplitsReady, type ReaderChapterPassage, type ReaderStreamUnit } from "./readerStream";
import { readerStreamUnitId } from "./readerWindowFlow";

export interface ReaderPageHistoryEntry {
  geometryKey: string;
  footerHeight: number;
  chapters: ReaderChapterPassage[];
  stream: ReaderStreamUnit[];
  splits: number[];
}
interface SavedPageWindow {
  footerHeight: number;
  chapters: string[];
  units: string[];
  splits: number[];
}
function unitSignature(unit: ReaderStreamUnit): string {
  return `${readerStreamUnitId(unit)}|${unit.kind === "verse" ? unit.verseRange?.end ?? "" : unit.kind === "plate" ? JSON.stringify(unit.plate) : ""}`;
}
function prefixMatches(shorter: SavedPageWindow, longer: SavedPageWindow): boolean {
  return shorter.chapters.length <= longer.chapters.length && shorter.units.length <= longer.units.length
    && shorter.chapters.every((text, index) => text === longer.chapters[index])
    && shorter.units.every((id, index) => id === longer.units[index]);
}

/** A window can contain corrected, deliberately non-greedy page cuts. Rebuilding
 * it from scratch on Back loses those cuts and may land one spread too early.
 * Keep only the deepest snapshot of each bounded window/geometry combination.
 * Exact immutable signatures reject changed text, metadata, ranges or artwork.
 */
export class ReaderPageHistory {
  private entries = new Map<string, SavedPageWindow>();
  private readonly limit: number;
  constructor(limit = 12) { this.limit = Math.max(1, Math.min(12, Math.floor(limit) || 12)); }
  private key(geometryKey: string, stream: ReaderStreamUnit[]) {
    return `${geometryKey}|${stream[0] ? readerStreamUnitId(stream[0]) : "empty"}`;
  }
  find(geometryKey: string, footerHeight: number, chapters: ReaderChapterPassage[], stream: ReaderStreamUnit[], fixedPrefix?: readonly number[]) {
    const key = this.key(geometryKey, stream);
    const found = this.entries.get(key);
    if (!found || !Number.isFinite(footerHeight) || found.footerHeight < footerHeight
      || found.units.length !== stream.length || found.chapters.length !== chapters.length
      || !chapters.every((chapter, index) => JSON.stringify(chapter) === found.chapters[index])
      || !stream.every((unit, index) => unitSignature(unit) === found.units[index])
      || !isStreamSplitsReady(found.splits, stream.length)
      || fixedPrefix?.some((cut, index) => found.splits[index] !== cut)) return;
    this.entries.delete(key); this.entries.set(key, found);
    return found.splits.slice();
  }
  remember(entry: ReaderPageHistoryEntry) {
    if (!Number.isFinite(entry.footerHeight) || entry.footerHeight < 0 || !isStreamSplitsReady(entry.splits, entry.stream.length)) return;
    const key = this.key(entry.geometryKey, entry.stream), old = this.entries.get(key);
    const next: SavedPageWindow = { footerHeight: entry.footerHeight,
      chapters: entry.chapters.map(chapter => JSON.stringify(chapter)), units: entry.stream.map(unitSignature), splits: entry.splits.slice() };
    // A cached chapter window is rebuilt over several renders. Do not erase its
    // full snapshot while only the first adjacent chapters have reattached.
    if (old && old.footerHeight >= next.footerHeight && old.units.length > next.units.length && prefixMatches(next, old)) return;
    this.entries.delete(key); this.entries.set(key, next);
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
  }
}
