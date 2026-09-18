import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { persistJournalDraft, listJournalDrafts, decodeJournalDraft, loadJournalDraft, recordJournalEntryDeletion,
  journalEntryWasDeleted, stageJournalEntryDeletion, cancelJournalDeletionIntent, encryptPlaintextJournalDrafts,
  preserveJournalAiEdit, loadJournalAiEdits } from "./journalDraftStorage";
const draft = (owner = "owner", id = "entry") => ({ version: 1 as const, base: { userId: owner, id, revision: 1, values: { title: "Original", body: "original words" }, encrypted: false }, pending: { body: "The complete pending words" }, updatedAt: "2026-09-18T10:00:00Z" });
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("crypto", webcrypto); useJournalVaultStore.setState({ dek: null, e2eEnabled: false, e2eRequiredJournalIds: new Set(), locking: false }); });
afterEach(() => vi.unstubAllGlobals());
const key = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
describe("durable text, encryption migration and deletion", () => {
  it("round-trips pending words and only exposes them to their owner", async () => {
    await persistJournalDraft("owner", "entry", draft());
    expect((await loadJournalDraft("owner", "entry"))?.pending.body).toBe("The complete pending words");
    expect(await listJournalDrafts("other")).toEqual([]);
  });
  it("encrypts pending text before storage and requires unlock for recovery", async () => {
    const dek = await key(); useJournalVaultStore.setState({ dek, e2eEnabled: true });
    await persistJournalDraft("owner", "entry", draft());
    const [envelope] = await listJournalDrafts("owner"); expect(envelope.encrypted).toBe(true); expect(envelope.content).not.toContain("pending words");
    useJournalVaultStore.setState({ dek: null }); await expect(decodeJournalDraft(envelope, "owner")).rejects.toThrow("Unlock");
    useJournalVaultStore.setState({ dek }); expect((await decodeJournalDraft(envelope, "owner")).pending).toEqual(draft().pending);
  });
  it("retains complete AI originals across reload, scoped independently by field", async () => {
    const text = "original words ".repeat(900);
    await preserveJournalAiEdit("owner", "entry", "body", text, "after");
    expect((await loadJournalAiEdits("owner", "entry", "body"))[0].before).toBe(text);
    expect(await loadJournalAiEdits("other", "entry", "body")).toEqual([]); expect(await loadJournalAiEdits("owner", "entry", "summary")).toEqual([]);
  });
  it("migration protects old draft and undo plaintext while preserving all text", async () => {
    await persistJournalDraft("owner", "entry", draft());
    await preserveJournalAiEdit("owner", "entry", "body", "Original before AI", "Corrected original");
    const dek = await key(); useJournalVaultStore.setState({ dek, e2eEnabled: true });
    await encryptPlaintextJournalDrafts("owner", dek);
    const [envelope] = await listJournalDrafts("owner"); expect(envelope.encrypted).toBe(true);
    expect((await loadJournalAiEdits("owner", "entry", "body"))[0].before).toBe("Original before AI");
    useJournalVaultStore.setState({ dek: null }); expect(await loadJournalAiEdits("owner", "entry", "body")).toEqual([]);
  });
  it("a failed deletion intent does not discard drafts; confirmation prevents resurrection", async () => {
    await persistJournalDraft("owner", "entry", draft());
    await stageJournalEntryDeletion("owner", "entry");
    expect(await listJournalDrafts("owner")).toHaveLength(1);
    await expect(persistJournalDraft("owner", "entry", draft())).rejects.toThrow("deleted");
    await cancelJournalDeletionIntent("owner", "entry"); expect(await journalEntryWasDeleted("owner", "entry")).toBe(false);
    await persistJournalDraft("owner", "entry", draft());
    await recordJournalEntryDeletion("owner", "entry");
    expect(await listJournalDrafts("owner")).toEqual([]); expect(await loadJournalDraft("owner", "entry")).toBeNull();
    await expect(persistJournalDraft("owner", "entry", draft())).rejects.toThrow();
  });
});
