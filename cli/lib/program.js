import { Command } from 'commander';
import { HELP_TEXT } from './constants.js';
import { out, err, bindAction, collectOption } from './cli-helpers.js';
import { registerCollectionCommands } from './sub-commands/collection.js';
import { registerAccessCommands } from './sub-commands/access.js';
import {
  formatHandler,
  publishHandler,
  getHandler,
  listHandler,
  updateHandler,
  deleteHandler,
  commentsHandler,
  commentHandler,
  resolveHandler,
  versionsHandler,
  versionHandler,
  loginHandler,
  logoutHandler,
  configHandler,
  whoamiHandler,
} from './handlers/index.js';

function showHelp() {
  out(HELP_TEXT, 'human');
  process.exit(0);
}

/** Route all `-h` / `--help` output to HELP_TEXT (constants.js). */
function configureHandwrittenHelp(cmd) {
  cmd.configureHelp({ formatHelp: () => HELP_TEXT });
  cmd.addHelpCommand(false);
  for (const sub of cmd.commands) configureHandwrittenHelp(sub);
}

export function createProgram() {
  const program = new Command();

  program
    .name('vibe-pub')
    .description('Publish markdown to vibe.pub')
    .option('--format <type>', 'Output format (json or human)', 'json');

  program.exitOverride((e) => {
    if (e.code === 'commander.helpDisplayed' || e.code === 'commander.help') {
      process.exit(0);
    }
    if (e.code === 'commander.unknownCommand') {
      const match = e.message.match(/unknown command '([^']+)'/i);
      const name = match?.[1] ?? e.message.replace(/^error:\s*/i, '');
      err(`Unknown command: ${name}. Run: vibe-pub --help`);
    }
    if (
      e.code === 'commander.missingArgument' ||
      e.code === 'commander.missingMandatoryOptionValue' ||
      e.code === 'commander.invalidArgument'
    ) {
      err(e.message);
    }
    throw e;
  });

  program
    .command('format [name]')
    .description('Get markdown format reference for agents before publishing')
    .action(bindAction(formatHandler, (name) => ({ name })));

  program
    .command('publish [file]')
    .alias('pub')
    .description('Publish markdown (file or stdin)')
    .option('--slug <slug>', 'Custom URL slug')
    .option('--view <view>', 'Page view (doc, kanban, changelog, ...)')
    .option('--access <level>', 'public (default) or private')
    .option('--theme <theme>', 'Page theme')
    .option('--no-agent-published', 'Do not mark as agent-published')
    .action(
      bindAction(publishHandler, (file, opts) => ({
        file,
        slug: opts.slug,
        view: opts.view,
        access: opts.access,
        theme: opts.theme,
        noAgentPublished: opts.noAgentPublished,
      }))
    );

  program
    .command('get <slug-id>')
    .description('Get page by id or slug-id')
    .action(bindAction(getHandler, (slug) => ({ slug })));

  program
    .command('list')
    .alias('ls')
    .description('List your pages')
    .action(bindAction(listHandler, () => ({})));

  program
    .command('update <slug-id> [file]')
    .description('Update a page (file or stdin)')
    .option('--access <level>', 'Change visibility only (ignores file/stdin)')
    .action(
      bindAction(updateHandler, (slug, file, opts) => ({
        slug,
        file,
        access: opts.access,
      }))
    );

  program
    .command('delete <slug-id>')
    .alias('rm')
    .description('Delete a page')
    .action(bindAction(deleteHandler, (slug) => ({ slug })));

  program
    .command('comments <slug-id>')
    .description('List open comments')
    .option('-a, --all', 'Include resolved comments')
    .action(
      bindAction(commentsHandler, (slug, opts) => ({
        slug,
        all: opts.all,
      }))
    );

  program
    .command('comment <slug-id> <body>')
    .description('Add a comment')
    .option('--anchor <blockId>', 'Anchor comment to a block')
    .action(
      bindAction(commentHandler, (slug, body, opts) => ({
        slug,
        body,
        anchor: opts.anchor,
      }))
    );

  program
    .command('resolve <slug-id>')
    .description('Resolve comments')
    .option('--all', 'Resolve all comments')
    .option('--ids <ids>', 'Resolve specific comment IDs (comma-separated)')
    .action(
      bindAction(resolveHandler, (slug, opts) => ({
        slug,
        all: opts.all,
        ids: opts.ids,
      }))
    );

  program
    .command('versions <slug-id>')
    .description('List version history')
    .action(bindAction(versionsHandler, (slug) => ({ slug })));

  program
    .command('version <slug-id> <num>')
    .description('Get a specific version')
    .action(bindAction(versionHandler, (slug, num) => ({ slug, num })));

  program.command('login').description('Sign in via browser').action(loginHandler);

  program.command('logout').description('Sign out').action(logoutHandler);

  program
    .command('whoami')
    .description('Show current auth info')
    .action(bindAction(whoamiHandler, () => ({})));

  program
    .command('config')
    .description('Save configuration')
    .option('--token <token>', 'Save session token')
    .option('--base-url <url>', 'Save base URL')
    .action(
      bindAction(configHandler, (opts) => ({
        token: opts.token,
        baseUrl: opts.baseUrl,
      }))
    );

  registerCollectionCommands(program);
  registerAccessCommands(program);

  program.command('help').description('Show full command reference').action(showHelp);

  configureHandwrittenHelp(program);

  return program;
}

/** Parse argv; empty invocation shows HELP_TEXT. */
export async function runProgram(processArgv) {
  const argv = processArgv.slice(2);
  const program = createProgram();
  if (argv.length === 0) showHelp();
  await program.parseAsync(processArgv);
}
