import { FilterSettings, PageItem, Quadrilateral, CleanupStroke, PaperSize } from '../../types';
import { warpPerspective } from './homography';
import { cvWorkerPool } from './workerBridge';

/**
 * Executes the full deterministic CV pipeline on a page item asynchronously.
 */
export async function processDocumentPage(
  img: HTMLImageElement | HTMLCanvasElement,
  corners: Quadrilateral,
  settings: FilterSettings,
  cleanupStrokes?: CleanupStroke[],
  paperSize?: PaperSize
): Promise<{ processedCanvas: HTMLCanvasElement; dataUrl: string; thumbnailUrl: string }> {
  // 1. Perspective Transform Rectification
  const warpedCanvas = warpPerspective(img, corners, settings.qualityScale);

  // 2. Rotate if needed
  const rotatedCanvas = applyRotation(warpedCanvas, settings.rotation);

  // 3. Document Enhancement Filters via Async Web Worker Pipeline
  const ctx = rotatedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot acquire canvas context for filtering');

  const imgData = ctx.getImageData(0, 0, rotatedCanvas.width, rotatedCanvas.height);
  const filteredData = await cvWorkerPool.processImage(imgData, settings, cleanupStrokes);
  ctx.putImageData(filteredData, 0, 0);

  // 4. Generate high-res DataURL
  const dataUrl = rotatedCanvas.toDataURL('image/jpeg', 0.92);

  // 5. Generate lightweight thumbnail for filmstrip/tray
  const thumbCanvas = document.createElement('canvas');
  const thumbMax = 180;
  const tScale = Math.min(thumbMax / rotatedCanvas.width, thumbMax / rotatedCanvas.height);
  thumbCanvas.width = Math.max(20, Math.round(rotatedCanvas.width * tScale));
  thumbCanvas.height = Math.max(20, Math.round(rotatedCanvas.height * tScale));
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(rotatedCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

  return {
    processedCanvas: rotatedCanvas,
    dataUrl,
    thumbnailUrl,
  };
}

export function applyRotation(canvas: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  if (!angle || angle === 0) return canvas;

  const rotCanvas = document.createElement('canvas');
  const rad = (angle * Math.PI) / 180;

  if (angle === 90 || angle === 270) {
    rotCanvas.width = canvas.height;
    rotCanvas.height = canvas.width;
  } else {
    rotCanvas.width = canvas.width;
    rotCanvas.height = canvas.height;
  }

  const ctx = rotCanvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotCanvas;
}
