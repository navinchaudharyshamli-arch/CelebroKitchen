import { describe, it, expect } from 'vitest';
import { processAteAnyway } from '../../src/lib/domain/kitchen';

describe('Ate anyway credit vs charge resolution', () => {
  it('deducts credit when balance is 1 or more', () => {
    const res = processAteAnyway(2, 80);
    expect(res.used_credit).toBe(true);
    expect(res.charge_created).toBe(false);
  });

  it('creates charge at snapshotted meal price when credit balance is 0', () => {
    const res = processAteAnyway(0, 80);
    expect(res.used_credit).toBe(false);
    expect(res.charge_created).toBe(true);
    expect(res.charge_amount).toBe(80);
  });
});
