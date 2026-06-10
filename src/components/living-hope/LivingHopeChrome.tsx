import { Link } from "react-router-dom";
import { ChevronLeft, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAWN_GRADIENT =
  "linear-gradient(160deg, #1a1208 0%, #4a3020 35%, #c4783a 70%, #f0c878 100%)";

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
  return (
    <div
      className={cn(
        "bg-[#0a0806] text-white flex flex-col relative overflow-hidden",
        fillHeight ? "min-h-[100dvh]" : "",
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: DAWN_GRADIENT }} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/85" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link to={backTo}>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-white/70">
          <Sunrise className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">{title}</span>
        </div>
        <div className="w-10 flex justify-end">{right}</div>
      </header>

      {subtitle ? (
        <p className="relative z-10 px-5 -mt-1 mb-2 text-sm text-white/55 text-center">{subtitle}</p>
      ) : null}

      <main className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

export { DAWN_GRADIENT };
