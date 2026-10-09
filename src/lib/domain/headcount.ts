export interface HeadcountSummary {
  expected_count: number;
  skipped_count: number;
  extra_count: number;
  net_coming: number;
  late_changes: number;
  is_locked: boolean;
}

export function calculateNetComing(expectedCount: number, extraCount: number): number {
  return expectedCount + extraCount;
}

export function generateWhatsAppSummary(
  messName: string,
  mealName: string,
  entryDate: string,
  summary: HeadcountSummary
): string {
  const lateStr = summary.late_changes !== 0 ? ` (${summary.late_changes > 0 ? '+' : ''}${summary.late_changes} late)` : '';
  const text = `${messName} - Headcount Summary\nMeal: ${mealName} (${entryDate})\n------------------------\nCook Figure (Net Coming): ${summary.net_coming}${lateStr}\n- Subscribed Expected: ${summary.expected_count}\n- Extras: ${summary.extra_count}\n- Skipped: ${summary.skipped_count}`;
  return encodeURIComponent(text);
}
