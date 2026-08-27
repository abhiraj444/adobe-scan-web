import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Quadrilateral, Point } from '../types';
import { 
  Sparkles, 
  Maximize2, 
  RotateCw, 
  Check, 
  X,
  Crop as CropIcon
} from 'lucide-react';
import { getQuadMidpoints, updateCornersFromEdgeMove } from '../lib/cv/edgeDetection';

interface AdobeCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (corners: Quadrilateral) => void;
  image: HTMLImageElement | null;
  initialCorners: Quadrilateral;
  onAutoDetect: () => Promise<Quadrilateral | null> | Quadrilateral | void;
  onRotateSource?: () => void;
}

type DragTarget = 'tl' | 'tr' | 'br' | 'bl' | 'edge-top' | 'edge-right' | 'edge-bottom' | 'edge-left' | null;

export const AdobeCropModal: React.FC<AdobeCropModalProps> = ({
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
  const [activeTarget, setActiveTarget] = useState<DragTarget>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);
  const [canvasScale, setCanvasScale] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [lastPointerPos, setLastPointerPos] = useState<Point | null>(null);

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

    // 1. Clear Background
    ctx.fillStyle = '#0b0b0e';
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, drawW, drawH);
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // 5. Draw document boundary stroke
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cTL.x, cTL.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.lineTo(cBL.x, cBL.y);
    ctx.closePath();

    ctx.strokeStyle = '#1473E6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle alignment grid
    ctx.strokeStyle = 'rgba(20, 115, 230, 0.3)';
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

    // 6. Draw 4 Midpoint Edge Handles
    const midpoints = getQuadMidpoints(corners);
    const mTop = toCanvas(midpoints.top);
    const mRight = toCanvas(midpoints.right);
    const mBottom = toCanvas(midpoints.bottom);
    const mLeft = toCanvas(midpoints.left);

    const drawMidHandle = (p: Point, key: DragTarget) => {
      const isHovered = activeTarget === key;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHovered ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1473E6';
      ctx.stroke();
      ctx.restore();
    };

    drawMidHandle(mTop, 'edge-top');
    drawMidHandle(mRight, 'edge-right');
    drawMidHandle(mBottom, 'edge-bottom');
    drawMidHandle(mLeft, 'edge-left');

    // 7. Draw 4 Corner Handles (Touch & Mouse friendly)
    const drawCornerHandle = (p: Point, key: DragTarget) => {
      const isHovered = activeTarget === key;
      const radius = isHovered ? 18 : 14;

      // Touch Halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(20, 115, 230, 0.45)' : 'rgba(20, 115, 230, 0.2)';
      ctx.fill();

      // Main Circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1473E6';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center White Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    drawCornerHandle(cTL, 'tl');
    drawCornerHandle(cTR, 'tr');
    drawCornerHandle(cBR, 'br');
    drawCornerHandle(cBL, 'bl');

    // 8. Render 2.5x Loupe Magnifier Overlay when dragging a corner
    if (activeTarget && ['tl', 'tr', 'br', 'bl'].includes(activeTarget) && loupePoint) {
      const activeCornerPos = toCanvas(corners[activeTarget as keyof Quadrilateral]);
      renderLoupe(ctx, image, activeCornerPos, corners[activeTarget as keyof Quadrilateral], containerW, containerH);
    }
  }, [image, corners, activeTarget, loupePoint]);

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

    const dist = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    // 1. Check 4 corners first (high priority)
    const cornerKeys: Array<'tl' | 'tr' | 'br' | 'bl'> = ['tl', 'tr', 'br', 'bl'];
    for (const key of cornerKeys) {
      const cPos = toCanvas(corners[key]);
      if (dist({ x: screenX, y: screenY }, cPos) < 40) {
        setActiveTarget(key);
        setLoupePoint(corners[key]);
        setLastPointerPos(getEventImagePos(e));
        e.preventDefault();
        return;
      }
    }

    // 2. Check 4 edge midpoints
    const midpoints = getQuadMidpoints(corners);
    const edgeTargets: Array<{ key: DragTarget; pos: Point }> = [
      { key: 'edge-top', pos: toCanvas(midpoints.top) },
      { key: 'edge-right', pos: toCanvas(midpoints.right) },
      { key: 'edge-bottom', pos: toCanvas(midpoints.bottom) },
      { key: 'edge-left', pos: toCanvas(midpoints.left) },
    ];

    for (const edge of edgeTargets) {
      if (dist({ x: screenX, y: screenY }, edge.pos) < 30) {
        setActiveTarget(edge.key);
        setLastPointerPos(getEventImagePos(e));
        e.preventDefault();
        return;
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeTarget || !image) return;
    const currentImgPos = getEventImagePos(e);
    if (!currentImgPos) return;

    if (['tl', 'tr', 'br', 'bl'].includes(activeTarget)) {
      setLoupePoint(currentImgPos);
      setCorners((prev) => ({
        ...prev,
        [activeTarget as keyof Quadrilateral]: currentImgPos,
      }));
    } else if (lastPointerPos) {
      const deltaX = currentImgPos.x - lastPointerPos.x;
      const deltaY = currentImgPos.y - lastPointerPos.y;

      if (activeTarget === 'edge-top') {
        setCorners((prev) => updateCornersFromEdgeMove(prev, 'top', deltaX, deltaY, image.width, image.height));
      } else if (activeTarget === 'edge-right') {
        setCorners((prev) => updateCornersFromEdgeMove(prev, 'right', deltaX, deltaY, image.width, image.height));
      } else if (activeTarget === 'edge-bottom') {
        setCorners((prev) => updateCornersFromEdgeMove(prev, 'bottom', deltaX, deltaY, image.width, image.height));
      } else if (activeTarget === 'edge-left') {
        setCorners((prev) => updateCornersFromEdgeMove(prev, 'left', deltaX, deltaY, image.width, image.height));
      }
    }

    setLastPointerPos(currentImgPos);
  };

  const handlePointerUp = () => {
    setActiveTarget(null);
    setLoupePoint(null);
    setLastPointerPos(null);
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f13] text-white select-none animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
          <span className="text-xs font-semibold hidden sm:inline">Cancel</span>
        </button>

        <div className="flex items-center gap-1.5 font-bold text-sm">
          <CropIcon className="w-4 h-4 text-[#1473E6]" />
          <span>Adjust Crop & Boundaries</span>
        </div>

        <button
          onClick={() => onApplyCrop(corners)}
          className="px-4 py-1.5 rounded-lg bg-[#1473E6] hover:bg-[#0d66d0] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Action Chips Toolbar */}
      <div className="px-4 py-2 bg-[#18181b]/90 border-b border-[#27272a] flex items-center justify-center gap-2 overflow-x-auto z-20">
        <button
          onClick={handleAutoDetectClick}
          className="px-3.5 py-1.5 rounded-full bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700/80 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Auto Detect</span>
        </button>

        <button
          onClick={handleFullPageClick}
          className="px-3.5 py-1.5 rounded-full bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700/80 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
          <span>Full Page</span>
        </button>

        {onRotateSource && (
          <button
            onClick={onRotateSource}
            className="px-3.5 py-1.5 rounded-full bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700/80 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rotate 90°</span>
          </button>
        )}
      </div>

      {/* Main Touch Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center cursor-crosshair touch-none bg-[#09090b] overflow-hidden"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block max-w-full max-h-full" />
      </div>

      {/* Bottom Guidance */}
      <div className="py-2.5 px-4 bg-[#18181b] border-t border-[#27272a] text-center text-xs text-zinc-400">
        Drag corner or edge handles to snap to page edges. Loupe zooms 2.5× for precision.
      </div>
    </div>
  );
};
