import { BIBLE_PLATES } from "@/data/biblePlates/index";
import { ScripturePlate } from "@/components/bible/ScripturePlate";

export function ArtworkGallery() {
  return (
    <div className="study-artwork-grid mt-6">
      {BIBLE_PLATES.map((plate) => (
        <div key={plate.id} className="study-artwork-item">
          <ScripturePlate plate={plate} compact />
        </div>
      ))}
    </div>
  );
}
