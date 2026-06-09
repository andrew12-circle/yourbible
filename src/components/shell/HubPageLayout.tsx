import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface HubPageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  mainClassName?: string;
}

export function HubPageLayout({ children, title, description, mainClassName }: HubPageLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {title && (
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </header>
      )}
      <main
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
