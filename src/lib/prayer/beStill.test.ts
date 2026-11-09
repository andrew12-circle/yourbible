import { describe, expect, it } from "vitest";
import { createBeStillSession, isOneSentenceQuestion, parseBeStillSession, readyForStillness, serializeBeStillSession, withBeStillVerification } from "./beStill";
import { isListeningBody } from "@/lib/journal/listeningEntry";

describe("On Receiving journal format", () => {
  it("keeps a complete prepared session private in the journal body and recoverable", () => {
    const session = {
      ...createBeStillSession("morning"), place: "Prayer chair", hour: "06:30",
      handsEmpty: true, interruptionsCleared: true, dayPutAway: true,
      question: "What is wise?", pictureKind: "person" as const, picture: "A person\nA choice",
      thoughtOrigin: "arrived" as const, qualities: { whole: true, calm: true, notFlattering: true, challengedWishes: false, asksSomething: true },
      reflection: "A thought -->\n## Thought\nI don't know yet. 🕊️", nextStep: "Ask for counsel.", reviewDate: "2026-11-12",
    };
    const body = serializeBeStillSession(session);
    expect(parseBeStillSession(body)).toEqual(session);
    expect(body).toContain("## My one question\n\nWhat is wise?");
    expect(body).toContain("Arrived whole");
    expect(isListeningBody(body)).toBe(false);
    expect(readyForStillness(session)).toBe(true);
  });

  it("requires a single written sentence and completion of all preparation checks", () => {
    const session = createBeStillSession("prayer");
    expect(readyForStillness(session)).toBe(false);
    expect(isOneSentenceQuestion("What matters today?")).toBe(true);
    expect(isOneSentenceQuestion("Two things. Which one?")).toBe(false);
    expect(isOneSentenceQuestion("One\nTwo")).toBe(false);
    const prepared = { ...session, question: "What matters today?", place: "Same chair", hour: "07:00",
      handsEmpty: true, interruptionsCleared: true, dayPutAway: true };
    expect(readyForStillness(prepared)).toBe(true);
    expect(readyForStillness({ ...prepared, interruptionsCleared: false })).toBe(false);
  });

  it("supports nothing clear today and a legacy draft without new fields", () => {
    const session = { ...createBeStillSession("prayer"), outcome: "nothing-clear" as const, completedAt: new Date().toISOString() };
    expect(serializeBeStillSession(session)).toContain("Nothing clear came to mind today.");
    const legacy = { version: 1, id: session.id, entryPoint: "prayer", startedAt: session.startedAt,
      completedAt: null, stage: "stillness", question: "", picture: "", reflection: "", scripture: "", nextStep: "",
      reviewDate: "", outcome: "open" };
    const oldBody = "<!-- be-still-session:v1:" + encodeURIComponent(JSON.stringify(legacy)) + " -->";
    expect(parseBeStillSession(oldBody)).toMatchObject({ place: "", stage: "stillness", verification: "pending", thoughtOrigin: "uncertain" });
  });

  it("marks an observation later, retains unrelated journal notes, and never duplicates the review block", () => {
    const session = { ...createBeStillSession("prayer"), completedAt: "2026-11-09T15:00:00.000Z" };
    const body = serializeBeStillSession(session) + "\n## My later thoughts\n\nThis must stay intact.";
    const first = withBeStillVerification(body, "confirmed", "It happened as observed.", "2026-11-16T12:00:00.000Z");
    const revised = withBeStillVerification(first, "inconclusive", "Need more time.", "2026-11-17T12:00:00.000Z");
    expect(revised).toContain("## My later thoughts\n\nThis must stay intact.");
    expect(revised.match(/<!-- be-still-ledger:start -->/g)).toHaveLength(1);
    expect(parseBeStillSession(revised)?.verification).toBe("inconclusive");
    expect(parseBeStillSession(revised)?.verificationNotes).toBe("Need more time.");
    expect(() => withBeStillVerification("Unrelated journal", "confirmed", "", "2026-11-16T12:00:00Z")).toThrow();
  });

  it("rejects malformed and unsupported recovery state", () => {
    expect(parseBeStillSession("An ordinary journal entry")).toBeNull();
    expect(parseBeStillSession("<!-- be-still-session:v1:%E0%A4%A -->")).toBeNull();
    const session = createBeStillSession("prayer");
    expect(parseBeStillSession(serializeBeStillSession({ ...session, stage: "invalid" as never }))).toBeNull();
  });
});
