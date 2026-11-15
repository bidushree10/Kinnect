/**
 * Patient ID generator conforming to Kinnect UI Spec v2.
 * Characters come from 32-character alphabet excluding lookalikes 0, O, 1, I, L.
 * Format: KIN-XXXX-XXXX (e.g., KIN-7H4K-9QX2)
 */
export const ALLOWED_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generatePatientId(): string {
  let seg1 = '';
  let seg2 = '';

  for (let i = 0; i < 4; i++) {
    const randIndex1 = Math.floor(Math.random() * ALLOWED_CHARS.length);
    const randIndex2 = Math.floor(Math.random() * ALLOWED_CHARS.length);
    seg1 += ALLOWED_CHARS[randIndex1];
    seg2 += ALLOWED_CHARS[randIndex2];
  }

  return `KIN-${seg1}-${seg2}`;
}

export function isValidPatientId(id: string): boolean {
  const pattern = /^KIN-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
  return pattern.test(id);
}

