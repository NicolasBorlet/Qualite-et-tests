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
  await page.goto('/');

  // Wait for initial load
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Click on empty API test button
  await page.getByText(/test api vide/i).click();

  // Wait for loading to finish
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Check empty state message
  await expect(page.getByText(/aucun produit/i)).toBeVisible();
});

test('displays error message when server returns 500', async ({ page }) => {
  await page.goto('/');

  // Wait for initial load
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Click on error test button
  await page.getByText(/test erreur 500/i).click();

  // Wait for loading to finish
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Check error message
  await expect(page.getByText(/erreur.*500/i)).toBeVisible();
});

test('displays error message when network fails', async ({ page }) => {
  await page.goto('/');

  // Wait for initial load
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Click on network error test button
  await page.getByText(/test erreur réseau/i).click();

  // Wait for loading to finish
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Check error message
  await expect(page.getByText(/erreur/i)).toBeVisible();
});

test('can recover from error state', async ({ page }) => {
  await page.goto('/');

  // Wait for initial load
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Trigger an error
  await page.getByText(/test erreur 500/i).click();
  await expect(page.getByText(/chargement/i)).not.toBeVisible();
  await expect(page.getByText(/erreur/i)).toBeVisible();

  // Reload to recover
  await page.getByText(/recharger/i).click();
  await expect(page.getByText(/chargement/i)).not.toBeVisible();

  // Verify we're back to normal state
  await expect(page.getByText(/erreur/i)).not.toBeVisible();
  await expect(page.locator('text=Produit')).toBeVisible();
});