/** Scroll a claim card or section anchor into view (vertical pane + optional horizontal rail). */
export function scrollArtifactClaimIntoView(
  element: Element | null | undefined,
  options?: { horizontalRail?: boolean },
) {
  if (!element) return;
  element.scrollIntoView({
    behavior: "smooth",
    block: options?.horizontalRail ? "nearest" : "start",
    inline: options?.horizontalRail ? "center" : "nearest",
  });
}
