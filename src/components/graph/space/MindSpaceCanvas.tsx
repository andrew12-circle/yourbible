import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { clamp, INITIAL_SPACE_CAMERA, layoutMindSpace, type SpaceCamera, type SpacePoint } from "@/lib/graph/mindSpaceGeometry";
import { drawMindSpace, type SpaceHit, type SpaceScene } from "./mindSpaceRenderer";

export type MindSpaceCameraControls = { reset: () => void; zoom: (factor: number) => void };
type Props = {
  scene: SpaceScene; focus: string | null; selected: string | null; motion: boolean;
  labels: boolean; clustered: boolean; onSelect: (id: string) => void;
};

export const MindSpaceCanvas = forwardRef<MindSpaceCameraControls, Props>(function MindSpaceCanvas(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useRef<SpaceCamera>({ ...INITIAL_SPACE_CAMERA });
  const latest = useRef(props); latest.current = props;
  const redraw = useRef<() => void>(() => undefined);
  const [unavailable, setUnavailable] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useImperativeHandle(ref, () => ({
    reset: () => { camera.current = { ...INITIAL_SPACE_CAMERA }; redraw.current(); },
    zoom: (factor) => { camera.current.distance = clamp(camera.current.distance * factor, 150, 1200); redraw.current(); },
  }), []);
  useEffect(() => { redraw.current(); }, [props.scene, props.focus, props.selected, props.motion, props.labels, props.clustered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext("2d", { alpha: false }); } catch { /* List navigation remains available. */ }
    if (!ctx) { setUnavailable(true); return; }
    const context = ctx;
    let width = 1, height = 1, ratio = 1, raf: number | null = null, disposed = false;
    let time = 0, last = 0, visible = document.visibilityState !== "hidden";
    let previousScene: SpaceScene | null = null, previousFocus: string | null = null, previousLayout = false;
    let positions: SpacePoint[] = [], targets: SpacePoint[] = [], hit: SpaceHit[] = [], hover: string | null = null;
    const pointers = new Map<number, { x: number; y: number }>();
    let travel = 0, pinchDistance = 0;
    const invalidate = () => { if (!disposed && visible && raf == null) raf = requestAnimationFrame(draw); };
    function draw(now: number) {
      raf = null;
      if (disposed || !visible) return;
      const value = latest.current;
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0; last = now;
      if (value.motion && pointers.size === 0) { time += dt; camera.current.yaw += dt * 0.025; }
      if (previousScene !== value.scene || previousFocus !== value.focus || previousLayout !== value.clustered) {
        targets = layoutMindSpace(value.scene.nodes, value.focus, value.scene.distances, value.clustered);
        const old = new Map(positions.map((point) => [point.id, point]));
        positions = targets.map((target) => ({ ...(old.get(target.id) ?? target) }));
        previousScene = value.scene; previousFocus = value.focus; previousLayout = value.clustered;
      }
      let moving = false;
      for (let i = 0; i < positions.length; i += 1) {
        const point = positions[i], target = targets[i];
        for (const key of ["x", "y", "z"] as const) {
          const delta = target[key] - point[key];
          if (value.motion && Math.abs(delta) > 0.1) { point[key] += delta * Math.min(1, Math.max(dt, 0.016) * 5); moving = true; }
          else point[key] = target[key];
        }
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      try {
        hit = drawMindSpace(context, { ...value, positions, camera: camera.current, time, width, height, hovered: hover });
      } catch {
        setUnavailable(true); return; // Stop the frame loop; keep the DOM list usable.
      }
      if (value.motion || moving) invalidate();
    }
    redraw.current = invalidate;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      ratio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); invalidate();
    };
    const visibility = () => {
      visible = document.visibilityState !== "hidden"; last = 0;
      if (!visible && raf != null) { cancelAnimationFrame(raf); raf = null; }
      if (visible) invalidate();
    };
    const pointFor = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const pick = (x: number, y: number) => hit.filter((point) => Math.hypot(x - point.x, y - point.y) <= point.radius)
      .sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0]?.id ?? null;
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
      if (!pointers.size) travel = 0;
      pointers.set(event.pointerId, pointFor(event));
      if (pointers.size > 1) { const [a, b] = [...pointers.values()]; pinchDistance = Math.hypot(a.x - b.x, a.y - b.y); travel = 20; }
    };
    const pointerMove = (event: PointerEvent) => {
      const point = pointFor(event), prior = pointers.get(event.pointerId);
      if (prior) {
        pointers.set(event.pointerId, point);
        if (pointers.size > 1) {
          const [a, b] = [...pointers.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance && distance) camera.current.distance = clamp(camera.current.distance * pinchDistance / distance, 150, 1200);
          pinchDistance = distance;
        } else {
          const dx = point.x - prior.x, dy = point.y - prior.y;
          travel += Math.abs(dx) + Math.abs(dy);
          camera.current.yaw += dx * 0.005; camera.current.pitch = clamp(camera.current.pitch + dy * 0.004, -1.2, 1.2);
        }
        invalidate(); return;
      }
      const next = pick(point.x, point.y);
      if (next !== hover) { hover = next; setHovered(next); canvas.style.cursor = next ? "pointer" : "grab"; invalidate(); }
    };
    const pointerUp = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const point = pointFor(event);
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (event.type === "pointerup" && travel < 7) { const id = pick(point.x, point.y); if (id) latest.current.onSelect(id); }
      invalidate();
    };
    const pointerLeave = () => { hover = null; setHovered(null); invalidate(); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); camera.current.distance = clamp(camera.current.distance * Math.exp(clamp(event.deltaY, -120, 120) * 0.002), 150, 1200); invalidate();
    };
    const key = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft": camera.current.yaw -= 0.1; break;
        case "ArrowRight": camera.current.yaw += 0.1; break;
        case "ArrowUp": camera.current.pitch = clamp(camera.current.pitch - 0.1, -1.2, 1.2); break;
        case "ArrowDown": camera.current.pitch = clamp(camera.current.pitch + 0.1, -1.2, 1.2); break;
        case "+": case "=": camera.current.distance = clamp(camera.current.distance * 0.85, 150, 1200); break;
        case "-": camera.current.distance = clamp(camera.current.distance / 0.85, 150, 1200); break;
        case "Home": camera.current = { ...INITIAL_SPACE_CAMERA }; break;
        default: return;
      }
      event.preventDefault(); invalidate();
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("pointerleave", pointerLeave); canvas.addEventListener("wheel", wheel, { passive: false }); canvas.addEventListener("keydown", key);
    resize();
    return () => {
      disposed = true; redraw.current = () => undefined;
      if (raf != null) cancelAnimationFrame(raf);
      resizeObserver.disconnect(); document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("pointerleave", pointerLeave); canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("keydown", key);
      context.clearRect(0, 0, canvas.width, canvas.height); canvas.width = 1; canvas.height = 1;
      positions = []; targets = []; hit = []; pointers.clear();
    };
  }, []);
  const hoverNode = hovered ? props.scene.nodes.find((node) => node.id === hovered) : null;
  return <>
    <canvas ref={canvasRef} data-mind-space-canvas tabIndex={0} className="mind-space-canvas" role="img"
      aria-label="Spatial thought network. Drag or use arrow keys to orbit; pinch, scroll, or use plus and minus to zoom. Home resets the view. Use the thought list to select with a keyboard." />
    {hoverNode ? <div className="mind-space-hover" aria-hidden="true">{hoverNode.label}</div> : null}
    {unavailable ? <div className="mind-space-unavailable" role="status">Spatial drawing is unavailable in this browser. You can still search, trace connections, and open thoughts in the panel.</div> : null}
  </>;
});
