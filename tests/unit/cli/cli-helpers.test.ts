import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseGlobalFlags,
  collectOption,
  globalFormat,
  handlerCtx,
  bindAction,
  out,
} from '../../../cli/lib/cli-helpers.js';

type Command = import('commander').Command;

describe('parseGlobalFlags', () => {
  it('detects --mcp', () => {
    expect(parseGlobalFlags(['--mcp'])).toEqual({ mcpMode: true });
    expect(parseGlobalFlags(['publish', '--mcp', 'notes.md'])).toEqual({ mcpMode: true });
  });

  it('returns false when --mcp is absent', () => {
    expect(parseGlobalFlags(['help'])).toEqual({ mcpMode: false });
    expect(parseGlobalFlags(['--format', 'human', 'list'])).toEqual({ mcpMode: false });
  });
});

describe('collectOption', () => {
  it('accumulates repeated option values', () => {
    const memo: string[] = [];
    collectOption('a', memo);
    collectOption('b', memo);
    expect(memo).toEqual(['a', 'b']);
  });
});

describe('globalFormat / handlerCtx', () => {
  it('defaults to json when format is unset', () => {
    const cmd = { optsWithGlobals: () => ({}) } as Command;
    expect(globalFormat(cmd)).toBe('json');
  });

  it('reads format from commander optsWithGlobals', () => {
    const cmd = { optsWithGlobals: () => ({ format: 'human' }) } as Command;
    expect(globalFormat(cmd)).toBe('human');
    expect(handlerCtx(cmd, { slug: 'x' })).toEqual({ format: 'human', slug: 'x' });
  });
});

describe('bindAction', () => {
  it('passes mapped params and cmd globals to the handler', async () => {
    const cmd = { optsWithGlobals: () => ({ format: 'human' }) } as Command;
    const handler = vi.fn(async () => {});
    const action = bindAction(handler, (slug: string, opts: { access?: string }) => ({
      slug,
      access: opts.access,
    }));

    await action('my-slug', { access: 'private' }, cmd);

    expect(handler).toHaveBeenCalledWith({
      format: 'human',
      slug: 'my-slug',
      access: 'private',
    });
  });
});

describe('out', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints compact JSON by default', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    out({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('{"ok":true}');
  });

  it('pretty-prints objects in human mode', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    out({ ok: true }, 'human');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));
  });

  it('prints raw strings in human mode', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    out('hello', 'human');
    expect(logSpy).toHaveBeenCalledWith('hello');
  });
});
