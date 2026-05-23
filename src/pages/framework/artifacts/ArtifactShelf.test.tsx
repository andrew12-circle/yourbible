import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ArtifactShelf } from "./ArtifactShelf";
import type { Row } from "./artifactLibraryModel";

const rows: Row[] = Array.from({ length: 8 }, (_, index) => ({
  id: `artifact-${index}`,
  title: `Artifact ${index + 1}`,
  kind: "text",
  status: "ready",
  created_at: "2026-05-23T00:00:00.000Z",
  metadata: null,
}));

afterEach(() => cleanup());

describe("ArtifactShelf", () => {
  it("marks the mobile rail as a native horizontal pan surface", () => {
    render(
      <MemoryRouter>
        <ArtifactShelf
          shelfKey="recent"
          title="Recently added"
          rows={rows}
          deletingId={null}
          onDelete={() => {}}
          onRename={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("list")).toHaveClass("overflow-x-auto", "touch-pan-x", "[-webkit-overflow-scrolling:touch]");
  });
});
