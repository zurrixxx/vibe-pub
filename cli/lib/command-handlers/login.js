import { loginViaLocalhost } from '../login.js';
import { err } from '../output.js';

/** @param {import('./helpers.js').CliContext} _ctx */
export async function loginHandler(_ctx) {
  try {
    await loginViaLocalhost({
      onAuthUrl(authUrl) {
        process.stderr.write(`Open this URL to authorize CLI:\n${authUrl}\n`);
        process.stderr.write('(Browser should open automatically. Approve within 15 min.)\n');
      },
    });
    process.stderr.write('Successfully logged in.\n');
  } catch (e) {
    err(e instanceof Error ? e.message : 'Login failed, please try again.');
  }
}
