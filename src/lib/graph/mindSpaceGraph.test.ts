import { describe, expect, it } from "vitest";
import { indexMindSpace, searchMindSpace, selectMindSpace, traceMindSpace, type MindSpaceGraph } from "./mindSpaceGraph";
import { INITIAL_SPACE_CAMERA, layoutMindSpace, projectMindPoint } from "./mindSpaceGeometry";
import { mindNodeRoute, pruneMindGraphToEntryRoots, type MindGraphNode } from "./unifiedMindGraph";
const node = (id: string): MindGraphNode => ({ id, kind: "entry", label: `Thought ${id}`, ref: id, val: 3, color: "#fff" });
const edge = (source: string, target: string) => ({ source, target, relation: "links", color: "#fff" });
const graph = (): MindSpaceGraph => ({ nodes: ["a", "b", "c", "d", "isolated"].map(node), links: [edge("a", "b"), edge("b", "c"), edge("c", "d")] });

describe("mind space uses saved relationships", () => {
  it("finds paths in either direction without inventing missing links", () => {
    const index = indexMindSpace(graph());
    expect(traceMindSpace(index, "a", "d")?.ids).toEqual(["a", "b", "c", "d"]);
    expect(traceMindSpace(index, "d", "a")?.links).toHaveLength(3);
    expect(traceMindSpace(index, "a", "isolated")).toBeNull();
    expect(traceMindSpace(index, "missing", "a")).toBeNull();
    expect(traceMindSpace(index, "a", "a")?.links).toEqual([]);
  });
  it("honors hop depth and includes disconnected records in overview", () => {
    const index = indexMindSpace(graph());
    expect(selectMindSpace(index, "a", 1).nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(selectMindSpace(index, "a", 2).nodes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(selectMindSpace(index, "a", 0).nodes).toHaveLength(5);
  });
  it("searches outside the visible cluster and matches preview words", () => {
    const input = graph(); input.nodes[4].detail = "A quiet prayer for patience";
    const index = indexMindSpace(input);
    expect(selectMindSpace(index, "a", 1).nodes).toHaveLength(2);
    expect(searchMindSpace(index, "quiet patience")[0].id).toBe("isolated");
  });
  it("does not mutate canonical graph objects", () => {
    const input = graph(), before = JSON.stringify(input), index = indexMindSpace(input);
    index.nodes.get("a")!.label = "different";
    selectMindSpace(index, "a", 2);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("removes duplicate, self, and dangling edges", () => {
    const input = graph(); input.links.push(edge("a", "a"), edge("a", "missing"), edge("a", "b"));
    expect(indexMindSpace(input).links).toHaveLength(3);
  });
  it("caps dense scenes but prioritizes a real traced path", () => {
    const input: MindSpaceGraph = { nodes: Array.from({ length: 100 }, (_, i) => node(String(i))), links: [] };
    for (let i = 1; i < 100; i++) input.links.push(edge("0", String(i)));
    const scene = selectMindSpace(indexMindSpace(input), "1", 2, 15, "99");
    expect(scene.nodes).toHaveLength(15);
    expect(scene.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(["1", "0", "99"]));
    expect(scene.trace?.ids).toEqual(["1", "0", "99"]);
  });
  it("keeps an empty scoped notebook empty", () => {
    expect(pruneMindGraphToEntryRoots(graph(), [])).toEqual({ nodes: [], links: [] });
  });
});

describe("spatial geometry and navigation", () => {
  it("keeps deterministic finite coordinates and the focused node at the origin", () => {
    const scene = selectMindSpace(indexMindSpace(graph()), "a", 2);
    const a = layoutMindSpace(scene.nodes, "a", scene.distances, false);
    expect(a).toEqual(layoutMindSpace(scene.nodes, "a", scene.distances, false));
    expect(a.find((n) => n.id === "a")).toEqual({ id: "a", x: 0, y: 0, z: 0 });
    expect(a.every((n) => [n.x, n.y, n.z].every(Number.isFinite))).toBe(true);
  });
  it("projects center and clips behind-camera points", () => {
    expect(projectMindPoint({ x: 0, y: 0, z: 0 }, INITIAL_SPACE_CAMERA, 800, 500)).toMatchObject({ x: 400, y: 250 });
    expect(projectMindPoint({ x: 0, y: 0, z: 600 }, { yaw: 0, pitch: 0, distance: 200 }, 800, 500)).toBeNull();
  });
  it("opens numbered Bible books and the actual claim source", () => {
    expect(mindNodeRoute({ ...node("v"), kind: "verse", ref: "1 John 4:7" })).toBe("/read/1Jn/4?v=7");
    expect(mindNodeRoute({ ...node("claim"), kind: "claim", sourceArtifactId: "source" })).toBe("/framework/artifacts/source/research/claim");
  });
});
