import { Link } from "react-router-dom";
import { ChevronLeft, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { hubShellPageHeight } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

const DAWN_GRADIENT =
  "linear-gradient(165deg, #fff9f2 0%, #fde8c8 28%, #f5c878 52%, #faebd0 100%)";

type Props = {
  title?: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fillHeight?: boolean;
};

export function LivingHopeChrome({
  title = "Morning formula",
  subtitle,
  backTo = "/living-hope",
  right,
  children,
  className,
  fillHeight = true,
}: Props) {
  const { showHubShell } = useAppShellMode();

  return (
    <div
      className={cn(
        "living-hope-root bg-[#faf6f0] text-stone-900 flex flex-col relative overflow-hidden",
        showHubShell
          ? hubShellPageHeight(showHubShell)
          : fillHeight
            ? "min-h-[100dvh]"
            : "",
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none opacity-55" style={{ background: DAWN_GRADIENT }} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/50 via-transparent to-amber-100/25" />

      <style>{`
        .living-hope-root .field-input {
          background: rgb(255 255 255 / 0.92);
          border-color: hsl(32 24% 82%);
          color: hsl(24 18% 14%);
        }
        .living-hope-root .field-input::placeholder {
          color: hsl(24 12% 55%);
        }
      `}</style>

      <header className="relative z-10 flex items-center justify-between px-4 md:px-6 lg:px-10 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        {showHubShell ? (
          <div className="w-10" aria-hidden />
        ) : (
          <Link to={backTo}>
            <Button variant="ghost" size="icon" className="text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        )}
        <div className="flex items-center gap-2 text-stone-600">
          <Sunrise className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">{title}</span>
        </div>
        <div className="w-10 flex justify-end">{right}</div>
      </header>

      {subtitle ? (
        <p
          className={cn(
            "relative z-10 -mt-1 mb-2 text-sm text-stone-600",
            showHubShell ? "px-6 lg:px-10 text-left" : "px-5 text-center",
          )}
        >
          {subtitle}
        </p>
      ) : null}

      <main
        className={cn(
          "relative z-10 flex-1 flex flex-col w-full min-w-0",
          showHubShell
            ? "max-w-none mx-0 px-6 lg:px-10 xl:px-12 pb-6 overflow-y-auto"
            : "max-w-lg mx-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export { DAWN_GRADIENT };
