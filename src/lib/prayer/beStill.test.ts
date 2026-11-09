import { describe, expect, it } from "vitest";
import { createBeStillSession, parseBeStillSession, serializeBeStillSession } from "./beStill";
import { isListeningBody } from "@/lib/journal/listeningEntry";

describe("Be Still journal format", () => {
  it("recovers exact typed content without exposing recovery markup in visible sections", () => {
    const session = { ...createBeStillSession("morning"), question: "What is wise?", picture: "A person\nA choice",
      reflection: "A thought -->\n## Thought\nI don't know yet. 🕊️", nextStep: "Ask for counsel.", reviewDate: "2026-11-12" };
    const body = serializeBeStillSession(session);
    expect(parseBeStillSession(body)).toEqual(session);
    expect(body).toContain("## My question\n\nWhat is wise?");
    expect(isListeningBody(body)).toBe(false);
  });

  it("saves a normal completed session when no answer was perceived", () => {
    const session = { ...createBeStillSession("prayer"), outcome: "nothing-clear" as const, completedAt: new Date().toISOString() };
    const body = serializeBeStillSession(session);
    expect(body).toContain("Nothing clear came to mind today.");
    expect(parseBeStillSession(body)?.id).toBe(session.id);
    expect(parseBeStillSession(body)?.outcome).toBe("nothing-clear");
  });

  it("rejects malformed, unrelated, and unsupported recovery state", () => {
    expect(parseBeStillSession("An ordinary journal entry")).toBeNull();
    expect(parseBeStillSession("<!-- be-still-session:v1:%E0%A4%A -->")).toBeNull();
    const session = createBeStillSession("prayer");
    expect(parseBeStillSession(serializeBeStillSession({ ...session, stage: "invalid" as never }))).toBeNull();
  });
});
