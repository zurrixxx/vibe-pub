import { test as base, expect } from '@playwright/test';
import { SignJWT } from 'jose';

// Must match .dev.vars JWT_SECRET
const JWT_SECRET = 'test-jwt-secret-for-local-dev-only-32chars!';
const TEST_EMAIL = 'test@vibe.pub';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

async function createMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(getSecret());
}

/**
 * Extend Playwright test with an `authedPage` fixture that logs in via magic link.
 * Returns { page, username } where username is the auto-derived username.
 */
export const test = base.extend<{
  authedPage: { page: typeof base extends infer T ? any : never; username: string };
}>({
  authedPage: async ({ page }, use) => {
    // Create a magic link token and visit verify endpoint to authenticate
    const token = await createMagicLinkToken(TEST_EMAIL);
    const res = await page.goto(`/auth/verify?token=${token}`);

    // Should redirect to homepage
    await page.waitForURL('/');

    // Extract username from header nav-link (right side, not the logo)
    const navLink = page.locator('header .nav-right a[href^="/@"]');
    await expect(navLink).toBeVisible({ timeout: 5_000 });
    const username = (await navLink.textContent())?.replace('@', '') ?? '';

    await use({ page, username });
  },
});

export { expect };
