import type { BlockRevisePair, BlockReviseSuggestResponse } from '$lib/types';

/** First line of stored comment body; followed by JSON payload. */
export const VIBE_BLOCK_REVISE_LINE = 'VIBE_BLOCK_REVISE_V1';
const PREFIX = `${VIBE_BLOCK_REVISE_LINE}\n`;

const MAX_BODY = 80_000;
const MAX_PAIR_CHUNK = 40_000;
const MAX_PAIRS = 50;
const MAX_SUMMARY = 20_000;

function normalizePairFromUnknown(item: unknown): BlockRevisePair | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const remove = typeof o.remove === 'string' ? o.remove.slice(0, MAX_PAIR_CHUNK) : '';
  const add = typeof o.add === 'string' ? o.add.slice(0, MAX_PAIR_CHUNK) : '';
  if (!remove && !add) return null;
  return { remove, add };
}

/** Store Gemini block-revise result in a comment body for reload + diff rendering. */
export function serializeBlockReviseCommentBody(r: BlockReviseSuggestResponse): string {
  let summary = (typeof r.summary === 'string' ? r.summary : '').trim().slice(0, MAX_SUMMARY);
  let pairs: BlockRevisePair[] = [];
  for (const raw of r.pairs) {
    if (pairs.length >= MAX_PAIRS) break;
    const p = normalizePairFromUnknown(raw);
    if (p) pairs.push(p);
  }
  const build = (): string =>
    PREFIX + JSON.stringify({ summary, pairs } satisfies BlockReviseSuggestResponse);
  let out = build();
  while (out.length > MAX_BODY && pairs.length > 0) {
    pairs = pairs.slice(0, -1);
    out = build();
  }
  if (out.length > MAX_BODY) {
    const budget = Math.max(0, MAX_BODY - PREFIX.length - 8);
    summary = (summary.slice(0, budget) || '…') + (budget > 0 ? '…' : '');
    pairs = [];
    out = build();
  }
  return out;
}

/** If this is a persisted block-revise payload, return structured data; otherwise null. */
export function parseBlockReviseCommentBody(
  body: string | null | undefined
): BlockReviseSuggestResponse | null {
  if (!body || typeof body !== 'string') return null;
  if (!body.startsWith(PREFIX)) return null;
  const json = body.slice(PREFIX.length).trimStart();
  if (!json.startsWith('{')) return null;
  try {
    const o = JSON.parse(json) as unknown;
    if (!o || typeof o !== 'object') return null;
    const obj = o as Record<string, unknown>;
    const summary = typeof obj.summary === 'string' ? obj.summary : '';
    const rawPairs = Array.isArray(obj.pairs) ? obj.pairs : [];
    const pairs: BlockRevisePair[] = [];
    for (const item of rawPairs) {
      const p = normalizePairFromUnknown(item);
      if (p) pairs.push(p);
    }
    return { summary, pairs };
  } catch {
    return null;
  }
}
