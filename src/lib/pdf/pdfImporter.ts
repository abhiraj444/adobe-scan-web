import * as pdfjsLib from 'pdfjs-dist';

// Configure worker reliably for Vite / modern browsers
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

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
 * Highly optimized for memory efficiency so large (100+ page) PDFs load smoothly without crashing canvas memory.
 */
export async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
  });
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

    // Scale viewport cleanly (max 1200px width) to avoid browser canvas out-of-memory errors on large PDFs
    const targetScale = Math.min(2.0, Math.max(1.0, 1100 / (baseViewport.width || 600)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      continue;
    }

    // PDF.js render context
    const renderContext: any = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: null,
    };

    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Fast lightweight thumbnail for filmstrip (~120px)
    const thumbCanvas = document.createElement('canvas');
    const thumbMax = 120;
    const tScale = Math.min(thumbMax / canvas.width, thumbMax / canvas.height);
    thumbCanvas.width = Math.max(20, Math.floor(canvas.width * tScale));
    thumbCanvas.height = Math.max(20, Math.floor(canvas.height * tScale));
    const tCtx = thumbCanvas.getContext('2d');
    let thumbnailUrl = dataUrl;
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);
      thumbCanvas.width = 0;
      thumbCanvas.height = 0;
    }

    // Explicitly release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    pages.push({
      pageNumber: pageNum,
      dataUrl,
      thumbnailUrl,
      width: Math.floor(viewport.width),
      height: Math.floor(viewport.height),
      pdfWidthPt,
      pdfHeightPt,
    });
  }

  return pages;
}
