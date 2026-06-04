/** @param {import('commander').Command} cmd */
export function globalFormat(cmd) {
  return cmd.optsWithGlobals().format ?? 'json';
}

export function out(data, format = 'json') {
  if (format === 'human') {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.log(JSON.stringify(data));
  }
}

export function err(message, status = 1) {
  console.log(JSON.stringify({ error: message, status }));
  process.exit(1);
}

/**
 * @param {import('commander').Command} cmd
 * @param {Record<string, unknown>} params
 */
export function handlerCtx(cmd, params = {}) {
  return { format: globalFormat(cmd), ...params };
}

/**
 * Wrap a handler for Commander `.action()`.
 *
 * Commander calls the action as `(...positionals, opts, cmd)` — positionals first,
 * then the parsed options object, then the Command instance last.
 *
 * `mapParams` receives only `(...positionals, opts)`; do not add `cmd` as a
 * parameter. `bindAction` strips `cmd` and passes it to {@link handlerCtx} for
 * globals such as `--format`.
 *
 * @example
 * // update <slug-id> [file] --access <level>
 * bindAction(updateHandler, (slug, file, opts) => ({
 *   slug,
 *   file,
 *   access: opts.access,
 * }))
 *
 * @param {(ctx: object) => Promise<void>} handler
 * @param {(...args: unknown[]) => Record<string, unknown>} mapParams
 *   Maps Commander positionals + opts to handler context fields (excluding cmd).
 */
export function bindAction(handler, mapParams) {
  return (...allArgs) => {
    const cmd = allArgs[allArgs.length - 1];
    return handler(handlerCtx(cmd, mapParams(...allArgs.slice(0, -1))));
  };
}

/** @param {string} val @param {string[]} memo */
export function collectOption(val, memo) {
  memo.push(val);
  return memo;
}

/**
 * @param {string[]} argv
 * @returns {{ mcpMode: boolean }}
 */
export function parseGlobalFlags(argv) {
  let mcpMode = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--mcp') mcpMode = true;
    else if (argv[i] === '--format' && argv[i + 1]) i++;
  }
  return { mcpMode };
}
