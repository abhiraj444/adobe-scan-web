import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  PageItem, 
  FilterSettings, 
  PresetMode, 
  Quadrilateral,
  CleanupStroke,
  PaperSize
} from './types';
import { PRESET_CONFIGS } from './lib/cv/presets';
import { detectDocumentCorners } from './lib/cv/edgeDetection';
import { processDocumentPage } from './lib/cv/pipeline';
import { extractPdfPages, streamPdfPages } from './lib/pdf/pdfImporter';

import { AdobeNavbar } from './components/AdobeNavbar';
import { AdobeDocumentStage } from './components/AdobeDocumentStage';
import { PageFilmstrip } from './components/PageFilmstrip';
import { AdobeBottomToolbar } from './components/AdobeBottomToolbar';
import { AdobeCropModal } from './components/AdobeCropModal';
import { AdobeCleanupModal } from './components/AdobeCleanupModal';
import { AdobeReorderModal } from './components/AdobeReorderModal';
import { AdobeCameraModal } from './components/AdobeCameraModal';
import { AdobeExportModal } from './components/AdobeExportModal';
import { AdobeEmptyState } from './components/AdobeEmptyState';
import { AdobeEditInspector, EditTab } from './components/AdobeEditInspector';

import { 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface LoadingState {
  isLoading: boolean;
  message: string;
  subMessage?: string;
  current?: number;
  total?: number;
}

export default function App() {
  const [documentTitle, setDocumentTitle] = useState<string>(() => {
    const d = new Date();
    return `Adobe Scan ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
  });

  const [pages, setPages] = useState<PageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Toast banner for actions like "Applied to all pages"
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Redo history stack
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PageItem[][]>([]);

  // Global Loading State
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '',
  });

  // Edit Inspector & Modal Visibility
  const [activeEditTab, setActiveEditTab] = useState<EditTab | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isBatchProcessingRef = useRef(false);

  const activePage = pages[activePageIndex];

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const pushHistory = useCallback((currentPages: PageItem[]) => {
    setHistory((prev) => [...prev.slice(-20), currentPages]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, pages]);
    setPages(previous);
    setActivePageIndex((idx) => Math.min(idx, previous.length - 1));
  }, [history, pages]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setHistory((prev) => [...prev, pages]);
    setPages(next);
    setActivePageIndex((idx) => Math.min(idx, next.length - 1));
  }, [redoStack, pages]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === 'ArrowLeft' && !isCropModalOpen && !isCleanupModalOpen) {
        setActivePageIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight' && !isCropModalOpen && !isCleanupModalOpen) {
        setActivePageIndex((p) => Math.min(pages.length - 1, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isCropModalOpen, isCleanupModalOpen, pages.length]);

  // Helper to load an HTMLImageElement asynchronously on demand
  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });
  }, []);

  // Reprocess a single page on demand using Web Worker
  const reprocessPage = useCallback(
    async (
      page: PageItem,
      newCorners?: Quadrilateral,
      newSettings?: FilterSettings,
      newCleanup?: CleanupStroke[],
      newPaperSize?: PaperSize
    ) => {
      const cornersToUse = newCorners || page.corners;
      const settingsToUse = newSettings || page.settings;
      const cleanupToUse = newCleanup !== undefined ? newCleanup : page.cleanupStrokes;
      const paperSizeToUse = newPaperSize || page.paperSize || 'original';

      try {
        let img = page.originalImage;
        if (!img) {
          img = await loadImage(page.originalDataUrl);
        }

        const { processedCanvas, dataUrl, thumbnailUrl } = await processDocumentPage(
          img,
          cornersToUse,
          settingsToUse,
          cleanupToUse,
          paperSizeToUse
        );

        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  originalImage: img,
                  isEdited: true,
                  corners: cornersToUse,
                  settings: settingsToUse,
                  cleanupStrokes: cleanupToUse,
                  paperSize: paperSizeToUse,
                  processedCanvas,
                  processedDataUrl: dataUrl,
                  thumbnailUrl,
                  status: 'ready',
                }
              : p
          )
        );
      } catch (err: any) {
        console.error('Processing error:', err);
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id ? { ...p, status: 'error', errorMessage: err.message } : p
          )
        );
      }
    },
    [loadImage]
  );

  // Debounced processor for fine slider tuning on active page
  const triggerDebouncedProcess = useCallback(
    (page: PageItem, newSettings: FilterSettings) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        reprocessPage(page, page.corners, newSettings, page.cleanupStrokes, page.paperSize);
      }, 35);
    },
    [reprocessPage]
  );

  // Open Crop Modal ensuring active page image is loaded
  const handleOpenCropModal = async () => {
    if (!activePage) return;
    if (!activePage.originalImage) {
      try {
        const img = await loadImage(activePage.originalDataUrl);
        setPages((prev) =>
          prev.map((p) => (p.id === activePage.id ? { ...p, originalImage: img } : p))
        );
      } catch (e) {
        console.warn('Failed to load image for crop modal:', e);
      }
    }
    setIsCropModalOpen(true);
  };

  // Instant Progressive Document Ingestion: Page 1 shows in <150ms while remaining pages stream concurrently
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        setLoadingState({
          isLoading: true,
          message: `Opening ${file.name}`,
          subMessage: 'Loading first page...',
          current: 1,
          total: 1,
        });

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const fileSessionId = `${Date.now()}-${i}`;

        try {
          await streamPdfPages(
            file,
            (p, progress) => {
              const corners: Quadrilateral = {
                tl: { x: 0, y: 0 },
                tr: { x: p.width, y: 0 },
                br: { x: p.width, y: p.height },
                bl: { x: 0, y: p.height },
              };

              const defaultSettings: FilterSettings = { ...PRESET_CONFIGS.color_doc };

              const pageItem: PageItem = {
                id: `page-${fileSessionId}-${p.pageNumber}`,
                name: `${baseName} (p.${p.pageNumber})`,
                originalImage: undefined,
                originalDataUrl: p.dataUrl,
                originalWidth: p.width,
                originalHeight: p.height,
                pdfWidthPt: p.pdfWidthPt,
                pdfHeightPt: p.pdfHeightPt,
                isEdited: false,
                corners,
                autoCorners: corners,
                settings: defaultSettings,
                mode: 'color_doc',
                cleanupStrokes: [],
                paperSize: 'original',
                isPdfPage: true,
                sourceType: 'pdf',
                processedCanvas: undefined,
                processedDataUrl: p.dataUrl,
                thumbnailUrl: p.thumbnailUrl,
                status: 'ready',
              };

              setPages((prev) => {
                const next = [...prev];
                const existingIdx = next.findIndex((item) => item.id === pageItem.id);
                if (existingIdx >= 0) {
                  next[existingIdx] = pageItem;
                } else {
                  next.push(pageItem);
                }
                return next;
              });

              // As soon as page 1 is ready, dismiss the blocking modal immediately!
              if (progress.current === 1) {
                setLoadingState({ isLoading: false, message: '' });
                setActivePageIndex((curr) => (curr === 0 ? 0 : curr));
              }
            },
            4 // 4 parallel rendering pipelines
          );
        } catch (err: any) {
          console.error('Error streaming PDF:', err);
          alert('Error loading PDF: ' + (err.message || 'Unknown error'));
        } finally {
          setLoadingState({ isLoading: false, message: '' });
        }
      } else if (file.type.startsWith('image/')) {
        setLoadingState({
          isLoading: true,
          message: `Loading Image: ${file.name}`,
          subMessage: 'Opening photo...',
          current: i + 1,
          total: fileList.length,
        });

        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsDataURL(file);
          });

          const img = await loadImage(dataUrl);
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          const corners: Quadrilateral = {
            tl: { x: 0, y: 0 },
            tr: { x: w, y: 0 },
            br: { x: w, y: h },
            bl: { x: 0, y: h },
          };

          const defaultSettings: FilterSettings = { ...PRESET_CONFIGS.color_doc };

          const pageItem: PageItem = {
            id: `page-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalImage: img,
            originalDataUrl: dataUrl,
            originalWidth: w,
            originalHeight: h,
            isEdited: false,
            corners,
            autoCorners: corners,
            settings: defaultSettings,
            mode: 'color_doc',
            cleanupStrokes: [],
            paperSize: 'original',
            isPdfPage: false,
            sourceType: 'image',
            processedCanvas: undefined,
            processedDataUrl: dataUrl,
            thumbnailUrl: dataUrl,
            status: 'ready',
          };

          setPages((prev) => [...prev, pageItem]);
        } catch (err: any) {
          console.error('Error loading image:', err);
        } finally {
          setLoadingState({ isLoading: false, message: '' });
        }
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add camera snapshot
  const handleCameraCapture = async (dataUrl: string) => {
    try {
      const img = await loadImage(dataUrl);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const autoCorners = detectDocumentCorners(img);

      const pageItem: PageItem = {
        id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Camera Scan ${pages.length + 1}`,
        originalImage: img,
        originalDataUrl: dataUrl,
        originalWidth: w,
        originalHeight: h,
        isEdited: false,
        corners: autoCorners,
        autoCorners,
        settings: { ...PRESET_CONFIGS.color_doc },
        mode: 'color_doc',
        cleanupStrokes: [],
        paperSize: 'original',
        isPdfPage: false,
        sourceType: 'camera',
        processedCanvas: undefined,
        processedDataUrl: dataUrl,
        thumbnailUrl: dataUrl,
        status: 'ready',
      };

      pushHistory(pages);
      setPages((prev) => {
        const next = [...prev, pageItem];
        setActivePageIndex(next.length - 1);
        return next;
      });
    } catch (err: any) {
      console.error('Error processing camera capture:', err);
    }
  };

  // Create sample document demo
  const handleLoadSample = async () => {
    setLoadingState({
      isLoading: true,
      message: 'Generating sample document...',
      subMessage: 'Creating sample page with seals and notes',
    });

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Warm paper texture
      const grad = ctx.createLinearGradient(0, 0, 1200, 1600);
      grad.addColorStop(0, '#fbf8ef');
      grad.addColorStop(0.5, '#f4ecd8');
      grad.addColorStop(1, '#e7dcbe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 1600);

      // Shadow vignette
      const shadowGrad = ctx.createRadialGradient(400, 400, 100, 600, 800, 900);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(60,40,10,0.22)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, 1200, 1600);

      // Header title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px serif';
      ctx.fillText('OFFICIAL CERTIFICATE OF COMPLETION', 120, 180);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Adobe Scan Advanced Document Processing System', 120, 230);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(120, 260);
      ctx.lineTo(1080, 260);
      ctx.stroke();

      ctx.font = '22px serif';
      ctx.fillStyle = '#0f172a';
      const textLines = [
        'This document verifies that the computer vision and document cleaning pipeline',
        'is functioning with automatic boundary detection, perspective transformation,',
        'shadow removal via illumination division normalization, and Sauvola thresholding.',
        '',
        '• Instant PDF & document showcase with zero waiting time on upload',
        '• Per-page interactive tuning with real-time Web Worker filters',
        '• 1-Click "Apply to All Pages" batch enhancement',
        '• Exact original document size preservation on PDF export',
        '',
        'Date: September 02, 2026                 Reference No: ADOBE-SCAN-2026',
      ];

      let yPos = 340;
      for (const line of textLines) {
        ctx.fillText(line, 120, yPos);
        yPos += 45;
      }

      // Red Seal
      ctx.save();
      ctx.translate(850, 1100);
      ctx.rotate(-0.15);
      ctx.strokeStyle = '#dc2626';
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED & APPROVED', 0, -15);
      ctx.fillText('★ ADOBE SCAN ★', 0, 25);
      ctx.restore();

      // Signature
      ctx.save();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(200, 1150);
      ctx.bezierCurveTo(250, 1080, 320, 1200, 380, 1120);
      ctx.bezierCurveTo(420, 1050, 460, 1220, 520, 1140);
      ctx.stroke();

      ctx.font = 'italic 18px serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Authorized Signatory', 200, 1220);
      ctx.restore();

      const sampleDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const img = await loadImage(sampleDataUrl);

      const samplePage: PageItem = {
        id: `sample-${Date.now()}`,
        name: 'Sample Official Document',
        originalImage: img,
        originalDataUrl: sampleDataUrl,
        originalWidth: 1200,
        originalHeight: 1600,
        pdfWidthPt: 595.28,
        pdfHeightPt: 841.89,
        isEdited: false,
        corners: {
          tl: { x: 0, y: 0 },
          tr: { x: 1200, y: 0 },
          br: { x: 1200, y: 1600 },
          bl: { x: 0, y: 1600 },
        },
        autoCorners: {
          tl: { x: 0, y: 0 },
          tr: { x: 1200, y: 0 },
          br: { x: 1200, y: 1600 },
          bl: { x: 0, y: 1600 },
        },
        settings: { ...PRESET_CONFIGS.color_doc },
        mode: 'color_doc',
        cleanupStrokes: [],
        paperSize: 'original',
        isPdfPage: true,
        sourceType: 'pdf',
        processedCanvas: undefined,
        processedDataUrl: sampleDataUrl,
        thumbnailUrl: sampleDataUrl,
        status: 'ready',
      };

      pushHistory(pages);
      setPages([samplePage]);
      setActivePageIndex(0);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  // Pre-cache active page image element in memory for instantaneous slider responsiveness
  useEffect(() => {
    if (activePage && !activePage.originalImage && activePage.originalDataUrl) {
      loadImage(activePage.originalDataUrl)
        .then((img) => {
          setPages((prev) =>
            prev.map((p) => (p.id === activePage.id && !p.originalImage ? { ...p, originalImage: img } : p))
          );
        })
        .catch((e) => console.warn('Failed to pre-cache image:', e));
    }
  }, [activePage?.id, activePage?.originalDataUrl, loadImage]);

  // Preset pill selection - updates ONLY the active page
  const handleSelectPreset = (newMode: PresetMode) => {
    if (!activePage) return;
    pushHistory(pages);
    const newSettings =
      newMode === 'custom'
        ? { ...activePage.settings }
        : { ...PRESET_CONFIGS[newMode], rotation: activePage.settings.rotation };

    setPages((prev) =>
      prev.map((p) =>
        p.id === activePage.id ? { ...p, mode: newMode, settings: newSettings, isEdited: true } : p
      )
    );
    reprocessPage(activePage, activePage.corners, newSettings, activePage.cleanupStrokes, activePage.paperSize);
  };

  // Sliders update from Adjust Sheet - updates ONLY the active page
  const handleChangeAdjustSettings = (newSettings: FilterSettings) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePage.id ? { ...p, settings: newSettings, mode: 'custom', isEdited: true } : p
      )
    );
    triggerDebouncedProcess(activePage, newSettings);
  };

  // APPLY TO ALL PAGES: Instantly propagates the active page's filter & settings to each page, and processes them in the background
  const handleApplyToAllPages = async (settingsToApply?: FilterSettings, modeToApply?: PresetMode, paperSizeToApply?: PaperSize) => {
    if (!activePage || pages.length <= 1) return;

    const targetSettings = settingsToApply || activePage.settings;
    const targetMode = modeToApply || activePage.mode;
    const targetPaperSize = paperSizeToApply || activePage.paperSize || 'original';

    pushHistory(pages);

    // 1. Instantly update all pages in state so UI & metadata reflect immediately
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        isEdited: true,
        mode: targetMode,
        paperSize: targetPaperSize,
        settings: { ...targetSettings, rotation: p.settings.rotation },
      }))
    );

    showToast(`Applied "${targetMode.replace('_', ' ').toUpperCase()}" settings to all ${pages.length} pages!`);

    // 2. Run background processing on the other pages using the Web Worker without blocking the UI
    if (isBatchProcessingRef.current) return;
    isBatchProcessingRef.current = true;

    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.id === activePage.id && page.processedDataUrl) continue;

        let img = page.originalImage;
        if (!img) {
          img = await loadImage(page.originalDataUrl);
        }

        const s = { ...targetSettings, rotation: page.settings.rotation };
        const { processedCanvas, dataUrl, thumbnailUrl } = await processDocumentPage(
          img,
          page.corners,
          s,
          page.cleanupStrokes,
          targetPaperSize
        );

        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  originalImage: img,
                  processedCanvas,
                  processedDataUrl: dataUrl,
                  thumbnailUrl,
                  status: 'ready',
                }
              : p
          )
        );
      }
    } catch (e) {
      console.warn('Batch background processing encountered an issue:', e);
    } finally {
      isBatchProcessingRef.current = false;
    }
  };

  // Apply Crop corners from Crop Modal (Active page only)
  const handleApplyCrop = (newCorners: Quadrilateral) => {
    if (!activePage) return;
    setIsCropModalOpen(false);
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, corners: newCorners, isEdited: true } : p))
    );
    reprocessPage(activePage, newCorners, activePage.settings, activePage.cleanupStrokes, activePage.paperSize);
  };

  // Apply Clean Up Strokes (Active page only)
  const handleApplyCleanup = (strokes: CleanupStroke[]) => {
    if (!activePage) return;
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, cleanupStrokes: strokes, isEdited: true } : p))
    );
    reprocessPage(activePage, activePage.corners, activePage.settings, strokes, activePage.paperSize);
  };

  // Apply Paper Size
  const handleApplyPaperSize = (paperSize: PaperSize) => {
    if (!activePage) return;
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, paperSize, isEdited: true } : p))
    );
    reprocessPage(activePage, activePage.corners, activePage.settings, activePage.cleanupStrokes, paperSize);
  };

  // Auto detect corners
  const handleAutoDetectCorners = async () => {
    if (!activePage) return null;
    let img = activePage.originalImage;
    if (!img) {
      img = await loadImage(activePage.originalDataUrl);
    }
    return detectDocumentCorners(img);
  };

  // Rotate active page 90 degrees
  const handleRotateActivePage = () => {
    if (!activePage) return;
    pushHistory(pages);
    const nextRot = (activePage.settings.rotation + 90) % 360;
    const newSettings = { ...activePage.settings, rotation: nextRot };

    setPages((prev) =>
      prev.map((item, idx) =>
        idx === activePageIndex ? { ...item, settings: newSettings, isEdited: true } : item
      )
    );
    reprocessPage(activePage, activePage.corners, newSettings, activePage.cleanupStrokes, activePage.paperSize);
  };

  // Delete page
  const handleDeletePage = (index: number) => {
    pushHistory(pages);
    setPages((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (activePageIndex >= next.length) {
        setActivePageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Reorder page move
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    pushHistory(pages);
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setActivePageIndex(toIndex);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f0f13] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Hidden Global File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-4 py-2 bg-emerald-600/95 border border-emerald-400/40 text-white text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Adobe Scan Top Navbar */}
      <AdobeNavbar
        documentTitle={documentTitle}
        onRenameTitle={setDocumentTitle}
        pageCount={pages.length}
        currentPageIndex={activePageIndex}
        hasPages={pages.length > 0}
        onUploadClick={() => fileInputRef.current?.click()}
        onCameraClick={() => setIsCameraModalOpen(true)}
        onExportClick={() => setIsExportModalOpen(true)}
        onResetClick={() => {
          if (confirm('Clear all pages from current scanning session?')) {
            pushHistory(pages);
            setPages([]);
            setActivePageIndex(0);
          }
        }}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Adobe Scan Stage */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {pages.length === 0 ? (
          <AdobeEmptyState
            onFilesSelected={handleFilesSelected}
            onCameraClick={() => setIsCameraModalOpen(true)}
            onLoadSample={handleLoadSample}
          />
        ) : activePage ? (
          <>
            {/* Split layout: Document Stage + Live Edit Inspector (Desktop) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
              {/* Center / Left Document Stage */}
              <main className="flex-1 relative overflow-hidden bg-[#0d0d11] flex flex-col min-h-0">
                <AdobeDocumentStage
                  originalDataUrl={activePage.originalDataUrl}
                  processedDataUrl={activePage.isEdited && activePage.processedDataUrl ? activePage.processedDataUrl : activePage.originalDataUrl}
                  status={activePage.status}
                  pageIndex={activePageIndex}
                  totalPages={pages.length}
                  onOpenCrop={handleOpenCropModal}
                />
              </main>

              {/* Desktop Live Edit Inspector Panel (docked right alongside document, non-blocking) */}
              {activeEditTab && (
                <div className="hidden md:flex h-full shrink-0">
                  <AdobeEditInspector
                    isOpen={true}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    onClose={() => setActiveEditTab(null)}
                    pageIndex={activePageIndex}
                    totalPages={pages.length}
                    currentMode={activePage.mode}
                    onSelectPreset={handleSelectPreset}
                    settings={activePage.settings}
                    onChangeSettings={handleChangeAdjustSettings}
                    currentPaperSize={activePage.paperSize || 'original'}
                    onSelectPaperSize={handleApplyPaperSize}
                    onApplyToAllPages={handleApplyToAllPages}
                  />
                </div>
              )}
            </div>

            {/* Mobile Live Edit Inspector Drawer (docked at bottom, document stage remains fully visible above!) */}
            {activeEditTab && (
              <div className="md:hidden shrink-0">
                <AdobeEditInspector
                  isOpen={true}
                  activeTab={activeEditTab}
                  onTabChange={setActiveEditTab}
                  onClose={() => setActiveEditTab(null)}
                  pageIndex={activePageIndex}
                  totalPages={pages.length}
                  currentMode={activePage.mode}
                  onSelectPreset={handleSelectPreset}
                  settings={activePage.settings}
                  onChangeSettings={handleChangeAdjustSettings}
                  currentPaperSize={activePage.paperSize || 'original'}
                  onSelectPaperSize={handleApplyPaperSize}
                  onApplyToAllPages={handleApplyToAllPages}
                />
              </div>
            )}

            {/* Docked Filmstrip Carousel if >1 page */}
            {pages.length > 1 && !activeEditTab && (
              <PageFilmstrip
                pages={pages}
                activePageIndex={activePageIndex}
                onSelectPage={setActivePageIndex}
                onAddPage={() => setIsAddMenuOpen(true)}
                onDeletePage={handleDeletePage}
                onRotatePage={(idx) => {
                  const p = pages[idx];
                  if (!p) return;
                  const nextRot = (p.settings.rotation + 90) % 360;
                  const newSettings = { ...p.settings, rotation: nextRot };
                  setPages((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, settings: newSettings, isEdited: true } : item))
                  );
                  reprocessPage(p, p.corners, newSettings, p.cleanupStrokes, p.paperSize);
                }}
                onOpenReorder={() => setIsReorderModalOpen(true)}
              />
            )}

            {/* Bottom Adobe Tool Ribbon */}
            <div className={activeEditTab ? "hidden md:block" : "block"}>
              <AdobeBottomToolbar
                page={activePage}
                pageIndex={activePageIndex}
                totalPages={pages.length}
                activeTool={activeEditTab}
                onOpenAdd={() => setIsAddMenuOpen(true)}
                onOpenReorder={() => setIsReorderModalOpen(true)}
                onOpenCrop={handleOpenCropModal}
                onRotate={handleRotateActivePage}
                onOpenFilters={() => setActiveEditTab((prev) => (prev === 'filters' ? null : 'filters'))}
                onOpenCleanup={() => setIsCleanupModalOpen(true)}
                onOpenAdjust={() => setActiveEditTab((prev) => (prev === 'adjust' ? null : 'adjust'))}
                onOpenResize={() => setActiveEditTab((prev) => (prev === 'resize' ? null : 'resize'))}
                onApplyToAll={() => handleApplyToAllPages()}
                onDelete={() => handleDeletePage(activePageIndex)}
                onPrevPage={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                onNextPage={() => setActivePageIndex((p) => Math.min(pages.length - 1, p + 1))}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Loading Modal Overlay */}
      {loadingState.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-2xl max-w-xs w-full text-center flex flex-col items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-2xl bg-[#1473E6]/20 text-[#1473E6] flex items-center justify-center border border-blue-500/30">
              <Loader2 className="w-6 h-6 animate-spin text-[#1473E6]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">{loadingState.message}</h4>
              {loadingState.subMessage && (
                <p className="text-xs text-zinc-400">{loadingState.subMessage}</p>
              )}
            </div>

            {loadingState.total !== undefined && loadingState.total > 1 && (
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-[#1473E6] h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round(((loadingState.current || 1) / loadingState.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Page Action Sheet */}
      {isAddMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddMenuOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#18181b] border-t sm:border border-[#27272a] rounded-t-2xl sm:rounded-2xl p-5 space-y-3 shadow-2xl text-white select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-sm font-bold text-center mb-3">Add Document Page</h3>

            <button
              onClick={() => {
                setIsAddMenuOpen(false);
                setIsCameraModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#222226] hover:bg-[#27272a] border border-zinc-700 text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1473E6]/20 text-[#1473E6] flex items-center justify-center border border-blue-500/30">
                <Camera className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold">Camera Scan</div>
                <div className="text-[11px] text-zinc-400 font-normal">Snap new pages with auto boundary detection</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsAddMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#222226] hover:bg-[#27272a] border border-zinc-700 text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold">Upload PDF or Photos</div>
                <div className="text-[11px] text-zinc-400 font-normal">Import multi-page PDF files or images</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 8-Point Crop & Loupe Modal */}
      {activePage && (
        <AdobeCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          onApplyCrop={handleApplyCrop}
          image={activePage.originalImage || null}
          initialCorners={activePage.corners}
          onAutoDetect={handleAutoDetectCorners}
          onRotateSource={handleRotateActivePage}
        />
      )}

      {/* Clean Up & Retouch Brush Modal */}
      {activePage && (
        <AdobeCleanupModal
          isOpen={isCleanupModalOpen}
          onClose={() => setIsCleanupModalOpen(false)}
          onApplyCleanup={handleApplyCleanup}
          imageCanvas={activePage.processedCanvas || null}
          initialStrokes={activePage.cleanupStrokes}
        />
      )}

      {/* Full Page Reorder Grid Modal */}
      <AdobeReorderModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        pages={pages}
        activePageIndex={activePageIndex}
        onSelectPage={setActivePageIndex}
        onAddUpload={() => fileInputRef.current?.click()}
        onAddCamera={() => setIsCameraModalOpen(true)}
        onDeletePage={handleDeletePage}
        onRotatePage={(idx) => {
          const p = pages[idx];
          if (!p) return;
          const nextRot = (p.settings.rotation + 90) % 360;
          const newSettings = { ...p.settings, rotation: nextRot };
          setPages((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, settings: newSettings, isEdited: true } : item))
          );
          reprocessPage(p, p.corners, newSettings, p.cleanupStrokes, p.paperSize);
        }}
        onMovePage={handleMovePage}
      />

      {/* Save PDF & Export Modal */}
      <AdobeExportModal
        pages={pages}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={documentTitle}
      />

      {/* Live Camera Scanner Modal */}
      <AdobeCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
