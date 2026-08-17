import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart HRMS & Selfie Recognition',
    short_name: 'Smart HRMS',
    description: 'Sistem manajemen SDM modern dengan verifikasi absensi wajah',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#0d9488',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
