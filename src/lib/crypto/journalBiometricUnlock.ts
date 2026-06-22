import { APP_NAME } from "@/lib/appBrand";
import { base64ToBytes, bytesToBase64, randomBytes } from "@/lib/crypto/bytes";
import {
  unwrapDekForBiometric,
  wrapDekForBiometric,
} from "@/lib/crypto/journalPinCrypto";
import {
  getDeviceLockRecord,
  hasBiometricLock,
  saveDeviceLockRecord,
  type DeviceLockRecord,
} from "@/lib/crypto/journalPinStore";

function rpId(): string {
  const host = window.location.hostname;
  return host === "localhost" ? "localhost" : host;
}

export async function isBiometricUnlockAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enrollJournalBiometric(
  userId: string,
  userEmail: string,
  dek: CryptoKey,
): Promise<void> {
  const available = await isBiometricUnlockAvailable();
  if (!available) throw new Error("Biometrics are not available on this device");

  const existing = await getDeviceLockRecord(userId);
  if (!existing?.pinWrappedDek) {
    throw new Error("Set a 6-digit PIN before enabling biometrics");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: APP_NAME, id: rpId() },
      user: {
        id: new TextEncoder().encode(userId),
        name: userEmail,
        displayName: "Journal lock",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Biometric enrollment cancelled");

  const credentialId = bytesToBase64(new Uint8Array(credential.rawId));
  const bioLocalSecret = randomBytes(32);
  const bioWrappedDek = await wrapDekForBiometric(credentialId, bioLocalSecret, dek);

  const next: DeviceLockRecord = {
    ...existing,
    bioCredentialId: credentialId,
    bioWrappedDek,
    bioLocalSecret: bytesToBase64(bioLocalSecret),
  };
  await saveDeviceLockRecord(next);
}

export async function unlockJournalWithBiometric(userId: string): Promise<CryptoKey> {
  const record = await getDeviceLockRecord(userId);
  if (!hasBiometricLock(record) || !record) {
    throw new Error("Biometrics not set up on this device");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64ToBytes(record.bioCredentialId!),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Biometric unlock cancelled");

  const credentialId = bytesToBase64(new Uint8Array(assertion.rawId));
  if (credentialId !== record.bioCredentialId) {
    throw new Error("Biometric credential mismatch");
  }

  return unwrapDekForBiometric(
    credentialId,
    base64ToBytes(record.bioLocalSecret!),
    record.bioWrappedDek!,
  );
}

export async function clearJournalBiometric(userId: string): Promise<void> {
  const record = await getDeviceLockRecord(userId);
  if (!record) return;
  const next: DeviceLockRecord = {
    userId: record.userId,
    pinSalt: record.pinSalt,
    pinWrappedDek: record.pinWrappedDek,
  };
  await saveDeviceLockRecord(next);
}
