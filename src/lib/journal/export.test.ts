// @vitest-environment node
import { Blob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { buildJournalExportArchive, journalExportEntryFilename, type JournalExportEntry, type JournalExportMedia } from "./export";
const entry = (id: string, patch: Partial<JournalExportEntry> = {}): JournalExportEntry => ({ id, title: "Same prayer", body: "My writing", summary: "My summary", entry_at_ts: "2026-09-12T12:00:00Z", mood: null, tags: [], location_name: null, weather: null, weather_temp_c: null, verse_ref: null, pinned: false, ...patch });
const video: JournalExportMedia = { id: "video1", entry_id: "entry1", storage_path: "owner/recording.webm", bucket: "journal-videos", transcript: "Recorded words" };
const photo: JournalExportMedia = { id: "photo1", entry_id: "entry1", storage_path: "owner/photo.png", bucket: "journal-photos" };
const download = async () => new Blob(["media bytes"]) as unknown as globalThis.Blob;
describe("complete and private journal export", () => {
  it("keeps entries with identical dates and titles separate", async () => {
    const entries = [entry("entry1"), entry("entry2")];
    const zip = await buildJournalExportArchive({ name: "Prayer", entries, media: [], download });
    expect(journalExportEntryFilename(entries[0])).not.toBe(journalExportEntryFilename(entries[1]));
    expect(Object.keys(zip.files).filter((name) => name.endsWith(".md"))).toHaveLength(2);
  });
  it("includes video, photos, summaries, transcripts and a complete attachment manifest", async () => {
    const first = entry("entry1");
    const zip = await buildJournalExportArchive({ name: "Prayer", entries: [first], media: [video, photo], download });
    const markdown = await zip.file(`prayer/${journalExportEntryFilename(first)}`)!.async("text");
    expect(markdown).toContain("Recorded words");
    expect(markdown).toContain("My summary");
    expect(markdown).toContain("videos/entry1-video1.webm");
    expect(markdown).toContain("photos/entry1-photo1.png");
    expect(await zip.file("prayer/videos/entry1-video1.webm")!.async("text")).toBe("media bytes");
    const manifest = JSON.parse(await zip.file("prayer/manifest.json")!.async("text"));
    expect(manifest.entries).toHaveLength(1); expect(manifest.media).toHaveLength(2);
  });
  it("does not silently omit a failed download", async () => {
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry1")], media: [video], download: async () => { throw new Error("storage unavailable"); } })).rejects.toThrow("storage unavailable");
  });
  it("blocks locked content before downloading any media", async () => {
    const read = vi.fn(download);
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry1", { contentLocked: true, e2e_encrypted: true })], media: [video], download: read })).rejects.toThrow("Unlock");
    expect(read).not.toHaveBeenCalled();
  });
  it("aborts when access changes during an attachment download", async () => {
    const assertAccess = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("account changed"));
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry1")], media: [video], download, assertAccess })).rejects.toThrow("account changed");
  });
  it("rejects oversized archives rather than producing partial backups", async () => {
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry1")], media: [video], download, maxMediaBytes: 2 })).rejects.toThrow("no partial archive");
  });
  it("rejects attachments from entries outside the selected notebook", async () => {
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry2")], media: [video], download })).rejects.toThrow("does not belong");
  });
  it("rejects duplicate attachment names rather than overwriting a ZIP member", async () => {
    await expect(buildJournalExportArchive({ name: "Prayer", entries: [entry("entry1")], media: [video, video], download })).rejects.toThrow("Duplicate attachment");
  });
});
