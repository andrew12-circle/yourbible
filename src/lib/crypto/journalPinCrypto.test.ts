// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aesGcmDecrypt, aesGcmEncrypt, generateAesGcmKey } from "@/lib/crypto/aesGcm";
import { isValidPin, unwrapDekWithPin, wrapDekWithPin } from "@/lib/crypto/journalPinCrypto";

describe("journalPinCrypto", () => {
  it("validates 6-digit PIN", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a456")).toBe(false);
  });

  it("wraps and unwraps DEK with PIN", async () => {
    const dek = await generateAesGcmKey();
    const { pinSalt, pinWrappedDek } = await wrapDekWithPin("482910", dek);
    const out = await unwrapDekWithPin("482910", pinSalt, pinWrappedDek);
    const envelope = await aesGcmEncrypt(dek, "secret prayer");
    const plainA = await aesGcmDecrypt(dek, envelope);
    const plainB = await aesGcmDecrypt(out, envelope);
    expect(plainB).toBe(plainA);
  });

  it("rejects wrong PIN", async () => {
    const dek = await generateAesGcmKey();
    const { pinSalt, pinWrappedDek } = await wrapDekWithPin("111111", dek);
    await expect(unwrapDekWithPin("222222", pinSalt, pinWrappedDek)).rejects.toThrow();
  });
});
