import type { Block } from '$lib/templates/types';
import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';
import type { ChangelogRelease } from '$lib/templates/changelog/parser';
import type { TimelineSection } from '$lib/templates/timeline/parser';
import type { Slide } from '$lib/templates/slides/parser';
import type { DashboardSection } from '$lib/templates/dashboard/parser';
import type { PageTheme, PageView, ResourceAccess } from '$lib/constants/page';

export type { PageTheme, PageView, ResourceAccess };

export interface Page {
  id: string;
  slug: string;
  /** 1 iff this row was tagged at migration 0011 as having a pre-refactor
   * dashed slug. Only these rows participate in legacy `/<slug>` URL
   * resolution; new pages always have 0 here, so they cannot shadow a
   * legacy URL by reusing the same slug. */
  legacy_slug: number;
  user_id: string | null;
  workspace_id: string | null;
  title: string | null;
  markdown: string;
  view: PageView;
  theme: PageTheme;
  access: ResourceAccess;
  /** 1 = published via agent tooling (CLI/MCP/API `agent_published`); 0 = web / legacy */
  agent_published: number;
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

/** Gemini block-revise API response (pairs = delete / add suggestions). */
export interface BlockRevisePair {
  remove: string;
  add: string;
}

export interface BlockReviseSuggestResponse {
  summary: string;
  pairs: BlockRevisePair[];
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
  /** 1 = POST set agent_published: true (CLI/MCP); 0 = web / omitted */
  agent_published: number;
  created: string;
}

export interface CollectionPart {
  id: string;
  title: string;
  sort_order: number;
}

/** Row from `collections` (dashboard list or API). */
export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  user_id: string | null;
  access: ResourceAccess;
  theme: string;
  /** 1 = created via agent tooling (CLI/MCP/API `agent_published`); 0 = web / omitted */
  agent_published: number;
  created: string;
  updated: string;
}

export interface PageFrontmatter {
  view?: PageView;
  theme?: PageTheme;
  access?: ResourceAccess;
  title?: string;
  expires?: string;
  /** Kanban reader: small caps line above hero (e.g. roadmap · q2 2026) */
  kicker?: string;
  /** Kanban reader: subtitle under hero */
  lede?: string;
  subtitle?: string;
  /** Substring of `title` to render wrapped in <em> in the hero */
  title_emphasis?: string;
}

/** Payload from /[slug] +page.server load — shared by PublishedPage.svelte */
export interface PublishedPageData {
  page: Page;
  /** Server-built canonical URL path for this page (`/<slug>-<id>` or `/<id>`). */
  canonicalPath: string;
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
