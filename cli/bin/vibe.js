#!/usr/bin/env node
import { err } from '../lib/cli-helpers.js';
import { parseGlobalFlags } from '../lib/cli-helpers.js';
import { checkForUpdate } from '../lib/check-update.js';
import { runProgram } from '../lib/program.js';

async function main() {
  const argv = process.argv.slice(2);
  const { mcpMode } = parseGlobalFlags(argv);

  const shouldAbortStartup = await checkForUpdate({ autoUpdate: !mcpMode });
  if (shouldAbortStartup) {
    return;
  }

  if (mcpMode) {
    const { startMcp } = await import('./mcp.js');
    await startMcp();
    return;
  }

  await runProgram(process.argv);
}

main().catch((e) => {
  err(e.message, e.status ?? 1);
});
