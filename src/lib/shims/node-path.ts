/** Browser shim for optional FsCache in youtube-transcript-plus. */
export function join(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}

export default { join };
