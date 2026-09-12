import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import type { Journal } from "./journals";
import { collectJournalPages, fetchJournalCollection, requireJournalReadUser } from "./journalCollectionRead";
import { getJournalDek } from "@/stores/journalVaultStore";

export type JournalExportEntry = {
  id: string; title: string | null; body: string; summary?: string | null;
  entry_at_ts: string; mood: number | null; tags: string[] | null;
  location_name: string | null; weather: string | null; weather_temp_c: number | null;
  verse_ref: string | null; pinned: boolean; e2e_encrypted?: boolean; contentLocked?: boolean;
};
export type JournalExportMedia = {
  id: string; entry_id: string; storage_path: string; bucket: "journal-photos" | "journal-videos";
  transcript?: string | null; duration_ms?: number | null; mime_type?: string | null;
};
const MAX_MEDIA_BYTES = 256 * 1024 * 1024;
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "entry";
}
export function journalExportEntryFilename(entry: JournalExportEntry): string {
  const date = new Date(entry.entry_at_ts).toISOString().slice(0, 10);
  return `${date}-${slug(entry.title || entry.body.slice(0, 30))}-${slug(entry.id)}.md`;
}
function mediaFilename(media: JournalExportMedia): string {
  const ext = media.storage_path.split(".").pop()?.toLowerCase();
  const fallback = media.bucket === "journal-videos" ? "mp4" : "jpg";
  const safeExt = ext && /^(jpg|jpeg|png|webp|heic|gif|mp4|webm|mov|m4v)$/.test(ext) ? ext : fallback;
  return `${media.bucket === "journal-videos" ? "videos" : "photos"}/${slug(media.entry_id)}-${slug(media.id)}.${safeExt}`;
}

/** Builds a complete archive or rejects. Never silently drops text or media. */
export async function buildJournalExportArchive(options: {
  name: string; entries: JournalExportEntry[]; media: JournalExportMedia[];
  download: (media: JournalExportMedia) => Promise<Blob>;
  assertAccess?: () => Promise<void>;
  maxMediaBytes?: number;
}): Promise<JSZip> {
  if (options.entries.some((entry) => entry.contentLocked)) throw new Error("Unlock your journal before exporting encrypted entries. Nothing was exported.");
  const zip = new JSZip();
  const root = zip.folder(slug(options.name))!;
  const entryIds = new Set(options.entries.map((entry) => entry.id));
  if (entryIds.size !== options.entries.length) throw new Error("Duplicate journal entry in export. Nothing was exported.");
  const mediaByEntry = new Map<string, JournalExportMedia[]>();
  const usedNames = new Set<string>();
  const manifest: { id: string; entryId: string; bucket: string; file: string }[] = [];
  let downloaded = 0;
  for (const media of options.media) {
    if (!entryIds.has(media.entry_id)) throw new Error("An attachment does not belong to the exported entries.");
    const file = mediaFilename(media);
    if (usedNames.has(file)) throw new Error("Duplicate attachment in export. Nothing was exported.");
    usedNames.add(file);
    await options.assertAccess?.();
    const blob = await options.download(media);
    downloaded += blob.size;
    if (downloaded > (options.maxMediaBytes ?? MAX_MEDIA_BYTES)) throw new Error("This archive exceeds the 256 MB browser export limit. Export a smaller notebook; no partial archive was downloaded.");
    await options.assertAccess?.();
    root.file(file, new Uint8Array(await blob.arrayBuffer()));
    const list = mediaByEntry.get(media.entry_id) ?? [];
    list.push(media); mediaByEntry.set(media.entry_id, list);
    manifest.push({ id: media.id, entryId: media.entry_id, bucket: media.bucket, file });
  }
  for (const entry of options.entries) {
    const filename = journalExportEntryFilename(entry);
    if (usedNames.has(filename)) throw new Error("Export filename collision. Nothing was exported.");
    usedNames.add(filename);
    const fm = ["---", `id: ${JSON.stringify(entry.id)}`, `date: ${JSON.stringify(entry.entry_at_ts)}`];
    for (const [field, value] of Object.entries({ title: entry.title, location: entry.location_name, weather: entry.weather,
      temp_c: entry.weather_temp_c, mood: entry.mood, tags: entry.tags, verse: entry.verse_ref, pinned: entry.pinned })) {
      if (value != null && value !== "") fm.push(`${field}: ${JSON.stringify(value)}`);
    }
    fm.push("---", "");
    if (entry.title) fm.push(`# ${entry.title}`, "");
    fm.push(entry.body || "");
    if (entry.summary) fm.push("", "## Summary", "", entry.summary);
    const attachments = mediaByEntry.get(entry.id) ?? [];
    for (const media of attachments) {
      const file = mediaFilename(media);
      if (media.bucket === "journal-videos") {
        fm.push("", "## Video", "", `[Play recording](${file})`);
        if (media.transcript) fm.push("", "### Recording transcript", "", media.transcript);
      } else fm.push("", `![Photo](${file})`);
    }
    root.file(filename, fm.join("\n"));
  }
  root.file("manifest.json", JSON.stringify({ version: 1, exportedAt: new Date().toISOString(),
    entries: options.entries.map((entry) => ({ id: entry.id, file: journalExportEntryFilename(entry) })), media: manifest }, null, 2));
  root.file("README.txt", "This ZIP contains readable journal text and media. It is not password-protected. Keep it in a secure location. The manifest lists every exported entry and attachment.\n");
  await options.assertAccess?.();
  return zip;
}

async function fetchExportMedia(userId: string, entryIds: string[]): Promise<JournalExportMedia[]> {
  const result: JournalExportMedia[] = [];
  for (let i = 0; i < entryIds.length; i += 100) {
    const ids = entryIds.slice(i, i + 100);
    for (const table of ["journal_photos", "journal_videos"] as const) {
      const rows = await collectJournalPages(async (cursor, limit) => {
        await requireJournalReadUser(userId);
        let query = supabase.from(table).select("*").eq("user_id", userId)
          .in("entry_id", ids).order("id", { ascending: true }).limit(limit);
        if (cursor) query = query.gt("id", cursor);
        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      });
      result.push(...rows.map((row) => ({ ...row, bucket: table === "journal_videos" ? "journal-videos" as const : "journal-photos" as const })));
    }
  }
  return result;
}

export async function exportJournalAsZip(journal: Journal | null): Promise<number> {
  const userId = await requireJournalReadUser();
  const key = getJournalDek();
  const assertAccess = async () => {
    await requireJournalReadUser(userId);
    if (getJournalDek() !== key) throw new Error("Journal privacy changed during export. Nothing was downloaded.");
  };
  const entries = await fetchJournalCollection(userId, { journalId: journal?.id });
  if (entries.some((entry) => entry.contentLocked)) throw new Error("Unlock your journal before exporting encrypted entries.");
  const media = await fetchExportMedia(userId, entries.map((entry) => entry.id));
  const zip = await buildJournalExportArchive({ name: journal?.name ?? "all-entries", entries, media, assertAccess,
    download: async (attachment) => {
      const { data, error } = await supabase.storage.from(attachment.bucket).download(attachment.storage_path);
      if (error || !data) throw new Error(`Could not export attachment ${attachment.id}: ${error?.message ?? "missing file"}. No partial archive was downloaded.`);
      return data;
    },
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  await assertAccess();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(journal?.name ?? "journal")}-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return entries.length;
}
