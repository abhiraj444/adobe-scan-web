import { FilterSettings, Quadrilateral, CleanupStroke, PaperSize } from '../../types';
import { warpPerspective } from './homography';
import { cvWorkerPool } from './workerBridge';

// In-memory cache for warped+rotated canvas so slider adjustments don't re-warp the whole image
interface RectifiedCacheItem {
  key: string;
  canvas: HTMLCanvasElement;
}

let cachedRectified: RectifiedCacheItem | null = null;

function makeRectifiedKey(
  img: HTMLImageElement | HTMLCanvasElement,
  corners: Quadrilateral,
  rotation: number,
  qualityScale: number
): string {
  const srcSrc = 'src' in img ? (img as HTMLImageElement).src.substring(0, 100) : 'canvas';
  return `${srcSrc}_${corners.tl.x}_${corners.tl.y}_${corners.tr.x}_${corners.tr.y}_${corners.br.x}_${corners.br.y}_${corners.bl.x}_${corners.bl.y}_rot${rotation}_qs${qualityScale}`;
}

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
  // 1. Perspective Rectification & Rotation (with caching for instant slider interaction)
  const rectKey = makeRectifiedKey(img, corners, settings.rotation, settings.qualityScale);
  let baseCanvas: HTMLCanvasElement;

  if (cachedRectified && cachedRectified.key === rectKey) {
    baseCanvas = cachedRectified.canvas;
  } else {
    const warped = warpPerspective(img, corners, settings.qualityScale);
    baseCanvas = applyRotation(warped, settings.rotation);
    cachedRectified = { key: rectKey, canvas: baseCanvas };
  }

  // 2. Clone base canvas for filtering
  const workingCanvas = document.createElement('canvas');
  workingCanvas.width = baseCanvas.width;
  workingCanvas.height = baseCanvas.height;
  const ctx = workingCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot acquire canvas context for filtering');

  ctx.drawImage(baseCanvas, 0, 0);

  // 3. Document Enhancement Filters via Async Web Worker Pipeline
  const imgData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
  const filteredData = await cvWorkerPool.processImage(imgData, settings, cleanupStrokes);
  ctx.putImageData(filteredData, 0, 0);

  // 4. Generate high-res DataURL
  const dataUrl = workingCanvas.toDataURL('image/jpeg', 0.92);

  // 5. Generate lightweight thumbnail for filmstrip/tray
  const thumbCanvas = document.createElement('canvas');
  const thumbMax = 180;
  const tScale = Math.min(thumbMax / workingCanvas.width, thumbMax / workingCanvas.height);
  thumbCanvas.width = Math.max(20, Math.round(workingCanvas.width * tScale));
  thumbCanvas.height = Math.max(20, Math.round(workingCanvas.height * tScale));
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(workingCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
  const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

  return {
    processedCanvas: workingCanvas,
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
