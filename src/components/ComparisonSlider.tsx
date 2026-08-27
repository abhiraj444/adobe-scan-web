import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ViewMode } from '../types';
import { 
  Split, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles,
  Crop
} from 'lucide-react';

interface ComparisonSliderProps {
  originalDataUrl: string;
  processedDataUrl?: string;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenCornerEditor: () => void;
  status: 'idle' | 'processing' | 'ready' | 'error';
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  originalDataUrl,
  processedDataUrl,
  viewMode,
  onChangeViewMode,
  onOpenCornerEditor,
  status,
}) => {
  const [splitPos, setSplitPos] = useState(50); // 0 to 100%
  const [zoom, setZoom] = useState(1);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingSplitter(true);
    updateSplitFromEvent(e);
  };

  const updateSplitFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const container = containerRef.current;
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

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Floating View Switcher Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl">
        <button
          onClick={() => onChangeViewMode('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Compare original photo with cleaned scanner result"
        >
          <Split className="w-3.5 h-3.5" />
          <span>Before / After</span>
        </button>

        <button
          onClick={() => onChangeViewMode('processed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'processed'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="View full cleaned scan"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>Cleaned Scan</span>
        </button>

        <button
          onClick={() => onChangeViewMode('original')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'original'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="View raw input photo"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Raw Photo</span>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-0.5" />

        <button
          onClick={onOpenCornerEditor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
          title="Adjust document corners"
        >
          <Crop className="w-3.5 h-3.5 text-sky-400" />
          <span>Crop / Corners</span>
        </button>
      </div>

      {/* Main Image Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      >
        {status === 'processing' && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-30 flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-white">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium tracking-wide">Processing Document Pipeline...</span>
            </div>
          </div>
        )}

        <div 
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out shadow-2xl rounded-sm overflow-hidden"
          style={{ transform: `scale(${zoom})` }}
        >
          {viewMode === 'original' && (
            <img
              src={originalDataUrl}
              alt="Raw Photo"
              className="max-h-[calc(100vh-210px)] max-w-full object-contain pointer-events-none rounded shadow-lg border border-slate-800"
            />
          )}

          {viewMode === 'processed' && (
            <img
              src={processedDataUrl || originalDataUrl}
              alt="Processed Document"
              className="max-h-[calc(100vh-210px)] max-w-full object-contain pointer-events-none bg-white rounded shadow-2xl border border-slate-800"
            />
          )}

          {viewMode === 'split' && (
            <div className="relative max-h-[calc(100vh-210px)] max-w-full inline-block overflow-hidden shadow-2xl border border-slate-800">
              {/* Cleaned Document on the Right/Base */}
              <img
                src={processedDataUrl || originalDataUrl}
                alt="Processed Document"
                className="block max-h-[calc(100vh-210px)] max-w-full object-contain pointer-events-none bg-white"
              />

              {/* Original Raw Photo Clipped on the Left */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${splitPos}%` }}
              >
                <img
                  src={originalDataUrl}
                  alt="Raw Photo"
                  className="max-h-[calc(100vh-210px)] max-w-none object-contain pointer-events-none"
                  style={{
                    width: containerRef.current?.querySelector('img')?.clientWidth || '100%',
                    height: containerRef.current?.querySelector('img')?.clientHeight || '100%',
                  }}
                />

                {/* Badge for Raw side */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-slate-700/60 shadow">
                  Raw Photo
                </div>
              </div>

              {/* Badge for Cleaned side */}
              <div className="absolute top-3 right-3 bg-blue-900/80 backdrop-blur-sm text-blue-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-blue-600/40 shadow">
                Cleaned Scan
              </div>

              {/* Splitter Divider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] cursor-ew-resize flex items-center justify-center"
                style={{ left: `${splitPos}%` }}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              >
                <div className="w-8 h-8 -ml-4 bg-white text-slate-900 rounded-full shadow-2xl border border-slate-300 flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
                  <Split className="w-4 h-4 text-slate-800" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Zoom & View Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl text-white">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-medium px-1.5 text-slate-400 min-w-[44px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        <button
          onClick={() => setZoom(1)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
          title="Reset Zoom to Fit"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
