// Parses a Day One JSON export (.json or .zip with Journal.json + photos/) from artifact-uploads
// and creates journal_entries (+ optional journal) with photos in journal-photos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  type DayOneJournalExport,
  loadDayOneExportsFromBytes,
  readPhotoFromZip,
} from "../_shared/dayoneParse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ENTRIES_PER_RUN = 300;
const MAX_PHOTOS_PER_RUN = 150;

function entryAtDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      storage_path?: string;
      target_journal_id?: string | null;
      journal_name?: string | null;
    };

    const storage_path = body.storage_path;
    const target_journal_id = body.target_journal_id ?? null;
    const journal_name_override = body.journal_name?.trim() || null;

    if (!storage_path) {
      return new Response(JSON.stringify({ error: "storage_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!storage_path.startsWith(`${u.user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fileBlob, error: dlErr } = await admin.storage.from("artifact-uploads").download(storage_path);
    if (dlErr || !fileBlob) {
      return new Response(JSON.stringify({ error: `Download failed: ${dlErr?.message ?? "unknown"}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const lower = storage_path.toLowerCase();
    const isZip = lower.endsWith(".zip");

    let exports: DayOneJournalExport[];
    let zip: Awaited<ReturnType<typeof loadDayOneExportsFromBytes>>["zip"];
    try {
      const loaded = await loadDayOneExportsFromBytes(
        buf,
        isZip,
        journal_name_override ?? undefined,
      );
      exports = loaded.exports;
      zip = loaded.zip;
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (exports.length > 1 && target_journal_id) {
      return new Response(
        JSON.stringify({
          error: "This zip contains multiple Day One journals. Import without selecting a target journal, or export one journal at a time from Day One.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let entriesImported = 0;
    let entriesSkipped = 0;
    let photosImported = 0;
    let photosSkipped = 0;
    const journalIds: string[] = [];
    let hitEntryCap = false;
    let hitPhotoCap = false;

    const resolveJournalId = async (exportName: string): Promise<string> => {
      if (target_journal_id) {
        const { data: existing } = await userClient
          .from("journals")
          .select("id")
          .eq("id", target_journal_id)
          .eq("user_id", u.user!.id)
          .maybeSingle();
        if (!existing?.id) throw new Error("Target journal not found.");
        return existing.id;
      }

      const name = journal_name_override ?? exportName;
      const { data: created, error } = await userClient
        .from("journals")
        .insert({
          user_id: u.user!.id,
          name: name.slice(0, 120),
          color: "211 100% 50%",
          icon: "book",
          sort_order: 9998,
          is_default: false,
          source_kind: "manual",
        })
        .select("id")
        .maybeSingle();
      if (error || !created?.id) {
        throw new Error(error?.message ?? "Could not create journal for import.");
      }
      return created.id;
    };

    for (const journalExport of exports) {
      if (entriesImported >= MAX_ENTRIES_PER_RUN) {
        hitEntryCap = true;
        break;
      }

      const journalId = await resolveJournalId(journalExport.name);
      journalIds.push(journalId);

      const slice = journalExport.entries.slice(0, MAX_ENTRIES_PER_RUN - entriesImported);

      const entryRows: Record<string, unknown>[] = [];
      for (const entry of slice) {
        const id = entry.entryId ?? crypto.randomUUID();
        entryRows.push({
          id,
          user_id: u.user!.id,
          journal_id: journalId,
          title: entry.title,
          body: entry.body || "",
          tags: entry.tags,
          entry_at_ts: entry.creationDate,
          entry_at: entryAtDate(entry.creationDate),
          pinned: entry.pinned,
          location_name: entry.locationName,
          lat: entry.lat,
          lng: entry.lng,
          weather: entry.weather,
          weather_temp_c: entry.weatherTempC,
          analyze_for_mirror: false,
        });
      }

      const { data: inserted, error: insErr } = await userClient
        .from("journal_entries")
        .upsert(entryRows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");

      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertedIds = new Set((inserted ?? []).map((r) => r.id as string));
      entriesImported += insertedIds.size;
      entriesSkipped += entryRows.length - insertedIds.size;

      if (!zip || insertedIds.size === 0) continue;

      for (const entry of slice) {
        if (hitPhotoCap) break;
        const entryId = entry.entryId;
        if (!entryId || !insertedIds.has(entryId)) continue;
        if (!entry.photos.length) continue;

        for (const photo of entry.photos) {
          if (photosImported >= MAX_PHOTOS_PER_RUN) {
            hitPhotoCap = true;
            break;
          }
          const blob = await readPhotoFromZip(zip, photo);
          if (!blob) {
            photosSkipped++;
            continue;
          }
          const storagePath = `${u.user!.id}/${entryId}/${crypto.randomUUID()}.${blob.ext}`;
          const { error: upErr } = await admin.storage.from("journal-photos").upload(storagePath, blob.bytes, {
            upsert: false,
            contentType: blob.contentType,
          });
          if (upErr) {
            photosSkipped++;
            continue;
          }
          const { error: phErr } = await userClient.from("journal_photos").insert({
            user_id: u.user!.id,
            entry_id: entryId,
            storage_path: storagePath,
            width: photo.width,
            height: photo.height,
          });
          if (phErr) {
            await admin.storage.from("journal-photos").remove([storagePath]).catch(() => {});
            photosSkipped++;
            continue;
          }
          photosImported++;
        }
      }

      if (journalExport.entries.length > slice.length) {
        hitEntryCap = true;
      }
    }

    await admin.storage.from("artifact-uploads").remove([storage_path]).catch((e) => console.error(e));

    const totalEntries = exports.reduce((n, j) => n + j.entries.length, 0);
    const partial = hitEntryCap || hitPhotoCap || totalEntries > entriesImported + entriesSkipped;

    let message: string | null = null;
    if (partial) {
      const parts: string[] = [];
      if (hitEntryCap) parts.push(`entry limit ${MAX_ENTRIES_PER_RUN} per upload`);
      if (hitPhotoCap) parts.push(`photo limit ${MAX_PHOTOS_PER_RUN} per upload`);
      message = `Imported ${entriesImported} of ${totalEntries} entries. ${parts.join("; ")} — upload again to continue (existing entries are skipped).`;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        journals_created: target_journal_id ? 0 : journalIds.length,
        journal_ids: journalIds,
        journal_id: journalIds[0] ?? null,
        entries_imported: entriesImported,
        entries_skipped: entriesSkipped,
        photos_imported: photosImported,
        photos_skipped: photosSkipped,
        partial,
        message,
        total_entries: totalEntries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
