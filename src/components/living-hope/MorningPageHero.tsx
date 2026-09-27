import { useId, type ReactNode } from "react";
import { Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  reminder?: string;
  navigation?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  headingId?: string;
};

/** Real text and controls over decorative, locally bundled artwork. */
export function MorningPageHero({ title, subtitle, eyebrow, reminder, navigation, children, compact, headingId }: Props) {
  const generatedId = useId();
  const id = headingId ?? generatedId;
  return <section className={cn("morning-page-hero", compact && "is-compact")} aria-labelledby={id}>
    <div className="morning-page-hero-art" aria-hidden="true" />
    <div className="morning-session-width morning-page-hero-inner">
      {navigation}
      {eyebrow && <p className="morning-hero-eyebrow"><Sunrise aria-hidden="true" />{eyebrow}</p>}
      <div className="morning-page-hero-copy">
        <div className="morning-page-hero-title">
          <h1 id={id} data-morning-heading tabIndex={-1}>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {children && <div className="morning-hero-action">{children}</div>}
        </div>
        {reminder && <p className="morning-hero-reminder" aria-hidden="true">{reminder}</p>}
      </div>
    </div>
  </section>;
}
