const LS_BETA_WELCOME_DISMISSED = "belief-architecture-beta-welcome-dismissed";
const LS_BETA_WELCOME_PENDING = "belief-architecture-beta-welcome-pending";

export function markBetaWelcomePending(): void {
  try {
    localStorage.setItem(LS_BETA_WELCOME_PENDING, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowBetaWelcome(): boolean {
  try {
    if (localStorage.getItem(LS_BETA_WELCOME_DISMISSED) === "1") return false;
    return localStorage.getItem(LS_BETA_WELCOME_PENDING) === "1";
  } catch {
    return false;
  }
}

export function markBetaWelcomeShown(): void {
  try {
    localStorage.setItem(LS_BETA_WELCOME_DISMISSED, "1");
    localStorage.removeItem(LS_BETA_WELCOME_PENDING);
  } catch {
    /* ignore */
  }
}
