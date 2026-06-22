export class ApiError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message);
    /** @type {number} */
    this.status = status;
  }
}

/**
 * @param {{ fetch: typeof fetch; getBaseUrl: () => string; getToken: () => string | null }} deps
 */
export function createApiClient({ fetch, getBaseUrl, getToken }) {
  /**
   * @param {string} method
   * @param {string} path
   * @param {Record<string, any> | undefined} [body]
   * @returns {Promise<any>}
   */
  async function request(method, path, body) {
    const base = getBaseUrl();
    const token = getToken();
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Cookie'] = `vibe_session=${token}`;

    /** @type {RequestInit} */
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

  return {
    /** @param {string} markdown @param {Record<string, any>} [options] */
    publish(markdown, options = {}) {
      /** @type {Record<string, any>} */
      const body = { markdown };
      if (options.slug) body.slug = options.slug;
      if (options.view) body.view = options.view;
      if (options.access) body.access = options.access;
      if (options.theme) body.theme = options.theme;
      if (options.agentPublished !== false) body.agent_published = true;
      return request('POST', '/api/pub', body);
    },

    /** @param {boolean} [sharedWithMe] */
    list(sharedWithMe = false) {
      const q = sharedWithMe ? '?shared_to_me=1' : '';
      return request('GET', `/api/pub${q}`);
    },

    /** @param {string} segment */
    getBySlug(segment) {
      return request('GET', `/api/pub/by-slug/${encodeURIComponent(segment)}`);
    },

    /** @param {string} input */
    getByUrl(input) {
      const segment = String(input)
        .replace(/^https?:\/\/[^/]+\//, '')
        .replace(/^\/+/, '')
        .split(/[?#]/)[0];
      return request('GET', `/api/pub/by-slug/${encodeURIComponent(segment)}`);
    },

    /** @param {string} id */
    getById(id) {
      return request('GET', `/api/pub/${encodeURIComponent(id)}`);
    },

    /** @param {string} id @param {Record<string, any>} data */
    updatePage(id, data) {
      return request('PUT', `/api/pub/${encodeURIComponent(id)}`, data);
    },

    /** @param {string} id @param {string} markdown @param {Record<string, any>} [options] */
    update(id, markdown, options = {}) {
      /** @type {Record<string, any>} */
      const data = { markdown };
      if (options.access) data.access = options.access;
      return request('PUT', `/api/pub/${encodeURIComponent(id)}`, data);
    },

    /** @param {string} id */
    remove(id) {
      return request('DELETE', `/api/pub/${encodeURIComponent(id)}`);
    },

    /** @param {string} pageId @param {Record<string, any>} [options] */
    getComments(pageId, options = {}) {
      const q = options.all === true ? '?all=1' : '';
      return request('GET', `/api/comment/${encodeURIComponent(pageId)}${q}`);
    },

    /** @param {string} pageId @param {string} body @param {Record<string, any>} [options] */
    addComment(pageId, body, options = {}) {
      /** @type {Record<string, any>} */
      const payload = { body };
      if (options.anchor) payload.anchor = options.anchor;
      if (options.display_name) payload.display_name = options.display_name;
      if (options.anchor_hint) payload.anchor_hint = options.anchor_hint;
      return request('POST', `/api/comment/${encodeURIComponent(pageId)}`, payload);
    },

    /** @param {string} pageId @param {Record<string, any>} [options] */
    resolveComments(pageId, options = {}) {
      /** @type {Record<string, any>} */
      const payload = {};
      if (options.all) payload.all = true;
      if (options.comment_ids) payload.comment_ids = options.comment_ids;
      return request('POST', `/api/pub/${encodeURIComponent(pageId)}/resolve`, payload);
    },

    /** @param {string} pageId */
    getVersions(pageId) {
      return request('GET', `/api/pub/${encodeURIComponent(pageId)}/versions`);
    },

    /** @param {string} pageId @param {string | number} num */
    getVersion(pageId, num) {
      return request(
        'GET',
        `/api/pub/${encodeURIComponent(pageId)}/versions/${encodeURIComponent(num)}`
      );
    },

    /** @param {string} title @param {Record<string, any>} [options] */
    createCollection(title, options = {}) {
      /** @type {Record<string, any>} */
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
    },

    /** @param {boolean} [sharedWithMe] */
    listCollections(sharedWithMe = false) {
      const q = sharedWithMe ? '?shared_to_me=1' : '';
      return request('GET', `/api/collection${q}`);
    },

    /** @param {string} slug */
    getCollection(slug) {
      return request('GET', `/api/collection/${encodeURIComponent(slug)}`);
    },

    /** @param {string} slug @param {Record<string, any>} data */
    updateCollection(slug, data) {
      return request('PUT', `/api/collection/${encodeURIComponent(slug)}`, data);
    },

    /** @param {string} slug */
    deleteCollection(slug) {
      return request('DELETE', `/api/collection/${encodeURIComponent(slug)}`);
    },

    /** @param {string} collectionSlug @param {string} pageSlug @param {Record<string, any>} [options] */
    addToCollection(collectionSlug, pageSlug, options = {}) {
      /** @type {Record<string, any>} */
      const body = { page_slug: pageSlug };
      if (options.label) body.label = options.label;
      if (options.part_id) body.part_id = options.part_id;
      return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/pages`, body);
    },

    /** @param {string} collectionSlug */
    listCollectionParts(collectionSlug) {
      return request('GET', `/api/collection/${encodeURIComponent(collectionSlug)}/parts`);
    },

    /** @param {string} collectionSlug @param {string} title @param {Record<string, any>} [options] */
    createCollectionPart(collectionSlug, title, options = {}) {
      /** @type {Record<string, any>} */
      const body = { title };
      if (options.sort_order !== undefined) body.sort_order = options.sort_order;
      return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/parts`, body);
    },

    /** @param {string} collectionSlug @param {string} partId @param {Record<string, any>} data */
    updateCollectionPart(collectionSlug, partId, data) {
      return request(
        'PUT',
        `/api/collection/${encodeURIComponent(collectionSlug)}/parts/${encodeURIComponent(partId)}`,
        data
      );
    },

    /** @param {string} collectionSlug @param {string} partId */
    deleteCollectionPart(collectionSlug, partId) {
      return request(
        'DELETE',
        `/api/collection/${encodeURIComponent(collectionSlug)}/parts/${encodeURIComponent(partId)}`
      );
    },

    /** @param {string} collectionSlug @param {string} pageSlug */
    removeFromCollection(collectionSlug, pageSlug) {
      return request(
        'DELETE',
        `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(pageSlug)}`
      );
    },

    /** @param {string} pageId */
    listPageShares(pageId) {
      return request('GET', `/api/pub/${encodeURIComponent(pageId)}/shares`);
    },

    /** @param {string} pageId @param {Record<string, any>} data */
    addPageShare(pageId, data) {
      return request('POST', `/api/pub/${encodeURIComponent(pageId)}/shares`, data);
    },

    /** @param {string} pageId @param {Record<string, any>} data */
    removePageShare(pageId, data) {
      return request('DELETE', `/api/pub/${encodeURIComponent(pageId)}/shares`, data);
    },

    /** @param {string} collectionSlug */
    listCollectionShares(collectionSlug) {
      return request('GET', `/api/collection/${encodeURIComponent(collectionSlug)}/shares`);
    },

    /** @param {string} collectionSlug @param {Record<string, any>} data */
    addCollectionShare(collectionSlug, data) {
      return request('POST', `/api/collection/${encodeURIComponent(collectionSlug)}/shares`, data);
    },

    /** @param {string} collectionSlug @param {Record<string, any>} data */
    removeCollectionShare(collectionSlug, data) {
      return request(
        'DELETE',
        `/api/collection/${encodeURIComponent(collectionSlug)}/shares`,
        data
      );
    },

    /** @param {string} groupId @param {string} userId */
    removeAccessGroupMember(groupId, userId) {
      return request(
        'DELETE',
        `/api/access/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`
      );
    },

    listAccessGroups() {
      return request('GET', '/api/access/groups');
    },

    /** @param {Record<string, any>} data */
    createAccessGroup(data) {
      return request('POST', '/api/access/groups', data);
    },

    /** @param {string} id @param {Record<string, any>} data */
    updateAccessGroup(id, data) {
      return request('PUT', `/api/access/groups/${encodeURIComponent(id)}`, data);
    },

    /** @param {string} id */
    deleteAccessGroup(id) {
      return request('DELETE', `/api/access/groups/${encodeURIComponent(id)}`);
    },

    /** @param {string} groupId */
    listAccessGroupMembers(groupId) {
      return request('GET', `/api/access/groups/${encodeURIComponent(groupId)}/members`);
    },

    /** @param {string} groupId @param {Record<string, any>} data */
    addAccessGroupMember(groupId, data) {
      return request('POST', `/api/access/groups/${encodeURIComponent(groupId)}/members`, data);
    },

    /** @param {string} groupId @param {string} userId @param {Record<string, any>} data */
    updateAccessGroupMember(groupId, userId, data) {
      return request(
        'PUT',
        `/api/access/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
        data
      );
    },

    /** @param {string} collectionSlug @param {string} pageSlug @param {Record<string, any>} data */
    updateCollectionPage(collectionSlug, pageSlug, data) {
      return request(
        'PUT',
        `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(pageSlug)}`,
        data
      );
    },
  };
}
