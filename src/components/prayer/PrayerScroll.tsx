import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Section label above the scroll. Omit or pass empty to hide. */
  label?: string;
  /** display = read-only; card = compact list tile; compose = wraps a textarea; chat = inline assistant prayer */
  variant?: "display" | "card" | "compose" | "chat";
  as?: "section" | "div" | "article";
};

export default function PrayerScroll({
  children,
  className,
  bodyClassName,
  label = "Prayer",
  variant = "display",
  as: Tag = "section",
}: Props) {
  const showLabel = Boolean(label) && variant !== "card";

  return (
    <Tag className={cn(showLabel && "space-y-2", className)}>
      {showLabel ? (
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-gold-deep">
          <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label}
        </div>
      ) : null}
      <div className={cn("prayer-scroll", `prayer-scroll--${variant}`)}>
        <div className="prayer-scroll-roll prayer-scroll-roll-top" aria-hidden />
        <div className={cn("prayer-scroll-body prayer-scroll-parchment", bodyClassName)}>{children}</div>
        <div className="prayer-scroll-roll prayer-scroll-roll-bottom" aria-hidden />
      </div>
    </Tag>
  );
}
