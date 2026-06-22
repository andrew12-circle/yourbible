import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  exportRawKey,
  generateAesGcmKey,
  importAesGcmKey,
  type AesGcmEnvelopeV1,
} from "@/lib/crypto/aesGcm";
import { base64ToBytes, bytesToBase64, randomBytes } from "@/lib/crypto/bytes";

/** OWASP-recommended iteration count for PBKDF2-SHA256 (2023). */
export const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_SALT_BYTES = 16;
const RECOVERY_KEY_BYTES = 32;

export type WrappedDekV1 = AesGcmEnvelopeV1;

export type JournalCryptoRecord = {
  user_id: string;
  salt: string;
  wrapped_dek: string;
  recovery_wrapped_dek: string;
  key_version: number;
};

async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createJournalVault(passphrase: string): Promise<{
  dek: CryptoKey;
  recoveryKey: string;
  record: Omit<JournalCryptoRecord, "user_id">;
}> {
  const salt = randomBytes(PBKDF2_SALT_BYTES);
  const dek = await generateAesGcmKey();
  const kek = await deriveKeyFromPassphrase(passphrase, salt);
  const recoveryRaw = randomBytes(RECOVERY_KEY_BYTES);
  const recoveryKey = bytesToBase64(recoveryRaw);
  const recoveryKek = await importAesGcmKey(recoveryRaw);

  const dekRaw = await exportRawKey(dek);
  const wrapped = await aesGcmEncrypt(kek, bytesToBase64(dekRaw));
  const recoveryWrapped = await aesGcmEncrypt(recoveryKek, bytesToBase64(dekRaw));

  return {
    dek,
    recoveryKey,
    record: {
      salt: bytesToBase64(salt),
      wrapped_dek: JSON.stringify(wrapped),
      recovery_wrapped_dek: JSON.stringify(recoveryWrapped),
      key_version: 1,
    },
  };
}

export async function unlockJournalVault(
  record: Pick<JournalCryptoRecord, "salt" | "wrapped_dek">,
  passphrase: string,
): Promise<CryptoKey> {
  const salt = base64ToBytes(record.salt);
  const kek = await deriveKeyFromPassphrase(passphrase, salt);
  const wrapped = JSON.parse(record.wrapped_dek) as WrappedDekV1;
  const dekB64 = await aesGcmDecrypt(kek, wrapped);
  return importAesGcmKey(base64ToBytes(dekB64));
}

export async function unlockJournalVaultWithRecovery(
  record: Pick<JournalCryptoRecord, "recovery_wrapped_dek">,
  recoveryKeyB64: string,
): Promise<CryptoKey> {
  const recoveryKek = await importAesGcmKey(base64ToBytes(recoveryKeyB64.trim()));
  const wrapped = JSON.parse(record.recovery_wrapped_dek) as WrappedDekV1;
  const dekB64 = await aesGcmDecrypt(recoveryKek, wrapped);
  return importAesGcmKey(base64ToBytes(dekB64));
}

export async function rewrapJournalVault(
  dek: CryptoKey,
  record: Pick<JournalCryptoRecord, "recovery_wrapped_dek">,
  newPassphrase: string,
): Promise<Omit<JournalCryptoRecord, "user_id">> {
  const salt = randomBytes(PBKDF2_SALT_BYTES);
  const kek = await deriveKeyFromPassphrase(newPassphrase, salt);
  const dekRaw = await exportRawKey(dek);
  const wrapped = await aesGcmEncrypt(kek, bytesToBase64(dekRaw));
  return {
    salt: bytesToBase64(salt),
    wrapped_dek: JSON.stringify(wrapped),
    recovery_wrapped_dek: record.recovery_wrapped_dek,
    key_version: 1,
  };
}
