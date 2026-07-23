import Link from 'next/link';

export function LandingFooter({ year }: { year: number }) {
  return (
    <footer className="border-t border-border py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-[10px] tracking-tight">HR</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Smart HRMS</p>
            <p className="text-xs text-muted-foreground">Human Resource Management System</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">Masuk</Link>
          <span className="text-xs">HRMS Indonesia</span>
          <span className="text-xs">© {year} Smart HRMS</span>
        </div>
      </div>
    </footer>
  );
}
