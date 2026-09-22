import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/** Keep the number attached even when the publisher's first text part starts
 * with spaces or the first word is divided between styled spans. The wrapper
 * changes no characters and stays inside the existing, single verse body. */
export function bindVerseOpeningWord(nodes: ReactNode[], text: string): ReactNode[] {
  const match = /^\s*\S+/u.exec(text);
  if (!match) return nodes;
  // Long unbroken tokens must retain the paginator's emergency word cuts.
  if (match[0].length > 32) return nodes;
  let remaining = match[0].length;
  function split(node: ReactNode): [ReactNode[], ReactNode[]] {
    if (remaining <= 0) return [[], [node]];
    if (typeof node === "string") {
      const end = Math.min(remaining, node.length);
      remaining -= end;
      return [[node.slice(0, end)], end < node.length ? [node.slice(end)] : []];
    }
    if (Array.isArray(node)) {
      const lead: ReactNode[] = [], rest: ReactNode[] = [];
      for (const child of node) { const [a, b] = split(child); lead.push(...a); rest.push(...b); }
      return [lead, rest];
    }
    if (!isValidElement(node) || node.type === "sup" || node.type === "figure") return [[node], []];
    const element = node as ReactElement<{ children?: ReactNode }>;
    const [lead, rest] = split(element.props.children);
    if (!rest.length) return [[node], []];
    return [lead.length ? [cloneElement(element, { key: `${element.key ?? "text"}-lead` }, ...lead)] : [],
      [cloneElement(element, { key: `${element.key ?? "text"}-rest` }, ...rest)]];
  }
  const [lead, rest] = split(nodes);
  return [<span key="verse-opening-word" className="reader-verse-first-word">{lead}</span>, ...rest];
}
