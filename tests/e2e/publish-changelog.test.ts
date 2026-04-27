import { test, expect } from '@playwright/test';

const CHANGELOG_MARKDOWN = `---
view: changelog
title: Product Changelog
---

## [1.2.0] - 2024-03-15

### Added
- New dashboard with real-time metrics
- Export to CSV functionality

### Fixed
- Login timeout on slow connections

## [1.1.0] - 2024-03-01

### Changed
- Upgraded to React 19
- Improved search performance by 3x

### Removed
- Legacy API v1 endpoints
`;

test.describe('Publish changelog flow', () => {
  test('publishes changelog and renders releases', async ({ page }) => {
    await page.goto('/new');

    await page.locator('textarea[name="markdown"]').fill(CHANGELOG_MARKDOWN);
    await page.locator('.btn-publish').click();

    const published = page.locator('.published');
    await expect(published).toBeVisible({ timeout: 10_000 });
    await page.locator('.published a').click();
    await page.waitForLoadState('networkidle');

    // Should render changelog view with release cards
    const releases = page.locator('.release-card');
    await expect(releases.first()).toBeVisible({ timeout: 5_000 });
    const releaseCount = await releases.count();
    expect(releaseCount).toBe(2);

    // Version numbers visible
    await expect(page.locator('.release-version').first()).toContainText('1.2.0');
    await expect(page.locator('.release-version').nth(1)).toContainText('1.1.0');

    // Categories visible
    await expect(page.locator('.category-name').first()).toBeVisible();

    // Entries visible
    await expect(page.getByText('New dashboard with real-time metrics')).toBeVisible();
    await expect(page.getByText('Export to CSV functionality')).toBeVisible();
  });

  test('auto-detects changelog from markdown', async ({ request }) => {
    // Post without explicit view: changelog — should auto-detect
    const md = `## [2.0.0] - 2024-06-01\n\n### Added\n- Feature A\n\n### Fixed\n- Bug B\n\n## [1.0.0] - 2024-01-01\n\n### Added\n- Initial release`;
    const res = await request.post('/api/pub', {
      data: { markdown: md },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    // Fetch the page and verify it's rendered as changelog
    const pageRes = await request.get(`/${body.slug}`);
    expect(pageRes.status()).toBe(200);
    const html = await pageRes.text();
    // Should contain changelog-specific elements
    expect(html).toContain('changelog');
  });

  test('changelog OG description mentions releases', async ({ request }) => {
    const res = await request.post('/api/pub', {
      data: { markdown: CHANGELOG_MARKDOWN },
    });
    const { slug } = await res.json();

    const pageRes = await request.get(`/${slug}`);
    const html = await pageRes.text();
    expect(html).toContain('Changelog with 2 releases');
  });
});
