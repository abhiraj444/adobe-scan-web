import React, { useState } from 'react';
import { PageItem, ExportOptions, PaperSize } from '../types';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { 
  X, 
  Download, 
  FileText, 
  FileCheck, 
  Layers, 
  Sparkles, 
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  Copy,
  Printer
} from 'lucide-react';

interface AdobeExportModalProps {
  pages: PageItem[];
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
}

export const AdobeExportModal: React.FC<AdobeExportModalProps> = ({
  pages,
  isOpen,
  onClose,
  documentTitle,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    pageSize: 'a4',
    orientation: 'portrait',
    dpi: 300,
    quality: 0.92,
    marginMm: 5,
    fileName: documentTitle || 'Adobe_Scan_Document',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      const pageDimensions: Record<string, [number, number]> = {
        a4: [210, 297],
        a5: [148, 210],
        letter: [215.9, 279.4],
        legal: [215.9, 355.6],
        id_card: [85.6, 53.98],
        business_card: [88.9, 50.8],
      };

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

      // Clean file name
      const safeTitle = (documentTitle || 'Adobe_Scan_Document')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .trim();
      doc.save(`${safeTitle}.pdf`);
      setExportProgress(100);

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
        });
      } catch (e) {
        // ignore
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
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
      link.download = `${documentTitle || 'Adobe_Scan'}_Page_${idx + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle || 'Adobe Scan Print'}</title>
          <style>
            body { margin: 0; padding: 0; background: #fff; }
            .page { page-break-after: always; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (p) =>
                `<div class="page"><img src="${p.processedDataUrl || p.originalDataUrl}" /></div>`
            )
            .join('')}
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-zinc-100 animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1473E6]/20 border border-[#1473E6]/30 flex items-center justify-center text-[#1473E6]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Save Adobe Scan PDF</h3>
              <p className="text-xs text-zinc-400">{pages.length} clean pages ready for export</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Format Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Format Selection
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setOptions({ ...options, format: 'pdf' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  options.format === 'pdf'
                    ? 'bg-[#1473E6]/15 border-[#1473E6] text-white ring-1 ring-[#1473E6]/50'
                    : 'bg-[#222226] border-zinc-700/60 text-zinc-300 hover:bg-[#27272a]'
                }`}
              >
                <FileText className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-xs font-bold">Multi-Page PDF</div>
                  <div className="text-[10px] text-zinc-400">High-resolution vectorized PDF</div>
                </div>
              </button>

              <button
                onClick={() => setOptions({ ...options, format: 'jpg' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  options.format === 'jpg'
                    ? 'bg-[#1473E6]/15 border-[#1473E6] text-white ring-1 ring-[#1473E6]/50'
                    : 'bg-[#222226] border-zinc-700/60 text-zinc-300 hover:bg-[#27272a]'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold">Separate JPGs</div>
                  <div className="text-[10px] text-zinc-400">Individual image files</div>
                </div>
              </button>
            </div>
          </div>

          {/* Paper Standard & Layout for PDF */}
          {options.format === 'pdf' && (
            <div className="space-y-4 pt-3 border-t border-zinc-800">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
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
                      onClick={() => setOptions({ ...options, pageSize: p.id as PaperSize })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        options.pageSize === p.id
                          ? 'bg-[#1473E6] text-white border-blue-400 shadow-sm'
                          : 'bg-[#222226] border-zinc-700/70 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Orientation
                  </label>
                  <select
                    value={options.orientation}
                    onChange={(e) => setOptions({ ...options, orientation: e.target.value as any })}
                    className="w-full bg-[#222226] border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 outline-none focus:border-[#1473E6]"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Page Margin
                  </label>
                  <select
                    value={options.marginMm}
                    onChange={(e) => setOptions({ ...options, marginMm: Number(e.target.value) })}
                    className="w-full bg-[#222226] border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 outline-none focus:border-[#1473E6]"
                  >
                    <option value={0}>Borderless (0 mm)</option>
                    <option value={5}>Standard (5 mm)</option>
                    <option value={10}>Spacious (10 mm)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Print and Tools Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white px-2.5 py-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#1473E6]" />
              <span>Direct Print</span>
            </button>

            <span className="text-[11px] text-zinc-400 font-mono">
              Estimated: ~{(pages.length * 0.45).toFixed(1)} MB
            </span>
          </div>

          {/* Progress bar */}
          {isExporting && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[#222226] border border-zinc-700">
              <div className="flex justify-between text-xs font-semibold text-zinc-300">
                <span>Building High-Res Document...</span>
                <span className="font-mono text-[#1473E6]">{exportProgress}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1473E6] h-full transition-all duration-200 rounded-full"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#27272a] bg-[#121214] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {options.format === 'pdf' ? (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1473E6] hover:bg-[#0d66d0] text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 border border-blue-400/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Building PDF...' : `Save PDF (${pages.length} Pages)`}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadAllImages}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2 border border-emerald-400/30 transition-all cursor-pointer active:scale-95"
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
