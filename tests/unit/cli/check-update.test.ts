import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getUpdateSeverity', () => {
  async function load() {
    const mod = await import('../../../cli/lib/check-update.js');
    return mod.getUpdateSeverity;
  }

  it('returns none when current equals latest', async () => {
    const getUpdateSeverity = await load();
    expect(getUpdateSeverity('0.2.0', '0.2.0')).toBe('none');
  });

  it('returns none when current is newer', async () => {
    const getUpdateSeverity = await load();
    expect(getUpdateSeverity('1.0.0', '0.9.9')).toBe('none');
  });

  it('returns patch when only patch lags', async () => {
    const getUpdateSeverity = await load();
    expect(getUpdateSeverity('0.1.3', '0.1.4')).toBe('patch');
  });

  it('returns required when minor lags', async () => {
    const getUpdateSeverity = await load();
    expect(getUpdateSeverity('0.0.4', '0.1.4')).toBe('required');
  });

  it('returns required when major lags', async () => {
    const getUpdateSeverity = await load();
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
});
