/** Monogram avatar helpers for entity / influence cards. */

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function monogramGradient(name: string): string {
  const h = hashString(name.toLowerCase());
  const h1 = h % 360;
  const h2 = (h1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${h1} 42% 38%), hsl(${h2} 46% 28%))`;
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function isPersonEntityKind(kind: string): boolean {
  return kind === "person";
}

export function entityKindSectionLabel(kind: string): "people" | "themes" {
  return isPersonEntityKind(kind) ? "people" : "themes";
}
