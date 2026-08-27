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
  Sliders, 
  Sparkles, 
  RotateCw, 
  Layers, 
  Sun, 
  Contrast, 
  Feather, 
  Eraser, 
  ShieldCheck, 
  Zap, 
  Check, 
  RotateCcw,
  Palette,
  Image as ImageIcon
} from 'lucide-react';

interface ControlSlidersProps {
  settings: FilterSettings;
  mode: PresetMode;
  pageIndex: number;
  totalPages: number;
  onChangeSettings: (newSettings: FilterSettings) => void;
  onChangeMode: (newMode: PresetMode) => void;
  onApplyToAllPages: (settings: FilterSettings, mode: PresetMode) => void;
  onRotatePage: () => void;
}

export const ControlSliders: React.FC<ControlSlidersProps> = ({
  settings,
  mode,
  pageIndex,
  totalPages,
  onChangeSettings,
  onChangeMode,
  onApplyToAllPages,
  onRotatePage,
}) => {
  const [appliedAllFeedback, setAppliedAllFeedback] = useState(false);

  const updateSetting = <K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSelectPreset = (newMode: PresetMode) => {
    onChangeMode(newMode);
    if (newMode !== 'custom') {
      const presetSettings = PRESET_CONFIGS[newMode];
      onChangeSettings({
        ...presetSettings,
        rotation: settings.rotation, // preserve rotation
      });
    }
  };

  const handleApplyAll = () => {
    onApplyToAllPages(settings, mode);
    setAppliedAllFeedback(true);
    setTimeout(() => setAppliedAllFeedback(false), 2200);
  };

  const handleResetCurrent = () => {
    const defaultSettings = PRESET_CONFIGS[mode];
    onChangeSettings({
      ...defaultSettings,
      rotation: settings.rotation,
    });
  };

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-800 text-slate-200 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Header Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Scanner Engine Tuning</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Page {pageIndex + 1} of {totalPages}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Adjust lighting, ink depth, and algorithms for this page or batch apply.
        </p>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* 1. Preset Modes Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Document Mode Presets
            </label>
            <span className="text-[11px] font-medium text-blue-400">
              {PRESET_META[mode].label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESET_CONFIGS) as PresetMode[]).map((mKey) => {
              const meta = PRESET_META[mKey];
              const isSelected = mode === mKey;
              return (
                <button
                  key={mKey}
                  onClick={() => handleSelectPreset(mKey)}
                  className={`p-2.5 rounded-xl text-left border transition-all relative ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                      : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{meta.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Color & Rendering Output Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Color & Output Format</span>
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
                className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
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

        {/* 3. Granular Sliders Section */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quality & Enhancement Sliders
            </label>
            <button
              onClick={handleResetCurrent}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              title="Reset sliders to preset defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Page</span>
            </button>
          </div>

          {/* Slider 1: Background Whitening & Shadow Removal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Eraser className="w-3.5 h-3.5 text-sky-400" />
                Background Whitening & Shadow Removal
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.backgroundWhitening}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.backgroundWhitening}
              onChange={(e) => updateSetting('backgroundWhitening', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Retain Original</span>
              <span>Balanced</span>
              <span>Max Paper Whiten</span>
            </div>
          </div>

          {/* Slider 2: Ink Deepening & Black Level */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Feather className="w-3.5 h-3.5 text-blue-400" />
                Ink Deepening & Text Punch
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.inkEnhancement}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.inkEnhancement}
              onChange={(e) => updateSetting('inkEnhancement', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Natural</span>
              <span>Deep Inks</span>
              <span>Max Contrast Ink</span>
            </div>
          </div>

          {/* Slider 3: Text Edge Sharpness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Edge Sharpness & Clarity (Unsharp)
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.sharpness}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sharpness}
              onChange={(e) => updateSetting('sharpness', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 4: Brightness / Exposure */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                Exposure & Brightness
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.brightness}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="160"
              value={settings.brightness}
              onChange={(e) => updateSetting('brightness', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 5: Contrast */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Contrast className="w-3.5 h-3.5 text-purple-400" />
                Dynamic Contrast
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.contrast}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={settings.contrast}
              onChange={(e) => updateSetting('contrast', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 6: Noise Reduction / Despeckle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Despeckle & Grain Filter
              </span>
              <span className="font-mono text-slate-400 font-semibold text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                {settings.noiseReduction}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.noiseReduction}
              onChange={(e) => updateSetting('noiseReduction', Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Conditional Slider 7: Sauvola Sensitivity for Photocopy B&W */}
          {settings.colorMode === 'binary' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">
                  Sauvola Binarization Sensitivity
                </span>
                <span className="font-mono text-blue-400 font-semibold text-[11px]">
                  {settings.sauvolaSensitivity}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={settings.sauvolaSensitivity}
                onChange={(e) => updateSetting('sauvolaSensitivity', Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Higher values capture thin faint pen lines; lower values eliminate faint background speckles.
              </p>
            </div>
          )}

          {/* Quick Page Rotation */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs font-medium text-slate-300">Page Orientation</span>
            <button
              onClick={onRotatePage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Rotate 90° ({settings.rotation}°)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Batch & Apply Actions Sticky Bottom Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur space-y-2 sticky bottom-0 z-10">
        <button
          onClick={handleApplyAll}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
            appliedAllFeedback
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/30 shadow-md shadow-blue-500/20'
          }`}
        >
          {appliedAllFeedback ? (
            <>
              <Check className="w-4 h-4" />
              <span>Applied to All {totalPages} Pages!</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4" />
              <span>Apply These Settings to All Pages ({totalPages})</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-500 text-center">
          Propagates current preset, color mode, and sliders across entire document queue.
        </p>
      </div>
    </div>
  );
};
