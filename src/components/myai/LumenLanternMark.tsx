import { cn } from "@/lib/utils";

const LUMEN_LANTERN_SRC = "/images/lumen-lantern.png";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

/** Copper lantern mark for the Lumen AI chat sidebar header. */
export function LumenLanternMark({ className, size = "md" }: Props) {
  return (
    <img
      src={LUMEN_LANTERN_SRC}
      alt=""
      width={40}
      height={40}
      decoding="async"
      className={cn("shrink-0 object-contain", SIZES[size], className)}
      aria-hidden
    />
  );
}
