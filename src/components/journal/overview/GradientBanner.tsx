import AllEntriesIdentity from "@/components/journal/overview/AllEntriesIdentity";
import OverviewHeader from "@/components/journal/overview/OverviewHeader";

interface Props {
  onNew: () => void;
  onAddCover: () => void;
  onRepositionCover?: () => void;
  onImportDayOne?: () => void;
  hasCoverPhoto?: boolean;
  overlay?: boolean;
}

export default function GradientBanner({
  onNew,
  onAddCover,
  onRepositionCover,
  onImportDayOne,
  hasCoverPhoto,
  overlay,
}: Props) {
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden ${overlay ? "h-44 sm:h-52" : ""}`}
      style={{
        background:
          "linear-gradient(165deg, hsl(220 14% 22%) 0%, hsl(220 14% 30%) 45%, hsl(211 100% 50% / 0.35) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-black/15 to-transparent"
        aria-hidden
      />
      <OverviewHeader
        onNew={onNew}
        onAddCover={onAddCover}
        onRepositionCover={onRepositionCover}
        onImportDayOne={onImportDayOne}
        hasCoverPhoto={hasCoverPhoto}
        overlay={overlay}
      />
      <div
        className={`px-8 pb-8 ${overlay ? "pointer-events-none absolute bottom-0 left-0 right-0 z-[1] pb-6" : "relative pt-24"}`}
      >
        <AllEntriesIdentity large inverted />
      </div>
    </div>
  );
}
