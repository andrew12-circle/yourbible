import { ReactNode, useEffect, useRef, useState } from "react";



/**

 * Day One-style 3-pane desktop shell: sidebar | entry list | editor.

 * List and editor share equal width; sidebar width is draggable.

 */

const KEY = "yb.journal.sidebar.v1";

const MIN_SIDEBAR = 200;

const MAX_SIDEBAR = 360;



function loadSidebarWidth() {

  try {

    const raw = localStorage.getItem(KEY);

    if (raw) {

      const v = JSON.parse(raw) as { sidebar?: number };

      return clamp(v.sidebar ?? 248, MIN_SIDEBAR, MAX_SIDEBAR);

    }

  } catch { /* */ }

  return 248;

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

  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);

  const dragRef = useRef<null | { startX: number; startW: number }>(null);



  useEffect(() => {

    try {

      localStorage.setItem(KEY, JSON.stringify({ sidebar: sidebarWidth }));

    } catch { /* */ }

  }, [sidebarWidth]);



  useEffect(() => {

    const onMove = (e: MouseEvent) => {

      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startX;

      setSidebarWidth(clamp(dragRef.current.startW + dx, MIN_SIDEBAR, MAX_SIDEBAR));

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



  const startSidebarDrag = (e: React.MouseEvent) => {

    dragRef.current = { startX: e.clientX, startW: sidebarWidth };

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

        onMouseDown={startSidebarDrag}

        className="w-px shrink-0 cursor-col-resize bg-border/60 transition-all hover:w-1 hover:bg-primary/40"

      />

      <div className="flex min-h-0 min-w-0 flex-1">

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border/60 bg-background">

          {list}

        </section>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">

          {editor}

        </main>

      </div>

    </div>

  );

}


