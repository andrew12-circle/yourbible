import { cn } from "@/lib/utils";
export function MorningGuidedCoach({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div data-morning-coach className={cn("pb-2", className)}><p className="text-[17px] leading-relaxed text-muted-foreground">{children}</p></div>;
}
