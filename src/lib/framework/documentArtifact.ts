/** Artifacts the user reads as a book (PDF, uploaded text, pasted notes). */
export function isReadableDocumentKind(kind: string | null | undefined): boolean {
  return kind === "pdf" || kind === "text_file" || kind === "text";
}

export function documentAuthorLine(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const author =
    (typeof metadata.author === "string" && metadata.author.trim()) ||
    (typeof metadata.author_name === "string" && metadata.author_name.trim()) ||
    (typeof metadata.publisher === "string" && metadata.publisher.trim()) ||
    null;
  return author;
}

export function documentPageCount(metadata: Record<string, unknown> | null | undefined): number | null {
  if (!metadata) return null;
  const n = metadata.page_count;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return Math.floor(n);
  return null;
}

/** Permanent storage key for the source PDF (artifact-uploads bucket). */
export function pdfStoragePath(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const path = metadata.pdf_storage_path;
  return typeof path === "string" && path.trim() ? path.trim() : null;
}

/** Candidate storage keys for the source PDF (metadata path, then standard import layout). */
export function resolvePdfStoragePaths(
  userId: string | null | undefined,
  artifactId: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  const paths: string[] = [];
  const fromMeta = pdfStoragePath(metadata);
  if (fromMeta) paths.push(fromMeta);
  if (userId && artifactId) {
    const inferred = `${userId}/artifacts/${artifactId}.pdf`;
    if (!paths.includes(inferred)) paths.push(inferred);
  }
  return paths;
}

/** JPEG extracted from PDF page 1 (artifact-uploads bucket). */
export function coverStoragePath(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const path = metadata.cover_storage_path;
  return typeof path === "string" && path.trim() ? path.trim() : null;
}

/** External thumbnail URL when already public (e.g. YouTube). */
export function documentCoverUrl(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const url = metadata.thumbnail_url;
  return typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function isPdfArtifactKind(kind: string | null | undefined): boolean {
  return kind === "pdf";
}
