import { Charge, Payment } from './types';

/**
 * Calculates total outstanding dues for a member or subscription.
 * Dues = SUM(charges) - SUM(payments)
 * Derived at read time, never stored as a flag.
 */
export function calculateDues(charges: Charge[], payments: Payment[]): number {
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return Math.round((totalCharges - totalPayments) * 100) / 100;
}

/**
 * Determines dues payment status derived at read time.
 */
export function getDuesStatus(charges: Charge[], payments: Payment[]): 'paid' | 'partial' | 'unpaid' {
  const dues = calculateDues(charges, payments);
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);

  if (totalCharges === 0) return 'paid';
  if (dues <= 0) return 'paid';
  if (dues < totalCharges) return 'partial';
  return 'unpaid';
}
