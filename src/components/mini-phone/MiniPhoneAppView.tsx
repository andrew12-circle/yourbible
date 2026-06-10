import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MiniPhoneErrorBoundary } from "@/components/mini-phone/MiniPhoneErrorBoundary";
import { MiniPhoneRootProviders } from "@/components/mini-phone/MiniPhoneRootProviders";
import { createMiniPhoneRouter } from "@/lib/mini-phone/miniPhoneRouter";
import { loadMiniPhoneActiveRoute } from "@/lib/mini-phone/miniPhoneStorage";

interface MiniPhoneAppViewProps {
  entryRoute: string;
}

export function MiniPhoneAppView({ entryRoute }: MiniPhoneAppViewProps) {
  const auth = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);
  const routerRef = useRef<ReturnType<typeof createMiniPhoneRouter> | null>(null);
  const initialEntry = useRef(loadMiniPhoneActiveRoute() ?? entryRoute).current;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const router = createMiniPhoneRouter(initialEntry);
    routerRef.current = router;
    const root = createRoot(el);
    rootRef.current = root;

    return () => {
      root.unmount();
      rootRef.current = null;
      routerRef.current = null;
    };
  }, [initialEntry]);

  useEffect(() => {
    const root = rootRef.current;
    const router = routerRef.current;
    if (!root || !router) return;

    root.render(
      <MiniPhoneRootProviders auth={auth}>
        <MiniPhoneErrorBoundary>
          <RouterProvider router={router} />
        </MiniPhoneErrorBoundary>
      </MiniPhoneRootProviders>,
    );
  }, [auth, initialEntry]);

  return (
    <div
      ref={containerRef}
      data-mini-phone-app
      className="relative isolate flex h-full w-full max-w-full flex-col overflow-hidden [transform:translateZ(0)]"
    />
  );
}
