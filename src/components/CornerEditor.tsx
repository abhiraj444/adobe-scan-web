import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Quadrilateral, Point } from '../types';
import { Sparkles, Maximize2, RotateCw } from 'lucide-react';

interface CornerEditorProps {
  image: HTMLImageElement;
  corners: Quadrilateral;
  onChangeCorners: (corners: Quadrilateral) => void;
  onAutoDetect: () => void;
  onResetCorners: () => void;
  onRotateImage?: () => void;
}

type DragCorner = 'tl' | 'tr' | 'br' | 'bl' | null;

export const CornerEditor: React.FC<CornerEditorProps> = ({
  image,
  corners,
  onChangeCorners,
  onAutoDetect,
  onResetCorners,
  onRotateImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCorner, setActiveCorner] = useState<DragCorner>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);
  const [canvasScale, setCanvasScale] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  // Draw canvas with corners and quadrilateral overlay
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image.width || !image.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const imgAspect = image.width / image.height;
    const contAspect = containerW / containerH;

    let drawW: number;
    let drawH: number;

    if (imgAspect > contAspect) {
      drawW = containerW;
      drawH = containerW / imgAspect;
    } else {
      drawH = containerH;
      drawW = containerH * imgAspect;
    }

    // Set high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    ctx.scale(dpr, dpr);

    const offsetX = (containerW - drawW) / 2;
    const offsetY = (containerH - drawH) / 2;
    const scale = drawW / image.width;

    setCanvasScale({ scale, offsetX, offsetY });

    // 1. Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, containerW, containerH);

    // 2. Draw raw image
    ctx.drawImage(image, offsetX, offsetY, drawW, drawH);

    // 3. Transform corners to canvas coordinates
    const toCanvas = (p: Point) => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const cTL = toCanvas(corners.tl);
    const cTR = toCanvas(corners.tr);
    const cBR = toCanvas(corners.br);
    const cBL = toCanvas(corners.bl);

    // 4. Draw outer dim overlay (darken outside quadrilateral)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, drawW, drawH);
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // 5. Draw Quadrilateral border lines
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.closePath();

    // Glowing border stroke
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Grid lines inside quad (Rule of thirds)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let t = 0.33; t < 1; t += 0.33) {
      // Horizontal line
      const lx = cTL.x + (cBL.x - cTL.x) * t;
      const ly = cTL.y + (cBL.y - cTL.y) * t;
      const rx = cTR.x + (cBR.x - cTR.x) * t;
      const ry = cTR.y + (cBR.y - cTR.y) * t;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Vertical line
      const tx = cTL.x + (cTR.x - cTL.x) * t;
      const ty = cTL.y + (cTR.y - cTL.y) * t;
      const bx = cBL.x + (cBR.x - cBL.x) * t;
      const by = cBL.y + (cBR.y - cBL.y) * t;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Draw Corner Handles
    const drawHandle = (p: Point, key: DragCorner, label: string) => {
      const isHovered = activeCorner === key;
      const radius = isHovered ? 16 : 12;

      // Outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.4)' : 'rgba(0, 0, 0, 0.3)';
      ctx.fill();

      // Circle handle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Label tag
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y - radius - 6);
    };

    drawHandle(cTL, 'tl', 'Top Left');
    drawHandle(cTR, 'tr', 'Top Right');
    drawHandle(cBR, 'br', 'Bottom Right');
    drawHandle(cBL, 'bl', 'Bottom Left');

    // 7. Render Loupe (Magnifier) if dragging
    if (activeCorner && loupePoint) {
      const activeCornerPos = toCanvas(corners[activeCorner]);
      renderLoupe(ctx, image, activeCornerPos, corners[activeCorner], containerW, containerH);
    }
  }, [image, corners, activeCorner, loupePoint]);

  // Render 2.5x Loupe Magnifier overlay
  const renderLoupe = (
    ctx: CanvasRenderingContext2D,
    srcImg: HTMLImageElement,
    screenPos: Point,
    imagePos: Point,
    contW: number,
    contH: number
  ) => {
    const loupeRadius = 65;
    const zoomFactor = 2.5;

    // Position loupe offset from the finger/mouse so it's not obscured
    let lx = screenPos.x;
    let ly = screenPos.y - loupeRadius - 40;

    if (ly - loupeRadius < 10) {
      ly = screenPos.y + loupeRadius + 40;
    }
    if (lx - loupeRadius < 10) {
      lx = loupeRadius + 15;
    } else if (lx + loupeRadius > contW - 10) {
      lx = contW - loupeRadius - 15;
    }

    ctx.save();

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Clip circular window
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    // Draw magnified image segment
    const sampleW = (loupeRadius * 2) / zoomFactor;
    const sampleH = (loupeRadius * 2) / zoomFactor;
    const sx = imagePos.x - sampleW / 2;
    const sy = imagePos.y - sampleH / 2;

    ctx.drawImage(
      srcImg,
      sx,
      sy,
      sampleW,
      sampleH,
      lx - loupeRadius,
      ly - loupeRadius,
      loupeRadius * 2,
      loupeRadius * 2
    );

    // Crosshair lines inside loupe
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - loupeRadius, ly);
    ctx.lineTo(lx - 8, ly);
    ctx.moveTo(lx + 8, ly);
    ctx.lineTo(lx + loupeRadius, ly);
    ctx.moveTo(lx, ly - loupeRadius);
    ctx.lineTo(lx, ly - 8);
    ctx.moveTo(lx, ly + 8);
    ctx.lineTo(lx, ly + loupeRadius);
    ctx.stroke();

    // Center target ring
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Loupe outer chrome rim
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  };

  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Coordinate conversion from client mouse to image space
  const getEventImagePos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const imgX = (screenX - canvasScale.offsetX) / canvasScale.scale;
    const imgY = (screenY - canvasScale.offsetY) / canvasScale.scale;

    return {
      x: Math.max(0, Math.min(image.width, Math.round(imgX))),
      y: Math.max(0, Math.min(image.height, Math.round(imgY))),
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Check hit radius on 4 corners in screen coordinates
    const toCanvas = (p: Point) => ({
      x: canvasScale.offsetX + p.x * canvasScale.scale,
      y: canvasScale.offsetY + p.y * canvasScale.scale,
    });

    const hitRadius = 35; // generous touch hit area
    const dist = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const keys: DragCorner[] = ['tl', 'tr', 'br', 'bl'];
    let nearest: DragCorner = null;
    let minDist = hitRadius;

    for (const key of keys) {
      if (!key) continue;
      const cPos = toCanvas(corners[key]);
      const d = dist({ x: screenX, y: screenY }, cPos);
      if (d < minDist) {
        minDist = d;
        nearest = key;
      }
    }

    if (nearest) {
      setActiveCorner(nearest);
      setLoupePoint(corners[nearest]);
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeCorner) return;
    const imgPos = getEventImagePos(e);
    if (!imgPos) return;

    setLoupePoint(imgPos);
    onChangeCorners({
      ...corners,
      [activeCorner]: imgPos,
    });
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
    setLoupePoint(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top action toolbar for corners */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-xl">
        <button
          onClick={onAutoDetect}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>Auto Detect</span>
        </button>

        <button
          onClick={onResetCorners}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Full Page</span>
        </button>

        {onRotateImage && (
          <button
            onClick={onRotateImage}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Rotate source image 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate</span>
          </button>
        )}
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center cursor-crosshair touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-md border border-slate-800 text-center">
        Drag corner handles to align document boundaries. Loupe zooms 2.5× for precision.
      </div>
    </div>
  );
};
