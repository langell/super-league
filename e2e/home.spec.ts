import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Super League/);
});

test('get started link', async ({ page }) => {
    await page.goto('/');
    // Click the get started link (or similar button)
    const getStarted = page.getByRole('link', { name: /Get Started/i });
    if (await getStarted.isVisible()) {
        await getStarted.click();
        await expect(page).toHaveURL(/.*auth/);
    }
});
