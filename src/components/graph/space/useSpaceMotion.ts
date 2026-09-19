import { useEffect, useState } from "react";

/** OS preference wins; animation never restarts merely because a component rerenders. */
export function useSpaceMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return { reduced, motion: !reduced && !paused, toggleMotion: () => setPaused((value) => !value) };
}
