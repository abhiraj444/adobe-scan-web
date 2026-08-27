import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CleanupStroke, Point } from '../types';
import { 
  Eraser, 
  X, 
  Check, 
  Undo2, 
  Redo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Paintbrush,
  Pipette
} from 'lucide-react';

interface AdobeCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCleanup: (strokes: CleanupStroke[]) => void;
  imageCanvas: HTMLCanvasElement | null;
  initialStrokes?: CleanupStroke[];
}

export const AdobeCleanupModal: React.FC<AdobeCleanupModalProps> = ({
  isOpen,
  onClose,
  onApplyCleanup,
  imageCanvas,
  initialStrokes = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [strokes, setStrokes] = useState<CleanupStroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<CleanupStroke[]>([]);
  const [brushRadius, setBrushRadius] = useState<number>(16);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [fillColor, setFillColor] = useState<string>('#ffffff');
  const [canvasScale, setCanvasScale] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (isOpen) {
      setStrokes(initialStrokes || []);
      setRedoStack([]);
    }
  }, [isOpen, initialStrokes]);

  // Main draw loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageCanvas || !imageCanvas.width || !imageCanvas.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    if (!containerW || !containerH) return;

    const imgAspect = imageCanvas.width / imageCanvas.height;
    const contAspect = containerW / containerH;

    let drawW: number;
    let drawH: number;

    if (imgAspect > contAspect) {
      drawW = containerW * 0.92;
      drawH = (containerW * 0.92) / imgAspect;
    } else {
      drawH = containerH * 0.92;
      drawW = (containerH * 0.92) * imgAspect;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    ctx.scale(dpr, dpr);

    const offsetX = (containerW - drawW) / 2;
    const offsetY = (containerH - drawH) / 2;
    const scale = drawW / imageCanvas.width;

    setCanvasScale({ scale, offsetX, offsetY });

    // Clear background
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, containerW, containerH);

    // Draw document image with drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(imageCanvas, offsetX, offsetY, drawW, drawH);
    ctx.restore();

    // Helper to map image coords to screen coords
    const toScreen = (p: Point) => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    // Draw existing strokes
    const allStrokes = [...strokes];
    if (currentPoints.length > 0) {
      allStrokes.push({
        id: 'active',
        points: currentPoints,
        radius: brushRadius,
        color: fillColor,
      });
    }

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      ctx.save();
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.fillStyle = stroke.color || '#ffffff';
      ctx.lineWidth = stroke.radius * 2 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        const sp = toScreen(stroke.points[0]);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, stroke.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        const start = toScreen(stroke.points[0]);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = toScreen(stroke.points[i]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [imageCanvas, strokes, currentPoints, brushRadius, fillColor]);

  useEffect(() => {
    if (isOpen) {
      render();
      const handleResize = () => render();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen, render]);

  const getImagePoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas || !imageCanvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const imgX = (screenX - canvasScale.offsetX) / canvasScale.scale;
    const imgY = (screenY - canvasScale.offsetY) / canvasScale.scale;

    return {
      x: Math.max(0, Math.min(imageCanvas.width, Math.round(imgX))),
      y: Math.max(0, Math.min(imageCanvas.height, Math.round(imgY))),
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getImagePoint(e);
    if (!p) return;
    setIsDrawing(true);
    setCurrentPoints([p]);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const p = getImagePoint(e);
    if (!p) return;
    setCurrentPoints((prev) => [...prev, p]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      const newStroke: CleanupStroke = {
        id: `stroke_${Date.now()}`,
        points: currentPoints,
        radius: brushRadius,
        color: fillColor,
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
      setCurrentPoints([]);
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setStrokes((prev) => [...prev, next]);
  };

  const handleClearAll = () => {
    if (strokes.length > 0 && confirm('Clear all erase brush strokes?')) {
      setStrokes([]);
      setRedoStack([]);
    }
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
          <Eraser className="w-4 h-4 text-pink-400" />
          <span>Adobe Clean Up (Retouch Brush)</span>
        </div>

        <button
          onClick={() => {
            onApplyCleanup(strokes);
            onClose();
          }}
          className="px-4 py-1.5 rounded-lg bg-[#1473E6] hover:bg-[#0d66d0] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Apply</span>
        </button>
      </div>

      {/* Brush Size & Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#18181b]/95 border-b border-[#27272a] flex items-center justify-between gap-3 overflow-x-auto z-20">
        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
          <Paintbrush className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Size</span>
          <input
            type="range"
            min="4"
            max="60"
            value={brushRadius}
            onChange={(e) => setBrushRadius(Number(e.target.value))}
            className="flex-1 accent-[#1473E6] bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <span className="font-mono text-xs font-bold text-blue-400 min-w-[28px]">
            {brushRadius}px
          </span>
        </div>

        {/* Color presets (White Paper or Custom) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFillColor('#ffffff')}
            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer bg-white ${
              fillColor === '#ffffff' ? 'border-[#1473E6] scale-110 shadow' : 'border-zinc-600'
            }`}
            title="Clean White Paper Background"
          />
          <button
            onClick={() => setFillColor('#f8f9fa')}
            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer bg-[#f8f9fa] ${
              fillColor === '#f8f9fa' ? 'border-[#1473E6] scale-110 shadow' : 'border-zinc-600'
            }`}
            title="Off-White Paper"
          />
        </div>

        {/* Undo / Redo / Clear */}
        <div className="flex items-center gap-1 border-l border-zinc-700/80 pl-3">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearAll}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Clear all strokes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Touch Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center touch-none bg-[#09090b] overflow-hidden cursor-crosshair"
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
      <div className="py-2 px-4 bg-[#18181b] border-t border-[#27272a] text-center text-xs text-zinc-400">
        Brush over punch holes, stains, finger marks, or text to seamlessly erase them from the scan.
      </div>
    </div>
  );
};
