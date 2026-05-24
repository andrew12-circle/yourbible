import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LibraryToolbar } from "./LibraryToolbar";

describe("LibraryToolbar", () => {
  it("links to the live stream workspace from the artifact library actions", () => {
    render(
      <MemoryRouter>
        <LibraryToolbar
          search=""
          onSearchChange={vi.fn()}
          viewMode="grid"
          onViewModeChange={vi.fn()}
          sortKey="recent"
          onSortKeyChange={vi.fn()}
          category="all"
          onCategoryChange={vi.fn()}
          showNewArtifact
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /live stream/i })).toHaveAttribute(
      "href",
      "/framework/artifacts/live",
    );
  });
});
