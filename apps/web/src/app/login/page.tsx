'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, CalendarCheck, Clock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Logo } from '@/components/shared/logo';

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
          <Logo size="lg" showTagline className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/15 inline-flex" />
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
            <Logo size="sm" />
            <ThemeToggle />
          </div>

          <div
            className="animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationFillMode: 'backwards', animationDuration: '400ms' }}
          >
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Selamat datang kembali!</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Masuk untuk melanjutkan ke Smart HRMS
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationFillMode: 'backwards', animationDuration: '400ms', animationDelay: '100ms' }}
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi.santoso@company.co.id"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input type="checkbox" className="rounded border-border text-[#10B981] focus:ring-[#10B981]" />
                <span>Ingat saya</span>
              </label>
              <span className="text-[#0EA5E9] hover:underline cursor-pointer">
                Lupa password?
              </span>
            </div>

            {error && (
              <div
                className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 animate-in fade-in-0 slide-in-from-bottom-2"
                style={{ animationFillMode: 'backwards', animationDuration: '300ms' }}
              >
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-elev-sm transition-all"
              size="lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Masuk'}
            </Button>

            <div className="relative my-6 text-center text-xs text-muted-foreground">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-background px-3 font-medium">atau masuk dengan</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-border/80 hover:bg-muted/50 font-medium text-xs h-10"
              onClick={() => {
                setEmail('hr@company.com');
                setPassword('123456');
              }}
            >
              <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
              <span>SSO Perusahaan (Demo HR)</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
