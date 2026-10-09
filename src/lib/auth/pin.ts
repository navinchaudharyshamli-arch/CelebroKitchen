import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function generateTempPin(length: number = 5): string {
  const digits = '123456789'; // Avoid 0 for simplicity
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return pin;
}

export function generateSetupCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
