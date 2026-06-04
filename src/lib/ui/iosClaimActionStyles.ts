export type ClaimActionTone =
  | "research"
  | "reflect"
  | "researchLater"
  | "keep"
  | "reject"
  | "update"
  | "defer";

/** iOS system tinted (idle) and filled (active) capsule styles — static classes for Tailwind JIT. */
export const IOS_CLAIM_ACTION_STYLES: Record<ClaimActionTone, { idle: string; active: string }> = {
  research: {
    idle:
      "border-0 shadow-none bg-[#007AFF]/14 text-[#007AFF] hover:bg-[#007AFF]/20 dark:bg-[#0A84FF]/22 dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/30",
    active:
      "border-0 shadow-none bg-[#007AFF] text-white hover:bg-[#007AFF]/90 dark:bg-[#0A84FF] dark:hover:bg-[#0A84FF]/90",
  },
  reflect: {
    idle:
      "border-0 shadow-none bg-[#AF52DE]/14 text-[#AF52DE] hover:bg-[#AF52DE]/20 dark:bg-[#BF5AF2]/22 dark:text-[#BF5AF2] dark:hover:bg-[#BF5AF2]/30",
    active:
      "border-0 shadow-none bg-[#AF52DE] text-white hover:bg-[#AF52DE]/90 dark:bg-[#BF5AF2] dark:hover:bg-[#BF5AF2]/90",
  },
  researchLater: {
    idle:
      "border-0 shadow-none bg-[#FF9500]/14 text-[#FF9500] hover:bg-[#FF9500]/20 dark:bg-[#FF9F0A]/22 dark:text-[#FF9F0A] dark:hover:bg-[#FF9F0A]/30",
    active:
      "border-0 shadow-none bg-[#FF9500] text-white hover:bg-[#FF9500]/90 dark:bg-[#FF9F0A] dark:hover:bg-[#FF9F0A]/90",
  },
  keep: {
    idle:
      "border-0 shadow-none bg-[#34C759]/14 text-[#34C759] hover:bg-[#34C759]/20 dark:bg-[#30D158]/22 dark:text-[#30D158] dark:hover:bg-[#30D158]/30",
    active:
      "border-0 shadow-none bg-[#34C759] text-white hover:bg-[#34C759]/90 dark:bg-[#30D158] dark:hover:bg-[#30D158]/90",
  },
  reject: {
    idle:
      "border-0 shadow-none bg-[#FF3B30]/14 text-[#FF3B30] hover:bg-[#FF3B30]/20 dark:bg-[#FF453A]/22 dark:text-[#FF453A] dark:hover:bg-[#FF453A]/30",
    active:
      "border-0 shadow-none bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 dark:bg-[#FF453A] dark:hover:bg-[#FF453A]/90",
  },
  update: {
    idle:
      "border-0 shadow-none bg-[#5856D6]/14 text-[#5856D6] hover:bg-[#5856D6]/20 dark:bg-[#5E5CE6]/22 dark:text-[#5E5CE6] dark:hover:bg-[#5E5CE6]/30",
    active:
      "border-0 shadow-none bg-[#5856D6] text-white hover:bg-[#5856D6]/90 dark:bg-[#5E5CE6] dark:hover:bg-[#5E5CE6]/90",
  },
  defer: {
    idle:
      "border-0 shadow-none bg-[#E5E5EA] text-[#3C3C43] hover:bg-[#D1D1D6] dark:bg-[#3A3A3C] dark:text-[#F2F2F7] dark:hover:bg-[#48484A]",
    active:
      "border-0 shadow-none bg-[#8E8E93] text-white hover:bg-[#8E8E93]/90 dark:bg-[#98989D] dark:hover:bg-[#98989D]/90",
  },
};

/** Shared chrome: SF stack, capsule, press scale (matches iOS control feedback). */
export const IOS_CLAIM_ACTION_CHROME = [
  "font-system rounded-full border-0 shadow-none",
  "transition-[transform,background-color,color] duration-150 ease-out",
  "hover:shadow-none",
  "active:scale-[0.96]",
  "focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 focus-visible:ring-offset-1",
  "disabled:opacity-40 disabled:active:scale-100",
].join(" ");
