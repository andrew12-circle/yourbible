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
};

/** Claim actions — frosted bar shell (app dock) with tag-style chip pills. */
export default function ArtifactClaimActionBar({
  claim,
  context,
  bordered = false,
  className,
  placement = "bottom",
}: Props) {
  const atTop = placement === "top";

  return (
    <div
      className={cn(
        "shrink-0 px-3",
        atTop ? "border-b border-border/40 pb-3 pt-1" : "pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        bordered && !atTop && "border-t border-border/50",
        className,
      )}
    >
      <FloatingTabBarShell
        tone="surface"
        className="h-auto w-full max-w-none rounded-2xl px-2 py-2 sm:rounded-full"
      >
        <div
          role="toolbar"
          aria-label="Claim actions"
          className={cn(
            "flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide",
            "[-webkit-overflow-scrolling:touch]",
          )}
        >
          {renderArtifactDetailClaimEngageActions(claim, context, {
            variant: "labeled",
            appearance: "chip",
          })}
          <span className="mx-0.5 h-8 w-px shrink-0 bg-border/50" aria-hidden />
          {renderArtifactDetailClaimVerdictActions(claim, context, {
            variant: "labeled",
            appearance: "chip",
          })}
        </div>
      </FloatingTabBarShell>
    </div>
  );
}
