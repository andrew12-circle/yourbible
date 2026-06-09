import { MessageCircleHeart } from "lucide-react";
import { IOS_APP_BG } from "@/lib/home/iosAppPalette";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-6 w-6 rounded-md", icon: "h-3 w-3" },
  md: { box: "h-7 w-7 rounded-lg", icon: "h-3.5 w-3.5" },
  lg: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
} as const;

type Size = keyof typeof SIZES;

export function MyAiMark({ className, size = "md" }: { className?: string; size?: Size }) {
  const s = SIZES[size];
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center shadow-sm ring-1 ring-black/5", s.box, className)}
      style={{ background: IOS_APP_BG.myAi }}
      aria-hidden
    >
      <MessageCircleHeart className={cn(s.icon, "text-white")} strokeWidth={2.25} />
    </div>
  );
}
