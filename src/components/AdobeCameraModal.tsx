import React, { useRef, useEffect, useState } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Grid, 
  Check, 
  AlertCircle,
  FileText,
  CreditCard,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface AdobeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

type CameraDocMode = 'document' | 'id_card' | 'whiteboard' | 'book';

export const AdobeCameraModal: React.FC<AdobeCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedCount, setCapturedCount] = useState(0);
  const [lastCapturedThumb, setLastCapturedThumb] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [docMode, setDocMode] = useState<CameraDocMode>('document');
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMsg('Unable to access camera. Please check permissions or upload photos instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // Flash animation
    setFlash(true);
    setTimeout(() => setFlash(false), 140);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setLastCapturedThumb(dataUrl);
    setCapturedCount((c) => c + 1);
    onCapture(dataUrl);
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        const nextTorch = !torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchEnabled(nextTorch);
      } else {
        alert('Torch / Flashlight is not supported on this device camera.');
      }
    } catch (e) {
      console.warn('Torch failed', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Floating Camera Controls Bar */}
      <div className="h-16 px-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-30">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-zinc-300">
          <Sparkles className="w-3.5 h-3.5 text-[#1473E6]" />
          <span>Adobe Auto-Capture</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              torchEnabled ? 'bg-amber-500 text-black' : 'bg-black/50 text-white hover:bg-black/80'
            }`}
            title="Toggle Flash / Torch"
          >
            {torchEnabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              showGrid ? 'bg-[#1473E6] text-white' : 'bg-black/50 text-white hover:bg-black/80'
            }`}
            title="Toggle alignment grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Flip camera */}
          <button
            onClick={handleToggleCamera}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
            title="Flip camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Scanning Boundary Overlay */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {errorMsg ? (
          <div className="p-6 text-center text-zinc-400 space-y-3 max-w-xs">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-xs sm:text-sm text-zinc-300">{errorMsg}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 text-xs font-bold bg-[#1473E6] text-white rounded-lg cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Shutter Flash Animation Overlay */}
            {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none" />}

            {/* Optional 3x3 Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            )}

            {/* Animated Adobe Scan Glowing Boundary Frame */}
            <div className="absolute inset-8 sm:inset-14 border-2 border-[#1473E6]/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10 transition-all">
              {/* Corner brackets */}
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 border-t-4 border-l-4 border-[#1473E6] -mt-1 -ml-1 rounded-tl-lg" />
                <div className="w-6 h-6 border-t-4 border-r-4 border-[#1473E6] -mt-1 -mr-1 rounded-tr-lg" />
              </div>

              {/* Center Banner Guidance */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#1473E6]/40 text-blue-200 text-xs font-semibold shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#1473E6] animate-ping" />
                  <span>Looking for document edges...</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="w-6 h-6 border-b-4 border-l-4 border-[#1473E6] -mb-1 -ml-1 rounded-bl-lg" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-[#1473E6] -mb-1 -mr-1 rounded-br-lg" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Shutter & Multi-Page Stack Toolbar */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 flex flex-col gap-4 z-30">
        {/* Document Type Selector Ribbon */}
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-zinc-400 overflow-x-auto custom-scrollbar">
          {[
            { id: 'document', label: 'Document' },
            { id: 'id_card', label: 'ID Card' },
            { id: 'whiteboard', label: 'Whiteboard' },
            { id: 'book', label: 'Book / Notes' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDocMode(mode.id as CameraDocMode)}
              className={`pb-1 uppercase tracking-wider transition-colors cursor-pointer ${
                docMode === mode.id
                  ? 'text-white border-b-2 border-[#1473E6] font-extrabold'
                  : 'hover:text-zinc-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Main Shutter Row */}
        <div className="flex items-center justify-between max-w-sm mx-auto w-full">
          {/* Captured Stack Thumbnail (Bottom-Left) */}
          <div className="w-14 h-14 flex items-center justify-center">
            {capturedCount > 0 && lastCapturedThumb ? (
              <div 
                onClick={onClose}
                className="relative w-12 h-12 rounded-xl border-2 border-white overflow-hidden shadow-2xl cursor-pointer group hover:scale-105 active:scale-95 transition-transform"
                title="Review captured pages"
              >
                <img
                  src={lastCapturedThumb}
                  alt="Last Snap"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-blue-600/30 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-0 right-0 bg-[#1473E6] text-white text-[10px] font-mono font-bold px-1 rounded-tl">
                  {capturedCount}
                </div>
              </div>
            ) : null}
          </div>

          {/* Large Shutter Button */}
          <button
            onClick={handleSnap}
            disabled={!!errorMsg}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md p-1.5 flex items-center justify-center hover:scale-105 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 shadow-2xl"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
              <div className="w-14 h-14 rounded-full border-2 border-black/20 bg-gradient-to-tr from-[#1473E6] to-[#0284c7] flex items-center justify-center text-white shadow-md">
                <Camera className="w-6 h-6" />
              </div>
            </div>
          </button>

          {/* Done / Review Button (Bottom-Right) */}
          <div className="w-14 h-14 flex items-center justify-center">
            {capturedCount > 0 ? (
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-[#1473E6] text-white text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-[#0d66d0] active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
