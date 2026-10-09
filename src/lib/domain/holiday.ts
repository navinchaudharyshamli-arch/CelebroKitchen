import { Meal } from './types';

export interface HolidayPreview {
  total_meals: number;
  skippable_meals: number;
  past_cutoff_meals: number;
  credits_to_grant: number;
}

export function previewHoliday(
  startDate: string,
  endDate: string,
  subscribedMealIds: string[],
  allMeals: Meal[],
  isMonthly: boolean,
  nowTs: Date
): HolidayPreview {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  let skippable = 0;
  let pastCutoff = 0;

  const targetMeals = allMeals.filter((m) => subscribedMealIds.includes(m.id) && m.active);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    for (const meal of targetMeals) {
      total++;
      const [hours, minutes] = meal.start_time.split(':').map(Number);
      const cutoff = new Date(dateStr);
      cutoff.setHours(hours, minutes - meal.cutoff_minutes, 0, 0);

      if (nowTs < cutoff) {
        skippable++;
      } else {
        pastCutoff++;
      }
    }
  }

  return {
    total_meals: total,
    skippable_meals: skippable,
    past_cutoff_meals: pastCutoff,
    credits_to_grant: isMonthly ? skippable : 0,
  };
}
