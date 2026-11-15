import { describe, it, expect } from 'vitest';
import { generatePatientId, isValidPatientId, ALLOWED_CHARS } from '../../src/lib/idGenerator';

describe('Patient ID Generator (UI Spec v2)', () => {
  it('generates valid KIN-XXXX-XXXX format', () => {
    const id = generatePatientId();
    expect(isValidPatientId(id)).toBe(true);
    expect(id).toMatch(/^KIN-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
  });

  it('excludes ambiguous lookalike characters 0, O, 1, I, L', () => {
    // Generate 100 sample IDs and assert forbidden characters never appear
    const forbidden = ['0', 'O', '1', 'I', 'L'];
    for (let i = 0; i < 100; i++) {
      const id = generatePatientId();
      const payload = id.replace('KIN-', '').replace('-', '');
      for (const char of forbidden) {
        expect(payload).not.toContain(char);
      }
    }
  });

  it('verifies alphabet strictly matches UI Spec v2 character set', () => {
    expect(ALLOWED_CHARS).toBe('23456789ABCDEFGHJKMNPQRSTUVWXYZ');
    expect(ALLOWED_CHARS.length).toBe(31);
    const unique = new Set(ALLOWED_CHARS.split(''));
    expect(unique.size).toBe(31);
  });
});
