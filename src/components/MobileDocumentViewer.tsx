import React, { useState, useRef } from 'react';
import { 
  Eye, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Crop,
  Layers
} from 'lucide-react';

interface MobileDocumentViewerProps {
  originalDataUrl: string;
  processedDataUrl?: string;
  status: 'idle' | 'processing' | 'ready' | 'error';
  pageIndex: number;
  totalPages: number;
  onOpenCrop: () => void;
}

export const MobileDocumentViewer: React.FC<MobileDocumentViewerProps> = ({
  originalDataUrl,
  processedDataUrl,
  status,
  pageIndex,
  totalPages,
  onOpenCrop,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Floating Compare / Mode Indicator */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {/* Toggle / Hold to Compare Button */}
        <button
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          onTouchStart={() => setShowOriginal(true)}
          onTouchEnd={() => setShowOriginal(false)}
          onClick={() => setShowOriginal((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg transition-all active:scale-95 ${
            showOriginal
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800'
          }`}
          title="Hold or tap to compare with original raw photo"
        >
          {showOriginal ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Original Photo</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Cleaned Scan</span>
              <span className="text-[10px] text-slate-400 font-normal pl-1 hidden xs:inline">(Hold to compare)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Document Viewport Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Processing Spinner */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-30 flex items-center justify-center">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Cleaning Page...</span>
            </div>
          </div>
        )}

        {/* Scaled Image Container */}
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out shadow-2xl rounded-sm overflow-hidden"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={showOriginal ? originalDataUrl : (processedDataUrl || originalDataUrl)}
            alt="Scanned Document"
            className="max-h-[calc(100vh-230px)] max-w-full object-contain rounded shadow-2xl bg-white border border-slate-800 pointer-events-none"
          />
        </div>
      </div>

      {/* Floating Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-white">
        <button
          onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono font-medium px-1 text-slate-400 min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {zoom !== 1 && (
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-blue-400 transition-colors"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
