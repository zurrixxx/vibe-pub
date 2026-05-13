import type { Page, Comment, User, PageVersionSnapshotRow } from '$lib/types';
import { generatePageId, extractIdFromUrlSegment } from '$lib/server/slug';

export function getDb(platform: App.Platform) {
  return platform.env.DB;
}

const PAGE_ID_RETRIES = 5;

/**
 * Every path that returns a full {@link Page} must include `agent_published`
 * (`SELECT * FROM pages`, or an explicit column list that names `agent_published`).
 * `@[user]` and `/api/pub` GET rely on this for the agent-published filter.
 */
function normalizePageRow(row: Page | null): Page | null {
  if (!row) return null;
  return { ...row, agent_published: row.agent_published === 1 ? 1 : 0 };
}

function normalizePages(rows: Page[]): Page[] {
  return rows.map((r) => ({ ...r, agent_published: r.agent_published === 1 ? 1 : 0 }));
}

function isUniqueConstraintError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(msg);
}

export async function createPage(
  db: D1Database,
  data: {
    slug?: string;
    user_id?: string;
    workspace_id?: string;
    title?: string;
    markdown: string;
    view: string;
    theme?: string;
    access: string;
    expires_at?: string;
    /** When true, page is tagged for profile "Agent-published" filter */
    agent_published?: boolean;
  }
): Promise<Page> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < PAGE_ID_RETRIES; attempt++) {
    const id = generatePageId();
    try {
      const agentPublished = data.agent_published === true ? 1 : 0;
      await db
        .prepare(
          `INSERT INTO pages (id, slug, user_id, workspace_id, title, markdown, view, theme, access, expires_at, agent_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          data.slug ?? '',
          data.user_id ?? null,
          data.workspace_id ?? null,
          data.title ?? null,
          data.markdown,
          data.view,
          data.theme ?? 'default',
          data.access,
          data.expires_at ?? null,
          agentPublished
        )
        .run();
      return getPageById(db, id) as Promise<Page>;
    } catch (err) {
      lastErr = err;
      if (!isUniqueConstraintError(err)) throw err;
    }
  }
  throw new Error(
    `Failed to insert page after ${PAGE_ID_RETRIES} id collisions: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

export async function getPageById(db: D1Database, id: string): Promise<Page | null> {
  const row = await db.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first<Page>();
  return normalizePageRow(row);
}

/** Resolve a page from a URL segment.
 *
 * Canonical form is `<slug>-<id>` or bare `<id>`; we extract the trailing
 * id and look it up. As a fallback for pre-0011 dashed-slug URLs (e.g.
 * `/funnel-audit-2026-05-06-bof`), if the id lookup misses we look up the
 * full segment as a slug — but only against rows tagged `legacy_slug = 1`
 * at migration time. New pages can't opt into this fallback by reusing a
 * legacy slug, so they cannot hide an old page.
 */
export async function getPageByUrlSegment(db: D1Database, segment: string): Promise<Page | null> {
  const id = extractIdFromUrlSegment(segment);
  const byId = await getPageById(db, id);
  if (byId) return byId;
  const legacy = await db
    .prepare('SELECT * FROM pages WHERE slug = ? AND legacy_slug = 1')
    .bind(segment)
    .first<Page>();
  return normalizePageRow(legacy);
}

export async function getPagesByUser(db: D1Database, userId: string): Promise<Page[]> {
  const result = await db
    .prepare('SELECT * FROM pages WHERE user_id = ? ORDER BY updated DESC')
    .bind(userId)
    .all<Page>();
  return normalizePages(result.results);
}

export async function updatePage(
  db: D1Database,
  id: string,
  data: {
    markdown?: string;
    title?: string;
    view?: string;
    theme?: string;
    access?: string;
    slug?: string;
  }
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (data.markdown !== undefined) {
    sets.push('markdown = ?');
    values.push(data.markdown);
  }
  if (data.title !== undefined) {
    sets.push('title = ?');
    values.push(data.title);
  }
  if (data.view !== undefined) {
    sets.push('view = ?');
    values.push(data.view);
  }
  if (data.theme !== undefined) {
    sets.push('theme = ?');
    values.push(data.theme);
  }
  if (data.access !== undefined) {
    sets.push('access = ?');
    values.push(data.access);
  }
  if (data.slug !== undefined) {
    sets.push('slug = ?');
    values.push(data.slug);
  }

  if (sets.length === 0) return;

  sets.push("updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  values.push(id);

  await db
    .prepare(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

const PAGE_VERSION_RETENTION = 20;

/** Append a row to `page_versions` and prune rows older than the retention window. */
export async function appendPageVersionSnapshot(
  db: D1Database,
  pageId: string,
  snapshot: { markdown: string; title: string | null }
): Promise<void> {
  const maxRow = await db
    .prepare('SELECT MAX(version) as max_v FROM page_versions WHERE page_id = ?')
    .bind(pageId)
    .first<{ max_v: number | null }>();
  const nextVersion = (maxRow?.max_v ?? 0) + 1;

  const versionId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db
    .prepare(
      `INSERT INTO page_versions (id, page_id, version, markdown, title)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(versionId, pageId, nextVersion, snapshot.markdown, snapshot.title)
    .run();

  await db
    .prepare(
      `DELETE FROM page_versions
       WHERE page_id = ? AND version <= (
         SELECT MAX(version) - ? FROM page_versions WHERE page_id = ?
       )`
    )
    .bind(pageId, PAGE_VERSION_RETENTION, pageId)
    .run();
}

/** All version snapshots for a page, newest `version` first (for history API / UI). */
export async function getPageVersionsByPageId(
  db: D1Database,
  pageId: string
): Promise<PageVersionSnapshotRow[]> {
  const result = await db
    .prepare(
      'SELECT version, title, created, markdown FROM page_versions WHERE page_id = ? ORDER BY version DESC'
    )
    .bind(pageId)
    .all<PageVersionSnapshotRow>();
  return result.results;
}

/** One snapshot row, or null if that `version` does not exist for the page. */
export async function getPageVersionByPageIdAndVersion(
  db: D1Database,
  pageId: string,
  versionNum: number
): Promise<PageVersionSnapshotRow | null> {
  return db
    .prepare(
      'SELECT version, title, created, markdown FROM page_versions WHERE page_id = ? AND version = ?'
    )
    .bind(pageId, versionNum)
    .first<PageVersionSnapshotRow>();
}

export async function deletePage(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();
}

export async function createComment(
  db: D1Database,
  data: {
    page_id: string;
    user_id?: string;
    display_name?: string;
    body: string;
    anchor?: unknown;
    anchor_hint?: string;
    agent_published?: boolean;
  }
): Promise<Comment> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  // Serialize anchor: if object, JSON.stringify; if string, store as-is; if null/undefined, null
  const anchorStr =
    data.anchor == null
      ? null
      : typeof data.anchor === 'string'
        ? data.anchor
        : JSON.stringify(data.anchor);
  const agentPublished = data.agent_published === true ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO comments (id, page_id, user_id, display_name, body, anchor, anchor_hint, agent_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.page_id,
      data.user_id ?? null,
      data.display_name ?? null,
      data.body,
      anchorStr,
      data.anchor_hint ?? null,
      agentPublished
    )
    .run();

  return db
    .prepare('SELECT * FROM comments WHERE id = ?')
    .bind(id)
    .first<Comment>() as Promise<Comment>;
}

export async function getCommentsByPage(
  db: D1Database,
  pageId: string,
  opts?: { unresolvedOnly?: boolean }
): Promise<Comment[]> {
  const unresolvedOnly = opts?.unresolvedOnly === true;
  const result = await db
    .prepare(
      unresolvedOnly
        ? 'SELECT * FROM comments WHERE page_id = ? AND resolved = 0 ORDER BY created ASC'
        : 'SELECT * FROM comments WHERE page_id = ? ORDER BY created ASC'
    )
    .bind(pageId)
    .all<Comment>();
  return result.results;
}

export async function updateCommentAnchor(
  db: D1Database,
  commentId: string,
  anchor: unknown,
  orphaned?: boolean
): Promise<void> {
  const anchorStr =
    anchor == null ? null : typeof anchor === 'string' ? anchor : JSON.stringify(anchor);
  await db.prepare('UPDATE comments SET anchor = ? WHERE id = ?').bind(anchorStr, commentId).run();
}

export async function resolveAllCommentsForPage(db: D1Database, pageId: string): Promise<void> {
  await db.prepare('UPDATE comments SET resolved = 1 WHERE page_id = ?').bind(pageId).run();
}

export async function resolveCommentsForPageByIds(
  db: D1Database,
  pageId: string,
  commentIds: string[]
): Promise<void> {
  const placeholders = commentIds.map(() => '?').join(', ');
  await db
    .prepare(`UPDATE comments SET resolved = 1 WHERE page_id = ? AND id IN (${placeholders})`)
    .bind(pageId, ...commentIds)
    .run();
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

export async function createUser(db: D1Database, email: string, username: string): Promise<User> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db
    .prepare('INSERT INTO users (id, email, username) VALUES (?, ?, ?)')
    .bind(id, email, username)
    .run();
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>() as Promise<User>;
}
