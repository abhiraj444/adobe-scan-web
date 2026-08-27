import React, { useState } from 'react';
import { 
  Upload, 
  Camera, 
  FileText, 
  Sparkles, 
  Palette, 
  Layers, 
  ShieldCheck, 
  Wand2, 
  Zap,
  BookOpen
} from 'lucide-react';

interface AdobeEmptyStateProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onCameraClick: () => void;
  onLoadSample: () => void;
}

export const AdobeEmptyState: React.FC<AdobeEmptyStateProps> = ({
  onFilesSelected,
  onCameraClick,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto overflow-y-auto custom-scrollbar select-none">
      {/* Primary Dropzone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-3xl border-2 border-dashed p-6 sm:p-10 text-center transition-all flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-[#1473E6] bg-[#1473E6]/10 scale-[1.01]'
            : 'border-zinc-800 hover:border-zinc-700 bg-[#18181b]/90 shadow-2xl'
        }`}
      >
        {/* Adobe Scan Branding Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1473E6] to-[#0284c7] flex items-center justify-center text-white shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10 mb-4">
          <FileText className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Adobe Scan & PDF Creator
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-md">
          Capture paper documents, multi-page PDFs, notes, receipts, and ID cards with instant background shadow removal & color enhancement.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 w-full max-w-sm">
          {/* Camera Scanner Button */}
          <button
            onClick={onCameraClick}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#1473E6] hover:bg-[#0d66d0] active:scale-95 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 border border-blue-400/30 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan with Camera</span>
          </button>

          {/* Upload PDF / Images Button */}
          <label className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#27272a] hover:bg-[#323238] active:scale-95 text-zinc-200 border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload PDF / Images</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
            />
          </label>
        </div>

        {/* Try Sample Document Button */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 w-full max-w-xs flex justify-center">
          <button
            onClick={onLoadSample}
            className="text-xs font-semibold text-[#1473E6] hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try with a Sample Document</span>
          </button>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 mt-6 text-center">
        <div className="p-3.5 rounded-2xl bg-[#18181b]/50 border border-zinc-800/80 flex flex-col items-center">
          <Wand2 className="w-4 h-4 text-purple-400 mb-1.5" />
          <div className="text-xs font-bold text-zinc-200">Magic Whitening</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Removes harsh shadows</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#18181b]/50 border border-zinc-800/80 flex flex-col items-center">
          <FileText className="w-4 h-4 text-blue-400 mb-1.5" />
          <div className="text-xs font-bold text-zinc-200">Multi-Page PDF</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Vectorized & clean</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#18181b]/50 border border-zinc-800/80 flex flex-col items-center">
          <Palette className="w-4 h-4 text-emerald-400 mb-1.5" />
          <div className="text-xs font-bold text-zinc-200">Filters & Retouch</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Stamp & ink punch</div>
        </div>
      </div>
    </div>
  );
};
