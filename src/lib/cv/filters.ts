import { FilterSettings, ColorMode, CleanupStroke, Point } from '../../types';

/**
 * Applies full document enhancement pipeline to an ImageData object.
 */
export function applyDocumentFilters(
  srcData: ImageData,
  settings: FilterSettings,
  cleanupStrokes?: CleanupStroke[]
): ImageData {
  const { width, height } = srcData;
  const dstData = new ImageData(new Uint8ClampedArray(srcData.data), width, height);

  // 1. Noise Reduction / Despeckle (if enabled)
  if (settings.noiseReduction > 10) {
    applyDespeckle(dstData, settings.noiseReduction);
  }

  // 2. Background Illumination / Shadow Removal (Division Normalization)
  if (settings.backgroundWhitening > 5) {
    applyShadowRemoval(dstData, settings.backgroundWhitening);
  }

  // 3. Apply Clean Up / Retouch Eraser Strokes
  if (cleanupStrokes && cleanupStrokes.length > 0) {
    applyCleanupStrokes(dstData, cleanupStrokes);
  }

  // 4. Color Mode & Binarization
  if (settings.colorMode === 'binary') {
    applySauvolaBinarization(dstData, settings.sauvolaSensitivity, settings.threshold);
  } else if (settings.colorMode === 'grayscale') {
    applyGrayscale(dstData);
  } else if (settings.colorMode === 'vibrant_color') {
    applyColorBoost(dstData);
  }

  // 5. Brightness, Contrast & Ink Enhancement
  if (
    settings.brightness !== 100 ||
    settings.contrast !== 100 ||
    settings.inkEnhancement > 0
  ) {
    applyToneAdjustments(
      dstData,
      settings.brightness,
      settings.contrast,
      settings.inkEnhancement
    );
  }

  // 6. Text Edge Sharpening (Unsharp Mask)
  if (settings.sharpness > 0) {
    applyUnsharpMask(dstData, settings.sharpness);
  }

  return dstData;
}

/**
 * Removes shadows and uneven lighting using Illumination Surface Division.
 * Estimates low-frequency background and divides pixel values by background intensity.
 */
export function applyShadowRemoval(imgData: ImageData, strength: number): void {
  const { width, height, data } = imgData;
  const factor = strength / 100; // 0.05 to 1.0

  // Kernel radius proportional to image size (typically 1/15th to 1/25th of dimension)
  const radius = Math.max(12, Math.round(Math.min(width, height) / 20));

  // Compute grayscale illumination background approximation using fast separable box blur
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Max of RGB gives conservative paper white estimate
    gray[j] = Math.max(data[i], data[i + 1], data[i + 2]);
  }

  // Large morphological dilation (max in neighborhood) + smooth blur
  const bg = fastSmoothBackground(gray, width, height, radius);

  // Divide input by estimated background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const bVal = Math.max(30, bg[y * width + x]); // Avoid divide by zero

      // Normalized division
      for (let c = 0; c < 3; c++) {
        const orig = data[idx + c];
        const normalized = (orig / bVal) * 255;
        // Blend between original and normalized based on strength factor
        const blended = orig * (1 - factor) + normalized * factor;
        data[idx + c] = Math.min(255, Math.max(0, Math.round(blended)));
      }
    }
  }
}

/**
 * Fast separable box blur for smooth 2D background estimation
 */
function fastSmoothBackground(
  src: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const yOffset = y * w;
    // Initial window sum
    for (let x = -radius; x <= radius; x++) {
      const clampedX = Math.max(0, Math.min(w - 1, x));
      sum += src[yOffset + clampedX];
    }
    temp[yOffset] = sum / (2 * radius + 1);

    for (let x = 1; x < w; x++) {
      const leftX = Math.max(0, x - radius - 1);
      const rightX = Math.min(w - 1, x + radius);
      sum += src[yOffset + rightX] - src[yOffset + leftX];
      temp[yOffset + x] = sum / (2 * radius + 1);
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      const clampedY = Math.max(0, Math.min(h - 1, y));
      sum += temp[clampedY * w + x];
    }
    dst[x] = sum / (2 * radius + 1);

    for (let y = 1; y < h; y++) {
      const topY = Math.max(0, y - radius - 1);
      const botY = Math.min(h - 1, y + radius);
      sum += temp[botY * w + x] - temp[topY * w + x];
      dst[y * w + x] = sum / (2 * radius + 1);
    }
  }

  return dst;
}

/**
 * Sauvola Local Adaptive Thresholding for crisp Photocopy & Binary output
 * T = mean * (1 + k * (std / 128 - 1))
 */
export function applySauvolaBinarization(
  imgData: ImageData,
  sensitivity: number,
  globalBias: number
): void {
  const { width, height, data } = imgData;
  const k = 0.2 + (sensitivity / 100) * 0.3; // 0.2 to 0.5
  const winSize = Math.max(15, Math.round(Math.min(width, height) / 30));
  const halfWin = Math.floor(winSize / 2);

  // Grayscale & Integral Images for O(1) local window queries
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Compute integral sum and integral squared sum
  const intSum = new Float64Array((width + 1) * (height + 1));
  const intSqSum = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSqSum = 0;
    for (let x = 0; x < width; x++) {
      const val = gray[y * width + x];
      rowSum += val;
      rowSqSum += val * val;

      const idx = (y + 1) * (width + 1) + (x + 1);
      const prevYIdx = y * (width + 1) + (x + 1);

      intSum[idx] = intSum[prevYIdx] + rowSum;
      intSqSum[idx] = intSqSum[prevYIdx] + rowSqSum;
    }
  }

  const stride = width + 1;
  const biasOffset = (globalBias - 128) * 0.4;

  // Apply threshold
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - halfWin);
    const y1 = Math.min(height - 1, y + halfWin);

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - halfWin);
      const x1 = Math.min(width - 1, x + halfWin);

      const count = (x1 - x0 + 1) * (y1 - y0 + 1);

      const sum =
        intSum[(y1 + 1) * stride + (x1 + 1)] -
        intSum[y0 * stride + (x1 + 1)] -
        intSum[(y1 + 1) * stride + x0] +
        intSum[y0 * stride + x0];

      const sqSum =
        intSqSum[(y1 + 1) * stride + (x1 + 1)] -
        intSqSum[y0 * stride + (x1 + 1)] -
        intSqSum[(y1 + 1) * stride + x0] +
        intSqSum[y0 * stride + x0];

      const mean = sum / count;
      const variance = Math.max(0, sqSum / count - mean * mean);
      const std = Math.sqrt(variance);

      const T = mean * (1 + k * (std / 128 - 1)) + biasOffset;
      const val = gray[y * width + x] < T ? 0 : 255;

      const idx = (y * width + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
}

/**
 * Grayscale conversion
 */
export function applyGrayscale(imgData: ImageData): void {
  const { data } = imgData;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
  }
}

/**
 * Boosts document color saturation and stamp clarity
 */
export function applyColorBoost(imgData: ImageData): void {
  const { data } = imgData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Saturation boost factor 1.35
    data[i] = Math.min(255, Math.max(0, Math.round(gray + 1.35 * (r - gray))));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(gray + 1.35 * (g - gray))));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(gray + 1.35 * (b - gray))));
  }
}

/**
 * Brightness, Contrast & Ink Deepening
 */
export function applyToneAdjustments(
  imgData: ImageData,
  brightness: number,
  contrast: number,
  inkEnhancement: number
): void {
  const { data } = imgData;
  const bFactor = (brightness - 100) * 1.28; // -128 to +128
  const cFactor = contrast / 100; // 0 to 2
  const inkFactor = inkEnhancement / 100; // 0 to 1

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];

      // 1. Contrast around midpoint 128
      v = (v - 128) * cFactor + 128;

      // 2. Brightness
      v += bFactor;

      // 3. Ink Deepening: pulls dark and midtones lower while leaving whites alone
      if (inkFactor > 0 && v < 200) {
        const darkness = (200 - v) / 200;
        v -= darkness * inkFactor * 60;
      }

      data[i + c] = Math.min(255, Math.max(0, Math.round(v)));
    }
  }
}

/**
 * Unsharp Masking for crisp text stroke definition
 */
export function applyUnsharpMask(imgData: ImageData, amountPercent: number): void {
  const { width, height, data } = imgData;
  const amount = (amountPercent / 100) * 1.5; // 0 to 1.5
  const original = new Uint8ClampedArray(data);

  // 3x3 Gaussian approximation
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const blurredVal = (
          original[((y - 1) * width + (x - 1)) * 4 + c] * 1 +
          original[((y - 1) * width + x) * 4 + c] * 2 +
          original[((y - 1) * width + (x + 1)) * 4 + c] * 1 +
          original[(y * width + (x - 1)) * 4 + c] * 2 +
          original[(y * width + x) * 4 + c] * 4 +
          original[(y * width + (x + 1)) * 4 + c] * 2 +
          original[((y + 1) * width + (x - 1)) * 4 + c] * 1 +
          original[((y + 1) * width + x) * 4 + c] * 2 +
          original[((y + 1) * width + (x + 1)) * 4 + c] * 1
        ) / 16;

        const origVal = original[idx + c];
        const sharpVal = origVal + (origVal - blurredVal) * amount;
        data[idx + c] = Math.min(255, Math.max(0, Math.round(sharpVal)));
      }
    }
  }
}

/**
 * 3x3 Median / Despeckle filter to remove small camera noise and speckles
 */
export function applyDespeckle(imgData: ImageData, strength: number): void {
  const { width, height, data } = imgData;
  const original = new Uint8ClampedArray(data);
  const factor = strength / 100;
  const window: number[] = new Array(9);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        let k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            window[k++] = original[((y + dy) * width + (x + dx)) * 4 + c];
          }
        }
        window.sort((a, b) => a - b);
        const median = window[4];
        const origVal = original[idx + c];

        // Apply if pixel deviates significantly from neighborhood median (speckle)
        if (Math.abs(origVal - median) > 25) {
          data[idx + c] = Math.round(origVal * (1 - factor) + median * factor);
        }
      }
    }
  }
}

/**
 * Applies Adobe Scan Clean Up / Retouch brush eraser strokes on document ImageData.
 * Blends background paper color over marked points with smooth feathering.
 */
export function applyCleanupStrokes(
  imgData: ImageData,
  strokes: CleanupStroke[]
): void {
  const { width, height, data } = imgData;

  // Sample estimated paper white/cream background color from top corners if not specified
  let defaultBgR = 255;
  let defaultBgG = 255;
  let defaultBgB = 255;

  let bgCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  for (let y = 0; y < Math.min(20, height); y++) {
    for (let x = 0; x < Math.min(20, width); x++) {
      const idx = (y * width + x) * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      bgCount++;
    }
  }
  if (bgCount > 0) {
    defaultBgR = Math.round(sumR / bgCount);
    defaultBgG = Math.round(sumG / bgCount);
    defaultBgB = Math.round(sumB / bgCount);
  }

  for (const stroke of strokes) {
    const { points, radius, color } = stroke;
    if (!points || points.length === 0) continue;

    let targetR = defaultBgR;
    let targetG = defaultBgG;
    let targetB = defaultBgB;

    if (color && color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 6) {
        targetR = parseInt(hex.substring(0, 2), 16);
        targetG = parseInt(hex.substring(2, 4), 16);
        targetB = parseInt(hex.substring(4, 6), 16);
      }
    }

    const rSq = radius * radius;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const nextP = points[i + 1] || p;

      // Draw segment between points
      const dx = nextP.x - p.x;
      const dy = nextP.y - p.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.4)));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(p.x + dx * t);
        const cy = Math.round(p.y + dy * t);

        const xMin = Math.max(0, cx - radius);
        const xMax = Math.min(width - 1, cx + radius);
        const yMin = Math.max(0, cy - radius);
        const yMax = Math.min(height - 1, cy + radius);

        for (let y = yMin; y <= yMax; y++) {
          for (let x = xMin; x <= xMax; x++) {
            const dSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (dSq <= rSq) {
              const idx = (y * width + x) * 4;
              // Smooth feather at edge
              const feather = 1 - Math.pow(Math.sqrt(dSq) / radius, 2);
              const alpha = Math.max(0, Math.min(1, feather * 1.5));

              data[idx] = Math.round(data[idx] * (1 - alpha) + targetR * alpha);
              data[idx + 1] = Math.round(data[idx + 1] * (1 - alpha) + targetG * alpha);
              data[idx + 2] = Math.round(data[idx + 2] * (1 - alpha) + targetB * alpha);
            }
          }
        }
      }
    }
  }
}

