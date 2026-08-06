'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Clock, CalendarDays, Timer, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { DepartmentAnalytics } from 'shared';
import { getDepartmentAnalytics } from '@/app/actions/reports';

export function DepartmentAnalyticsView() {
  const [data, setData] = useState<DepartmentAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDepartmentAnalytics();
      setData(res);
    } catch {
      toast.error('Gagal memuat analistik departemen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> Per-Department Analytics & Performance
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Analisis perbandingan kedisiplinan, tingkat kehadiran, dan lembur per divisi bulan ini
          </CardDescription>
        </div>

        <Button variant="outline" size="sm" onClick={loadAnalytics} className="gap-1.5 h-8 text-xs shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Belum ada data departemen yang terdaftar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((dept) => {
              const isHighPerformance = dept.attendance_rate >= 80;

              return (
                <Card key={dept.department} className="overflow-hidden border border-border/80 hover:shadow-elev-md transition-all">
                  <CardHeader className="bg-primary/5 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        {dept.department}
                      </CardTitle>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {dept.total_employees} Karyawan
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs">
                    {/* Attendance Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">Tingkat Kehadiran:</span>
                        <span className={`font-bold ${isHighPerformance ? 'text-success' : 'text-warning'}`}>
                          {dept.attendance_rate}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighPerformance ? 'bg-success' : 'bg-warning'
                          }`}
                          style={{ width: `${Math.min(100, dept.attendance_rate)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metric Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                      <div className="p-2 rounded-lg bg-muted/40">
                        <Clock className="w-3.5 h-3.5 mx-auto text-warning mb-1" />
                        <span className="text-[10px] text-muted-foreground block">Terlambat</span>
                        <span className="font-bold text-xs">{dept.late_count}x</span>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/40">
                        <CalendarDays className="w-3.5 h-3.5 mx-auto text-info mb-1" />
                        <span className="text-[10px] text-muted-foreground block">Cuti/Izin</span>
                        <span className="font-bold text-xs">{dept.leave_count}x</span>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/40">
                        <Timer className="w-3.5 h-3.5 mx-auto text-success mb-1" />
                        <span className="text-[10px] text-muted-foreground block">Lembur</span>
                        <span className="font-bold text-xs">{dept.overtime_hours} jam</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
