import { describe, it, expect } from 'vitest';
import { calculateDues, getDuesStatus } from '../../src/lib/domain/dues';
import { Charge, Payment } from '../../src/lib/domain/types';

describe('Dues domain logic', () => {
  it('calculates 0 dues when charges equal payments', () => {
    const charges: Charge[] = [
      { id: '1', member_id: 'm1', subscription_id: 's1', meal_entry_id: null, kind: 'subscription', amount: 2400, reverses_id: null, description: 'Monthly plan', created_by: 'admin', created_at: new Date().toISOString() }
    ];
    const payments: Payment[] = [
      { id: 'p1', member_id: 'm1', subscription_id: 's1', amount: 2400, reverses_id: null, method: 'upi', paid_on: '2026-10-10', note: null, recorded_by: 'admin', created_at: new Date().toISOString() }
    ];

    expect(calculateDues(charges, payments)).toBe(0);
    expect(getDuesStatus(charges, payments)).toBe('paid');
  });

  it('correctly calculates partial dues', () => {
    const charges: Charge[] = [
      { id: '1', member_id: 'm1', subscription_id: 's1', meal_entry_id: null, kind: 'subscription', amount: 2400, reverses_id: null, description: 'Monthly plan', created_by: 'admin', created_at: new Date().toISOString() }
    ];
    const payments: Payment[] = [
      { id: 'p1', member_id: 'm1', subscription_id: 's1', amount: 1000, reverses_id: null, method: 'cash', paid_on: '2026-10-10', note: null, recorded_by: 'admin', created_at: new Date().toISOString() }
    ];

    expect(calculateDues(charges, payments)).toBe(1400);
    expect(getDuesStatus(charges, payments)).toBe('partial');
  });

  it('handles negative reversal charges and payments', () => {
    const charges: Charge[] = [
      { id: '1', member_id: 'm1', subscription_id: 's1', meal_entry_id: null, kind: 'subscription', amount: 2400, reverses_id: null, description: 'Monthly plan', created_by: 'admin', created_at: new Date().toISOString() },
      { id: '2', member_id: 'm1', subscription_id: 's1', meal_entry_id: null, kind: 'reversal', amount: -400, reverses_id: '1', description: 'Adjustment', created_by: 'admin', created_at: new Date().toISOString() }
    ];
    const payments: Payment[] = [
      { id: 'p1', member_id: 'm1', subscription_id: 's1', amount: 2000, reverses_id: null, method: 'upi', paid_on: '2026-10-10', note: null, recorded_by: 'admin', created_at: new Date().toISOString() }
    ];

    expect(calculateDues(charges, payments)).toBe(0);
    expect(getDuesStatus(charges, payments)).toBe('paid');
  });
});
