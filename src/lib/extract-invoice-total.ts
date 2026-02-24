/**
 * Extract the invoice total from an uploaded file.
 * - PDFs: text extraction via pdf.js, with OCR fallback for scanned docs
 * - Images: OCR via Tesseract.js
 * Returns the detected total amount, or null if none found.
 */

/**
 * Find dollar amounts in text and return the most likely "total".
 * Prioritizes amounts preceded by keywords like "total", "amount due", "balance".
 * Falls back to the largest dollar amount found.
 */
function findTotal(text: string): number | null {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ");

  // Look for amounts near "total" keywords first
  const totalPatterns = [
    /(?:total\s*(?:due|amount|balance|charged)?|amount\s*due|balance\s*due|grand\s*total)\s*[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  ];

  for (const pattern of totalPatterns) {
    const matches = [...normalized.matchAll(pattern)];
    if (matches.length > 0) {
      // Take the last match (often the grand total appears after subtotals)
      const last = matches[matches.length - 1];
      const value = parseFloat(last[1].replace(/,/g, ""));
      if (value > 0 && value < 10_000_000) return value;
    }
  }

  // Fallback: find all dollar amounts and return the largest
  const dollarPattern = /\$\s*([\d,]+\.\d{2})/g;
  const amounts: number[] = [];

  for (const match of normalized.matchAll(dollarPattern)) {
    const value = parseFloat(match[1].replace(/,/g, ""));
    if (value > 0 && value < 10_000_000) amounts.push(value);
  }

  if (amounts.length > 0) {
    return Math.max(...amounts);
  }

  return null;
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  const pageCount = Math.min(pdf.numPages, 5); // Scan first 5 pages max

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n");
}

/**
 * Render PDF pages to images and run OCR — for scanned/image-based PDFs.
 */
async function ocrFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const Tesseract = await import("tesseract.js");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = Math.min(pdf.numPages, 3); // OCR first 3 pages max

  const textParts: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 }); // Higher res for OCR

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );

    const { data } = await Tesseract.recognize(blob, "eng");
    textParts.push(data.text);
  }

  return textParts.join("\n");
}

async function extractFromImage(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(file, "eng");
  return data.text;
}

export async function extractInvoiceTotal(file: File): Promise<number | null> {
  try {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      // Try text extraction first (fast)
      const text = await extractFromPdf(file);
      const total = findTotal(text);
      if (total !== null) return total;

      // Fallback: render pages to images and OCR (for scanned PDFs)
      const ocrText = await ocrFromPdf(file);
      return findTotal(ocrText);
    }

    const text = await extractFromImage(file);
    return findTotal(text);
  } catch (err) {
    console.error("Invoice total extraction failed:", err);
    return null;
  }
}
