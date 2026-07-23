'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle, Loader2, Scan, AlertCircle, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/lib/hooks/use-camera';
import { useFaceApi } from '@/lib/hooks/use-face-api';
import { detectFace } from '@/lib/face-api/detect-face';

interface FaceCaptureProps {
  onCapture: (data: { descriptor: Float32Array; imageDataUrl: string }) => void;
  prompt?: string;
  captureButtonLabel?: string;
  autoStart?: boolean;
  /**
   * Driven by the parent to pause the detection loop while the parent is
   * still processing the captured frame (e.g. awaiting checkIn server action).
   */
  processing?: boolean;
  allowCameraSwitch?: boolean;
}

const PREVIEW_FPS = 6;
const DETECTION_STABLE_FRAMES = 2;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function FaceCapture({
  onCapture,
  prompt = 'Posisikan wajah Anda di tengah frame',
  captureButtonLabel = 'Ambil Foto',
  autoStart = true,
  processing = false,
  allowCameraSwitch = true,
}: FaceCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const { videoRef, status, error: camError, start, stop } = useCamera({ facingMode });
  const faceApi = useFaceApi();
  const [detected, setDetected] = useState(false);
  const detectedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const loopActiveRef = useRef(false);
  const visibleRef = useRef(typeof document === 'undefined' ? true : !document.hidden);
  const lastTickRef = useRef(0);
  const stableCountRef = useRef(0);
  const lastCanvasDimsRef = useRef<{ w: number; h: number } | null>(null);
  const lastBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!autoStart) return;
    if (status === 'idle') start();
  }, [autoStart, status, start]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      loopActiveRef.current = false;
      const video = videoRef.current;
      const attached = video?.srcObject as MediaStream | null;
      attached?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      stop();
    };
  }, [stop, videoRef]);

  const runDetectionLoop = useCallback(
    async (timestamp: number) => {
      if (!loopActiveRef.current || !visibleRef.current) return;
      const video = videoRef.current;
      const minInterval = 1000 / PREVIEW_FPS;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      if (timestamp - lastTickRef.current < minInterval) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }
      lastTickRef.current = timestamp;

      if (processingRef.current) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      try {
        const result = await detectFace(video);
        if (!loopActiveRef.current) return;

        const hasFace = !!result.descriptor;
        stableCountRef.current = hasFace
          ? Math.min(DETECTION_STABLE_FRAMES, stableCountRef.current + 1)
          : Math.max(0, stableCountRef.current - 1);
        const stableFace = stableCountRef.current >= DETECTION_STABLE_FRAMES;
        if (stableFace !== detectedRef.current) {
          detectedRef.current = stableFace;
          setDetected(stableFace);
        }

        const canvas = canvasRef.current;
        if (canvas && result.detection) {
          const dims = { w: video.videoWidth, h: video.videoHeight };
          if (
            !lastCanvasDimsRef.current ||
            lastCanvasDimsRef.current.w !== dims.w ||
            lastCanvasDimsRef.current.h !== dims.h
          ) {
            canvas.width = dims.w;
            canvas.height = dims.h;
            lastCanvasDimsRef.current = dims;
          }
          const box = (result.detection as { box: { x: number; y: number; width: number; height: number } }).box;
          if (!box) {
            rafRef.current = requestAnimationFrame(runDetectionLoop);
            return;
          }
          const lastBox = lastBoxRef.current;
          const moved =
            !lastBox ||
            Math.abs(lastBox.x - box.x) > 2 ||
            Math.abs(lastBox.y - box.y) > 2 ||
            Math.abs(lastBox.w - box.width) > 2 ||
            Math.abs(lastBox.h - box.height) > 2;

          const ctx = canvas.getContext('2d');
          if (ctx && moved) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = stableFace ? '#10b981' : '#0d9488';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            lastBoxRef.current = { x: box.x, y: box.y, w: box.width, h: box.height };
          }
        }
      } catch (error) {
        if (!loopActiveRef.current) return;
        console.warn('[face-capture] detection failed', error);
      }

      if (loopActiveRef.current) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
      }
    },
    [videoRef]
  );

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    if (status === 'ready' && faceApi.loaded && !loopActiveRef.current) {
      loopActiveRef.current = true;
      rafRef.current = requestAnimationFrame(runDetectionLoop);
    }
    if ((status !== 'ready' || !faceApi.loaded) && loopActiveRef.current) {
      loopActiveRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    }
    // runDetectionLoop is stable for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, faceApi.loaded]);

  useEffect(() => {
    function onVisibility() {
      const visible = !document.hidden;
      visibleRef.current = visible;
      if (!visible) {
        // Pause rAF without dropping loopActive so we can resume seamlessly.
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        return;
      }
      if (loopActiveRef.current && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [runDetectionLoop]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const result = await detectFace(video);
      if (!loopActiveRef.current) return;
      if (!result.descriptor) {
        toastNoFace();
        processingRef.current = false;
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        processingRef.current = false;
        return;
      }
      ctx.drawImage(video, 0, 0);
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
      if (!blob) {
        processingRef.current = false;
        return;
      }
      const dataUrl = await blobToDataUrl(blob);
      onCapture({ descriptor: result.descriptor, imageDataUrl: dataUrl });
      // Keep processingRef true while the parent finishes its server action;
      // the parent signals completion via the `processing` prop.
    } catch (error) {
      console.warn('[face-capture] capture failed', error);
      processingRef.current = false;
    }
  }, [videoRef, onCapture]);

  function toastNoFace() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('hrms:facecapture:no-face'));
  }

  const errorBanner = faceApi.error;
  const canCapture = status === 'ready' && !processing;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square md:aspect-[4/3] max-w-md mx-auto rounded-3xl overflow-hidden border border-border/70 bg-card shadow-elev-lg">
        {status === 'ready' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-6 inset-y-4 rounded-[40%] border border-white/30 border-dashed" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
            </div>
            {allowCameraSwitch && (
              <button
                type="button"
                aria-label="Ganti kamera"
                onClick={() => {
                  stop();
                  setFacingMode((m) => (m === 'user' ? 'environment' : 'user'));
                }}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/55 text-white border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-black/70"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <div className="absolute top-4 left-4 right-16 flex items-center justify-center">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-colors ${
                  detected
                    ? 'bg-success text-success-foreground shadow-lg shadow-success/30'
                    : 'bg-black/55 text-white border border-white/10'
                }`}
              >
                {detected ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Wajah terdeteksi
                  </>
                ) : faceApi.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat model...
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5 animate-pulse" /> {prompt}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {status === 'requesting' || faceApi.loading ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {faceApi.loading ? 'Memuat model...' : 'Menyiapkan kamera...'}
                </p>
              </>
            ) : camError ? (
              <>
                <AlertCircle className="w-10 h-10 text-danger" />
                <p className="text-sm text-danger">{camError}</p>
                <Button variant="outline" onClick={start}>Coba Lagi</Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center shadow-[0_18px_35px_-12px_rgba(13,148,136,0.55)]">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm text-muted-foreground">{prompt}</p>
                <Button onClick={start} className="gap-2 shadow-lg shadow-primary/30">
                  <Camera className="w-4 h-4" /> Buka Kamera
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {errorBanner && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-2 text-xs text-danger">
          {errorBanner}
        </div>
      )}

      {status === 'ready' && !faceApi.loading && (
        <Button
          onClick={handleCapture}
          disabled={!canCapture}
          variant="gradient"
          className="w-full gap-2"
          size="lg"
        >
          {processing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
          {processing ? 'Memproses...' : captureButtonLabel}
        </Button>
      )}
    </div>
  );
}
