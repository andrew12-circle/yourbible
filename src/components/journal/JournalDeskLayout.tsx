import { ReactNode, useEffect, useRef, useState } from "react";

/**

 * Day One-style 3-pane desktop shell: sidebar | entry list | editor.

 * Sidebar and overview/editor pane widths are draggable; list fills the rest.

 */

const SIDEBAR_KEY = "yb.journal.sidebar.v1";
const EDITOR_KEY = "yb.journal.editor.v1";

const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 360;
const DEFAULT_SIDEBAR = 248;

const MIN_EDITOR = 240;
const MAX_EDITOR = 560;
const DEFAULT_EDITOR = 300;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function loadStoredWidth(
  key: string,
  fallback: number,
  min: number,
  max: number,
  field: "sidebar" | "editor",
) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw) as Record<string, number | undefined>;
      return clamp(v[field] ?? fallback, min, max);
    }
  } catch { /* */ }
  return fallback;
}

function loadSidebarWidth() {
  return loadStoredWidth(SIDEBAR_KEY, DEFAULT_SIDEBAR, MIN_SIDEBAR, MAX_SIDEBAR, "sidebar");
}

function loadEditorWidth() {
  return loadStoredWidth(EDITOR_KEY, DEFAULT_EDITOR, MIN_EDITOR, MAX_EDITOR, "editor");
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

  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [editorWidth, setEditorWidth] = useState(loadEditorWidth);
  const dragRef = useRef<null | { pane: "sidebar" | "editor"; startX: number; startW: number }>(
    null,
  );

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ sidebar: sidebarWidth }));
    } catch { /* */ }
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_KEY, JSON.stringify({ editor: editorWidth }));
    } catch { /* */ }
  }, [editorWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (dragRef.current.pane === "sidebar") {
        setSidebarWidth(clamp(dragRef.current.startW + dx, MIN_SIDEBAR, MAX_SIDEBAR));
        return;
      }
      setEditorWidth(clamp(dragRef.current.startW + dx, MIN_EDITOR, MAX_EDITOR));
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

  const startPaneDrag = (pane: "sidebar" | "editor", startW: number) => (e: React.MouseEvent) => {
    dragRef.current = { pane, startX: e.clientX, startW };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };



  return (
    <div className="flex min-h-0 flex-1 w-full overflow-hidden bg-muted/30">
      <aside
        className="h-full shrink-0 overflow-hidden border-r border-border/60 bg-muted"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </aside>

      <div
        onMouseDown={startPaneDrag("sidebar", sidebarWidth)}
        className="w-px shrink-0 cursor-col-resize bg-border/60 transition-all hover:w-1 hover:bg-primary/40"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize journals sidebar"
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border/60 bg-background">
        {list}
      </section>

      <div
        onMouseDown={startPaneDrag("editor", editorWidth)}
        className="w-px shrink-0 cursor-col-resize bg-border/60 transition-all hover:w-1 hover:bg-primary/40"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize overview panel"
      />

      <main
        className="flex min-h-0 shrink-0 flex-col overflow-hidden bg-background"
        style={{ width: editorWidth }}
      >
        {editor}
      </main>

    </div>

  );

}


