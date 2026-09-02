import * as pdfjsLib from 'pdfjs-dist';

// ────────────────────────────────────────────────────────────────
// WORKER — Vite's ?url import emits the file and returns its URL.
// This bundles the worker into dist/assets/ at build time.
// Zero CDN. Zero network dependency. 100% offline-safe.
// ────────────────────────────────────────────────────────────────
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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
 *
 * Everything is local:
 *  - Worker: bundled via Vite ?url import
 *  - CMap files: served from /cmaps/ (public/ directory)
 *  - Standard fonts: served from /standard_fonts/ (public/ directory)
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    // Local paths — Vite serves public/ at root
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
    // Disable worker-side font loading for maximum compatibility
    useSystemFonts: false,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }

    const page = await pdf.getPage(pageNum);

    // Original PDF dimensions in points (72pt = 1 inch)
    const baseViewport = page.getViewport({ scale: 1.0 });
    const pdfWidthPt = baseViewport.width;
    const pdfHeightPt = baseViewport.height;

    // Render scale — cap at 2x to avoid OOM on huge PDFs
    const targetScale = Math.min(2.0, Math.max(1.0, 1100 / (baseViewport.width || 600)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const w = Math.floor(viewport.width);
    const h = Math.floor(viewport.height);
    canvas.width = w;
    canvas.height = h;

    // Fill white background first (PDFs can have transparent backgrounds)
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }

    // pdfjs-dist v6 API: pass canvas directly
    await page.render({
      canvas: canvas,
      viewport: viewport,
    } as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Lightweight thumbnail for filmstrip (~120px tall)
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
      thumbCanvas.width = 0;
      thumbCanvas.height = 0;
    }

    // Free canvas memory
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

  return pages;
}
