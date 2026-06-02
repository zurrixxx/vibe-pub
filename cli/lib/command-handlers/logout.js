import { clearToken, getToken } from '../config.js';

/** @param {import('./helpers.js').CliContext} _ctx */
export async function logoutHandler(_ctx) {
  clearToken();
  process.stderr.write(getToken() ? 'Failed to logout, please try again.\n' : 'Success logout.\n');
}
