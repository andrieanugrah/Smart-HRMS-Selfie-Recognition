'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
}

export function useCamera({ facingMode = 'user' }: UseCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<CameraStatus>('idle');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stop = useCallback(() => {
    const video = videoRef.current;
    const attached = video?.srcObject as MediaStream | null;
    attached?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    statusRef.current = 'idle';
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setError('Browser tidak mendukung kamera');
      setStatus('error');
      return;
    }

    // Idempotent guard — protects against React Strict Mode double-invocation
    // and rapid clicks while a getUserMedia call is in flight.
    if (statusRef.current === 'requesting' || statusRef.current === 'ready') return;

    setStatus('requesting');
    statusRef.current = 'requesting';
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      statusRef.current = 'ready';
      setStatus('ready');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        statusRef.current = 'denied';
        setStatus('denied');
        setError('Izin kamera ditolak. Harap izinkan akses di browser.');
      } else {
        statusRef.current = 'error';
        setStatus('error');
        setError(e?.message || 'Gagal mengakses kamera');
      }
    }
  }, [facingMode]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, status, error: error, start, stop };
}
