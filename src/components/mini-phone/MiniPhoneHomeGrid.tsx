import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { IosAppIcon } from "@/components/home/IosAppIcon";
import { useMiniPhoneSize } from "@/hooks/useMiniPhoneSize";
import type { HomeAppIcon } from "@/lib/home/homeApps";

interface MiniPhoneHomeGridProps {
  apps: HomeAppIcon[];
  wallpaper: string | null;
  wallpaperTint: number;
  wallpaperBlur: number;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function MiniPhoneHomeGrid({ apps, wallpaper, wallpaperTint, wallpaperBlur }: MiniPhoneHomeGridProps) {
  const navigate = useNavigate();
  const now = useNow();
  const { compact } = useMiniPhoneSize();

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const bgStyle = wallpaper
    ? {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  const openApp = (app: HomeAppIcon) => {
    if (app.onOpen) app.onOpen();
    else if (app.to) navigate(app.to);
  };

  return (
    <div
      className={cn(
        "h-full w-full overflow-y-auto flex flex-col relative",
        wallpaper ? "" : "ios-wallpaper",
        compact ? "px-2.5 pt-6 pb-4" : "px-4 pt-8 pb-6",
      )}
      style={bgStyle}
    >
      {wallpaper && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backdropFilter: `blur(${wallpaperBlur}px)` }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `rgba(17, 24, 39, ${wallpaperTint / 100})` }}
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 text-center text-white select-none drop-shadow-lg",
          compact ? "mt-2" : "mt-4",
        )}
      >
        <div className={compact ? "text-[10px] font-medium opacity-90" : "text-xs font-medium opacity-90"}>
          {date}
        </div>
        <div
          className={cn(
            "font-light tracking-tight leading-none mt-1 tabular-nums",
            compact ? "text-4xl" : "text-5xl",
          )}
        >
          {time}
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 grid grid-cols-4 mt-6",
          compact ? "gap-x-2 gap-y-3" : "gap-x-3 gap-y-4",
        )}
      >
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.label}
              type="button"
              onClick={() => openApp(app)}
              className="group flex flex-col items-center gap-1 focus:outline-none"
              aria-label={app.ariaLabel ?? app.label}
            >
              <div className="relative">
                {Icon && (
                  <IosAppIcon
                    icon={Icon}
                    background={app.color}
                    iconColor={app.iconColor ?? "#FFFFFF"}
                    imageSrc={app.imageSrc}
                    className={cn(
                      "transition-transform group-active:scale-90",
                      compact ? "!w-11 !h-11" : "!w-[52px] !h-[52px]",
                    )}
                  />
                )}
                {app.badge !== undefined && app.badge !== "" && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 rounded-full bg-[#FF3B30] text-white font-semibold flex items-center justify-center ring-2 ring-white/90 shadow tabular-nums",
                      compact ? "min-w-[16px] h-[16px] px-1 text-[9px]" : "min-w-[20px] h-[20px] px-1.5 text-[11px]",
                    )}
                  >
                    {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "font-medium text-white tracking-tight leading-tight text-center drop-shadow-md",
                  compact ? "text-[9px]" : "text-[10px]",
                )}
              >
                {app.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
    </div>
  );
}
