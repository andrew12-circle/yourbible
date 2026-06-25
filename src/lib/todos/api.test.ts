import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  customLists,
  defaultFolderLists,
  effectiveEndDate,
  filterItemsForView,
  isOverdue,
  isPinnedToday,
  partitionBacklogByList,
  partitionTodayItems,
  remainingDays,
  sortItemsForView,
  type TodoItemRow,
  type TodoListRow,
} from "./api";

const today = "2026-06-25";

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
  {
    id: "work-id",
    user_id: "u",
    name: "Work",
    slug: "work",
    color: null,
    kind: "work",
    sort_order: 1,
    archived_at: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "home-id",
    user_id: "u",
    name: "Home & Projects",
    slug: "home",
    color: null,
    kind: null,
    sort_order: 3,
    archived_at: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "custom-id",
    user_id: "u",
    name: "Errands",
    slug: null,
    color: null,
    kind: null,
    sort_order: 4,
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

  it("includes completed tasks in today view when they match", () => {
    const items = [
      baseItem({ id: "open", end_date: "2026-06-25" }),
      baseItem({
        id: "done",
        end_date: "2026-06-25",
        done: true,
        status: "done",
        completed_at: "2026-06-25T18:00:00.000Z",
      }),
      baseItem({ id: "other", end_date: "2026-06-30", done: true, status: "done" }),
    ];
    const today = filterItemsForView(items, "today", lists, "2026-06-25");
    expect(today.map((i) => i.id).sort()).toEqual(["done", "open"]);
  });

  it("sorts pinned-for-today open tasks before unpinned", () => {
    const items = [
      baseItem({ id: "unpinned-a", sort_order: 0 }),
      baseItem({ id: "pinned", sort_order: 5, pinned_for_date: "2026-06-25" }),
      baseItem({ id: "unpinned-b", sort_order: 1 }),
    ];
    expect(sortItemsForView(items, "2026-06-25").map((i) => i.id)).toEqual([
      "pinned",
      "unpinned-a",
      "unpinned-b",
    ]);
  });

  it("sorts open first then completed by completed_at desc", () => {
    const items = [
      baseItem({ id: "open-b", sort_order: 1 }),
      baseItem({
        id: "done-old",
        done: true,
        status: "done",
        completed_at: "2026-06-24T10:00:00.000Z",
      }),
      baseItem({ id: "open-a", sort_order: 0 }),
      baseItem({
        id: "done-new",
        done: true,
        status: "done",
        completed_at: "2026-06-25T12:00:00.000Z",
      }),
    ];
    expect(sortItemsForView(items).map((i) => i.id)).toEqual([
      "open-a",
      "open-b",
      "done-new",
      "done-old",
    ]);
  });

  it("openOnly excludes completed from sidebar counts", () => {
    const items = [
      baseItem({ id: "open", end_date: "2026-06-25" }),
      baseItem({ id: "done", end_date: "2026-06-25", done: true, status: "done" }),
    ];
    expect(filterItemsForView(items, "today", lists, "2026-06-25", null, true).length).toBe(1);
    expect(filterItemsForView(items, "today", lists, "2026-06-25").length).toBe(2);
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

  it("excludes undated backlog from today view", () => {
    const items = [
      baseItem({ id: "undated", list_id: "home-id" }),
      baseItem({ id: "due", end_date: today }),
      baseItem({ id: "overdue", end_date: "2026-06-24" }),
    ];
    const result = filterItemsForView(items, "today", lists, today, null, true);
    expect(result.map((i) => i.id).sort()).toEqual(["due", "overdue"]);
  });

  it("limits upcoming to the next 7 days", () => {
    const horizon = addDaysISO(today, 7);
    const items = [
      baseItem({ id: "soon", end_date: addDaysISO(today, 3) }),
      baseItem({ id: "edge", end_date: horizon }),
      baseItem({ id: "later", end_date: addDaysISO(today, 8) }),
      baseItem({ id: "undated" }),
    ];
    const upcoming = filterItemsForView(items, "upcoming", lists, today, null, true);
    expect(upcoming.map((i) => i.id).sort()).toEqual(["edge", "soon"]);
  });

  it("puts undated and far-future tasks in backlog", () => {
    const items = [
      baseItem({ id: "palace", title: "Build play palace", list_id: "home-id" }),
      baseItem({ id: "garage", title: "Clean garage", list_id: "home-id", end_date: addDaysISO(today, 30) }),
      baseItem({ id: "tomorrow", end_date: addDaysISO(today, 1) }),
    ];
    const backlog = filterItemsForView(items, "backlog", lists, today, null, true);
    expect(backlog.map((i) => i.id).sort()).toEqual(["garage", "palace"]);
  });

  it("partitions today into overdue, due today, and pinned", () => {
    const items = filterItemsForView(
      [
        baseItem({ id: "late", end_date: "2026-06-20", sort_order: 0 }),
        baseItem({ id: "now", end_date: today, sort_order: 1 }),
        baseItem({ id: "pin", pinned_for_date: today, sort_order: 2 }),
        baseItem({ id: "pin-undated", pinned_for_date: today, sort_order: 3 }),
      ],
      "today",
      lists,
      today,
    );
    const parts = partitionTodayItems(items, today);
    expect(parts.overdue.map((i) => i.id)).toEqual(["late"]);
    expect(parts.today.map((i) => i.id)).toEqual(["now"]);
    expect(parts.pinned.map((i) => i.id).sort()).toEqual(["pin", "pin-undated"]);
  });

  it("groups backlog items by list", () => {
    const items = filterItemsForView(
      [
        baseItem({ id: "a", list_id: "home-id", sort_order: 0 }),
        baseItem({ id: "b", list_id: "work-id", sort_order: 0 }),
      ],
      "backlog",
      lists,
      today,
      null,
      true,
    );
    const sections = partitionBacklogByList(items, lists);
    expect(sections.map((s) => s.list?.slug)).toEqual(["work", "home"]);
  });

  it("sorts backlog open tasks by priority then sort_order", () => {
    const items = [
      baseItem({ id: "none", priority: 0, sort_order: 0 }),
      baseItem({ id: "low", priority: 3, sort_order: 0 }),
      baseItem({ id: "med", priority: 2, sort_order: 0 }),
      baseItem({ id: "high-b", priority: 1, sort_order: 5 }),
      baseItem({ id: "high-a", priority: 1, sort_order: 1 }),
    ];
    expect(sortItemsForView(items, today, "backlog").map((i) => i.id)).toEqual([
      "high-a",
      "high-b",
      "med",
      "low",
      "none",
    ]);
  });

  it("sorts backlog with completed at bottom by completed_at", () => {
    const items = [
      baseItem({ id: "low", priority: 3 }),
      baseItem({
        id: "done-old",
        priority: 1,
        done: true,
        status: "done",
        completed_at: "2026-06-24T10:00:00.000Z",
      }),
      baseItem({ id: "high", priority: 1 }),
      baseItem({
        id: "done-new",
        priority: 1,
        done: true,
        status: "done",
        completed_at: "2026-06-25T12:00:00.000Z",
      }),
    ];
    expect(sortItemsForView(items, today, "backlog").map((i) => i.id)).toEqual([
      "high",
      "low",
      "done-new",
      "done-old",
    ]);
  });

  it("sorts backlog groups by priority within each list", () => {
    const items = [
      baseItem({ id: "home-low", list_id: "home-id", priority: 3, sort_order: 0 }),
      baseItem({ id: "home-high", list_id: "home-id", priority: 1, sort_order: 1 }),
      baseItem({ id: "work-med", list_id: "work-id", priority: 2, sort_order: 0 }),
      baseItem({ id: "work-high", list_id: "work-id", priority: 1, sort_order: 1 }),
    ];
    const sections = partitionBacklogByList(items, lists);
    const home = sections.find((s) => s.list?.slug === "home")!;
    const work = sections.find((s) => s.list?.slug === "work")!;
    expect(home.items.map((i) => i.id)).toEqual(["home-high", "home-low"]);
    expect(work.items.map((i) => i.id)).toEqual(["work-high", "work-med"]);
  });

  it("splits default folders from custom lists", () => {
    expect(defaultFolderLists(lists).map((l) => l.slug)).toEqual(["work", "home"]);
    expect(customLists(lists).map((l) => l.name)).toEqual(["Errands"]);
  });

  it("detects overdue carryover", () => {
    expect(isOverdue({ end_date: "2026-06-24", due_date: null, done: false }, today)).toBe(true);
    expect(isOverdue({ end_date: today, due_date: null, done: false }, today)).toBe(false);
  });
});
