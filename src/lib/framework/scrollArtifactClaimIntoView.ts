const CLAIMS_RAIL_SELECTOR = "[data-claims-rail]";

function scrollClaimsRailToElement(element: Element, behavior: ScrollBehavior = "smooth") {
  const rail = element.closest(CLAIMS_RAIL_SELECTOR) as HTMLElement | null;
  if (!rail) return false;

  const railRect = rail.getBoundingClientRect();
  const elRect = element.getBoundingClientRect();
  const targetLeft =
    rail.scrollLeft + (elRect.left - railRect.left) - (railRect.width - elRect.width) / 2;

  const left = Math.max(0, targetLeft);
  if (typeof rail.scrollTo === "function") {
    rail.scrollTo({ left, behavior });
  } else {
    rail.scrollLeft = left;
  }
  return true;
}

/** Scroll a claim card or section anchor into view (vertical pane + optional horizontal rail). */
export function scrollArtifactClaimIntoView(
  element: Element | null | undefined,
  options?: { horizontalRail?: boolean },
) {
  if (!element) return;

  if (options?.horizontalRail && scrollClaimsRailToElement(element)) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: options?.horizontalRail ? "nearest" : "start",
    inline: options?.horizontalRail ? "center" : "nearest",
  });
}
