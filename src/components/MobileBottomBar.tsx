import React from 'react';
import { 
  Plus, 
  RotateCw, 
  Crop, 
  SlidersHorizontal, 
  Sparkles, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { PageItem, PresetMode } from '../types';

interface MobileBottomBarProps {
  page: PageItem;
  pageIndex: number;
  totalPages: number;
  onOpenCrop: () => void;
  onOpenAdvanced: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onAddPage: () => void;
  onSelectPreset: (mode: PresetMode) => void;
  onQuickQualityChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const PRESET_PILLS: { id: PresetMode; label: string }[] = [
  { id: 'notes', label: 'Magic Notes' },
  { id: 'photocopy', label: 'B&W Doc' },
  { id: 'book', label: 'Book Page' },
  { id: 'certificate', label: 'Color Seal' },
  { id: 'receipt', label: 'Receipt' },
  { id: 'color_doc', label: 'Original Color' },
];

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  page,
  pageIndex,
  totalPages,
  onOpenCrop,
  onOpenAdvanced,
  onRotate,
  onDelete,
  onAddPage,
  onSelectPreset,
  onQuickQualityChange,
  onPrevPage,
  onNextPage,
}) => {
  // Simple overall quality / cleaning slider value (mapped to backgroundWhitening & inkEnhancement)
  const quickValue = Math.round(
    (page.settings.backgroundWhitening + page.settings.inkEnhancement) / 2
  );

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 text-white flex flex-col z-30 select-none shadow-2xl safe-bottom">
      {/* 1. Quick Quality Clean Slider (Normal single slider right on the screen) */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 min-w-[84px] text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Clean Level</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={quickValue}
          onChange={(e) => onQuickQualityChange(Number(e.target.value))}
          className="flex-1 accent-blue-500 bg-slate-800 h-2 rounded-full appearance-none cursor-pointer"
        />

        <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded-md min-w-[40px] text-center">
          {quickValue}%
        </span>
      </div>

      {/* 2. Scrollable Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar px-4 py-2 border-y border-slate-800/60 scroll-smooth">
        {PRESET_PILLS.map((p) => {
          const isSelected = page.mode === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 3. Main Touch Actions Toolbar */}
      <div className="px-4 py-2.5 flex items-center justify-around gap-1">
        {/* Crop / Re-adjust Corners */}
        <button
          onClick={onOpenCrop}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all min-w-[56px]"
          title="Adjust document crop corners"
        >
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/70 text-sky-400">
            <Crop className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Crop</span>
        </button>

        {/* Rotate 90 deg */}
        <button
          onClick={onRotate}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all min-w-[56px]"
          title="Rotate page 90 degrees"
        >
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/70 text-indigo-400">
            <RotateCw className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Rotate</span>
        </button>

        {/* Advanced Filters Drawer */}
        <button
          onClick={onOpenAdvanced}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all min-w-[56px]"
          title="Open advanced adjustments & fine-tuning sliders"
        >
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/70 text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Adjust</span>
        </button>

        {/* Add another page */}
        <button
          onClick={onAddPage}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all min-w-[56px]"
          title="Add another photo or scan"
        >
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/70 text-emerald-400">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Add</span>
        </button>

        {/* Delete (if >1 page) */}
        {totalPages > 1 && (
          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all min-w-[56px]"
            title="Delete current page"
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/70 text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Delete</span>
          </button>
        )}
      </div>

      {/* 4. Mini Page Dots / Navigation Bar if multi-page */}
      {totalPages > 1 && (
        <div className="px-4 py-1.5 bg-slate-950/80 flex items-center justify-between border-t border-slate-800/60 text-xs text-slate-400">
          <button
            onClick={onPrevPage}
            disabled={pageIndex === 0}
            className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1.5 font-medium">
            <span>Page</span>
            <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {pageIndex + 1} / {totalPages}
            </span>
          </div>

          <button
            onClick={onNextPage}
            disabled={pageIndex === totalPages - 1}
            className="p-1 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
