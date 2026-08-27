import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, Check, Zap, AlertCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedCount, setCapturedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

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
      setErrorMsg('Unable to access camera. Please check permissions or upload an image.');
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
    setTimeout(() => setFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setCapturedCount((c) => c + 1);
    onCapture(dataUrl);
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between z-10 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Camera Scanner Mode</h3>
            {capturedCount > 0 && (
              <span className="text-[11px] bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-medium">
                {capturedCount} Captured
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleCamera}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Stage with Document Alignment Frame */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px]">
          {errorMsg ? (
            <div className="p-6 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs sm:text-sm">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg"
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

              {/* Shutter Flash effect */}
              {flash && <div className="absolute inset-0 bg-white z-20 pointer-events-none" />}

              {/* Alignment Document Guide Frame */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-sky-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="flex justify-between text-[11px] font-mono text-sky-300 font-semibold tracking-wider">
                  <span>[ DOCUMENT FRAME ]</span>
                  <span>ALIGN PAGE</span>
                </div>
                <div className="text-center text-[10px] text-sky-200 bg-sky-950/70 py-1 px-3 rounded-full mx-auto backdrop-blur-xs">
                  Place paper within box under bright, even light
                </div>
              </div>
            </>
          )}
        </div>

        {/* Shutter Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Done ({capturedCount})
          </button>

          <button
            onClick={handleSnap}
            disabled={!!errorMsg}
            className="w-16 h-16 rounded-full bg-white border-4 border-slate-700 shadow-xl flex items-center justify-center hover:scale-105 active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Camera className="w-6 h-6" />
            </div>
          </button>

          <div className="w-16" />
        </div>
      </div>
    </div>
  );
};
