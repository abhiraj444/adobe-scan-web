import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js using an established CDN URL matching the installed version
// or use worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

export interface ExtractedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Extracts all pages of a PDF file as high-resolution image data URLs.
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
    
    // Scale viewport to high quality for sharp document rendering (e.g. 2.0x scale or min 1500px width)
    const baseViewport = page.getViewport({ scale: 1.0 });
    const targetScale = Math.min(3.0, Math.max(1.8, 1600 / baseViewport.width));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return pages;
}
