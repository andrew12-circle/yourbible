import { formatFormalGreetingName } from "@/lib/profile/displayName";

/** Second-line hooks for the empty-state greeting — rotated each visit. */
export const WELCOME_TAIL_PHRASES = [
  "Ready to dive in?",
  "What's on your mind?",
  "Where shall we start?",
  "Good to see you again.",
  "What are we exploring today?",
  "I'm here when you're ready.",
  "What question is stirring?",
  "Ready when you are.",
  "What can I help you think through?",
  "Let's start with what's on your heart.",
  "What would you like to unpack?",
  "What's been weighing on you?",
  "Where do you want to go first?",
  "Tell me what you're sitting with.",
  "What's the question behind the question?",
] as const;

type PickIndex = () => number;

function defaultPickIndex(): number {
  return Math.floor(Math.random() * WELCOME_TAIL_PHRASES.length);
}

/** ChatGPT-style empty-state headline for Lumen AI — varies the tail each call. */
export function myAiWelcomeGreeting(displayName: string, pickIndex: PickIndex = defaultPickIndex): string {
  const tail = WELCOME_TAIL_PHRASES[pickIndex() % WELCOME_TAIL_PHRASES.length];
  const formal = displayName.trim() ? formatFormalGreetingName(displayName) : "";
  if (formal) return `Hey, ${formal}. ${tail}`;
  return `Hey. ${tail}`;
}
