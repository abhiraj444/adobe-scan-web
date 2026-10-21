import { FilterSettings, CleanupStroke, ColorMode } from '../../types';

/**
 * High-performance, print-ready document enhancement pipeline.
 * Performs deterministic illumination normalization, shadow eradication,
 * ink deepening, adaptive binarization, and edge sharpening.
 */
export function applyDocumentFilters(
  srcData: ImageData,
  settings: FilterSettings,
  cleanupStrokes?: CleanupStroke[]
): ImageData {
  const { width, height } = srcData;
  const dstData = new ImageData(new Uint8ClampedArray(srcData.data), width, height);

  // 1. Apply Clean Up / Retouch Eraser Strokes first (if user drew any)
  if (cleanupStrokes && cleanupStrokes.length > 0) {
    applyCleanupStrokes(dstData, cleanupStrokes);
  }

  // 2. Background Illumination Normalization & Shadow Removal (Paper Whitening)
  if (settings.backgroundWhitening > 0) {
    applyAdvancedShadowRemoval(dstData, settings.backgroundWhitening);
  }

  // 3. Noise Reduction / Despeckle (removes background speckles and bleed-through)
  if (settings.noiseReduction > 10) {
    applySmartDespeckle(dstData, settings.noiseReduction);
  }

  // 4. Color Mode & Binarization
  if (settings.colorMode === 'binary') {
    applyCrispPhotocopyBinarization(dstData, settings.sauvolaSensitivity, settings.threshold);
  } else if (settings.colorMode === 'grayscale') {
    applyGrayscale(dstData);
  } else if (settings.colorMode === 'vibrant_color') {
    applyColorPunch(dstData);
  }

  // 5. Ink Deepening & Text Presentation (makes faint pencil/ink deep and laser-sharp)
  if (settings.inkEnhancement > 0 && settings.colorMode !== 'binary') {
    applyInkDeepening(dstData, settings.inkEnhancement);
  }

  // 6. Brightness & Contrast (Paper-White preserving curve)
  if (
    (settings.brightness !== 100 || settings.contrast !== 100) &&
    settings.colorMode !== 'binary'
  ) {
    applyPaperAwareToneAdjustments(dstData, settings.brightness, settings.contrast);
  }

  // 7. Text Edge Sharpening (Unsharp Mask tailored to character strokes)
  if (settings.sharpness > 0 && settings.colorMode !== 'binary') {
    applyTextSharpening(dstData, settings.sharpness);
  }

  return dstData;
}

/**
 * Advanced Shadow & Lighting Normalization for pristine white paper.
 * Uses downsampled morphological dilation (local max) to eliminate dark text from
 * the background lighting model, followed by separable Gaussian smoothing.
 * Dividing by the pure illumination field completely eliminates shadows and wrinkles.
 */
export function applyAdvancedShadowRemoval(imgData: ImageData, strength: number): void {
  const { width, height, data } = imgData;
  const factor = Math.min(1.0, Math.max(0.0, strength / 100));

  // Determine downsample factor to make background estimation lightning fast (~2-4ms)
  // and ensure text strokes are smaller than the dilation kernel
  const maxDownsampleDim = 200;
  const step = Math.max(2, Math.floor(Math.max(width, height) / maxDownsampleDim));
  const downW = Math.max(16, Math.floor(width / step));
  const downH = Math.max(16, Math.floor(height / step));

  // 1. Downsampled Grayscale Luminance
  const downGray = new Float32Array(downW * downH);
  for (let dy = 0; dy < downH; dy++) {
    const sy = Math.min(height - 1, dy * step);
    const rowOffset = sy * width;
    const downRowOffset = dy * downW;

    for (let dx = 0; dx < downW; dx++) {
      const sx = Math.min(width - 1, dx * step);
      const idx = (rowOffset + sx) * 4;
      // Using maximum of RGB gives conservative paper white estimate
      downGray[downRowOffset + dx] = Math.max(data[idx], data[idx + 1], data[idx + 2]);
    }
  }

  // 2. Grayscale Morphological Dilation (local max filter) on downsampled image
  // This replaces dark text strokes with surrounding paper brightness
  const dilateRadius = Math.max(2, Math.round(downW / 35));
  const dilated = new Float32Array(downW * downH);

  for (let y = 0; y < downH; y++) {
    const yMin = Math.max(0, y - dilateRadius);
    const yMax = Math.min(downH - 1, y + dilateRadius);

    for (let x = 0; x < downW; x++) {
      const xMin = Math.max(0, x - dilateRadius);
      const xMax = Math.min(downW - 1, x + dilateRadius);

      let maxVal = 0;
      for (let cy = yMin; cy <= yMax; cy++) {
        const row = cy * downW;
        for (let cx = xMin; cx <= xMax; cx++) {
          const val = downGray[row + cx];
          if (val > maxVal) maxVal = val;
        }
      }
      dilated[y * downW + x] = maxVal;
    }
  }

  // 3. Separable smooth blur on the dilated surface to model continuous illumination
  const blurRadius = Math.max(3, Math.round(downW / 25));
  const smoothBg = fastSeparableBlur(dilated, downW, downH, blurRadius);

  // 4. Illumination Division Normalization + Paper White Knee
  // Pre-calculate downsampling scale factors for fast bilinear lookup
  const invStepX = 1 / step;
  const invStepY = 1 / step;

  // Whitening threshold: as strength increases, paper background clips to pure #FFFFFF
  // At 100% strength, threshold is ~205; at 50% strength, ~225
  const whiteThreshold = 235 - factor * 30;

  for (let y = 0; y < height; y++) {
    // Bilinear coordinates on downsampled background
    const gy = y * invStepY;
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(downH - 1, gy0 + 1);
    const fy = gy - gy0;

    const rowOffset = y * width;
    const bgRow0 = gy0 * downW;
    const bgRow1 = gy1 * downW;

    for (let x = 0; x < width; x++) {
      const gx = x * invStepX;
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(downW - 1, gx0 + 1);
      const fx = gx - gx0;

      // Bilinear interpolation of background brightness
      const b00 = smoothBg[bgRow0 + gx0];
      const b10 = smoothBg[bgRow0 + gx1];
      const b01 = smoothBg[bgRow1 + gx0];
      const b11 = smoothBg[bgRow1 + gx1];

      const bVal = Math.max(25, (b00 * (1 - fx) + b10 * fx) * (1 - fy) + (b01 * (1 - fx) + b11 * fx) * fy);

      const idx = (rowOffset + x) * 4;
      const targetWhite = 248;

      for (let c = 0; c < 3; c++) {
        const orig = data[idx + c];
        // Illumination division: scales up paper toward targetWhite, keeping dark text dark
        const norm = (orig / bVal) * targetWhite;
        let blended = orig * (1 - factor) + norm * factor;

        // Paper White Knee: clamp light paper background cleanly to pure white 255
        if (factor > 0.25 && blended >= whiteThreshold) {
          const excess = (blended - whiteThreshold) / (255 - whiteThreshold);
          blended = whiteThreshold + excess * (255 - whiteThreshold) * 1.5;
        }

        data[idx + c] = Math.min(255, Math.max(0, Math.round(blended)));
      }
    }
  }
}

/**
 * Fast separable box blur for continuous 2D field smoothing
 */
function fastSeparableBlur(
  src: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const yOffset = y * w;
    let sum = 0;
    for (let x = -radius; x <= radius; x++) {
      sum += src[yOffset + Math.max(0, Math.min(w - 1, x))];
    }
    temp[yOffset] = sum / (2 * radius + 1);

    for (let x = 1; x < w; x++) {
      const left = Math.max(0, x - radius - 1);
      const right = Math.min(w - 1, x + radius);
      sum += src[yOffset + right] - src[yOffset + left];
      temp[yOffset + x] = sum / (2 * radius + 1);
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      sum += temp[Math.max(0, Math.min(h - 1, y)) * w + x];
    }
    dst[x] = sum / (2 * radius + 1);

    for (let y = 1; y < h; y++) {
      const top = Math.max(0, y - radius - 1);
      const bot = Math.min(h - 1, y + radius);
      sum += temp[bot * w + x] - temp[top * w + x];
      dst[y * w + x] = sum / (2 * radius + 1);
    }
  }

  return dst;
}

/**
 * Deepens text strokes and ink while preserving colored seals and signatures.
 * Makes light or faded printing look like a sharp high-density laser scan.
 */
export function applyInkDeepening(imgData: ImageData, strength: number): void {
  const { data } = imgData;
  const factor = Math.min(1.0, Math.max(0.0, strength / 100));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detect if this pixel is colored (e.g. red seal, blue pen, official stamp)
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
    const isChromatic = maxDiff > 22;

    if (isChromatic) {
      // For colored stamps/signatures: deepen color without making it muddy black
      if (lum < 210) {
        const deepen = 1 - factor * 0.25;
        data[i] = Math.min(255, Math.max(0, Math.round(r * deepen)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(g * deepen)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(b * deepen)));
      }
    } else {
      // For black/gray text strokes: pull down luminance toward deep black ink
      if (lum < 185) {
        // S-curve darkness pull: darker strokes pulled more strongly
        const darkness = (185 - lum) / 185;
        const pull = factor * darkness * 85;

        data[i] = Math.max(0, Math.round(r - pull));
        data[i + 1] = Math.max(0, Math.round(g - pull));
        data[i + 2] = Math.max(0, Math.round(b - pull));
      }
    }
  }
}

/**
 * High-definition adaptive photocopy binarization.
 * Produces razor-sharp binary text with zero background artifacts.
 */
export function applyCrispPhotocopyBinarization(
  imgData: ImageData,
  sensitivity: number,
  globalThreshold: number
): void {
  const { width, height, data } = imgData;
  const k = 0.18 + (sensitivity / 100) * 0.32; // 0.18 to 0.50
  const winSize = Math.max(15, Math.round(Math.min(width, height) / 32));
  const halfWin = Math.floor(winSize / 2);

  // 1. Grayscale luminance
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2. Integral Images for O(1) local mean and variance queries
  const stride = width + 1;
  const intSum = new Float64Array((width + 1) * (height + 1));
  const intSqSum = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSqSum = 0;
    const yStride = (y + 1) * stride;
    const prevYStride = y * stride;
    const grayRow = y * width;

    for (let x = 0; x < width; x++) {
      const val = gray[grayRow + x];
      rowSum += val;
      rowSqSum += val * val;

      const idx = yStride + (x + 1);
      const prevIdx = prevYStride + (x + 1);

      intSum[idx] = intSum[prevIdx] + rowSum;
      intSqSum[idx] = intSqSum[prevIdx] + rowSqSum;
    }
  }

  const biasOffset = (globalThreshold - 128) * 0.35;

  // 3. Sauvola Local Adaptive Thresholding
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - halfWin);
    const y1 = Math.min(height - 1, y + halfWin);
    const y0Stride = y0 * stride;
    const y1Stride = (y1 + 1) * stride;
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - halfWin);
      const x1 = Math.min(width - 1, x + halfWin);

      const count = (x1 - x0 + 1) * (y1 - y0 + 1);

      const sum =
        intSum[y1Stride + (x1 + 1)] -
        intSum[y0Stride + (x1 + 1)] -
        intSum[y1Stride + x0] +
        intSum[y0Stride + x0];

      const sqSum =
        intSqSum[y1Stride + (x1 + 1)] -
        intSqSum[y0Stride + (x1 + 1)] -
        intSqSum[y1Stride + x0] +
        intSqSum[y0Stride + x0];

      const mean = sum / count;
      const variance = Math.max(0, sqSum / count - mean * mean);
      const std = Math.sqrt(variance);

      // Sauvola formula with R=128
      const T = mean * (1 + k * (std / 128 - 1)) + biasOffset;
      const pixelVal = gray[rowOffset + x];

      // If variance is very low and pixel is bright, force white
      const isText = pixelVal < T && (mean < 235 || std > 8);
      const outVal = isText ? 0 : 255;

      const idx = (rowOffset + x) * 4;
      data[idx] = outVal;
      data[idx + 1] = outVal;
      data[idx + 2] = outVal;
    }
  }
}

/**
 * Boosts document colors, making stamps, emblems, and colored text pop against white paper.
 */
export function applyColorPunch(imgData: ImageData): void {
  const { data } = imgData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detect saturation
    const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
    if (diff > 12) {
      // Boost color saturation for stamps & markers by 1.45x
      data[i] = Math.min(255, Math.max(0, Math.round(gray + 1.45 * (r - gray))));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(gray + 1.45 * (g - gray))));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(gray + 1.45 * (b - gray))));
    }
  }
}

/**
 * Standard photographic grayscale conversion
 */
export function applyGrayscale(imgData: ImageData): void {
  const { data } = imgData;
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
  }
}

/**
 * Brightness & Contrast adjustment that respects paper white point.
 * Never darkens clean white paper when contrast is pushed.
 */
export function applyPaperAwareToneAdjustments(
  imgData: ImageData,
  brightness: number,
  contrast: number
): void {
  const { data } = imgData;
  const bShift = (brightness - 100) * 1.1; // -110 to +110
  const cFactor = contrast / 100; // 0.6 to 1.8

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];

      // Contrast pivoted around text-midpoint (110) rather than 128, preserving whites
      v = (v - 110) * cFactor + 110;
      v += bShift;

      data[i + c] = Math.min(255, Math.max(0, Math.round(v)));
    }
  }
}

/**
 * Text Edge Sharpening using high-pass unsharp mask
 */
export function applyTextSharpening(imgData: ImageData, sharpnessPercent: number): void {
  const { width, height, data } = imgData;
  const amount = (sharpnessPercent / 100) * 1.35; // 0 to 1.35
  const orig = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const upRow = (y - 1) * width;
    const downRow = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const idx = (rowOffset + x) * 4;

      for (let c = 0; c < 3; c++) {
        const blurred = (
          orig[(upRow + (x - 1)) * 4 + c] +
          orig[(upRow + x) * 4 + c] * 2 +
          orig[(upRow + (x + 1)) * 4 + c] +
          orig[(rowOffset + (x - 1)) * 4 + c] * 2 +
          orig[idx + c] * 4 +
          orig[(rowOffset + (x + 1)) * 4 + c] * 2 +
          orig[(downRow + (x - 1)) * 4 + c] +
          orig[(downRow + x) * 4 + c] * 2 +
          orig[(downRow + (x + 1)) * 4 + c]
        ) / 16;

        const val = orig[idx + c];
        // Only sharpen edges with perceptible contrast (avoids paper grain noise)
        const diff = val - blurred;
        if (Math.abs(diff) > 2) {
          const sharp = val + diff * amount;
          data[idx + c] = Math.min(255, Math.max(0, Math.round(sharp)));
        }
      }
    }
  }
}

/**
 * Smart Despeckle / Noise Reduction to remove scanner dots, page bleed-through,
 * and paper artifacts while keeping text character strokes solid.
 */
export function applySmartDespeckle(imgData: ImageData, strength: number): void {
  const { width, height, data } = imgData;
  const factor = Math.min(1.0, Math.max(0.0, strength / 100));
  const orig = new Uint8ClampedArray(data);
  const win = new Array(9);

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = (rowOffset + x) * 4;

      for (let c = 0; c < 3; c++) {
        let k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const r = (y + dy) * width;
          for (let dx = -1; dx <= 1; dx++) {
            win[k++] = orig[(r + (x + dx)) * 4 + c];
          }
        }
        win.sort((a, b) => a - b);
        const median = win[4];
        const val = orig[idx + c];

        // If isolated speckle on paper, blend towards median
        if (Math.abs(val - median) > 28) {
          data[idx + c] = Math.round(val * (1 - factor) + median * factor);
        }
      }
    }
  }
}

/**
 * Applies Clean Up eraser brush strokes on document
 */
export function applyCleanupStrokes(imgData: ImageData, strokes: CleanupStroke[]): void {
  const { width, height, data } = imgData;

  // Sample estimated clean paper background color from top corners
  let bgR = 255, bgG = 255, bgB = 255;
  let count = 0, sumR = 0, sumG = 0, sumB = 0;
  for (let y = 0; y < Math.min(15, height); y++) {
    for (let x = 0; x < Math.min(15, width); x++) {
      const idx = (y * width + x) * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      count++;
    }
  }
  if (count > 0) {
    bgR = Math.round(sumR / count);
    bgG = Math.round(sumG / count);
    bgB = Math.round(sumB / count);
  }

  for (const stroke of strokes) {
    const { points, radius } = stroke;
    if (!points || points.length === 0) continue;

    const rSq = radius * radius;
    for (const pt of points) {
      const minX = Math.max(0, Math.floor(pt.x - radius));
      const maxX = Math.min(width - 1, Math.ceil(pt.x + radius));
      const minY = Math.max(0, Math.floor(pt.y - radius));
      const maxY = Math.min(height - 1, Math.ceil(pt.y + radius));

      for (let y = minY; y <= maxY; y++) {
        const row = y * width;
        const dy = y - pt.y;
        for (let x = minX; x <= maxX; x++) {
          const dx = x - pt.x;
          const distSq = dx * dx + dy * dy;
          if (distSq <= rSq) {
            const idx = (row + x) * 4;
            data[idx] = bgR;
            data[idx + 1] = bgG;
            data[idx + 2] = bgB;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }
}
