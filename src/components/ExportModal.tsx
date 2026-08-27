import React, { useState } from 'react';
import { PageItem, ExportOptions } from '../types';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { 
  X, 
  Download, 
  FileText, 
  FileCheck, 
  Layers, 
  Sparkles, 
  Sliders,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';

interface ExportModalProps {
  pages: PageItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  pages,
  isOpen,
  onClose,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    pageSize: 'a4',
    orientation: 'portrait',
    dpi: 300,
    quality: 0.92,
    marginMm: 5,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      // Dimensions in mm for jsPDF
      const pageDimensions: Record<string, [number, number]> = {
        a4: [210, 297],
        a5: [148, 210],
        letter: [215.9, 279.4],
      };

      // Determine orientation
      const isLandscape = options.orientation === 'landscape';
      let doc: jsPDF;

      if (options.pageSize === 'original') {
        const firstPage = pages[0];
        const w = firstPage.processedCanvas?.width || 800;
        const h = firstPage.processedCanvas?.height || 1100;
        doc = new jsPDF({
          orientation: w > h ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [w, h],
        });
      } else {
        const baseDims = pageDimensions[options.pageSize] || pageDimensions.a4;
        const [pw, ph] = isLandscape ? [baseDims[1], baseDims[0]] : baseDims;
        doc = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pw, ph],
        });
      }

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
          doc.addPage();
        }

        const dataUrl = page.processedDataUrl || page.originalDataUrl;
        const canvas = page.processedCanvas;
        const imgW = canvas?.width || page.originalWidth || 800;
        const imgH = canvas?.height || page.originalHeight || 1100;

        if (options.pageSize === 'original') {
          doc.addImage(dataUrl, 'JPEG', 0, 0, imgW, imgH);
        } else {
          const pageWidthMm = doc.internal.pageSize.getWidth();
          const pageHeightMm = doc.internal.pageSize.getHeight();
          const margin = options.marginMm;

          const usableW = pageWidthMm - margin * 2;
          const usableH = pageHeightMm - margin * 2;

          const imgAspect = imgW / imgH;
          const usableAspect = usableW / usableH;

          let targetW: number;
          let targetH: number;

          if (imgAspect > usableAspect) {
            targetW = usableW;
            targetH = usableW / imgAspect;
          } else {
            targetH = usableH;
            targetW = usableH * imgAspect;
          }

          const posX = margin + (usableW - targetW) / 2;
          const posY = margin + (usableH - targetH) / 2;

          doc.addImage(dataUrl, 'JPEG', posX, posY, targetW, targetH);
        }

        setExportProgress(Math.round(((i + 1) / pages.length) * 90));
      }

      // Save PDF
      doc.save(`Cleaned_Document_${new Date().toISOString().slice(0, 10)}.pdf`);
      setExportProgress(100);

      // Confetti celebration!
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // ignore if blocked
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate PDF. Please try again.');
      setIsExporting(false);
    }
  };

  const handleDownloadAllImages = () => {
    pages.forEach((p, idx) => {
      const link = document.createElement('a');
      link.href = p.processedDataUrl || p.originalDataUrl;
      link.download = `DocClean_Page_${idx + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Export Cleaned Document</h3>
              <p className="text-xs text-slate-400">{pages.length} pages ready for print or digital export</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Format Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Target Output Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setOptions({ ...options, format: 'pdf' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  options.format === 'pdf'
                    ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-xs font-semibold">Multi-Page PDF</div>
                  <div className="text-[10px] text-slate-400">Print ready, vectorized layout</div>
                </div>
              </button>

              <button
                onClick={() => setOptions({ ...options, format: 'jpg' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  options.format === 'jpg'
                    ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold">High-Res JPGs</div>
                  <div className="text-[10px] text-slate-400">Download separate images</div>
                </div>
              </button>
            </div>
          </div>

          {/* Paper Size & Layout (for PDF) */}
          {options.format === 'pdf' && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                  Paper Standard
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'a4', label: 'A4' },
                    { id: 'letter', label: 'US Letter' },
                    { id: 'a5', label: 'A5' },
                    { id: 'original', label: 'Auto Fit' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setOptions({ ...options, pageSize: p.id as any })}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        options.pageSize === p.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Orientation */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Orientation
                  </label>
                  <select
                    value={options.orientation}
                    onChange={(e) => setOptions({ ...options, orientation: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Margins */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Page Margin
                  </label>
                  <select
                    value={options.marginMm}
                    onChange={(e) => setOptions({ ...options, marginMm: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value={0}>Borderless (0 mm)</option>
                    <option value={5}>Standard Print (5 mm)</option>
                    <option value={10}>Spacious (10 mm)</option>
                    <option value={15}>Binder Margin (15 mm)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Export Progress bar if running */}
          {isExporting && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>Compiling High-Res Document...</span>
                <span className="font-mono text-blue-400">{exportProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          {options.format === 'pdf' ? (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 border border-blue-400/30 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Building PDF...' : `Download PDF (${pages.length} Pages)`}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadAllImages}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2 border border-emerald-400/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download {pages.length} Images</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
