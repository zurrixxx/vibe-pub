import { describe, it, expect } from 'vitest';
import {
  buildShareBody,
  parseUnshareTarget,
  formatAccessStatus,
} from '../../../cli/lib/handlers/helpers.js';

describe('buildShareBody', () => {
  it('builds email share body', () => {
    expect(buildShareBody({ email: 'user@example.com' })).toEqual({
      email: 'user@example.com',
    });
  });

  it('builds domain share body with optional role', () => {
    expect(buildShareBody({ domain: '@company.com', role: 'editor' })).toEqual({
      domain: '@company.com',
      access_role: 'editor',
    });
  });
});

describe('parseUnshareTarget', () => {
  it('normalizes email', () => {
    expect(parseUnshareTarget({ email: 'User@Example.COM' })).toEqual({
      email: 'user@example.com',
      domain: undefined,
    });
  });

  it('strips @ and lowercases domain', () => {
    expect(parseUnshareTarget({ domain: '@Company.COM' })).toEqual({
      email: undefined,
      domain: 'company.com',
    });
  });
});

describe('formatAccessStatus', () => {
  it('maps shares and shared users for display', () => {
    const result = formatAccessStatus('private', {
      shares: [
        { grantee_type: 'domain', label: '@acme.com', grantee_id: 'dom-1', access_role: 'viewer' },
        { grantee_type: 'user', label: 'ignored', grantee_id: 'u-1' },
      ],
      shared_users: [
        { email: 'a@b.com', username: 'alice', user_id: 'u-2', access_role: 'editor' },
      ],
    });

    expect(result).toEqual({
      access: 'private',
      domains: [{ domain: '@acme.com', grantee_id: 'dom-1', access_role: 'viewer' }],
      users: [{ email: 'a@b.com', username: 'alice', user_id: 'u-2', access_role: 'editor' }],
    });
  });
});
