import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JournalPinInput } from "@/components/journal/JournalPinInput";
import { isValidPin } from "@/lib/crypto/journalPinCrypto";
import { isBiometricUnlockAvailable } from "@/lib/crypto/journalBiometricUnlock";
import { useEffect } from "react";

type Props = {
  onSetupPin: (pin: string) => Promise<void>;
  onEnrollBiometric?: () => Promise<void>;
  biometricEnabled?: boolean;
  busy?: boolean;
  title?: string;
  description?: string;
};

/** First-time 6-digit PIN (+ optional biometrics) after encryption is enabled. */
export function JournalPinSetupForm({
  onSetupPin,
  onEnrollBiometric,
  biometricEnabled,
  busy,
  title = "Choose a 6-digit PIN",
  description = "You'll use this PIN (or biometrics) to unlock your journal on this device. Keep your recovery key for new devices.",
}: Props) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"enter" | "confirm" | "done">("enter");
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void isBiometricUnlockAvailable().then(setBioAvailable);
  }, []);

  const submitPin = async () => {
    if (!isValidPin(pin) || pin !== confirm) return;
    await onSetupPin(pin);
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">PIN saved on this device</p>
        {bioAvailable && onEnrollBiometric && !biometricEnabled ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void onEnrollBiometric()}>
            <Fingerprint className="h-4 w-4 mr-2" />
            Enable biometrics
          </Button>
        ) : biometricEnabled ? (
          <p className="text-xs text-muted-foreground">Biometrics enabled on this device.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {step === "enter" ? (
        <>
          <Label className="sr-only">Enter PIN</Label>
          <JournalPinInput
            value={pin}
            onChange={setPin}
            onComplete={() => setStep("confirm")}
            disabled={busy}
            autoFocus
          />
        </>
      ) : (
        <>
          <Label className="text-center block text-sm text-muted-foreground">Confirm your PIN</Label>
          <JournalPinInput
            value={confirm}
            onChange={setConfirm}
            onComplete={() => {
              if (isValidPin(confirm) && confirm === pin) void submitPin();
            }}
            disabled={busy}
            autoFocus
            error={confirm.length === 6 && confirm !== pin}
          />
          {confirm.length === 6 && confirm !== pin ? (
            <p className="text-center text-xs text-destructive">PINs do not match</p>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setStep("enter")}>
            Start over
          </Button>
        </>
      )}
    </div>
  );
}
