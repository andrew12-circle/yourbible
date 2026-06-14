type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsModule: PdfJsModule | null = null;
let workerConfigured = false;

export async function loadPdfJs(): Promise<PdfJsModule> {
  if (pdfJsModule) return pdfJsModule;
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
    workerConfigured = true;
  }
  pdfJsModule = pdfjs;
  return pdfjs;
}
