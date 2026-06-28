/**
 * Build a stable Wikimedia Commons thumbnail URL without API calls.
 * Special:FilePath redirects to the correct upload.wikimedia.org thumb.
 */
export function wikimediaThumbUrl(filename: string, width = 960): string {
  const normalized = filename.replace(/^File:/i, "").trim();
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=${width}`;
}

export function wikimediaFilePageUrl(filename: string): string {
  const normalized = filename.replace(/^File:/i, "").trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(normalized).replace(/%2F/g, "/")}`;
}

/** Doré numbered engravings use NNN.Title_Words.jpg on Commons. */
export function doreCommonsFilename(num: number | string, title: string): string {
  const prefix = String(num).padStart(3, "0");
  const slug = title
    .replace(/'/g, "'")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return `${prefix}.${slug}.jpg`;
}
