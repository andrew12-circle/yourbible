import type { CSSProperties } from "react";
import { COVERS, coverLeatherStyle, type Cover } from "@/lib/bible/palettes";

export function resolveCover(coverId: string | undefined | null): Cover {
  return COVERS.find((c) => c.id === coverId) ?? COVERS[0]!;
}

export function coverStyle(coverId: string | undefined | null): CSSProperties {
  return coverLeatherStyle(resolveCover(coverId).leather);
}

export function pageToneClass(pageTone: string | undefined | null): string {
  return pageTone === "warm" ? "reader-page-warm" : "reader-page-cream";
}

export function leatherCoverClass(coverId: string | undefined | null): string {
  const cover = resolveCover(coverId);
  return `leather-cover--${cover.variant}`;
}
