import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Smart HRMS — Sistem Manajemen SDM & Absensi Selfie Wajah',
    template: '%s | Smart HRMS',
  },
  description:
    'Sistem manajemen sumber daya manusia modern dengan pengenalan wajah on-device (face-api.js), manajemen cuti, lembur, dan analistik HRD real-time.',
  keywords: [
    'Smart HRMS',
    'HRIS Indonesia',
    'Absensi Wajah',
    'Selfie Recognition',
    'Manajemen Cuti',
    'Overtime Approval',
    'Face API',
    'HR Dashboard',
  ],
  authors: [{ name: 'Smart HRMS Team' }],
  creator: 'Smart HRMS',
  publisher: 'Smart HRMS',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: appUrl,
    title: 'Smart HRMS — Sistem Manajemen SDM & Absensi Wajah',
    description:
      'Kelola kehadiran karyawan, verifikasi presensi wajah lokal di browser, pengajuan cuti, dan lembur secara real-time.',
    siteName: 'Smart HRMS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart HRMS — Sistem Manajemen SDM & Absensi Wajah',
    description:
      'Platform HRMS modern Indonesia dengan verifikasi selfie wajah on-device dan alur kerja real-time.',
  },
  icons: {
    icon: '/logo-mark.svg',
    shortcut: '/logo-mark.svg',
    apple: '/logo-mark.svg',
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={`${poppins.variable}`}>
      <body className={`${poppins.className} bg-background text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

