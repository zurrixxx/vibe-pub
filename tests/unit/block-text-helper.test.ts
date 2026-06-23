import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '$lib/server/markdown';
import {
  blockIdFromCommentAnchor,
  blockTextMapFromDocHtml,
  buildPageBlockTextMap,
  enrichCommentsWithBlockText,
  listBlockTextEntries,
} from '$lib/block-text-helper';
import type { CommentAnchor } from '$lib/templates/types';

describe('listBlockTextEntries', () => {
  it('maps heading slug and paragraph blocks from rendered doc HTML', async () => {
    const html = await renderMarkdown(`Intro paragraph.

## Security

JWT tokens expire after 7 days.`);
    const blocks = listBlockTextEntries(html);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const intro = blocks.find((b) => b.content.includes('Intro paragraph'));
    const securityHeading = blocks.find((b) => b.block_id === 'security');
    const securityBody = blocks.find((b) => b.content.includes('JWT tokens expire after 7 days'));
    expect(intro).toBeTruthy();
    expect(securityHeading?.content).toBe('Security');
    expect(securityBody).toBeTruthy();
  });
});

describe('blockTextMapFromDocHtml', () => {
  it('builds id → text map from rendered HTML', async () => {
    const html = await renderMarkdown(`## Security\n\nToken expiry is 7 days.`);
    const map = blockTextMapFromDocHtml(html);
    expect(map.get('security')).toBe('Security');
    expect([...map.values()].some((t) => t.includes('Token expiry is 7 days'))).toBe(true);
  });
});

describe('blockIdFromCommentAnchor', () => {
  it('reads block_id from object anchor', () => {
    expect(blockIdFromCommentAnchor({ type: 'block', block_id: 'security' })).toBe('security');
  });

  it('reads block_id from JSON string anchor', () => {
    expect(blockIdFromCommentAnchor(JSON.stringify({ type: 'block', block_id: 'details' }))).toBe(
      'details'
    );
  });

  it('treats legacy plain string as block id', () => {
    expect(blockIdFromCommentAnchor('block-0')).toBe('block-0');
  });
});

describe('enrichCommentsWithBlockText', () => {
  it('attaches block_text for anchored comments', () => {
    const map = new Map([['security', 'JWT tokens expire after 7 days.']]);
    const base = {
      id: 'c1',
      page_id: 'p1',
      user_id: null,
      display_name: 'reviewer',
      anchor: { type: 'block', block_id: 'security' } satisfies CommentAnchor,
      anchor_hint: null,
      body: 'Should be 24 hours',
      resolved: 0,
      agent_published: 0,
      created: '2026-01-01T00:00:00.000Z',
    };
    const out = enrichCommentsWithBlockText([base], map);
    expect(out[0].block_text).toBe('JWT tokens expire after 7 days.');
  });

  it('returns null block_text for page-level comments', () => {
    const out = enrichCommentsWithBlockText(
      [
        {
          id: 'c1',
          page_id: 'p1',
          user_id: null,
          display_name: null,
          anchor: null,
          anchor_hint: null,
          body: 'General note',
          resolved: 0,
          agent_published: 0,
          created: '2026-01-01T00:00:00.000Z',
        },
      ],
      new Map()
    );
    expect(out[0].block_text).toBeNull();
  });
});

describe('buildPageBlockTextMap', () => {
  it('uses docHtml for doc view', async () => {
    const html = await renderMarkdown(`## Security\n\nToken expiry is 7 days.`);
    const map = buildPageBlockTextMap({ view: 'doc', markdown: '' }, { docHtml: html });
    expect(map.get('security')).toBe('Security');
  });
});
