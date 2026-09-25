import type { ComponentProps } from "react";
import { MorningRitualStepNav } from "./MorningRitualStepNav";

type Props = ComponentProps<typeof MorningRitualStepNav> & {
  title: string;
  subtitle?: string;
};

/** Decorative artwork stays separate from the real, accessible session controls. */
export function MorningSessionHero({ title, subtitle, ...navigation }: Props) {
  return (
    <section className="morning-session-hero" aria-labelledby="morning-session-title">
      <div className="morning-session-hero-art" aria-hidden="true" />
      <div className="morning-session-width morning-session-hero-inner">
        <MorningRitualStepNav {...navigation} />
        <div className="morning-session-hero-copy">
          <div className="morning-session-hero-title">
            <h1 id="morning-session-title" data-morning-heading tabIndex={-1}>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <p className="morning-session-motto" aria-hidden="true">
            A new day.<br /><span>A higher calling.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
