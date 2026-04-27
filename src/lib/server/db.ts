import type { Page, Comment, User } from '$lib/types';

export function getDb(platform: App.Platform) {
  return platform.env.DB;
}

export async function createPage(
  db: D1Database,
  data: {
    slug: string;
    user_id?: string;
    workspace_id?: string;
    title?: string;
    markdown: string;
    view: string;
    theme?: string;
    access: string;
    expires_at?: string;
  }
): Promise<Page> {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await db
    .prepare(
      `INSERT INTO pages (id, slug, user_id, workspace_id, title, markdown, view, theme, access, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.slug,
      data.user_id ?? null,
      data.workspace_id ?? null,
      data.title ?? null,
      data.markdown,
      data.view,
      data.theme ?? 'default',
      data.access,
      data.expires_at ?? null
    )
    .run();

  return getPageById(db, id) as Promise<Page>;
}

export async function getPageById(db: D1Database, id: string): Promise<Page | null> {
  return db.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first<Page>();
}

export async function getPageBySlug(
  db: D1Database,
  slug: string,
  userId?: string
): Promise<Page | null> {
  if (userId) {
    return db
      .prepare('SELECT * FROM pages WHERE slug = ? AND user_id = ?')
      .bind(slug, userId)
      .first<Page>();
  }
  return db
    .prepare('SELECT * FROM pages WHERE slug = ? AND user_id IS NULL')
    .bind(slug)
    .first<Page>();
}

export async function getPagesByUser(db: D1Database, userId: string): Promise<Page[]> {
  const result = await db
    .prepare('SELECT * FROM pages WHERE user_id = ? ORDER BY updated DESC')
    .bind(userId)
    .all<Page>();
  return result.results;
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

  if (sets.length === 0) return;

  sets.push("updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  values.push(id);

  await db
    .prepare(`UPDATE pages SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
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
  await db
    .prepare(
      `INSERT INTO comments (id, page_id, user_id, display_name, body, anchor, anchor_hint)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.page_id,
      data.user_id ?? null,
      data.display_name ?? null,
      data.body,
      anchorStr,
      data.anchor_hint ?? null
    )
    .run();

  return db
    .prepare('SELECT * FROM comments WHERE id = ?')
    .bind(id)
    .first<Comment>() as Promise<Comment>;
}

export async function getCommentsByPage(db: D1Database, pageId: string): Promise<Comment[]> {
  const result = await db
    .prepare('SELECT * FROM comments WHERE page_id = ? ORDER BY created ASC')
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
