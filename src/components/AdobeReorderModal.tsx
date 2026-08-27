import React from 'react';
import { PageItem } from '../types';
import { 
  X, 
  Trash2, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  Upload,
  Camera,
  Copy,
  Plus
} from 'lucide-react';
import { PRESET_META } from '../lib/cv/presets';

interface AdobeReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageItem[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddUpload: () => void;
  onAddCamera: () => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onDuplicatePage?: (index: number) => void;
}

export const AdobeReorderModal: React.FC<AdobeReorderModalProps> = ({
  isOpen,
  onClose,
  pages,
  activePageIndex,
  onSelectPage,
  onAddUpload,
  onAddCamera,
  onDeletePage,
  onRotatePage,
  onMovePage,
  onDuplicatePage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-2xl bg-[#18181b] border-t sm:border border-[#27272a] rounded-t-2xl sm:rounded-2xl shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1473E6]/20 text-[#1473E6] flex items-center justify-center border border-[#1473E6]/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reorder & Manage Pages</h3>
              <p className="text-[11px] text-zinc-400">{pages.length} total pages in document</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pages Grid */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 overflow-y-auto custom-scrollbar flex-1 max-h-[65vh]">
          {pages.map((page, index) => {
            const isActive = index === activePageIndex;
            const meta = PRESET_META[page.mode] || PRESET_META.notes;

            return (
              <div
                key={page.id}
                onClick={() => {
                  onSelectPage(index);
                  onClose();
                }}
                className={`relative rounded-xl border-2 cursor-pointer transition-all flex flex-col p-2 bg-[#222226] ${
                  isActive
                    ? 'border-[#1473E6] ring-2 ring-[#1473E6]/30 shadow-lg shadow-blue-500/20 bg-[#1c222d]'
                    : 'border-zinc-700/80 hover:border-zinc-500 hover:bg-[#27272a]'
                }`}
              >
                {/* Header inside card */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      isActive ? 'bg-[#1473E6] text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Page {index + 1}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">
                    {meta.label}
                  </span>
                </div>

                {/* Thumbnail */}
                <div className="h-36 w-full rounded-lg bg-black/50 flex items-center justify-center overflow-hidden mb-2">
                  <img
                    src={page.thumbnailUrl || page.processedDataUrl || page.originalDataUrl}
                    alt={`Page ${index + 1}`}
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                </div>

                {/* Actions inside card */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-700/60">
                  {/* Move Left / Right */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index - 1);
                      }}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded hover:bg-zinc-800 cursor-pointer"
                      title="Move Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      disabled={index === pages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index + 1);
                      }}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded hover:bg-zinc-800 cursor-pointer"
                      title="Move Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Rotate / Duplicate / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(index);
                      }}
                      className="p-1 text-zinc-400 hover:text-indigo-400 rounded hover:bg-zinc-800 cursor-pointer"
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
                        className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 cursor-pointer"
                        title="Delete page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#121214] flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onAddCamera();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#1473E6]" />
            <span>Camera Snap</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onAddUpload();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#1473E6] hover:bg-[#0d66d0] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>
    </div>
  );
};
