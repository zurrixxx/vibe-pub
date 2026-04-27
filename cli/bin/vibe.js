#!/usr/bin/env node
import { readFileSync } from 'fs';
import * as api from '../lib/api.js';
import { saveConfig, getToken, getBaseUrl } from '../lib/config.js';
import { out, err } from '../lib/output.js';

const args = process.argv.slice(2);

// Extract --format and --mcp flags before command parsing
let format = 'json';
let mcpMode = false;
const cleanArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format' && args[i + 1]) {
    format = args[i + 1];
    i++;
  } else if (args[i] === '--mcp') {
    mcpMode = true;
  } else {
    cleanArgs.push(args[i]);
  }
}

const cmd = cleanArgs[0];

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
      err(`Could not read file: ${fileArg}`);
    }
  }
  return null;
}

async function resolveSlug(slug) {
  try {
    return await api.getBySlug(slug);
  } catch (e) {
    err(`Page not found: ${slug}`, e.status ?? 1);
  }
}

function help() {
  const text = `vibe-pub -- publish markdown to vibe.pub

Usage: vibe-pub <command> [options]

Commands:
  publish [file] [options]   Publish markdown (file or stdin)
  get <slug>                 Get page details
  list, ls                   List your pages (requires auth)
  update <slug> [file]       Update a page (file or stdin)
  delete, rm <slug>          Delete a page
  comments <slug>            Get comments for a page
  comment <slug> "body"      Add a comment
  resolve <slug> [options]   Resolve comments
  versions <slug>            List version history
  version <slug> <num>       Get a specific version
  collection create <title>  Create a collection
  collection list, ls        List your collections (requires auth)
  collection get <slug>      Get collection details + pages
  collection add <c> <p>     Add page to collection
  collection remove <c> <p>  Remove page from collection
  collection update <slug>   Update collection metadata
  whoami                     Show current auth info
  login <email>              Print login instructions
  config [options]           Save configuration
  help                       Show this help

Global flags:
  --format human             Human-readable output (default: json)
  --mcp                      Start MCP server

Publish options:
  --slug <slug>              Custom URL slug
  --view <view>              Page view (doc, kanban, changelog, ...)
  --access <level>           public, unlisted (default), or private
  --theme <theme>            Page theme

Comment options:
  --anchor <blockId>         Anchor comment to a block

Resolve options:
  --all                      Resolve all comments
  --ids <id1,id2,...>        Resolve specific comment IDs

Collection create options:
  --slug <slug>              Custom collection slug
  --slugs <p1,p2,...>        Comma-separated page slugs to include
  --access <level>           public, unlisted (default), or private

Collection add options:
  --label <label>            Display label (overrides page title in nav)

Collection update options:
  --title <title>            New title
  --description <desc>       New description
  --access <level>           New access level

Config options:
  --token <token>            Save session token
  --base-url <url>           Save base URL`;
  out(text, 'human');
}

async function main() {
  // Handle MCP mode
  if (mcpMode) {
    const { startMcp } = await import('./mcp.js');
    await startMcp();
    return;
  }

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    help();
    process.exit(0);
  }

  // --- publish ---
  if (cmd === 'publish' || cmd === 'pub') {
    const fileArg = cleanArgs[1] && !cleanArgs[1].startsWith('--') ? cleanArgs[1] : null;
    const flagArgs = fileArg ? cleanArgs.slice(2) : cleanArgs.slice(1);
    const flags = parseFlags(flagArgs);

    const markdown = readMarkdown(fileArg) ?? (await readStdin());

    if (!markdown || !markdown.trim()) err('No markdown content');

    try {
      const result = await api.publish(markdown, {
        slug: flags.slug,
        view: flags.view,
        access: flags.access,
        theme: flags.theme,
      });
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- get ---
  if (cmd === 'get') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub get <slug>');
    try {
      const page = await api.getBySlug(slug);
      out(page, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- list ---
  if (cmd === 'list' || cmd === 'ls') {
    if (!getToken()) err('Not logged in. Run: vibe-pub login <email>');
    try {
      const pages = await api.list();
      out(pages, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- update ---
  if (cmd === 'update') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub update <slug> [file]');

    const fileArg = cleanArgs[2] && !cleanArgs[2].startsWith('--') ? cleanArgs[2] : null;
    const markdown = readMarkdown(fileArg) ?? (await readStdin());
    if (!markdown || !markdown.trim()) err('No markdown content');

    const page = await resolveSlug(slug);
    try {
      const result = await api.update(page.id, markdown);
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- delete ---
  if (cmd === 'delete' || cmd === 'rm') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub delete <slug>');

    const page = await resolveSlug(slug);
    try {
      await api.remove(page.id);
      out({ deleted: true, id: page.id, slug: page.slug }, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- comments ---
  if (cmd === 'comments') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub comments <slug>');

    const page = await resolveSlug(slug);
    try {
      const comments = await api.getComments(page.id);
      out(comments, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- comment ---
  if (cmd === 'comment') {
    const slug = cleanArgs[1];
    const body = cleanArgs[2];
    if (!slug || !body) err('Usage: vibe-pub comment <slug> "body" [--anchor blockId]');

    const flagArgs = cleanArgs.slice(3);
    const flags = parseFlags(flagArgs);

    const page = await resolveSlug(slug);
    try {
      const comment = await api.addComment(page.id, body, {
        anchor: flags.anchor,
      });
      out(comment, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- resolve ---
  if (cmd === 'resolve') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub resolve <slug> [--all] [--ids id1,id2]');

    const flagArgs = cleanArgs.slice(2);
    const flags = parseFlags(flagArgs);

    const page = await resolveSlug(slug);
    const options = {};
    if (flags.all === true) options.all = true;
    if (flags.ids) options.comment_ids = flags.ids.split(',');

    if (!options.all && !options.comment_ids) {
      err('Provide --all or --ids <id1,id2,...>');
    }

    try {
      const result = await api.resolveComments(page.id, options);
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- versions ---
  if (cmd === 'versions') {
    const slug = cleanArgs[1];
    if (!slug) err('Usage: vibe-pub versions <slug>');

    const page = await resolveSlug(slug);
    try {
      const versions = await api.getVersions(page.id);
      out(versions, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- version ---
  if (cmd === 'version') {
    const slug = cleanArgs[1];
    const num = cleanArgs[2];
    if (!slug || !num) err('Usage: vibe-pub version <slug> <num>');

    const page = await resolveSlug(slug);
    try {
      const version = await api.getVersion(page.id, num);
      out(version, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  // --- whoami ---
  if (cmd === 'whoami') {
    const token = getToken();
    const baseUrl = getBaseUrl();
    out({ authenticated: !!token, base_url: baseUrl }, format);
    return;
  }

  // --- login ---
  if (cmd === 'login') {
    const email = cleanArgs[1];
    if (!email) err('Usage: vibe-pub login <email>');
    const baseUrl = getBaseUrl();
    out(
      {
        instructions: [
          `Visit ${baseUrl}/auth/login`,
          `Sign in with ${email}`,
          'Copy your session token from browser cookies (vibe_session)',
          'Run: vibe-pub config --token <token>',
        ],
      },
      format
    );
    return;
  }

  // --- config ---
  if (cmd === 'config') {
    const flags = parseFlags(cleanArgs.slice(1));
    if (flags.token) {
      saveConfig({ token: flags.token });
      out({ saved: 'token' }, format);
    } else if (flags['base-url']) {
      saveConfig({ baseUrl: flags['base-url'] });
      out({ saved: 'base_url', value: flags['base-url'] }, format);
    } else {
      err('Usage: vibe-pub config --token <token> | --base-url <url>');
    }
    return;
  }

  // --- collection ---
  if (cmd === 'collection' || cmd === 'coll') {
    const sub = cleanArgs[1];

    if (sub === 'create') {
      const title = cleanArgs[2];
      if (!title)
        err(
          'Usage: vibe-pub collection create <title> [--slug s] [--slugs p1,p2] [--access unlisted]'
        );
      const flagArgs = cleanArgs.slice(3);
      const flags = parseFlags(flagArgs);
      try {
        const result = await api.createCollection(title, {
          slug: flags.slug,
          slugs: flags.slugs ? flags.slugs.split(',') : [],
          access: flags.access,
          description: flags.description,
          theme: flags.theme,
        });
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'list' || sub === 'ls') {
      if (!getToken()) err('Not logged in. Run: vibe-pub login <email>');
      try {
        const collections = await api.listCollections();
        out(collections, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'get') {
      const slug = cleanArgs[2];
      if (!slug) err('Usage: vibe-pub collection get <slug>');
      try {
        const collection = await api.getCollection(slug);
        out(collection, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'add') {
      const collSlug = cleanArgs[2];
      const pageSlug = cleanArgs[3];
      if (!collSlug || !pageSlug)
        err('Usage: vibe-pub collection add <collection-slug> <page-slug> [--label "Name"]');
      const flagArgs = cleanArgs.slice(4);
      const flags = parseFlags(flagArgs);
      try {
        const result = await api.addToCollection(collSlug, pageSlug, { label: flags.label });
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'remove' || sub === 'rm') {
      const collSlug = cleanArgs[2];
      const pageSlug = cleanArgs[3];
      if (!collSlug || !pageSlug)
        err('Usage: vibe-pub collection remove <collection-slug> <page-slug>');
      try {
        const result = await api.removeFromCollection(collSlug, pageSlug);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'update') {
      const slug = cleanArgs[2];
      if (!slug)
        err('Usage: vibe-pub collection update <slug> [--title t] [--description d] [--access a]');
      const flagArgs = cleanArgs.slice(3);
      const flags = parseFlags(flagArgs);
      const data = {};
      if (flags.title) data.title = flags.title;
      if (flags.description) data.description = flags.description;
      if (flags.access) data.access = flags.access;
      if (!Object.keys(data).length)
        err('Provide at least one of --title, --description, --access');
      try {
        const result = await api.updateCollection(slug, data);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    err('Usage: vibe-pub collection <create|list|get|add|remove|update>');
    return;
  }

  err(`Unknown command: ${cmd}. Run: vibe-pub help`);
}

main().catch((e) => {
  err(e.message, e.status ?? 1);
});
