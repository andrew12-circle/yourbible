import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MiniPhoneProvider } from "@/contexts/MiniPhoneContext";
import { HomeDashboardProvider } from "@/contexts/HomeDashboardContext";
import { HubSidebar } from "@/components/shell/HubSidebar";
import { SidebarPeekTab } from "@/components/shell/SidebarPeekTab";
import { HubTopBar } from "@/components/shell/HubTopBar";
import { HubContentSkeleton } from "@/components/shell/HubContentSkeleton";
import { FloatingPhoneBubble } from "@/components/mini-phone/FloatingPhoneBubble";
import { MiniPhoneDrawer } from "@/components/mini-phone/MiniPhoneDrawer";

export function HubShell({ children }: { children: ReactNode }) {
  return (
    <MiniPhoneProvider>
      <HomeDashboardProvider>
        <SidebarProvider className="hub-shell bg-muted/40 bg-fabric min-h-svh">
          <HubSidebar />
          <SidebarPeekTab />
          <SidebarInset className="min-h-[calc(100svh-var(--hub-safe-top)-0.5rem)] sm:mt-[var(--hub-safe-top)] sm:mr-2 sm:mb-2 sm:rounded-xl border border-border/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <HubTopBar />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
