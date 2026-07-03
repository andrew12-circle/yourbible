import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

const PRAYER_PROMPT = `You are helping someone pray their morning conversation with God.

Read their journal entry below (thanksgiving, what's on their heart, and anything else they wrote).

Write 3 short, personal prayers they can pray aloud today. Each prayer should:
- Be specific to what they actually wrote — names, fears, hopes, business, family
- Sound like them talking to God honestly, not like a sermon
- Be 2–4 sentences each

Format as numbered prayers only — no preamble.`;

export async function generateGuidedMorningPrayers(
  userId: string,
  journalBody: string,
): Promise<string> {
  const trimmed = journalBody.trim();
  if (!trimmed) {
    throw new Error("Write something in your journal first — thanks or what's on your heart.");
  }

  const { data: chat, error: chatErr } = await supabase
    .from("my_ai_chats")
    .insert({
      user_id: userId,
      title: "Morning formula · guided prayers",
    })
    .select("id")
    .maybeSingle();

  if (chatErr || !chat?.id) {
    throw new Error(chatErr?.message ?? "Couldn't start prayer assistant");
  }

  const message = `${PRAYER_PROMPT}\n\n---\n\n${trimmed.slice(0, 12000)}`;

  const { data, error } = await supabase.functions.invoke("my-ai-chat", {
    body: {
      chat_id: chat.id,
      message,
      mode: "chat",
      stream: false,
      response_depth: "reflect",
    },
  });

  if (error) {
    throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
  }

  const payload = data as { reply?: string; error?: string } | null;
  if (payload?.error) throw new Error(payload.error);

  const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
  if (!reply) throw new Error("No prayers returned — try again.");
  return reply;
}
