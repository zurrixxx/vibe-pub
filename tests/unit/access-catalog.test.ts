import { describe, it, expect } from 'vitest';
import { assertValidDomain, normalizeDomainInput } from '$lib/server/access';

describe('normalizeDomainInput', () => {
  it('strips @ and lowercases', () => {
    expect(normalizeDomainInput('@Company.COM')).toBe('company.com');
  });
});

describe('assertValidDomain', () => {
  it('accepts valid domains', () => {
    expect(() => assertValidDomain('company.com')).not.toThrow();
    expect(() => assertValidDomain('mail.company.co.uk')).not.toThrow();
  });

  it('rejects invalid domains', () => {
    expect(() => assertValidDomain('not a domain')).toThrow();
    expect(() => assertValidDomain('localhost')).toThrow();
  });
});
