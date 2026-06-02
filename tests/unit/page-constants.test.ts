import { describe, it, expect } from 'vitest';
import {
  coerceLegacyAccess,
  resolveAssignableAccess,
  parseAssignableAccess,
  isResourceAccess,
  isPageView,
  isPageTheme,
  RESOURCE_ACCESS_TPYE,
  PAGE_VIEW_TYPE,
  PAGE_THEME,
} from '$lib/constants/page';

describe('page constants', () => {
  it('RESOURCE_ACCESS_LEVELS matches isResourceAccess', () => {
    for (const level of RESOURCE_ACCESS_TPYE) {
      expect(isResourceAccess(level)).toBe(true);
    }
    expect(isResourceAccess('secret')).toBe(false);
  });

  it('PAGE_VIEW_LEVELS matches isPageView', () => {
    for (const view of PAGE_VIEW_TYPE) {
      expect(isPageView(view)).toBe(true);
    }
    expect(isPageView('wiki')).toBe(false);
  });

  it('PAGE_THEME_LEVELS matches isPageTheme', () => {
    for (const theme of PAGE_THEME) {
      expect(isPageTheme(theme)).toBe(true);
    }
    expect(isPageTheme('neon')).toBe(false);
  });

  it('resolveAssignableAccess coerces legacy unlisted to public', () => {
    expect(resolveAssignableAccess(undefined)).toBe('public');
    expect(resolveAssignableAccess('unlisted')).toBe('public');
    expect(resolveAssignableAccess('private')).toBe('private');
    expect(parseAssignableAccess('unlisted')).toBe('public');
    expect(parseAssignableAccess('secret')).toBeNull();
  });
});
