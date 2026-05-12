import { GoogleGenAI } from '@google/genai';
import type { BlockRevisePair, BlockReviseSuggestResponse } from '$lib/types';

const GEMINI_MODEL = 'gemini-3-flash-preview';

function parseModelJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/s, '');
  }
  return JSON.parse(t) as unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizePairs(raw: unknown): BlockRevisePair[] {
  if (!Array.isArray(raw)) return [];
  const out: BlockRevisePair[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const remove = typeof item.remove === 'string' ? item.remove : '';
    const add = typeof item.add === 'string' ? item.add : '';
    out.push({ remove, add });
  }
  return out;
}

export async function geminiSuggestBlockRevise(
  apiKey: string,
  blockPlainText: string,
  docPlainText: string,
  commentsChrono: { author: string; body: string; created: string; resolved: boolean }[]
): Promise<BlockReviseSuggestResponse> {
  const commentsJson = JSON.stringify(commentsChrono);
  const docCtx = (docPlainText || blockPlainText).trim();

  const prompt = `You are a precise document editor.

FULL_DOCUMENT (plain text of the entire document for context: terminology, structure, cross-references, tone. It may be truncated at the end if very long. Use it only to inform your suggestions — do not invent edits for parts of the document outside BLOCK_TARGET):
---
${docCtx}
---

BLOCK_TARGET (plain text of the single block that readers are commenting on; keep the dominant language when proposing edits):
---
${blockPlainText}
---

COMMENTS_JSON (oldest first; each entry has author, body, created ISO time, and whether it is already marked resolved):
${commentsJson}

Instructions:
1. Apply feedback in chronological order — later comments may refine earlier ones.
2. Output concrete edits as pairs: "remove" = text to delete from BLOCK_TARGET only (prefer exact contiguous substrings that appear verbatim in BLOCK_TARGET), "add" = replacement text (can be empty to delete only). Never use remove text taken only from FULL_DOCUMENT outside BLOCK_TARGET.
3. You may output multiple pairs for several edits. If the comments imply replacing the whole block, use one pair with remove = full BLOCK_TARGET and add = full replacement.
4. "summary": one short sentence describing what you did (same dominant language as BLOCK_TARGET / comments).

Return ONLY valid JSON (no markdown fences) with this shape:
{"summary":"string","pairs":[{"remove":"string","add":"string"}]}`;

  const ai = new GoogleGenAI({ apiKey });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });
    text = response.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini: ${msg.slice(0, 400)}`);
  }

  if (!text?.trim()) {
    throw new Error('Empty Gemini response');
  }

  let parsed: unknown;
  try {
    parsed = parseModelJson(text);
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Gemini JSON must be an object');
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const pairs = normalizePairs(parsed.pairs);

  return { summary: summary || 'Suggested edits.', pairs };
}
