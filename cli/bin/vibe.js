#!/usr/bin/env node
import { readFileSync } from 'fs';
import { publish, list, update, remove } from '../lib/api.js';
import { saveConfig, getToken, getBaseUrl } from '../lib/config.js';

const args = process.argv.slice(2);
const cmd = args[0];

function help() {
  console.log(`vibe — publish markdown to vibe.pub

Usage:
  vibe pub <file.md> [options]   Publish a file
  vibe pub                        Publish from stdin
  vibe ls                         List your pages
  vibe update <id>                Update page from stdin
  vibe rm <id>                    Delete a page
  vibe login <email>              Get login instructions
  vibe config --token <token>     Save session token

Options for pub:
  --view <doc|kanban>             Page view (default: doc)
  --access <public|unlisted|private>  Access level (default: unlisted)
  --slug <slug>                   Custom slug
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      flags[key] = argv[i + 1] ?? true;
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

async function main() {
  if (!cmd || cmd === '--help' || cmd === '-h') {
    help();
    process.exit(0);
  }

  if (cmd === 'pub') {
    const fileArg = args[1] && !args[1].startsWith('--') ? args[1] : null;
    const flagArgs = fileArg ? args.slice(2) : args.slice(1);
    const flags = parseFlags(flagArgs);

    let markdown;
    if (fileArg) {
      try {
        markdown = readFileSync(fileArg, 'utf8');
      } catch {
        console.error(`Error: could not read file: ${fileArg}`);
        process.exit(1);
      }
    } else {
      markdown = await readStdin();
    }

    if (!markdown.trim()) {
      console.error('Error: no markdown content');
      process.exit(1);
    }

    try {
      const page = await publish(markdown, {
        view: flags.view,
        access: flags.access,
        slug: flags.slug
      });
      console.log(`Published: ${getBaseUrl()}/${page.slug}`);
      console.log(`ID: ${page.id}`);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'ls') {
    if (!getToken()) {
      console.error('Not logged in. Run: vibe login <email>');
      process.exit(1);
    }
    try {
      const pages = await list();
      if (!pages.length) {
        console.log('No pages.');
        return;
      }
      for (const p of pages) {
        const title = p.title ?? p.slug;
        console.log(`${p.id}  ${p.access.padEnd(8)}  ${p.view.padEnd(6)}  ${title}`);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'update') {
    const id = args[1];
    if (!id) {
      console.error('Usage: vibe update <id> < file.md');
      process.exit(1);
    }
    const markdown = await readStdin();
    if (!markdown.trim()) {
      console.error('Error: no markdown content on stdin');
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

  if (cmd === 'rm') {
    const id = args[1];
    if (!id) {
      console.error('Usage: vibe rm <id>');
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

  if (cmd === 'login') {
    const email = args[1];
    if (!email) {
      console.error('Usage: vibe login <email>');
      process.exit(1);
    }
    console.log(`To log in as ${email}:`);
    console.log(`  1. Open ${getBaseUrl()}/auth/login?email=${encodeURIComponent(email)}`);
    console.log(`  2. Check your email for the magic link`);
    console.log(`  3. After clicking the link, copy your session token from the browser`);
    console.log(`  4. Run: vibe config --token <token>`);
    return;
  }

  if (cmd === 'config') {
    const flags = parseFlags(args.slice(1));
    if (flags.token) {
      saveConfig({ token: flags.token });
      console.log('Token saved.');
    } else if (flags['base-url']) {
      saveConfig({ baseUrl: flags['base-url'] });
      console.log(`Base URL set to: ${flags['base-url']}`);
    } else {
      console.error('Usage: vibe config --token <token>');
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  help();
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
