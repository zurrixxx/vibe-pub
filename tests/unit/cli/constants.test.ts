import { describe, it, expect } from 'vitest';
import { coerceLegacyAccess } from '../../../cli/lib/constants.js';

describe('coerceLegacyAccess', () => {
  it('maps unlisted to public', () => {
    expect(coerceLegacyAccess('unlisted')).toBe('public');
  });

  it('passes through public and private', () => {
    expect(coerceLegacyAccess('public')).toBe('public');
    expect(coerceLegacyAccess('private')).toBe('private');
  });

  it('returns undefined for missing values', () => {
    expect(coerceLegacyAccess(undefined)).toBeUndefined();
  });
});
