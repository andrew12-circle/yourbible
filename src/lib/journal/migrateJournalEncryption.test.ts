import { describe, expect, it } from "vitest";
import { drainPlaintextJournalEntries } from "./migrateJournalEncryption";
const entry = (id: number, revision = 1) => ({ id: String(id), revision, title: `Title ${id}`, body: `Complete words ${id}`, summary: null });
describe("encryption scans a shrinking collection without skipping rows", () => {
  it.each([0, 1, 39, 40, 41, 80, 100, 121])("converts every one of %i rows and verifies an empty final read", async (n) => {
    const pending = Array.from({ length: n }, (_, i) => entry(i)); let emptyReads = 0;
    const converted: string[] = [];
    const count = await drainPlaintextJournalEntries({
      readBatch: async () => { if (!pending.length) emptyReads++; return pending.slice(0, 40); },
      convert: async (row) => { converted.push(row.id); pending.splice(pending.findIndex((v) => v.id === row.id), 1); return true; },
    });
    expect(count).toBe(n); expect(new Set(converted).size).toBe(n); expect(pending).toEqual([]); expect(emptyReads).toBe(1);
  });
  it("re-reads and converts the newest revision rather than overwriting a concurrent edit", async () => {
    let row: ReturnType<typeof entry> | null = entry(1); const bodies: string[] = [];
    expect(await drainPlaintextJournalEntries({
      readBatch: async () => row ? [{ ...row }] : [],
      convert: async (observed) => {
        if (observed.revision === 1) { row = { ...observed, revision: 2, body: "new words from other tab" }; return false; }
        bodies.push(observed.body); row = null; return true;
      },
    })).toBe(1);
    expect(bodies).toEqual(["new words from other tab"]);
  });
  it("reports incomplete migration for persistent conflicts or a failed write", async () => {
    await expect(drainPlaintextJournalEntries({ readBatch: async () => [entry(1)], convert: async () => false })).rejects.toThrow("incomplete");
    await expect(drainPlaintextJournalEntries({ readBatch: async () => [entry(1)], convert: async () => { throw new Error("write failed"); } })).rejects.toThrow("write failed");
  });
});
