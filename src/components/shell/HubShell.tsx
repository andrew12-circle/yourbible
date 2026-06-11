import { Suspense, useLayoutEffect, useRef, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MiniPhoneProvider } from "@/contexts/MiniPhoneContext";
import { HomeDashboardProvider } from "@/contexts/HomeDashboardContext";
import { HubSidebar } from "@/components/shell/HubSidebar";
import { SidebarPeekTab } from "@/components/shell/SidebarPeekTab";
import { HubContentSkeleton } from "@/components/shell/HubContentSkeleton";
import { FloatingPhoneBubble } from "@/components/mini-phone/FloatingPhoneBubble";
import { MiniPhoneDrawer } from "@/components/mini-phone/MiniPhoneDrawer";

function useHubViewportHeight(ref: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const sync = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--hub-viewport-h", `${Math.round(h)}px`);
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [ref]);
}

export function HubShell({ children }: { children: ReactNode }) {
  const layoutRootRef = useRef<HTMLDivElement>(null);
  useHubViewportHeight(layoutRootRef);

  return (
    <MiniPhoneProvider>
      <HomeDashboardProvider>
        <SidebarProvider
          ref={layoutRootRef}
          className="hub-shell h-svh max-h-svh min-h-0 overflow-hidden bg-muted/40 bg-fabric"
        >
          <HubSidebar />
          <SidebarPeekTab />
          <SidebarInset className="hub-content-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/30 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] !min-h-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Suspense fallback={<HubContentSkeleton />}>
                {children}
              </Suspense>
            </div>
          </SidebarInset>
          <FloatingPhoneBubble />
          <MiniPhoneDrawer />
        </SidebarProvider>
      </HomeDashboardProvider>
    </MiniPhoneProvider>
  );
}
