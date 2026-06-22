import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  photoUrl?: string;
  videoUrl?: string;
  /** Compact row thumbnail (list pane) vs larger (mobile / life page). */
  size?: "sm" | "md" | "fill";
  className?: string;
};

const sizeClasses = {
  sm: "h-12 w-12 rounded-md",
  md: "h-[68px] w-[68px] rounded-xl",
  fill: "h-full w-full rounded-none",
} as const;

export default function EntryListMediaThumbnail({
  photoUrl,
  videoUrl,
  size = "sm",
  className,
}: Props) {
  const box = cn("relative flex-shrink-0 overflow-hidden bg-muted", sizeClasses[size], className);

  if (photoUrl) {
    return <img src={photoUrl} alt="" className={cn(box, "object-cover")} />;
  }

  if (!videoUrl) return null;

  return (
    <div className={box} aria-hidden>
      <video
        src={`${videoUrl}#t=0.5`}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-black/55 text-white",
            size === "md" ? "h-8 w-8" : size === "fill" ? "h-7 w-7" : "h-6 w-6",
          )}
        >
          <Play
            className={cn(
              "fill-current ml-0.5",
              size === "md" ? "h-4 w-4" : size === "fill" ? "h-3.5 w-3.5" : "h-3 w-3",
            )}
          />
        </div>
      </div>
    </div>
  );
}
