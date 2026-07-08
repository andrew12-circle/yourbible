import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MiniPhoneErrorBoundary } from "@/components/mini-phone/MiniPhoneErrorBoundary";
import { MiniPhoneRootProviders } from "@/components/mini-phone/MiniPhoneRootProviders";
import { createMiniPhoneRouter } from "@/lib/mini-phone/miniPhoneRouter";
import { loadMiniPhoneActiveRoute } from "@/lib/mini-phone/miniPhoneStorage";
import { IPHONE_PRO_MAX_WIDTH_PT } from "@/lib/mini-phone/miniPhoneDimensions";

interface MiniPhoneAppViewProps {
  entryRoute: string;
}

export function MiniPhoneAppView({ entryRoute }: MiniPhoneAppViewProps) {
  const auth = useAuth();
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);
  const routerRef = useRef<ReturnType<typeof createMiniPhoneRouter> | null>(null);
  const initialEntry = useRef(loadMiniPhoneActiveRoute() ?? entryRoute).current;
  const [viewport, setViewport] = useState({
    scale: 1,
    height: 1,
  });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (width <= 0 || height <= 0) return;

      const scale = width / IPHONE_PRO_MAX_WIDTH_PT;
      setViewport((prev) => {
        const next = {
          scale,
          height: height / scale,
        };
        if (Math.abs(prev.scale - next.scale) < 0.001 && Math.abs(prev.height - next.height) < 0.5) {
          return prev;
        }
        return next;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

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
      ref={frameRef}
      data-mini-phone-app
      data-mobile="true"
      className="relative isolate flex h-full w-full max-w-full flex-col overflow-hidden [transform:translateZ(0)]"
    >
      <div
        ref={containerRef}
        className="relative isolate flex shrink-0 flex-col overflow-hidden"
        style={{
          width: IPHONE_PRO_MAX_WIDTH_PT,
          height: viewport.height,
          transform: `scale(${viewport.scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
