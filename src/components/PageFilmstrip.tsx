import React from 'react';
import { PageItem } from '../types';
import { Plus, Trash2, RotateCw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { PRESET_META } from '../lib/cv/presets';

interface PageFilmstripProps {
  pages: PageItem[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onOpenReorder: () => void;
}

export const PageFilmstrip: React.FC<PageFilmstripProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onRotatePage,
  onOpenReorder,
}) => {
  if (pages.length === 0) return null;

  return (
    <div className="w-full bg-[#18181b]/95 backdrop-blur-md border-t border-[#27272a] px-3 py-2 flex items-center gap-2.5 overflow-x-auto custom-scrollbar select-none z-20 shadow-lg">
      {/* Pages Count Badge & Reorder trigger */}
      <button
        onClick={onOpenReorder}
        className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-[#27272a] hover:bg-[#323238] border border-zinc-700/60 text-zinc-300 hover:text-white transition-all shrink-0 cursor-pointer h-16 w-14"
        title="Open full page grid & reorder"
      >
        <Layers className="w-4 h-4 text-[#1473E6] mb-0.5" />
        <span className="text-[10px] font-bold">Pages</span>
        <span className="text-[9px] font-mono text-zinc-400">({pages.length})</span>
      </button>

      <div className="h-10 w-px bg-zinc-800 shrink-0" />

      {/* Filmstrip Items */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1 custom-scrollbar">
        {pages.map((page, index) => {
          const isActive = index === activePageIndex;
          const meta = PRESET_META[page.mode] || PRESET_META.notes;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(index)}
              className={`group relative h-16 w-14 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-between p-0.5 bg-[#222226] shrink-0 ${
                isActive
                  ? 'border-[#1473E6] ring-2 ring-[#1473E6]/30 shadow-lg shadow-blue-500/20 bg-[#1c222d]'
                  : 'border-zinc-700/70 hover:border-zinc-500 hover:bg-[#27272a]'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden rounded bg-black/40">
                <img
                  src={page.thumbnailUrl || page.processedDataUrl || page.originalDataUrl}
                  alt={`Page ${index + 1}`}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />

                {/* Quick Page Number Pill Badge */}
                <div
                  className={`absolute top-0.5 left-0.5 font-mono text-[9px] font-bold px-1 py-0.2 rounded ${
                    isActive
                      ? 'bg-[#1473E6] text-white shadow'
                      : 'bg-black/70 text-zinc-300'
                  }`}
                >
                  {index + 1}
                </div>
              </div>

              {/* Preset mode label footer */}
              <div className="w-full text-center py-0.2">
                <span className="text-[8px] text-zinc-400 truncate block px-0.5">
                  {meta.label.split(' ')[0]}
                </span>
              </div>
            </div>
          );
        })}

        {/* Quick Add Page Card */}
        <button
          onClick={onAddPage}
          className="h-16 w-14 rounded-lg border-2 border-dashed border-zinc-700 hover:border-[#1473E6] hover:bg-[#1473E6]/10 text-zinc-400 hover:text-[#1473E6] transition-all flex flex-col items-center justify-center gap-0.5 shrink-0 group cursor-pointer"
          title="Add another page"
        >
          <div className="w-5 h-5 rounded-full bg-[#27272a] group-hover:bg-[#1473E6]/20 flex items-center justify-center transition-colors">
            <Plus className="w-3 h-3" />
          </div>
          <span className="text-[9px] font-semibold">Add</span>
        </button>
      </div>
    </div>
  );
};
