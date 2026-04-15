#!/usr/bin/env node
import { readFileSync } from 'fs';
import { publish, list, update, remove } from '../lib/api.js';
import { saveConfig, getToken, getBaseUrl } from '../lib/config.js';

const args = process.argv.slice(2);
const cmd = args[0];

function help() {
  console.log(`vibe-pub — publish markdown to vibe.pub

Usage:
  vibe-pub publish <file.md> [options]   Publish a file
  vibe-pub publish                        Publish from stdin
  vibe-pub list                           List your pages
  vibe-pub update <id> [file.md]          Update a page (file or stdin)
  vibe-pub delete <id>                    Delete a page
  vibe-pub login <email>                  Get login instructions
  vibe-pub config --token <token>         Save session token

Options for publish:
  --slug <slug>           Custom URL slug
  --access <level>        public, unlisted (default), or private
  --theme <theme>         Page theme

Examples:
  vibe-pub publish notes.md
  vibe-pub publish report.md --slug q1-report --access public
  cat README.md | vibe-pub publish
  vibe-pub list
  vibe-pub update abc123 updated.md
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      flags[argv[i].slice(2)] = argv[i + 1] ?? true;
      i++;
    }
  }
  return flags;
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function readMarkdown(fileArg) {
  if (fileArg) {
    try {
      return readFileSync(fileArg, 'utf8');
    } catch {
      console.error(`Error: could not read file: ${fileArg}`);
      process.exit(1);
    }
  }
  return null;
}

async function main() {
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    help();
    process.exit(0);
  }

  // ─── publish ───
  if (cmd === 'publish' || cmd === 'pub') {
    const fileArg = args[1] && !args[1].startsWith('--') ? args[1] : null;
    const flagArgs = fileArg ? args.slice(2) : args.slice(1);
    const flags = parseFlags(flagArgs);

    const markdown = readMarkdown(fileArg) ?? await readStdin();

    if (!markdown.trim()) {
      console.error('Error: no markdown content');
      process.exit(1);
    }

    try {
      const page = await publish(markdown, {
        slug: flags.slug,
        access: flags.access,
        theme: flags.theme,
      });
      console.log(page.url ?? `${getBaseUrl()}/${page.slug}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  // ─── list ───
  if (cmd === 'list' || cmd === 'ls') {
    if (!getToken()) {
      console.error('Not logged in. Run: vibe-pub login <email>');
      process.exit(1);
    }
    try {
      const pages = await list();
      if (!pages.length) {
        console.log('No pages.');
        return;
      }
      for (const p of pages) {
        console.log(`${p.id}  ${p.access.padEnd(8)}  ${p.view.padEnd(6)}  ${p.title ?? p.slug}  ${p.url}`);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  // ─── update ───
  if (cmd === 'update') {
    const id = args[1];
    if (!id) {
      console.error('Usage: vibe-pub update <id> [file.md]');
      process.exit(1);
    }
    const fileArg = args[2] && !args[2].startsWith('--') ? args[2] : null;
    const markdown = readMarkdown(fileArg) ?? await readStdin();

    if (!markdown.trim()) {
      console.error('Error: no markdown content');
      process.exit(1);
    }
    try {
      const page = await update(id, markdown);
      console.log(`Updated: ${getBaseUrl()}/${page.slug}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  // ─── delete ───
  if (cmd === 'delete' || cmd === 'rm') {
    const id = args[1];
    if (!id) {
      console.error('Usage: vibe-pub delete <id>');
      process.exit(1);
    }
    try {
      await remove(id);
      console.log(`Deleted: ${id}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  // ─── login ───
  if (cmd === 'login') {
    const email = args[1];
    if (!email) {
      console.error('Usage: vibe-pub login <email>');
      process.exit(1);
    }
    console.log(`To log in:`);
    console.log(`  1. Visit ${getBaseUrl()}/auth/login`);
    console.log(`  2. Sign in with ${email}`);
    console.log(`  3. Copy your session token from browser cookies (vibe_session)`);
    console.log(`  4. Run: vibe-pub config --token <token>`);
    return;
  }

  // ─── config ───
  if (cmd === 'config') {
    const flags = parseFlags(args.slice(1));
    if (flags.token) {
      saveConfig({ token: flags.token });
      console.log('Token saved.');
    } else if (flags['base-url']) {
      saveConfig({ baseUrl: flags['base-url'] });
      console.log(`Base URL: ${flags['base-url']}`);
    } else {
      console.error('Usage: vibe-pub config --token <token>');
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  help();
  process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
