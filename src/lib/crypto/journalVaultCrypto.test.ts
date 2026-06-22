// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aesGcmDecrypt, aesGcmEncrypt, generateAesGcmKey } from "@/lib/crypto/aesGcm";
import {
  createJournalVault,
  rewrapJournalVault,
  unlockJournalVault,
  unlockJournalVaultWithRecovery,
} from "@/lib/crypto/journalVaultCrypto";
import { decryptTextField, encryptTextField } from "@/lib/crypto/journalFieldCrypto";

describe("journal E2E crypto", () => {
  it("round-trips AES-GCM field encryption", async () => {
    const dek = await generateAesGcmKey();
    const stored = await encryptTextField(dek, "Dear Lord, give me patience.");
    expect(stored?.startsWith("yb:e2e:1:")).toBe(true);
    const plain = await decryptTextField(dek, stored);
    expect(plain).toBe("Dear Lord, give me patience.");
  });

  it("creates vault and unlocks with passphrase", async () => {
    const { dek, recoveryKey, record } = await createJournalVault("my-secret-passphrase");
    const unlocked = await unlockJournalVault(record, "my-secret-passphrase");
    const a = await aesGcmEncrypt(dek, "test");
    const b = await aesGcmDecrypt(unlocked, a);
    expect(b).toBe("test");
    expect(recoveryKey.length).toBeGreaterThan(20);
  });

  it("unlocks with recovery key after passphrase change", async () => {
    const { dek, recoveryKey, record } = await createJournalVault("old-pass");
    const rewrapped = await rewrapJournalVault(dek, record, "new-pass");
    await expect(unlockJournalVault(rewrapped, "old-pass")).rejects.toThrow();
    const fromNew = await unlockJournalVault(rewrapped, "new-pass");
    const fromRecovery = await unlockJournalVaultWithRecovery(record, recoveryKey);
    const msg = await aesGcmEncrypt(fromNew, "still works");
    expect(await aesGcmDecrypt(fromRecovery, msg)).toBe("still works");
  });
});
