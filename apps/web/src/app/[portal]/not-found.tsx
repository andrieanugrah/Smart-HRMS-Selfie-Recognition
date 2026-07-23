import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto pt-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Halaman tidak ditemukan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              URL yang Anda buka tidak tersedia.
            </p>
          </div>
          <Link href="/">
            <Button>Kembali ke Beranda</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
