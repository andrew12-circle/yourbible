import type { MindGraphNode } from "./unifiedMindGraph";
import { MIND_SPACE_KINDS } from "./mindSpaceGraph";

export type Vec3 = { x: number; y: number; z: number };
export type SpaceCamera = { yaw: number; pitch: number; distance: number };
export type SpacePoint = Vec3 & { id: string };
export const INITIAL_SPACE_CAMERA: SpaceCamera = { yaw: 0.12, pitch: -0.08, distance: 520 };
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function seedForId(value: string): number {
  let seed = 2166136261;
  for (let i = 0; i < value.length; i += 1) seed = Math.imul(seed ^ value.charCodeAt(i), 16777619);
  return (seed >>> 0) / 4294967296;
}

/** Deterministic 3D shells. No force simulation can scramble a scene on a parent render. */
export function layoutMindSpace(nodes: MindGraphNode[], focus: string | null, distances: Map<string, number>, clustered: boolean): SpacePoint[] {
  const ordered = [...nodes].filter((node) => node.id !== focus).sort((a, b) => a.id.localeCompare(b.id));
  const total = Math.max(1, ordered.length);
  const points = ordered.map((node, i) => {
    const kind = MIND_SPACE_KINDS.findIndex((item) => item.kind === node.kind);
    const angle = clustered ? kind * Math.PI / 3 + (seedForId(node.id) - 0.5) * 0.75 : i * 2.399963229728653;
    const vertical = clustered ? (seedForId(node.id + "vertical") - 0.5) * 1.4 : 1 - 2 * (i + 0.5) / total;
    const radial = Math.sqrt(Math.max(0.2, 1 - vertical * vertical));
    const ring = Math.min(3, distances.get(node.id) ?? 3);
    const radius = 135 + ring * 48 + seedForId(node.id + "radius") * 80;
    return { id: node.id, x: Math.cos(angle) * radial * radius,
      y: vertical * radius * 0.72, z: Math.sin(angle) * radial * radius };
  });
  if (focus && nodes.some((node) => node.id === focus)) points.push({ id: focus, x: 0, y: 0, z: 0 });
  return points;
}

export function projectMindPoint(point: Vec3, camera: SpaceCamera, width: number, height: number) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const x = point.x * cy - point.z * sy;
  const z = point.x * sy + point.z * cy;
  const y = point.y * cp - z * sp;
  const depth = camera.distance - (point.y * sp + z * cp);
  if (depth < 35) return null;
  const lens = Math.min(width, height) * 0.93;
  const scale = lens / depth;
  return { x: width / 2 + x * scale, y: height / 2 + y * scale, scale, depth };
}
