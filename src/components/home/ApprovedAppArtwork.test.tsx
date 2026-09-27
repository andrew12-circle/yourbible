import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home } from "lucide-react";
import { IosAppIcon } from "@/components/home/IosAppIcon";
import { HomeAppButton } from "@/components/home/HomeAppButton";
import { APP_ICON_ARTWORK, getAppIconArtwork } from "@/lib/home/appIconArtwork";
import { buildHomeApps, LAST_READ_KEY, prioritizeMobileHomeApps } from "@/lib/home/homeApps";
import { HubSidebar } from "@/components/shell/HubSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/contexts/HomeDashboardContext", () => ({
  useHomeDashboard: () => ({
    counts: { beliefs: 0, tensions: 0, chats: 1, artifacts: 25, journalToday: 1, prayerWaiting: 19 },
    profilePhoto: null,
    displayName: "Icon preview",
  }),
}));
vi.mock("@/components/media/HubSidebarMediaPlayer", () => ({ HubSidebarMediaPlayer: () => null }));
vi.mock("@/components/shell/HubSidebarStorageMeter", () => ({ HubSidebarStorageMeter: () => null }));

const counts = { beliefs: 0, tensions: 0, chats: 1, artifacts: 25, journalToday: 1, prayerWaiting: 19 };
afterEach(() => { cleanup(); localStorage.clear(); });

describe("approved artwork registry", () => {
  it("uses the actual individual files and preserves the Lumen product name aliases", () => {
    expect(Object.values(APP_ICON_ARTWORK)).toHaveLength(13);
    expect(new Set(Object.values(APP_ICON_ARTWORK)).size).toBe(13);
    expect(getAppIconArtwork(" Lumen AI ")).toBe(APP_ICON_ARTWORK["lumen-ai"]);
    expect(getAppIconArtwork("My AI")).toBe(APP_ICON_ARTWORK["lumen-ai"]);
    expect(getAppIconArtwork("Lyman AI")).toBe(APP_ICON_ARTWORK["lumen-ai"]);
    expect(getAppIconArtwork("Morning   formula")).toBe(APP_ICON_ARTWORK["morning-formula"]);
    expect(getAppIconArtwork("Graph")).toBe(APP_ICON_ARTWORK["mind-map"]);
  });
  it("does not claim artwork for modules absent from the reference", () => {
    expect(getAppIconArtwork("Sleep")).toBeUndefined();
    expect(getAppIconArtwork("Not a module")).toBeUndefined();
    expect(getAppIconArtwork("Daily")).toBe(APP_ICON_ARTWORK["morning-formula"]);
  });
  it("assigns the same artwork to home and mini-phone data without changing routes or badges", () => {
    localStorage.setItem(LAST_READ_KEY, "Gen/2");
    const apps = buildHomeApps(counts);
    expect(apps.find(app => app.label === "Bible")).toMatchObject({ to: "/read/Gen/2", badge: "Gen 2", imageSrc: APP_ICON_ARTWORK.bible });
    expect(apps.find(app => app.label === "Prayer")).toMatchObject({ to: "/prayer", badge: 19, imageSrc: APP_ICON_ARTWORK.prayer });
    expect(apps.find(app => app.label === "Artifacts")).toMatchObject({ badge: 25, imageSrc: APP_ICON_ARTWORK.artifacts });
    expect(apps.find(app => app.label === "My AI")).toMatchObject({ to: "/my-ai", badge: 1, imageSrc: APP_ICON_ARTWORK["lumen-ai"] });
    expect(apps.find(app => app.label === "YouTube")?.onOpen).toBeTypeOf("function");
    const originalOrder = apps.map(app => app.label);
    expect(prioritizeMobileHomeApps(apps).slice(0, 5).map(app => app.label)).toEqual(["Video journal", "Journal", "Bible", "Morning formula", "My AI"]);
    expect(apps.map(app => app.label)).toEqual(originalOrder);
  });
});

describe("image renderer", () => {
  it.each([28, 60, 90])("preserves the artwork at %ipx without a glyph, tint or clipping tile", size => {
    const { container } = render(<IosAppIcon icon={Home} background="red" imageSrc={APP_ICON_ARTWORK.bible} pixelSize={size} />);
    const art = container.querySelector('[data-app-icon-renderer="artwork"]');
    expect(art).toHaveStyle({ width: `${size}px`, height: `${size}px` });
    expect(art).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector(".ios-icon")).toBeNull();
    const image = art?.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("draggable", "false");
    expect(image).toHaveClass("object-contain");
    expect(image).toHaveAttribute("src", APP_ICON_ARTWORK.bible);
  });
  it("only falls back on image failure and recovers for a new asset", () => {
    const { container, rerender } = render(<IosAppIcon icon={Home} background="red" imageSrc="/missing.webp" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector('[data-app-icon-renderer="fallback"] svg')).not.toBeNull();
    rerender(<IosAppIcon icon={Home} background="red" imageSrc={APP_ICON_ARTWORK.prayer} />);
    expect(container.querySelector("img")).toHaveAttribute("src", APP_ICON_ARTWORK.prayer);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("keeps launcher labels, click behavior and counts separate from decorative artwork", () => {
    const onClick = vi.fn();
    const app = buildHomeApps(counts).find(app => app.label === "Prayer")!;
    const { container } = render(<HomeAppButton app={app} onClick={onClick} iconSize={60} />);
    fireEvent.click(screen.getByRole("button", { name: "Prayer requests and praise reports" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", APP_ICON_ARTWORK.prayer);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("real sidebar", () => {
  it("renders the approved images in the requested navigation, preserving links and active state", () => {
    render(<MemoryRouter initialEntries={["/journal/notes"]}><SidebarProvider><HubSidebar /></SidebarProvider></MemoryRouter>);
    const expected = [
      ["Overview", "/home", "overview"], ["Bible", "/read/Jhn/1", "bible"],
      ["Journal", "/journal", "journal"], ["Prayer", "/prayer", "prayer"],
      ["Notes", "/journal/notes", "notes"], ["Morning formula", "/living-hope", "morning-formula"],
      ["Mind map", "/framework/graph", "mind-map"], ["Artifacts", "/framework/artifacts", "artifacts"],
      ["Lumen AI", "/my-ai", "lumen-ai"], ["Tasks", "/life/todos", "tasks"],
      ["Habits", "/life/habits", "habits"], ["Vision board", "/life/vision-board", "vision-board"],
      ["Settings", "/settings", "settings"],
    ] as const;
    const links = screen.getAllByRole("link");
    for (const [label, route, id] of expected) {
      const link = links.find(el => el.getAttribute("href") === route && el.textContent?.startsWith(label));
      expect(link, label).toBeDefined();
      expect(link?.querySelector("img")).toHaveAttribute("src", APP_ICON_ARTWORK[id]);
      expect(link?.querySelector("svg"), `${label} must not use a substitute glyph`).toBeNull();
    }
    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Journal" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });
});
