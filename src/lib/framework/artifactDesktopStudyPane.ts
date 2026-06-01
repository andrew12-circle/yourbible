/** Desktop premium YouTube study column — one primary pane per top nav tab. */
export type DesktopPremiumStudyPane =
  | "overview"
  | "claims"
  | "chapters"
  | "teachings"
  | "entities"
  | "capture";

export function resolveDesktopPremiumStudyPane(hash: string): DesktopPremiumStudyPane {
  const id = hash.replace(/^#/, "") || "overview";
  if (id === "claims" || id === "claims-index") return "claims";
  if (id === "chapters") return "chapters";
  if (id === "study-spine-teachings") return "teachings";
  if (id === "entities") return "entities";
  if (id === "capture" || id === "notes") return "capture";
  return "overview";
}
