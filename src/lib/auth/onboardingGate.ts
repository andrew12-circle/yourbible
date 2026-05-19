import type { Profile } from "@/contexts/AuthContext";

/** True when first-run setup is incomplete. Only call after auth+profile loading finishes. */
export function needsOnboarding(profile: Profile | null | undefined): boolean {
  return !profile?.onboarded;
}

/** Post-auth destination: onboarding first, then optional deep link, else home. */
export function postAuthPath(
  profile: Profile | null | undefined,
  nextTarget?: string | null,
): string {
  if (needsOnboarding(profile)) return "/onboarding";
  return nextTarget ?? "/home";
}
