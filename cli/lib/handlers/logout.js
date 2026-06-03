import { clearToken, getToken } from '../config.js';

export async function logoutHandler() {
  clearToken();
  process.stderr.write(getToken() ? 'Failed to logout, please try again.\n' : 'Success logout.\n');
}
