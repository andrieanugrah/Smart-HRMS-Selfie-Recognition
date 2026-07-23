'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FaceCapture } from '@/components/face/face-capture';
import { registerFace, deleteMyFace } from '@/app/actions/face';

interface FaceRegisterProps {
  isRegistered: boolean;
  onChange?: () => void;
}

const STEPS = 3;

export function FaceRegister({ isRegistered, onChange }: FaceRegisterProps) {
  const [open, setOpen] = useState(false);
  const [samples, setSamples] = useState<{ descriptor: number[]; imageDataUrl: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function addSample(data: { descriptor: Float32Array; imageDataUrl: string }) {
    setSamples((prev) => [
      ...prev,
      {
        descriptor: Array.from(data.descriptor),
        imageDataUrl: data.imageDataUrl,
      },
    ]);
  }

  async function handleSave() {
    if (samples.length === 0) return;
    setSaving(true);
    const res = await registerFace({
      descriptors: samples.map((s) => s.descriptor),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Wajah berhasil didaftarkan (${samples.length} sample)`);
      setOpen(false);
      setSamples([]);
      onChange?.();
    } else {
      toast.error(res.error);
    }
  }

  async function handleRemove() {
    const res = await deleteMyFace();
    if (res.ok) {
      toast.success('Data wajah dihapus');
      onChange?.();
    } else {
      toast.error(res.error);
    }
    setConfirmRemove(false);
  }

  function reset() {
    setSamples([]);
  }

  return (
    <div className="flex gap-2 w-full">
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogTrigger asChild>
          <Button variant={isRegistered ? 'outline' : 'default'} className="flex-1 gap-2">
            <Camera className="w-4 h-4" />
            {isRegistered ? 'Perbarui Wajah' : 'Daftarkan Wajah'}
          </Button>
        </DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Daftarkan Wajah</DialogTitle>
            <DialogDescription>
              Ambil {STEPS} foto dari sudut berbeda untuk akurasi lebih baik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {Array.from({ length: STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < samples.length ? 'bg-success' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {samples.length}/{STEPS} foto diambil
            </p>

            {/* Captured samples */}
            {samples.length > 0 && (
              <div className="flex gap-2 justify-center animate-in fade-in-0" style={{ animationDuration: '300ms' }}>
                {samples.map((s, i) => (
                  <div
                    key={i}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-success"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.imageDataUrl}
                      alt={`Sample ${i + 1}`}
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {samples.length < STEPS ? (
              <FaceCapture
                onCapture={addSample}
                captureButtonLabel={`Ambil Foto ${samples.length + 1}`}
                prompt={`Sample ${samples.length + 1}/${STEPS} — Hadap kamera`}
                autoStart
              />
            ) : (
              <div className="text-center py-6 space-y-3">
                <Check className="w-12 h-12 text-success mx-auto" />
                <p className="font-medium">Semua foto siap!</p>
                <p className="text-sm text-muted-foreground">
                  Klik Simpan untuk mendaftarkan wajah Anda.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={reset} disabled={samples.length === 0 || saving}>
                Ulangi
              </Button>
              <Button
                onClick={handleSave}
                disabled={samples.length === 0 || saving}
                className="flex-1 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isRegistered && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setConfirmRemove(true)}
          title="Hapus data wajah"
          aria-label="Hapus data wajah"
        >
          <Trash2 className="w-4 h-4 text-danger" />
        </Button>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Hapus data wajah?"
        description="Tindakan ini tidak dapat dibatalkan. Anda harus mendaftarkan ulang wajah untuk dapat absen."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleRemove}
      />
    </div>
  );
}
