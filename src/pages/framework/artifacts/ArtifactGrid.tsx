import { ArtifactTile } from "./ArtifactTile";
import type { Row } from "./artifactLibraryModel";

interface ArtifactGridProps {
  rows: Row[];
  deletingId: string | null;
  onDelete: (id: string, title: string | null) => void;
  onRename: (id: string) => void;
}

export function ArtifactGrid({ rows, deletingId, onDelete, onRename }: ArtifactGridProps) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      role="list"
    >
      {rows.map((r) => (
        <div key={r.id} role="listitem">
          <ArtifactTile r={r} layout="grid" deletingId={deletingId} onDelete={onDelete} onRename={onRename} />
        </div>
      ))}
    </div>
  );
}
