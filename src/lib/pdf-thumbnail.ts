/**
 * Render the first page of a PDF as a JPEG data URL for use as a thumbnail.
 */
export async function renderPdfThumbnail(
  source: File | ArrayBuffer,
  maxSize = 200
): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer =
    source instanceof ArrayBuffer ? source : await source.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // Scale so the longest side fits within maxSize
  const unscaled = page.getViewport({ scale: 1 });
  const scale = maxSize / Math.max(unscaled.width, unscaled.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;

  return canvas.toDataURL("image/jpeg", 0.75);
}
