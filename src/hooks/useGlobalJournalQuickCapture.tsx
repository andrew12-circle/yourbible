import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createQuickJournalCaptureUrl } from "@/lib/journal/quickCapture";
import { toast } from "@/hooks/use-toast";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** Global ⌘/Ctrl+Shift+J — quick journal capture in the default notebook. */
export function GlobalJournalQuickCapture() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== "j") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();

      void (async () => {
        const href = await createQuickJournalCaptureUrl(user.id);
        if (!href) {
          toast({
            title: "Couldn't start journal entry",
            description: "Set up a default journal first.",
            variant: "destructive",
          });
          return;
        }
        navigate(href);
      })();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [user, navigate]);

  return null;
}
