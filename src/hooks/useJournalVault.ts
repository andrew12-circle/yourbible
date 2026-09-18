import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createJournalVault,
  rewrapJournalVault,
  unlockJournalVault,
  unlockJournalVaultWithRecovery,
  type JournalCryptoRecord,
} from "@/lib/crypto/journalVaultCrypto";
import { migratePlaintextEntriesToE2e } from "@/lib/journal/migrateJournalEncryption";
import { bytesToBase64, randomBytes } from "@/lib/crypto/bytes";
import {
  enrollJournalBiometric,
  unlockJournalWithBiometric,
  clearJournalBiometric,
} from "@/lib/crypto/journalBiometricUnlock";
import { wrapDekWithPin, unwrapDekWithPin } from "@/lib/crypto/journalPinCrypto";
import {
  clearDeviceLockRecord,
  getDeviceLockRecord,
  hasBiometricLock,
  hasPinLock,
  saveDeviceLockRecord,
} from "@/lib/crypto/journalPinStore";
import { loadE2eRequiredJournalIds, ensurePrivateJournal } from "@/lib/journal/privateJournal";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";
import { getJournalDek, useJournalVaultStore } from "@/stores/journalVaultStore";
import { toast } from "@/hooks/use-toast";

/** Load vault metadata, unlock/lock, setup E2E encryption. */
export function useJournalVault(userId: string | undefined) {
  const activeUser = useRef(userId); activeUser.current = userId;
  const e2eEnabled = useJournalVaultStore((s) => s.e2eEnabled);
  const cryptoRecord = useJournalVaultStore((s) => s.cryptoRecord);
  const isUnlocked = useJournalVaultStore((s) => s.dek != null);
  const setE2eEnabled = useJournalVaultStore((s) => s.setE2eEnabled);
  const setCryptoRecord = useJournalVaultStore((s) => s.setCryptoRecord);
  const unlockStore = useJournalVaultStore((s) => s.unlock);
  const lockStore = useJournalVaultStore((s) => s.lock);
  const setE2eRequiredJournalIds = useJournalVaultStore((s) => s.setE2eRequiredJournalIds);
  const pinEnabled = useJournalVaultStore((s) => s.pinEnabled);
  const biometricEnabled = useJournalVaultStore((s) => s.biometricEnabled);
  const setLockFlags = useJournalVaultStore((s) => s.setLockFlags);
  const resetStore = useJournalVaultStore((s) => s.reset);

  const acceptUnlock = useCallback(async (dek: CryptoKey, epoch: number) => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !userId || activeUser.current !== userId || data.session?.user.id !== userId ||
      useJournalVaultStore.getState().lockEpoch !== epoch || useJournalVaultStore.getState().locking) {
      throw new Error("Journal access changed. Sign in and unlock again.");
    }
    unlockStore(dek);
  }, [userId, unlockStore]);

  const refreshE2eJournalIds = useCallback(async (uid: string) => {
    const ids = await loadE2eRequiredJournalIds(uid);
    if (activeUser.current === uid) setE2eRequiredJournalIds(ids);
  }, [setE2eRequiredJournalIds]);

  const refreshDeviceLock = useCallback(async (uid: string) => {
    const record = await getDeviceLockRecord(uid);
    if (activeUser.current !== uid) return;
    setLockFlags({
      pinEnabled: hasPinLock(record),
      biometricEnabled: hasBiometricLock(record),
    });
  }, [setLockFlags]);

  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [recoveryKeyDraft, setRecoveryKeyDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    (async () => {
      await ensurePrivateJournal(userId);
      const [profileRes, cryptoRes] = await Promise.all([
        supabase.from("profiles").select("journal_e2e_enabled").eq("user_id", userId).maybeSingle(),
        supabase.from("user_journal_crypto").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const profileOk = !profileRes.error || isJournalE2eSchemaError(profileRes.error);
      const cryptoOk = !cryptoRes.error || isJournalE2eSchemaError(cryptoRes.error);
      if (!profileOk || !cryptoOk) throw new Error("Could not verify journal privacy settings. Please retry.");
      setE2eEnabled(!!profileRes.data?.journal_e2e_enabled);
      setCryptoRecord(
        cryptoOk ? ((cryptoRes.data as JournalCryptoRecord | null) ?? null) : null,
      );
      await Promise.all([refreshE2eJournalIds(userId), refreshDeviceLock(userId)]);
    })().catch((error: unknown) => {
      if (!cancelled) toast({ title: "Journal privacy settings unavailable", description: error instanceof Error ? error.message : "Reconnect and try again.", variant: "destructive" });
    });

    return () => {
      cancelled = true;
    };
  }, [userId, resetStore, setCryptoRecord, setE2eEnabled, refreshE2eJournalIds, refreshDeviceLock]);

  const unlockWithPassphrase = useCallback(
    async (passphrase: string) => {
      if (!cryptoRecord) throw new Error("Encryption not set up");
      const epoch = useJournalVaultStore.getState().lockEpoch;
      setLoading(true);
      try {
        const dek = await unlockJournalVault(cryptoRecord, passphrase);
        await acceptUnlock(dek, epoch);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [cryptoRecord, unlockStore],
  );

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!userId) throw new Error("Sign in required");
      const epoch = useJournalVaultStore.getState().lockEpoch;
      setLoading(true);
      try {
        const record = await getDeviceLockRecord(userId);
        if (!hasPinLock(record) || !record) {
          throw new Error("PIN not set up on this device");
        }
        const dek = await unwrapDekWithPin(pin, record.pinSalt, record.pinWrappedDek);
        await acceptUnlock(dek, epoch);
        return true;
      } catch {
        toast({ title: "Wrong PIN", variant: "destructive" });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, unlockStore],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!userId) throw new Error("Sign in required");
    const epoch = useJournalVaultStore.getState().lockEpoch;
    setLoading(true);
    try {
      const dek = await unlockJournalWithBiometric(userId);
      await acceptUnlock(dek, epoch);
      toast({ title: "Journal unlocked" });
      return true;
    } catch (err) {
      toast({
        title: "Biometric unlock failed",
        description: err instanceof Error ? err.message : "Try your PIN instead",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, unlockStore]);

  const setupPin = useCallback(
    async (pin: string) => {
      if (!userId) throw new Error("Sign in required");
      const dek = getJournalDek();
      if (!dek) throw new Error("Unlock your vault before setting a PIN");

      const { pinSalt, pinWrappedDek } = await wrapDekWithPin(pin, dek);
      const existing = await getDeviceLockRecord(userId);
      await saveDeviceLockRecord({
        userId,
        pinSalt,
        pinWrappedDek,
        bioCredentialId: existing?.bioCredentialId,
        bioWrappedDek: existing?.bioWrappedDek,
        bioLocalSecret: existing?.bioLocalSecret,
      });
      await refreshDeviceLock(userId);
      toast({ title: "PIN saved", description: "Use your 6-digit PIN to unlock on this device." });
    },
    [userId, refreshDeviceLock],
  );

  const enrollBiometric = useCallback(
    async (userEmail: string) => {
      if (!userId) throw new Error("Sign in required");
      const dek = getJournalDek();
      if (!dek) throw new Error("Unlock your journal before enabling biometrics");
      const epoch = useJournalVaultStore.getState().lockEpoch;
      setLoading(true);
      try {
        await enrollJournalBiometric(userId, userEmail, dek);
        await refreshDeviceLock(userId);
        toast({ title: "Biometrics enabled", description: "Use fingerprint or Face ID to unlock." });
      } finally {
        setLoading(false);
      }
    },
    [userId, refreshDeviceLock],
  );

  const disableBiometric = useCallback(async () => {
    if (!userId) return;
    await clearJournalBiometric(userId);
    await refreshDeviceLock(userId);
    toast({ title: "Biometrics removed from this device" });
  }, [userId, refreshDeviceLock]);

  const changePin = useCallback(
    async (currentPin: string, newPin: string) => {
      if (!userId) throw new Error("Sign in required");
      const epoch = useJournalVaultStore.getState().lockEpoch;
      const record = await getDeviceLockRecord(userId);
      if (!hasPinLock(record) || !record) throw new Error("PIN not set up");
      const dek = await unwrapDekWithPin(currentPin, record.pinSalt, record.pinWrappedDek);
      const { pinSalt, pinWrappedDek } = await wrapDekWithPin(newPin, dek);
      await saveDeviceLockRecord({
        userId,
        pinSalt,
        pinWrappedDek,
        bioCredentialId: record.bioCredentialId,
        bioWrappedDek: record.bioWrappedDek,
        bioLocalSecret: record.bioLocalSecret,
      });
      await acceptUnlock(dek, epoch);
      await refreshDeviceLock(userId);
      toast({ title: "PIN updated" });
    },
    [userId, unlockStore, refreshDeviceLock],
  );

  const unlockWithRecoveryKey = useCallback(
    async (recoveryKey: string) => {
      if (!cryptoRecord) throw new Error("Encryption not set up");
      const epoch = useJournalVaultStore.getState().lockEpoch;
      setLoading(true);
      try {
        const dek = await unlockJournalVaultWithRecovery(cryptoRecord, recoveryKey);
        await acceptUnlock(dek, epoch);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [cryptoRecord, unlockStore],
  );

  const enableEncryption = useCallback(
    async (passphrase: string, options?: { pin?: string }) => {
      if (!userId) throw new Error("Sign in required");
      if (passphrase.length < 8) throw new Error("Use at least 8 characters");

      const epoch = useJournalVaultStore.getState().lockEpoch;
      setMigrating(true);
      try {
        const { data: existing, error: existingError } = await supabase.from("user_journal_crypto")
          .select("*").eq("user_id", userId).maybeSingle();
        if (existingError) throw existingError;
        if (existing) throw new Error("Encryption is already set up. Unlock the existing vault and choose Finish encrypting existing entries.");
        const { dek, recoveryKey, record } = await createJournalVault(passphrase);

        const { error: cryptoErr } = await supabase.from("user_journal_crypto").insert({
          user_id: userId,
          ...record,
        });
        if (cryptoErr) throw cryptoErr;
        // Expose the recovery key even when migration or the profile request later fails.
        setRecoveryKeyDraft(recoveryKey);
        setCryptoRecord({ user_id: userId, ...record });
        await acceptUnlock(dek, epoch);

        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ journal_e2e_enabled: true })
          .eq("user_id", userId);
        if (profileErr) throw profileErr;

        setE2eEnabled(true);

        if (options?.pin) {
          const { pinSalt, pinWrappedDek } = await wrapDekWithPin(options.pin, dek);
          await saveDeviceLockRecord({ userId, pinSalt, pinWrappedDek });
          await refreshDeviceLock(userId);
        }

        const count = await migratePlaintextEntriesToE2e(userId, dek);
        await refreshE2eJournalIds(userId);
        setRecoveryKeyDraft(recoveryKey);
        toast({
          title: "Journal encryption enabled",
          description:
            count > 0
              ? `Encrypted ${count} existing ${count === 1 ? "entry" : "entries"}. Save your recovery key.`
              : "New entries will encrypt on this device before sync.",
        });
        return recoveryKey;
      } finally {
        setMigrating(false);
      }
    },
    [userId, unlockStore, setCryptoRecord, setE2eEnabled, refreshE2eJournalIds, refreshDeviceLock],
  );

  /** Turn on E2E with a device-generated passphrase — user unlocks with PIN/biometrics only. */
  const enableDefaultEncryption = useCallback(async () => {
    const passphrase = bytesToBase64(randomBytes(32));
    return enableEncryption(passphrase);
  }, [enableEncryption]);

  const changePassphrase = useCallback(
    async (currentPassphrase: string, newPassphrase: string) => {
      if (!userId || !cryptoRecord) throw new Error("Encryption not set up");
      if (newPassphrase.length < 8) throw new Error("Use at least 8 characters");

      const epoch = useJournalVaultStore.getState().lockEpoch;
      setLoading(true);
      try {
        const dek = getJournalDek() ?? (await unlockJournalVault(cryptoRecord, currentPassphrase));
        const rewrapped = await rewrapJournalVault(dek, cryptoRecord, newPassphrase);
        const { error } = await supabase
          .from("user_journal_crypto")
          .update(rewrapped)
          .eq("user_id", userId);
        if (error) throw error;
        await acceptUnlock(dek, epoch);
        setCryptoRecord({ user_id: userId, ...rewrapped });
        toast({ title: "Passphrase updated" });
      } finally {
        setLoading(false);
      }
    },
    [userId, cryptoRecord, unlockStore, setCryptoRecord],
  );

  const lock = useCallback(async () => {
    try {
      await lockStore();
      toast({ title: "Journal locked", description: "Enter your PIN or use biometrics to unlock." });
    } catch (error) {
      toast({ title: "Could not safely lock your journal", description: error instanceof Error ? error.message : "Keep this page open and retry.", variant: "destructive" });
    }
  }, [lockStore]);

  const finishEncryption = useCallback(async () => {
    const dek = getJournalDek();
    if (!userId || !dek) throw new Error("Unlock your existing journal vault first.");
    setMigrating(true);
    try {
      const { error } = await supabase.from("profiles").update({ journal_e2e_enabled: true }).eq("user_id", userId);
      if (error) throw error;
      setE2eEnabled(true);
      const count = await migratePlaintextEntriesToE2e(userId, dek);
      toast({ title: "Encryption verified", description: `${count} entries encrypted. No unencrypted entries remain.` });
    } catch (error) {
      toast({ title: "Encryption is not finished", description: error instanceof Error ? error.message : "Unlock and retry to finish protecting existing entries.", variant: "destructive" });
      throw error;
    } finally { setMigrating(false); }
  }, [userId, setE2eEnabled]);

  const clearDeviceLock = useCallback(async () => {
    if (!userId) return;
    await clearDeviceLockRecord(userId);
    await refreshDeviceLock(userId);
  }, [userId, refreshDeviceLock]);

  const dismissRecoveryKey = useCallback(() => setRecoveryKeyDraft(null), []);

  return {
    e2eEnabled,
    cryptoRecord,
    isUnlocked,
    pinEnabled,
    biometricEnabled,
    loading,
    migrating,
    recoveryKeyDraft,
    dismissRecoveryKey,
    unlockWithPassphrase,
    unlockWithPin,
    unlockWithBiometric,
    unlockWithRecoveryKey,
    enableEncryption,
    finishEncryption,
    enableDefaultEncryption,
    setupPin,
    changePin,
    enrollBiometric,
    disableBiometric,
    clearDeviceLock,
    changePassphrase,
    lock,
  };
}
