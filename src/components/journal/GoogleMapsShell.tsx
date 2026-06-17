import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { APIProvider, APILoadingStatus, useApiLoadingStatus, useMap } from "@vis.gl/react-google-maps";
import { AlertTriangle } from "lucide-react";
import { getGoogleMapsApiKey } from "@/lib/maps/googleMaps";
import { cn } from "@/lib/utils";

const GoogleMapsFailContext = createContext<(() => void) | null>(null);

interface ShellProps {
  apiKey: string;
  fallback: ReactNode;
  className?: string;
  height?: number;
  children: ReactNode;
}

export function GoogleMapErrorDetector() {
  const onError = useContext(GoogleMapsFailContext);
  const map = useMap();
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (!onError) return;
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onError();
    }
  }, [onError, status]);

  useEffect(() => {
    if (!map || !onError) return;
    const root = map.getDiv();
    const timer = window.setTimeout(() => {
      if (root.querySelector(".gm-err-container, .gm-err-message")) onError();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [map, onError]);

  return null;
}

function ApiLoadGuard() {
  const onError = useContext(GoogleMapsFailContext);
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (!onError) return;
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onError();
    }
  }, [onError, status]);

  return null;
}

function GoogleMapsSetupBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-foreground/90">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <p>
        Google Maps could not load. In{" "}
        <a
          href="https://console.cloud.google.com/google/maps-apis/api-list"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Google Cloud Console
        </a>
        , enable <strong>Maps JavaScript API</strong> for this project, turn on billing, and allow{" "}
        <code className="text-[10px]">localhost:8083</code> on the API key.
      </p>
    </div>
  );
}

function GoogleMapsShell({ apiKey, fallback, className, height, children }: ShellProps) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (failed) {
    return (
      <div className={cn("space-y-2", className)}>
        <GoogleMapsSetupBanner />
        {fallback}
      </div>
    );
  }

  return (
    <GoogleMapsFailContext.Provider value={onError}>
      <div className={cn("overflow-hidden", className)} style={height ? { height } : undefined}>
        <APIProvider apiKey={apiKey} onError={onError}>
          <ApiLoadGuard />
          {children}
        </APIProvider>
      </div>
    </GoogleMapsFailContext.Provider>
  );
}

export default memo(GoogleMapsShell);

export function useJournalGoogleMapsKey(): string | null {
  return getGoogleMapsApiKey();
}
