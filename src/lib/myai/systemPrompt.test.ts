import { describe, expect, it } from "vitest";
import {
  buildMyAiStreamSystemPrompt,
  buildMyAiSystemPrompt,
  buildMyAiWebResearchSystemPrompt,
} from "../../../supabase/functions/my-ai-chat/systemPrompt";

describe("my-ai system prompts", () => {
  it("asks substantive streaming replies to end with an In short recap", () => {
    expect(buildMyAiStreamSystemPrompt(true)).toContain("**In short:**");
  });

  it("asks non-streaming JSON replies to include an In short recap in reply markdown", () => {
    expect(buildMyAiSystemPrompt(true)).toContain("**In short:**");
  });

  it("keeps the recap instruction in web research mode", () => {
    expect(buildMyAiWebResearchSystemPrompt(true)).toContain("**In short:**");
  });
});
