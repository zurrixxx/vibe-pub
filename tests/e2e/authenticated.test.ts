import { test, expect } from './auth-fixture';

test.describe('Authenticated user flows', () => {
  test('header shows @username after login', async ({ authedPage }) => {
    const { page, username } = authedPage;
    expect(username).toBeTruthy();

    // Header should show @username instead of "Sign in"
    const navLink = page.locator('header .nav-right a[href^="/@"]');
    await expect(navLink).toContainText(`@${username}`);

    // "Sign in" should NOT be visible
    await expect(page.locator('a[href="/auth/login"]')).not.toBeVisible();
  });

  test('published page is owned by user', async ({ authedPage }) => {
    const { page } = authedPage;

    // Publish a page
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# My Owned Page\n\nThis is mine.');
    await page.locator('.btn-publish').click();

    const published = page.locator('.published');
    await expect(published).toBeVisible({ timeout: 10_000 });
    const link = published.locator('a');
    await link.click();
    await page.waitForLoadState('networkidle');

    // Owner should see Edit button
    const editBtn = page.locator('.toolbar-btn', { hasText: 'Edit' });
    await expect(editBtn).toBeVisible();
  });

  test('owner can edit a doc page', async ({ authedPage }) => {
    const { page } = authedPage;

    // Publish
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# Before Edit\n\nOriginal content.');
    await page.locator('.btn-publish').click();
    await expect(page.locator('.published')).toBeVisible({ timeout: 10_000 });
    await page.locator('.published a').click();
    await page.waitForLoadState('networkidle');

    // Click Edit
    await page.locator('.toolbar-btn', { hasText: 'Edit' }).click();

    // Should see edit textarea
    const textarea = page.locator('.edit-textarea');
    await expect(textarea).toBeVisible();

    // Modify content
    await textarea.fill('# After Edit\n\nUpdated content.');

    // Save
    await page.locator('.toolbar-btn.toolbar-save').click();
    await page.waitForLoadState('networkidle');

    // Page should now show updated content
    await expect(page.locator('h1')).toContainText('After Edit');
  });

  test('workspace page shows user pages', async ({ authedPage }) => {
    const { page, username } = authedPage;

    // Publish a page first
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# Workspace Test Page\n\nTest.');
    await page.locator('.btn-publish').click();
    await expect(page.locator('.published')).toBeVisible({ timeout: 10_000 });

    // Navigate to workspace
    await page.goto(`/@${username}`);

    // Should see "Your workspace"
    await expect(page.locator('.workspace-sub')).toContainText('Your workspace');

    // Should see the page card
    await expect(page.locator('.page-card').first()).toBeVisible();

    // Should see "+ New page" button
    await expect(page.locator('.new-page-btn', { hasText: 'New page' })).toBeVisible();
  });

  test('API /api/pub returns user pages when authenticated', async ({ authedPage }) => {
    const { page } = authedPage;

    // Publish a page via UI first
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# API List Test\n\nTest.');
    await page.locator('.btn-publish').click();
    await expect(page.locator('.published')).toBeVisible({ timeout: 10_000 });

    // Now fetch API using the session cookie (page context has it)
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/pub');
      return { status: r.status, body: await r.json() };
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].slug).toBeTruthy();
  });

  test('non-owner cannot see Edit button', async ({ authedPage, browser }) => {
    const { page } = authedPage;

    // Publish a page as authenticated user
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# Not Yours\n\nAnother user page.');
    await page.locator('.btn-publish').click();
    await expect(page.locator('.published')).toBeVisible({ timeout: 10_000 });
    const href = await page.locator('.published a').getAttribute('href');

    // Open in incognito (no auth cookie)
    const context = await browser.newContext();
    const anonPage = await context.newPage();
    await anonPage.goto(`http://localhost:5180${href}`);
    await anonPage.waitForLoadState('networkidle');

    // Should see the page content
    await expect(anonPage.locator('h1')).toContainText('Not Yours');

    // Should NOT see Edit button
    await expect(anonPage.locator('.toolbar-btn')).not.toBeVisible();

    await context.close();
  });

  test('page access badges shown on workspace', async ({ authedPage }) => {
    const { page, username } = authedPage;

    // Publish a page
    await page.goto('/new');
    await page.locator('textarea[name="markdown"]').fill('# Badge Test\n\nTest badges.');
    await page.locator('.btn-publish').click();
    await expect(page.locator('.published')).toBeVisible({ timeout: 10_000 });

    // Go to workspace
    await page.goto(`/@${username}`);

    // Should see badges (doc + unlisted)
    const badges = page.locator('.page-card').first().locator('.badge');
    await expect(badges.first()).toBeVisible();
  });

  test('logout clears session', async ({ authedPage }) => {
    const { page } = authedPage;

    // Verify logged in
    await expect(page.locator('header .nav-right a[href^="/@"]')).toBeVisible();

    // Logout is a POST endpoint — call it via fetch and follow redirect
    await page.evaluate(async () => {
      const res = await fetch('/auth/logout', { method: 'POST', redirect: 'follow' });
    });

    // Reload to pick up cleared cookie
    await page.goto('/');

    // Should see "Sign in" again
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
  });
});
