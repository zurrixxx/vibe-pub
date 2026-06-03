import {
  accessPageStatusHandler,
  accessPageShareHandler,
  accessPageUnshareHandler,
  accessCollectionStatusHandler,
  accessCollectionShareHandler,
  accessCollectionUnshareHandler,
} from '../handlers/index.js';
import { bindAction } from '../cli-helpers.js';

const shareOpts = (slug, opts) => ({
  slug,
  email: opts.email,
  domain: opts.domain,
  role: opts.role,
});

const unshareOpts = (slug, opts) => ({
  slug,
  email: opts.email,
  domain: opts.domain,
});

/** @param {import('commander').Command} program */
export function registerAccessCommands(program) {
  const access = program.command('access').description('Manage page/collection access');

  const page = access.command('page').description('Page access');

  page
    .command('status <slug-id>')
    .description('Show page access status')
    .action(bindAction(accessPageStatusHandler, (slug) => ({ slug })));

  page
    .command('share <slug-id>')
    .description('Share a private page')
    .option('--email <email>', 'Share with a user by email')
    .option('--domain <domain>', 'Share with an email domain (e.g. @company.com)')
    .option('--role <viewer|editor>', 'Permission when sharing (default: viewer)')
    .action(bindAction(accessPageShareHandler, shareOpts));

  page
    .command('unshare <slug-id>')
    .description('Remove a page share')
    .option('--email <email>', 'Remove share for a user by email')
    .option('--domain <domain>', 'Remove share for an email domain')
    .action(bindAction(accessPageUnshareHandler, unshareOpts));

  const collection = access.command('collection').alias('coll').description('Collection access');

  collection
    .command('status <slug>')
    .description('Show collection access status')
    .action(bindAction(accessCollectionStatusHandler, (slug) => ({ slug })));

  collection
    .command('share <slug>')
    .description('Share a private collection')
    .option('--email <email>', 'Share with a user by email')
    .option('--domain <domain>', 'Share with an email domain (e.g. @company.com)')
    .option('--role <viewer|editor>', 'Permission when sharing (default: viewer)')
    .action(bindAction(accessCollectionShareHandler, shareOpts));

  collection
    .command('unshare <slug>')
    .description('Remove a collection share')
    .option('--email <email>', 'Remove share for a user by email')
    .option('--domain <domain>', 'Remove share for an email domain')
    .action(bindAction(accessCollectionUnshareHandler, unshareOpts));
}
