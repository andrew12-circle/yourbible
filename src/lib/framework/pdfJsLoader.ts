type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsModule: PdfJsModule | null = null;
let workerConfigured = false;

export async function loadPdfJs(): Promise<PdfJsModule> {
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
