import type { Block } from '$lib/templates/types';
import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';
import type { ChangelogRelease } from '$lib/templates/changelog/parser';
import type { TimelineSection } from '$lib/templates/timeline/parser';
import type { Slide } from '$lib/templates/slides/parser';
import type { DashboardSection } from '$lib/templates/dashboard/parser';

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
  view: 'doc' | 'kanban' | 'changelog' | 'timeline' | 'slides' | 'dashboard';
  theme: PageTheme;
  access: 'public' | 'unlisted' | 'private';
  expires_at: string | null;
  created: string;
  updated: string;
}

/** Row from `page_versions` (version list or single-snapshot fetch). */
export interface PageVersionSnapshotRow {
  version: number;
  title: string | null;
  created: string;
  markdown: string;
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
  view?: 'doc' | 'kanban' | 'changelog' | 'timeline' | 'slides' | 'dashboard';
  theme?: PageTheme;
  access?: 'public' | 'unlisted' | 'private';
  title?: string;
  expires?: string;
}

/** Payload from /[slug] and /@user/[slug] +page.server load — shared by PublishedPage.svelte */
export interface PublishedPageData {
  page: Page;
  html: string;
  seoHtml: string;
  blocks: Block[];
  comments: Comment[];
  frontmatter: PageFrontmatter;
  pageUser: { username: string } | null;
  kanbanData: { columns: KanbanColumn[]; labels: KanbanLabels } | null;
  changelogData: { releases: ChangelogRelease[] } | null;
  timelineData: { sections: TimelineSection[] } | null;
  slidesData: { slides: Slide[] } | null;
  dashboardData: { sections: DashboardSection[] } | null;
  isOwner: boolean;
  canClaim: boolean;
}
