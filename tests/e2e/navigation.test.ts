import { test, expect } from '@playwright/test';

test.describe('Navigation and layout', () => {
  test('homepage loads with CTA to /new', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/vibe\.pub/i);

    // Should have a link to the new page
    const pasteLink = page.locator('a[href="/new"]').first();
    await expect(pasteLink).toBeVisible();
  });

  test('header shows logo and sign in link', async ({ page }) => {
    await page.goto('/new');

    // Logo present
    const logo = page.locator('.logo-link, a[href="/"]').first();
    await expect(logo).toBeVisible();

    // Sign in link (when not logged in)
    const signIn = page.locator('a[href="/auth/login"]');
    await expect(signIn).toBeVisible();
  });

  test('login page renders with auth options', async ({ page }) => {
    await page.goto('/auth/login');

    // Should have GitHub and Google OAuth buttons
    await expect(page.locator('.github-btn, a[href="/auth/github"]').first()).toBeVisible();
    await expect(page.locator('.google-btn, a[href="/auth/google"]').first()).toBeVisible();

    // Should have email toggle
    await expect(page.locator('.email-toggle')).toBeVisible();

    // Click email toggle — email form appears
    await page.locator('.email-toggle').click();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('404 page for non-existent slug', async ({ page }) => {
    const res = await page.goto('/definitely-not-a-real-page-xyz123');
    // Should be 404
    expect(res?.status()).toBe(404);
  });

  test('publish flow navigates end-to-end', async ({ page }) => {
    // Start at homepage
    await page.goto('/');

    // Click the "Paste markdown" CTA
    await page.locator('a[href="/new"]').first().click();
    await expect(page).toHaveURL(/\/new/);

    // Publish something
    await page.locator('textarea[name="markdown"]').fill('# E2E Navigation Test\n\nWorks.');
    await page.locator('.btn-publish').click();

    // Follow the published link
    const link = page.locator('.published a');
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();

    // Should be on the published page
    await expect(page.locator('h1')).toContainText('E2E Navigation Test');
  });
});
