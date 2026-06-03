import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type Props = {
  /** When true, show even if online (e.g. serving stale cached passage after network error). */
  showCachedHint?: boolean;
};

export default function OfflineBanner({ showCachedHint = false }: Props) {
  const online = useOnlineStatus();

  if (online && !showCachedHint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-900/95 text-amber-50 px-4 py-2 text-xs font-medium shadow-md pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {online
        ? "Reading from a saved copy — reconnecting in the background."
        : "You are offline — showing saved chapters when available."}
    </div>
  );
}
