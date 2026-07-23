import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeStyle: 'short',
  }).format(new Date(date));
}

/** Map status strings to semantic CSS token classes. Uses @theme tokens, no hardcoded Tailwind. */
export function getStatusColor(
  status: string
): { bg: string; text: string } {
  switch (status) {
    case 'pending':
      return { bg: 'bg-warning/15', text: 'text-warning-foreground' };
    case 'approved':
    case 'present':
      return { bg: 'bg-success/15', text: 'text-success-foreground' };
    case 'rejected':
      return { bg: 'bg-danger/15', text: 'text-danger-foreground' };
    case 'late':
      return { bg: 'bg-warning/15', text: 'text-warning-foreground' };
    case 'absent':
    case 'half_day':
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
    case 'cancelled':
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
}

/** Map status to human-readable Indonesian label */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Menunggu';
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'cancelled': return 'Dibatalkan';
    case 'present': return 'Hadir';
    case 'late': return 'Terlambat';
    case 'absent': return 'Tidak Hadir';
    case 'half_day': return 'Setengah Hari';
    default: return status;
  }
}

/** Map leave type to Indonesian label */
export function getLeaveTypeLabel(type: string): string {
  switch (type) {
    case 'annual': return 'Cuti Tahunan';
    case 'sick': return 'Sakit';
    case 'personal': return 'Cuti Pribadi';
    case 'maternity': return 'Cuti Melahirkan';
    case 'other': return 'Lainnya';
    default: return type;
  }
}

/** Time-aware greeting based on current hour */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Generate initials from full name (max 2 chars) */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Deterministic gradient pair from name string (for avatars) */
export function getAvatarGradient(name: string): string {
  if (!name) return 'from-primary to-secondary';
  const code = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradients = [
    'from-primary to-secondary',
    'from-primary-dark to-primary',
    'from-primary to-primary-light',
    'from-primary-dark to-primary-light',
    'from-secondary to-primary',
    'from-primary to-primary-dark',
  ];
  return gradients[code % gradients.length];
}

