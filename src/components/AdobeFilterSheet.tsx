import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Wand2, 
  PenTool, 
  BookOpen, 
  Award, 
  Printer, 
  Receipt, 
  Image as ImageIcon, 
  Sliders,
  Layers
} from 'lucide-react';
import { PresetMode, FilterSettings } from '../types';
import { PRESET_CONFIGS, PRESET_META } from '../lib/cv/presets';

interface AdobeFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: PresetMode;
  onSelectPreset: (mode: PresetMode) => void;
  onApplyToAllPages: (settings: FilterSettings, mode: PresetMode) => void;
  currentSettings: FilterSettings;
  pageIndex: number;
  totalPages: number;
}

export const AdobeFilterSheet: React.FC<AdobeFilterSheetProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectPreset,
  onApplyToAllPages,
  currentSettings,
  pageIndex,
  totalPages,
}) => {
  const [appliedAll, setAppliedAll] = useState(false);

  if (!isOpen) return null;

  const FILTER_OPTIONS: PresetMode[] = [
    'auto_color',
    'magic_color',
    'notes',
    'photocopy',
    'book',
    'certificate',
    'receipt',
    'color_doc',
  ];

  const handleApplyAll = () => {
    const s = PRESET_CONFIGS[currentMode] || currentSettings;
    onApplyToAllPages(s, currentMode);
    setAppliedAll(true);
    setTimeout(() => setAppliedAll(false), 2000);
  };

  const getFilterIcon = (mode: PresetMode) => {
    switch (mode) {
      case 'auto_color': return <Sparkles className="w-5 h-5 text-blue-400" />;
      case 'magic_color': return <Wand2 className="w-5 h-5 text-purple-400" />;
      case 'notes': return <PenTool className="w-5 h-5 text-amber-400" />;
      case 'photocopy': return <Printer className="w-5 h-5 text-zinc-300" />;
      case 'book': return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'certificate': return <Award className="w-5 h-5 text-violet-400" />;
      case 'receipt': return <Receipt className="w-5 h-5 text-cyan-400" />;
      case 'color_doc': return <ImageIcon className="w-5 h-5 text-zinc-400" />;
      default: return <Sliders className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-[#18181b] border-t sm:border border-[#27272a] rounded-t-2xl sm:rounded-2xl shadow-2xl text-zinc-100 max-h-[85vh] flex flex-col z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1473E6]/20 text-[#1473E6] flex items-center justify-center border border-[#1473E6]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adobe Filters</h3>
              <p className="text-[11px] text-zinc-400">Page {pageIndex + 1} of {totalPages}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Grid */}
        <div className="p-4 grid grid-cols-2 gap-2.5 overflow-y-auto custom-scrollbar flex-1 max-h-[55vh]">
          {FILTER_OPTIONS.map((mode) => {
            const meta = PRESET_META[mode];
            const isSelected = currentMode === mode;

            return (
              <button
                key={mode}
                onClick={() => onSelectPreset(mode)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1473E6]/15 border-[#1473E6] ring-1 ring-[#1473E6]/50 shadow-md text-white'
                    : 'bg-[#222226] border-zinc-700/60 hover:bg-[#27272a] text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#18181b] border border-zinc-700/80 shrink-0">
                  {getFilterIcon(mode)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{meta.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1473E6] shrink-0" />}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 leading-tight">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#121214] flex flex-col gap-2">
          {totalPages > 1 && (
            <button
              onClick={handleApplyAll}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                appliedAll
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-[#27272a] hover:bg-[#323238] text-zinc-200 border-zinc-700'
              }`}
            >
              {appliedAll ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Applied to all {totalPages} pages!</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-[#1473E6]" />
                  <span>Apply Filter to All Pages ({totalPages})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1473E6] hover:bg-[#0d66d0] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all text-center cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
