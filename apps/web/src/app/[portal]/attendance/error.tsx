'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto pt-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Gagal memuat Presensi</h2>
            <p className="text-sm text-muted-foreground mt-1">{error.message || 'Terjadi kesalahan.'}</p>
          </div>
          <Button onClick={reset} className="gap-2"><RefreshCw className="w-4 h-4" /> Coba lagi</Button>
        </CardContent>
      </Card>
    </div>
  );
}
