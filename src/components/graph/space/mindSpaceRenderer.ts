import type { MindGraphNode } from "@/lib/graph/unifiedMindGraph";
import { spaceKind, spaceLinkId, type selectMindSpace } from "@/lib/graph/mindSpaceGraph";
import { clamp, projectMindPoint, seedForId, type SpaceCamera, type SpacePoint } from "@/lib/graph/mindSpaceGeometry";

export type SpaceScene = ReturnType<typeof selectMindSpace>;
export type SpaceHit = { id: string; x: number; y: number; radius: number; depth: number };
export type SpaceRenderFrame = {
  scene: SpaceScene; positions: SpacePoint[]; focus: string | null; selected: string | null;
  camera: SpaceCamera; time: number; width: number; height: number; labels: boolean; hovered: string | null;
};

/** Perspective projection gives depth without a WebGL dependency or persistent GPU context. */
export function drawMindSpace(ctx: CanvasRenderingContext2D, frame: SpaceRenderFrame): SpaceHit[] {
  const { width, height, camera, time, scene, positions, focus, selected, labels, hovered } = frame;
  ctx.clearRect(0, 0, width, height);
  const wash = ctx.createRadialGradient(width * 0.5, height * 0.48, 4, width * 0.5, height * 0.48, Math.max(width, height) * 0.65);
  wash.addColorStop(0, "#112c43"); wash.addColorStop(0.42, "#071526"); wash.addColorStop(1, "#030711");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);

  // Fixed seeds: rerenders never reshuffle the background or node positions.
  for (let i = 0; i < 100; i += 1) {
    const x = seedForId(`star-x${i}`) * width, y = seedForId(`star-y${i}`) * height;
    ctx.globalAlpha = 0.15 + seedForId(`star-a${i}`) * 0.35;
    ctx.fillStyle = "#aedbff";
    ctx.beginPath(); ctx.arc((x + Math.sin(time * 0.07 + i) * 2 + width) % width, y, i % 5 === 0 ? 1 : 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const points = new Map(positions.map((point) => {
    const phase = seedForId(point.id) * Math.PI * 2;
    const drifting = point.id === focus ? point : { ...point,
      x: point.x + Math.sin(time * 0.18 + phase) * 3,
      y: point.y + Math.cos(time * 0.16 + phase) * 3 };
    return [point.id, projectMindPoint(drifting, camera, width, height)] as const;
  }));
  const traced = new Set(scene.trace?.links.map(spaceLinkId) ?? []);
  const tracedNodes = new Set(scene.trace?.ids ?? []);

  for (const link of scene.links) {
    const a = points.get(link.source), b = points.get(link.target);
    if (!a || !b) continue;
    const isTrace = traced.has(spaceLinkId(link));
    const direct = link.source === focus || link.target === focus;
    const active = isTrace || link.source === hovered || link.target === hovered;
    ctx.strokeStyle = link.relation === "tension" ? "#fb9caa" : isTrace ? "#a5f9da" : "#65bcf3";
    ctx.globalAlpha = scene.trace && !isTrace ? 0.065 : active ? 0.85 : direct ? 0.33 : 0.13;
    ctx.lineWidth = isTrace ? 1.8 : 0.8;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // The particle shows activity, not an assertion of directional causality.
    if (direct || isTrace) {
      const progress = (time * 0.09 + seedForId(spaceLinkId(link))) % 1;
      ctx.globalAlpha = isTrace ? 0.95 : 0.65;
      ctx.fillStyle = isTrace ? "#d6ffee" : "#c4eaff";
      ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, isTrace ? 2.2 : 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const hit: SpaceHit[] = [];
  const ordered = [...scene.nodes].sort((a, b) => (points.get(b.id)?.depth ?? 0) - (points.get(a.id)?.depth ?? 0));
  const textBoxes: { x: number; y: number; w: number; h: number }[] = [];
  const textTasks: { node: MindGraphNode; x: number; y: number; radius: number; important: boolean }[] = [];
  for (const node of ordered) {
    const point = points.get(node.id);
    if (!point || point.x < -40 || point.x > width + 40 || point.y < -40 || point.y > height + 40) continue;
    const central = node.id === focus;
    const important = central || node.id === hovered || node.id === selected || tracedNodes.has(node.id);
    const radius = clamp((central ? 14 : 5 + Math.sqrt(node.val)) * point.scale, central ? 10 : 3.5, central ? 25 : 15);
    const color = spaceKind(node.kind).color;
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * (central ? 4.5 : 3.2));
    glow.addColorStop(0, color + (important ? "75" : "3d")); glow.addColorStop(1, color + "00");
    ctx.globalAlpha = scene.trace && !important ? 0.35 : 1;
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(point.x, point.y, radius * (central ? 4.5 : 3.2), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f3fcff"; ctx.beginPath(); ctx.arc(point.x - radius * 0.2, point.y - radius * 0.22, radius * 0.28, 0, Math.PI * 2); ctx.fill();
    if (important) {
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 6, time * 0.15, time * 0.15 + Math.PI * 1.65); ctx.stroke();
      if (central) {
        ctx.globalAlpha = 0.17; ctx.beginPath(); ctx.ellipse(point.x, point.y, radius + 30, radius + 11, -0.3, 0, Math.PI * 2); ctx.stroke();
      }
    }
    hit.push({ id: node.id, x: point.x, y: point.y, radius: Math.max(radius + 7, 20), depth: point.depth });
    if (labels || important) textTasks.push({ node, x: point.x, y: point.y, radius, important });
  }
  // Important labels reserve space first; omit overlapping peripheral labels.
  textTasks.sort((a, b) => Number(b.important) - Number(a.important));
  for (const task of textTasks) {
    const { node, x, y, radius, important } = task;
    const text = node.label.length > 32 ? `${node.label.slice(0, 31)}…` : node.label;
    ctx.font = `${important ? "500" : "400"} ${important ? 13 : 11}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 14;
    const box = { x: clamp(x - w / 2, 5, Math.max(5, width - w - 5)), y: y + radius + 9, w, h: 24 };
    if (box.y + box.h > height - 24) continue;
    if (!important && textBoxes.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) continue;
    textBoxes.push(box);
    ctx.globalAlpha = important ? 0.92 : 0.75;
    ctx.fillStyle = "#07111e"; ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 5); ctx.fill();
    ctx.fillStyle = important ? "#effaff" : "#b7ccdf"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, box.x + box.w / 2, box.y + box.h / 2);
  }
  ctx.globalAlpha = 1;
  return hit.sort((a, b) => a.depth - b.depth);
}
