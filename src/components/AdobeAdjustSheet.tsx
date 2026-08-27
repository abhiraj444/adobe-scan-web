import React, { useState } from 'react';
import { 
  FilterSettings, 
  PresetMode, 
  ColorMode 
} from '../types';
import { PRESET_CONFIGS } from '../lib/cv/presets';
import { 
  X, 
  Check, 
  SlidersHorizontal, 
  Eraser, 
  Feather, 
  Zap, 
  Sun, 
  Contrast, 
  ShieldCheck, 
  RotateCcw, 
  Layers,
  Palette
} from 'lucide-react';

interface AdobeAdjustSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FilterSettings;
  mode: PresetMode;
  pageIndex: number;
  totalPages: number;
  onChangeSettings: (newSettings: FilterSettings) => void;
  onApplyToAllPages: (settings: FilterSettings, mode: PresetMode) => void;
}

export const AdobeAdjustSheet: React.FC<AdobeAdjustSheetProps> = ({
  isOpen,
  onClose,
  settings,
  mode,
  pageIndex,
  totalPages,
  onChangeSettings,
  onApplyToAllPages,
}) => {
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleApplyAll = () => {
    onApplyToAllPages(settings, mode);
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  const handleResetCurrent = () => {
    const defaultSettings = PRESET_CONFIGS[mode] || PRESET_CONFIGS.notes;
    onChangeSettings({
      ...defaultSettings,
      rotation: settings.rotation,
    });
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
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adjust Document Image</h3>
              <p className="text-[11px] text-zinc-400">Page {pageIndex + 1} of {totalPages}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCurrent}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset to preset defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Sliders */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Color Mode Format Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-[#1473E6]" />
              <span>Color Output Mode</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-[#222226] p-1 rounded-xl border border-zinc-700/80">
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
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

          {/* Granular Sliders */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            {/* Background Whitening */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Eraser className="w-3.5 h-3.5 text-sky-400" />
                  Background Whitening & Shadow Removal
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.backgroundWhitening}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backgroundWhitening}
                onChange={(e) => updateSetting('backgroundWhitening', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Ink Deepening */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Feather className="w-3.5 h-3.5 text-blue-400" />
                  Ink Deepening & Text Punch
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.inkEnhancement}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.inkEnhancement}
                onChange={(e) => updateSetting('inkEnhancement', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Text Sharpness & Edge Clarity
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.sharpness}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sharpness}
                onChange={(e) => updateSetting('sharpness', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  Exposure & Brightness
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.brightness}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="160"
                value={settings.brightness}
                onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Dynamic Contrast */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Contrast className="w-3.5 h-3.5 text-purple-400" />
                  Dynamic Contrast
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.contrast}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                value={settings.contrast}
                onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Noise Reduction / Despeckle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Noise Reduction & Despeckle
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-[#27272a] px-2 py-0.5 rounded text-xs border border-zinc-700">
                  {settings.noiseReduction}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.noiseReduction}
                onChange={(e) => updateSetting('noiseReduction', Number(e.target.value))}
                className="w-full accent-[#1473E6] bg-[#27272a] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sauvola Sensitivity */}
            {settings.colorMode === 'binary' && (
              <div className="space-y-1.5 p-3 rounded-xl bg-[#222226] border border-zinc-700/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-200">
                    Sauvola Binarization Sensitivity
                  </span>
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
                  className="w-full accent-[#1473E6] bg-[#18181b] h-2 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#121214] flex flex-col gap-2">
          {totalPages > 1 && (
            <button
              onClick={handleApplyAll}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                appliedFeedback
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-[#27272a] hover:bg-[#323238] text-zinc-200 border-zinc-700'
              }`}
            >
              {appliedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Applied to All {totalPages} Pages!</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-[#1473E6]" />
                  <span>Apply Adjustments to All Pages ({totalPages})</span>
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
