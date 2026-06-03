import {
  collectionCreateHandler,
  collectionListHandler,
  collectionGetHandler,
  collectionAddHandler,
  collectionRemoveHandler,
  collectionDeleteHandler,
  collectionUpdateHandler,
  collectionPartListHandler,
  collectionPartAddHandler,
  collectionPartUpdateHandler,
  collectionPartRemoveHandler,
} from '../handlers/index.js';
import { bindAction, collectOption } from '../cli-helpers.js';

/** @param {import('commander').Command} program */
export function registerCollectionCommands(program) {
  const collection = program.command('collection').alias('coll').description('Manage collections');

  collection
    .command('create <title>')
    .description('Create a collection')
    .option('--slug <slug>', 'Custom collection slug')
    .option('--description <text>', 'Cover subtitle under the title')
    .option('--readers-guide <text>', "Cover lede under «A reader's guide»")
    .option('--what-its-about <text>', 'Cover card: what this collection is about')
    .option('--who-its-for <text>', 'Cover card: intended audience')
    .option('--how-to-read-it <text>', 'Cover card: how to navigate / where to start')
    .option('--slugs <slugs>', 'Ungrouped page segments (comma-separated)')
    .option('--part <spec>', 'Part spec: "Title" or "Title:seg1,seg2"', collectOption, [])
    .option('--parts <json>', 'Parts as JSON array [{ "title", "page_slugs"? }]')
    .option('--parts-file <path>', 'JSON file with parts array')
    .option('--access <level>', 'public (default) or private')
    .option('--theme <theme>', 'Collection theme')
    .option('--no-agent-published', 'Do not mark as agent-published')
    .action(
      bindAction(collectionCreateHandler, (title, opts) => ({
        title,
        slug: opts.slug,
        description: opts.description,
        readersGuide: opts.readersGuide,
        whatItsAbout: opts.whatItsAbout,
        whoItsFor: opts.whoItsFor,
        howToReadIt: opts.howToReadIt,
        slugs: opts.slugs,
        part: opts.part,
        parts: opts.parts,
        partsFile: opts.partsFile,
        access: opts.access,
        theme: opts.theme,
        noAgentPublished: opts.noAgentPublished,
      }))
    );

  collection
    .command('list')
    .alias('ls')
    .description('List your collections')
    .action(bindAction(collectionListHandler, () => ({})));

  collection
    .command('get <slug>')
    .description('Get collection details and pages')
    .action(bindAction(collectionGetHandler, (slug) => ({ slug })));

  collection
    .command('add <collection-slug> <page-id>')
    .description('Add page to collection')
    .option('--label <label>', 'Display label (overrides page title in nav)')
    .option('--part-id <id>', 'Part to add the page into')
    .action(
      bindAction(collectionAddHandler, (collSlug, pageSlug, opts) => ({
        collSlug,
        pageSlug,
        label: opts.label,
        partId: opts.partId,
      }))
    );

  collection
    .command('remove <collection-slug> <page-id>')
    .alias('rm')
    .description('Remove page from collection')
    .action(
      bindAction(collectionRemoveHandler, (collSlug, pageSlug) => ({
        collSlug,
        pageSlug,
      }))
    );

  collection
    .command('delete <slug>')
    .description('Delete a collection')
    .action(bindAction(collectionDeleteHandler, (slug) => ({ slug })));

  collection
    .command('update <slug>')
    .description('Update collection metadata')
    .option('--title <title>', 'New title')
    .option('--access <level>', 'New access level')
    .option('--description <text>', 'Cover subtitle')
    .option('--readers-guide <text>', "Cover lede under «A reader's guide»")
    .option('--what-its-about <text>', "Cover card: what it's about")
    .option('--who-its-for <text>', "Cover card: who it's for")
    .option('--how-to-read-it <text>', 'Cover card: how to read it')
    .action(
      bindAction(collectionUpdateHandler, (slug, opts) => ({
        slug,
        title: opts.title,
        access: opts.access,
        description: opts.description,
        readersGuide: opts.readersGuide,
        whatItsAbout: opts.whatItsAbout,
        whoItsFor: opts.whoItsFor,
        howToReadIt: opts.howToReadIt,
      }))
    );

  const part = collection.command('part').description('Manage collection parts');

  part
    .command('list <collection-slug>')
    .alias('ls')
    .description('List parts in a collection')
    .action(bindAction(collectionPartListHandler, (collSlug) => ({ collSlug })));

  part
    .command('add <collection-slug> <title>')
    .description('Add a part to a collection')
    .option('--sort-order <n>', 'Part order in navigation')
    .action(
      bindAction(collectionPartAddHandler, (collSlug, title, opts) => ({
        collSlug,
        title,
        sortOrder: opts.sortOrder,
      }))
    );

  part
    .command('update <collection-slug> <part-id>')
    .description('Update a collection part')
    .option('--title <title>', 'New part title')
    .option('--sort-order <n>', 'New part order')
    .action(
      bindAction(collectionPartUpdateHandler, (collSlug, partId, opts) => ({
        collSlug,
        partId,
        title: opts.title,
        sortOrder: opts.sortOrder,
      }))
    );

  part
    .command('remove <collection-slug> <part-id>')
    .alias('rm')
    .description('Remove a part from a collection')
    .action(
      bindAction(collectionPartRemoveHandler, (collSlug, partId) => ({
        collSlug,
        partId,
      }))
    );
}
