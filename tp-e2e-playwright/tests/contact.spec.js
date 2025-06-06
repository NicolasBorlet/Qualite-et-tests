const { test, expect } = require('@playwright/test');

test('should submit contact form and show confirmation', async ({ page }) => {
  // Accéder à la page de contact
  await page.goto('http://localhost:64215/contact');

  // Remplir tous les champs du formulaire
  await page.fill('#firstname', 'John');
  await page.fill('#lastname', 'Doe');
  await page.fill('#email', 'john.doe@example.com');
  await page.fill('#message', 'Ceci est un message de test');

  // Cliquer sur le bouton Envoyer
  await page.click('button[type="submit"]');

  // Vérifier que le message de confirmation est visible
  const confirmation = page.locator('#confirmation');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveText('Merci pour votre message');
});
