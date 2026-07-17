import { useEffect } from "react";
import { toast } from "sonner";
import { stripAppRefreshParam } from "@/lib/pwa/forceAppRefresh";

/**
 * When a new build is deployed, the service worker fetches it in the background.
 * Prompt the user to refresh — no need to clear cookies or site data.
 */
export function PwaUpdatePrompt() {
  useEffect(() => {
    stripAppRefreshParam();

    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let toastId: string | number | undefined;
    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

    const showRefreshToast = () => {
      if (disposed || toastId != null) return;
      toastId = toast("Update available", {
        description: "Tap Refresh to load the latest version. You stay signed in.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => {
            void updateSW?.(true);
          },
        },
      });
    };

    void import("virtual:pwa-register").then(({ registerSW }) => {
      if (disposed) return;

      updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          showRefreshToast();
        },
      });
    });

    const checkForUpdates = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.serviceWorker.getRegistration().then((registration) => {
        void registration?.update();
      });
    };

    document.addEventListener("visibilitychange", checkForUpdates);
    window.addEventListener("focus", checkForUpdates);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", checkForUpdates);
      window.removeEventListener("focus", checkForUpdates);
      if (toastId != null) toast.dismiss(toastId);
    };
  }, []);

  return null;
}
