import { cn } from "@/lib/utils";

type Variant = "seal" | "sealed" | "open";

type Props = {
  variant: Variant;
  onClick?: () => void;
  className?: string;
  /** Shown on hover / for screen readers */
  label?: string;
};

function WaxSealMark({ variant }: { variant: Variant }) {
  if (variant === "open") {
    return (
      <svg viewBox="0 0 24 24" className="letter-wax-seal__mark" aria-hidden>
        <path
          d="M8 12h8M12 8v8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <span className="letter-wax-seal__monogram" aria-hidden>
      L
    </span>
  );
}

/** Ribbon + wax seal — invitation-style control for sealing the future letter. */
export function LetterWaxSealButton({ variant, onClick, className, label }: Props) {
  const defaultLabel =
    variant === "seal" ? "Seal letter" : variant === "open" ? "Open letter" : "Letter sealed";
  const ariaLabel = label ?? defaultLabel;
  const interactive = variant === "seal" || variant === "open";

  const body = (
    <>
      <span className="letter-wax-seal__ribbon letter-wax-seal__ribbon--a" aria-hidden />
      <span className="letter-wax-seal__ribbon letter-wax-seal__ribbon--b" aria-hidden />
      <span
        className={cn(
          "letter-wax-seal__wax",
          variant === "sealed" && "letter-wax-seal__wax--set",
          variant === "open" && "letter-wax-seal__wax--open",
        )}
        aria-hidden
      >
        <WaxSealMark variant={variant} />
      </span>
      {variant === "seal" ? (
        <span className="letter-wax-seal__caption" aria-hidden>
          Seal
        </span>
      ) : null}
      {variant === "open" ? (
        <span className="letter-wax-seal__caption" aria-hidden>
          Open
        </span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div
        className={cn("letter-wax-seal letter-wax-seal--static", className)}
        role="img"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn("letter-wax-seal letter-wax-seal--interactive", className)}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {body}
    </button>
  );
}
