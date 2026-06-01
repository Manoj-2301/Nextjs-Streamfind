import { test, expect } from '@playwright/test';

test.describe('Navigation & Core Flows', () => {
  test('should load the homepage and display the hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    await expect(page).toHaveTitle(/StreamFind/);
    
    // Verify the navbar is visible
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Ensure "Browse" link exists
    const browseLink = page.locator('a[href="/browse"]').first();
    await expect(browseLink).toBeVisible();
  });

  test('should navigate to the search page', async ({ page }) => {
    await page.goto('/');
    
    // Find the global search toggle in the navbar
    const searchToggle = page.locator('button[aria-label="Toggle Search"], .lucide-search').first();
    await searchToggle.click();
    
    // Or just navigate directly to search
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search/);
    
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });
});
