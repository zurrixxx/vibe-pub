// src/lib/templates/types.ts

export interface TemplateSpec {
  name: string; // 'doc' | 'kanban' | ...
  label: string; // 'Document' | 'Kanban Board' | ...
  description: string; // One-line description
  icon: string; // Emoji or icon identifier

  comments: {
    block_type: string; // 'paragraph' | 'card' | 'slide' | ...
    id_source: 'heading_id' | 'index' | 'index+hint' | 'content_key';
  };

  schema: {
    frontmatter?: Record<string, string>;
    structure: string; // Human-readable structure description
    example: string; // Example markdown
  };
}

export interface Block {
  id: string; // Stable identifier (from {#id}, content key, or generated)
  type: string; // Template-specific: 'paragraph', 'card', 'heading', etc.
  index: number; // Position in block list (fallback anchor)
  hint: string; // First 80 chars of text content (fuzzy match fallback)
  content: string; // Raw markdown of this block
  metadata?: Record<string, unknown>; // Template-specific (labels, checked, column, etc.)
}

export interface CommentAnchor {
  type: 'page' | 'block';
  block_type?: string; // 'card' | 'slide' | 'paragraph' | ...
  block_id?: string; // Stable ID from {#id} or content key
  block_index?: number; // Positional fallback
  orphaned?: boolean; // Set when block no longer exists
}
