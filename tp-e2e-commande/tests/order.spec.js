const { test, expect } = require('@playwright/test');

test.describe('Formulaire de commande', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:50182/order');
  });

  test('commande valide avec livraison express', async ({ page }) => {
    await page.selectOption('#product', 'T-shirt');
    await page.fill('#quantity', '2');
    await page.check('input[value="express"]');
    await page.click('button[type="submit"]');

    const summary = await page.textContent('#summary');
    expect(summary).toBe('Commande confirmée : 2 x T-shirt, livraison express');
  });

  test('commande valide avec livraison standard', async ({ page }) => {
    await page.selectOption('#product', 'Mug');
    await page.fill('#quantity', '1');
    await page.check('input[value="standard"]');
    await page.click('button[type="submit"]');

    const summary = await page.textContent('#summary');
    expect(summary).toBe('Commande confirmée : 1 x Mug, livraison standard');
  });

  test('alerte quand aucun produit sélectionné', async ({ page }) => {
    // Configurer l'écouteur de dialogue avant toute action
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Veuillez remplir tous les champs correctement.');
      await dialog.accept();
    });

    await page.fill('#quantity', '1');
    await page.click('button[type="submit"]');
    expect(await page.isVisible('#summary')).toBeFalsy();
  });

  test('alerte quand quantité = 0', async ({ page }) => {
    // Configurer l'écouteur de dialogue avant toute action
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Veuillez remplir tous les champs correctement.');
      await dialog.accept();
    });

    await page.selectOption('#product', 'T-shirt');
    await page.fill('#quantity', '0');
    await page.click('button[type="submit"]');
    expect(await page.isVisible('#summary')).toBeFalsy();
  });

  test('pas de commande avec tous les champs vides', async ({ page }) => {
    // Configurer l'écouteur de dialogue avant toute action
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Veuillez remplir tous les champs correctement.');
      await dialog.accept();
    });

    await page.click('button[type="submit"]');
    expect(await page.isVisible('#summary')).toBeFalsy();
  });

  // Bonus: Tests avec test.each pour différents produits
  test.describe('Tests avec différents produits', () => {
    const products = [
      { name: 'T-shirt', quantity: 3 },
      { name: 'Mug', quantity: 2 }
    ];

    for (const product of products) {
      test(`commande de ${product.name}`, async ({ page }) => {
        await page.selectOption('#product', product.name);
        await page.fill('#quantity', product.quantity.toString());
        await page.click('button[type="submit"]');

        const summary = await page.textContent('#summary');
        expect(summary).toBe(`Commande confirmée : ${product.quantity} x ${product.name}, livraison standard`);

        // Capture d'écran avec nom dynamique
        await page.screenshot({ path: `confirmation-${product.name}.png` });
      });
    }
  });
});
