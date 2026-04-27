import { randomBytes } from 'node:crypto';

export function generateSlug(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 100) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug);
}
