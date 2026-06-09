import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniPhoneProvider } from "@/contexts/MiniPhoneContext";
import { HomeDashboardProvider } from "@/contexts/HomeDashboardContext";
import { HubSidebar } from "@/components/shell/HubSidebar";
import { SidebarPeekTab } from "@/components/shell/SidebarPeekTab";
import { HubTopBar } from "@/components/shell/HubTopBar";
import { FloatingPhoneBubble } from "@/components/mini-phone/FloatingPhoneBubble";
import { MiniPhoneDrawer } from "@/components/mini-phone/MiniPhoneDrawer";

function ContentSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function HubShell({ children }: { children: ReactNode }) {
  return (
    <MiniPhoneProvider>
      <HomeDashboardProvider>
        <SidebarProvider className="bg-muted/40 bg-fabric min-h-svh">
          <HubSidebar />
          <SidebarPeekTab />
          <SidebarInset className="min-h-svh sm:my-2 sm:mr-2 sm:rounded-xl border border-border/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <HubTopBar />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <Suspense fallback={<ContentSkeleton />}>
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
