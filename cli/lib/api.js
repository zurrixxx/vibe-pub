import { createApiClient } from './mcp/api-client.js';
import { getBaseUrl, getToken } from './config.js';

const client = createApiClient({
  fetch: globalThis.fetch.bind(globalThis),
  getBaseUrl,
  getToken,
});

export const {
  publish,
  list,
  getBySlug,
  getByUrl,
  getById,
  updatePage,
  update,
  remove,
  getComments,
  addComment,
  resolveComments,
  getVersions,
  getVersion,
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addToCollection,
  listCollectionParts,
  createCollectionPart,
  updateCollectionPart,
  deleteCollectionPart,
  updateCollectionPage,
  removeFromCollection,
  listAccessGroups,
  createAccessGroup,
  updateAccessGroup,
  deleteAccessGroup,
  listAccessGroupMembers,
  addAccessGroupMember,
  updateAccessGroupMember,
  removeAccessGroupMember,
  listPageShares,
  addPageShare,
  removePageShare,
  listCollectionShares,
  addCollectionShare,
  removeCollectionShare,
} = client;

export { ApiError } from './mcp/api-client.js';
