import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";
import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";

export type MyAiChatCitation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
  url?: string;
  start_seconds?: number;
};

export type MyAiChatRequestBody = {
  chat_id?: string | null;
  message?: string;
  mode?: "journal";
  journal_entry_id?: string;
  include_general_knowledge?: boolean;
  response_depth?: ResponseDepthSetting;
  retry_last?: boolean;
  stream?: boolean;
  edit_user_message_id?: string | null;
  journal_bootstrap_opener?: boolean;
  journal_bootstrap_artifact_claim_id?: string;
  journal_bootstrap_transcript_excerpt?: string | null;
  /** Deep inward search — videos, claims, transcripts, library inventory. */
  research_scope?: "library" | "outside" | "web";
};

export type MyAiChatDoneEvent = {
  chat_id: string;
  assistant_message_id: string;
  content: string;
  citations: MyAiChatCitation[];
  title?: string | null;
};

export type StreamMyAiChatOptions = {
  body: MyAiChatRequestBody;
  signal?: AbortSignal;
  onDelta: (accumulated: string) => void;
};

function supabaseFunctionsUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  return `${url}/functions/v1/my-ai-chat`;
}

function supabaseAnonKey(): string {
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim() ?? "";
  if (!key) throw new Error("Missing Supabase anon key");
  return key;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return {
    Authorization: `Bearer ${token}`,
    apikey: supabaseAnonKey(),
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
}

function doneFromJson(data: Record<string, unknown>, fallbackContent: string): MyAiChatDoneEvent {
  if (typeof data.error === "string" && data.error.trim()) {
    throw new Error(data.error);
  }
  const chatId = typeof data.chat_id === "string" ? data.chat_id : "";
  const assistantId = typeof data.assistant_message_id === "string" ? data.assistant_message_id : "";
  if (!chatId || !assistantId) throw new Error("Unexpected response from My AI");
  const content = typeof data.content === "string" ? data.content : fallbackContent;
  const citations = Array.isArray(data.citations) ? (data.citations as MyAiChatCitation[]) : [];
  const title = typeof data.title === "string" ? data.title : null;
  return { chat_id: chatId, assistant_message_id: assistantId, content, citations, title };
}

function isLikelySse(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return ct.includes("text/event-stream") || ct.includes("application/x-ndjson");
}

async function consumeSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<MyAiChatDoneEvent> {
  const decoder = new TextDecoder();
  let sseBuf = "";
  let acc = "";

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    sseBuf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = sseBuf.indexOf("\n")) !== -1) {
      let line = sseBuf.slice(0, idx);
      sseBuf = sseBuf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (parsed.type === "error") {
        throw new Error(typeof parsed.message === "string" ? parsed.message : "Stream error");
      }
      if (parsed.type === "done") {
        return doneFromJson(parsed, acc);
      }
      if (typeof parsed.delta === "string" && parsed.delta) {
        acc += parsed.delta;
        onDelta(acc);
      }
    }
  }

  throw new Error("Stream ended without completion");
}

/** Stream markdown from `my-ai-chat` (SSE). Non-SSE JSON responses paint instantly. */
export async function streamMyAiChat(options: StreamMyAiChatOptions): Promise<MyAiChatDoneEvent> {
  const { body, signal, onDelta } = options;
  const wantsStream = body.stream !== false;

  const response = await fetch(supabaseFunctionsUrl(), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ ...body, stream: wantsStream }),
    signal,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJsonResponse = contentType.toLowerCase().includes("application/json");

  if (!response.ok) {
    if (isJsonResponse) {
      const errBody = await response.json();
      throw new Error(await edgeFunctionErrorMessage("my-ai-chat", null, errBody));
    }
    const text = (await response.text()).trim();
    throw new Error(text.slice(0, 500) || `my-ai-chat failed (HTTP ${response.status})`);
  }

  if (response.body && (isLikelySse(contentType) || (wantsStream && !isJsonResponse))) {
    return consumeSseStream(response.body.getReader(), onDelta, signal);
  }

  const raw = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    if (raw.trim()) {
      onDelta(raw.trim());
      throw new Error("Unexpected response from My AI");
    }
    throw new Error("Empty response from My AI");
  }

  const done = doneFromJson(data, "");
  if (done.content) onDelta(done.content);
  return done;
}
