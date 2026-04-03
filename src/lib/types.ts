export interface Page {
  id: string;
  slug: string;
  user_id: string | null;
  workspace_id: string | null;
  title: string | null;
  markdown: string;
  view: 'doc' | 'kanban';
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
  anchor: string | null;
  body: string;
  resolved: number;
  created: string;
}

export interface PageFrontmatter {
  view?: 'doc' | 'kanban';
  access?: 'public' | 'unlisted' | 'private';
  title?: string;
  expires?: string;
}
