import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalPinSetupForm } from "@/components/journal/JournalPinSetupForm";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVault } from "@/hooks/useJournalVault";
import { toast } from "@/hooks/use-toast";

type Props = {
  onContinue: () => void;
  onBack: () => void;
};

/** Onboarding — encryption on by default, recovery key, then 6-digit PIN + optional biometrics. */
export function OnboardingJournalPrivacyStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const vault = useJournalVault(user?.id);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || vault.e2eEnabled || autoStartedRef.current) return;
    autoStartedRef.current = true;
    setSetupError(null);
    void vault.enableDefaultEncryption().catch((err) => {
      autoStartedRef.current = false;
      const message = err instanceof Error ? err.message : "Try again";
      setSetupError(message);
      toast({
        title: "Couldn't enable encryption",
        description: message,
        variant: "destructive",
      });
    });
  }, [user?.id, vault.e2eEnabled, vault.enableDefaultEncryption]);

  const copyRecovery = async () => {
    if (!vault.recoveryKeyDraft) return;
    try {
      await navigator.clipboard.writeText(vault.recoveryKeyDraft);
      toast({ title: "Recovery key copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (vault.e2eEnabled && vault.pinEnabled && !vault.recoveryKeyDraft) {
    return (
      <div>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" aria-hidden />
          </div>
        </div>
        <h2 className="font-display text-3xl text-leather text-center mb-2">Journal protected</h2>
        <p className="text-center text-muted-foreground text-sm mb-8 max-w-md mx-auto leading-relaxed">
          Your journal encrypts on this device before it syncs. Use your PIN or biometrics to unlock each session.
        </p>
        <div className="flex justify-between mt-8 max-w-sm mx-auto">
          <Button variant="ghost" type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="leather-texture text-gold-bright shadow-leather border border-gold/30"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (vault.recoveryKeyDraft && !recoverySaved) {
    return (
      <div>
        <h2 className="font-display text-3xl text-leather text-center mb-2">Save your recovery key</h2>
        <p className="text-center text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Store this key somewhere safe (password manager or printed). It is the only way to recover your journal on a
          new device if you forget your PIN.
        </p>
        <code className="block text-xs break-all rounded-lg border bg-paper/80 p-3 font-mono max-w-md mx-auto">
          {vault.recoveryKeyDraft}
        </code>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={() => void copyRecovery()}>
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              vault.dismissRecoveryKey();
              setRecoverySaved(true);
            }}
          >
            I saved it — next
          </Button>
        </div>
      </div>
    );
  }

  if (vault.e2eEnabled && !vault.pinEnabled) {
    return (
      <div>
        <JournalPinSetupForm
          busy={vault.loading}
          biometricEnabled={vault.biometricEnabled}
          onSetupPin={vault.setupPin}
          onEnrollBiometric={
            user?.email ? () => vault.enrollBiometric(user.email!) : undefined
          }
          description="You'll use this PIN (or biometrics) to unlock your journal on this device. Keep your recovery key for new devices."
        />
        <div className="flex justify-between mt-8 max-w-sm mx-auto">
          <Button variant="ghost" type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            disabled={!vault.pinEnabled}
            onClick={onContinue}
            className="leather-texture text-gold-bright shadow-leather border border-gold/30"
          >
            Continue
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          A 6-digit PIN is required to lock and unlock your journal on this device.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          {vault.migrating ? (
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-600" aria-hidden />
          )}
        </div>
      </div>
      <h2 className="font-display text-3xl text-leather text-center mb-2">Protect your journal</h2>
      <p className="text-center text-muted-foreground text-sm mb-6 max-w-md mx-auto leading-relaxed">
        Encryption turns on automatically — like Day One. Next you'll save a recovery key and choose a{" "}
        <strong className="font-medium text-foreground">6-digit PIN</strong> (with optional biometrics) for daily unlock.
      </p>

      {setupError ? (
        <div className="max-w-sm mx-auto space-y-3 text-center">
          <p className="text-sm text-destructive">{setupError}</p>
          <Button
            type="button"
            onClick={() => {
              autoStartedRef.current = false;
              setSetupError(null);
              void vault.enableDefaultEncryption().catch((err) => {
                const message = err instanceof Error ? err.message : "Try again";
                setSetupError(message);
              });
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {vault.migrating ? "Encrypting your journal…" : "Setting up encryption…"}
        </p>
      )}

      <div className="flex justify-start mt-8 max-w-sm mx-auto">
        <Button variant="ghost" type="button" onClick={onBack} disabled={vault.migrating}>
          Back
        </Button>
      </div>
    </div>
  );
}
