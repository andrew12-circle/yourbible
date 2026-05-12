// Parses a ChatGPT conversations.json (or zip containing it) from private storage,
// creates one artifact per conversation, triggers framework-analyze for each.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CONVERSATIONS = 200;
const MAX_RAW_TEXT = 2_000_000;

function extractMessageText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (Array.isArray(c.parts)) {
      return c.parts
        .map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object" && "text" in (p as object)) {
            return String((p as { text?: unknown }).text ?? "");
          }
          return "";
        })
        .join("");
    }
    if (typeof c.text === "string") return c.text;
  }
  return "";
}

function messagesFromMapping(conv: Record<string, unknown>): { role: string; text: string; t?: number }[] {
  const mapping = conv.mapping as Record<string, { message?: Record<string, unknown> }> | undefined;
  if (!mapping) return [];
  const out: { role: string; text: string; t?: number }[] = [];
  for (const node of Object.values(mapping)) {
    const msg = node?.message;
    if (!msg || typeof msg !== "object") continue;
    const meta = msg.metadata as { is_visually_hidden_from_conversation?: boolean } | undefined;
    if (meta?.is_visually_hidden_from_conversation) continue;
    const author = msg.author as { role?: string } | undefined;
    const role = author?.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = extractMessageText(msg.content).trim();
    if (!text) continue;
    const ct = typeof msg.create_time === "number" ? msg.create_time : undefined;
    out.push({ role, text, t: ct });
  }
  out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  return out;
}

function messagesFromLegacy(conv: Record<string, unknown>): { role: string; text: string; t?: number }[] {
  const msgs = conv.messages as unknown[] | undefined;
  if (!Array.isArray(msgs)) return [];
  const out: { role: string; text: string; t?: number }[] = [];
  for (const m of msgs) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = typeof o.role === "string" ? o.role : (o.author as { role?: string } | undefined)?.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = (typeof o.content === "string" ? o.content : extractMessageText(o.content)).trim();
    if (!text) continue;
    const t = typeof o.create_time === "number" ? o.create_time : undefined;
    out.push({ role, text, t });
  }
  out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  return out;
}

function buildRawText(conv: Record<string, unknown>): { text: string; messageCount: number; startedAt: string | null } {
  let rows = messagesFromMapping(conv);
  if (rows.length === 0) rows = messagesFromLegacy(conv);
  const messageCount = rows.length;
  const startedAt =
    rows[0]?.t != null ? new Date(rows[0].t * 1000).toISOString() : null;
  const text = rows.map((r) => `${r.role.toUpperCase()}:\n${r.text}`).join("\n\n---\n\n");
  return { text, messageCount, startedAt };
}

function normalizeConversations(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === "object" && "conversations" in parsed) {
    const c = (parsed as { conversations: unknown }).conversations;
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }
  throw new Error("Unrecognized export: expected a JSON array or an object with a conversations array.");
}

async function parseExportJson(bytes: Uint8Array, isZip: boolean): Promise<unknown> {
  if (!isZip) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return JSON.parse(text);
  }
  const zip = await JSZip.loadAsync(bytes);
  let bestPath = "";
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    if (!relativePath.endsWith("conversations.json")) return;
    if (!bestPath || relativePath.length < bestPath.length) bestPath = relativePath;
  });
  if (!bestPath) throw new Error("Zip archive does not contain conversations.json");
  const file = zip.file(bestPath);
  if (!file) throw new Error("Could not read conversations.json from zip");
  const text = await file.async("string");
  return JSON.parse(text);
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

    let storage_path: string | undefined;
    let processing_token: string | undefined;

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      storage_path = (form.get("storage_path") as string) || undefined;
      processing_token = (form.get("processing_token") as string) || undefined;
    } else {
      const body = (await req.json()) as { storage_path?: string; processing_token?: string };
      storage_path = body.storage_path;
      processing_token = body.processing_token;
    }

    if (!storage_path || !processing_token) {
      return new Response(JSON.stringify({ error: "storage_path and processing_token are required" }), {
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
    let parsed: unknown;
    try {
      parsed = await parseExportJson(buf, isZip);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let conversations: Record<string, unknown>[];
    try {
      conversations = normalizeConversations(parsed);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = conversations.length;
    const partial = total > MAX_CONVERSATIONS;
    const slice = conversations.slice(0, MAX_CONVERSATIONS);

    type Row = {
      user_id: string;
      title: string | null;
      kind: string;
      url: null;
      raw_text: string;
      status: string;
      processing_token: string;
      metadata: Record<string, unknown>;
    };

    const rows: Row[] = [];
    for (const conv of slice) {
      const convId = typeof conv.id === "string" ? conv.id : crypto.randomUUID();
      const titleRaw = typeof conv.title === "string" && conv.title.trim() ? conv.title.trim() : "Untitled chat";
      const { text, messageCount, startedAt } = buildRawText(conv);
      if (!text.trim()) continue;

      let raw_text = text;
      const meta: Record<string, unknown> = {
        source: "chatgpt_export",
        conversation_id: convId,
        message_count: messageCount,
        started_at: startedAt,
      };
      if (raw_text.length > MAX_RAW_TEXT) {
        raw_text = raw_text.slice(0, MAX_RAW_TEXT);
        meta.truncated = true;
        meta.truncated_chars = text.length;
      }

      rows.push({
        user_id: u.user.id,
        title: titleRaw.slice(0, 500),
        kind: "chat_export",
        url: null,
        raw_text,
        status: "analyzing",
        processing_token,
        metadata: meta,
      });
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "No conversations with extractable messages found." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await userClient.from("artifacts").insert(rows).select("id");
    if (insErr || !inserted?.length) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const artifact_ids = inserted.map((r) => r.id as string);
    for (const id of artifact_ids) {
      fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ artifact_id: id, processing_token }),
      }).catch((e) => console.error(e));
    }

    await admin.storage.from("artifact-uploads").remove([storage_path]).catch((e) => console.error(e));

    const msg = partial
      ? `Imported ${rows.length} of ${total} conversations (limit ${MAX_CONVERSATIONS} per upload). Upload again for the rest if needed.`
      : null;

    return new Response(
      JSON.stringify({
        ok: true,
        imported: artifact_ids.length,
        artifact_ids,
        first_artifact_id: artifact_ids[0],
        partial,
        message: msg,
        total_conversations: total,
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
