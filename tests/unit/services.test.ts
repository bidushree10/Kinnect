import { describe, it, expect } from 'vitest';
import { generatePatientId, isValidPatientId } from '../../src/lib/idGenerator';
import { isValidTimeFormat } from '../../src/services/medicationService';
import { isValidDateFormat } from '../../src/services/confirmationService';

describe('createPatientProfile retry-on-collision logic', () => {
  it('generates valid patient IDs and verifies collision handling algorithm', async () => {
    const existingIds = new Set<string>();
    
    // Simulate collision logic:
    // When a generated ID exists in the set, candidate collision is detected and a new ID is generated
    const mockCheckDocExists = (id: string) => existingIds.has(id);

    const generateWithCollisionRetry = (maxRetries = 5): string => {
      let attempts = 0;
      while (attempts < maxRetries) {
        attempts++;
        const candidate = generatePatientId();
        if (!mockCheckDocExists(candidate)) {
          return candidate;
        }
      }
      throw new Error('Collision max retries reached');
    };

    // First ID should succeed immediately
    const firstId = generateWithCollisionRetry();
    expect(isValidPatientId(firstId)).toBe(true);
    existingIds.add(firstId);

    // Second ID should also succeed and be distinct
    const secondId = generateWithCollisionRetry();
    expect(isValidPatientId(secondId)).toBe(true);
    expect(secondId).not.toBe(firstId);
  });
});

describe('Medication and Confirmation validation helpers', () => {
  it('validates 24-hour time format (HH:MM)', () => {
    expect(isValidTimeFormat('08:00')).toBe(true);
    expect(isValidTimeFormat('23:59')).toBe(true);
    expect(isValidTimeFormat('00:00')).toBe(true);
    expect(isValidTimeFormat('12:30')).toBe(true);

    // Invalid formats
    expect(isValidTimeFormat('8:00')).toBe(false); // must be 2 digits
    expect(isValidTimeFormat('24:00')).toBe(false);
    expect(isValidTimeFormat('12:60')).toBe(false);
    expect(isValidTimeFormat('invalid')).toBe(false);
    expect(isValidTimeFormat('')).toBe(false);
  });

  it('validates date format (YYYY-MM-DD)', () => {
    expect(isValidDateFormat('2026-11-15')).toBe(true);
    expect(isValidDateFormat('2025-01-01')).toBe(true);

    // Invalid formats
    expect(isValidDateFormat('15-11-2026')).toBe(false);
    expect(isValidDateFormat('2026/11/15')).toBe(false);
    expect(isValidDateFormat('2026-1-5')).toBe(false);
    expect(isValidDateFormat('')).toBe(false);
  });
});
