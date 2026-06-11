import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { hubShellPageHeight } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fillHeight?: boolean;
  /** Hub landing: large title lives in page body, not the nav bar. */
  hubLanding?: boolean;
};

export function LivingHopeChrome({
  title = "Morning formula",
  subtitle,
  backTo = "/living-hope",
  right,
  children,
  className,
  fillHeight = true,
  hubLanding = false,
}: Props) {
  const { showHubShell } = useAppShellMode();
  const showNav = !hubLanding || !showHubShell;
  /** Sub-pages always get back — hub landing relies on sidebar / home navigation. */
  const showBack = !hubLanding;
  const backLabel = backTo === "/living-hope" ? "Morning formula" : "Back";

  return (
    <div
      className={cn(
        "living-hope-root flex flex-col relative overflow-hidden",
        showHubShell ? "bg-transparent text-foreground" : "bg-background text-foreground min-h-[100dvh]",
        showHubShell
          ? hubShellPageHeight(showHubShell)
          : fillHeight
            ? "min-h-[100dvh]"
            : "",
        className,
      )}
    >
      {showNav ? (
        <header className="relative z-10 flex items-center justify-between px-4 md:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 shrink-0">
          {showBack ? (
            <Link to={backTo}>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary -ml-2 h-9 px-2 font-normal text-[17px] gap-0.5 max-w-[42vw] sm:max-w-none"
              >
                <ChevronLeft className="w-5 h-5 -mr-0.5 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{backLabel}</span>
              </Button>
            </Link>
          ) : (
            <div className="w-9 shrink-0" aria-hidden />
          )}
          <span className="text-[15px] font-semibold tracking-tight truncate max-w-[50%]">{title}</span>
          <div className="flex justify-end shrink-0 min-w-[3.25rem] -mr-1 pt-0.5">{right}</div>
        </header>
      ) : null}

      {subtitle && showNav ? (
        <p
          className={cn(
            "relative z-10 px-4 md:px-6 -mt-0.5 mb-2 text-[13px] text-muted-foreground text-center",
            showHubShell && "md:text-left md:px-6 lg:px-8",
          )}
        >
          {subtitle}
        </p>
      ) : null}

      <main
        className={cn(
          "relative z-10 flex-1 flex flex-col w-full min-w-0 min-h-0",
          showHubShell
            ? "max-w-none mx-0 px-4 md:px-6 lg:px-8 pb-6 overflow-y-auto scrollbar-hide"
            : "max-w-lg mx-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
