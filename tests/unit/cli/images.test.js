import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  collectLocalImageAssets,
  extractLocalImagePathMap,
  isLocalImagePath,
} from '../../../cli/lib/images.js';

describe('cli images', () => {
  it('isLocalImagePath matches server rules', () => {
    expect(isLocalImagePath('/tmp/a.png')).toBe(true);
    expect(isLocalImagePath('./a.png')).toBe(false);
  });

  it('collectLocalImageAssets reads absolute-path files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vibe-pub-img-'));
    const pngPath = join(dir, 'test.png');
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    writeFileSync(pngPath, png);

    const markdown = `![test](${pngPath})`;
    const map = extractLocalImagePathMap(markdown);
    expect(map.size).toBe(1);

    const assets = collectLocalImageAssets(markdown);
    expect(assets).toHaveLength(1);
    expect(assets[0].mime_type).toBe('image/png');
    expect(assets[0].path).toContain('test.png');
    expect(assets[0].data_base64).toBeTruthy();
  });
});
