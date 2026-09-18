import { describe, expect, it } from "vitest";
import { applyJournalListSnapshot } from "./journalListUpdates";
import type { JournalEntryListRow } from "./entryListQuery";
import type { JournalSnapshot } from "./journalSaveQueue";
const row = { id: "entry", title: "Title", body: "Body", user_id: "owner", journal_id: "journal",
  entry_kind: null, pinned: false, e2e_encrypted: false, entry_at_ts: "2026-09-18T14:00:00+00:00" } as JournalEntryListRow;
const snap: JournalSnapshot = { id: "entry", userId: "owner", revision: 3, encrypted: false,
  values: { title: "New title", body: "New words", journal_id: "journal", entry_kind: null, pinned: false } };
const opts = { userId: "owner", journalId: "journal" };
describe("local journal list previews", () => {
  it("updates only the affected row and preserves untouched row identity", () => {
    const other = { ...row, id: "other" };
    const next = applyJournalListSnapshot([row, other], snap, opts, false);
    expect(next.reload).toBe(false);
    expect(next.rows[0].body).toBe("New words");
    expect(next.rows[1]).toBe(other);
  });
  it.each([ { journal_id: "other" }, { entry_kind: "vent" }, { pinned: true }, { entry_at_ts: "2026-08-01T00:00:00Z" } ])("re-queries membership/order changes: %j", (patch) => {
    expect(applyJournalListSnapshot([row], { ...snap, values: { ...snap.values, ...patch } }, opts, false).reload).toBe(true);
  });
  it("keeps search and updated sorting authoritative", () => {
    expect(applyJournalListSnapshot([row], snap, { ...opts, search: "Body" }, false).reload).toBe(true);
    expect(applyJournalListSnapshot([row], snap, { ...opts, sortUpdated: true }, false).reload).toBe(true);
  });
  it("never injects decrypted text into a locked or different-account list", () => {
    const rows = [{ ...row, contentLocked: true }];
    expect(applyJournalListSnapshot(rows, snap, opts, false).rows).toBe(rows);
    expect(applyJournalListSnapshot([row], { ...snap, encrypted: true }, opts, false).reload).toBe(true);
    expect(applyJournalListSnapshot([row], snap, { userId: "other" }, true).reload).toBe(false);
  });
  it("does not repaint a preview when only text beyond the snippet changes", () => {
    const rows = [{ ...row, title: "New title", body: "a".repeat(512) }];
    const next = applyJournalListSnapshot(rows, { ...snap, values: { ...snap.values, body: "a".repeat(512) + " more", entry_at_ts: "2026-09-18T14:00:00.000Z" } }, opts, false);
    expect(next.reload).toBe(false);
    expect(next.rows).toBe(rows);
  });
});
