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
  SlidersHorizontal, 
  Layers, 
  Maximize, 
  Palette, 
  Eraser, 
  Feather, 
  Zap, 
  Sun, 
  Contrast, 
  ShieldCheck, 
  RotateCcw, 
  FileText, 
  FileSpreadsheet, 
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PresetMode, FilterSettings, ColorMode, PaperSize } from '../types';
import { PRESET_CONFIGS, PRESET_META } from '../lib/cv/presets';

export type EditTab = 'filters' | 'adjust' | 'resize';

interface AdobeEditInspectorProps {
  isOpen: boolean;
  activeTab: EditTab;
  onTabChange: (tab: EditTab) => void;
  onClose: () => void;
  
  // Page info
  pageIndex: number;
  totalPages: number;

  // Filters state
  currentMode: PresetMode;
  onSelectPreset: (mode: PresetMode) => void;

  // Adjust state
  settings: FilterSettings;
  onChangeSettings: (settings: FilterSettings) => void;

  // Resize state
  currentPaperSize: PaperSize;
  onSelectPaperSize: (size: PaperSize) => void;

  // Batch action
  onApplyToAllPages: (settings: FilterSettings, mode: PresetMode, paperSize?: PaperSize) => void;
}

export const AdobeEditInspector: React.FC<AdobeEditInspectorProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  pageIndex,
  totalPages,
  currentMode,
  onSelectPreset,
  settings,
  onChangeSettings,
  currentPaperSize,
  onSelectPaperSize,
  onApplyToAllPages,
}) => {
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setAppliedFeedback(msg);
    setTimeout(() => setAppliedFeedback(null), 2200);
  };

  const handleApplyAll = () => {
    const s = activeTab === 'filters' ? (PRESET_CONFIGS[currentMode] || settings) : settings;
    onApplyToAllPages(s, currentMode, currentPaperSize);
    showFeedback(`Applied to all ${totalPages} pages!`);
  };

  const handleResetAdjustments = () => {
    const defaultSettings = PRESET_CONFIGS[currentMode] || PRESET_CONFIGS.notes;
    onChangeSettings({
      ...defaultSettings,
      rotation: settings.rotation,
    });
  };

  const updateSetting = <K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

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

  const getFilterIcon = (mode: PresetMode) => {
    switch (mode) {
      case 'auto_color': return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'magic_color': return <Wand2 className="w-4 h-4 text-purple-400" />;
      case 'notes': return <PenTool className="w-4 h-4 text-amber-400" />;
      case 'photocopy': return <Printer className="w-4 h-4 text-zinc-300" />;
      case 'book': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'certificate': return <Award className="w-4 h-4 text-violet-400" />;
      case 'receipt': return <Receipt className="w-4 h-4 text-cyan-400" />;
      case 'color_doc': return <ImageIcon className="w-4 h-4 text-zinc-400" />;
      default: return <SlidersHorizontal className="w-4 h-4 text-indigo-400" />;
    }
  };

  const SIZES: Array<{ id: PaperSize; label: string; desc: string; icon: any }> = [
    { id: 'original', label: 'Auto Fit', desc: 'Preserve natural captured document bounds', icon: Maximize },
    { id: 'a4', label: 'A4 Standard', desc: '210 × 297 mm (International Standard)', icon: FileText },
    { id: 'letter', label: 'US Letter', desc: '8.5 × 11 in (North America Standard)', icon: FileText },
    { id: 'a5', label: 'A5 Notebook', desc: '148 × 210 mm (Half of A4)', icon: FileText },
    { id: 'legal', label: 'US Legal', desc: '8.5 × 14 in (Contracts & Certificates)', icon: FileSpreadsheet },
    { id: 'id_card', label: 'ID Card / Passport', desc: '85.6 × 53.98 mm (Standard Badges)', icon: CreditCard },
    { id: 'business_card', label: 'Business Card', desc: '3.5 × 2 in (Visiting Cards)', icon: CreditCard },
  ];

  return (
    <aside 
      className={`
        bg-[#161619] border-[#27272a] text-zinc-100 flex flex-col z-30 select-none shadow-2xl transition-all duration-200
        /* Desktop: docked right sidebar alongside the document */
        md:w-84 lg:w-96 md:h-full md:border-l md:border-t-0 md:rounded-none md:shrink-0
        /* Mobile: docked bottom sheet below the document */
        max-md:w-full max-md:border-t max-md:rounded-t-2xl max-md:shrink-0 max-md:safe-bottom
        ${isMobileCollapsed ? 'max-md:h-12' : 'max-md:h-[50vh] max-md:max-h-[52vh]'}
      `}
      aria-label="Document Edit Inspector"
    >
      {/* Mobile drag handle & collapse toggle */}
      <div 
        className="w-full flex items-center justify-center pt-2 pb-1 cursor-pointer md:hidden hover:bg-zinc-800/40"
        onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
      >
        <div className="w-10 h-1 bg-zinc-600 rounded-full" />
      </div>

      {/* Header with Navigation Tabs & Actions */}
      <div className="px-4 py-2.5 border-b border-[#27272a] flex items-center justify-between gap-2 shrink-0 bg-[#141417]">
        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1 bg-[#202024] p-1 rounded-xl border border-zinc-700/60 flex-1 max-w-[280px]">
          <button
            onClick={() => {
              setIsMobileCollapsed(false);
              onTabChange('filters');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'filters'
                ? 'bg-[#1473E6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40'
            }`}
            title="Filter Presets"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => {
              setIsMobileCollapsed(false);
              onTabChange('adjust');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'adjust'
                ? 'bg-[#1473E6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40'
            }`}
            title="Image Adjustments"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Adjust</span>
          </button>

          <button
            onClick={() => {
              setIsMobileCollapsed(false);
              onTabChange('resize');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'resize'
                ? 'bg-[#1473E6] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40'
            }`}
            title="Paper Size Standard"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span>Resize</span>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {activeTab === 'adjust' && !isMobileCollapsed && (
            <button
              onClick={handleResetAdjustments}
              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="Reset sliders to preset defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Reset</span>
            </button>
          )}

          {/* Mobile Collapse Chevron */}
          <button
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer md:hidden"
            title={isMobileCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isMobileCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Close / Done Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close Settings (Done)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Hidden if collapsed on mobile) */}
      {!isMobileCollapsed && (
        <>
          {/* TAB 1: FILTERS */}
          {activeTab === 'filters' && (
            <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar space-y-2">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Document Presets
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Live Preview
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {FILTER_OPTIONS.map((mode) => {
                  const meta = PRESET_META[mode];
                  const isSelected = currentMode === mode;

                  return (
                    <button
                      key={mode}
                      onClick={() => onSelectPreset(mode)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1473E6]/20 border-[#1473E6] ring-1 ring-[#1473E6]/60 shadow-md text-white'
                          : 'bg-[#1e1e23] border-zinc-800 hover:border-zinc-600 hover:bg-[#25252b] text-zinc-300'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-[#141418] border border-zinc-700/60 shrink-0 mt-0.5">
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
            </div>
          )}

          {/* TAB 2: ADJUST */}
          {activeTab === 'adjust' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Color Mode Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
                  <Palette className="w-3.5 h-3.5 text-[#1473E6]" />
                  <span>Color Output Mode</span>
                </label>
                <div className="grid grid-cols-4 gap-1 bg-[#1e1e23] p-1 rounded-xl border border-zinc-800">
                  {(
                    [
                      { id: 'color', label: 'Color' },
                      { id: 'vibrant_color', label: 'Vibrant' },
                      { id: 'grayscale', label: 'Grayscale' },
                      { id: 'binary', label: 'Photocopy' },
                    ] as { id: ColorMode; label: string }[]
                  ).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => updateSetting('colorMode', c.id)}
                      className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        settings.colorMode === c.id
                          ? 'bg-[#1473E6] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Container */}
              <div className="space-y-3.5 pt-2 border-t border-zinc-800/80">
                {/* Background Whitening */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <Eraser className="w-3.5 h-3.5 text-sky-400" />
                      Whitening & Shadow Removal
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.backgroundWhitening}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.backgroundWhitening}
                    onChange={(e) => updateSetting('backgroundWhitening', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Ink Deepening */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <Feather className="w-3.5 h-3.5 text-blue-400" />
                      Ink Deepening & Text Punch
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.inkEnhancement}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.inkEnhancement}
                    onChange={(e) => updateSetting('inkEnhancement', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Sharpness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Text Sharpness & Edge Clarity
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.sharpness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.sharpness}
                    onChange={(e) => updateSetting('sharpness', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Exposure & Brightness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <Sun className="w-3.5 h-3.5 text-yellow-400" />
                      Exposure & Brightness
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="160"
                    value={settings.brightness}
                    onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Dynamic Contrast */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <Contrast className="w-3.5 h-3.5 text-purple-400" />
                      Dynamic Contrast
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.contrast}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={settings.contrast}
                    onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Noise Reduction */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Noise Reduction & Despeckle
                    </span>
                    <span className="font-mono text-zinc-300 font-bold bg-[#202024] px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/80">
                      {settings.noiseReduction}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.noiseReduction}
                    onChange={(e) => updateSetting('noiseReduction', Number(e.target.value))}
                    className="w-full accent-[#1473E6] bg-[#222228] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Sauvola Binarization Sensitivity & Weight */}
                {settings.colorMode === 'binary' && (
                  <div className="space-y-3 p-3 rounded-xl bg-[#1e1e23] border border-zinc-800">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">B&W Text Weight (Density)</span>
                        <span className="font-mono text-[#1473E6] font-bold text-xs">
                          {settings.threshold}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="180"
                        value={settings.threshold}
                        onChange={(e) => updateSetting('threshold', Number(e.target.value))}
                        className="w-full accent-[#1473E6] bg-[#161619] h-2 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">Local Detail Sensitivity</span>
                        <span className="font-mono text-[#1473E6] font-bold text-xs">
                          {settings.sauvolaSensitivity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={settings.sauvolaSensitivity}
                        onChange={(e) => updateSetting('sauvolaSensitivity', Number(e.target.value))}
                        className="w-full accent-[#1473E6] bg-[#161619] h-2 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESIZE */}
          {activeTab === 'resize' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Paper Formats
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Export Standard
                </span>
              </div>

              {SIZES.map((s) => {
                const Icon = s.icon;
                const isSelected = currentPaperSize === s.id;

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectPaperSize(s.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1473E6]/20 border-[#1473E6] ring-1 ring-[#1473E6]/60 shadow-md text-white'
                        : 'bg-[#1e1e23] border-zinc-800 hover:border-zinc-600 hover:bg-[#25252b] text-zinc-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-[#141418] border border-zinc-700/60 shrink-0 text-zinc-300">
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{s.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#1473E6]" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-3 border-t border-[#27272a] bg-[#141417] flex flex-col gap-2 shrink-0">
            {totalPages > 1 && (
              <button
                onClick={handleApplyAll}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  appliedFeedback
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-[#202024] hover:bg-[#28282e] text-zinc-200 border-zinc-700/80'
                }`}
              >
                {appliedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{appliedFeedback}</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-[#1473E6]" />
                    <span>Apply Setting to All Pages ({totalPages})</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-[#1473E6] hover:bg-[#0d66d0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all text-center cursor-pointer"
            >
              Done Editing
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
