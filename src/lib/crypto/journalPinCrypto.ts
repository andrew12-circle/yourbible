import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  exportRawKey,
  importAesGcmKey,
  type AesGcmEnvelopeV1,
} from "@/lib/crypto/aesGcm";
import { base64ToBytes, bytesToBase64, randomBytes } from "@/lib/crypto/bytes";

export const PIN_LENGTH = 6;
/** Extra iterations — 6-digit PIN needs a high work factor on device-local wrap. */
export const PIN_PBKDF2_ITERATIONS = 210_000;
const PIN_SALT_BYTES = 16;

export function normalizePin(pin: string): string {
  return pin.replace(/\D/g, "").slice(0, PIN_LENGTH);
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(normalizePin(pin));
}

async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const normalized = normalizePin(pin);
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalized),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PIN_PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapDekWithPin(
  pin: string,
  dek: CryptoKey,
): Promise<{ pinSalt: string; pinWrappedDek: string }> {
  if (!isValidPin(pin)) throw new Error("PIN must be exactly 6 digits");
  const pinSalt = randomBytes(PIN_SALT_BYTES);
  const kek = await deriveKeyFromPin(pin, pinSalt);
  const dekRaw = await exportRawKey(dek);
  const envelope = await aesGcmEncrypt(kek, bytesToBase64(dekRaw));
  return {
    pinSalt: bytesToBase64(pinSalt),
    pinWrappedDek: JSON.stringify(envelope),
  };
}

export async function unwrapDekWithPin(
  pin: string,
  pinSaltB64: string,
  pinWrappedDekJson: string,
): Promise<CryptoKey> {
  if (!isValidPin(pin)) throw new Error("PIN must be exactly 6 digits");
  const salt = base64ToBytes(pinSaltB64);
  const kek = await deriveKeyFromPin(pin, salt);
  const envelope = JSON.parse(pinWrappedDekJson) as AesGcmEnvelopeV1;
  const dekB64 = await aesGcmDecrypt(kek, envelope);
  return importAesGcmKey(base64ToBytes(dekB64));
}

export async function deriveBiometricWrapKey(
  credentialIdB64: string,
  localSecret: Uint8Array,
): Promise<CryptoKey> {
  const material = new Uint8Array(
    base64ToBytes(credentialIdB64).length + localSecret.length,
  );
  material.set(base64ToBytes(credentialIdB64), 0);
  material.set(localSecret, base64ToBytes(credentialIdB64).length);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function wrapDekForBiometric(
  credentialIdB64: string,
  localSecret: Uint8Array,
  dek: CryptoKey,
): Promise<string> {
  const key = await deriveBiometricWrapKey(credentialIdB64, localSecret);
  const dekRaw = await exportRawKey(dek);
  const envelope = await aesGcmEncrypt(key, bytesToBase64(dekRaw));
  return JSON.stringify(envelope);
}

export async function unwrapDekForBiometric(
  credentialIdB64: string,
  localSecret: Uint8Array,
  bioWrappedDekJson: string,
): Promise<CryptoKey> {
  const key = await deriveBiometricWrapKey(credentialIdB64, localSecret);
  const envelope = JSON.parse(bioWrappedDekJson) as AesGcmEnvelopeV1;
  const dekB64 = await aesGcmDecrypt(key, envelope);
  return importAesGcmKey(base64ToBytes(dekB64));
}
