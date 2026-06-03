#!/usr/bin/env node
import { out, err } from '../lib/output.js';
import { resolveCliCommand } from '../lib/cli-command.js';

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

function help() {
  const text = `vibe-pub -- publish markdown to vibe.pub

Usage: vibe-pub <command> [options]

Commands:
  publish [file] [options]   Publish markdown (file or stdin); counts as agent-published unless --no-agent-published
  format kanban|doc          Get markdown format reference for agents before publishing
  get <slug-id>              Get page (id or slug-id, e.g. my-doc-Ab12cd34)
  list, ls                   List your pages
  update <slug-id> [file]    Update a page (file or stdin)
  delete, rm <slug-id>       Delete a page
  comments <slug-id> [-a]    List open comments (-a / --all: include resolved)
  comment <slug-id> "body"   Add a comment
  resolve <slug-id> [opts]   Resolve comments
  versions <slug-id>         List version history
  version <slug-id> <num>    Get a specific version
  collection create <title>  Create a collection (--part / reader's guide flags)
  collection list, ls        List your collections
  collection get <slug>      Get collection details + pages
  collection add <collection-slug> <page-id>  Add page to collection (use page id from list)
  collection remove <collection-slug> <page-id>  Remove page from collection
  collection delete <slug>   Delete a collection
  collection update <slug>   Update collection metadata
  collection part <sub>      Manage collection parts (list|add|update|remove)
  access page <slug-id>      Page access status (visibility + shares)
  access page share <slug-id>   Share a private page (--email or --domain)
  access page unshare <slug-id> Remove a page share (--email or --domain)
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
  --access <level>           public (default), or private
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
  --slugs <s1,s2,...>        Ungrouped page segments (id or slug-id, after all parts)
  --part <spec>              Part spec: "Title" or "Title:seg1,seg2" (page segments)
  --parts <json>             Parts as JSON array [{ "title", "page_slugs"? }]
  --parts-file <path>        JSON file with parts array
  --access <level>           public (default), or private
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
  --access <level>           public (default), or private; Change visibility only (ignores file/stdin)

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
  if (mcpMode) {
    const { startMcp } = await import('./mcp.js');
    await startMcp();
    return;
  }

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    help();
    process.exit(0);
  }

  const command = resolveCliCommand(cmd);
  if (!command) err(`Unknown command: ${cmd}. Run: vibe-pub help`);

  await command.handler({ cleanArgs, format });
}

main().catch((e) => {
  err(e.message, e.status ?? 1);
});
