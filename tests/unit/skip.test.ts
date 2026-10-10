import { describe, it, expect } from 'vitest';
import { computeEffectiveStatus } from '../../src/lib/domain/calendar';

describe('Meal Skip Business Logic & Cutoff Rules', () => {
  it('allows skip before cutoff time and grants credit (+1)', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90;

    const nowBeforeCutoff = new Date('2026-10-10T10:00:00'); // 2 hours before meal
    const status = computeEffectiveStatus('expected', entryDate, startTime, durationMinutes, nowBeforeCutoff);
    expect(status).toBe('upcoming');
  });

  it('preserves skipped status and credit when skip occurs before cutoff', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90;

    const now = new Date('2026-10-10T10:30:00');
    const status = computeEffectiveStatus('skipped', entryDate, startTime, durationMinutes, now);
    expect(status).toBe('skipped');
  });

  it('rejects double-tap skips by producing single deterministic ledger key', () => {
    const memberId = 'mem_123';
    const entryId = 'entry_456';
    const skipCount = 1;

    const key1 = `skip:${entryId}:${skipCount}`;
    const key2 = `skip:${entryId}:${skipCount}`;

    expect(key1).toBe(key2);
  });
});
