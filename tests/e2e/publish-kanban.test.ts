import { test, expect } from '@playwright/test';

// Kanban parser expects ### (h3) for cards, not checkboxes.
// Use frontmatter to force kanban view since detectView() uses checkbox heuristic.
const KANBAN_MARKDOWN = `---
view: kanban
---

## Backlog

### Design the homepage

Landing page wireframes

### Write documentation

API docs and README

## In Progress

### Build API endpoints

REST endpoints for CRUD

## Done

### Project setup

Repo, CI, deploy pipeline
`;

test.describe('Publish kanban flow', () => {
  test('detects kanban and renders board', async ({ page }) => {
    await page.goto('/new');

    // Type kanban markdown
    const textarea = page.locator('textarea[name="markdown"]');
    await textarea.fill(KANBAN_MARKDOWN);

    // Publish directly (kanban auto-detection happens server-side too)
    await page.locator('.btn-publish').click();

    // Should see the published URL
    const published = page.locator('.published');
    await expect(published).toBeVisible({ timeout: 10_000 });
    const link = published.locator('a');

    // Navigate to published page
    await link.click();
    await page.waitForLoadState('networkidle');

    // Verify kanban board renders with columns
    const columns = page.locator('.kanban-column');
    await expect(columns).toHaveCount(3, { timeout: 10_000 });

    // Verify column titles
    const titles = page.locator('.column-title');
    await expect(titles.nth(0)).toContainText('Backlog');
    await expect(titles.nth(1)).toContainText('In Progress');
    await expect(titles.nth(2)).toContainText('Done');

    // Verify cards exist (4 cards across 3 columns)
    const cards = page.locator('.card-drag-wrapper');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    const cardCount = await cards.count();
    expect(cardCount).toBe(4);
  });

  test('non-kanban markdown stays as doc', async ({ page }) => {
    await page.goto('/new');

    // Regular markdown (no checkbox pattern)
    const textarea = page.locator('textarea[name="markdown"]');
    await textarea.fill('# Just a Doc\n\n## Section A\n\nSome text.\n\n## Section B\n\nMore text.');

    // Preview should NOT show kanban badge
    await page.locator('.tabs button', { hasText: 'Preview' }).click();
    await expect(page.locator('.badge')).not.toBeVisible();
    await expect(page.locator('.preview-html h1')).toContainText('Just a Doc');
  });
});
