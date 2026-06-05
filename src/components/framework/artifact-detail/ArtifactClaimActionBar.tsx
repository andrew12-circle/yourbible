import { FloatingTabBarShell } from "@/components/navigation/FloatingTabBar";
import {
  renderArtifactDetailClaimEngageActions,
  renderArtifactDetailClaimVerdictActions,
  type RenderClaimCardClaim,
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import { cn } from "@/lib/utils";

type Props = {
  claim: RenderClaimCardClaim;
  context: RenderClaimCardContext;
  bordered?: boolean;
  className?: string;
  /** `top` — under claim header (desktop); `bottom` — thumb dock (mobile). */
  placement?: "top" | "bottom";
  /** Centered floating pill — matches MobileAppDock (insight explore). */
  floating?: boolean;
};

/** Claim actions — frosted dock shell with scrollable tab-style buttons. */
export default function ArtifactClaimActionBar({
  claim,
  context,
  bordered = false,
  className,
  placement = "bottom",
  floating = false,
}: Props) {
  const atTop = placement === "top";

  const toolbar = (
    <FloatingTabBarShell
      tone="surface"
      className={cn("h-auto", floating ? "pointer-events-auto" : "w-full max-w-none")}
    >
      <div
        role="toolbar"
        aria-label="Claim actions"
        className={cn(
          "flex w-full min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto scrollbar-hide",
          "touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch]",
        )}
      >
        {renderArtifactDetailClaimEngageActions(claim, context, {
          variant: "labeled",
          appearance: "dock",
        })}
        {renderArtifactDetailClaimVerdictActions(claim, context, {
          variant: "labeled",
          appearance: "dock",
        })}
      </div>
    </FloatingTabBarShell>
  );

  if (floating) {
    return (
      <nav
        className={cn(
          "absolute inset-x-0 bottom-0 z-[45] flex shrink-0 justify-center px-4",
          "pointer-events-none pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2",
          className,
        )}
      >
        {toolbar}
      </nav>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 justify-center px-3",
        atTop ? "border-b border-border/40 pb-3 pt-1" : "pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        bordered && !atTop && "border-t border-border/50",
        className,
      )}
    >
      {toolbar}
    </div>
  );
}
