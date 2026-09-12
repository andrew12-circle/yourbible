import { describe, expect, it, vi } from "vitest";
import { appendJournalBlock, type JournalBlockRow } from "../../../supabase/functions/_shared/journalAtomicBlock";
const base: JournalBlockRow = { id: "entry", user_id: "owner", revision: 1, body: "Initial writing", title: null, summary: null, e2e_encrypted: false };
const options = { entryId: "entry", userId: "owner", marker: "<!-- sketch-tx:abc -->", block: "Transcribed handwriting" };
describe("atomic sketch transcript insertion", () => {
  it("preserves typing that wins a concurrent write", async () => {
    let current = { ...base };
    const compareAndSwap = vi.fn(async (row: JournalBlockRow, body: string) => {
      if (row.revision === 1) { current = { ...current, body: "Initial writing plus new typing", revision: 2 }; return null; }
      return current = { ...current, body, revision: 3 };
    });
    const result = await appendJournalBlock({ ...options, read: async () => current, compareAndSwap });
    expect(result.body).toContain("plus new typing");
    expect(result.body).toContain(options.block);
    expect(compareAndSwap).toHaveBeenCalledTimes(2);
  });
  it("does not append the same sketch twice after retry", async () => {
    const compareAndSwap = vi.fn();
    const row = { ...base, body: base.body + options.marker + options.block };
    expect(await appendJournalBlock({ ...options, read: async () => row, compareAndSwap })).toEqual(row);
    expect(compareAndSwap).not.toHaveBeenCalled();
  });
  it("stops when encryption was enabled while AI was running", async () => {
    const compareAndSwap = vi.fn();
    await expect(appendJournalBlock({ ...options, read: async () => ({ ...base, e2e_encrypted: true }), compareAndSwap })).rejects.toThrow("Encrypted");
    expect(compareAndSwap).not.toHaveBeenCalled();
  });
  it("rejects another account's entry", async () => {
    await expect(appendJournalBlock({ ...options, read: async () => ({ ...base, user_id: "someone-else" }), compareAndSwap: vi.fn() })).rejects.toThrow("not found");
  });
  it("bounds contention rather than blindly overwriting", async () => {
    const compareAndSwap = vi.fn(async () => null);
    await expect(appendJournalBlock({ ...options, read: async () => base, compareAndSwap })).rejects.toThrow("still changing");
    expect(compareAndSwap).toHaveBeenCalledTimes(4);
  });
});
