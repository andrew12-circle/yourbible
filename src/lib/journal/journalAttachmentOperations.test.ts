import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { File } from "node:buffer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { JournalSafetyDb } from "@/test/journalSafetyDb";
import { stageJournalPhoto, retryJournalAttachmentOperation, listJournalAttachmentOperations,
  removeJournalAttachment, prepareJournalEntryCleanup } from "./journalAttachmentOperations";
import { attachJournalPhotos } from "./attachJournalPhotos";
const h = vi.hoisted(() => ({ db: null as unknown as import("@/test/journalSafetyDb").JournalSafetyDb, upload: vi.fn(), remove: vi.fn() }));
vi.mock("./photos", () => ({ getSignedPhotoUrls: async (paths: string[]) => Object.fromEntries(paths.map((path) => [path, "signed:" + path])) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => h.db.from(table),
  auth: { getSession: async () => ({ data: { session: { user: { id: h.db.userId } } }, error: null }) },
  storage: { from: () => ({ upload: h.upload, remove: h.remove }) },
} }));
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("crypto", webcrypto); h.db = new JournalSafetyDb();
  h.upload.mockReset().mockResolvedValue({ error: null }); h.remove.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => vi.unstubAllGlobals());
const file = (text = "photo") => new File([text], "image.png", { type: "image/png" }) as unknown as globalThis.File;
describe("recoverable journal attachment operations", () => {
  it("persists bytes before upload and retries a failed metadata insert with the same identities", async () => {
    const op = await stageJournalPhoto("owner", "entry", file());
    expect((await listJournalAttachmentOperations("owner"))[0].file?.size).toBe(5);
    h.db.fail = (request) => request.action === "upsert" ? new Error("database unavailable") : null;
    await expect(retryJournalAttachmentOperation(op)).rejects.toThrow("database unavailable");
    expect((await listJournalAttachmentOperations("owner"))[0].error).toContain("database unavailable");
    h.db.fail = null; const row = await retryJournalAttachmentOperation(op);
    expect(row?.id).toBe(op.attachmentId); expect(h.db.rows.get("journal_photos")).toHaveLength(1);
    expect(h.upload.mock.calls.map((call) => call[0])).toEqual([op.path, op.path]);
    expect(await listJournalAttachmentOperations("owner")).toEqual([]);
  });
  it("recovers an insert that succeeded before its response was lost without another upload", async () => {
    const op = await stageJournalPhoto("owner", "entry", file());
    h.db.after = (request) => request.action === "upsert" ? new Error("response timed out") : null;
    await expect(retryJournalAttachmentOperation(op)).rejects.toThrow("timed out");
    h.db.after = null; expect((await retryJournalAttachmentOperation(op))?.id).toBe(op.attachmentId);
    expect(h.upload).toHaveBeenCalledTimes(1); expect(h.db.rows.get("journal_photos")).toHaveLength(1);
  });
  it("keeps an attachment and never removes its file when database removal fails", async () => {
    h.db.rows.set("journal_photos", [{ id: "photo", user_id: "owner", entry_id: "entry", storage_path: "authoritative-path" }]);
    h.db.fail = (request) => request.action === "delete" ? new Error("delete denied") : null;
    await expect(removeJournalAttachment("owner", "entry", "photo", "journal_photos")).rejects.toThrow("delete denied");
    expect(h.db.rows.get("journal_photos")).toHaveLength(1); expect(h.remove).not.toHaveBeenCalled();
  });
  it("retains failed storage cleanup after a confirmed metadata removal", async () => {
    h.db.rows.set("journal_photos", [{ id: "photo", user_id: "owner", entry_id: "entry", storage_path: "owner/entry/file.png" }]);
    h.remove.mockResolvedValue({ error: new Error("storage unavailable") });
    await removeJournalAttachment("owner", "entry", "photo", "journal_photos");
    expect(h.db.rows.get("journal_photos")).toEqual([]);
    const [op] = await listJournalAttachmentOperations("owner"); expect(op.phase).toBe("storage"); expect(op.error).toContain("storage unavailable");
    const deletes = h.db.calls.filter((call) => call.action === "delete").length;
    h.remove.mockResolvedValue({ error: null }); await retryJournalAttachmentOperation(op);
    expect(h.db.calls.filter((call) => call.action === "delete")).toHaveLength(deletes);
    expect(await listJournalAttachmentOperations("owner")).toEqual([]);
  });
  it("does not clean entry files before the entry is confirmed absent", async () => {
    h.db.rows.set("journal_entries", [{ id: "entry", user_id: "owner" }]);
    h.db.rows.set("journal_photos", [{ id: "photo", user_id: "owner", entry_id: "entry", storage_path: "path" }]);
    const [op] = await prepareJournalEntryCleanup("owner", "entry");
    await expect(retryJournalAttachmentOperation(op)).rejects.toThrow("not confirmed"); expect(h.remove).not.toHaveBeenCalled();
    h.db.rows.set("journal_entries", []); await retryJournalAttachmentOperation(op); expect(h.remove).toHaveBeenCalledWith(["path"]);
  });
  it("enforces owner isolation on retry and removal", async () => {
    const op = await stageJournalPhoto("owner", "entry", file()); h.db.userId = "other";
    await expect(retryJournalAttachmentOperation(op)).rejects.toThrow("account"); expect(h.upload).not.toHaveBeenCalled();
    expect(await listJournalAttachmentOperations("other")).toEqual([]);
  });
  it("retries a partial batch without duplicating successful photos", async () => {
    const files = [file("a"), file("b")]; let inserts = 0;
    h.db.fail = (request) => request.action === "upsert" && ++inserts === 2 ? new Error("second failed") : null;
    await expect(attachJournalPhotos("owner", "entry", files)).rejects.toThrow("second failed");
    h.db.fail = null; const rows = await attachJournalPhotos("owner", "entry", files);
    expect(rows).toHaveLength(2); expect(h.db.rows.get("journal_photos")).toHaveLength(2); expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });
});
