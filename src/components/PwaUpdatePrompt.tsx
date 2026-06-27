import { useEffect } from "react";
import { toast } from "sonner";

/**
 * When a new build is deployed, the service worker fetches it in the background.
 * Prompt the user to refresh — no need to clear cookies or site data.
 */
export function PwaUpdatePrompt() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let toastId: string | number | undefined;

    void import("virtual:pwa-register").then(({ registerSW }) => {
      if (disposed) return;

      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          if (disposed) return;
          toastId = toast("Update available", {
            description: "Tap Refresh to load the latest version. You stay signed in.",
            duration: Infinity,
            action: {
              label: "Refresh",
              onClick: () => {
                void updateSW(true);
              },
            },
          });
        },
      });
    });

    return () => {
      disposed = true;
      if (toastId != null) toast.dismiss(toastId);
    };
  }, []);

  return null;
}
