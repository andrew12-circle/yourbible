/**
 * Reads a saved journal sketch image (handwriting on paper) via Gemini vision
 * and appends an AI transcription block to the journal entry body.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mimeFromPath(path: string): string {
  const ext = (path.split(".").pop() || "png").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/png";
}

async function pathFingerprint(storagePath: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(storagePath));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function needsAutoTitle(title: string | null | undefined): boolean {
  const t = String(title ?? "").trim();
  if (!t) return true;
  return /^(entry|untitled|new\s+(journal|entry)(?:\s+entry)?|journal\s+entry)$/i.test(t);
}

function proseForMeta(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\*\*From your sketch\*\*[^\n]*\n+/im, "")
    .replace(/^---\n/gm, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function u8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entry_id, storage_path } = (await req.json()) as {
      entry_id?: string;
      storage_path?: string;
    };
    if (!entry_id || !storage_path || typeof storage_path !== "string") {
      return new Response(JSON.stringify({ error: "entry_id and storage_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: entry } = await supabase
      .from("journal_entries")
      .select("id,body,summary,user_id")
      .eq("id", entry_id)
      .maybeSingle();
    if (!entry || entry.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Entry not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photo } = await supabase
      .from("journal_photos")
      .select("id,storage_path,user_id")
      .eq("entry_id", entry_id)
      .eq("storage_path", storage_path)
      .maybeSingle();
    if (!photo || photo.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Photo not found for this entry" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marker = `<!-- sketch-tx:${await pathFingerprint(storage_path)} -->`;
    const bodyStr = String(entry.body ?? "");
    if (bodyStr.includes(marker)) {
      let suggestedTitle: string | null = null;
      let suggestedSummary: string | null = null;
      const prose = proseForMeta(bodyStr);
      const needsTitle = needsAutoTitle(entry.title) && prose.length >= 20;
      const needsSummary = !String(entry.summary ?? "").trim() && prose.length >= 40;
      if (needsTitle || needsSummary) {
        const metaRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  `You help title and summarize a private faith journal entry from transcribed handwriting. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}. Title: 4–12 words, sentence case, no trailing period, or null if not needed. Summary: one warm paragraph (2–4 sentences, <= 500 chars), or null if not needed.`,
              },
              { role: "user", content: prose.slice(0, 6000) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (metaRes.ok) {
          try {
            const metaJson = await metaRes.json();
            const content = metaJson.choices?.[0]?.message?.content;
            if (typeof content === "string") {
              const parsed = JSON.parse(content) as { title?: string | null; summary?: string | null };
              if (needsTitle && typeof parsed.title === "string" && parsed.title.trim()) {
                suggestedTitle = parsed.title.trim().slice(0, 120);
              }
              if (needsSummary && typeof parsed.summary === "string" && parsed.summary.trim()) {
                suggestedSummary = parsed.summary.trim().slice(0, 900);
              }
            }
          } catch {
            /* ignore */
          }
        }
        if (suggestedTitle || suggestedSummary) {
          await supabase
            .from("journal_entries")
            .update({
              ...(suggestedTitle ? { title: suggestedTitle } : {}),
              ...(suggestedSummary ? { summary: suggestedSummary } : {}),
            })
            .eq("id", entry_id)
            .eq("user_id", u.user.id);
        }
      }
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          body: bodyStr,
          title: suggestedTitle,
          summary: suggestedSummary,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: blob, error: dlErr } = await admin.storage.from("journal-photos").download(storage_path);
    if (dlErr || !blob) {
      return new Response(JSON.stringify({ error: dlErr?.message ?? "Could not download image" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length > 12 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = mimeFromPath(storage_path);
    const dataUrl = `data:${mime};base64,${u8ToBase64(bytes)}`;

    const prompt =
      `You are transcribing a personal journal sketch: handwriting (and maybe simple doodles) on lined, yellow legal pad, graph, dot, or blank paper.
Read the image and output the legible text in natural reading order (top to bottom, left to right).
Preserve line breaks and short paragraphs where the writer clearly started a new line.
Use plain text only (no markdown headings).
For words you cannot read, insert [illegible] — do not guess devotional or theological content.
If there is essentially no handwriting (only blank paper or pure drawings), return a single short sentence describing that, e.g. "No readable handwriting in this sketch."`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "transcribe_sketch",
              parameters: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "Transcribed handwriting as plain text with line breaks.",
                  },
                },
                required: ["text"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "transcribe_sketch" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text.slice(0, 800) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let transcribed = "";
    if (tc?.function?.arguments) {
      try {
        const args = JSON.parse(tc.function.arguments);
        transcribed = typeof args.text === "string" ? args.text.trim() : "";
      } catch {
        transcribed = "";
      }
    }
    if (!transcribed) {
      const content = aiJson.choices?.[0]?.message?.content;
      if (typeof content === "string") transcribed = content.trim();
    }
    if (!transcribed) {
      return new Response(JSON.stringify({ error: "Model returned no transcription" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sep = bodyStr.trim().length ? "\n\n" : "";
    const block =
      `${sep}${marker}\n---\n**From your sketch** (AI transcription)\n\n${transcribed}\n`;
    const nextBody = `${bodyStr}${block}`;

    const { data: updated, error: upErr } = await supabase
      .from("journal_entries")
      .update({ body: nextBody })
      .eq("id", entry_id)
      .eq("user_id", u.user.id)
      .select("id,title,body")
      .maybeSingle();

    if (upErr || !updated) {
      return new Response(JSON.stringify({ error: upErr?.message ?? "Could not update entry" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let suggestedTitle: string | null = null;
    let suggestedSummary: string | null = null;
    const needsTitle = needsAutoTitle(updated.title) && transcribed.length >= 20;
    const needsSummary = !String(entry.summary ?? "").trim() && transcribed.length >= 40;
    if (needsTitle || needsSummary) {
      const metaRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                `You help title and summarize a private faith journal entry from transcribed handwriting. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}. Title: 4–12 words, sentence case, no trailing period, or null if not needed. Summary: one warm paragraph (2–4 sentences, <= 500 chars), second person optional, specific to what they wrote — or null if not needed.`,
            },
            { role: "user", content: transcribed.slice(0, 6000) },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (metaRes.ok) {
        try {
          const metaJson = await metaRes.json();
          const content = metaJson.choices?.[0]?.message?.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content) as { title?: string | null; summary?: string | null };
            if (needsTitle && typeof parsed.title === "string" && parsed.title.trim()) {
              suggestedTitle = parsed.title.trim().slice(0, 120);
            }
            if (needsSummary && typeof parsed.summary === "string" && parsed.summary.trim()) {
              suggestedSummary = parsed.summary.trim().slice(0, 900);
            }
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }
    if (suggestedTitle || suggestedSummary) {
      await supabase
        .from("journal_entries")
        .update({
          ...(suggestedTitle ? { title: suggestedTitle } : {}),
          ...(suggestedSummary ? { summary: suggestedSummary } : {}),
        })
        .eq("id", entry_id)
        .eq("user_id", u.user.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        text: transcribed,
        body: updated.body,
        title: suggestedTitle,
        summary: suggestedSummary,
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
