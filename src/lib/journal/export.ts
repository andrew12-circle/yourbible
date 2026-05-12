import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrls } from "./photos";
import type { Journal } from "./journals";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "entry";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/**
 * Export entries belonging to a journal (or all entries when journal is null)
 * as a downloaded .zip containing one markdown file per entry plus photos.
 */
export async function exportJournalAsZip(journal: Journal | null) {
  let q = supabase
    .from("journal_entries")
    .select(
      "id,title,body,entry_at_ts,mood,tags,location_name,weather,weather_temp_c,verse_ref,pinned",
    )
    .or("entry_kind.is.null,entry_kind.neq.vent")
    .order("entry_at_ts", { ascending: true });
  if (journal) q = q.eq("journal_id", journal.id);
  const { data: entries } = await q;
  const list = entries ?? [];

  const ids = list.map((e) => e.id);
  const photoMap: Record<string, { storage_path: string }[]> = {};
  if (ids.length) {
    const { data: photos } = await supabase
      .from("journal_photos")
      .select("entry_id,storage_path")
      .in("entry_id", ids);
    (photos ?? []).forEach((p) => {
      (photoMap[p.entry_id] ||= []).push({ storage_path: p.storage_path });
    });
  }

  const allPaths = Object.values(photoMap).flat().map((p) => p.storage_path);
  const urls = allPaths.length ? await getSignedPhotoUrls(allPaths) : {};

  const zip = new JSZip();
  const root = zip.folder(slug(journal?.name ?? "all-entries"))!;
  const photosFolder = root.folder("photos")!;

  for (const e of list) {
    const date = fmtDate(e.entry_at_ts);
    const fname = `${date}-${slug(e.title ?? e.body.slice(0, 30) ?? e.id)}.md`;
    const fm: string[] = ["---"];
    fm.push(`date: ${e.entry_at_ts}`);
    if (e.title) fm.push(`title: ${JSON.stringify(e.title)}`);
    if (e.location_name) fm.push(`location: ${JSON.stringify(e.location_name)}`);
    if (e.weather) fm.push(`weather: ${JSON.stringify(e.weather)}`);
    if (e.weather_temp_c != null) fm.push(`temp_c: ${e.weather_temp_c}`);
    if (e.mood != null) fm.push(`mood: ${e.mood}`);
    if (e.tags?.length) fm.push(`tags: [${e.tags.map((t: string) => JSON.stringify(t)).join(", ")}]`);
    if (e.verse_ref) fm.push(`verse: ${JSON.stringify(e.verse_ref)}`);
    if (e.pinned) fm.push(`pinned: true`);
    fm.push("---", "");
    if (e.title) fm.push(`# ${e.title}`, "");
    fm.push(e.body || "");

    const imgs = photoMap[e.id] ?? [];
    if (imgs.length) {
      fm.push("", "## Photos", "");
      for (let i = 0; i < imgs.length; i++) {
        const p = imgs[i];
        const ext = p.storage_path.split(".").pop() || "jpg";
        const local = `photos/${e.id}-${i}.${ext}`;
        fm.push(`![photo](${local})`);
        const url = urls[p.storage_path];
        if (url) {
          try {
            const blob = await (await fetch(url)).blob();
            photosFolder.file(`${e.id}-${i}.${ext}`, blob);
          } catch {
            /* skip missing */
          }
        }
      }
    }

    root.file(fname, fm.join("\n"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(journal?.name ?? "journal")}-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  return list.length;
}