import type { BlockReviseSuggestResponse } from '$lib/types';
import type { Comment } from '$lib/types';

export function parseBlockAnchorId(c: Comment): string | null {
  if (!c.anchor) return null;
  try {
    const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
    if (a?.type === 'block' && typeof a?.block_id === 'string') return a.block_id;
  } catch {
    /* ignore */
  }
  return null;
}

export function commentAnchoredToBlock(c: Comment, blockId: string): boolean {
  return parseBlockAnchorId(c) === blockId;
}

export function commentAvatarLetter(displayName: string | null): string {
  const raw = (displayName ?? 'A').trim() || 'A';
  const ch = raw.match(/[a-zA-Z0-9\u4e00-\u9fff]/)?.[0] ?? raw[0] ?? 'A';
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
}

export function commentHandle(displayName: string | null): string {
  let n = (displayName ?? 'anonymous').trim();
  if (!n) n = 'anonymous';
  if (n.startsWith('@')) return n;
  return `@${n.replace(/\s+/g, '').toLowerCase()}`;
}

export function commentTimeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function isAgentComment(c: Comment): boolean {
  if (c.agent_published === 1) return true;
  const n = (c.display_name ?? '').trim().toLowerCase();
  return n === 'agent' || n === 'vibe agent';
}

const COMMENT_BODY_COLLAPSE_CHARS = 400;
const COMMENT_BODY_COLLAPSE_NEWLINES = 8;

export function shouldCollapseCommentBody(text: string): boolean {
  if (!text) return false;
  if (text.length > COMMENT_BODY_COLLAPSE_CHARS) return true;
  return (text.match(/\n/g)?.length ?? 0) >= COMMENT_BODY_COLLAPSE_NEWLINES;
}

export function blockReviseShouldCollapse(r: BlockReviseSuggestResponse): boolean {
  const pairsLen = r.pairs.reduce((n, p) => n + (p.remove?.length ?? 0) + (p.add?.length ?? 0), 0);
  const total = (r.summary?.length ?? 0) + pairsLen;
  return total > 480 || r.pairs.length >= 2;
}

export function normalizeCommentRow(
  saved: Partial<Comment> & { anchor?: unknown },
  pageId: string,
  fallbackBody: string,
  fallbackHint: string
): Comment {
  const anchorNorm =
    saved.anchor == null
      ? null
      : typeof saved.anchor === 'string'
        ? saved.anchor
        : JSON.stringify(saved.anchor);
  return {
    id: saved.id!,
    page_id: saved.page_id ?? pageId,
    user_id: saved.user_id ?? null,
    display_name: saved.display_name ?? null,
    anchor: anchorNorm,
    anchor_hint: saved.anchor_hint ?? fallbackHint,
    body: saved.body ?? fallbackBody,
    resolved: typeof saved.resolved === 'number' ? saved.resolved : 0,
    agent_published: typeof saved.agent_published === 'number' ? saved.agent_published : 0,
    created: typeof saved.created === 'string' ? saved.created : new Date().toISOString(),
  };
}
