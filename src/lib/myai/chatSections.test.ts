import { describe, expect, it } from "vitest";
import {
  buildChatSidebarSections,
  detectSmartCategory,
  timeBucketForChat,
  type MyAiChatListItem,
} from "@/lib/myai/chatSections";

function chat(partial: Partial<MyAiChatListItem> & Pick<MyAiChatListItem, "id">): MyAiChatListItem {
  return {
    title: null,
    updated_at: "2026-06-12T12:00:00.000Z",
    project_id: null,
    journal_entry_id: null,
    ...partial,
  };
}

describe("detectSmartCategory", () => {
  it("detects hard questions and claim research from titles", () => {
    expect(detectSmartCategory(chat({ id: "1", title: "Hard question — Why pain?" }))).toBe("hard-question");
    expect(detectSmartCategory(chat({ id: "2", title: "Claim research: Prayer" }))).toBe("claim-research");
  });

  it("detects journal chats from linked entries", () => {
    expect(detectSmartCategory(chat({ id: "3", journal_entry_id: "je-1" }))).toBe("journal");
  });
});

describe("timeBucketForChat", () => {
  const now = new Date("2026-06-12T15:00:00.000Z");

  it("groups by local day boundaries", () => {
    expect(timeBucketForChat("2026-06-12T08:00:00.000Z", now)).toBe("today");
    expect(timeBucketForChat("2026-06-11T20:00:00.000Z", now)).toBe("yesterday");
    expect(timeBucketForChat("2026-06-08T12:00:00.000Z", now)).toBe("week");
    expect(timeBucketForChat("2026-05-15T12:00:00.000Z", now)).toBe("month");
    expect(timeBucketForChat("2026-01-01T12:00:00.000Z", now)).toBe("older");
  });
});

describe("buildChatSidebarSections", () => {
  it("puts project chats in folders and unfiled chats in time sections", () => {
    const chats: MyAiChatListItem[] = [
      chat({ id: "a", title: "Prayer chat", project_id: "p1", updated_at: "2026-06-12T10:00:00.000Z" }),
      chat({ id: "b", title: "Hard question — Evil", updated_at: "2026-06-12T09:00:00.000Z" }),
      chat({ id: "c", title: "General chat", updated_at: "2026-06-11T09:00:00.000Z" }),
    ];
    const projects = [{ id: "p1", name: "Faith", sort_order: 0 }];
    const now = new Date("2026-06-12T15:00:00.000Z");

    const sections = buildChatSidebarSections(chats, projects, { now });
    expect(sections.map((s) => s.label)).toEqual(["Faith", "Today", "Yesterday"]);
    expect(sections[0]?.chats.map((c) => c.id)).toEqual(["a"]);
    expect(sections[1]?.chats.map((c) => c.id)).toEqual(["b"]);
    expect(sections[2]?.chats.map((c) => c.id)).toEqual(["c"]);
  });

  it("includes empty project folders", () => {
    const chats: MyAiChatListItem[] = [
      chat({ id: "a", title: "General chat", updated_at: "2026-06-12T10:00:00.000Z" }),
    ];
    const projects = [{ id: "p1", name: "Faith", sort_order: 0 }];
    const sections = buildChatSidebarSections(chats, projects, { now: new Date("2026-06-12T15:00:00.000Z") });
    expect(sections.find((s) => s.kind === "project")?.label).toBe("Faith");
    expect(sections.find((s) => s.kind === "project")?.chats).toEqual([]);
  });

  it("shows chats with stale project_id when folder row is missing", () => {
    const chats = [
      chat({ id: "x", title: "Still here", project_id: "gone-folder", updated_at: "2026-06-12T10:00:00.000Z" }),
    ];
    const sections = buildChatSidebarSections(chats, [], { now: new Date("2026-06-12T15:00:00.000Z") });
    expect(sections.flatMap((s) => s.chats).map((c) => c.id)).toEqual(["x"]);
  });
});
