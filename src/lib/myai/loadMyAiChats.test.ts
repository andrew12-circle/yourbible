import { describe, expect, it, vi } from "vitest";
import { buildChatSidebarSections, type MyAiChatListItem } from "@/lib/myai/chatSections";

function chat(partial: Partial<MyAiChatListItem> & Pick<MyAiChatListItem, "id">): MyAiChatListItem {
  return {
    title: null,
    updated_at: "2026-06-12T12:00:00.000Z",
    project_id: null,
    journal_entry_id: null,
    ...partial,
  };
}

describe("buildChatSidebarSections orphaned folders", () => {
  it("shows chats with unknown project_id in time sections", () => {
    const chats = [
      chat({ id: "orphan", title: "Lost chat", project_id: "deleted-folder", updated_at: "2026-06-12T10:00:00.000Z" }),
    ];
    const sections = buildChatSidebarSections(chats, [], { now: new Date("2026-06-12T15:00:00.000Z") });
    expect(sections.some((s) => s.chats.some((c) => c.id === "orphan"))).toBe(true);
  });
});

describe("loadMyAiChatsForSidebar", () => {
  it("falls back when project_id column is missing", async () => {
    const { loadMyAiChatsForSidebar } = await import("@/lib/myai/loadMyAiChats");

    const chain = (result: { data: unknown; error: { message: string } | null }) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(result),
        }),
      }),
    });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== "my_ai_chats") throw new Error("unexpected table");
        if (supabase.from.mock.calls.length === 1) {
          return chain({ data: null, error: { message: 'column "project_id" does not exist' } });
        }
        return chain({
          data: [{ id: "c1", title: "Hello", updated_at: "2026-06-12T10:00:00.000Z", journal_entry_id: null }],
          error: null,
        });
      }),
    };

    const { rows, error } = await loadMyAiChatsForSidebar(supabase as never, "user-1");
    expect(error).toBeNull();
    expect(rows).toEqual([
      {
        id: "c1",
        title: "Hello",
        updated_at: "2026-06-12T10:00:00.000Z",
        journal_entry_id: null,
        project_id: null,
      },
    ]);
  });
});
