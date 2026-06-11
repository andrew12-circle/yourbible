import { IosAppIcon } from "@/components/home/IosAppIcon";
import type { HomeAppIcon } from "@/lib/home/homeApps";

interface HomeAppButtonProps {
  app: HomeAppIcon;
  onClick: () => void;
  /** iOS-proportional icon size (px); omit on wide layouts to use preset Tailwind sizes. */
  iconSize?: number;
}

export function HomeAppButton({ app, onClick, iconSize }: HomeAppButtonProps) {
  const Icon = app.icon;
  const labelSize = iconSize ? Math.max(10, Math.round(iconSize * 0.18)) : undefined;
  const iconLabelGap = iconSize ? Math.max(4, Math.round(iconSize * 0.07)) : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center focus:outline-none"
      style={iconLabelGap ? { gap: iconLabelGap } : undefined}
      aria-label={app.ariaLabel ?? app.label}
    >
      <div className="relative">
        {Icon && (
          <IosAppIcon
            icon={Icon}
            background={app.color}
            iconColor={app.iconColor ?? "#FFFFFF"}
            imageSrc={app.imageSrc}
            pixelSize={iconSize}
            className="transition-transform duration-150 group-active:scale-[0.92]"
          />
        )}
        {app.badge !== undefined && app.badge !== "" && (
          <span
            className={
              iconSize
                ? "absolute -top-1 -right-1 rounded-full bg-[#FF3B30] text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)] border-[1.5px] border-white flex items-center justify-center tabular-nums leading-none"
                : "absolute -top-1 -right-1 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#FF3B30] text-white text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)] border-[1.5px] border-white flex items-center justify-center tabular-nums leading-none"
            }
            style={
              iconSize
                ? {
                    minWidth: Math.round(iconSize * 0.36),
                    height: Math.round(iconSize * 0.36),
                    fontSize: Math.max(9, Math.round(iconSize * 0.2)),
                    paddingInline: Math.round(iconSize * 0.08),
                  }
                : undefined
            }
          >
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span
        className={
          labelSize
            ? "font-medium text-white tracking-tight leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
            : "text-[10.5px] sm:text-[11.5px] font-medium text-white tracking-tight leading-none mt-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
        }
        style={labelSize ? { fontSize: labelSize } : undefined}
      >
        {app.label}
      </span>
    </button>
  );
}
