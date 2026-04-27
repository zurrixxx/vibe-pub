export type PageTheme =
  | 'default'
  | 'paper'
  | 'terminal'
  | 'midnight'
  | 'rose'
  | 'ocean'
  | 'stripe'
  | 'claude'
  | 'raycast'
  | 'nord'
  | 'monokai'
  | 'dracula'
  | 'solarized'
  | 'github';

export interface Page {
  id: string;
  slug: string;
  user_id: string | null;
  workspace_id: string | null;
  title: string | null;
  markdown: string;
  view: 'doc' | 'kanban';
  theme: PageTheme;
  access: 'public' | 'unlisted' | 'private';
  expires_at: string | null;
  created: string;
  updated: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  created: string;
}

export interface Comment {
  id: string;
  page_id: string;
  user_id: string | null;
  display_name: string | null;
  anchor: string | null; // JSON string: CommentAnchor | legacy string
  anchor_hint: string | null; // Text fingerprint for reconciliation
  body: string;
  resolved: number;
  created: string;
}

export interface PageFrontmatter {
  view?: 'doc' | 'kanban';
  theme?: PageTheme;
  access?: 'public' | 'unlisted' | 'private';
  title?: string;
  expires?: string;
}
