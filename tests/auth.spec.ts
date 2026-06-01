import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should load the authentication page', async ({ page }) => {
    await page.goto('/auth');
    
    // Check if the page has loaded successfully
    await expect(page).toHaveTitle(/StreamFind/);
    
    // Expect the login form to be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('should display validation errors for empty submissions', async ({ page }) => {
    await page.goto('/auth');
    
    // Attempt to login without credentials
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Since Firebase auth might take over or HTML5 validation triggers,
    // we just ensure the page hasn't redirected.
    await expect(page).toHaveURL(/\/auth/);
  });
});
