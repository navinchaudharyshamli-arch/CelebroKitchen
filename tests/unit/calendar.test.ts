import { describe, it, expect } from 'vitest';
import { computeEffectiveStatus } from '../../src/lib/domain/calendar';

describe('Calendar read-time effective status derivation', () => {
  it('derives past expected meal as taken immediately after meal end', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90; // ends at 13:30

    const nowAfterEnd = new Date('2026-10-10T13:31:00');
    const status = computeEffectiveStatus('expected', entryDate, startTime, durationMinutes, nowAfterEnd);
    expect(status).toBe('taken');
  });

  it('keeps expected meal as upcoming before meal end', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90; // ends at 13:30

    const nowBeforeEnd = new Date('2026-10-10T12:30:00');
    const status = computeEffectiveStatus('expected', entryDate, startTime, durationMinutes, nowBeforeEnd);
    expect(status).toBe('upcoming');
  });

  it('preserves skipped status regardless of meal end', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90;

    const nowAfterEnd = new Date('2026-10-10T14:00:00');
    const status = computeEffectiveStatus('skipped', entryDate, startTime, durationMinutes, nowAfterEnd);
    expect(status).toBe('skipped');
  });

  it('preserves closed status regardless of meal end', () => {
    const entryDate = '2026-10-10';
    const startTime = '12:00:00';
    const durationMinutes = 90;

    const nowAfterEnd = new Date('2026-10-10T14:00:00');
    const status = computeEffectiveStatus('closed', entryDate, startTime, durationMinutes, nowAfterEnd);
    expect(status).toBe('closed');
  });
});
