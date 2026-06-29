import { describe, it, expect } from 'vitest';
import {
  extractLocalImagePaths,
  extractHostedAssetIds,
  isLocalImagePath,
  normalizeAssetPath,
  rewriteMarkdownImagePaths,
  detectImageMimeType,
} from '$lib/shared/page-images';

describe('normalizeAssetPath', () => {
  it('normalizes backslashes', () => {
    expect(normalizeAssetPath('C:\\Users\\a\\pic.png')).toBe('C:/Users/a/pic.png');
  });
});

describe('isLocalImagePath', () => {
  it('accepts unix absolute paths', () => {
    expect(isLocalImagePath('/Users/a/img.png')).toBe(true);
  });

  it('accepts windows absolute paths', () => {
    expect(isLocalImagePath('C:/tmp/a.png')).toBe(true);
  });

  it('rejects remote URLs', () => {
    expect(isLocalImagePath('https://example.com/a.png')).toBe(false);
  });

  it('rejects hosted vibe.pub asset URLs', () => {
    expect(isLocalImagePath('https://vibe.pub/i/abc123')).toBe(false);
    expect(isLocalImagePath('/i/abc123')).toBe(false);
  });

  it('rejects relative paths', () => {
    expect(isLocalImagePath('./images/a.png')).toBe(false);
  });
});

describe('extractLocalImagePaths', () => {
  it('collects unique local absolute paths from markdown', () => {
    const md = `# Hi

![a](/Users/a/one.png)
![b](/Users/a/two.jpg)
![c](/Users/a/one.png)
![d](https://cdn/x.png)`;
    expect(extractLocalImagePaths(md)).toEqual(['/Users/a/one.png', '/Users/a/two.jpg']);
  });
});

describe('rewriteMarkdownImagePaths', () => {
  it('replaces local paths with hosted URLs', () => {
    const md = '![diagram](/Users/a/diagram.png) and ![logo](https://x/y.png)';
    const out = rewriteMarkdownImagePaths(
      md,
      new Map([['/Users/a/diagram.png', 'https://vibe.pub/i/abc123']])
    );
    expect(out).toBe('![diagram](https://vibe.pub/i/abc123) and ![logo](https://x/y.png)');
  });
});

describe('extractHostedAssetIds', () => {
  it('collects unique asset ids from hosted image URLs', () => {
    const md = `# Doc

![keep](https://vibe.pub/i/aabbccddeeff)
![also](/i/001122334455)
![remote](https://cdn.example/x.png)
![dup](https://vibe.pub/i/aabbccddeeff)`;
    expect(extractHostedAssetIds(md)).toEqual(['aabbccddeeff', '001122334455']);
  });

  it('returns empty when no hosted assets', () => {
    expect(extractHostedAssetIds('![x](https://cdn/x.png)')).toEqual([]);
  });
});

describe('detectImageMimeType', () => {
  it('detects png', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMimeType(png)).toBe('image/png');
  });
});
