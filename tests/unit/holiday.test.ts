import { describe, it, expect } from 'vitest';
import { previewHoliday } from '../../src/lib/domain/holiday';
import { Meal } from '../../src/lib/domain/types';

describe('Holiday calculation & preview logic', () => {
  const dummyMeals: Meal[] = [
    { id: 'm1', code: 'breakfast', name: 'Breakfast', short_label: 'B', start_time: '08:00:00', duration_minutes: 90, cutoff_minutes: 60, price_per_meal: 50, sort_order: 1, active: true },
    { id: 'm2', code: 'lunch', name: 'Lunch', short_label: 'L', start_time: '12:00:00', duration_minutes: 90, cutoff_minutes: 60, price_per_meal: 80, sort_order: 2, active: true },
  ];

  it('calculates holiday preview for future date range', () => {
    const now = new Date('2026-10-10T06:00:00');
    const preview = previewHoliday('2026-10-11', '2026-10-12', ['m1', 'm2'], dummyMeals, true, now);

    expect(preview.total_meals).toBe(4); // 2 days x 2 meals
    expect(preview.skippable_meals).toBe(4);
    expect(preview.past_cutoff_meals).toBe(0);
    expect(preview.credits_to_grant).toBe(4);
  });

  it('excludes past-cutoff meals from skippable count and credits', () => {
    const now = new Date('2026-10-10T10:00:00'); // past Breakfast cutoff (07:00), before Lunch cutoff (11:00)
    const preview = previewHoliday('2026-10-10', '2026-10-10', ['m1', 'm2'], dummyMeals, true, now);

    expect(preview.total_meals).toBe(2);
    expect(preview.skippable_meals).toBe(1); // Lunch only
    expect(preview.past_cutoff_meals).toBe(1); // Breakfast past cutoff
    expect(preview.credits_to_grant).toBe(1);
  });
});
