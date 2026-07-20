import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MiniPhoneProvider } from "@/contexts/MiniPhoneContext";
import { HomeDashboardProvider } from "@/contexts/HomeDashboardContext";
import { HubSidebar } from "@/components/shell/HubSidebar";
import { SidebarPeekTab } from "@/components/shell/SidebarPeekTab";
import { HubContentSkeleton } from "@/components/shell/HubContentSkeleton";
import { FloatingPhoneBubble } from "@/components/mini-phone/FloatingPhoneBubble";
import { MiniPhoneDrawer } from "@/components/mini-phone/MiniPhoneDrawer";

export function HubShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showMiniPhone = !pathname.startsWith("/children-books");

  return (
    <MiniPhoneProvider>
      <HomeDashboardProvider>
        <SidebarProvider className="hub-shell min-h-0 overflow-hidden">
          <HubSidebar />
          <SidebarPeekTab />
          <SidebarInset className="hub-content-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/30 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Suspense fallback={<HubContentSkeleton />}>
                {children}
              </Suspense>
            </div>
          </SidebarInset>
          {showMiniPhone && (
            <>
              <FloatingPhoneBubble />
              <MiniPhoneDrawer />
            </>
          )}
        </SidebarProvider>
      </HomeDashboardProvider>
    </MiniPhoneProvider>
  );
}
