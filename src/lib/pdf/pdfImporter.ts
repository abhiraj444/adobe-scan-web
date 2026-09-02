import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use Vite's ?url import pattern for reliable bundling
// This is the ONLY reliable way to load pdfjs worker in Vite production builds
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
);
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;

export interface ExtractedPdfPage {
  pageNumber: number;
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  pdfWidthPt: number;
  pdfHeightPt: number;
}

/**
 * Extracts all pages of a PDF file as image data URLs and lightweight thumbnails.
 * Uses the v6 canvas-first API for pdfjs-dist 6.2.108.
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  console.log('[pdfImporter] Worker src:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  console.log('[pdfImporter] pdfjs-dist version:', pdfjsLib.version);
  console.log('[pdfImporter] File size:', arrayBuffer.byteLength, 'bytes');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  console.log('[pdfImporter] PDF loaded successfully, numPages:', numPages);

  const pages: ExtractedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }

    const page = await pdf.getPage(pageNum);

    // Exact original PDF dimensions in points (72 points = 1 inch)
    const baseViewport = page.getViewport({ scale: 1.0 });
    const pdfWidthPt = baseViewport.width;
    const pdfHeightPt = baseViewport.height;

    // Scale for rendering — clamp to avoid huge canvases
    const targetScale = Math.min(2.0, Math.max(1.0, 1100 / (baseViewport.width || 600)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const w = Math.floor(viewport.width);
    const h = Math.floor(viewport.height);
    canvas.width = w;
    canvas.height = h;

    // v6 API: pass canvas directly (preferred), no canvasContext needed
    const renderTask = page.render({
      canvas: canvas,
      viewport: viewport,
    } as any);

    await renderTask.promise;

    // Verify the canvas actually has content (not blank)
    if (pageNum <= 3) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sample = ctx.getImageData(0, 0, Math.min(w, 100), Math.min(h, 100));
        let nonWhitePixels = 0;
        for (let i = 0; i < sample.data.length; i += 4) {
          if (sample.data[i] < 250 || sample.data[i + 1] < 250 || sample.data[i + 2] < 250) {
            nonWhitePixels++;
          }
        }
        console.log(`[pdfImporter] Page ${pageNum} render check: ${nonWhitePixels} non-white pixels in 100x100 sample (canvas: ${w}x${h})`);
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    if (pageNum <= 3) {
      console.log(`[pdfImporter] Page ${pageNum} dataUrl length: ${dataUrl.length}, starts with: ${dataUrl.substring(0, 50)}`);
    }

    // Generate lightweight thumbnail for filmstrip (~120px)
    const thumbCanvas = document.createElement('canvas');
    const thumbMax = 120;
    const tScale = Math.min(thumbMax / w, thumbMax / h);
    thumbCanvas.width = Math.max(20, Math.floor(w * tScale));
    thumbCanvas.height = Math.max(20, Math.floor(h * tScale));
    const tCtx = thumbCanvas.getContext('2d');
    let thumbnailUrl = dataUrl;
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);
      // Release thumbnail canvas
      thumbCanvas.width = 0;
      thumbCanvas.height = 0;
    }

    // Release main canvas memory
    canvas.width = 0;
    canvas.height = 0;

    pages.push({
      pageNumber: pageNum,
      dataUrl,
      thumbnailUrl,
      width: w,
      height: h,
      pdfWidthPt,
      pdfHeightPt,
    });
  }

  console.log(`[pdfImporter] Extraction complete: ${pages.length} pages`);
  return pages;
}
