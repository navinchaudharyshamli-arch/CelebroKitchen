import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, generateTempPin } from '../../src/lib/auth/pin';

describe('PIN security helpers', () => {
  it('hashes and verifies PINs correctly', async () => {
    const pin = '12345';
    const hash = await hashPin(pin);
    expect(hash).not.toBe(pin);
    expect(await verifyPin(pin, hash)).toBe(true);
    expect(await verifyPin('54321', hash)).toBe(false);
  });

  it('generates temp PIN of exact configured length', () => {
    const pin5 = generateTempPin(5);
    expect(pin5.length).toBe(5);
    expect(/^\d{5}$/.test(pin5)).toBe(true);

    const pin4 = generateTempPin(4);
    expect(pin4.length).toBe(4);
  });
});
