import React from 'react';
import { PageItem } from '../types';
import { 
  Plus, 
  Trash2, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  FileCheck,
  Upload
} from 'lucide-react';
import { PRESET_META } from '../lib/cv/presets';

interface BatchTrayProps {
  pages: PageItem[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export const BatchTray: React.FC<BatchTrayProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onRotatePage,
  onMovePage,
}) => {
  return (
    <div className="h-28 bg-slate-900/95 border-t border-slate-800 text-white px-4 py-2 flex items-center gap-3 overflow-x-auto custom-scrollbar select-none z-20 shadow-lg">
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pages ({pages.length})
        </span>
      </div>

      <div className="flex items-center gap-3 flex-1 overflow-x-auto py-1">
        {pages.map((page, index) => {
          const isActive = index === activePageIndex;
          const meta = PRESET_META[page.mode];

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(index)}
              className={`group relative h-22 w-20 sm:w-24 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-between p-1 bg-slate-800/80 shrink-0 ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20 bg-slate-850'
                  : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              {/* Top Bar inside Card */}
              <div className="w-full flex items-center justify-between px-1 text-[10px]">
                <span
                  className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {index + 1}
                </span>

                {/* Mode Tag */}
                <span className="text-[9px] text-slate-400 truncate max-w-[45px]">
                  {meta.label.split(' ')[0]}
                </span>
              </div>

              {/* Thumbnail Image */}
              <div className="relative flex-1 w-full flex items-center justify-center my-0.5 overflow-hidden rounded bg-slate-950">
                <img
                  src={page.thumbnailUrl || page.processedDataUrl || page.originalDataUrl}
                  alt={`Page ${index + 1}`}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />

                {/* Hover Quick Actions */}
                <div className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-around px-1">
                  {index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index - 1);
                      }}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Move left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(index);
                    }}
                    className="p-1 text-slate-300 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(index);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Delete page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {index < pages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index + 1);
                      }}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Move right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Page Button */}
        <button
          onClick={onAddPage}
          className="h-22 w-20 sm:w-24 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-600/10 text-slate-400 hover:text-blue-400 transition-all flex flex-col items-center justify-center gap-1 shrink-0 group cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-slate-800 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-semibold">Add Page</span>
        </button>
      </div>
    </div>
  );
};
