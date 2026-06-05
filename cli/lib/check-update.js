import { spawnSync } from 'child_process';
import { readFileSync, realpathSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getConfig, saveConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const CURRENT_VERSION = pkg.version;
const PACKAGE_NAME = pkg.name;

const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const FETCH_TIMEOUT_MS = 3000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** @param {string} version */
function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  return { major, minor, patch };
}

/**
 * a.b.c — a: major, b: minor, c: patch.
 * @returns {'none' | 'patch' | 'required'}
 */
function getUpdateSeverity(current, latest) {
  const c = parseVersion(current);
  const l = parseVersion(latest);

  if (c.major > l.major) return 'none';
  if (c.major === l.major && c.minor > l.minor) return 'none';
  if (c.major === l.major && c.minor === l.minor && c.patch >= l.patch) return 'none';

  if (c.major < l.major || c.minor < l.minor) return 'required';
  return 'patch';
}

async function fetchLatestVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REGISTRY_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`registry ${res.status}`);
    const data = await res.json();
    return data.version;
  } finally {
    clearTimeout(timer);
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function isGlobalInstall() {
  try {
    const globalRoot = spawnSync(npmCommand(), ['root', '-g'], { encoding: 'utf8' }).stdout.trim();
    const selfPath = realpathSync(fileURLToPath(import.meta.url));
    return selfPath.startsWith(realpathSync(globalRoot));
  } catch {
    return false;
  }
}

function runGlobalUpdate(latest) {
  return spawnSync(npmCommand(), ['install', '-g', `${PACKAGE_NAME}@${latest}`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function printManualUpdateHint() {
  console.error(`\nPlease update manually:\n  npm install -g ${PACKAGE_NAME}\n`);
}

function saveLastCheckTime() {
  try {
    saveConfig({ lastUpdateCheck: Date.now() });
  } catch {
    // Config write failed; skip caching but continue with the check result.
  }
}

function exitWithUnsupportedVersion() {
  console.error('\nThis version is no longer supported. Please update before continuing.\n');
  process.exit(1);
}

/**
 * Check npm registry; auto-update global installs when a newer version is available.
 * Patch-only drift: warn and continue if update fails. Major/minor drift: block CLI.
 * @param {{ autoUpdate?: boolean }} [options]
 * @returns {Promise<boolean>} true if startup should abort (e.g. auto-update succeeded)
 */
export async function checkForUpdate({ autoUpdate = true } = {}) {
  const lastCheck = getConfig().lastUpdateCheck ?? 0;
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
    return false;
  }

  try {
    const latest = await fetchLatestVersion();
    saveLastCheckTime();

    const severity = getUpdateSeverity(CURRENT_VERSION, latest);
    if (severity === 'none') return false;

    console.error(`\nUpdate available: ${CURRENT_VERSION} → ${latest}`);

    if (autoUpdate && isGlobalInstall()) {
      console.error('Updating...\n');
      const result = runGlobalUpdate(latest);
      if (result.status === 0) {
        console.error(`\nUpdated to ${latest}. Please re-run your command.\n`);
        return true;
      }
      console.error('\nAuto-update failed.');
    }

    printManualUpdateHint();

    if (severity === 'required') {
      exitWithUnsupportedVersion();
    }
  } catch {
    // Ignore network/registry errors; do not block CLI usage.
  }
  return false;
}
