const { test, expect } = require('@playwright/test');

test.describe('Formulaire de contact', () => {
  test('devrait soumettre le formulaire et afficher la confirmation', async ({ page }) => {
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

    // Capturer une screenshot après soumission
    await page.screenshot({ path: 'formulaire-envoye.png' });
  });

  test('ne devrait pas soumettre le formulaire si le prénom est vide', async ({ page }) => {
    await page.goto('http://localhost:64215/contact');

    // Remplir tous les champs sauf le prénom
    await page.fill('#lastname', 'Doe');
    await page.fill('#email', 'john.doe@example.com');
    await page.fill('#message', 'Ceci est un message de test');

    await page.click('button[type="submit"]');

    // Vérifier que le message de confirmation n'est pas visible
    const confirmation = page.locator('#confirmation');
    await expect(confirmation).not.toBeVisible();
  });

  test('ne devrait pas soumettre le formulaire si le nom est vide', async ({ page }) => {
    await page.goto('http://localhost:64215/contact');

    // Remplir tous les champs sauf le nom
    await page.fill('#firstname', 'John');
    await page.fill('#email', 'john.doe@example.com');
    await page.fill('#message', 'Ceci est un message de test');

    await page.click('button[type="submit"]');

    // Vérifier que le message de confirmation n'est pas visible
    const confirmation = page.locator('#confirmation');
    await expect(confirmation).not.toBeVisible();
  });

  test('ne devrait pas soumettre le formulaire si l\'email est vide', async ({ page }) => {
    await page.goto('http://localhost:64215/contact');

    // Remplir tous les champs sauf l'email
    await page.fill('#firstname', 'John');
    await page.fill('#lastname', 'Doe');
    await page.fill('#message', 'Ceci est un message de test');

    await page.click('button[type="submit"]');

    // Vérifier que le message de confirmation n'est pas visible
    const confirmation = page.locator('#confirmation');
    await expect(confirmation).not.toBeVisible();
  });

  test('ne devrait pas soumettre le formulaire si le message est vide', async ({ page }) => {
    await page.goto('http://localhost:64215/contact');

    // Remplir tous les champs sauf le message
    await page.fill('#firstname', 'John');
    await page.fill('#lastname', 'Doe');
    await page.fill('#email', 'john.doe@example.com');

    await page.click('button[type="submit"]');

    // Vérifier que le message de confirmation n'est pas visible
    const confirmation = page.locator('#confirmation');
    await expect(confirmation).not.toBeVisible();
  });
});
