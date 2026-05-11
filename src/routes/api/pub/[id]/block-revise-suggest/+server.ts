import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCommentsByPage, getPageById } from '$lib/server/db';
import { geminiSuggestBlockRevise } from '$lib/server/gemini';

function blockIdFromAnchor(anchor: string | null): string | null {
  if (!anchor) return null;
  try {
    const o = JSON.parse(anchor) as { type?: string; block_id?: unknown };
    if (o?.type === 'block' && typeof o.block_id === 'string') return o.block_id;
  } catch {
    /* legacy */
  }
  return null;
}

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const apiKey = platform.env.GEMINI_API_KEY;
  if (!apiKey) throw error(503, 'Gemini is not configured (set GEMINI_API_KEY secret).');

  if (!locals.user) throw error(401, 'Login required');

  const db = platform.env.DB;
  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');
  if (page.user_id !== locals.user.id) throw error(403, 'Only the page owner can use this');
  if (page.view !== 'doc') throw error(400, 'Only doc pages support block revision suggestions');

  const body = (await request.json().catch(() => ({}))) as {
    block_id?: string;
    block_plain_text?: string;
    doc_plain_text?: string;
  };
  const blockId = typeof body.block_id === 'string' ? body.block_id.trim() : '';
  if (!blockId) throw error(400, 'block_id is required');

  const block_plain_text =
    typeof body.block_plain_text === 'string' ? body.block_plain_text.trim() : '';
  if (!block_plain_text) throw error(400, 'block_plain_text is required');
  if (block_plain_text.length > 14_000) throw error(400, 'block_plain_text is too long');

  const doc_plain_text = typeof body.doc_plain_text === 'string' ? body.doc_plain_text.trim() : '';
  if (!doc_plain_text) throw error(400, 'doc_plain_text is required');
  if (doc_plain_text.length > 120_000) throw error(400, 'doc_plain_text is too long');

  const comments = await getCommentsByPage(db, params.id, { unresolvedOnly: false });
  const onBlock = comments.filter((c) => blockIdFromAnchor(c.anchor) === blockId);
  if (!onBlock.some((c) => c.resolved === 0)) {
    throw error(400, 'No open comments on this block');
  }

  onBlock.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

  const payload = onBlock.map((c) => ({
    author: c.display_name?.trim() || 'Anonymous',
    body: c.body,
    created: c.created,
    resolved: c.resolved !== 0,
  }));

  try {
    const out = await geminiSuggestBlockRevise(apiKey, block_plain_text, doc_plain_text, payload);
    return json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gemini request failed';
    console.error('[block-revise-suggest]', e);
    throw error(502, msg);
  }
};
