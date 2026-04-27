import { test, expect } from '@playwright/test';

/**
 * Helper: publish markdown via API, return the slug.
 */
async function publishPage(request: any, markdown: string): Promise<string> {
  const res = await request.post('/api/pub', {
    data: { markdown },
  });
  const body = await res.json();
  return body.slug;
}

test.describe('Doc rendering quality', () => {
  test('renders headings correctly', async ({ page, request }) => {
    const slug = await publishPage(request, '# H1 Title\n\n## H2 Section\n\n### H3 Sub');
    await page.goto(`/${slug}`);

    await expect(page.locator('h1')).toContainText('H1 Title');
    await expect(page.locator('h2').first()).toContainText('H2 Section');
    await expect(page.locator('h3').first()).toContainText('H3 Sub');
  });

  test('renders code blocks', async ({ page, request }) => {
    const md = '# Code Test\n\n```python\ndef hello():\n    print("world")\n```';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    const pre = page.locator('pre').first();
    await expect(pre).toBeVisible();
    await expect(pre).toContainText('hello');
    await expect(pre).toContainText('print');
  });

  test('renders tables', async ({ page, request }) => {
    const md = '# Table Test\n\n| Name | Value |\n|------|-------|\n| foo | 1 |\n| bar | 2 |';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    await expect(table).toContainText('foo');
    await expect(table).toContainText('bar');
  });

  test('renders checkboxes in doc mode', async ({ page, request }) => {
    // A single heading with checkboxes should NOT trigger kanban (needs 2+ headings)
    const md = '# Checklist\n\n- [ ] Not done\n- [x] Done';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    // Should render as doc with checkboxes, NOT as kanban
    await expect(page.locator('h1')).toContainText('Checklist');
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);
  });

  test('renders blockquotes', async ({ page, request }) => {
    const md = '# Quote Test\n\n> This is a blockquote\n> with multiple lines.';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    const bq = page.locator('blockquote').first();
    await expect(bq).toBeVisible();
    await expect(bq).toContainText('blockquote');
  });

  test('renders inline code', async ({ page, request }) => {
    const md = '# Inline Code\n\nUse `console.log()` for debugging.';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    const code = page.locator('code', { hasText: 'console.log()' });
    await expect(code).toBeVisible();
  });

  test('renders links', async ({ page, request }) => {
    const md = '# Links\n\nVisit [Example](https://example.com) for more.';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    const link = page.locator('a', { hasText: 'Example' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com');
  });

  test('renders bold and italic', async ({ page, request }) => {
    const md = '# Formatting\n\n**Bold text** and *italic text* and ***both***.';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    await expect(page.locator('strong', { hasText: 'Bold text' })).toBeVisible();
    await expect(page.locator('em', { hasText: 'italic text' })).toBeVisible();
  });

  test('renders ordered and unordered lists', async ({ page, request }) => {
    const md = '# Lists\n\n- Unordered A\n- Unordered B\n\n1. Ordered 1\n2. Ordered 2';
    const slug = await publishPage(request, md);
    await page.goto(`/${slug}`);

    await expect(page.locator('ul')).toBeVisible();
    await expect(page.locator('ol')).toBeVisible();
    await expect(page.locator('li', { hasText: 'Unordered A' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Ordered 1' })).toBeVisible();
  });
});
