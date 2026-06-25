import { describe, expect, it } from "vitest";
import {
  effectiveEndDate,
  filterItemsForView,
  isPinnedToday,
  remainingDays,
  type TodoItemRow,
  type TodoListRow,
} from "./api";

const baseItem = (overrides: Partial<TodoItemRow>): TodoItemRow => ({
  id: "1",
  user_id: "u",
  list_id: null,
  parent_id: null,
  title: "Task",
  done: false,
  due_date: null,
  task_type: "work",
  start_date: null,
  end_date: null,
  status: "not_started",
  pinned_for_date: null,
  priority: 0,
  sort_order: 0,
  notes: null,
  completed_at: null,
  created_at: "",
  updated_at: "",
  ...overrides,
});

const lists: TodoListRow[] = [
  {
    id: "inbox-id",
    user_id: "u",
    name: "Inbox",
    slug: "inbox",
    color: null,
    kind: null,
    sort_order: 0,
    archived_at: null,
    created_at: "",
    updated_at: "",
  },
];

describe("todos api helpers", () => {
  it("computes remaining days and past due", () => {
    expect(remainingDays("2026-06-25", "2026-06-25")).toBe(0);
    expect(remainingDays("2026-06-24", "2026-06-25")).toBe(-1);
    expect(remainingDays("2026-06-26", "2026-06-25")).toBe(1);
  });

  it("uses end_date over due_date", () => {
    expect(effectiveEndDate({ end_date: "2026-06-20", due_date: "2026-06-10" })).toBe("2026-06-20");
  });

  it("includes pinned tasks in today view", () => {
    const items = [
      baseItem({ id: "a", end_date: "2026-06-30" }),
      baseItem({ id: "b", pinned_for_date: "2026-06-25" }),
    ];
    const today = filterItemsForView(items, "today", lists, "2026-06-25");
    expect(today.map((i) => i.id)).toEqual(["b"]);
  });

  it("filters by task type", () => {
    const items = [
      baseItem({ id: "a", task_type: "work" }),
      baseItem({ id: "b", task_type: "health" }),
    ];
    const filtered = filterItemsForView(items, "all", lists, "2026-06-25", "health");
    expect(filtered.map((i) => i.id)).toEqual(["b"]);
  });

  it("detects today pin", () => {
    expect(isPinnedToday({ pinned_for_date: "2026-06-25" }, "2026-06-25")).toBe(true);
    expect(isPinnedToday({ pinned_for_date: "2026-06-24" }, "2026-06-25")).toBe(false);
  });
});
