import { describe, it, expect } from 'vitest';
import {
  canRead,
  canWrite,
  maxAccessRole,
  maxEffectiveRole,
  parseEmailDomain,
} from '$lib/server/access';

describe('parseEmailDomain', () => {
  it('extracts lowercase domain', () => {
    expect(parseEmailDomain('Alice@Company.COM')).toBe('company.com');
  });

  it('returns null for invalid email', () => {
    expect(parseEmailDomain('not-an-email')).toBeNull();
    expect(parseEmailDomain('@')).toBeNull();
  });
});

describe('maxEffectiveRole', () => {
  it('returns highest role', () => {
    expect(maxEffectiveRole('none', 'viewer', 'editor')).toBe('editor');
    expect(maxEffectiveRole('viewer', 'owner')).toBe('owner');
  });
});

describe('maxAccessRole', () => {
  it('returns highest grant role', () => {
    expect(maxAccessRole('viewer', 'editor', 'viewer')).toBe('editor');
  });
});

describe('canRead / canWrite', () => {
  it('viewer can read but not write', () => {
    expect(canRead('viewer')).toBe(true);
    expect(canWrite('viewer')).toBe(false);
  });

  it('editor and owner can write', () => {
    expect(canWrite('editor')).toBe(true);
    expect(canWrite('owner')).toBe(true);
  });

  it('none cannot read', () => {
    expect(canRead('none')).toBe(false);
  });
});
