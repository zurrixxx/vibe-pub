import { test, expect } from '@playwright/test';

const SAMPLE_DOC = `# Test Document

This is a test document with **bold** and *italic* text.

## Section One

Some content in section one.

- Item 1
- Item 2
- Item 3

## Section Two

\`\`\`javascript
const x = 42;
console.log(x);
\`\`\`

> A blockquote for testing.
`;

test.describe('Publish doc flow', () => {
  test('publishes markdown and renders as doc', async ({ page }) => {
    // Go to the new page
    await page.goto('/new');
    await expect(page.locator('h1')).toContainText('New page');

    // Type markdown into textarea
    const textarea = page.locator('textarea[name="markdown"]');
    await textarea.fill(SAMPLE_DOC);

    // Click publish
    await page.locator('.btn-publish').click();

    // Should see the published URL
    const published = page.locator('.published');
    await expect(published).toBeVisible({ timeout: 10_000 });
    const link = published.locator('a');
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();

    // Navigate to the published page
    await link.click();
    await page.waitForLoadState('networkidle');

    // Verify doc rendered correctly
    await expect(page.locator('h1')).toContainText('Test Document');
    await expect(page.locator('h2').first()).toContainText('Section One');
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('shows error when publishing empty content', async ({ page }) => {
    await page.goto('/new');
    await page.locator('.btn-publish').click();

    // Should show error message
    await expect(page.locator('.err')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.err')).toContainText('required');
  });

  test('preview tab renders markdown', async ({ page }) => {
    await page.goto('/new');

    const textarea = page.locator('textarea[name="markdown"]');
    await textarea.fill('# Hello Preview\n\nSome **bold** text.');

    // Switch to preview tab
    await page.locator('.tabs button', { hasText: 'Preview' }).click();

    // Verify preview renders HTML
    const preview = page.locator('.preview-html');
    await expect(preview).toBeVisible();
    await expect(preview.locator('h1')).toContainText('Hello Preview');
    await expect(preview.locator('strong')).toContainText('bold');
  });
});
