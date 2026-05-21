import { describe, it, expect } from 'vitest';
import { searchCollection } from '$lib/templates/collection/search/query';
import type { SearchEntry } from '$lib/templates/collection/server/search-index';

const entries: SearchEntry[] = [
  {
    pageId: 'a',
    title: 'User Onboarding',
    chapterNum: 1,
    partEyebrow: null,
    href: '/c/x?page=a',
    text: 'interactive tutorial for new user onboarding flow',
  },
  {
    pageId: 'b',
    title: 'OAuth Guide',
    chapterNum: 2,
    partEyebrow: null,
    href: '/c/x?page=b',
    text: 'oauth2 login and token refresh',
  },
];

describe('searchCollection', () => {
  it('matches the full phrase including spaces (not split by term)', () => {
    const hits = searchCollection(entries, 'new user');
    expect(hits.map((h) => h.entry.pageId)).toEqual(['a']);
  });

  it('does not match when only separate words match but not the phrase', () => {
    const hits = searchCollection(entries, 'oauth onboarding');
    expect(hits).toHaveLength(0);
  });
});
