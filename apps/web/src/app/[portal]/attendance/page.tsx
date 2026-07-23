'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Camera, CheckCircle, Scan, MapPin, Clock, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { FaceCapture } from '@/components/face/face-capture';
import {
  isWithinOfficeRadius,
  distanceFromOffice,
  getOfficeRadius,
} from '@/lib/hooks/use-geolocation';
import { compareDescriptors } from '@/lib/face-api/compare-face';
import {
  checkIn,
  checkOut,
  getMyFaceDescriptor,
  getMyTodayAttendance,
  listAttendanceForHRD,
} from '@/app/actions/attendance';
import { formatDate, formatTime, getStatusLabel } from '@/lib/utils';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

function getCurrentPositionWithTimeout(timeoutMs = 6000): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(pos);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

export default function AttendancePage() {
  const params = useParams();
  const portal = params.portal as string;

  if (portal === 'hrd') return <HRDAttendance />;
  return <EmployeeAttendance />;
}

// ─── EMPLOYEE ATTENDANCE ──────────────────────────────────────────────────

function EmployeeAttendance() {
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const data = await withTimeout(getMyTodayAttendance(), 6_000, 'load-today');
      if (aliveRef.current) setTodayRecord(data ?? null);
    } catch {
      if (aliveRef.current) toast.warning('Gagal memuat data absen hari ini');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  async function handleFaceCapture(data: {
    descriptor: Float32Array;
    imageDataUrl: string;
  }) {
    setCheckingIn(true);

    const overallTimer = window.setTimeout(() => {
      if (aliveRef.current) {
        toast.error('Absen memakan waktu terlalu lama. Coba lagi.');
        setCheckingIn(false);
      }
    }, 20_000);

    try {
      const stored = await withTimeout(getMyFaceDescriptor(), 8_000, 'get-descriptor').catch(
        () => null
      );
      if (!aliveRef.current) return;
      if (!stored?.descriptor) {
        toast.error('Wajah belum terdaftar. Silakan daftarkan di halaman Profil.');
        return;
      }

      const comparison = compareDescriptors(
        Array.from(data.descriptor),
        stored.descriptor as number[]
      );
      if (!comparison.match) {
        toast.error(`Wajah tidak cocok (jarak: ${comparison.distance.toFixed(3)}). Coba lagi.`);
        return;
      }

      const pos = await getCurrentPositionWithTimeout(6000);
      if (!aliveRef.current) return;

      let location: { lat: number; lng: number } | null = null;
      if (pos) {
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const dist = distanceFromOffice(location);
        if (!isWithinOfficeRadius(location)) {
          toast.warning(
            `Anda ${Math.round(dist)}m dari kantor (radius: ${getOfficeRadius()}m). Absen tetap dicatat.`
          );
        }
      } else {
        toast.warning('Lokasi tidak tersedia. Absen dicatat tanpa verifikasi lokasi.');
      }

      const result = await withTimeout(
        checkIn({
          descriptor: Array.from(data.descriptor),
          confidence: 1 - comparison.distance,
          selfie_url: null,
          imageDataUrl: data.imageDataUrl,
          location,
        }),
        12_000,
        'check-in'
      );
      if (!aliveRef.current) return;

      if (result.ok) {
        toast.success('Absensi berhasil dicatat!');
        setTodayRecord((prev: any) => ({
          ...(prev ?? {}),
          id: result.data.id,
          status: result.data.status,
          check_in: prev?.check_in ?? new Date().toISOString(),
          check_out: prev?.check_out ?? null,
        }));
        setShowCamera(false);
        void loadToday().catch(() => undefined);
      } else {
        toast.error(result.error);
      }
    } catch (e: any) {
      if (!aliveRef.current) return;
      const message = e?.message || 'Gagal melakukan absensi';
      if (/timed out/.test(message)) {
        toast.error('Koneksi lambat, coba lagi.');
      } else {
        toast.error(message);
      }
    } finally {
      window.clearTimeout(overallTimer);
      if (aliveRef.current) setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingIn(true);
    try {
      const result = await withTimeout(checkOut(), 10_000, 'check-out');
      if (!aliveRef.current) return;
      if (result.ok) {
        toast.success('Check-out berhasil!');
        setTodayRecord((prev: any) =>
          prev
            ? { ...prev, check_out: new Date().toISOString() }
            : { check_out: new Date().toISOString() }
        );
        void loadToday().catch(() => undefined);
      } else {
        toast.error(result.error);
      }
    } catch (e: any) {
      if (!aliveRef.current) return;
      toast.error(/timed out/.test(e?.message ?? '') ? 'Koneksi lambat, coba lagi.' : e?.message);
    } finally {
      if (aliveRef.current) setCheckingIn(false);
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto space-y-6">
          <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
          <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        </div>
      </PageTransition>
    );
  }

  const hasCheckedIn = !!todayRecord;
  const hasCheckedOut = !!todayRecord?.check_out;

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Presensi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 flex flex-col items-center gap-4">
            {hasCheckedIn ? (
              <>
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-success" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    {getStatusLabel(todayRecord.status)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Masuk: {formatTime(todayRecord.check_in)}
                  </p>
                  {hasCheckedOut && (
                    <p className="text-sm text-muted-foreground">
                      Pulang: {formatTime(todayRecord.check_out)}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Belum Absen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gunakan selfie untuk absensi
                  </p>
                </div>
              </>
            )}
          </div>

          <CardContent className="p-6 space-y-3">
            {hasCheckedOut ? (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">Absensi hari ini sudah lengkap</p>
              </div>
            ) : showCamera ? (
              <FaceCapture
                onCapture={handleFaceCapture}
                captureButtonLabel="Ambil & Absen"
                autoStart
                processing={checkingIn}
              />
            ) : hasCheckedIn ? (
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleCheckOut}
                disabled={checkingIn}
              >
                {checkingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                {checkingIn ? 'Memproses...' : 'Check-out (Pulang)'}
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="w-5 h-5" /> Mulai Absen
              </Button>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Lokasi
              </span>
              <span className="flex items-center gap-1">
                <Scan className="w-3 h-3" /> Face Match
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

// ─── HRD ATTENDANCE ───────────────────────────────────────────────────────

function HRDAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await withTimeout(
        listAttendanceForHRD({ date: dateFilter }),
        8_000,
        'list-attendance'
      );
      if (aliveRef.current) setRecords(data);
    } catch {
      if (aliveRef.current) toast.warning('Gagal memuat data presensi');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Presensi</h1>
          <p className="text-sm text-muted-foreground mt-1">Rekap absensi seluruh karyawan</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={loadRecords}>Tampilkan</Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Tidak ada data presensi"
            description="Pilih tanggal lain atau belum ada absensi pada tanggal ini."
          />
        ) : (
          <div className="space-y-3">
            {records.map((rec: any) => (
              <Card key={rec.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {rec.selfie_url ? (
                        <img
                          src={rec.selfie_url}
                          alt="Selfie"
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <Avatar name={rec.profiles?.full_name ?? '-'} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{rec.profiles?.full_name ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.profiles?.nip ?? '-'} · {rec.profiles?.department ?? '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Masuk: {formatTime(rec.check_in)}
                          {rec.check_out ? ` · Pulang: ${formatTime(rec.check_out)}` : ''}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={rec.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
