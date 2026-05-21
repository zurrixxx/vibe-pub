/**
 * Doc block comments — side panel, utilities, and block-revise payloads.
 */

export { default as Panel } from './Panel.svelte';
export { default as Form } from './Form.svelte';

export {
  blockReviseShouldCollapse,
  commentAnchoredToBlock,
  commentAvatarLetter,
  commentHandle,
  commentTimeAgo,
  isAgentComment,
  normalizeCommentRow,
  parseBlockAnchorId,
  shouldCollapseCommentBody,
} from './utils';

export {
  parseBlockReviseCommentBody,
  serializeBlockReviseCommentBody,
  VIBE_BLOCK_REVISE_LINE,
} from './block-revise';
