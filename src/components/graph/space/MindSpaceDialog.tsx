import { useMemo, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Focus, Minus, Orbit, PanelRight, Pause, Play, Plus, Search, Type } from "lucide-react";
import type { MindGraphFilters, MindGraphNode } from "@/lib/graph/unifiedMindGraph";
import { defaultMindSpaceFocus, indexMindSpace, selectMindSpace, type MindSpaceGraph } from "@/lib/graph/mindSpaceGraph";
import { MindSpaceCanvas, type MindSpaceCameraControls } from "./MindSpaceCanvas";
import { MindSpacePanel } from "./MindSpacePanel";
import { useSpaceMotion } from "./useSpaceMotion";
import "./mindSpace.css";

type Props = {
  graph: MindSpaceGraph; filters: MindGraphFilters; onToggleFilter: (kind: keyof MindGraphFilters) => void;
  onResetFilters: () => void; onClose: () => void; onOpenNode: (node: MindGraphNode) => void;
  returnFocusRef: RefObject<HTMLButtonElement>; journalScoped?: boolean;
};
export default function MindSpaceDialog(props: Props) {
  const index = useMemo(() => indexMindSpace(props.graph), [props.graph]);
  const [center, setCenter] = useState<string | null>(() => defaultMindSpaceFocus(index));
  const focus = center && index.nodes.has(center) ? center : defaultMindSpaceFocus(index);
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState(2);
  const [clustered, setClustered] = useState(false);
  const [labels, setLabels] = useState(true);
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 900);
  const [traceMode, setTraceMode] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const traceTarget = target && index.nodes.has(target) ? target : null;
  const selected = traceMode && traceTarget ? traceTarget : focus;
  const cameraRef = useRef<MindSpaceCameraControls>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelToggleRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { reduced, motion, toggleMotion } = useSpaceMotion();
  const scene = useMemo(() => selectMindSpace(index, focus, depth, 48, traceMode ? traceTarget : null), [index, focus, depth, traceMode, traceTarget]);
  const focusNode = (id: string) => {
    setCenter(id); setTarget(null); setTraceMode(false); setQuery("");
    cameraRef.current?.reset();
  };
  const pick = (id: string) => {
    if (traceMode && focus && id !== focus) { setTarget(id); setQuery(""); }
    else focusNode(id);
    setPanelOpen(true);
  };
  const reset = () => { focusNode(defaultMindSpaceFocus(index) ?? ""); cameraRef.current?.reset(); };
  return <Dialog.Root open onOpenChange={(open) => { if (!open) props.onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="mind-space-overlay" />
      <Dialog.Content className="mind-space" data-mind-space
        onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); props.returnFocusRef.current?.focus(); }}>
        <header className="mind-space-header">
          <div className="mind-space-brand"><Orbit size={25} aria-hidden="true" /><div><Dialog.Title>Mind space</Dialog.Title><p>{props.journalScoped ? "YOUR JOURNAL, CONNECTED" : "YOUR THOUGHTS, CONNECTED"}</p></div></div>
          <div className="mind-space-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} type="search" placeholder="Find a thought, verse, or source…" aria-label="Search mind space"
            value={query} onFocus={() => setPanelOpen(true)} onChange={(event) => { setQuery(event.target.value); setPanelOpen(true); }} /></div>
          <button ref={panelToggleRef} className="space-icon" aria-expanded={panelOpen} aria-controls="mind-space-details" aria-label={panelOpen ? "Hide details and filters" : "Show details and filters"} onClick={() => setPanelOpen((open) => !open)}><PanelRight size={19} /></button>
          <Dialog.Close asChild><button ref={closeRef} className="space-exit"><ArrowLeft size={17} />Map</button></Dialog.Close>
        </header>
        <Dialog.Description className="sr-only">Explore your saved thoughts in a spatial network. Select a thought to center it, search or use the accessible list, and trace saved connections. Escape returns to the regular map.</Dialog.Description>
        <div className="mind-space-body">
          <main className="mind-space-stage" aria-label="Spatial map">
            <MindSpaceCanvas ref={cameraRef} scene={scene} focus={focus} selected={selected} labels={labels} motion={motion} clustered={clustered} onSelect={pick} />
            <div className="mind-space-scene-heading"><p className="space-eyebrow">{traceMode ? "CONNECTION TRACE" : depth === 0 ? "CONSTELLATION OVERVIEW" : "THOUGHT NEIGHBORHOOD"}</p>
              <h2>{focus ? index.nodes.get(focus)?.label : "An open space"}</h2>
              <p>{scene.nodes.length} visible · {scene.links.length} links{scene.total > scene.nodes.length ? ` · ${scene.total - scene.nodes.length} more in this view` : ""}</p>
            </div>
            {!scene.nodes.length ? <div className="mind-space-empty"><Orbit size={40} /><h2>Make room for a thought</h2><p>No thoughts match these filters.</p><button className="space-primary" onClick={props.onResetFilters}>Restore filters</button></div> : null}
            <div className="mind-space-controls" aria-label="Space controls">
              <button className="space-icon" title="Return to center" aria-label="Return to center" onClick={reset}><Focus size={19} /></button>
              <button className="space-icon" title="Zoom in" aria-label="Zoom in" onClick={() => cameraRef.current?.zoom(0.8)}><Plus size={19} /></button>
              <button className="space-icon" title="Zoom out" aria-label="Zoom out" onClick={() => cameraRef.current?.zoom(1.25)}><Minus size={19} /></button>
              <span className="space-divider" />
              <button className="space-icon" aria-label={motion ? "Pause motion" : "Resume motion"} aria-pressed={!motion} disabled={reduced} title={reduced ? "Motion is off: your device prefers reduced motion" : motion ? "Pause motion" : "Resume motion"} onClick={toggleMotion}>{motion ? <Pause size={17} /> : <Play size={17} />}</button>
              <button className="space-icon" aria-label="Show labels" aria-pressed={labels} title="Show labels" onClick={() => setLabels((value) => !value)}><Type size={18} /></button>
            </div>
            <p className="mind-space-hint">Drag to orbit · Scroll or pinch to explore · Select a thought</p>
          </main>
          {panelOpen ? <div id="mind-space-details" className="mind-space-panel-wrap"><MindSpacePanel index={index} scene={scene} focus={focus} selected={selected}
            query={query} traceMode={traceMode} traceTarget={traceTarget} filters={props.filters} onToggleFilter={props.onToggleFilter} onResetFilters={props.onResetFilters}
            onPick={pick} onFocus={focusNode} onOpen={(node) => { props.onClose(); props.onOpenNode(node); }} onTrace={() => { setTraceMode((active) => !active); setTarget(null); setQuery(""); }}
            onClose={() => { setPanelOpen(false); panelToggleRef.current?.focus(); }} /></div> : null}
        </div>
        <footer className="mind-space-footer">
          <label>Neighborhood<select aria-label="Connection depth" value={depth} onChange={(event) => setDepth(Number(event.target.value))}><option value={1}>1 link away</option><option value={2}>2 links away</option><option value={3}>3 links away</option><option value={0}>Overview</option></select></label>
          <label>Layout<select aria-label="Space layout" value={clustered ? "cluster" : "space"} onChange={(event) => setClustered(event.target.value === "cluster")}><option value="space">Constellation</option><option value="cluster">Group by type</option></select></label>
          <p>{reduced ? "Reduced motion · " : ""}Saved relationships only · {index.nodes.size} loaded thoughts{scene.hiddenLinks ? ` · ${scene.hiddenLinks} dense links hidden` : ""}</p>
        </footer>
        <div className="sr-only" role="status" aria-live="polite">{focus ? `Centered on ${index.nodes.get(focus)?.label}. ${scene.nodes.length} visible thoughts.` : "No visible thoughts."}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
