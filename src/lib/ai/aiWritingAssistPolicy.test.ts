import { describe, expect, it } from "vitest";
import {
  isAiWritingAssistDefaultOn,
  shouldWarnBeforeEnablingAiWritingAssist,
} from "@/lib/ai/aiWritingAssistPolicy";

describe("aiWritingAssistPolicy", () => {
  it("defaults on for Andrew Heisley by display name", () => {
    expect(isAiWritingAssistDefaultOn({ email: "x@y.com", displayName: "Andrew Heisley" })).toBe(true);
    expect(shouldWarnBeforeEnablingAiWritingAssist({ displayName: "Andrew Heisley" })).toBe(false);
  });

  it("defaults on for founder email", () => {
    expect(isAiWritingAssistDefaultOn({ email: "andrew@beliefarchitecture.app" })).toBe(true);
  });

  it("defaults off for other users", () => {
    expect(isAiWritingAssistDefaultOn({ email: "friend@example.com", displayName: "Jane Doe" })).toBe(false);
    expect(shouldWarnBeforeEnablingAiWritingAssist({ email: "friend@example.com" })).toBe(true);
  });
});
