'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, CalendarCheck, Clock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const featureList = [
  { icon: Camera, text: 'Absensi selfie otomatis' },
  { icon: CalendarCheck, text: 'Manajemen cuti & izin' },
  { icon: Clock, text: 'Approval lembur real-time' },
  { icon: ShieldCheck, text: 'Verifikasi wajah face-api' },
];

function getPortalForRole(role: string | undefined): 'employee' | 'hrd' {
  if (role === 'hrd' || role === 'admin') return 'hrd';
  return 'employee';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email atau password salah');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/session');
    const session = await res.json();
    const portal = getPortalForRole(session?.user?.role);
    router.push(`/${portal}/dashboard`);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] gradient-brand relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 pattern-grid opacity-15 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/25">
              <span className="text-white font-bold">HR</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Smart HRMS</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-display leading-[1.05] text-white">
            Kelola SDM dengan lebih cerdas dan efisien
          </h2>
          <p className="text-white/80 leading-relaxed max-w-[40ch]">
            Platform manajemen sumber daya manusia dengan presensi berbasis pengenalan wajah.
            Tingkatkan akurasi dan produktivitas tim Anda.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {featureList.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-md border border-white/15"
              >
                <f.icon className="w-5 h-5 text-white/90 shrink-0" />
                <span className="text-sm text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/60 text-xs tracking-wide uppercase">
          Smart HRMS v1.0 · Human Resource Management System
        </p>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-elev-sm">
                <span className="text-white font-bold text-sm">HR</span>
              </div>
              <span className="font-bold text-foreground">Smart HRMS</span>
            </div>
            <ThemeToggle />
          </div>

          <div
            className="animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationFillMode: 'backwards', animationDuration: '400ms' }}
          >
            <h1 className="text-title text-foreground">Masuk</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gunakan akun karyawan Anda untuk melanjutkan
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationFillMode: 'backwards', animationDuration: '400ms', animationDelay: '100ms' }}
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@company.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />

            {error && (
              <div
                className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 animate-in fade-in-0 slide-in-from-bottom-2"
                style={{ animationFillMode: 'backwards', animationDuration: '300ms' }}
              >
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Masuk'}
            </Button>
          </form>

          <div
            className="mt-8 space-y-3 animate-in fade-in-0"
            style={{ animationFillMode: 'backwards', animationDuration: '400ms', animationDelay: '300ms' }}
          >
            <p className="text-xs text-muted-foreground font-medium">Akun demo:</p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Employee', email: 'employee@company.com' },
                { label: 'HRD', email: 'hr@company.com' },
              ].map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword('123456');
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {cred.label === 'HRD' ? 'H' : 'E'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cred.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{cred.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                    Klik untuk isi
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Password: 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
