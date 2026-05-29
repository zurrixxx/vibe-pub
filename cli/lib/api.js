import { getBaseUrl, getToken } from './config.js';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const base = getBaseUrl();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Cookie'] = `vibe_session=${token}`;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${base}${path}`, opts);

  if (!res.ok) {
    const text = await res.text();
    let message;
    try {
      const data = JSON.parse(text);
      message = data.message ?? data.error ?? text;
    } catch {
      message = text;
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function publish(markdown, options = {}) {
  const body = { markdown };
  if (options.slug) body.slug = options.slug;
  if (options.view) body.view = options.view;
  if (options.access) body.access = options.access;
  if (options.theme) body.theme = options.theme;
  // Default true for CLI/MCP so /@user "Agent-published" filter matches; opt out with agentPublished: false
  if (options.agentPublished !== false) body.agent_published = true;
  return request('POST', '/api/pub', body);
}

export async function list() {
  return request('GET', '/api/pub');
}

// Accepts a bare page id, a `slug-id` URL fragment, or a legacy slug.
// The server extracts the trailing id from the segment.
export async function getBySlug(segment) {
  return request('GET', `/api/pub/by-slug/${encodeURIComponent(segment)}`);
}

// Convenience: pass a full URL or a path; we strip to the page segment.
export async function getByUrl(input) {
  const segment = String(input)
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^\/+/, '')
    .split(/[?#]/)[0];
  return getBySlug(segment);
}

export async function getById(id) {
  return request('GET', `/api/pub/${encodeURIComponent(id)}`);
}

export async function updatePage(id, data) {
  return request('PUT', `/api/pub/${encodeURIComponent(id)}`, data);
}

export async function update(id, markdown, options = {}) {
  const data = { markdown };
  if (options.access) data.access = options.access;
  return updatePage(id, data);
}

export async function remove(id) {
  return request('DELETE', `/api/pub/${encodeURIComponent(id)}`);
}

export async function getComments(pageId, options = {}) {
  const q = options.all === true ? '?all=1' : '';
  return request('GET', `/api/comment/${encodeURIComponent(pageId)}${q}`);
}

export async function addComment(pageId, body, options = {}) {
  const payload = { body };
  if (options.anchor) payload.anchor = options.anchor;
  if (options.display_name) payload.display_name = options.display_name;
  if (options.anchor_hint) payload.anchor_hint = options.anchor_hint;
  return request('POST', `/api/comment/${encodeURIComponent(pageId)}`, payload);
}

export async function resolveComments(pageId, options = {}) {
  const payload = {};
  if (options.all) payload.all = true;
  if (options.comment_ids) payload.comment_ids = options.comment_ids;
  return request('POST', `/api/pub/${encodeURIComponent(pageId)}/resolve`, payload);
}

export async function getVersions(pageId) {
  return request('GET', `/api/pub/${encodeURIComponent(pageId)}/versions`);
}

export async function getVersion(pageId, num) {
  return request(
    'GET',
    `/api/pub/${encodeURIComponent(pageId)}/versions/${encodeURIComponent(num)}`
  );
}

// --- Collections ---

export async function createCollection(title, options = {}) {
  const body = { title };
  if (options.slugs?.length) body.page_slugs = options.slugs;
  if (options.parts?.length) body.parts = options.parts;
  if (options.slug) body.slug = options.slug;
  if (options.access) body.access = options.access;
  if (options.description) body.description = options.description;
  if (options.readers_guide) body.readers_guide = options.readers_guide;
  if (options.what_its_about) body.what_its_about = options.what_its_about;
  if (options.who_its_for) body.who_its_for = options.who_its_for;
  if (options.how_to_read_it) body.how_to_read_it = options.how_to_read_it;
  if (options.theme) body.theme = options.theme;
  if (options.agentPublished === false) body.agent_published = false;
  return request('POST', '/api/collection', body);
}

export async function listCollections() {
  return request('GET', '/api/collection');
}

export async function getCollection(slug) {
  return request('GET', `/api/collection/${encodeURIComponent(slug)}`);
}

export async function updateCollection(slug, data) {
  return request('PUT', `/api/collection/${encodeURIComponent(slug)}`, data);
}

export async function deleteCollection(slug) {
  return request('DELETE', `/api/collection/${encodeURIComponent(slug)}`);
}

export async function addToCollection(collectionSlug, pageSlug, options = {}) {
  const body = { page_slug: pageSlug };
  if (options.label) body.label = options.label;
  if (options.part_id) body.part_id = options.part_id;
  return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/pages`, body);
}

export async function listCollectionParts(collectionSlug) {
  return request('GET', `/api/collection/${encodeURIComponent(collectionSlug)}/parts`);
}

export async function createCollectionPart(collectionSlug, title, options = {}) {
  const body = { title };
  if (options.sort_order !== undefined) body.sort_order = options.sort_order;
  return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/parts`, body);
}

export async function updateCollectionPart(collectionSlug, partId, data) {
  return request(
    'PUT',
    `/api/collection/${encodeURIComponent(collectionSlug)}/parts/${encodeURIComponent(partId)}`,
    data
  );
}

export async function deleteCollectionPart(collectionSlug, partId) {
  return request(
    'DELETE',
    `/api/collection/${encodeURIComponent(collectionSlug)}/parts/${encodeURIComponent(partId)}`
  );
}

export async function updateCollectionPage(collectionSlug, pageSlug, data) {
  return request(
    'PUT',
    `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(pageSlug)}`,
    data
  );
}

export async function removeFromCollection(collectionSlug, pageSlug) {
  return request(
    'DELETE',
    `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(pageSlug)}`
  );
}

// --- Access control ---

export async function listAccessGroups() {
  return request('GET', '/api/access/groups');
}

export async function createAccessGroup(data) {
  return request('POST', '/api/access/groups', data);
}

export async function updateAccessGroup(id, data) {
  return request('PUT', `/api/access/groups/${encodeURIComponent(id)}`, data);
}

export async function deleteAccessGroup(id) {
  return request('DELETE', `/api/access/groups/${encodeURIComponent(id)}`);
}

export async function listAccessGroupMembers(groupId) {
  return request('GET', `/api/access/groups/${encodeURIComponent(groupId)}/members`);
}

export async function addAccessGroupMember(groupId, data) {
  return request('POST', `/api/access/groups/${encodeURIComponent(groupId)}/members`, data);
}

export async function updateAccessGroupMember(groupId, userId, data) {
  return request(
    'PUT',
    `/api/access/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    data
  );
}

export async function removeAccessGroupMember(groupId, userId) {
  return request(
    'DELETE',
    `/api/access/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`
  );
}

export async function listPageShares(pageId) {
  return request('GET', `/api/pub/${encodeURIComponent(pageId)}/shares`);
}

export async function addPageShare(pageId, data) {
  return request('POST', `/api/pub/${encodeURIComponent(pageId)}/shares`, data);
}

export async function removePageShare(pageId, data) {
  return request('DELETE', `/api/pub/${encodeURIComponent(pageId)}/shares`, data);
}

export async function listCollectionShares(collectionSlug) {
  return request('GET', `/api/collection/${encodeURIComponent(collectionSlug)}/shares`);
}

export async function addCollectionShare(collectionSlug, data) {
  return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/shares`, data);
}

export async function removeCollectionShare(collectionSlug, data) {
  return request('DELETE', `/api/collection/${encodeURIComponent(collectionSlug)}/shares`, data);
}

export { ApiError };
