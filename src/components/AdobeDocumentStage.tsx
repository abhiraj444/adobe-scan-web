import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Eye, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Split, 
  RotateCw,
  Crop,
  Layers
} from 'lucide-react';
import { ViewMode } from '../types';

interface AdobeDocumentStageProps {
  originalDataUrl: string;
  processedDataUrl?: string;
  status: 'idle' | 'processing' | 'ready' | 'error';
  pageIndex: number;
  totalPages: number;
  onOpenCrop: () => void;
}

export const AdobeDocumentStage: React.FC<AdobeDocumentStageProps> = ({
  originalDataUrl,
  processedDataUrl,
  status,
  pageIndex,
  totalPages,
  onOpenCrop,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('processed');
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Splitter drag event handling
  const updateSplitFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.max(2, Math.min(98, pos)));
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDraggingSplitter) {
        updateSplitFromEvent(e);
      }
    };
    const handleUp = () => setIsDraggingSplitter(false);

    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingSplitter, updateSplitFromEvent]);

  const activeSrc = isHoldingOriginal
    ? originalDataUrl
    : (viewMode === 'original' ? originalDataUrl : (processedDataUrl || originalDataUrl));

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#0d0d11] overflow-hidden select-none"
    >
      {/* Top Floating Comparison Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#18181b]/90 backdrop-blur-md px-2 py-1.5 rounded-full border border-zinc-700/80 shadow-xl">
        {/* Processed View Toggle */}
        <button
          onClick={() => setViewMode('processed')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'processed' && !isHoldingOriginal
              ? 'bg-[#1473E6] text-white shadow-sm'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-3 h-3 text-blue-300" />
          <span>Cleaned</span>
        </button>

        {/* Split View Toggle */}
        <button
          onClick={() => setViewMode('split')}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'split' && !isHoldingOriginal
              ? 'bg-[#1473E6] text-white shadow-sm'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Split className="w-3 h-3" />
          <span>Split</span>
        </button>

        <div className="h-4 w-px bg-zinc-700 mx-0.5" />

        {/* Hold or Click to Compare Original Button */}
        <button
          onMouseDown={() => setIsHoldingOriginal(true)}
          onMouseUp={() => setIsHoldingOriginal(false)}
          onMouseLeave={() => setIsHoldingOriginal(false)}
          onTouchStart={() => setIsHoldingOriginal(true)}
          onTouchEnd={() => setIsHoldingOriginal(false)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            isHoldingOriginal
              ? 'bg-amber-500 text-black font-bold ring-2 ring-amber-400 shadow-md'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
          title="Hold down to compare with original raw photo"
        >
          <Eye className="w-3 h-3" />
          <span>Hold to Compare</span>
        </button>
      </div>

      {/* Main Document Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Processing Spinner Overlay */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1e1e24] border border-zinc-700 shadow-2xl text-white">
              <div className="w-4 h-4 border-2 border-[#1473E6] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold tracking-wide">Enhancing Document...</span>
            </div>
          </div>
        )}

        {/* Scaled Image Container */}
        <div 
          ref={imageContainerRef}
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out shadow-2xl rounded-sm overflow-hidden"
          style={{ transform: `scale(${zoom})` }}
        >
          {viewMode === 'split' && !isHoldingOriginal ? (
            /* Split Before / After View */
            <div className="relative max-h-[calc(100vh-220px)] max-w-full inline-block overflow-hidden shadow-2xl border border-zinc-800 rounded bg-white">
              {/* Cleaned Document Image on Base */}
              <img
                src={processedDataUrl || originalDataUrl}
                alt="Cleaned Document"
                className="block max-h-[calc(100vh-220px)] max-w-full object-contain pointer-events-none"
              />

              {/* Original Raw Photo Clipped Overlay */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${splitPos}%` }}
              >
                <img
                  src={originalDataUrl}
                  alt="Original Photo"
                  className="max-h-[calc(100vh-220px)] max-w-none object-contain pointer-events-none"
                  style={{
                    width: imageContainerRef.current?.querySelector('img')?.clientWidth || '100%',
                    height: imageContainerRef.current?.querySelector('img')?.clientHeight || '100%',
                  }}
                />

                {/* Badge for Raw side */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-zinc-300 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-zinc-700">
                  Original
                </div>
              </div>

              {/* Badge for Cleaned side */}
              <div className="absolute top-2 right-2 bg-blue-900/85 backdrop-blur-sm text-blue-200 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-blue-600/40">
                Adobe Cleaned
              </div>

              {/* Splitter Divider Handle */}
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.9)] cursor-ew-resize flex items-center justify-center"
                style={{ left: `${splitPos}%` }}
                onMouseDown={() => setIsDraggingSplitter(true)}
                onTouchStart={() => setIsDraggingSplitter(true)}
              >
                <div className="w-7 h-7 -ml-3.5 bg-white text-zinc-900 rounded-full shadow-2xl border border-zinc-300 flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
                  <Split className="w-3.5 h-3.5 text-zinc-800" />
                </div>
              </div>
            </div>
          ) : (
            /* Single Image View (Cleaned or Original) */
            <div className="relative max-h-[calc(100vh-220px)] max-w-full inline-block shadow-2xl rounded overflow-hidden border border-zinc-800 bg-white">
              <img
                src={activeSrc}
                alt="Document View"
                className="max-h-[calc(100vh-220px)] max-w-full object-contain pointer-events-none"
              />

              {isHoldingOriginal && (
                <div className="absolute top-2.5 left-2.5 bg-amber-500 text-black font-bold text-[10px] px-2 py-0.5 rounded shadow">
                  Viewing Original
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Zoom & Crop Shortcut (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-[#18181b]/90 backdrop-blur-md p-1 rounded-xl border border-zinc-700/80 shadow-xl text-white">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono font-medium px-1 text-zinc-400 min-w-[38px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {zoom !== 1 && (
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-[#1473E6] transition-colors cursor-pointer"
            title="Reset Zoom (Fit to Screen)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
