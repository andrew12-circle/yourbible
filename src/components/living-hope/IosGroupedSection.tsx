import { Link } from "react-router-dom";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IosGroupedSection({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-5", className)}>
      {title ? (
        <h3 className="px-1 pb-1.5 text-[13px] font-medium text-muted-foreground">{title}</h3>
      ) : null}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60 shadow-sm shadow-black/[0.02]">
        {children}
      </div>
      {footer ? (
        <p className="px-1 pt-1.5 text-[12px] text-muted-foreground leading-relaxed">{footer}</p>
      ) : null}
    </section>
  );
}

const rowClass =
  "flex items-center gap-3 px-4 py-3 min-h-[44px] w-full text-left transition-colors active:bg-muted/60 hover:bg-muted/40";

export function IosGroupedRow({
  to,
  onClick,
  icon: Icon,
  label,
  detail,
  trailing,
  done,
}: {
  to?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  label: string;
  detail?: string;
  trailing?: React.ReactNode;
  done?: boolean;
}) {
  const inner = (
    <>
      {Icon ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/80">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-foreground leading-snug flex items-center gap-1.5">
          {done ? <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden /> : null}
          {label}
        </p>
        {detail ? <p className="text-[13px] text-muted-foreground truncate">{detail}</p> : null}
      </div>
      {trailing ?? <ChevronRight className="w-4 h-4 text-muted-foreground/35 shrink-0" aria-hidden />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={rowClass}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  }
  return <div className={rowClass}>{inner}</div>;
}
