'use client';

import { useState, useCallback } from 'react';
import { getDecryptedImageUrl } from '@/app/actions/images';
import { toast } from 'sonner';

interface ReceiptLinkProps {
  url: string | null | undefined;
  label?: string;
}

export function ReceiptLink({ url, label = 'Lihat Bukti Nota' }: ReceiptLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (!url || loading) return;
    setLoading(true);
    try {
      const decrypted = await getDecryptedImageUrl(url, true);
      if (!decrypted) {
        toast.error('Akses bukti tidak diizinkan');
        return;
      }
      window.open(decrypted, '_blank', 'noopener noreferrer');
    } catch {
      toast.error('Gagal membuka bukti');
    } finally {
      setLoading(false);
    }
  }, [url, loading]);

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-primary hover:underline block text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Membuka...' : label} ↗
    </button>
  );
}
