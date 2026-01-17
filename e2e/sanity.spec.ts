import { test, expect } from '@playwright/test';

test.describe('Sanity Checks', () => {
    test('homepage has correct title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Leaguely/);
    });

    test('dashboard validation redirects to signin', async ({ page }) => {
        // Assuming no session context is provided by default, accessing dashboard should redirect
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*api\/auth\/signin/);
    });
});
