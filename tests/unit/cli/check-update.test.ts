import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUpdateSeverity } from '../../../cli/lib/check-update.js';

describe('getUpdateSeverity', () => {
  it('returns none when current equals latest', () => {
    expect(getUpdateSeverity('0.2.0', '0.2.0')).toBe('none');
  });

  it('returns none when current is newer', () => {
    expect(getUpdateSeverity('1.0.0', '0.9.9')).toBe('none');
  });

  it('returns patch when only patch lags', () => {
    expect(getUpdateSeverity('0.1.3', '0.1.4')).toBe('patch');
  });

  it('returns required when minor lags', () => {
    expect(getUpdateSeverity('0.0.4', '0.1.4')).toBe('required');
  });

  it('returns required when major lags', () => {
    expect(getUpdateSeverity('0.1.4', '1.0.0')).toBe('required');
  });
});

describe('checkForUpdate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips registry fetch when cache is fresh', async () => {
    vi.doMock('../../../cli/lib/config.js', () => ({
      getConfig: vi.fn(() => ({ lastUpdateCheck: Date.now() - 60_000 })),
      saveConfig: vi.fn(),
    }));

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { checkForUpdate } = await import('../../../cli/lib/check-update.js');

    await expect(checkForUpdate()).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns false on registry errors without blocking', async () => {
    vi.doMock('../../../cli/lib/config.js', () => ({
      getConfig: vi.fn(() => ({})),
      saveConfig: vi.fn(),
    }));

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { checkForUpdate } = await import('../../../cli/lib/check-update.js');
    await expect(checkForUpdate()).resolves.toBe(false);

    errSpy.mockRestore();
  });

  it('warns when a newer patch is available but does not block', async () => {
    vi.doMock('../../../cli/lib/config.js', () => ({
      getConfig: vi.fn(() => ({})),
      saveConfig: vi.fn(),
    }));

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.2.1' }),
    } as Response);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { checkForUpdate } = await import('../../../cli/lib/check-update.js');
    await expect(checkForUpdate()).resolves.toBe(false);

    expect(errSpy).toHaveBeenCalledWith('\nUpdate available: 0.2.0 → 0.2.1');
    expect(errSpy).toHaveBeenCalledWith('\nPlease update manually:\n  npm install -g vibe-pub\n');

    errSpy.mockRestore();
  });
});
