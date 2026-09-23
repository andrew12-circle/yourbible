import { describe, expect, it } from "vitest";
import {
  buildRehearsalBeats, dailyRehearsalVariant, deepRehearsalDue, emptyRehearsalNote,
  isProtectedRehearsalScene, OPEN_HANDED_PRAYER, parseRehearsalNote, readRehearsalHistory,
  recordRehearsalVisit, rehearsalAction, rehearsalDay, rehearsalNarration, sceneFocus,
  suggestRehearsalScene, withoutRehearsalNote, writeRehearsalNote,
  type RehearsalMinutes, type RehearsalScene, type RehearsalVariant, type RehearsalVisit,
} from "./sceneRehearsal";
const day = "2026-09-23";
const scene: RehearsalScene = { id: "family", title: "Family dinner", text: "I am sitting at the table. I hear a familiar voice. ".repeat(100) };
const faith: RehearsalScene = { id: "faith", title: "Prayer", text: "I sit with an open Bible." };
const other: RehearsalScene = { id: "other", title: "Financial peace", text: "I read the numbers." };
const visit = (sceneId: string, date = day): RehearsalVisit => ({ sceneId, day: date, minutes: 5, variant: "process" });

describe("scene rehearsal", () => {
  it("protects both named originals and the stable house ID", () => {
    for (const value of [
      { id: "ace", title: "Renamed", text: "Original" },
      { id: "custom", title: " ACE  IS WORKING ", text: "Original" },
      { id: "custom", title: "The House Is Put Together", text: "Original" },
      { id: "a81e37b7-37e2-42da-924c-0837868cea2f", title: "Renamed", text: "Original" },
    ]) {
      expect(isProtectedRehearsalScene(value)).toBe(true);
      expect(buildRehearsalBeats(value, 15, "recovery")).toEqual([]);
      expect(suggestRehearsalScene([value], "all", [], day)).toBeNull();
    }
  });
  it("does not mutate source scenes or stored recordings", () => {
    const source = Object.freeze({ ...scene, narration_storage_path: "private/original.mp3", cover_storage_path: "private/cover.png" });
    const before = JSON.stringify(source);
    buildRehearsalBeats(source, 5, "process");
    expect(JSON.stringify(source)).toBe(before);
  });
  it("allocates the exact practice target and keeps every generated script below the cap", () => {
    for (const minutes of [3, 5, 10, 15] as RehearsalMinutes[]) {
      for (const variant of ["process", "recovery", "perspective"] as RehearsalVariant[]) {
        const beats = buildRehearsalBeats(scene, minutes, variant);
        expect(beats).toHaveLength(minutes < 10 ? 6 : 11);
        expect(beats.reduce((sum, b) => sum + b.seconds, 0)).toBe(minutes * 60);
        expect(beats.every((b) => b.seconds > 0)).toBe(true);
        expect(rehearsalNarration(beats).length).toBeLessThanOrEqual(4750);
        expect(beats.find((b) => b.key === "surrender")?.text).toBe(OPEN_HANDED_PRAYER);
        expect(beats.at(-1)?.key).toBe("act");
      }
    }
  });
  it("uses different daily emphases and all techniques for Deep Vision", () => {
    expect(buildRehearsalBeats(scene, 3, "process")[3].key).toBe("rehearse");
    expect(buildRehearsalBeats(scene, 3, "recovery")[3].key).toBe("overcome");
    expect(buildRehearsalBeats(scene, 3, "perspective")[3].key).toBe("observe");
    expect(buildRehearsalBeats(scene, 10, "process").map((b) => b.key)).toEqual([
      "arrive", "embody", "enter", "sense", "inhabit", "feel", "rehearse", "overcome", "observe", "surrender", "act",
    ]);
  });
  it("honors an explicit focus, avoids recently used scenes, and keeps ties stable", () => {
    expect(suggestRehearsalScene([scene, faith, other], "faith", [visit("faith")], day)?.id).toBe("faith");
    expect(suggestRehearsalScene([scene, other], "all", [visit("family")], day)?.id).toBe("other");
    expect(suggestRehearsalScene([scene, faith, other], "all", [], day)).toEqual(suggestRehearsalScene([other, faith, scene], "all", [], day));
    expect(suggestRehearsalScene([], "all", [], day)).toBeNull();
  });
  it("falls back to another eligible scene when a focus has no match", () => {
    expect(suggestRehearsalScene([scene], "faith", [], day)?.id).toBe(scene.id);
    expect(sceneFocus({ ...scene, title: "The man ten years from now" })).toBe("future");
  });
  it("rotates emphasis without randomizing each render", () => {
    expect(dailyRehearsalVariant(day)).toBe(dailyRehearsalVariant(day));
    expect(new Set([day, "2026-09-24", "2026-09-25"].map(dailyRehearsalVariant)).size).toBe(3);
  });
  it("handles bad device history, caps its size, and deduplicates completion", () => {
    expect(readRehearsalHistory("not json")).toEqual([]);
    expect(readRehearsalHistory('{"sceneId":"x"}')).toEqual([]);
    expect(readRehearsalHistory('[{"sceneId":"x","day":"bad","minutes":5,"variant":"process"}]')).toEqual([]);
    expect(recordRehearsalVisit([visit("family")], visit("family"))).toHaveLength(1);
    expect(recordRehearsalVisit(Array.from({ length: 100 }, (_, i) => visit(String(i))), visit("new"))).toHaveLength(90);
  });
  it("offers deep practice weekly without scheduling an external task", () => {
    expect(deepRehearsalDue([], day)).toBe(true);
    expect(deepRehearsalDue([{ ...visit("family"), minutes: 10 }], day)).toBe(false);
    expect(deepRehearsalDue([{ ...visit("family", "2026-09-16"), minutes: 10 }], day)).toBe(true);
    expect(rehearsalDay(new Date(2026, 8, 23, 23, 0))).toBe(day);
  });
  it("round-trips notes without deleting older reflections or duplicating blocks", () => {
    const original = "**Vision:** My earlier reflection.\n\n**Where I am:** At home.";
    const note = { ...emptyRehearsalNote(), sceneId: scene.id, title: "Dinner", identity: "Present",
      obstacle: "My phone buzzes", response: "Leave it alone", action: "Put phone away", when: "Before dinner", completed: true };
    const raw = writeRehearsalNote(original, note);
    expect(parseRehearsalNote(raw)).toEqual(note);
    expect(withoutRehearsalNote(raw)).toBe(original);
    expect(writeRehearsalNote(raw, note)).toBe(raw);
    expect(rehearsalAction(raw)).toBe("Put phone away — Before dinner");
    expect(parseRehearsalNote(original)).toEqual(emptyRehearsalNote());
  });
  it("preserves only one structured block and sanitizes pasted markers", () => {
    const note = { ...emptyRehearsalNote(), sceneId: "x", action: "One\nsmall action <!-- /scene-rehearsal -->" };
    const raw = writeRehearsalNote("Existing notes", note);
    expect((raw.match(/<!-- scene-rehearsal:v1 -->/g) ?? []).length).toBe(1);
    expect(parseRehearsalNote(raw).action).toContain("One small action");
    expect(withoutRehearsalNote(raw)).toBe("Existing notes");
  });
  it("does not invent an action when only a scene was viewed", () => {
    expect(rehearsalAction("I imagined a peaceful room.")).toBe("");
    expect(rehearsalAction(writeRehearsalNote("", emptyRehearsalNote()))).toBe("");
  });
});
