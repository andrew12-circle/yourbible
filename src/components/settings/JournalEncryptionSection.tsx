import { useState } from "react";
import { Copy, Fingerprint, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsCard } from "@/components/settings/SettingsSectionPanel";
import { JournalPinSetupForm } from "@/components/journal/JournalPinSetupForm";
import { JournalVaultUnlockPanel } from "@/components/journal/JournalVaultUnlockPanel";
import { JournalPinInput } from "@/components/journal/JournalPinInput";
import { isValidPin } from "@/lib/crypto/journalPinCrypto";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVault } from "@/hooks/useJournalVault";
import { toast } from "@/hooks/use-toast";

export function JournalEncryptionSection() {
  const { user } = useAuth();
  const vault = useJournalVault(user?.id);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");

  const copyRecovery = async () => {
    if (!vault.recoveryKeyDraft) return;
    try {
      await navigator.clipboard.writeText(vault.recoveryKeyDraft);
      toast({ title: "Recovery key copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard className="p-4 md:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
          <div className="space-y-2 min-w-0">
            <h3 className="font-semibold tracking-tight">Journal encryption</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Like Day One: your journal is encrypted on this device with AES-256 before it syncs. A{" "}
              <strong className="font-medium text-foreground">Private</strong> notebook is always encrypted.
              AI features work while unlocked because formatting runs on your device, then saves ciphertext.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Unlock daily with a 6-digit PIN or biometrics on this device.</li>
              <li>Server and staff cannot read encrypted title, body, or summary.</li>
              <li>Encrypted entries skip server search, mirror scoring, and My AI retrieval.</li>
              <li>Photos are not encrypted yet (coming next).</li>
            </ul>
          </div>
        </div>

        {!vault.e2eEnabled ? (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Enable encryption</p>
            <p className="text-xs text-muted-foreground">
              Turns on automatically for new accounts. You'll get a recovery key, then set a 6-digit PIN for daily
              unlock on this device.
            </p>
            <Button
              disabled={vault.migrating}
              onClick={() =>
                void vault.enableDefaultEncryption().catch((e) => {
                  toast({
                    title: "Could not enable encryption",
                    description: e instanceof Error ? e.message : "Try again",
                    variant: "destructive",
                  });
                })
              }
            >
              {vault.migrating ? "Encrypting entries…" : "Turn on journal encryption"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={
                  vault.isUnlocked
                    ? "inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                    : "inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
                }
              >
                {vault.isUnlocked ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {vault.isUnlocked ? "Unlocked on this device" : "Locked — encrypted entries hidden"}
              </span>
              {vault.isUnlocked ? (
                <Button type="button" variant="outline" size="sm" onClick={vault.lock}>
                  Lock journal
                </Button>
              ) : null}
            </div>

            {!vault.isUnlocked ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Unlock</p>
                <JournalVaultUnlockPanel
                  vault={vault}
                  compact
                  showPassphraseFallback
                  settingsHref="/settings?section=privacy"
                  onUnlocked={() => toast({ title: "Journal unlocked" })}
                />
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Use recovery key</summary>
                  <div className="mt-2 space-y-2">
                    <Input
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      placeholder="Paste recovery key"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!recoveryInput.trim()}
                      onClick={() =>
                        void vault.unlockWithRecoveryKey(recoveryInput).then(
                          () => {
                            setRecoveryInput("");
                            toast({ title: "Unlocked with recovery key" });
                          },
                          () =>
                            toast({ title: "Invalid recovery key", variant: "destructive" }),
                        )
                      }
                    >
                      <KeyRound className="h-4 w-4 mr-1" /> Unlock with recovery
                    </Button>
                  </div>
                </details>
              </div>
            ) : (
              <div className="space-y-4">
                {!vault.pinEnabled ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <JournalPinSetupForm
                      busy={vault.loading}
                      biometricEnabled={vault.biometricEnabled}
                      onSetupPin={vault.setupPin}
                      onEnrollBiometric={
                        user?.email ? () => vault.enrollBiometric(user.email!) : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">Device lock (PIN)</p>
                    <p className="text-xs text-muted-foreground">
                      Change your 6-digit PIN on this device. Passphrase still works on new devices.
                    </p>
                    <JournalPinInput value={currentPin} onChange={setCurrentPin} disabled={vault.loading} />
                    <JournalPinInput value={newPin} onChange={setNewPin} disabled={vault.loading} />
                    <p className="text-xs text-muted-foreground text-center">Confirm new PIN</p>
                    <JournalPinInput
                      value={newPinConfirm}
                      onChange={setNewPinConfirm}
                      disabled={vault.loading}
                      error={newPinConfirm.length === 6 && newPinConfirm !== newPin}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={
                        !isValidPin(currentPin) ||
                        !isValidPin(newPin) ||
                        newPin !== newPinConfirm ||
                        vault.loading
                      }
                      onClick={() =>
                        void vault.changePin(currentPin, newPin).then(() => {
                          setCurrentPin("");
                          setNewPin("");
                          setNewPinConfirm("");
                        })
                      }
                    >
                      Update PIN
                    </Button>
                    {vault.biometricEnabled ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void vault.disableBiometric()}
                      >
                        Remove biometrics from this device
                      </Button>
                    ) : user?.email ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={vault.loading}
                        onClick={() => void vault.enrollBiometric(user.email!)}
                      >
                        <Fingerprint className="h-4 w-4 mr-1" />
                        Enable biometrics
                      </Button>
                    ) : null}
                  </div>
                )}

                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">Change passphrase</p>
                <Input
                  type="password"
                  placeholder="Current passphrase"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="New passphrase (8+ characters)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!currentPass || newPass.length < 8}
                  onClick={() =>
                    void vault.changePassphrase(currentPass, newPass).then(() => {
                      setCurrentPass("");
                      setNewPass("");
                    })
                  }
                >
                  Update passphrase
                </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {vault.recoveryKeyDraft ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Save your recovery key now
            </p>
            <p className="text-xs text-muted-foreground">
              Store this somewhere safe (password manager or printed). It is the only way back in on a new device if you
              forget your PIN.
            </p>
            <code className="block text-xs break-all rounded bg-background/80 p-2 font-mono">
              {vault.recoveryKeyDraft}
            </code>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyRecovery()}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button type="button" size="sm" onClick={vault.dismissRecoveryKey}>
                I saved it
              </Button>
            </div>
          </div>
        ) : null}
      </SettingsCard>
    </div>
  );
}
