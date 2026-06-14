import { describe, expect, it } from "vitest";
import {
  MORNING_CONVERSATION_BODY_TEMPLATE,
  MORNING_CONVERSATION_HEART_HEADING,
  MORNING_CONVERSATION_THANKSGIVING_HEADING,
  MORNING_CONVERSATION_WORSHIP_HEADING,
  buildThanksgivingSectionBody,
  extractJournalSection,
  extractWorshipNote,
  mergeHeartIntoConversationBody,
  mergeThanksgivingIntoConversationBody,
  mergeWorshipIntoConversationBody,
} from "@/lib/livingHope/morningConversationJournal";

describe("morningConversationJournal thanksgiving merge", () => {
  const lists = {
    now: ["Salvation", "Family", "Provision", "", ""],
    notYet: ["Income milestone", "Legacy", "", "", ""],
  };

  it("builds a thanksgiving section with both subsections", () => {
    const section = buildThanksgivingSectionBody(lists);
    expect(section).toContain(MORNING_CONVERSATION_THANKSGIVING_HEADING);
    expect(section).toContain("Thankful now");
    expect(section).toContain("1. Salvation");
    expect(section).toContain("1. Income milestone");
  });

  it("replaces thanksgiving in the full template without touching heart content", () => {
    const merged = mergeThanksgivingIntoConversationBody(MORNING_CONVERSATION_BODY_TEMPLATE, lists);
    expect(merged).toContain(MORNING_CONVERSATION_WORSHIP_HEADING);
    expect(merged).toContain("1. Salvation");
    expect(merged).toContain(MORNING_CONVERSATION_HEART_HEADING);
    expect(merged).toContain("Talk, type, dictate, sketch");
    expect(merged).toContain("God, what do you want me to know today?");
  });

  it("extracts worship notes without placeholder text", () => {
    const body = `${MORNING_CONVERSATION_WORSHIP_HEADING}

Father, You are sovereign and good.

${MORNING_CONVERSATION_THANKSGIVING_HEADING}`;
    expect(extractWorshipNote(body)).toBe("Father, You are sovereign and good.");
    expect(extractWorshipNote(MORNING_CONVERSATION_BODY_TEMPLATE)).toBeUndefined();
  });

  it("extractJournalSection stops at the next heading", () => {
    const text = extractJournalSection(
      MORNING_CONVERSATION_BODY_TEMPLATE,
      MORNING_CONVERSATION_WORSHIP_HEADING,
      [MORNING_CONVERSATION_THANKSGIVING_HEADING],
    );
    expect(text).toBeUndefined();
  });

  it("prepends thanksgiving to legacy bodies that start at heart", () => {
    const legacy = `${MORNING_CONVERSATION_HEART_HEADING}

Already journaling here.

## Listening

Heard: rest today.`;
    const merged = mergeThanksgivingIntoConversationBody(legacy, lists);
    expect(merged.indexOf(MORNING_CONVERSATION_THANKSGIVING_HEADING)).toBe(0);
    expect(merged).toContain("Already journaling here.");
    expect(merged).toContain("Heard: rest today.");
  });

  it("preserves worship content when thanksgiving syncs", () => {
    const body = `${MORNING_CONVERSATION_WORSHIP_HEADING}

You are holy.

${MORNING_CONVERSATION_THANKSGIVING_HEADING}

${MORNING_CONVERSATION_HEART_HEADING}

Heart note.`;
    const merged = mergeThanksgivingIntoConversationBody(body, lists);
    expect(merged).toContain("You are holy.");
    expect(merged).toContain("1. Salvation");
    expect(merged).toContain("Heart note.");
  });
});

describe("morningConversationJournal worship and heart merge", () => {
  it("merges worship notes without touching later sections", () => {
    const merged = mergeWorshipIntoConversationBody(
      MORNING_CONVERSATION_BODY_TEMPLATE,
      "Father, You are good.",
    );
    expect(merged).toContain("Father, You are good.");
    expect(merged).toContain(MORNING_CONVERSATION_THANKSGIVING_HEADING);
    expect(merged).toContain("Talk, type, dictate, sketch");
  });

  it("merges heart notes without touching listening prompts", () => {
    const merged = mergeHeartIntoConversationBody(
      MORNING_CONVERSATION_BODY_TEMPLATE,
      "I feel anxious about the week.",
    );
    expect(merged).toContain("I feel anxious about the week.");
    expect(merged).toContain("God, what do you want me to know today?");
  });
});
