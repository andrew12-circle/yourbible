import type { ReactNode, RefObject } from "react";
import ArtifactDesktopHero, { type ArtifactDesktopHeroProps } from "@/components/framework/artifact-detail/ArtifactDesktopHero";

type Props = {
  hero: ArtifactDesktopHeroProps;
  videoBlock: ReactNode;
  videoSlotRef?: RefObject<HTMLDivElement | null>;
};

/** Desktop YouTube artifact: cinematic hero with inline player (PiP when scrolled away). */
export default function ArtifactDetailDesktopShell({ hero, videoBlock, videoSlotRef }: Props) {
  return <ArtifactDesktopHero {...hero} videoSlot={videoBlock} videoSlotRef={videoSlotRef} />;
}
