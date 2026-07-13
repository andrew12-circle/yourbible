import { Crown, Heart, ShieldCheck, Sparkles } from "lucide-react";
import type { ChildrenBookSymbol } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

const symbolClasses: Record<ChildrenBookSymbol, string> = {
  crown: "bg-amber-500 text-white shadow-amber-900/20",
  heart: "bg-rose-500 text-white shadow-rose-900/20",
  light: "bg-sky-500 text-white shadow-sky-900/20",
  shield: "bg-emerald-500 text-white shadow-emerald-900/20",
};

export function StorySymbol({
  symbol,
  className,
  compact = false,
}: {
  symbol: ChildrenBookSymbol;
  className?: string;
  compact?: boolean;
}) {
  const iconClass = compact ? "h-5 w-5" : "h-8 w-8";
  const icons = {
    crown: <Crown className={iconClass} aria-hidden />,
    heart: <Heart className={iconClass} aria-hidden />,
    light: <Sparkles className={iconClass} aria-hidden />,
    shield: <ShieldCheck className={iconClass} aria-hidden />,
  } satisfies Record<ChildrenBookSymbol, JSX.Element>;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full shadow-lg",
        compact ? "h-10 w-10" : "h-16 w-16",
        symbolClasses[symbol],
        className,
      )}
    >
      {icons[symbol]}
    </span>
  );
}
