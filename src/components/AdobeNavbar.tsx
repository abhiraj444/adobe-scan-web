import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Camera, 
  Download, 
  RotateCcw,
  Edit2,
  Check,
  Sparkles,
  Undo2,
  Redo2
} from 'lucide-react';

interface AdobeNavbarProps {
  documentTitle: string;
  onRenameTitle: (newTitle: string) => void;
  pageCount: number;
  currentPageIndex: number;
  hasPages: boolean;
  onUploadClick: () => void;
  onCameraClick: () => void;
  onExportClick: () => void;
  onResetClick: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const AdobeNavbar: React.FC<AdobeNavbarProps> = ({
  documentTitle,
  onRenameTitle,
  pageCount,
  currentPageIndex,
  hasPages,
  onUploadClick,
  onCameraClick,
  onExportClick,
  onResetClick,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onRenameTitle(tempTitle.trim());
    } else {
      setTempTitle(documentTitle);
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTempTitle(documentTitle);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-14 bg-[#18181b] border-b border-[#27272a] text-zinc-100 px-3 sm:px-5 flex items-center justify-between sticky top-0 z-40 select-none shadow-md shrink-0">
      {/* Left: Adobe Scan Branding & Editable Document Name */}
      <div className="flex items-center gap-3 max-w-[55%] sm:max-w-[45%]">
        {/* Adobe Scan Red/Blue Icon Badge */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1473E6] via-[#0d66d0] to-[#02499e] flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 ring-1 ring-blue-400/30">
          <FileText className="w-4 h-4 text-white" />
        </div>

        {/* Title / Renaming */}
        <div className="flex flex-col min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
                className="bg-[#27272a] text-white text-xs font-semibold px-2 py-0.5 rounded border border-[#1473E6] outline-none w-44 sm:w-60"
              />
              <button
                onClick={handleTitleSubmit}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setTempTitle(documentTitle);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group"
              title="Click to rename document"
            >
              <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                {documentTitle}
              </span>
              <Edit2 className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}

          {hasPages && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="font-medium">Adobe Scan</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span className="font-mono text-blue-400 font-semibold">
                Page {currentPageIndex + 1} of {pageCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Undo/Redo buttons on larger screens */}
      {hasPages && (
        <div className="hidden md:flex items-center gap-1 bg-[#27272a]/60 px-1.5 py-1 rounded-lg border border-zinc-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right: Quick Ingestion & Adobe Scan Primary Action */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Camera Snap */}
        <button
          onClick={onCameraClick}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          title="Camera Document Scanner"
        >
          <Camera className="w-3.5 h-3.5 text-[#1473E6]" />
          <span className="hidden sm:inline">Camera</span>
        </button>

        {/* Upload Files */}
        <button
          onClick={onUploadClick}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#27272a] hover:bg-[#323238] text-zinc-200 border border-zinc-700/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          title="Upload PDF or Photos"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {hasPages && (
          <>
            <div className="h-4 w-px bg-zinc-800 mx-0.5" />

            <button
              onClick={onResetClick}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-[#27272a] rounded-lg transition-colors hidden sm:flex items-center justify-center cursor-pointer"
              title="Clear all pages"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Signature Adobe Blue Save PDF Button */}
            <button
              onClick={onExportClick}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#1473E6] hover:bg-[#0d66d0] text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 active:scale-95 border border-blue-400/40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-900/80 text-[10px] font-mono font-bold text-blue-200 ml-0.5">
                {pageCount}
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
