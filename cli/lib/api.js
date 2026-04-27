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
  return request('POST', '/api/pub', body);
}

export async function list() {
  return request('GET', '/api/pub');
}

export async function getBySlug(slug) {
  return request('GET', `/api/pub/by-slug/${encodeURIComponent(slug)}`);
}

export async function getById(id) {
  return request('GET', `/api/pub/${encodeURIComponent(id)}`);
}

export async function update(id, markdown) {
  return request('PUT', `/api/pub/${encodeURIComponent(id)}`, { markdown });
}

export async function remove(id) {
  return request('DELETE', `/api/pub/${encodeURIComponent(id)}`);
}

export async function getComments(pageId) {
  return request('GET', `/api/comment/${encodeURIComponent(pageId)}`);
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
  const body = { title, page_slugs: options.slugs ?? [] };
  if (options.slug) body.slug = options.slug;
  if (options.access) body.access = options.access;
  if (options.description) body.description = options.description;
  if (options.theme) body.theme = options.theme;
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

export async function addToCollection(collectionSlug, pageSlug, options = {}) {
  const body = { page_slug: pageSlug };
  if (options.label) body.label = options.label;
  return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/pages`, body);
}

export async function removeFromCollection(collectionSlug, pageSlug) {
  return request(
    'DELETE',
    `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(pageSlug)}`
  );
}
