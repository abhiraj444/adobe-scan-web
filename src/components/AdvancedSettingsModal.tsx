import React, { useState } from 'react';
import { 
  FilterSettings, 
  PresetMode, 
  ColorMode 
} from '../types';
import { 
  PRESET_CONFIGS, 
  PRESET_META 
} from '../lib/cv/presets';
import { 
  X, 
  Check, 
  Sliders, 
  Eraser, 
  Feather, 
  Zap, 
  Sun, 
  Contrast, 
  ShieldCheck, 
  RotateCcw, 
  Layers,
  Palette,
  Sparkles
} from 'lucide-react';

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FilterSettings;
  mode: PresetMode;
  pageIndex: number;
  totalPages: number;
  onChangeSettings: (newSettings: FilterSettings) => void;
  onChangeMode: (newMode: PresetMode) => void;
  onApplyToAllPages: (settings: FilterSettings, mode: PresetMode) => void;
}

export const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  mode,
  pageIndex,
  totalPages,
  onChangeSettings,
  onChangeMode,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Container */}
      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl text-slate-100 max-h-[85vh] flex flex-col z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Fine-Tune Adjustments</h3>
              <p className="text-[11px] text-slate-400">Page {pageIndex + 1} of {totalPages}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCurrent}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 transition-colors"
              title="Reset to preset defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Sliders Content */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Color & Render Output Mode */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Output Color Format</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
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
                  className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                    settings.colorMode === c.id
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* Background Whitening & Shadow Removal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Eraser className="w-3.5 h-3.5 text-sky-400" />
                  Background Whitening & Shadow Removal
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.backgroundWhitening}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backgroundWhitening}
                onChange={(e) => updateSetting('backgroundWhitening', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Ink Deepening & Punch */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Feather className="w-3.5 h-3.5 text-blue-400" />
                  Ink Deepening & Text Punch
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.inkEnhancement}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.inkEnhancement}
                onChange={(e) => updateSetting('inkEnhancement', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Edge Sharpness & Clarity
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.sharpness}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sharpness}
                onChange={(e) => updateSetting('sharpness', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Exposure / Brightness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  Brightness & Exposure
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.brightness}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="160"
                value={settings.brightness}
                onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Dynamic Contrast */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Contrast className="w-3.5 h-3.5 text-purple-400" />
                  Dynamic Contrast
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.contrast}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                value={settings.contrast}
                onChange={(e) => updateSetting('contrast', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Despeckle & Grain Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Noise Reduction & Despeckle
                </span>
                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                  {settings.noiseReduction}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.noiseReduction}
                onChange={(e) => updateSetting('noiseReduction', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Sauvola Sensitivity for Photocopy B&W */}
            {settings.colorMode === 'binary' && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">
                    Sauvola Binarization Sensitivity
                  </span>
                  <span className="font-mono text-blue-400 font-bold text-xs">
                    {settings.sauvolaSensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={settings.sauvolaSensitivity}
                  onChange={(e) => updateSetting('sauvolaSensitivity', Number(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-900 h-2 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-2.5">
          {totalPages > 1 && (
            <button
              onClick={handleApplyAll}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                appliedFeedback
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              {appliedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Applied to All {totalPages} Pages!</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Apply Settings to All Pages ({totalPages})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
