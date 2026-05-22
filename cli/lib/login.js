import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { execFile } from 'child_process';
import { saveConfig, getBaseUrl } from './config.js';

const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

function openBrowser(url) {
  if (process.platform === 'darwin') {
    execFile('open', [url]);
  } else if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '', url]);
  } else {
    execFile('xdg-open', [url]);
  }
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CLI authorized — vibe.pub</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #edeae5;
      color: #1a1917;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      width: 100%;
      max-width: 360px;
      background: #fff;
      border-radius: 12px;
      padding: 36px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04);
      text-align: center;
    }
    .brand {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 24px;
      letter-spacing: -0.02em;
      margin-bottom: 28px;
      color: #1a1917;
    }
    .brand em { font-style: italic; }
    .title {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 28px;
      font-weight: 400;
      line-height: 1.25;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
    }
    .countdown {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 11px;
      color: #9e9b95;
    }
    .divider {
      border: none;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      margin: 28px 0 20px;
    }
    .footer { font-size: 13px; color: #6b6963; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">vibe.<em>pub</em></p>
    <h1 class="title">All set! Feel free to return to the CLI.</h1>
    <p class="countdown" id="countdown">This page will close in <span id="secs">10</span> s</p>
    <hr class="divider">
    <p class="footer">For any issues, visit <a href="https://vibe.pub">vibe.pub</a></p>
  </div>
  <script>
    (function () {
      var left = 10;
      var el = document.getElementById('secs');
      var tick = setInterval(function () {
        left -= 1;
        if (el) el.textContent = String(left);
        if (left <= 0) {
          clearInterval(tick);
          window.close();
          setTimeout(function () {
            var cd = document.getElementById('countdown');
            if (cd) cd.textContent = 'You can close this tab.';
          }, 400);
        }
      }, 1000);
    })();
  </script>
</body>
</html>`;

/**
 * @param {{ onAuthUrl?: (url: string) => void }} [options]
 * @returns {Promise<void>}
 */
export function loginViaLocalhost(options = {}) {
  return new Promise((resolve, reject) => {
    const state = randomBytes(16).toString('hex');
    let settled = false;
    let timeoutId;
    /** @type {import('http').Server | null} */
    let server = null;
    /** @type {string | undefined} */
    let authUrl;

    const shutdown = (fn, value) => {
      if (!server) {
        fn(value);
        return;
      }
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(() => fn(value));
    };

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      shutdown(fn, value);
    };

    const respond = (req, res, status, body, contentType) => {
      res.writeHead(status, { 'Content-Type': contentType, Connection: 'close' });
      res.end(body);
      req.socket?.destroy();
    };

    server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');

        if (url.pathname !== '/callback') {
          respond(req, res, 404, 'Not found', 'text/plain; charset=utf-8');
          return;
        }

        const gotState = url.searchParams.get('state');
        const token = url.searchParams.get('token');
        if (gotState !== state || !token) {
          respond(req, res, 400, 'Invalid callback', 'text/plain; charset=utf-8');
          finish(reject, new Error('Invalid login callback'));
          return;
        }

        saveConfig({ token });
        respond(req, res, 200, SUCCESS_HTML, 'text/html; charset=utf-8');
        finish(resolve);
      } catch (e) {
        respond(req, res, 500, 'Error', 'text/plain; charset=utf-8');
        finish(reject, e instanceof Error ? e : new Error(String(e)));
      }
    });

    server.on('error', (e) => finish(reject, e));

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      if (!port) {
        finish(reject, new Error('Could not bind localhost callback port'));
        return;
      }

      const baseUrl = getBaseUrl().replace(/\/$/, '');
      authUrl = `${baseUrl}/auth/cli?state=${state}&port=${port}`;
      options.onAuthUrl?.(authUrl);
      openBrowser(authUrl);

      timeoutId = setTimeout(() => {
        finish(reject, new Error('Login timed out after 15 minutes'));
      }, LOGIN_TIMEOUT_MS);
    });
  });
}
