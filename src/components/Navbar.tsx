import React from 'react';
import { 
  FileText, 
  Upload, 
  Camera, 
  Download, 
  RotateCcw
} from 'lucide-react';

interface NavbarProps {
  pageCount: number;
  currentPageIndex?: number;
  onUploadClick: () => void;
  onCameraClick: () => void;
  onExportClick: () => void;
  onResetClick: () => void;
  hasPages: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageCount,
  onUploadClick,
  onCameraClick,
  onExportClick,
  onResetClick,
  hasPages,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none shadow-md shrink-0">
      {/* Left Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">DocClean</h1>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 hidden xs:inline-block">
              Scanner
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Camera button */}
        <button
          onClick={onCameraClick}
          className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors flex items-center gap-1.5"
          title="Snap photo with camera"
        >
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Camera</span>
        </button>

        {/* Upload button */}
        <button
          onClick={onUploadClick}
          className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors flex items-center gap-1.5"
          title="Upload PDF or Images"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {hasPages && (
          <>
            <div className="h-5 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={onResetClick}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center justify-center"
              title="Clear all pages"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Export PDF Button */}
            <button
              onClick={onExportClick}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 border border-blue-400/30 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-700/80 text-[10px] font-mono font-bold">
                {pageCount}
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
