function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Normalize a raw name or email-local username for greeting display. */
export function formatDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withWordBreaks = trimmed
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");

  return withWordBreaks
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null;

type ProfileLike = {
  display_name?: string | null;
  full_name?: string | null;
} | null;

function metaString(user: UserLike, key: string): string | null {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function resolveProfileDisplayName(profile: ProfileLike, user: UserLike): string {
  const candidates = [
    profile?.display_name,
    profile?.full_name,
    metaString(user, "display_name"),
    metaString(user, "full_name"),
    metaString(user, "name"),
    user?.email?.split("@")[0],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return formatDisplayName(candidate);
    }
  }

  return "";
}
