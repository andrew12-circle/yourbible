import { cn } from "@/lib/utils";

/** Vintage flip lighter — Lumen means light. */
export function LumenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M12 2.75c.85 1.15 1.55 2 1.55 3.25a1.55 1.55 0 0 1-3.1 0C10.45 4.75 11.15 3.9 12 2.75z" />
      <path d="M9 9.25V7.1a3 3 0 0 1 6 0v2.15" />
      <path d="M8.25 9.25h7.5l.85 3.75H7.4z" />
      <path d="M7.75 13.25h8.5a.85.85 0 0 1 .85.85v6.4a.85.85 0 0 1-.85.85H7.75a.85.85 0 0 1-.85-.85v-6.4a.85.85 0 0 1 .85-.85z" />
      <path d="M10.25 13.25h3.5" />
      <circle cx="15.65" cy="17.1" r="1.15" />
      <path d="M7.75 13.25V11.9" />
    </svg>
  );
}
