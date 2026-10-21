import React from 'react';
import { 
  PlusCircle, 
  Layers, 
  Crop, 
  RotateCw, 
  Sparkles, 
  Eraser, 
  SlidersHorizontal, 
  Maximize, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  CopyCheck
} from 'lucide-react';
import { PageItem } from '../types';

interface AdobeBottomToolbarProps {
  page: PageItem;
  pageIndex: number;
  totalPages: number;
  activeTool?: string | null;
  onOpenAdd: () => void;
  onOpenReorder: () => void;
  onOpenCrop: () => void;
  onRotate: () => void;
  onOpenFilters: () => void;
  onOpenCleanup: () => void;
  onOpenAdjust: () => void;
  onOpenResize: () => void;
  onApplyToAll?: () => void;
  onDelete: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export const AdobeBottomToolbar: React.FC<AdobeBottomToolbarProps> = ({
  page,
  pageIndex,
  totalPages,
  activeTool,
  onOpenAdd,
  onOpenReorder,
  onOpenCrop,
  onRotate,
  onOpenFilters,
  onOpenCleanup,
  onOpenAdjust,
  onOpenResize,
  onApplyToAll,
  onDelete,
  onPrevPage,
  onNextPage,
}) => {
  return (
    <div className="w-full bg-[#121214] border-t border-[#27272a] text-zinc-100 flex flex-col z-30 select-none shadow-2xl safe-bottom">
      {/* Adobe Scan Signature Tool Ribbon */}
      <div className="px-2 py-2 flex items-center justify-between overflow-x-auto custom-scrollbar gap-1 sm:gap-2">
        {/* 1. Add Page */}
        <button
          onClick={onOpenAdd}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
          title="Add another photo or page"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-emerald-400">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Add Page</span>
        </button>

        {/* 2. Reorder */}
        <button
          onClick={onOpenReorder}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
          title="Reorder and manage pages"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Reorder</span>
        </button>

        {/* 3. Crop */}
        <button
          onClick={onOpenCrop}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
          title="Adjust document borders & perspective"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-sky-400">
            <Crop className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Crop</span>
        </button>

        {/* 4. Rotate */}
        <button
          onClick={onRotate}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
          title="Rotate page 90° clockwise"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-indigo-400">
            <RotateCw className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Rotate</span>
        </button>

        {/* 5. Filters (Adobe Color Mode Presets) */}
        <button
          onClick={onOpenFilters}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px] cursor-pointer shrink-0 ${
            activeTool === 'filters'
              ? 'bg-[#1473E6]/20 text-white ring-1 ring-[#1473E6]'
              : 'text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95'
          }`}
          title="Choose Color, Magic Color, Whiteboard, or B&W"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            activeTool === 'filters'
              ? 'bg-[#1473E6] border-[#1473E6] text-white shadow-md shadow-blue-500/30'
              : 'bg-[#1e1e24] border-zinc-700/60 text-purple-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-medium tracking-tight ${activeTool === 'filters' ? 'font-bold text-blue-300' : ''}`}>Filters</span>
        </button>

        {/* 6. Clean Up (Retouch & Eraser Brush) */}
        <button
          onClick={onOpenCleanup}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
          title="Erase unwanted spots, holes, and finger marks"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-pink-400">
            <Eraser className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Clean Up</span>
        </button>

        {/* 7. Adjust (Fine Tuning Sliders) */}
        <button
          onClick={onOpenAdjust}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px] cursor-pointer shrink-0 ${
            activeTool === 'adjust'
              ? 'bg-[#1473E6]/20 text-white ring-1 ring-[#1473E6]'
              : 'text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95'
          }`}
          title="Brightness, contrast, sharpness & ink tuning"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            activeTool === 'adjust'
              ? 'bg-[#1473E6] border-[#1473E6] text-white shadow-md shadow-blue-500/30'
              : 'bg-[#1e1e24] border-zinc-700/60 text-amber-400'
          }`}>
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-medium tracking-tight ${activeTool === 'adjust' ? 'font-bold text-blue-300' : ''}`}>Adjust</span>
        </button>

        {/* 8. Apply to All Pages (Prominent Quick Action) */}
        {totalPages > 1 && onApplyToAll && (
          <button
            onClick={onApplyToAll}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-blue-300 hover:text-white hover:bg-[#1473E6]/20 active:scale-95 transition-all min-w-[62px] cursor-pointer shrink-0 ring-1 ring-[#1473E6]/30 bg-[#1473E6]/10"
            title="Apply current page's edits & filters to all pages in this document"
          >
            <div className="w-8 h-8 rounded-full bg-[#1473E6]/30 flex items-center justify-center border border-[#1473E6] text-white">
              <CopyCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-blue-200">Apply All</span>
          </button>
        )}

        {/* 9. Resize (Paper Standard Format) */}
        <button
          onClick={onOpenResize}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px] cursor-pointer shrink-0 ${
            activeTool === 'resize'
              ? 'bg-[#1473E6]/20 text-white ring-1 ring-[#1473E6]'
              : 'text-zinc-300 hover:text-white hover:bg-[#27272a] active:scale-95'
          }`}
          title="Set paper standard (A4, Letter, ID Card)"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            activeTool === 'resize'
              ? 'bg-[#1473E6] border-[#1473E6] text-white shadow-md shadow-blue-500/30'
              : 'bg-[#1e1e24] border-zinc-700/60 text-teal-400'
          }`}>
            <Maximize className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-medium tracking-tight ${activeTool === 'resize' ? 'font-bold text-blue-300' : ''}`}>Resize</span>
        </button>

        {/* 10. Delete Page */}
        {totalPages > 1 && (
          <button
            onClick={onDelete}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-[#27272a] active:scale-95 transition-all min-w-[56px] cursor-pointer shrink-0"
            title="Delete current page"
          >
            <div className="w-8 h-8 rounded-full bg-[#1e1e24] flex items-center justify-center border border-zinc-700/60 text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">Delete</span>
          </button>
        )}
      </div>

      {/* Mini Page Navigation Dots on bottom if multi-page */}
      {totalPages > 1 && (
        <div className="px-4 py-1.5 bg-[#09090b] flex items-center justify-between border-t border-[#1f1f23] text-xs text-zinc-400">
          <button
            onClick={onPrevPage}
            disabled={pageIndex === 0}
            className="px-2 py-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-zinc-200 text-xs font-semibold">
              Page {pageIndex + 1} of {totalPages}
            </span>
          </div>

          <button
            onClick={onNextPage}
            disabled={pageIndex === totalPages - 1}
            className="px-2 py-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
