import { describe, it, expect } from 'vitest';
import { calculateNetComing, generateWhatsAppSummary } from '../../src/lib/domain/headcount';

describe('Headcount calculation and WhatsApp export helpers', () => {
  it('calculates net coming correctly as expected plus extras', () => {
    expect(calculateNetComing(110, 8)).toBe(118);
  });

  it('formats WhatsApp text summary with late changes correctly', () => {
    const text = generateWhatsAppSummary('Celebro Kitchen', 'Lunch', '2026-10-10', {
      expected_count: 110,
      skipped_count: 15,
      extra_count: 8,
      net_coming: 118,
      late_changes: 2,
      is_locked: true,
    });

    const decoded = decodeURIComponent(text);
    expect(decoded).toContain('Celebro Kitchen - Headcount Summary');
    expect(decoded).toContain('Cook Figure (Net Coming): 118 (+2 late)');
    expect(decoded).toContain('Skipped: 15');
  });
});
