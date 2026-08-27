import { Point, Quadrilateral } from '../../types';

/**
 * Solves the 3x3 projective homography matrix from source corners to destination rectangle
 * using Gaussian elimination on an 8x8 linear system.
 */
export function getPerspectiveTransform(src: Quadrilateral, dstW: number, dstH: number): number[] {
  // Source points
  const s = [src.tl, src.tr, src.br, src.bl];
  // Destination points
  const d = [
    { x: 0, y: 0 },
    { x: dstW, y: 0 },
    { x: dstW, y: dstH },
    { x: 0, y: dstH },
  ];

  // We want to map (dst.x, dst.y) -> (src.x, src.y) for inverse bilinear sampling
  // Set up 8 linear equations: A * h = b
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const dx = d[i].x;
    const dy = d[i].y;
    const sx = s[i].x;
    const sy = s[i].y;

    A.push([dx, dy, 1, 0, 0, 0, -dx * sx, -dy * sx]);
    b.push(sx);

    A.push([0, 0, 0, dx, dy, 1, -dx * sy, -dy * sy]);
    b.push(sy);
  }

  // Gaussian elimination to solve for [h0, h1, h2, h3, h4, h5, h6, h7]
  const h = solveLinearSystem8(A, b);
  h.push(1); // h8 = 1
  return h;
}

function solveLinearSystem8(A: number[][], b: number[]): number[] {
  const n = 8;
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / (A[i][i] || 1e-12);
      b[k] -= factor * b[i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = sum / (A[i][i] || 1e-12);
  }

  return x;
}

/**
 * Calculates optimal width and height for rectified document using Euclidean distances.
 */
export function getRectifiedDimensions(q: Quadrilateral): { width: number; height: number } {
  const dist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const topW = dist(q.tl, q.tr);
  const botW = dist(q.bl, q.br);
  const leftH = dist(q.tl, q.bl);
  const rightH = dist(q.tr, q.br);

  const width = Math.max(100, Math.round(Math.max(topW, botW)));
  const height = Math.max(100, Math.round(Math.max(leftH, rightH)));

  return { width, height };
}

/**
 * Warps source image corners into a rectangular output canvas with bilinear interpolation.
 */
export function warpPerspective(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  corners: Quadrilateral,
  qualityScale = 1.0,
  maxDimension = 2400
): HTMLCanvasElement {
  const dims = getRectifiedDimensions(corners);
  let targetW = Math.round(dims.width * qualityScale);
  let targetH = Math.round(dims.height * qualityScale);

  // Cap max dimension to prevent out-of-memory on gigantic camera files
  if (targetW > maxDimension || targetH > maxDimension) {
    const factor = maxDimension / Math.max(targetW, targetH);
    targetW = Math.round(targetW * factor);
    targetH = Math.round(targetH * factor);
  }

  // Read source pixels
  const srcW: number = 'naturalWidth' in sourceImg && sourceImg.naturalWidth ? sourceImg.naturalWidth : sourceImg.width;
  const srcH: number = 'naturalHeight' in sourceImg && sourceImg.naturalHeight ? sourceImg.naturalHeight : sourceImg.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Cannot acquire canvas context');

  srcCtx.drawImage(sourceImg, 0, 0, srcW, srcH);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcPixels = srcData.data;

  // Compute Inverse Homography Matrix: maps dst(x,y) -> src(u,v)
  const H = getPerspectiveTransform(corners, targetW, targetH);

  // Prepare destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetW;
  dstCanvas.height = targetH;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
  if (!dstCtx) throw new Error('Cannot acquire dst canvas context');

  const dstData = dstCtx.createImageData(targetW, targetH);
  const dstPixels = dstData.data;

  const h0 = H[0], h1 = H[1], h2 = H[2];
  const h3 = H[3], h4 = H[4], h5 = H[5];
  const h6 = H[6], h7 = H[7], h8 = H[8];

  let dstIdx = 0;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      // Homogeneous transformation
      const w = h6 * x + h7 * y + h8;
      const invW = 1 / (w || 1e-10);
      const u = (h0 * x + h1 * y + h2) * invW;
      const v = (h3 * x + h4 * y + h5) * invW;

      if (u >= 0 && u < srcW - 1 && v >= 0 && v < srcH - 1) {
        // Bilinear interpolation
        const u0 = Math.floor(u);
        const v0 = Math.floor(v);
        const u1 = u0 + 1;
        const v1 = v0 + 1;

        const du = u - u0;
        const dv = v - v0;
        const du1 = 1 - du;
        const dv1 = 1 - dv;

        const w00 = du1 * dv1;
        const w10 = du * dv1;
        const w01 = du1 * dv;
        const w11 = du * dv;

        const idx00 = (v0 * srcW + u0) * 4;
        const idx10 = (v0 * srcW + u1) * 4;
        const idx01 = (v1 * srcW + u0) * 4;
        const idx11 = (v1 * srcW + u1) * 4;

        dstPixels[dstIdx] = Math.round(
          srcPixels[idx00] * w00 +
          srcPixels[idx10] * w10 +
          srcPixels[idx01] * w01 +
          srcPixels[idx11] * w11
        );
        dstPixels[dstIdx + 1] = Math.round(
          srcPixels[idx00 + 1] * w00 +
          srcPixels[idx10 + 1] * w10 +
          srcPixels[idx01 + 1] * w01 +
          srcPixels[idx11 + 1] * w11
        );
        dstPixels[dstIdx + 2] = Math.round(
          srcPixels[idx00 + 2] * w00 +
          srcPixels[idx10 + 2] * w10 +
          srcPixels[idx01 + 2] * w01 +
          srcPixels[idx11 + 2] * w11
        );
        dstPixels[dstIdx + 3] = 255;
      } else {
        // Background fallback white
        dstPixels[dstIdx] = 255;
        dstPixels[dstIdx + 1] = 255;
        dstPixels[dstIdx + 2] = 255;
        dstPixels[dstIdx + 3] = 255;
      }
      dstIdx += 4;
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
  return dstCanvas;
}
