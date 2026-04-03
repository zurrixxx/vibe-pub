import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.config', 'vibe');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveConfig(data) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = getConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...data }, null, 2), 'utf8');
}

export function getBaseUrl() {
  return getConfig().baseUrl ?? 'https://vibe.pub';
}

export function getToken() {
  return getConfig().token ?? null;
}
