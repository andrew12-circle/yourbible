import { beforeEach, describe, expect, it, vi } from "vitest";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { canUseJournalCloudAi, requireJournalCloudAi, requireJournalVideoCloudAi } from "./journalAiAccess";
const h = vi.hoisted(() => ({ user: "owner", profile: false, required: false, error: null as Error | null,
  entry: { id: "entry", user_id: "owner", journal_id: "journal", entry_kind: null as string | null, e2e_encrypted: false },
  local: null as Record<string, unknown> | null, reads: [] as string[], videoOwner: "owner" }));
vi.mock("./journalDocuments", () => ({ peekJournalDocument: () => h.local ? { current: () => ({ values: h.local }) } : undefined, journalSnapshotRow: (snapshot: { values: unknown }) => snapshot.values }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: h.user } } }, error: null }) },
  from: (table: string) => { h.reads.push(table); const query = { select: () => query, eq: () => query,
    maybeSingle: async () => ({ data: table === "profiles" ? { journal_e2e_enabled: h.profile }
      : table === "journals" ? { e2e_required: h.required } : table === "journal_videos" ? { user_id: h.videoOwner, entry_id: "entry" } : h.entry, error: h.error }) }; return query; },
} }));
beforeEach(() => { useJournalVaultStore.setState({ locking: false, e2eEnabled: false, e2eRequiredJournalIds: new Set(), lockEpoch: 0 });
  h.user = "owner"; h.profile = false; h.required = false; h.error = null; h.entry.e2e_encrypted = false; h.entry.entry_kind = null; h.local = null; h.reads = []; h.videoOwner = "owner"; });
describe("one fail-closed policy for journal AI", () => {
  it("permits authenticated plain entries only after authoritative metadata checks", async () => { expect(await canUseJournalCloudAi("entry", "owner")).toBe(true); expect(h.reads).toEqual(["profiles", "journal_entries", "journals"]); });
  it("blocks unlocked ciphertext and private vents", async () => {
    h.entry.e2e_encrypted = true; expect(await canUseJournalCloudAi("entry")).toBe(false);
    h.entry.e2e_encrypted = false; h.entry.entry_kind = "vent"; await expect(requireJournalCloudAi("entry")).rejects.toThrow("Cloud AI is disabled");
  });
  it("blocks global and notebook privacy even when frontend caches are not loaded", async () => {
    h.profile = true; expect(await canUseJournalCloudAi("entry")).toBe(false);
    h.profile = false; h.required = true; expect(await canUseJournalCloudAi("entry")).toBe(false);
  });
  it("blocks a pending local move to a private kind before its save", async () => { h.local = { entry_kind: "vent" }; expect(await canUseJournalCloudAi("entry")).toBe(false); expect(h.reads).toEqual([]); });
  it("rejects wrong owners and unverifiable policy instead of sending content", async () => {
    expect(await canUseJournalCloudAi("entry", "other")).toBe(false);
    h.error = new Error("offline"); await expect(canUseJournalCloudAi("entry")).rejects.toThrow("offline");
  });
  it("does not transcribe another owner's video", async () => { h.videoOwner = "other"; await expect(requireJournalVideoCloudAi("path", "owner")).rejects.toThrow("ownership"); });
  it("blocks every AI path while the vault is locking", async () => { useJournalVaultStore.setState({ locking: true }); expect(await canUseJournalCloudAi("entry")).toBe(false); expect(h.reads).toEqual([]); });
});
