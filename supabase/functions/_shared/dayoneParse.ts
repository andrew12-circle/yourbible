import JSZip from "npm:jszip@3.10.1";

export interface DayOnePhoto {
  identifier: string;
  md5: string | null;
  type: string;
  width: number | null;
  height: number | null;
  orderInEntry: number;
}

export interface DayOneEntry {
  uuid: string;
  entryId: string | null;
  creationDate: string;
  modifiedDate: string | null;
  body: string;
  title: string | null;
  tags: string[];
  pinned: boolean;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  weather: string | null;
  weatherTempC: number | null;
  photos: DayOnePhoto[];
}

export interface DayOneJournalExport {
  name: string;
  entries: DayOneEntry[];
}

export function dayOneUuidToStandard(raw: string): string | null {
  const hex = raw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function dayOneTextToBody(text: string): string {
  let s = text;
  s = s.replace(/!\[\]\(dayone-moment:\/\/[A-F0-9-]+\)\s*/gi, "");
  s = s.replace(/\\([_\[\]()#*\-+.!])/g, "$1");
  return s.trim();
}

export function extractTitleFromBody(body: string): { title: string | null; body: string } {
  const m = body.match(/^#\s+(.+?)(?:\n|$)/m);
  if (!m) return { title: null, body };
  const title = m[1].trim();
  const rest = body.replace(/^#\s+.+?(?:\n|$)/m, "").trim();
  return { title: title || null, body: rest };
}

function textFromRichText(richText: unknown): string {
  if (typeof richText !== "string" || !richText.trim()) return "";
  try {
    const parsed = JSON.parse(richText) as { contents?: unknown[] };
    const parts: string[] = [];
    const walk = (nodes: unknown[]) => {
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        if (typeof o.text === "string" && o.text.trim()) parts.push(o.text);
        if (Array.isArray(o.contents)) walk(o.contents);
      }
    };
    if (Array.isArray(parsed.contents)) walk(parsed.contents);
    return parts.join("\n\n").trim();
  } catch {
    return "";
  }
}

function parseEntry(raw: Record<string, unknown>): DayOneEntry | null {
  const uuid = typeof raw.uuid === "string" ? raw.uuid : "";
  if (!uuid) return null;

  let body = typeof raw.text === "string" ? dayOneTextToBody(raw.text) : "";
  if (!body) {
    body = textFromRichText(raw.richText);
  }
  const titled = extractTitleFromBody(body);
  body = titled.body;
  let title = titled.title;
  if (!title && typeof raw.activity === "string" && raw.activity.trim()) {
    title = raw.activity.trim();
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];

  const loc = raw.location as Record<string, unknown> | undefined;
  const locationName =
    (typeof loc?.placeName === "string" && loc.placeName) ||
    (typeof loc?.localityName === "string" && loc.localityName) ||
    null;
  const lat = typeof loc?.latitude === "number" ? loc.latitude : null;
  const lng = typeof loc?.longitude === "number" ? loc.longitude : null;

  const w = raw.weather as Record<string, unknown> | undefined;
  const weather =
    (typeof w?.conditionsDescription === "string" && w.conditionsDescription) ||
    (typeof w?.weatherCode === "string" && w.weatherCode) ||
    null;
  const weatherTempC = typeof w?.temperatureCelsius === "number" ? w.temperatureCelsius : null;

  const creationDate =
    (typeof raw.creationDate === "string" && raw.creationDate) ||
    (typeof raw.date === "string" && raw.date) ||
    new Date().toISOString();

  const photos: DayOnePhoto[] = [];
  if (Array.isArray(raw.photos)) {
    for (const p of raw.photos) {
      if (!p || typeof p !== "object") continue;
      const ph = p as Record<string, unknown>;
      const identifier = typeof ph.identifier === "string" ? ph.identifier : "";
      if (!identifier) continue;
      photos.push({
        identifier,
        md5: typeof ph.md5 === "string" ? ph.md5.toLowerCase() : null,
        type: typeof ph.type === "string" ? ph.type : "jpeg",
        width: typeof ph.width === "number" ? ph.width : null,
        height: typeof ph.height === "number" ? ph.height : null,
        orderInEntry: typeof ph.orderInEntry === "number" ? ph.orderInEntry : photos.length,
      });
    }
    photos.sort((a, b) => a.orderInEntry - b.orderInEntry);
  }

  return {
    uuid,
    entryId: dayOneUuidToStandard(uuid),
    creationDate,
    modifiedDate: typeof raw.modifiedDate === "string" ? raw.modifiedDate : null,
    body,
    title,
    tags,
    pinned: raw.isPinned === true || raw.starred === true,
    locationName,
    lat,
    lng,
    weather,
    weatherTempC,
    photos,
  };
}

export function parseDayOneJson(
  parsed: unknown,
  journalName = "Imported from Day One",
): DayOneJournalExport {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid Day One file: expected a JSON object.");
  }
  const root = parsed as Record<string, unknown>;
  const entriesRaw = root.entries;
  if (!Array.isArray(entriesRaw)) {
    throw new Error("Invalid Day One file: missing entries array.");
  }
  const entries: DayOneEntry[] = [];
  for (const row of entriesRaw) {
    if (!row || typeof row !== "object") continue;
    const e = parseEntry(row as Record<string, unknown>);
    if (e && (e.body || e.title || e.photos.length)) entries.push(e);
  }
  if (entries.length === 0) {
    throw new Error("No importable entries found in this Day One export.");
  }
  return { name: journalName, entries };
}

function journalNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const name = base.replace(/\.json$/i, "").replace(/[-_]/g, " ").trim();
  return name || "Imported from Day One";
}

export async function loadDayOneExportsFromBytes(
  bytes: Uint8Array,
  isZip: boolean,
  fallbackJournalName?: string,
): Promise<{ exports: DayOneJournalExport[]; zip: JSZip | null }> {
  if (!isZip) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const parsed = JSON.parse(text);
    return {
      exports: [parseDayOneJson(parsed, fallbackJournalName ?? "Imported from Day One")],
      zip: null,
    };
  }

  const zip = await JSZip.loadAsync(bytes);
  const jsonPaths: string[] = [];
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    if (!relativePath.toLowerCase().endsWith(".json")) return;
    if (relativePath.toLowerCase().includes("manifest")) return;
    jsonPaths.push(relativePath);
  });

  if (jsonPaths.length === 0) {
    throw new Error("Zip does not contain a Day One Journal.json (or other .json export).");
  }

  jsonPaths.sort((a, b) => {
    const aJournal = /journal\.json$/i.test(a) ? 0 : 1;
    const bJournal = /journal\.json$/i.test(b) ? 0 : 1;
    if (aJournal !== bJournal) return aJournal - bJournal;
    return a.length - b.length;
  });

  const exports: DayOneJournalExport[] = [];
  for (const path of jsonPaths) {
    const file = zip.file(path);
    if (!file) continue;
    try {
      const parsed = JSON.parse(await file.async("string"));
      exports.push(parseDayOneJson(parsed, journalNameFromPath(path)));
    } catch {
      /* skip non–Day One json */
    }
  }

  if (exports.length === 0) {
    throw new Error("No valid Day One journal JSON found in this zip.");
  }

  return { exports, zip };
}

export async function readPhotoFromZip(
  zip: JSZip,
  photo: DayOnePhoto,
): Promise<{ bytes: Uint8Array; ext: string; contentType: string } | null> {
  const exts = [photo.type || "jpeg", "jpg", "jpeg", "png", "heic", "gif", "webp"];
  const bases: string[] = [];
  if (photo.md5) bases.push(`photos/${photo.md5}`);
  bases.push(`photos/${photo.identifier}`);

  for (const base of bases) {
    for (const ext of exts) {
      const path = `${base}.${ext}`.replace(/\.\./g, ".");
      const f = zip.file(path) ?? zip.file(path.toLowerCase());
      if (!f) continue;
      const bytes = new Uint8Array(await f.async("uint8array"));
      const safeExt = ext === "jpeg" ? "jpg" : ext;
      const contentType =
        safeExt === "png"
          ? "image/png"
          : safeExt === "gif"
            ? "image/gif"
            : safeExt === "webp"
              ? "image/webp"
              : "image/jpeg";
      return { bytes, ext: safeExt, contentType };
    }
  }
  return null;
}
