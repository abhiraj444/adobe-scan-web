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
import { detectDocumentCorners, getDefaultCorners } from './lib/cv/edgeDetection';
import { processDocumentPage } from './lib/cv/pipeline';
import { extractPdfPages } from './lib/pdf/pdfImporter';

import { AdobeNavbar } from './components/AdobeNavbar';
import { AdobeDocumentStage } from './components/AdobeDocumentStage';
import { PageFilmstrip } from './components/PageFilmstrip';
import { AdobeBottomToolbar } from './components/AdobeBottomToolbar';
import { AdobeCropModal } from './components/AdobeCropModal';
import { AdobeFilterSheet } from './components/AdobeFilterSheet';
import { AdobeAdjustSheet } from './components/AdobeAdjustSheet';
import { AdobeCleanupModal } from './components/AdobeCleanupModal';
import { AdobeResizeModal } from './components/AdobeResizeModal';
import { AdobeReorderModal } from './components/AdobeReorderModal';
import { AdobeCameraModal } from './components/AdobeCameraModal';
import { AdobeExportModal } from './components/AdobeExportModal';
import { AdobeEmptyState } from './components/AdobeEmptyState';

import { 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles,
  Plus
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

  // Undo / Redo history stack
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PageItem[][]>([]);

  // Global Loading State
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '',
  });

  // Modal Sheet Visibility
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activePage = pages[activePageIndex];

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

  // Reprocess a page when settings/corners change
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
      const paperSizeToUse = newPaperSize || page.paperSize;

      try {
        const { processedCanvas, dataUrl, thumbnailUrl } = await processDocumentPage(
          page.originalImage,
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
    []
  );

  // Debounced processor for fast sliders
  const triggerDebouncedProcess = useCallback(
    (page: PageItem, newSettings: FilterSettings) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        reprocessPage(page, page.corners, newSettings, page.cleanupStrokes, page.paperSize);
      }, 35);
    },
    [reprocessPage]
  );

  // Helper to create and process an image item
  const processSingleImageItem = async (
    dataUrl: string,
    name: string,
    isPdf = false,
    preset: PresetMode = 'auto_color'
  ): Promise<PageItem> => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = dataUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // For PDF: use exact rectangular bounds; for camera/photos: run edge detection
    const corners: Quadrilateral = isPdf
      ? {
          tl: { x: 0, y: 0 },
          tr: { x: w, y: 0 },
          br: { x: w, y: h },
          bl: { x: 0, y: h },
        }
      : detectDocumentCorners(img);

    const defaultSettings: FilterSettings = { ...PRESET_CONFIGS[preset] };

    const { processedCanvas, dataUrl: procUrl, thumbnailUrl } = await processDocumentPage(
      img,
      corners,
      defaultSettings
    );

    return {
      id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      originalImage: img,
      originalDataUrl: dataUrl,
      originalWidth: w,
      originalHeight: h,
      corners,
      autoCorners: corners,
      settings: defaultSettings,
      mode: preset,
      cleanupStrokes: [],
      paperSize: 'a4',
      isPdfPage: isPdf,
      sourceType: isPdf ? 'pdf' : 'image',
      processedCanvas,
      processedDataUrl: procUrl,
      thumbnailUrl,
      status: 'ready',
    };
  };

  // Handle uploaded files (PDF multi-page and Images)
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newItems: PageItem[] = [];

    setLoadingState({
      isLoading: true,
      message: 'Reading documents...',
      subMessage: 'Extracting pages & applying Adobe Scan enhancement pipeline',
      current: 0,
      total: fileList.length,
    });

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          setLoadingState({
            isLoading: true,
            message: `Importing PDF: ${file.name}`,
            subMessage: 'Rendering all pages at high resolution...',
            current: i + 1,
            total: fileList.length,
          });

          const extractedPages = await extractPdfPages(file, (curr, total) => {
            setLoadingState({
              isLoading: true,
              message: `Loading PDF: ${file.name}`,
              subMessage: `Rendering page ${curr} of ${total}...`,
              current: curr,
              total: total,
            });
          });

          for (let pIdx = 0; pIdx < extractedPages.length; pIdx++) {
            const pageData = extractedPages[pIdx];
            setLoadingState({
              isLoading: true,
              message: `Adobe Scan Whitening`,
              subMessage: `Cleaning page ${pIdx + 1} of ${extractedPages.length}...`,
              current: pIdx + 1,
              total: extractedPages.length,
            });

            const pageItem = await processSingleImageItem(
              pageData.dataUrl,
              `${file.name.replace(/\.[^/.]+$/, '')} (p.${pageData.pageNumber})`,
              true,
              'auto_color'
            );
            newItems.push(pageItem);
          }
        } else if (file.type.startsWith('image/')) {
          setLoadingState({
            isLoading: true,
            message: `Cleaning Photo: ${file.name}`,
            subMessage: 'Detecting boundaries & normalizing illumination...',
            current: i + 1,
            total: fileList.length,
          });

          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsDataURL(file);
          });

          const pageItem = await processSingleImageItem(
            dataUrl,
            file.name.replace(/\.[^/.]+$/, ''),
            false,
            'magic_color'
          );
          newItems.push(pageItem);
        }
      }

      if (newItems.length > 0) {
        pushHistory(pages);
        setPages((prev) => {
          const next = [...prev, ...newItems];
          setActivePageIndex(prev.length === 0 ? 0 : prev.length);
          return next;
        });
      }
    } catch (err: any) {
      console.error('Error importing documents:', err);
      alert('Error loading documents: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingState({ isLoading: false, message: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add camera snapshot
  const handleCameraCapture = async (dataUrl: string) => {
    setLoadingState({
      isLoading: true,
      message: 'Processing camera scan...',
      subMessage: 'Applying boundary detection & illumination normalization',
    });
    try {
      const pageItem = await processSingleImageItem(
        dataUrl,
        `Camera Scan ${pages.length + 1}`,
        false,
        'magic_color'
      );
      pushHistory(pages);
      setPages((prev) => {
        const next = [...prev, pageItem];
        setActivePageIndex(next.length - 1);
        return next;
      });
    } catch (err: any) {
      console.error('Error processing camera capture:', err);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  // Create sample document demo
  const handleLoadSample = async () => {
    setLoadingState({
      isLoading: true,
      message: 'Generating sample document...',
      subMessage: 'Creating authentic document with seals and handwritten notes',
    });

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Authentic warm paper texture with subtle gradient shadow
      const grad = ctx.createLinearGradient(0, 0, 1200, 1600);
      grad.addColorStop(0, '#fbf8ef');
      grad.addColorStop(0.5, '#f4ecd8');
      grad.addColorStop(1, '#e7dcbe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 1600);

      // Shadow vignette on right & bottom
      const shadowGrad = ctx.createRadialGradient(400, 400, 100, 600, 800, 900);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(60,40,10,0.22)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, 1200, 1600);

      // Header logo / title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px serif';
      ctx.fillText('OFFICIAL CERTIFICATE OF COMPLETION', 120, 180);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Adobe Scan Advanced Document Processing System', 120, 230);

      // Horizontal rule
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(120, 260);
      ctx.lineTo(1080, 260);
      ctx.stroke();

      // Body text lines
      ctx.font = '22px serif';
      ctx.fillStyle = '#0f172a';
      const textLines = [
        'This document verifies that the computer vision and document cleaning pipeline',
        'is functioning with automatic boundary detection, perspective transformation,',
        'shadow removal via illumination division normalization, and Sauvola thresholding.',
        '',
        '• Multi-page batch document ingestion (PDF, Images, and Camera)',
        '• Adobe Scan 8-point boundary crop with 2.5x circular loupe magnification',
        '• Dedicated Web Worker non-blocking image processing pipeline',
        '• Retouch & Eraser brush tool with background inpainting',
        '• Standard paper sizing (A4, US Letter, ID Card, Legal)',
        '',
        'Date: August 27, 2026                 Reference No: ADOBE-SCAN-9941',
      ];

      let yPos = 340;
      for (const line of textLines) {
        ctx.fillText(line, 120, yPos);
        yPos += 45;
      }

      // Red Official Seal / Stamp (Vibrant Color)
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

      // Blue Pen Signature
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
      const pageItem = await processSingleImageItem(
        sampleDataUrl,
        'Sample Official Document',
        false,
        'magic_color'
      );

      pushHistory(pages);
      setPages([pageItem]);
      setActivePageIndex(0);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  // Preset pill selection
  const handleSelectPreset = (newMode: PresetMode) => {
    if (!activePage) return;
    pushHistory(pages);
    const newSettings =
      newMode === 'custom'
        ? { ...activePage.settings }
        : { ...PRESET_CONFIGS[newMode], rotation: activePage.settings.rotation };

    setPages((prev) =>
      prev.map((p) =>
        p.id === activePage.id ? { ...p, mode: newMode, settings: newSettings } : p
      )
    );
    reprocessPage(activePage, activePage.corners, newSettings, activePage.cleanupStrokes, activePage.paperSize);
  };

  // Sliders update from Adjust Sheet
  const handleChangeAdjustSettings = (newSettings: FilterSettings) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePage.id ? { ...p, settings: newSettings, mode: 'custom' } : p
      )
    );
    triggerDebouncedProcess(activePage, newSettings);
  };

  // Apply settings across ALL pages
  const handleApplyToAllPages = async (settings: FilterSettings, mode: PresetMode) => {
    setLoadingState({
      isLoading: true,
      message: 'Applying settings to all pages...',
      subMessage: `Updating ${pages.length} document pages in background`,
    });

    try {
      pushHistory(pages);
      const updatedPages = [...pages];
      for (let i = 0; i < updatedPages.length; i++) {
        const p = updatedPages[i];
        const s = { ...settings, rotation: p.settings.rotation };
        const { processedCanvas, dataUrl, thumbnailUrl } = await processDocumentPage(
          p.originalImage,
          p.corners,
          s,
          p.cleanupStrokes,
          p.paperSize
        );
        updatedPages[i] = {
          ...p,
          settings: s,
          mode,
          processedCanvas,
          processedDataUrl: dataUrl,
          thumbnailUrl,
          status: 'ready',
        };
      }
      setPages(updatedPages);
    } finally {
      setLoadingState({ isLoading: false, message: '' });
    }
  };

  // Apply Crop corners from Crop Modal
  const handleApplyCrop = (newCorners: Quadrilateral) => {
    if (!activePage) return;
    setIsCropModalOpen(false);
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, corners: newCorners } : p))
    );
    reprocessPage(activePage, newCorners, activePage.settings, activePage.cleanupStrokes, activePage.paperSize);
  };

  // Apply Clean Up Strokes
  const handleApplyCleanup = (strokes: CleanupStroke[]) => {
    if (!activePage) return;
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, cleanupStrokes: strokes } : p))
    );
    reprocessPage(activePage, activePage.corners, activePage.settings, strokes, activePage.paperSize);
  };

  // Apply Paper Size
  const handleApplyPaperSize = (paperSize: PaperSize) => {
    if (!activePage) return;
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, paperSize } : p))
    );
    reprocessPage(activePage, activePage.corners, activePage.settings, activePage.cleanupStrokes, paperSize);
  };

  // Auto detect corners
  const handleAutoDetectCorners = () => {
    if (!activePage) return null;
    return detectDocumentCorners(activePage.originalImage);
  };

  // Rotate active page 90 degrees
  const handleRotateActivePage = () => {
    if (!activePage) return;
    pushHistory(pages);
    const nextRot = (activePage.settings.rotation + 90) % 360;
    const newSettings = { ...activePage.settings, rotation: nextRot };

    setPages((prev) =>
      prev.map((item, idx) =>
        idx === activePageIndex ? { ...item, settings: newSettings } : item
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
            {/* Center Document Stage */}
            <main className="flex-1 relative overflow-hidden bg-[#0d0d11]">
              <AdobeDocumentStage
                originalDataUrl={activePage.originalDataUrl}
                processedDataUrl={activePage.processedDataUrl}
                status={activePage.status}
                pageIndex={activePageIndex}
                totalPages={pages.length}
                onOpenCrop={() => setIsCropModalOpen(true)}
              />
            </main>

            {/* Docked Filmstrip Carousel if >1 page */}
            {pages.length > 1 && (
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
                    prev.map((item, i) => (i === idx ? { ...item, settings: newSettings } : item))
                  );
                  reprocessPage(p, p.corners, newSettings, p.cleanupStrokes, p.paperSize);
                }}
                onOpenReorder={() => setIsReorderModalOpen(true)}
              />
            )}

            {/* Bottom Adobe Tool Ribbon */}
            <AdobeBottomToolbar
              page={activePage}
              pageIndex={activePageIndex}
              totalPages={pages.length}
              onOpenAdd={() => setIsAddMenuOpen(true)}
              onOpenReorder={() => setIsReorderModalOpen(true)}
              onOpenCrop={() => setIsCropModalOpen(true)}
              onRotate={handleRotateActivePage}
              onOpenFilters={() => setIsFiltersModalOpen(true)}
              onOpenCleanup={() => setIsCleanupModalOpen(true)}
              onOpenAdjust={() => setIsAdjustModalOpen(true)}
              onOpenResize={() => setIsResizeModalOpen(true)}
              onDelete={() => handleDeletePage(activePageIndex)}
              onPrevPage={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              onNextPage={() => setActivePageIndex((p) => Math.min(pages.length - 1, p + 1))}
            />
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
          image={activePage.originalImage}
          initialCorners={activePage.corners}
          onAutoDetect={handleAutoDetectCorners}
          onRotateSource={handleRotateActivePage}
        />
      )}

      {/* Adobe Filters Preset Drawer */}
      {activePage && (
        <AdobeFilterSheet
          isOpen={isFiltersModalOpen}
          onClose={() => setIsFiltersModalOpen(false)}
          currentMode={activePage.mode}
          onSelectPreset={handleSelectPreset}
          onApplyToAllPages={handleApplyToAllPages}
          currentSettings={activePage.settings}
          pageIndex={activePageIndex}
          totalPages={pages.length}
        />
      )}

      {/* Adjust Sliders Drawer */}
      {activePage && (
        <AdobeAdjustSheet
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          settings={activePage.settings}
          mode={activePage.mode}
          pageIndex={activePageIndex}
          totalPages={pages.length}
          onChangeSettings={handleChangeAdjustSettings}
          onApplyToAllPages={handleApplyToAllPages}
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

      {/* Paper Standard Resize Modal */}
      {activePage && (
        <AdobeResizeModal
          isOpen={isResizeModalOpen}
          onClose={() => setIsResizeModalOpen(false)}
          currentSize={activePage.paperSize || 'a4'}
          onSelectSize={handleApplyPaperSize}
          pageIndex={activePageIndex}
          totalPages={pages.length}
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
            prev.map((item, i) => (i === idx ? { ...item, settings: newSettings } : item))
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
