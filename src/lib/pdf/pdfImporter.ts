import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker locally with Vite's ?url bundle import (100% offline, zero CDN)
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
 * Extracts all pages of a PDF file as crisp image data URLs and lightweight thumbnails.
 * Fully bundled with local worker, cmaps, and fonts.
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }

    const page = await pdf.getPage(pageNum);

    // Exact original PDF dimensions in points (72pt = 1 inch)
    const baseViewport = page.getViewport({ scale: 1.0 });
    const pdfWidthPt = baseViewport.width;
    const pdfHeightPt = baseViewport.height;

    // Scale for rendering (max 1100px width) to keep performance instant and light
    const targetScale = Math.min(2.0, Math.max(1.0, 1100 / (baseViewport.width || 600)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const w = Math.floor(viewport.width);
    const h = Math.floor(viewport.height);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      continue;
    }

    // Standard PDF.js 4.x canvas rendering
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Lightweight thumbnail for filmstrip (~120px)
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

    // Free main canvas memory
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
