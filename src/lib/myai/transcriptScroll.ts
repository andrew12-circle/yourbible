export type TranscriptScrollMessage = {
  id: string;
  role: "user" | "assistant" | "system";
};

export type TranscriptScrollSnapshot = {
  chatId: string | null;
  lastMessageId: string | null;
  messageCount: number;
};

export type TranscriptScrollTarget =
  | { type: "none" }
  | { type: "bottom" }
  | { type: "message-start"; messageId: string };

export const EMPTY_TRANSCRIPT_SCROLL_SNAPSHOT: TranscriptScrollSnapshot = {
  chatId: null,
  lastMessageId: null,
  messageCount: 0,
};

export function nextMyAiTranscriptScroll(params: {
  previous: TranscriptScrollSnapshot;
  chatId: string | null | undefined;
  messages: TranscriptScrollMessage[];
  sending: boolean;
}): { snapshot: TranscriptScrollSnapshot; target: TranscriptScrollTarget } {
  const chatId = params.chatId ?? null;
  const visibleMessages = params.messages.filter((message) => (
    message.role === "user" || message.role === "assistant"
  ));
  const latest = visibleMessages.at(-1) ?? null;
  const snapshot: TranscriptScrollSnapshot = {
    chatId,
    lastMessageId: latest?.id ?? null,
    messageCount: visibleMessages.length,
  };

  if (!latest) {
    return { snapshot, target: { type: "none" } };
  }

  const changed =
    params.previous.chatId !== snapshot.chatId ||
    params.previous.lastMessageId !== snapshot.lastMessageId ||
    params.previous.messageCount !== snapshot.messageCount;

  if (!changed) {
    return { snapshot, target: { type: "none" } };
  }

  if (params.sending && latest.role === "assistant") {
    return { snapshot, target: { type: "message-start", messageId: latest.id } };
  }

  return { snapshot, target: { type: "bottom" } };
}
