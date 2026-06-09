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
    <>
      {title && (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 shrink-0">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-sm font-semibold">{title}</h1>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </header>
      )}
      <main className={cn("flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-6", mainClassName)}>
        {children}
      </main>
    </>
  );
}
