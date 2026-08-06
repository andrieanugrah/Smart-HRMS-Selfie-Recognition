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

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserShift {
  id: string;
  user_id: string;
  shift_id: string;
  date: string;
  shifts?: Shift;
  profiles?: Profile;
}

export interface SalaryComponent {
  id: string;
  user_id: string;
  base_salary: number;
  allowance: number;
  overtime_rate_per_hour: number;
  late_penalty_per_minute: number;
  profiles?: Profile;
}

export interface Payroll {
  id: string;
  user_id: string;
  month: number;
  year: number;
  base_salary: number;
  allowance: number;
  overtime_pay: number;
  late_deduction: number;
  absence_deduction: number;
  net_salary: number;
  status: 'draft' | 'published' | 'paid';
  generated_at: string;
  profiles?: Profile;
}

export type ReimbursementCategory = 'medical' | 'transport' | 'operational' | 'meal' | 'other';

export interface Reimbursement {
  id: string;
  user_id: string;
  category: ReimbursementCategory;
  amount: number;
  date: string;
  description: string;
  receipt_url: string | null;
  status: RequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  profiles?: Profile;
}

export type UrgencyLevel = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  urgency: UrgencyLevel;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export type HolidayType = 'national' | 'company_leave';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  description: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DepartmentAnalytics {
  department: string;
  total_employees: number;
  attendance_rate: number;
  late_count: number;
  leave_count: number;
  overtime_hours: number;
}


