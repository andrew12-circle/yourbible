/** Accounts that get AI writing assist on by default (founder / internal). */
const DEFAULT_ON_EMAILS = new Set([
  "andrew@beliefarchitecture.app",
]);

function extraDefaultOnEmails(): string[] {
  const raw = import.meta.env.VITE_AI_WRITING_ASSIST_DEFAULT_ON_EMAILS as string | undefined;
  if (!raw?.trim()) return [];
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export type AiWritingAssistUser = {
  email?: string | null;
  displayName?: string | null;
};

/** True when AI writing assist should start enabled before the user chooses. */
export function isAiWritingAssistDefaultOn(user: AiWritingAssistUser): boolean {
  const email = (user.email ?? "").trim().toLowerCase();
  if (email && (DEFAULT_ON_EMAILS.has(email) || extraDefaultOnEmails().includes(email))) {
    return true;
  }

  const name = (user.displayName ?? "").trim().toLowerCase();
  return name === "andrew heisley";
}

/** Show privacy warning before turning assist on (everyone except default-on accounts). */
export function shouldWarnBeforeEnablingAiWritingAssist(user: AiWritingAssistUser): boolean {
  return !isAiWritingAssistDefaultOn(user);
}
