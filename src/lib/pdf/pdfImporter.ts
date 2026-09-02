import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js using an established CDN URL matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

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
 * Extracts all pages of a PDF file as high-resolution image data URLs and thumbnails as quickly as possible.
 * Reports progress as each page renders.
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
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

    // Scale viewport to high quality for sharp document rendering (e.g. min 1500px width, max 2400px)
    const targetScale = Math.min(2.5, Math.max(1.5, 1500 / baseViewport.width));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      continue;
    }

    // Render white background first so transparent PDFs render cleanly
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas as any,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);

    // Fast lightweight thumbnail for filmstrip/tray (~160px)
    const thumbCanvas = document.createElement('canvas');
    const thumbMax = 160;
    const tScale = Math.min(thumbMax / canvas.width, thumbMax / canvas.height);
    thumbCanvas.width = Math.max(20, Math.round(canvas.width * tScale));
    thumbCanvas.height = Math.max(20, Math.round(canvas.height * tScale));
    const tCtx = thumbCanvas.getContext('2d');
    let thumbnailUrl = dataUrl;
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.70);
    }

    pages.push({
      pageNumber: pageNum,
      dataUrl,
      thumbnailUrl,
      width: canvas.width,
      height: canvas.height,
      pdfWidthPt,
      pdfHeightPt,
    });
  }

  return pages;
}
