'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { getDecryptedImageUrl } from '@/app/actions/images';

interface SelfieThumbnailProps {
  url: string | null | undefined;
  encrypted?: boolean;
  name: string;
}

export function SelfieThumbnail({ url, encrypted, name }: SelfieThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (!encrypted && !url.endsWith('.bin')) {
      setSrc(url);
      return;
    }
    setLoading(true);
    getDecryptedImageUrl(url, encrypted)
      .then((decrypted) => setSrc(decrypted))
      .finally(() => setLoading(false));
  }, [url, encrypted]);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center bg-muted">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!src) {
    return <Avatar name={name} size="sm" />;
  }

  return (
    <img
      src={src}
      alt="Selfie"
      className="w-10 h-10 rounded-full object-cover border border-border"
    />
  );
}
