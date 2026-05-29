#!/usr/bin/env node
import { readFileSync } from 'fs';
import * as api from '../lib/api.js';
import { saveConfig, getToken, getBaseUrl, clearToken } from '../lib/config.js';
import { loginViaLocalhost } from '../lib/login.js';
import { KANBAN_FORMAT_DOC } from '../lib/format-kanban.js';
import { DOC_FORMAT_DOC } from '../lib/format-doc.js';
import { out, err } from '../lib/output.js';
import { parseCollectionCreateArgv } from '../lib/parse-collection-parts.js';

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

function requireToken() {
  if (!getToken()) err('Not logged in. Run: vibe-pub login');
}

function parseAccessRole(flags) {
  const role = flags.role;
  if (!role) return undefined;
  if (role !== 'viewer' && role !== 'editor') err('--role must be viewer or editor');
  return role;
}

function buildShareBody(flags) {
  const email = flags.email;
  const domain = flags.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  const body = email ? { email } : { domain };
  const role = parseAccessRole(flags);
  if (role) body.access_role = role;
  return body;
}

function normalizeDomainInput(input) {
  return String(input).replace(/^@+/, '').trim().toLowerCase();
}

function parseUnshareTarget(flags) {
  const email = flags.email;
  const domain = flags.domain;
  if (!email && !domain) err('Provide --email or --domain');
  if (email && domain) err('Provide only one of --email or --domain');
  return {
    email: email ? String(email).trim().toLowerCase() : undefined,
    domain: domain ? normalizeDomainInput(domain) : undefined,
  };
}

async function revokeResourceShare(payload, target, removeDomainShare, removeUserShare) {
  if (target.domain) {
    const shares = Array.isArray(payload?.shares) ? payload.shares : [];
    const row = shares.find(
      (s) => s.grantee_type === 'domain' && normalizeDomainInput(s.label ?? '') === target.domain
    );
    if (!row) err(`No domain share found for: ${target.domain}`);
    await removeDomainShare(row.grantee_id);
    return;
  }

  const users = Array.isArray(payload?.shared_users) ? payload.shared_users : [];
  const user = users.find(
    (u) =>
      String(u.email ?? '')
        .trim()
        .toLowerCase() === target.email
  );
  if (!user) err(`No user share found for: ${target.email}`);
  const groupId = payload.default_group_id;
  if (!groupId) err('Could not resolve access group for this resource');
  await removeUserShare(groupId, user.user_id);
}

/** Web-shaped access view: domains + users only (groups are internal). */
function formatAccessStatus(access, payload) {
  const shares = Array.isArray(payload?.shares) ? payload.shares : [];
  const sharedUsers = Array.isArray(payload?.shared_users) ? payload.shared_users : [];
  return {
    access,
    domains: shares
      .filter((s) => s.grantee_type === 'domain')
      .map((s) => ({
        domain: s.label ?? s.grantee_id,
        grantee_id: s.grantee_id,
        access_role: s.access_role ?? 'viewer',
      })),
    users: sharedUsers.map((u) => ({
      email: u.email,
      username: u.username,
      user_id: u.user_id,
      access_role: u.access_role,
    })),
  };
}

function help() {
  const text = `vibe-pub -- publish markdown to vibe.pub

Usage: vibe-pub <command> [options]

Commands:
  publish [file] [options]   Publish markdown (file or stdin); counts as agent-published unless --no-agent-published
  format kanban|doc          Get markdown format reference for agents before publishing
  get <slug>                 Get page details
  list, ls                   List your pages
  update <slug> [file]       Update a page (file or stdin)
  delete, rm <slug>          Delete a page
  comments <slug> [-a]       List open comments (-a / --all: include resolved comments)
  comment <slug> "body"      Add a comment
  resolve <slug> [options]   Resolve comments
  versions <slug>            List version history
  version <slug> <num>       Get a specific version
  collection create <title>  Create a collection (--part / reader's guide flags)
  collection list, ls        List your collections
  collection get <slug>      Get collection details + pages
  collection add <c> <p>     Add page to collection
  collection remove <c> <p>  Remove page from collection
  collection delete <slug>   Delete a collection
  collection update <slug>   Update collection metadata
  collection part <sub>      Manage collection parts (list|add|update|remove)
  access page <slug>         Page access status (visibility + shares)
  access page share <slug>   Share a private page (--email or --domain)
  access page unshare <slug> Remove a page share (--email or --domain)
  access collection <slug>   Collection access status
  access collection share <slug>  Share a private collection
  access collection unshare <slug>  Remove a collection share
  whoami                     Show current auth info
  login                      Sign in via browser
  logout                     Sign out
  config [options]           Save configuration
  help                       Show this help

Global flags:
  --format human             Human-readable output (default: json)
  --mcp                      Start MCP server

Format reference:
  vibe-pub format kanban     Kanban board markdown syntax for agents
  vibe-pub format doc        Doc layout: title, hero lede (first paragraph), sections

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
  --description <text>       Cover subtitle under the title
  --readers-guide <text>     Cover lede under «A reader's guide»
  --what-its-about <text>    Cover card: what this collection is about
  --who-its-for <text>       Cover card: intended audience
  --how-to-read-it <text>    Cover card: how to navigate / where to start
  --slugs <p1,p2,...>        Ungrouped page slugs (shown after all parts)
  --part <spec>              Part spec, repeatable: "Title" or "Title:p1,p2"
  --parts <json>             Parts as JSON array [{ "title", "page_slugs"? }]
  --parts-file <path>        JSON file with parts array
  --access <level>           public, unlisted (default), or private
  --theme <theme>            Collection theme
  --no-agent-published       if you are agent, miss it

Collection add options:
  --label <label>            Display label (overrides page title in nav)
  --part-id <id>             Part to add the page into

Collection part add options:
  --sort-order <n>           Part order in navigation

Collection part update options:
  --title <title>            New part title
  --sort-order <n>           New part order

Collection update options:
  --title <title>            New title
  --description <desc>       Cover subtitle
  --readers-guide <text>     Cover lede under «A reader's guide»
  --what-its-about <text>    Cover card: what it's about
  --who-its-for <text>       Cover card: who it's for
  --how-to-read-it <text>    Cover card: how to read it
  --access <level>           New access level

Update options:
  --access <level>           public, unlisted, or private

Access share options:
  --email <email>            Share with / remove share for a user by email
  --domain <domain>          Share with / remove share for an email domain (e.g. @company.com)
  --role <viewer|editor>     Permission when sharing (default: viewer)

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

  // --- format (markdown reference for humans / AI) ---
  if (cmd === 'format') {
    const name = cleanArgs[1];
    if (!name) {
      if (format === 'human') {
        out('Format references:\n\n  vibe-pub format kanban\n  vibe-pub format doc', 'human');
      } else {
        out({ formats: ['kanban', 'doc'], usage: 'vibe-pub format <kanban|doc>' }, format);
      }
      return;
    }
    if (name === 'kanban') {
      if (format === 'human') {
        out(KANBAN_FORMAT_DOC, 'human');
      } else {
        out({ format: 'kanban', documentation: KANBAN_FORMAT_DOC }, format);
      }
      return;
    }
    if (name === 'doc') {
      if (format === 'human') {
        out(DOC_FORMAT_DOC, 'human');
      } else {
        out({ format: 'doc', documentation: DOC_FORMAT_DOC }, format);
      }
      return;
    }
    err(`Unknown format: ${name}. Available: kanban, doc (e.g. vibe-pub format doc)`);
    return;
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
        agentPublished: flags['no-agent-published'] ? false : true,
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
    if (!getToken()) err('Not logged in. Run: vibe-pub login');
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
    if (!slug) err('Usage: vibe-pub update <slug> [file] [--access <level>]');

    const fileArg = cleanArgs[2] && !cleanArgs[2].startsWith('--') ? cleanArgs[2] : null;
    const flagArgs = fileArg ? cleanArgs.slice(3) : cleanArgs.slice(2);
    const flags = parseFlags(flagArgs);

    let markdown = readMarkdown(fileArg);
    // Skip stdin only for interactive metadata-only updates (--access, no file).
    // When stdin is piped, still read it so content + --access can apply together.
    if (!markdown && (!flags.access || !process.stdin.isTTY)) markdown = await readStdin();

    const page = await resolveSlug(slug);

    if ((!markdown || !markdown.trim()) && flags.access) {
      try {
        const result = await api.updatePage(page.id, { access: flags.access });
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (!markdown || !markdown.trim())
      err('No markdown content (or pass --access for metadata-only)');

    try {
      const result = await api.update(page.id, markdown, { access: flags.access });
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
    if (!slug) err('Usage: vibe-pub comments <slug> [-a|--all]');

    const flagArgs = cleanArgs.slice(2);
    let includeAll = false;
    for (const a of flagArgs) {
      if (a === '-a' || a === '--all') includeAll = true;
      else err(`Unknown argument: ${a}. Usage: vibe-pub comments <slug> [-a|--all]`);
    }

    const page = await resolveSlug(slug);
    try {
      const comments = await api.getComments(page.id, { all: includeAll });
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
    const baseUrl = getBaseUrl();
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
    return;
  }

  // --- logout ---
  if (cmd === 'logout') {
    clearToken();
    const stillAuthed = !!getToken();
    process.stderr.write(
      stillAuthed ? 'Failed to logout, please try again.\n' : 'Success logout.\n'
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

  // --- access ---
  if (cmd === 'access') {
    requireToken();
    const resource = cleanArgs[1];
    const sub = cleanArgs[2];

    if (resource === 'page') {
      if (sub === 'share') {
        const slug = cleanArgs[3];
        if (!slug)
          err(
            'Usage: vibe-pub access page share <slug> (--email e | --domain d) [--role viewer|editor]'
          );
        const flags = parseFlags(cleanArgs.slice(4));
        const body = buildShareBody(flags);
        const page = await resolveSlug(slug);
        try {
          const payload = await api.addPageShare(page.id, body);
          out(formatAccessStatus(page.access, payload), format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      if (sub === 'unshare') {
        const slug = cleanArgs[3];
        if (!slug) err('Usage: vibe-pub access page unshare <slug> (--email e | --domain d)');
        const flags = parseFlags(cleanArgs.slice(4));
        const target = parseUnshareTarget(flags);
        const page = await resolveSlug(slug);
        try {
          const payload = await api.listPageShares(page.id);
          await revokeResourceShare(
            payload,
            target,
            (granteeId) =>
              api.removePageShare(page.id, { grantee_type: 'domain', grantee_id: granteeId }),
            (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
          );
          const updated = await api.listPageShares(page.id);
          out(formatAccessStatus(page.access, updated), format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      const slug = sub;
      if (!slug) err('Usage: vibe-pub access page <slug> | access page share|unshare <slug> ...');
      const page = await resolveSlug(slug);
      try {
        const payload = await api.listPageShares(page.id);
        out(formatAccessStatus(page.access, payload), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (resource === 'collection' || resource === 'coll') {
      if (sub === 'share') {
        const slug = cleanArgs[3];
        if (!slug)
          err(
            'Usage: vibe-pub access collection share <slug> (--email e | --domain d) [--role viewer|editor]'
          );
        const flags = parseFlags(cleanArgs.slice(4));
        const body = buildShareBody(flags);
        try {
          const collection = await api.getCollection(slug);
          const payload = await api.addCollectionShare(slug, body);
          out(formatAccessStatus(collection.access, payload), format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      if (sub === 'unshare') {
        const slug = cleanArgs[3];
        if (!slug) err('Usage: vibe-pub access collection unshare <slug> (--email e | --domain d)');
        const flags = parseFlags(cleanArgs.slice(4));
        const target = parseUnshareTarget(flags);
        try {
          const collection = await api.getCollection(slug);
          const payload = await api.listCollectionShares(slug);
          await revokeResourceShare(
            payload,
            target,
            (granteeId) =>
              api.removeCollectionShare(slug, { grantee_type: 'domain', grantee_id: granteeId }),
            (groupId, userId) => api.removeAccessGroupMember(groupId, userId)
          );
          const updated = await api.listCollectionShares(slug);
          out(formatAccessStatus(collection.access, updated), format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      const slug = sub;
      if (!slug)
        err(
          'Usage: vibe-pub access collection <slug> | access collection share|unshare <slug> ...'
        );
      try {
        const collection = await api.getCollection(slug);
        const payload = await api.listCollectionShares(slug);
        out(formatAccessStatus(collection.access, payload), format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    err(
      'Usage: vibe-pub access <page|collection> <slug> | access <page|collection> share|unshare <slug> ...'
    );
    return;
  }

  // --- collection ---
  if (cmd === 'collection' || cmd === 'coll') {
    const sub = cleanArgs[1];

    if (sub === 'create') {
      const title = cleanArgs[2];
      if (!title)
        err(
          'Usage: vibe-pub collection create <title> [--slug s] [--description d] [--readers-guide …] [--what-its-about …] [--who-its-for …] [--how-to-read-it …] [--part "Title:p1,p2"] [--slugs p1,p2] ...'
        );
      const flagArgs = cleanArgs.slice(3);
      let parts = [];
      let flags = {};
      try {
        ({ flags, parts } = parseCollectionCreateArgv(flagArgs));
      } catch (e) {
        err(e.message);
      }
      const options = {
        slug: flags.slug,
        access: flags.access,
        description: flags.description,
        readers_guide: flags['readers-guide'],
        what_its_about: flags['what-its-about'],
        who_its_for: flags['who-its-for'],
        how_to_read_it: flags['how-to-read-it'],
        theme: flags.theme,
        agentPublished: flags['no-agent-published'] ? false : true,
      };
      if (parts.length) options.parts = parts;
      if (flags.slugs)
        options.slugs = String(flags.slugs)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      try {
        const result = await api.createCollection(title, options);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'list' || sub === 'ls') {
      if (!getToken()) err('Not logged in. Run: vibe-pub login');
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
        err(
          'Usage: vibe-pub collection add <collection-slug> <page-slug> [--label "Name"] [--part-id id]'
        );
      const flagArgs = cleanArgs.slice(4);
      const flags = parseFlags(flagArgs);
      try {
        const result = await api.addToCollection(collSlug, pageSlug, {
          label: flags.label,
          part_id: flags['part-id'] ?? flags.part_id,
        });
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

    if (sub === 'delete') {
      const slug = cleanArgs[2];
      if (!slug) err('Usage: vibe-pub collection delete <slug>');
      try {
        await api.deleteCollection(slug);
        out({ deleted: true, slug }, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'update') {
      const slug = cleanArgs[2];
      if (!slug)
        err(
          'Usage: vibe-pub collection update <slug> [--title t] [--description d] [--readers-guide …] [--what-its-about …] [--who-its-for …] [--how-to-read-it …] [--access a]'
        );
      const flagArgs = cleanArgs.slice(3);
      const flags = parseFlags(flagArgs);
      const data = {};
      if (flags.title) data.title = flags.title;
      if (flags.description) data.description = flags.description;
      if (flags['readers-guide']) data.readers_guide = flags['readers-guide'];
      if (flags['what-its-about']) data.what_its_about = flags['what-its-about'];
      if (flags['who-its-for']) data.who_its_for = flags['who-its-for'];
      if (flags['how-to-read-it']) data.how_to_read_it = flags['how-to-read-it'];
      if (flags.access) data.access = flags.access;
      if (!Object.keys(data).length)
        err(
          'Provide at least one of --title, --description, --readers-guide, --what-its-about, --who-its-for, --how-to-read-it, --access'
        );
      try {
        const result = await api.updateCollection(slug, data);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (sub === 'part') {
      const partSub = cleanArgs[2];
      const collSlug = cleanArgs[3];

      if (partSub === 'list' || partSub === 'ls') {
        if (!collSlug) err('Usage: vibe-pub collection part list <collection-slug>');
        try {
          const parts = await api.listCollectionParts(collSlug);
          out(parts, format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      if (partSub === 'add') {
        const title = cleanArgs[4];
        if (!collSlug || !title)
          err('Usage: vibe-pub collection part add <collection-slug> <title> [--sort-order n]');
        const flags = parseFlags(cleanArgs.slice(5));
        const options = {};
        if (flags['sort-order'] !== undefined) options.sort_order = Number(flags['sort-order']);
        try {
          const result = await api.createCollectionPart(collSlug, title, options);
          out(result, format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      if (partSub === 'update') {
        const partId = cleanArgs[4];
        if (!collSlug || !partId)
          err(
            'Usage: vibe-pub collection part update <collection-slug> <part-id> [--title t] [--sort-order n]'
          );
        const flags = parseFlags(cleanArgs.slice(5));
        const data = {};
        if (flags.title) data.title = flags.title;
        if (flags['sort-order'] !== undefined) data.sort_order = Number(flags['sort-order']);
        if (!Object.keys(data).length) err('Provide at least one of --title, --sort-order');
        try {
          const result = await api.updateCollectionPart(collSlug, partId, data);
          out(result, format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      if (partSub === 'remove' || partSub === 'rm') {
        const partId = cleanArgs[4];
        if (!collSlug || !partId)
          err('Usage: vibe-pub collection part remove <collection-slug> <part-id>');
        try {
          const result = await api.deleteCollectionPart(collSlug, partId);
          out(result, format);
        } catch (e) {
          err(e.message, e.status);
        }
        return;
      }

      err('Usage: vibe-pub collection part <list|add|update|remove> <collection-slug> ...');
      return;
    }

    err('Usage: vibe-pub collection <create|list|get|add|remove|delete|update|part>');
    return;
  }

  err(`Unknown command: ${cmd}. Run: vibe-pub help`);
}

main().catch((e) => {
  err(e.message, e.status ?? 1);
});
