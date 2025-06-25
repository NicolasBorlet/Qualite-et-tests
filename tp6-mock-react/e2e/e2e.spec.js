import { test, expect } from '@playwright/test';

test('complete user journey - load products, display, and interact', async ({ page }) => {
  await page.goto('/');

  // Check loading state
  await expect(page.getByText(/chargement/i)).toBeVisible();

  // Wait for products to load
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Check that products are displayed
  await expect(page.locator('text=Produit')).toBeVisible();

  // Click reload button
  await page.getByText(/recharger/i).click();

  // Check loading state again
  await expect(page.getByText(/chargement/i)).toBeVisible();

  // Wait for products to reload
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Verify products are still displayed
  await expect(page.locator('text=Produit')).toBeVisible();
});

test('displays message when no products available', async ({ page }) => {
  // Mock empty response
  await page.route('**/api/products*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.goto('/');

  // Wait for loading to finish
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Check empty state message
  await expect(page.getByText(/aucun produit/i)).toBeVisible();
});