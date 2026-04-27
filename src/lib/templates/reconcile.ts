// src/lib/templates/reconcile.ts
import type { Block, CommentAnchor } from './types';
import type { Comment } from '$lib/types';

/**
 * Reconcile comment anchors after the page markdown has been updated.
 *
 * For each comment with a block anchor:
 * 1. Try to find block_id in newBlocks → keep (anchor unchanged)
 * 2. If not found, try to match by block_index + hint → update block_id
 * 3. If nothing matches → mark as orphaned
 *
 * Returns an array of updated anchor values (null means no change needed).
 */
export interface ReconcileResult {
  commentId: string;
  newAnchor: CommentAnchor;
  changed: boolean;
}

export function reconcileComments(
  oldBlocks: Block[],
  newBlocks: Block[],
  comments: Comment[]
): ReconcileResult[] {
  const newBlockById = new Map(newBlocks.map((b) => [b.id, b]));
  const results: ReconcileResult[] = [];

  for (const comment of comments) {
    if (!comment.anchor) continue;

    // Parse the anchor
    let anchor: CommentAnchor;
    try {
      const parsed =
        typeof comment.anchor === 'string' ? JSON.parse(comment.anchor) : comment.anchor;
      if (!parsed || typeof parsed !== 'object' || parsed.type !== 'block') continue;
      anchor = parsed as CommentAnchor;
    } catch {
      // Legacy string anchor — skip reconciliation
      continue;
    }

    if (!anchor.block_id) continue;

    // 1. block_id still exists in newBlocks → nothing to do
    if (newBlockById.has(anchor.block_id)) {
      // No change
      continue;
    }

    // 2. block_id gone — try index + hint fallback
    let matched: Block | null = null;
    if (anchor.block_index !== undefined) {
      const candidate = newBlocks.find((b) => b.index === anchor.block_index);
      if (candidate && anchor.block_id) {
        // Hint check: compare hint stored in anchor_hint vs candidate.hint
        const storedHint = comment.anchor_hint ?? '';
        if (!storedHint || candidate.hint.startsWith(storedHint.slice(0, 40))) {
          matched = candidate;
        }
      }
      // Fallback: try oldBlocks index to find the old block's hint, compare with newBlocks
      if (!matched) {
        const oldBlock = oldBlocks.find((b) => b.index === anchor.block_index);
        if (oldBlock) {
          const hintPrefix = oldBlock.hint.slice(0, 40);
          const byHint = newBlocks.find((b) => b.hint.startsWith(hintPrefix));
          if (byHint) matched = byHint;
        }
      }
    }

    if (matched) {
      const updated: CommentAnchor = {
        ...anchor,
        block_id: matched.id,
        block_index: matched.index,
        orphaned: false,
      };
      results.push({
        commentId: comment.id,
        newAnchor: updated,
        changed: true,
      });
    } else {
      // 3. Nothing matched — orphan
      const orphaned: CommentAnchor = { ...anchor, orphaned: true };
      results.push({
        commentId: comment.id,
        newAnchor: orphaned,
        changed: true,
      });
    }
  }

  return results;
}
