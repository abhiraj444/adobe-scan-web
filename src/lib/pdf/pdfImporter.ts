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
 * Fast helper to convert a canvas to an instant Object URL (or data URL fallback).
 * Uses native browser C++ blob encoding to avoid freezing the JavaScript thread.
 */
function canvasToUrl(canvas: HTMLCanvasElement, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Renders a single PDF page to an ExtractedPdfPage object.
 */
async function renderSinglePdfPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number
): Promise<ExtractedPdfPage> {
  const page = await pdf.getPage(pageNum);

  // Exact original PDF dimensions in points (72pt = 1 inch)
  const baseViewport = page.getViewport({ scale: 1.0 });
  const pdfWidthPt = baseViewport.width || 595.28;
  const pdfHeightPt = baseViewport.height || 841.89;

  // Optimized crisp render scale (target ~1000px width for fast rendering and high readability)
  const targetScale = Math.min(1.8, Math.max(1.0, 1000 / pdfWidthPt));
  const viewport = page.getViewport({ scale: targetScale });

  const canvas = document.createElement('canvas');
  const w = Math.floor(viewport.width);
  const h = Math.floor(viewport.height);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error(`Failed to get 2d context for page ${pageNum}`);
  }

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Render PDF page content
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  // High performance async blob creation
  const dataUrl = await canvasToUrl(canvas, 0.85);

  // Quick thumbnail (~120px)
  let thumbnailUrl = dataUrl;
  const thumbMax = 120;
  const tScale = Math.min(thumbMax / w, thumbMax / h);
  const tw = Math.max(20, Math.floor(w * tScale));
  const th = Math.max(20, Math.floor(h * tScale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const tCtx = thumbCanvas.getContext('2d', { alpha: false });
  if (tCtx) {
    tCtx.drawImage(canvas, 0, 0, tw, th);
    thumbnailUrl = await canvasToUrl(thumbCanvas, 0.65);
    thumbCanvas.width = 0;
    thumbCanvas.height = 0;
  }

  // Explicitly release canvas memory
  canvas.width = 0;
  canvas.height = 0;

  return {
    pageNumber: pageNum,
    dataUrl,
    thumbnailUrl,
    width: w,
    height: h,
    pdfWidthPt,
    pdfHeightPt,
  };
}

/**
 * Super-fast Streaming PDF Extractor:
 * 1. Page 1 is rendered IMMEDIATELY and emitted within ~150ms so the user sees it instantly.
 * 2. Remaining pages are extracted concurrently in parallel batches (e.g. 3-4 pages at once).
 * 3. Calls `onPageReady(page, isFirstPage)` as soon as each page finishes so UI updates progressively in real-time.
 */
export async function streamPdfPages(
  file: File,
  onPageReady: (page: ExtractedPdfPage, progress: { current: number; total: number }) => void,
  concurrency = 3
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const extractedPages: ExtractedPdfPage[] = new Array(totalPages);

  if (totalPages === 0) return [];

  // Priority: Render Page 1 IMMEDIATELY so user gets instant document feedback
  const firstPage = await renderSinglePdfPage(pdf, 1);
  extractedPages[0] = firstPage;
  onPageReady(firstPage, { current: 1, total: totalPages });

  if (totalPages === 1) {
    return [firstPage];
  }

  // Render remaining pages in parallel batches
  const remainingPageNumbers: number[] = [];
  for (let p = 2; p <= totalPages; p++) {
    remainingPageNumbers.push(p);
  }

  let completedCount = 1;

  // Process worker pool for remaining pages
  const worker = async () => {
    while (remainingPageNumbers.length > 0) {
      const pageNum = remainingPageNumbers.shift();
      if (pageNum === undefined) break;

      try {
        const page = await renderSinglePdfPage(pdf, pageNum);
        extractedPages[pageNum - 1] = page;
        completedCount++;
        onPageReady(page, { current: completedCount, total: totalPages });
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    }
  };

  const poolSize = Math.min(concurrency, remainingPageNumbers.length);
  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);

  return extractedPages.filter(Boolean);
}

// Backward-compatible wrapper
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const results: ExtractedPdfPage[] = [];
  await streamPdfPages(file, (page, progress) => {
    results.push(page);
    if (onProgress) {
      onProgress(progress.current, progress.total);
    }
  });
  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}
