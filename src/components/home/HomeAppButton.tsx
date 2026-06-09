import { IosAppIcon } from "@/components/home/IosAppIcon";
import type { HomeAppIcon } from "@/lib/home/homeApps";

interface HomeAppButtonProps {
  app: HomeAppIcon;
  onClick: () => void;
}

export function HomeAppButton({ app, onClick }: HomeAppButtonProps) {
  const Icon = app.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 sm:gap-[7px] focus:outline-none"
      aria-label={app.ariaLabel ?? app.label}
    >
      <div className="relative">
        {Icon && (
          <IosAppIcon
            icon={Icon}
            background={app.color}
            iconColor={app.iconColor ?? "#FFFFFF"}
            imageSrc={app.imageSrc}
            className="transition-transform duration-150 group-active:scale-[0.92]"
          />
        )}
        {app.badge !== undefined && app.badge !== "" && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#FF3B30] text-white text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)] border-[1.5px] border-white flex items-center justify-center tabular-nums leading-none">
            {typeof app.badge === "number" && app.badge > 99 ? "99+" : app.badge}
          </span>
        )}
      </div>
      <span className="text-[10.5px] sm:text-[11.5px] font-medium text-white tracking-tight leading-none mt-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
        {app.label}
      </span>
    </button>
  );
}
