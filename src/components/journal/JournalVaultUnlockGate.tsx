import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JournalVaultUnlockPanel } from "@/components/journal/JournalVaultUnlockPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVault } from "@/hooks/useJournalVault";
import { toast } from "@/hooks/use-toast";

/** Blocks journal reading until the user unlocks E2E encryption (PIN / biometrics). */
export function JournalVaultUnlockGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const vault = useJournalVault(user?.id);
  const { unlockWithBiometric, biometricEnabled, e2eEnabled, isUnlocked } = vault;
  const [dismissed, setDismissed] = useState(false);
  const [bioAttempted, setBioAttempted] = useState(false);

  const needsUnlock = e2eEnabled && !isUnlocked && !dismissed;

  useEffect(() => {
    if (!needsUnlock || bioAttempted || !biometricEnabled) return;
    setBioAttempted(true);
    void unlockWithBiometric().then((ok) => {
      if (ok) setDismissed(false);
    });
  }, [needsUnlock, bioAttempted, biometricEnabled, unlockWithBiometric]);

  return (
    <>
      {children}
      <Dialog open={needsUnlock} onOpenChange={(open) => !open && setDismissed(true)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
              Unlock your journal
            </DialogTitle>
            <DialogDescription>
              {vault.pinEnabled
                ? "Enter your 6-digit PIN or use biometrics. Your journal is encrypted on this device."
                : "Enter your journal passphrase, or set a PIN in Settings for faster unlock."}
            </DialogDescription>
          </DialogHeader>

          <JournalVaultUnlockPanel
            vault={vault}
            onUnlocked={() => {
              setDismissed(false);
              toast({ title: "Journal unlocked" });
            }}
          />

          <DialogFooter className="sm:justify-center">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setDismissed(true)}>
              Browse locked (titles hidden)
            </Button>
            {!vault.pinEnabled ? (
              <Link
                to="/settings?section=privacy"
                className="text-xs text-center text-muted-foreground hover:text-foreground w-full"
              >
                Set up a 6-digit PIN in Settings
              </Link>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
