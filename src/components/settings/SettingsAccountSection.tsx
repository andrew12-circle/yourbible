import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/settings/SettingsSectionPanel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SettingsAccountSection() {
  const { deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const onDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    const { error } = await deleteAccount();
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't delete account", description: error.message });
      return;
    }
    toast({ title: "Account deleted", description: "Your data has been removed." });
    setOpen(false);
    setConfirmText("");
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-4">
      <SettingsCard className="space-y-3">
        <div className="flex gap-3">
          <Download className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Export your journals</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Open a journal, then use the menu → <strong>Export ZIP</strong> to download entries and media.
              Export anything important during beta.
            </p>
            <Button asChild variant="link" className="h-auto p-0 mt-2 text-xs">
              <Link to="/journal">Open Journal →</Link>
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="space-y-3 border-destructive/30">
        <div className="flex gap-3">
          <Trash2 className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Permanently removes your account and all associated data. This cannot be undone.
            </p>
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="mt-3">
                  Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All journals, beliefs, highlights, and AI history will be permanently deleted.
                    Type <strong>DELETE</strong> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="delete-confirm">Confirmation</Label>
                  <Input
                    id="delete-confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!canDelete || busy}
                    onClick={(e) => {
                      e.preventDefault();
                      void onDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
