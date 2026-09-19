/** Explicit, local-only export. Never discard the recovery copy after downloading. */
export function downloadJournalVideoBackup(blob: Blob, recordingId = "recording"): void {
  if (!blob.size) throw new Error("There are no recorded video bytes to download yet.");
  const mime = blob.type.split(";", 1)[0].toLowerCase();
  const extension = mime === "video/quicktime" ? "mov" : mime === "video/mp4" ? "mp4" : "webm";
  const safeId = recordingId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `journal-${safeId}.${extension}`;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Safari may consume the URL after the click handler returns.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
