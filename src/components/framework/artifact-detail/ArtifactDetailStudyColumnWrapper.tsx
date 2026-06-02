import { type ReactNode } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { artifactStudyBodyMobile } from "@/lib/framework/artifactSurfaces";

type Props = {
  isDesktop: boolean;
  children: ReactNode;
  className?: string;
};

export default function ArtifactDetailStudyColumnWrapper({ isDesktop, children, className }: Props) {
  if (!isDesktop) {
    return (
      <TabsContent
        value="study"
        className="mt-0 px-4 pb-10 focus-visible:outline-none data-[state=inactive]:hidden sm:px-5 md:px-8 md:pb-14"
      >
        <div className={artifactStudyBodyMobile}>{children}</div>
      </TabsContent>
    );
  }

  return <div className={cn("space-y-5 sm:space-y-6", className)}>{children}</div>;
}
