import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JournalPinInput } from "@/components/journal/JournalPinInput";
import { isBiometricUnlockAvailable } from "@/lib/crypto/journalBiometricUnlock";
import { cn } from "@/lib/utils";

type VaultUnlockApi = {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  loading: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPassphrase: (passphrase: string) => Promise<boolean>;
};

type Props = {
  vault: VaultUnlockApi;
  compact?: boolean;
  className?: string;
  onUnlocked?: () => void;
  showPassphraseFallback?: boolean;
  settingsHref?: string;
};

export function JournalVaultUnlockPanel({
  vault,
  compact,
  className,
  onUnlocked,
  showPassphraseFallback = true,
  settingsHref = "/settings?section=privacy",
}: Props) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(!vault.pinEnabled);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void isBiometricUnlockAvailable().then(setBioAvailable);
  }, []);

  const onPinComplete = useCallback(
    (code: string) => {
      void vault.unlockWithPin(code).then(
        (ok) => {
          if (ok) {
            setPin("");
            setPinError(false);
            onUnlocked?.();
          }
        },
        () => {
          setPinError(true);
          setPin("");
        },
      );
    },
    [vault, onUnlocked],
  );

  const tryBiometric = () => {
    void vault.unlockWithBiometric().then(
      (ok) => {
        if (ok) onUnlocked?.();
      },
      () => {
        /* toast handled in hook */
      },
    );
  };

  if (showPassphrase && showPassphraseFallback) {
    return (
      <div className={cn("space-y-4", className)}>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Journal passphrase"
          value={passphrase}
          disabled={vault.loading}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && passphrase) {
              void vault.unlockWithPassphrase(passphrase).then((ok) => {
                if (ok) {
                  setPassphrase("");
                  onUnlocked?.();
                }
              });
            }
          }}
        />
        <Button
          className="w-full"
          disabled={!passphrase || vault.loading}
          onClick={() =>
            void vault.unlockWithPassphrase(passphrase).then((ok) => {
              if (ok) {
                setPassphrase("");
                onUnlocked?.();
              }
            })
          }
        >
          Unlock with passphrase
        </Button>
        {vault.pinEnabled ? (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setShowPassphrase(false)}>
            Use 6-digit PIN instead
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        <p className="text-center text-sm text-muted-foreground">
          Enter your 6-digit journal PIN to unlock on this device.
        </p>
      ) : null}

      <JournalPinInput
        value={pin}
        onChange={(v) => {
          setPin(v);
          if (pinError) setPinError(false);
        }}
        onComplete={onPinComplete}
        disabled={vault.loading}
        error={pinError}
        autoFocus
      />

      {pinError ? (
        <p className="text-center text-xs text-destructive">Wrong PIN — try again</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {vault.biometricEnabled && bioAvailable ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={vault.loading}
            onClick={tryBiometric}
          >
            <Fingerprint className="h-4 w-4 mr-2" />
            Unlock with biometrics
          </Button>
        ) : null}

        {showPassphraseFallback ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setShowPassphrase(true)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Use passphrase instead
          </Button>
        ) : null}

        <Link
          to={settingsHref}
          className="text-xs text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <Lock className="h-3 w-3" />
          Journal privacy settings
        </Link>
      </div>
    </div>
  );
}
