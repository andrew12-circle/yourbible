import type { ComponentProps } from "react";
import { MorningRitualStepNav } from "./MorningRitualStepNav";
import { MorningPageHero } from "./MorningPageHero";
import { MORNING_ATMOSPHERE } from "@/lib/livingHope/morningPresentation";

type Props = ComponentProps<typeof MorningRitualStepNav> & { title: string; subtitle?: string };

export function MorningSessionHero({ title, subtitle, ...navigation }: Props) {
  const kind = navigation.steps[navigation.stepIndex]?.kind ?? "intro";
  const atmosphere = MORNING_ATMOSPHERE[kind];
  return <MorningPageHero compact headingId="morning-session-title" title={title}
    subtitle={subtitle ?? atmosphere.subtitle} reminder={atmosphere.reminder}
    navigation={<MorningRitualStepNav {...navigation} />} />;
}
