import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Day One-style 3-pane desktop shell: sidebar | entry list | editor.
 * Each split has a draggable handle. Widths persist to localStorage.
 */
const KEY = "yb.journal.panes.v1";
const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 360;
const MIN_LIST = 280;
const MAX_LIST = 520;

function loadWidths() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return {
        sidebar: clamp(v.sidebar ?? 248, MIN_SIDEBAR, MAX_SIDEBAR),
        list: clamp(v.list ?? 360, MIN_LIST, MAX_LIST),
      };
    }
  } catch { /* */ }
  return { sidebar: 248, list: 360 };
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function JournalDeskLayout({
  sidebar,
  list,
  editor,
}: {
  sidebar: ReactNode;
  list: ReactNode;
  editor: ReactNode;
}) {
  const [w, setW] = useState(loadWidths);
  const dragRef = useRef<null | { which: "sidebar" | "list"; startX: number; startW: number }>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* */ }
  }, [w]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const next = dragRef.current.startW + dx;
      if (dragRef.current.which === "sidebar") {
        setW((p) => ({ ...p, sidebar: clamp(next, MIN_SIDEBAR, MAX_SIDEBAR) }));
      } else {
        setW((p) => ({ ...p, list: clamp(next, MIN_LIST, MAX_LIST) }));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (which: "sidebar" | "list") => (e: React.MouseEvent) => {
    dragRef.current = {
      which,
      startX: e.clientX,
      startW: which === "sidebar" ? w.sidebar : w.list,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <aside
        className="h-full overflow-y-auto bg-muted/20 border-r border-border/60 flex-shrink-0"
        style={{ width: w.sidebar }}
      >
        {sidebar}
      </aside>
      <div
        onMouseDown={startDrag("sidebar")}
        className="w-px hover:w-1 hover:bg-primary/40 cursor-col-resize bg-border/60 transition-all flex-shrink-0"
      />
      <section
        className="h-full overflow-hidden flex flex-col flex-shrink-0"
        style={{ width: w.list }}
      >
        {list}
      </section>
      <div
        onMouseDown={startDrag("list")}
        className="w-px hover:w-1 hover:bg-primary/40 cursor-col-resize bg-border/60 transition-all flex-shrink-0"
      />
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {editor}
      </main>
    </div>
  );
}