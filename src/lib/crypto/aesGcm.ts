import { base64ToBytes, bytesToBase64, randomBytes } from "@/lib/crypto/bytes";

const AES_GCM_IV_BYTES = 12;

export async function importAesGcmKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function generateAesGcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export type AesGcmEnvelopeV1 = {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  ct: string;
};

export async function aesGcmEncrypt(key: CryptoKey, plaintext: string): Promise<AesGcmEnvelopeV1> {
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { v: 1, alg: "AES-GCM", iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
}

export async function aesGcmDecrypt(key: CryptoKey, envelope: AesGcmEnvelopeV1): Promise<string> {
  if (envelope.v !== 1 || envelope.alg !== "AES-GCM") {
    throw new Error("Unsupported encryption envelope");
  }
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ct),
  );
  return new TextDecoder().decode(plain);
}
