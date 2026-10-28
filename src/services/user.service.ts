import bcrypt from 'bcryptjs';
import { dataService } from '@/services/data.service';
import type { User } from '@/types/domain';

function randomInt(max: number): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => String(randomInt(10))).join('');
}

export function generateTemporaryPassword(): string {
  return `SB-${randomCode(4)}${randomDigits(4)}`;
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const value = password.trim();

  if (value.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  const passwordHash = await bcrypt.hash(value, 10);
  await dataService.updateRow<User>('users', userId, { password_hash: passwordHash });
}
