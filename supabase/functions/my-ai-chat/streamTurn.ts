import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { fetchChatCompletionStream } from "../_shared/aiProvider.ts";
import { titleFromFirstMessage } from "../_shared/chatTitle.ts";
import {
  buildJournalChatStreamSystemPrompt,
  buildJournalReflectionStreamSystemPrompt,
  buildMyAiStreamSystemPrompt,
} from "./systemPrompt.ts";
import { buildFrameworkRetrievalContext, buildPartnerWalkingAppendixForAi } from "./retrieval.ts";
import type { ResolvedResponseDepth } from "./responseDepth.ts";
import type { MyAiCompanionMode } from "./systemPrompt.ts";
import { finalizeChatCitations } from "./enrichCitations.ts";

export type StreamCitation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
  url?: string;
  start_seconds?: number;
};

const BRACKET_PATTERNS: { re: RegExp; source_type: StreamCitation["source_type"]; label: string }[] = [
  { re: /\[belief:([0-9a-f-]{36})\]/gi, source_type: "belief", label: "Belief" },
  { re: /\[journal:([0-9a-f-]{36})\]/gi, source_type: "journal", label: "Journal entry" },
  { re: /\[artifact:([0-9a-f-]{36})\]/gi, source_type: "artifact", label: "Artifact" },
  { re: /\[entity:([0-9a-f-]{36})\]/gi, source_type: "entity", label: "Entity" },
  { re: /\[influence:([0-9a-f-]{36})\]/gi, source_type: "influence", label: "Influence" },
];

function extractBracketCitations(reply: string): StreamCitation[] {
  const out: StreamCitation[] = [];
  for (const { re, source_type, label } of BRACKET_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(reply)) !== null) {
      out.push({ source_type, id: m[1], label });
    }
  }
  return out;
}

function dedupeCitations(items: StreamCitation[]): StreamCitation[] {
  const seen = new Set<string>();
  const out: StreamCitation[] = [];
  for (const c of items) {
    const key = `${c.source_type}|${c.id ?? ""}|${c.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function sanitizeReplyForDisplay(text: string): string {
  return text
    .replace(/\[+(?:artifact|journal|belief|entity|influence|tension):[^\]]+\]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function looksLikeGeneralKnowledgeFallback(reply: string): StreamCitation[] {
  const t = reply.toLowerCase();
  if (t.includes("nothing in your framework speaks") && t.includes("general knowledge")) {
    return [{ source_type: "general", label: "Outside knowledge (OpenAI)" }];
  }
  if (t.includes("from general knowledge")) {
    return [{ source_type: "general", label: "Outside knowledge (OpenAI)" }];
  }
  return [];
}

function parseStreamedMarkdown(raw: string): { reply: string; citations: StreamCitation[] } {
  const citations = dedupeCitations([
    ...extractBracketCitations(raw),
    ...looksLikeGeneralKnowledgeFallback(raw),
  ]);
  const reply = sanitizeReplyForDisplay(raw);
  return { reply, citations };
}

function extractDeltaContent(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
    };
    const c = parsed.choices?.[0]?.delta?.content;
    return typeof c === "string" ? c : null;
  } catch {
    return null;
  }
}

export type StreamTurnParams = {
  supabase: SupabaseClient;
  userId: string;
  chatId: string;
  journalMode: boolean;
  includeGeneral: boolean;
  message: string;
  resolvedDepth: ResolvedResponseDepth;
  skipUserInsert: boolean;
  excludeJournal: string | null;
  journalReflectionBlock?: string | null;
  librarySearch?: boolean;
  companionMode?: MyAiCompanionMode;
  corsHeaders: Record<string, string>;
};

/** Returns SSE immediately; context retrieval + LLM streaming run inside the body. */
export function createStreamingChatResponse(params: StreamTurnParams): Response {
  const {
    supabase,
    userId,
    chatId,
    journalMode,
    includeGeneral,
    message,
    resolvedDepth,
    skipUserInsert,
    excludeJournal,
    journalReflectionBlock,
    librarySearch,
    companionMode = "chatgpt",
    corsHeaders,
  } = params;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let acc = "";
      let sseBuf = "";

      try {
        // Flush SSE headers through proxies before heavy retrieval work.
        controller.enqueue(encoder.encode(": connected\n\n"));

        const [contextPack, partnerAppendix] = await Promise.all([
          buildFrameworkRetrievalContext(supabase, userId, chatId, message, excludeJournal, {
            librarySearch,
          }),
          buildPartnerWalkingAppendixForAi(supabase, userId),
        ]);

        const systemText = journalReflectionBlock?.trim()
          ? buildJournalReflectionStreamSystemPrompt(includeGeneral, partnerAppendix, resolvedDepth, companionMode)
          : journalMode
          ? buildJournalChatStreamSystemPrompt(includeGeneral, partnerAppendix, resolvedDepth, companionMode)
          : buildMyAiStreamSystemPrompt(includeGeneral, partnerAppendix, resolvedDepth, companionMode);

        const reflectionPrefix = journalReflectionBlock?.trim()
          ? `${journalReflectionBlock.trim()}\n\n---\n\n`
          : "";
        const userPayload =
          `${reflectionPrefix}${contextPack.contextBlock}\n\nUser message:\n${message}\n\nAnswer the user message using the context above. Return markdown only.`;

        const streamTemp = companionMode === "chatgpt" ? 0.7 : 0.55;
        const streamMaxTokens = companionMode === "chatgpt" ? 8192 : 4096;
        const upstream = await fetchChatCompletionStream(systemText, userPayload, streamTemp, streamMaxTokens);
        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "Stream failed");
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: errText.slice(0, 500) })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = sseBuf.indexOf("\n")) !== -1) {
            let line = sseBuf.slice(0, idx);
            sseBuf = sseBuf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            const delta = extractDeltaContent(payload);
            if (delta) {
              acc += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }

        const { reply, citations: rawCitations } = parseStreamedMarkdown(acc);
        const citations = await finalizeChatCitations(
          supabase,
          userId,
          rawCitations,
          {
            includeGeneral,
            usedWeb: false,
          },
          contextPack.retrievedCitations,
        );
        const { data: asstRow, error: asstErr } = await supabase
          .from("my_ai_messages")
          .insert({
            user_id: userId,
            chat_id: chatId,
            role: "assistant",
            content: reply,
            citations,
          })
          .select("id")
          .single();

        if (asstErr || !asstRow) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: asstErr?.message ?? "Save failed" })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        const { data: chatRow } = await supabase
          .from("my_ai_chats")
          .select("title,journal_entry_id")
          .eq("id", chatId)
          .maybeSingle();

        const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
        let titleOut =
          typeof chatRow?.title === "string" && chatRow.title.trim() ? chatRow.title.trim() : null;
        if (!titleOut && !skipUserInsert) {
          titleOut = titleFromFirstMessage(message);
          patch.title = titleOut;
        }
        await supabase.from("my_ai_chats").update(patch).eq("id", chatId).eq("user_id", userId);

        const journalEntryIdLinked = (chatRow?.journal_entry_id as string | null) ?? null;
        if (titleOut && journalEntryIdLinked) {
          const { data: journalEntry } = await supabase
            .from("journal_entries")
            .select("title")
            .eq("id", journalEntryIdLinked)
            .eq("user_id", userId)
            .maybeSingle();
          if (!journalEntry?.title?.trim()) {
            await supabase
              .from("journal_entries")
              .update({ title: titleOut, updated_at: new Date().toISOString() })
              .eq("id", journalEntryIdLinked)
              .eq("user_id", userId);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              chat_id: chatId,
              assistant_message_id: asstRow.id,
              content: reply,
              citations,
              title: titleOut,
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
