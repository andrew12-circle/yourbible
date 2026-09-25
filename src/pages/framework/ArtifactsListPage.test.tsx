import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Row } from "./artifacts/artifactLibraryModel";
import {
  ARTIFACT_LIBRARY_STORAGE_SORT,
  ARTIFACT_LIBRARY_STORAGE_VIEW,
  sortRows,
} from "./artifacts/artifactLibraryModel";
import ArtifactsListPage from "./ArtifactsListPage";
import { ArtifactLibrarySkeleton } from "./artifacts/ArtifactLibrarySkeleton";

const state = vi.hoisted(() => ({
  user: { id: "library-reader" },
  rows: [] as Row[],
  seenIds: new Set<string>(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: state.user, loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ data: state.rows, error: null })),
    })),
  },
}));
vi.mock("@/lib/framework/artifactLibrarySeen", () => ({
  fetchSeenArtifactIds: vi.fn(async () => state.seenIds),
}));
vi.mock("@/lib/youtube/youtubeSubscriptions", () => ({
  syncYouTubeSubscriptions: vi.fn(async () => 0),
}));
vi.mock("@/lib/youtube/warmEmbed", () => ({ warmYouTubeIframeApi: vi.fn() }));
vi.mock("@/lib/framework/artifactShellCache", () => ({ prepareArtifactNavigation: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("./FrameworkLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/framework/LibraryIndexDialog", () => ({ default: () => null }));
vi.mock("./artifacts/ArtifactsLibraryMobileMenu", () => ({ ArtifactsLibraryMobileMenu: () => null }));
vi.mock("./artifacts/useMergedYoutubeRowMetadata", () => ({
  useMergedYoutubeRowMetadata: (row: Row) => row.metadata,
}));
vi.mock("./artifacts/ArtifactListRow", () => ({
  ArtifactListRow: ({ r }: { r: Row }) => <li>{r.title}</li>,
}));

function makeRows(): Row[] {
  const kinds = ["youtube", "podcast", "pdf", "text_file", "chat_export", "text", "voice", "audio"];
  return Array.from({ length: 16 }, (_, i) => {
    const kind = kinds[i % kinds.length];
    return {
      id: `artifact-${i}`,
      title: `${String.fromCharCode(65 + i)} ${kind}`,
      kind,
      status: "ready",
      created_at: new Date(Date.UTC(2026, 8, i + 1)).toISOString(),
      url: kind === "youtube" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null,
      metadata: kind === "youtube"
        ? { import_via: "youtube_subscription", channel: "Test channel", thumbnail_url: "https://example.com/cover.jpg" }
        : null,
    };
  });
}

function mountLibrary() {
  return render(<MemoryRouter><ArtifactsListPage /></MemoryRouter>);
}

async function collection() {
  return screen.findByRole("region", { name: "Artifact collection" });
}

function coverIds(region: HTMLElement) {
  return within(region).getAllByRole("link", { name: /^Open / })
    .map((link) => link.getAttribute("href")?.split("/").pop());
}

beforeEach(() => {
  state.rows = makeRows();
  state.seenIds = new Set(["artifact-0"]);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Artifacts library landing", () => {
  it("opens All as one recently-added grid, ignoring old list/sort preferences", async () => {
    localStorage.setItem(ARTIFACT_LIBRARY_STORAGE_VIEW, "list");
    localStorage.setItem(ARTIFACT_LIBRARY_STORAGE_SORT, "source");
    mountLibrary();
    const region = await collection();

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Sort artifacts" })).toHaveValue("recent");
    expect(within(region).getByRole("heading", { name: "Recently added" })).toBeInTheDocument();
    expect(within(region).getAllByRole("list")).toHaveLength(1);
    expect(coverIds(region)).toEqual([...state.rows].reverse().map((row) => row.id));
    expect(new Set(coverIds(region)).size).toBe(16);
    expect(within(region).getByRole("status")).toHaveTextContent("16 artifacts");
  });

  it.each<{ label: string; count: number }>([
    { label: "Videos", count: 2 },
    { label: "Podcasts", count: 2 },
    { label: "Documents", count: 4 },
    { label: "Chats", count: 2 },
    { label: "Notes", count: 2 },
    { label: "Voice", count: 4 },
    { label: "Unwatched", count: 1 },
  ])("filters $label without switching away from the cover grid", async ({ label, count }) => {
    mountLibrary();
    const region = await collection();
    fireEvent.click(screen.getByRole("tab", { name: label, exact: true }));
    await waitFor(() => expect(coverIds(region)).toHaveLength(count));
    expect(screen.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(coverIds(region)).toHaveLength(16);
  });

  it("sorts the entire All grid rather than leaving a fixed recently-added shelf", async () => {
    mountLibrary();
    const region = await collection();
    const select = screen.getByRole("combobox", { name: "Sort artifacts" });
    fireEvent.change(select, { target: { value: "az" } });
    expect(coverIds(region)).toEqual(state.rows.map((row) => row.id));
    fireEvent.change(select, { target: { value: "source" } });
    expect(coverIds(region)).toEqual(sortRows(state.rows, "source").map((row) => row.id));
    fireEvent.change(select, { target: { value: "recent" } });
    expect(coverIds(region)).toEqual([...state.rows].reverse().map((row) => row.id));
  });

  it("searches all media, shows a no-results state, and restores the full grid", async () => {
    mountLibrary();
    const region = await collection();
    const search = screen.getAllByRole("textbox", { name: "Search artifacts" })[0];
    fireEvent.change(search, { target: { value: "pdf" } });
    await waitFor(() => expect(coverIds(region)).toHaveLength(2));
    fireEvent.change(search, { target: { value: "no artifact matches this" } });
    await waitFor(() => expect(within(region).getByText("No matching artifacts.")).toBeInTheDocument());
    expect(within(region).queryByRole("list")).not.toBeInTheDocument();
    expect(within(region).getByRole("status")).toHaveTextContent("0 artifacts");
    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() => expect(coverIds(region)).toHaveLength(16));
  });

  it("keeps List available during a visit and restores All/grid/recent on re-entry", async () => {
    const firstVisit = mountLibrary();
    const region = await collection();
    fireEvent.click(screen.getByRole("tab", { name: "Videos" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort artifacts" }), { target: { value: "az" } });
    fireEvent.click(screen.getByRole("button", { name: "List", exact: true }));
    expect(within(region).getAllByRole("listitem")).toHaveLength(2);
    expect(within(region).queryByRole("link", { name: /^Open / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Grid", exact: true }));
    expect(coverIds(region)).toEqual(["artifact-0", "artifact-8"]);
    firstVisit.unmount();

    mountLibrary();
    const returned = await collection();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Sort artifacts" })).toHaveValue("recent");
    expect(coverIds(returned)).toHaveLength(16);
  });

  it("allows normal touch scrolling over covers and lazy-loads thumbnail images", async () => {
    mountLibrary();
    const region = await collection();
    for (const link of within(region).getAllByRole("link", { name: /^Open / })) {
      expect(link).toHaveClass("touch-auto");
      expect(link).not.toHaveClass("touch-pan-x");
    }
    const images = region.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("decoding", "async");
    }
  });

  it("keeps the empty-library add and import actions", async () => {
    state.rows = [];
    mountLibrary();
    expect(await screen.findByRole("heading", { name: "Your library is empty" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New artifact" })).toHaveAttribute("href", "/framework/artifacts/new");
    expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute("href", "/framework/artifacts/new?mode=import");
  });

  it("uses a responsive grid, not horizontal shelves, while loading", () => {
    render(<ArtifactLibrarySkeleton count={6} />);
    const status = screen.getByRole("status", { name: "Loading artifacts" });
    expect(status).toHaveAttribute("aria-busy", "true");
    const grid = status.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-2", "xl:grid-cols-6");
    expect(grid?.children).toHaveLength(6);
  });
});
