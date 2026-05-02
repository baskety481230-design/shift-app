export type Role = "manager" | "staff";
export type ShiftStatus = "draft" | "requested" | "approved" | "rejected";
export type SwapStatus = "pending_peer" | "pending_manager" | "approved" | "rejected" | "canceled";

export interface UserPublic {
  id: number;
  name: string;
  avatar_url: string | null;
  comment: string | null;
  role: Role;
  theme_color: number;
  theme_pattern: number;
}

export interface UserSelf extends UserPublic {
  email: string;
  hourly_wage: number;
  notify_minutes_before: number;
  notify_enabled: boolean;
}

export interface UserManagerView extends UserSelf {
  is_active: boolean;
  created_at: string;
}

export interface Shift {
  id: number;
  user_id: number;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  break_minutes: number;
  status: ShiftStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwap {
  id: number;
  requester_id: number;
  target_user_id: number;
  requester_shift_id: number;
  target_shift_id: number | null;
  status: SwapStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: number;
  email: string;
  role: Role;
  used: boolean;
  created_at: string;
}
