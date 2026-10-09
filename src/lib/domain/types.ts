export interface Settings {
  timezone: string;
  mess_name: string;
  max_advance_days: number;
  max_holiday_days: number;
  renewal_window_days: number;
  pin_length: number;
  admin_skip_notification: 'instant' | 'per_meal_digest' | 'off';
  student_skip_email_enabled: boolean;
  admin_notify_emails: string[];
  email_daily_cap: number;
  email_digest_switch_percent: number;
  dues_policy: 'allow' | 'warn' | 'block_extras';
  dues_limit: number;
  plates_variance_threshold: number;
  credit_scope: 'any' | 'same_meal';
  credit_policy: 'rollover' | 'extend' | 'expire';
  rollover_cap: number | null;
  credit_expiry_days: number;
}

export interface Meal {
  id: string;
  code: string;
  name: string;
  short_label: string;
  start_time: string; // "HH:MM:SS"
  duration_minutes: number;
  cutoff_minutes: number;
  price_per_meal: number;
  sort_order: number;
  active: boolean;
}

export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string | null;
  email: string;
  pin_hash: string | null;
  must_change_pin: boolean;
  pin_failed_count: number;
  locked_until: string | null;
  status: 'active' | 'inactive';
  joined_on: string;
  notes: string | null;
  created_at: string;
}

export interface TermsSnapshot {
  price_per_meal?: Record<string, number>;
  amount_due?: number;
  credit_scope: 'any' | 'same_meal';
  credit_policy: 'rollover' | 'extend' | 'expire';
  rollover_cap: number | null;
  credit_expiry_days: number;
  meals_snapshot?: Array<{ id: string; code: string; name: string }>;
}

export interface Subscription {
  id: string;
  member_id: string;
  plan_type: 'monthly' | 'ticket';
  meal_ids: string[];
  start_date: string;
  end_date: string | null;
  meals_total: number | null;
  terms: TermsSnapshot;
  status: 'active' | 'ended' | 'cancelled';
  created_at: string;
}

export interface Charge {
  id: string;
  member_id: string;
  subscription_id: string | null;
  meal_entry_id: string | null;
  kind: 'subscription' | 'extra_meal' | 'adjustment' | 'reversal';
  amount: number;
  reverses_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  subscription_id: string | null;
  amount: number;
  reverses_id: string | null;
  method: 'upi' | 'cash' | 'other';
  paid_on: string;
  note: string | null;
  recorded_by: string;
  created_at: string;
}
