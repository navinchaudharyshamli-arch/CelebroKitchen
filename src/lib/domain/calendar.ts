import { Meal, Subscription } from '../domain/types';

export interface CalendarEntry {
  entry_id: string | null;
  member_id: string;
  subscription_id: string;
  entry_date: string; // YYYY-MM-DD
  meal_id: string;
  meal_code: string;
  meal_name: string;
  short_label: string;
  start_time: string;
  duration_minutes: number;
  cutoff_minutes: number;
  price_per_meal: number;
  stored_status: 'expected' | 'skipped' | 'closed' | 'taken';
  effective_status: 'upcoming' | 'taken' | 'skipped' | 'closed';
  is_extra: boolean;
  extra_payment: 'credit' | 'paid' | null;
  skip_count: number;
  is_virtual: boolean;
}

export function computeEffectiveStatus(
  storedStatus: 'expected' | 'skipped' | 'closed' | 'taken',
  entryDate: string,
  startTime: string,
  durationMinutes: number,
  nowTs: Date
): 'upcoming' | 'taken' | 'skipped' | 'closed' {
  if (storedStatus === 'closed') return 'closed';
  if (storedStatus === 'skipped') return 'skipped';

  const [hours, minutes] = startTime.split(':').map(Number);
  const mealEnd = new Date(entryDate);
  mealEnd.setHours(hours, minutes + durationMinutes, 0, 0);

  if (storedStatus === 'expected' || storedStatus === 'taken') {
    if (nowTs >= mealEnd) {
      return 'taken';
    }
    return 'upcoming';
  }

  return 'upcoming';
}
