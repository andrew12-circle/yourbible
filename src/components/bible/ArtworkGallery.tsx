import { BIBLE_PLATES } from "@/data/biblePlates/index";
import { ScripturePlate } from "@/components/bible/ScripturePlate";

export function ArtworkGallery() {
  return (
    <div className="study-artwork-grid">
      {BIBLE_PLATES.map((plate) => (
        <div key={plate.id} className="study-artwork-page">
          <ScripturePlate plate={plate} />
        </div>
      ))}
    </div>
  );
}
