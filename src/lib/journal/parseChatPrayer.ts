const ABBREV_DOT = "%%DOT%%";

const PRAYER_OPENERS =
  /^(?:Father|Lord|Jesus|Dear\s|Heavenly\s|God,|O\s|Our\s|Holy\s|Almighty\s|Gracious\s)/i;

/** Pull plain text out of ReactMarkdown blockquote children. */
export function extractMarkdownText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractMarkdownText).filter(Boolean).join("\n\n");
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return extractMarkdownText(props?.children);
  }
  return "";
}

export type ParsedChatPrayer = {
  label: string;
  title: string;
  body: string;
};

/** Split a prayer blockquote into label, title, and flowing body text. */
export function parseChatPrayer(raw: string): ParsedChatPrayer {
  const cleaned = raw
    .replace(/\*\*/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!cleaned) {
    return { label: "Prayer", title: "A Prayer", body: "" };
  }

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let title = "";
  let body = cleaned.replace(/\s+/g, " ").trim();

  if (lines.length >= 2 && looksLikePrayerTitle(lines[0]) && PRAYER_OPENERS.test(lines[1])) {
    title = lines[0];
    body = lines.slice(1).join(" ").replace(/\s+/g, " ").trim();
  } else {
    const inline = cleaned.replace(/\s+/g, " ").trim();
    const split = inline.match(
      /^(.{3,56}?)\s+(Father,|Lord,|Jesus,|Dear\s|Heavenly\s|God,|O\s|Our\s|Holy\s|Almighty\s|Gracious\s)/i,
    );
    if (split && split[1].split(/\s+/).length <= 7 && looksLikePrayerTitle(split[1])) {
      title = split[1].trim();
      body = (split[2] + inline.slice(split[0].length)).trim();
    }
  }

  if (!title) {
    title = derivePrayerTitle(body);
  }

  return {
    label: inferPrayerLabel(body),
    title,
    body,
  };
}

function looksLikePrayerTitle(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 56) return false;
  if (PRAYER_OPENERS.test(trimmed)) return false;
  if (/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length > 6) return false;
  return true;
}

function derivePrayerTitle(body: string): string {
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return body;
  const snippet = words.slice(0, 4).join(" ");
  return snippet.endsWith(",") ? `${snippet.slice(0, -1)}…` : `${snippet}…`;
}

function inferPrayerLabel(body: string): string {
  if (/\bevening\b/i.test(body)) return "Evening Prayer";
  if (/\bnight\b/i.test(body)) return "Evening Prayer";
  if (/\bmorning\b/i.test(body)) return "Morning Prayer";
  return "Morning Prayer";
}

/** Bible-style flowing prayer — one sentence per verse with inline numbers. */
export function splitPrayerSentences(text: string): string[] {
  const protectedText = text.replace(
    /\b(e\.g\.|i\.e\.|vs\.|Mr\.|Mrs\.|Ms\.|Dr\.|St\.)\b/gi,
    (match) => match.replace(/\./g, ABBREV_DOT),
  );
  const parts =
    protectedText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text];
  return parts
    .map((part) => part.replaceAll(ABBREV_DOT, ".").trim())
    .filter(Boolean);
}
