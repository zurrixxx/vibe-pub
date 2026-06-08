import { describe, it, expect } from 'vitest';
import {
  parseGlobalFlags,
  collectOption,
  globalFormat,
  handlerCtx,
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
