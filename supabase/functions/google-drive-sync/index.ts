import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  ensureDriveBackupFolder,
  getValidGoogleDriveAccessToken,
  listUserStorageObjects,
  uploadFileToDrive,
} from "../_shared/googleDriveOAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 8;

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    json: "application/json",
    txt: "text/plain",
    md: "text/markdown",
    zip: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const accessToken = await getValidGoogleDriveAccessToken(admin, u.user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Connect Google Drive first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await admin
      .from("google_drive_oauth_connections")
      .select("drive_folder_id")
      .eq("user_id", u.user.id)
      .maybeSingle();

    const folderId = await ensureDriveBackupFolder(
      accessToken,
      (conn?.drive_folder_id as string | null) ?? null,
    );
    if (folderId !== conn?.drive_folder_id) {
      await admin.from("google_drive_oauth_connections").update({
        drive_folder_id: folderId,
        updated_at: new Date().toISOString(),
      }).eq("user_id", u.user.id);
    }

    const { data: syncedRows } = await admin
      .from("google_drive_synced_objects")
      .select("bucket_id,storage_path")
      .eq("user_id", u.user.id);

    const synced = new Set(
      (syncedRows ?? []).map((r) => `${r.bucket_id as string}::${r.storage_path as string}`),
    );

    const allObjects = await listUserStorageObjects(admin, u.user.id);
    const pending = allObjects.filter((o) => !synced.has(`${o.bucket_id}::${o.name}`));
    const batch = pending.slice(0, BATCH_SIZE);

    let uploaded = 0;
    let lastError: string | null = null;

    for (const obj of batch) {
      try {
        const { data: blob, error: dlErr } = await admin.storage.from(obj.bucket_id).download(obj.name);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? "download failed");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const relativePath = `${obj.bucket_id}/${obj.name.split("/").slice(1).join("/")}`;
        const driveFileId = await uploadFileToDrive(
          accessToken,
          folderId,
          relativePath,
          bytes,
          guessMimeType(obj.name),
        );
        await admin.from("google_drive_synced_objects").upsert({
          user_id: u.user.id,
          bucket_id: obj.bucket_id,
          storage_path: obj.name,
          drive_file_id: driveFileId,
          size_bytes: obj.size_bytes,
          synced_at: new Date().toISOString(),
        });
        uploaded += 1;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        break;
      }
    }

    const remaining = Math.max(0, pending.length - uploaded);
    const complete = remaining === 0;

    const connectionUpdate: Record<string, string | null> = {
      last_sync_error: lastError,
      updated_at: new Date().toISOString(),
    };
    if (complete) connectionUpdate.last_sync_at = new Date().toISOString();

    await admin.from("google_drive_oauth_connections").update(connectionUpdate).eq("user_id", u.user.id);

    return new Response(JSON.stringify({
      ok: !lastError,
      uploaded,
      remaining,
      complete,
      total_objects: allObjects.length,
      error: lastError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
