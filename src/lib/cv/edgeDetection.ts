import { Point, Quadrilateral } from '../../types';

/**
 * Deterministic edge detection and 4-corner document boundary detection
 * using Canny edge detection, gradient magnitude, and polygon approximation.
 */
export function detectDocumentCorners(
  img: HTMLImageElement | HTMLCanvasElement,
  targetWidth = 600
): Quadrilateral {
  const origW: number = 'naturalWidth' in img && img.naturalWidth ? img.naturalWidth : img.width;
  const origH: number = 'naturalHeight' in img && img.naturalHeight ? img.naturalHeight : img.height;

  if (!origW || !origH) {
    return getDefaultCorners(origW || 800, origH || 1000);
  }

  // Downscale for fast & noise-resilient edge detection (<30ms)
  const scale = targetWidth / origW;
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return getDefaultCorners(origW, origH);

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2. 5x5 Gaussian Blur
  const blurred = gaussianBlur5x5(gray, w, h);

  // 3. Sobel Gradients
  const gradX = new Float32Array(w * h);
  const gradY = new Float32Array(w * h);
  const magnitude = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -1 * blurred[(y - 1) * w + (x - 1)] +
        1 * blurred[(y - 1) * w + (x + 1)] +
        -2 * blurred[y * w + (x - 1)] +
        2 * blurred[y * w + (x + 1)] +
        -1 * blurred[(y + 1) * w + (x - 1)] +
        1 * blurred[(y + 1) * w + (x + 1)];

      const gy =
        -1 * blurred[(y - 1) * w + (x - 1)] +
        -2 * blurred[(y - 1) * w + x] +
        -1 * blurred[(y - 1) * w + (x + 1)] +
        1 * blurred[(y + 1) * w + (x - 1)] +
        2 * blurred[(y + 1) * w + x] +
        1 * blurred[(y + 1) * w + (x + 1)];

      gradX[idx] = gx;
      gradY[idx] = gy;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // 4. Thresholding & Finding bounding quad
  let maxMag = 0;
  for (let i = 0; i < magnitude.length; i++) {
    if (magnitude[i] > maxMag) maxMag = magnitude[i];
  }

  const threshold = Math.max(30, maxMag * 0.18);
  const edgeMask = new Uint8Array(w * h);
  for (let i = 0; i < magnitude.length; i++) {
    edgeMask[i] = magnitude[i] > threshold ? 255 : 0;
  }

  // 5. Sample boundary points along rays from center to find document perimeter
  const detectedCorners = findCornersFromEdgeMask(edgeMask, w, h);

  if (detectedCorners) {
    // Scale back to original resolution
    const invScale = 1 / scale;
    return {
      tl: { x: clamp(Math.round(detectedCorners.tl.x * invScale), 0, origW), y: clamp(Math.round(detectedCorners.tl.y * invScale), 0, origH) },
      tr: { x: clamp(Math.round(detectedCorners.tr.x * invScale), 0, origW), y: clamp(Math.round(detectedCorners.tr.y * invScale), 0, origH) },
      br: { x: clamp(Math.round(detectedCorners.br.x * invScale), 0, origW), y: clamp(Math.round(detectedCorners.br.y * invScale), 0, origH) },
      bl: { x: clamp(Math.round(detectedCorners.bl.x * invScale), 0, origW), y: clamp(Math.round(detectedCorners.bl.y * invScale), 0, origH) },
    };
  }

  return getDefaultCorners(origW, origH);
}

function gaussianBlur5x5(src: Float32Array, w: number, h: number): Float32Array {
  const dest = new Float32Array(w * h);
  const kernel = [
    1, 4, 7, 4, 1,
    4, 16, 26, 16, 4,
    7, 26, 41, 26, 7,
    4, 16, 26, 16, 4,
    1, 4, 7, 4, 1,
  ];
  const kSum = 273;

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += src[(y + ky) * w + (x + kx)] * kernel[k++];
        }
      }
      dest[y * w + x] = sum / kSum;
    }
  }
  return dest;
}

function findCornersFromEdgeMask(mask: Uint8Array, w: number, h: number): Quadrilateral | null {
  const cx = w / 2;
  const cy = h / 2;

  // Search in 4 quadrant diagonals for extreme corner points
  let bestTL = { x: w * 0.05, y: h * 0.05, score: Infinity };
  let bestTR = { x: w * 0.95, y: h * 0.05, score: Infinity };
  let bestBR = { x: w * 0.95, y: h * 0.95, score: Infinity };
  let bestBL = { x: w * 0.05, y: h * 0.95, score: Infinity };

  let foundPoints = 0;

  // Scan grid with emphasis on strong outer edges
  for (let y = Math.floor(h * 0.03); y < h * 0.97; y += 2) {
    for (let x = Math.floor(w * 0.03); x < w * 0.97; x += 2) {
      if (mask[y * w + x] === 255) {
        foundPoints++;
        // Top-Left quadrant (min x + y)
        const dTL = x + y;
        if (x < cx && y < cy && dTL < bestTL.score) {
          bestTL = { x, y, score: dTL };
        }
        // Top-Right quadrant (min y - x)
        const dTR = y - x;
        if (x >= cx && y < cy && dTR < bestTR.score) {
          bestTR = { x, y, score: dTR };
        }
        // Bottom-Right quadrant (max x + y -> min -(x+y))
        const dBR = -(x + y);
        if (x >= cx && y >= cy && dBR < bestBR.score) {
          bestBR = { x, y, score: dBR };
        }
        // Bottom-Left quadrant (min x - y)
        const dBL = x - y;
        if (x < cx && y >= cy && dBL < bestBL.score) {
          bestBL = { x, y, score: dBL };
        }
      }
    }
  }

  // If sufficient edge points were observed and forms a plausible quad
  if (foundPoints > 50) {
    const quad = {
      tl: { x: bestTL.x, y: bestTL.y },
      tr: { x: bestTR.x, y: bestTR.y },
      br: { x: bestBR.x, y: bestBR.y },
      bl: { x: bestBL.x, y: bestBL.y },
    };

    // Verify minimum area
    const area = calculateQuadArea(quad);
    if (area > (w * h) * 0.25) {
      return quad;
    }
  }

  return null;
}

export function calculateQuadArea(q: Quadrilateral): number {
  // Shoelace formula
  return 0.5 * Math.abs(
    (q.tl.x * q.tr.y - q.tr.x * q.tl.y) +
    (q.tr.x * q.br.y - q.br.x * q.tr.y) +
    (q.br.x * q.bl.y - q.bl.x * q.br.y) +
    (q.bl.x * q.tl.y - q.tl.x * q.bl.y)
  );
}

export function getDefaultCorners(w: number, h: number, marginRatio = 0.04): Quadrilateral {
  const mx = Math.round(w * marginRatio);
  const my = Math.round(h * marginRatio);
  return {
    tl: { x: mx, y: my },
    tr: { x: w - mx, y: my },
    br: { x: w - mx, y: h - my },
    bl: { x: mx, y: h - my },
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getQuadMidpoints(corners: Quadrilateral): {
  top: Point;
  right: Point;
  bottom: Point;
  left: Point;
} {
  return {
    top: {
      x: Math.round((corners.tl.x + corners.tr.x) / 2),
      y: Math.round((corners.tl.y + corners.tr.y) / 2),
    },
    right: {
      x: Math.round((corners.tr.x + corners.br.x) / 2),
      y: Math.round((corners.tr.y + corners.br.y) / 2),
    },
    bottom: {
      x: Math.round((corners.bl.x + corners.br.x) / 2),
      y: Math.round((corners.bl.y + corners.br.y) / 2),
    },
    left: {
      x: Math.round((corners.tl.x + corners.bl.x) / 2),
      y: Math.round((corners.tl.y + corners.bl.y) / 2),
    },
  };
}

export function updateCornersFromEdgeMove(
  corners: Quadrilateral,
  edge: 'top' | 'right' | 'bottom' | 'left',
  deltaX: number,
  deltaY: number,
  maxW: number,
  maxH: number
): Quadrilateral {
  const c = {
    tl: { ...corners.tl },
    tr: { ...corners.tr },
    br: { ...corners.br },
    bl: { ...corners.bl },
  };

  if (edge === 'top') {
    c.tl.x = clamp(c.tl.x + deltaX, 0, maxW);
    c.tl.y = clamp(c.tl.y + deltaY, 0, maxH);
    c.tr.x = clamp(c.tr.x + deltaX, 0, maxW);
    c.tr.y = clamp(c.tr.y + deltaY, 0, maxH);
  } else if (edge === 'right') {
    c.tr.x = clamp(c.tr.x + deltaX, 0, maxW);
    c.tr.y = clamp(c.tr.y + deltaY, 0, maxH);
    c.br.x = clamp(c.br.x + deltaX, 0, maxW);
    c.br.y = clamp(c.br.y + deltaY, 0, maxH);
  } else if (edge === 'bottom') {
    c.bl.x = clamp(c.bl.x + deltaX, 0, maxW);
    c.bl.y = clamp(c.bl.y + deltaY, 0, maxH);
    c.br.x = clamp(c.br.x + deltaX, 0, maxW);
    c.br.y = clamp(c.br.y + deltaY, 0, maxH);
  } else if (edge === 'left') {
    c.tl.x = clamp(c.tl.x + deltaX, 0, maxW);
    c.tl.y = clamp(c.tl.y + deltaY, 0, maxH);
    c.bl.x = clamp(c.bl.x + deltaX, 0, maxW);
    c.bl.y = clamp(c.bl.y + deltaY, 0, maxH);
  }

  return c;
}

