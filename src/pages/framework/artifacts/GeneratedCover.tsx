import type { LucideIcon } from "lucide-react";
import { BookOpen, MessageCircle, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { hashHueFromId, titleInitials } from "./artifactLibraryModel";

type CoverVariant = "document" | "chat" | "voice";

interface Props {
  artifactId: string;
  title: string;
  variant: CoverVariant;
  className?: string;
}

const cornerIconClass = "absolute right-2.5 top-2.5 rounded-lg bg-white/15 p-1.5 text-white/95 shadow-sm backdrop-blur-[2px]";

function gradientForId(id: string): string {
  const h = hashHueFromId(id);
  const h2 = (h + 38) % 360;
  return `linear-gradient(155deg, hsl(${h} 52% 38%) 0%, hsl(${h2} 48% 28%) 55%, hsl(${(h + 120) % 360} 35% 22%) 100%)`;
}

export function GeneratedCover({ artifactId, title, variant, className }: Props) {
  const initials = titleInitials(title);
  let Icon: LucideIcon = BookOpen;
  if (variant === "chat") Icon = MessageCircle;
  if (variant === "voice") Icon = Mic;

  return (
    <div
      className={cn("relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[inherit]", className)}
      style={{ background: gradientForId(artifactId) }}
      aria-hidden
    >
      <div className={cn(cornerIconClass)}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      {variant === "chat" ? (
        <div className="pointer-events-none absolute left-1/2 top-[18%] w-[78%] -translate-x-1/2 rounded-2xl border border-white/25 bg-white/12 px-3 py-2.5 shadow-lg backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-white/35" />
          <div className="mt-2 space-y-1.5">
            <div className="h-1 rounded-full bg-white/25" style={{ width: "88%" }} />
            <div className="h-1 rounded-full bg-white/20" style={{ width: "62%" }} />
          </div>
        </div>
      ) : variant === "voice" ? (
        <div className="pointer-events-none absolute inset-x-6 top-[22%] flex h-14 items-end justify-between gap-0.5 opacity-90">
          {[0.35, 0.55, 0.85, 0.45, 0.7, 0.5, 0.9, 0.4, 0.65, 0.8, 0.5, 0.35].map((h, i) => (
            <div key={i} className="flex-1 rounded-full bg-white/35" style={{ height: `${h * 100}%` }} />
          ))}
        </div>
      ) : null}
      <div className="relative z-[1] px-3 pb-4 pt-10">
        <div
          className="select-none font-serif text-[2.1rem] font-semibold leading-none tracking-tight text-white drop-shadow-md sm:text-[2.35rem]"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}
        >
          {initials}
        </div>
        {variant === "document" ? (
          <BookOpen className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 text-white/[0.07]" strokeWidth={1} />
        ) : null}
      </div>
    </div>
  );
}
