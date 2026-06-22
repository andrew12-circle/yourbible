import { aesGcmDecrypt, aesGcmEncrypt, type AesGcmEnvelopeV1 } from "@/lib/crypto/aesGcm";

export const E2E_FIELD_PREFIX = "yb:e2e:1:";

export function isEncryptedTextField(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(E2E_FIELD_PREFIX);
}

function parseEnvelope(serialized: string): AesGcmEnvelopeV1 {
  const json = serialized.slice(E2E_FIELD_PREFIX.length);
  return JSON.parse(json) as AesGcmEnvelopeV1;
}

export async function encryptTextField(dek: CryptoKey, plaintext: string | null): Promise<string | null> {
  if (plaintext == null || plaintext === "") return plaintext;
  const envelope = await aesGcmEncrypt(dek, plaintext);
  return `${E2E_FIELD_PREFIX}${JSON.stringify(envelope)}`;
}

export async function decryptTextField(dek: CryptoKey, stored: string | null): Promise<string | null> {
  if (stored == null || stored === "") return stored;
  if (!isEncryptedTextField(stored)) return stored;
  return aesGcmDecrypt(dek, parseEnvelope(stored));
}
