import { ExternalLink, Focus, Route, X } from "lucide-react";
import type { MindGraphFilters, MindGraphNode } from "@/lib/graph/unifiedMindGraph";
import { MIND_SPACE_KINDS, searchMindSpace, spaceKind, type MindSpaceIndex } from "@/lib/graph/mindSpaceGraph";
import type { SpaceScene } from "./mindSpaceRenderer";
import { useMemo, useState } from "react";

type Props = {
  index: MindSpaceIndex; scene: SpaceScene; focus: string | null; selected: string | null;
  query: string; traceMode: boolean; traceTarget: string | null; filters: MindGraphFilters;
  onToggleFilter: (kind: keyof MindGraphFilters) => void; onResetFilters: () => void;
  onPick: (id: string) => void; onFocus: (id: string) => void; onOpen: (node: MindGraphNode) => void;
  onTrace: () => void; onClose: () => void;
};
export function MindSpacePanel(props: Props) {
  const { index, scene, focus, selected, query, traceMode, traceTarget, filters, onPick, onFocus, onOpen } = props;
  const results = useMemo(() => searchMindSpace(index, query), [index, query]);
  const [resultPages, setResultPages] = useState(1);
  const [allConnections, setAllConnections] = useState(false);
  const node = selected ? index.nodes.get(selected) : undefined;
  const connections = node ? index.adjacency.get(node.id) ?? [] : [];
  return <aside className="mind-space-panel" aria-label="Thought details and filters">
    <div className="mind-space-panel-heading"><span>EXPLORE CONNECTIONS</span><button className="space-icon" aria-label="Hide details and filters" onClick={props.onClose}><X size={18} /></button></div>
    <div className="mind-space-panel-scroll">
      <fieldset className="mind-space-filters">
        <legend>Show in this space</legend>
        <div>{MIND_SPACE_KINDS.map(({ kind, label, color }) => <button key={kind} type="button" aria-pressed={filters[kind]}
          onClick={() => props.onToggleFilter(kind)}><i style={{ background: color }} aria-hidden="true" />{label}</button>)}</div>
        {!Object.values(filters).some(Boolean) ? <button className="space-text-action" onClick={props.onResetFilters}>Restore filters</button> : null}
      </fieldset>
      {traceMode ? <section className="mind-space-trace" aria-label="Connection trace">
        <div className="space-eyebrow"><Route size={14} /> TRACE A PATH</div>
        {!traceTarget ? <p>Select another thought in space or search to trace its saved links to the center.</p>
          : scene.trace ? <>
            <p>{scene.trace.links.length} saved {scene.trace.links.length === 1 ? "connection" : "connections"}. Follow the highlighted path.</p>
            <ol>{scene.trace.ids.map((id, i) => <li key={id}>
              {i > 0 ? <span className="space-path-relation">↳ {scene.trace!.links[i - 1].relation}</span> : null}
              <button onClick={() => onFocus(id)}>{index.nodes.get(id)?.label}</button>
            </li>)}</ol>
            <p className="space-caption">Links can be followed in either direction. A path does not imply agreement or causation.</p>
            {scene.trace.ids.length > scene.nodes.length ? <p>Long path: the full sequence is listed here; the scene shows a bounded selection.</p> : null}
          </> : <p>No saved path in the currently loaded, filtered map. Try showing more node types. No connection has been invented.</p>}
        <button className="space-text-action" onClick={props.onTrace}>Exit trace</button>
      </section> : null}
      {query.trim() ? <section className="space-results" aria-label="Search results">
        <h2>{results.length} {results.length === 1 ? "match" : "matches"}</h2>
        <p className="space-caption">Search covers the loaded map, not just the visible cluster.</p>
        {results.slice(0, resultPages * 30).map((result) => <button key={result.id} className="space-node-row" onClick={() => onPick(result.id)}>
          <i style={{ background: spaceKind(result.kind).color }} aria-hidden="true" /><span>{result.label}<small>{spaceKind(result.kind).label}</small></span>
        </button>)}
        {results.length > resultPages * 30 ? <button className="space-text-action" onClick={() => setResultPages((value) => value + 1)}>Show more matches</button> : null}
      </section> : null}
      {node ? <section className="space-detail" aria-label="Selected thought">
        <p className="space-eyebrow" style={{ color: spaceKind(node.kind).color }}>{spaceKind(node.kind).label} · {node.id === focus ? "AT THE CENTER" : "SELECTED"}</p>
        <h2>{node.label}</h2>
        <p className="space-caption">{index.degree(node.id)} connected {index.degree(node.id) === 1 ? "thought" : "thoughts"}</p>
        {node.detail ? <p className="space-excerpt">{node.detail}</p> : <p className="space-caption">Open the source to read its content in context.</p>}
        <div className="space-detail-actions">
          {node.id !== focus ? <button className="space-secondary" onClick={() => onFocus(node.id)}><Focus size={15} />Center here</button> : null}
          <button className="space-primary" onClick={() => onOpen(node)}><ExternalLink size={15} />Open {node.kind === "verse" ? "passage" : node.kind === "entry" ? "entry" : "source"}</button>
          {!traceMode ? <button className="space-secondary" onClick={props.onTrace}><Route size={15} />Trace connection</button> : null}
        </div>
        <h3>Why it connects</h3>
        {!connections.length ? <p className="space-caption">This thought has no saved links yet. Link it to an entry, belief, verse, or source to grow its neighborhood.</p>
          : connections.slice(0, allConnections ? 200 : 6).map(({ id, link }, i) => <button key={`${id}:${i}`} className="space-node-row" onClick={() => onPick(id)}>
            <i style={{ background: spaceKind(index.nodes.get(id)!.kind).color }} aria-hidden="true" />
            <span>{index.nodes.get(id)!.label}<small>{link.source === node.id ? "→" : "←"} {link.relation}</small></span>
          </button>)}
        {connections.length > 6 && !allConnections ? <button className="space-text-action" onClick={() => setAllConnections(true)}>Show more connections</button> : null}
      </section> : <p className="space-caption">No thoughts match these filters. Restore a type to explore the map.</p>}
      {!query.trim() ? <section aria-label="Visible thoughts" className="space-results">
        <h3>In this neighborhood</h3>
        <p className="space-caption">The same thoughts as the canvas, available by keyboard.</p>
        {scene.nodes.map((result) => <button key={result.id} className="space-node-row" aria-current={result.id === selected ? "true" : undefined} onClick={() => onPick(result.id)}>
          <i style={{ background: spaceKind(result.kind).color }} aria-hidden="true" /><span>{result.label}<small>{spaceKind(result.kind).label}</small></span>
        </button>)}
      </section> : null}
    </div>
  </aside>;
}
