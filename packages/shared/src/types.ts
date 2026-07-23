export type Role = 'employee' | 'hrd' | 'admin';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day';
export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'other';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type NotificationType = 'info' | 'approval' | 'rejection' | 'attendance';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  phone: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  selfie_url: string | null;
  selfie_match: boolean | null;
  confidence: number | null;
  status: AttendanceStatus;
  location: { lat: number; lng: number } | null;
  notes: string | null;
}

export interface Leave {
  id: string;
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: RequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface Overtime {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  reason: string;
  status: RequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FaceDescriptor {
  id: string;
  user_id: string;
  descriptor: number[];
  image_url: string | null;
  is_active: boolean;
}

export interface DashboardStats {
  total_employees: number;
  present_today: number;
  late_today: number;
  on_leave_today: number;
  absent_today: number;
  pending_approvals: number;
}
