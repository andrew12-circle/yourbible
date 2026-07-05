import { describe, expect, it } from "vitest";
import {
  EMPTY_TRANSCRIPT_SCROLL_SNAPSHOT,
  nextMyAiTranscriptScroll,
  type TranscriptScrollSnapshot,
} from "./transcriptScroll";

const previous: TranscriptScrollSnapshot = {
  chatId: "chat-1",
  lastMessageId: "assistant-1",
  messageCount: 2,
};

describe("nextMyAiTranscriptScroll", () => {
  it("scrolls to the start of a new assistant turn while streaming", () => {
    const result = nextMyAiTranscriptScroll({
      previous: EMPTY_TRANSCRIPT_SCROLL_SNAPSHOT,
      chatId: "chat-1",
      sending: true,
      messages: [
        { id: "user-1", role: "user" },
        { id: "assistant-1", role: "assistant" },
      ],
    });

    expect(result.target).toEqual({ type: "message-start", messageId: "assistant-1" });
  });

  it("does not scroll when only streamed content changes", () => {
    const result = nextMyAiTranscriptScroll({
      previous,
      chatId: "chat-1",
      sending: true,
      messages: [
        { id: "user-1", role: "user" },
        { id: "assistant-1", role: "assistant" },
      ],
    });

    expect(result.target).toEqual({ type: "none" });
  });

  it("scrolls to the bottom when opening an existing completed chat", () => {
    const result = nextMyAiTranscriptScroll({
      previous: EMPTY_TRANSCRIPT_SCROLL_SNAPSHOT,
      chatId: "chat-1",
      sending: false,
      messages: [
        { id: "user-1", role: "user" },
        { id: "assistant-1", role: "assistant" },
      ],
    });

    expect(result.target).toEqual({ type: "bottom" });
  });
});
