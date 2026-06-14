type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsModule: PdfJsModule | null = null;
let workerConfigured = false;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (pdfJsModule) return pdfJsModule;
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  pdfJsModule = pdfjs;
  return pdfjs;
}

/** Render a PDF page to a JPEG object URL (browser only). Caller should revoke when done. */
export async function renderPdfPageToObjectUrl(
  pdfUrl: string,
  pageNumber = 1,
  scale = 1.35,
): Promise<string> {
  const pdfjs = await loadPdfJs();
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Could not download PDF (${res.status}).`);
  const data = new Uint8Array(await res.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await doc.getPage(Math.min(Math.max(1, pageNumber), doc.numPages));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode cover image."))),
        "image/jpeg",
        0.9,
      );
    });

    return URL.createObjectURL(blob);
  } finally {
    await doc.destroy();
  }
}

export async function renderPdfPageToBlob(
  pdfUrl: string,
  pageNumber = 1,
  scale = 1.35,
): Promise<Blob> {
  const objectUrl = await renderPdfPageToObjectUrl(pdfUrl, pageNumber, scale);
  try {
    const res = await fetch(objectUrl);
    return await res.blob();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
