import { describe, it, expect } from 'vitest';
import {
  assertCollectionAccessForOwner,
  resolveCollectionAccess,
} from '$lib/templates/collection/server/db';

describe('resolveCollectionAccess', () => {
  it('forces public when there is no owner', () => {
    expect(resolveCollectionAccess('private', null)).toBe('public');
    expect(resolveCollectionAccess('unlisted', undefined)).toBe('public');
  });

  it('honors requested access when owner exists', () => {
    expect(resolveCollectionAccess('private', 'user-1')).toBe('private');
    expect(resolveCollectionAccess(undefined, 'user-1')).toBe('public');
    expect(resolveCollectionAccess('unlisted', 'user-1')).toBe('public');
    expect(resolveCollectionAccess(undefined, 'user-1', 'public')).toBe('public');
  });
});

describe('assertCollectionAccessForOwner', () => {
  it('allows public without owner', () => {
    expect(() => assertCollectionAccessForOwner('public', null)).not.toThrow();
  });

  it('rejects private or unlisted without owner', () => {
    expect(() => assertCollectionAccessForOwner('private', null)).toThrow();
    expect(() => assertCollectionAccessForOwner('unlisted', null)).toThrow();
  });

  it('allows any level with owner', () => {
    expect(() => assertCollectionAccessForOwner('private', 'user-1')).not.toThrow();
  });
});
