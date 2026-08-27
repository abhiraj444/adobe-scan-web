import React, { useState } from 'react';
import { 
  Upload, 
  Camera, 
  FileText, 
  Layers, 
  Sparkles, 
  Palette, 
  Sun, 
  Sliders
} from 'lucide-react';

interface DropzoneEmptyStateProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onCameraClick: () => void;
}

export const DropzoneEmptyState: React.FC<DropzoneEmptyStateProps> = ({
  onFilesSelected,
  onCameraClick,
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
      {/* Primary Upload Dropzone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-3xl border-2 border-dashed p-6 sm:p-10 text-center transition-all flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-blue-500 bg-blue-600/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/70 shadow-2xl'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10 mb-4">
          <Upload className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Upload Documents or Photos
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
          Select <strong className="text-slate-300">PDF files</strong> or <strong className="text-slate-300">Images (JPG, PNG)</strong>. PDF multi-pages are loaded automatically with instant color and shadow cleanup.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 w-full max-w-sm">
          <label className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-500/25 cursor-pointer transition-all flex items-center justify-center gap-2 border border-blue-400/30">
            <Upload className="w-4 h-4" />
            <span>Select PDF / Images</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
            />
          </label>

          <button
            onClick={onCameraClick}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <span>Take Photo</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 mt-6 text-center">
        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex flex-col items-center">
          <FileText className="w-4 h-4 text-indigo-400 mb-1.5" />
          <div className="text-xs font-semibold text-slate-200">PDF Multi-Page</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Quick batch import</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex flex-col items-center">
          <Sparkles className="w-4 h-4 text-amber-400 mb-1.5" />
          <div className="text-xs font-semibold text-slate-200">Magic Whitening</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Removes yellow cast</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex flex-col items-center">
          <Palette className="w-4 h-4 text-emerald-400 mb-1.5" />
          <div className="text-xs font-semibold text-slate-200">Colour Editing</div>
          <div className="text-[10px] text-slate-500 mt-0.5">B&W, Notes, Seals</div>
        </div>
      </div>
    </div>
  );
};
