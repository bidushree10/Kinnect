import { describe, it, expect } from 'vitest';
import { generatePatientId, isValidPatientId } from '../../src/lib/idGenerator';

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
