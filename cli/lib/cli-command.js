import {
  formatHandler,
  publishHandler,
  getHandler,
  listHandler,
  updateHandler,
  deleteHandler,
  commentsHandler,
  commentHandler,
  resolveHandler,
  versionsHandler,
  versionHandler,
  loginHandler,
  logoutHandler,
  configHandler,
  whoamiHandler,
  accessHandler,
  collectionHandler,
} from './command-handlers/index.js';

/** @typedef {import('./command-handlers/index.js').CliContext} CliContext */

/**
 * @typedef {object} CliCommand
 * @property {string} name
 * @property {string[]} [aliases]
 * @property {(ctx: CliContext) => Promise<void>} handler
 */

/** @type {CliCommand[]} */
export const CLI_COMMANDS = [
  { name: 'format', handler: formatHandler },
  { name: 'publish', aliases: ['pub'], handler: publishHandler },
  { name: 'get', handler: getHandler },
  { name: 'list', aliases: ['ls'], handler: listHandler },
  { name: 'update', handler: updateHandler },
  { name: 'delete', aliases: ['rm'], handler: deleteHandler },
  { name: 'comments', handler: commentsHandler },
  { name: 'comment', handler: commentHandler },
  { name: 'resolve', handler: resolveHandler },
  { name: 'versions', handler: versionsHandler },
  { name: 'version', handler: versionHandler },
  { name: 'login', handler: loginHandler },
  { name: 'logout', handler: logoutHandler },
  { name: 'config', handler: configHandler },
  { name: 'whoami', handler: whoamiHandler },
  { name: 'access', handler: accessHandler },
  { name: 'collection', aliases: ['coll'], handler: collectionHandler },
];

/** @param {string} cmd */
export function resolveCliCommand(cmd) {
  return CLI_COMMANDS.find((c) => c.name === cmd || c.aliases?.includes(cmd));
}
