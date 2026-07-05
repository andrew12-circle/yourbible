import { formatFormalGreetingName } from "@/lib/profile/displayName";

/** ChatGPT-style empty-state headline for My AI. */
export function myAiWelcomeGreeting(displayName: string): string {
  const formal = displayName.trim() ? formatFormalGreetingName(displayName) : "";
  if (formal) return `Hey, ${formal}. Ready to dive in?`;
  return "Hey. Ready to dive in?";
}
