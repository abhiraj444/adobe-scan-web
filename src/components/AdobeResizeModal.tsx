import React, { useState } from 'react';
import { PaperSize } from '../types';
import { 
  X, 
  Check, 
  Maximize, 
  CreditCard, 
  FileText, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface AdobeResizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize: PaperSize;
  onSelectSize: (size: PaperSize) => void;
  pageIndex: number;
  totalPages: number;
}

export const AdobeResizeModal: React.FC<AdobeResizeModalProps> = ({
  isOpen,
  onClose,
  currentSize,
  onSelectSize,
  pageIndex,
  totalPages,
}) => {
  const [selectedSize, setSelectedSize] = useState<PaperSize>(currentSize || 'a4');

  if (!isOpen) return null;

  const SIZES: Array<{ id: PaperSize; label: string; desc: string; icon: any }> = [
    { id: 'original', label: 'Auto Fit', desc: 'Preserve natural captured document bounds', icon: Maximize },
    { id: 'a4', label: 'A4 Standard', desc: '210 × 297 mm (International Standard)', icon: FileText },
    { id: 'letter', label: 'US Letter', desc: '8.5 × 11 inches (North America Standard)', icon: FileText },
    { id: 'a5', label: 'A5 Notebook', desc: '148 × 210 mm (Half of A4)', icon: FileText },
    { id: 'legal', label: 'US Legal', desc: '8.5 × 14 inches (Contracts & Certificates)', icon: FileSpreadsheet },
    { id: 'id_card', label: 'ID Card / Passport', desc: '85.6 × 53.98 mm (Standard ID & Badges)', icon: CreditCard },
    { id: 'business_card', label: 'Business Card', desc: '3.5 × 2 inches (Visiting Cards)', icon: CreditCard },
  ];

  const handleApply = () => {
    onSelectSize(selectedSize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-md bg-[#18181b] border-t sm:border border-[#27272a] rounded-t-2xl sm:rounded-2xl shadow-2xl text-zinc-100 max-h-[85vh] flex flex-col z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Maximize className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Resize Paper Standard</h3>
              <p className="text-[11px] text-zinc-400">Page {pageIndex + 1} of {totalPages}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size List */}
        <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1 max-h-[55vh]">
          {SIZES.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedSize === s.id;

            return (
              <button
                key={s.id}
                onClick={() => setSelectedSize(s.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1473E6]/15 border-[#1473E6] ring-1 ring-[#1473E6]/50 shadow-md text-white'
                    : 'bg-[#222226] border-zinc-700/60 hover:bg-[#27272a] text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#18181b] border border-zinc-700/80 shrink-0 text-zinc-300">
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

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#121214]">
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-[#1473E6] hover:bg-[#0d66d0] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all text-center cursor-pointer"
          >
            Apply Paper Size
          </button>
        </div>
      </div>
    </div>
  );
};
