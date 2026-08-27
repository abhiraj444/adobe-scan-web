import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Quadrilateral, Point } from '../types';
import { 
  Sparkles, 
  Maximize2, 
  RotateCw, 
  Check, 
  X,
  Crop as CropIcon,
  HelpCircle
} from 'lucide-react';

interface MobileCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (corners: Quadrilateral) => void;
  image: HTMLImageElement | null;
  initialCorners: Quadrilateral;
  onAutoDetect: () => Promise<Quadrilateral | null> | Quadrilateral | void;
  onRotateSource?: () => void;
}

type DragCorner = 'tl' | 'tr' | 'br' | 'bl' | null;

export const MobileCropModal: React.FC<MobileCropModalProps> = ({
  isOpen,
  onClose,
  onApplyCrop,
  image,
  initialCorners,
  onAutoDetect,
  onRotateSource,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [corners, setCorners] = useState<Quadrilateral>(initialCorners);
  const [activeCorner, setActiveCorner] = useState<DragCorner>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);
  const [canvasScale, setCanvasScale] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  // Sync initial corners when modal opens
  useEffect(() => {
    if (isOpen) {
      setCorners(initialCorners);
    }
  }, [isOpen, initialCorners]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !image.width || !image.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    if (!containerW || !containerH) return;

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

    // 1. Background
    ctx.fillStyle = '#090d16';
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

    // 4. Darken area outside quadrilateral
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, drawW, drawH);
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // 5. Draw document boundaries
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.closePath();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle 3x3 alignment grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let t = 0.33; t < 1; t += 0.33) {
      const lx = cTL.x + (cBL.x - cTL.x) * t;
      const ly = cTL.y + (cBL.y - cTL.y) * t;
      const rx = cTR.x + (cBR.x - cTR.x) * t;
      const ry = cTR.y + (cBR.y - cTR.y) * t;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

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

    // 6. Draw Corner Handles (Mobile touch friendly)
    const drawHandle = (p: Point, key: DragCorner, label: string) => {
      const isHovered = activeCorner === key;
      const radius = isHovered ? 18 : 14;

      // Touch halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.45)' : 'rgba(14, 165, 233, 0.2)';
      ctx.fill();

      // Main handle circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    drawHandle(cTL, 'tl', 'TL');
    drawHandle(cTR, 'tr', 'TR');
    drawHandle(cBR, 'br', 'BR');
    drawHandle(cBL, 'bl', 'BL');

    // 7. Render 2.5x Loupe Magnifier overlay when dragging
    if (activeCorner && loupePoint) {
      const activeCornerPos = toCanvas(corners[activeCorner]);
      renderLoupe(ctx, image, activeCornerPos, corners[activeCorner], containerW, containerH);
    }
  }, [image, corners, activeCorner, loupePoint]);

  const renderLoupe = (
    ctx: CanvasRenderingContext2D,
    srcImg: HTMLImageElement,
    screenPos: Point,
    imagePos: Point,
    contW: number,
    contH: number
  ) => {
    const loupeRadius = 60;
    const zoomFactor = 2.5;

    // Offset loupe away from the finger
    let lx = screenPos.x;
    let ly = screenPos.y - loupeRadius - 45;

    if (ly - loupeRadius < 10) {
      ly = screenPos.y + loupeRadius + 45;
    }
    if (lx - loupeRadius < 10) {
      lx = loupeRadius + 15;
    } else if (lx + loupeRadius > contW - 10) {
      lx = contW - loupeRadius - 15;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

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

    // Crosshairs
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
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

    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Chrome rim
    ctx.beginPath();
    ctx.arc(lx, ly, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  useEffect(() => {
    if (isOpen) {
      render();
      const handleResize = () => render();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen, render]);

  const getEventImagePos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return null;
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
    if (!canvas || !image) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const toCanvas = (p: Point) => ({
      x: canvasScale.offsetX + p.x * canvasScale.scale,
      y: canvasScale.offsetY + p.y * canvasScale.scale,
    });

    const hitRadius = 45; // generous mobile touch radius
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
    setCorners((prev) => ({
      ...prev,
      [activeCorner]: imgPos,
    }));
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
    setLoupePoint(null);
  };

  const handleAutoDetectClick = async () => {
    const res = await onAutoDetect();
    if (res) {
      setCorners(res);
    }
  };

  const handleFullPageClick = () => {
    if (!image) return;
    setCorners({
      tl: { x: 0, y: 0 },
      tr: { x: image.width, y: 0 },
      br: { x: image.width, y: image.height },
      bl: { x: 0, y: image.height },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none animate-in fade-in duration-150">
      {/* Mobile Top Navigation Header */}
      <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <X className="w-5 h-5" />
          <span className="text-xs font-medium hidden sm:inline">Cancel</span>
        </button>

        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <CropIcon className="w-4 h-4 text-sky-400" />
          <span>Crop & Perspective</span>
        </div>

        <button
          onClick={() => onApplyCrop(corners)}
          className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Action Chips Toolbar */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-center gap-2 overflow-x-auto z-20">
        <button
          onClick={handleAutoDetectClick}
          className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Auto Detect</span>
        </button>

        <button
          onClick={handleFullPageClick}
          className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
          <span>Full Page</span>
        </button>

        {onRotateSource && (
          <button
            onClick={onRotateSource}
            className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rotate 90°</span>
          </button>
        )}
      </div>

      {/* Main Touch Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center cursor-crosshair touch-none bg-slate-950 overflow-hidden"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block max-w-full max-h-full" />
      </div>

      {/* Bottom Hint */}
      <div className="py-2.5 px-4 bg-slate-900 border-t border-slate-800/80 text-center text-xs text-slate-400">
        Drag the corner circles to match the document boundary
      </div>
    </div>
  );
};
