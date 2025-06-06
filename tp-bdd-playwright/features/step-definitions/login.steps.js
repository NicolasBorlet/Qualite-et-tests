const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../../pages/LoginPage');

let loginPage;

Given('je suis sur la page de connexion', async function() {
  loginPage = new LoginPage(this.page);
  await loginPage.goto();
});

When('je saisis un email et un mot de passe valides', async function() {
  await loginPage.fillCredentials('test@example.com', 'password123');
});

When('je saisis un email et un mot de passe invalides', async function() {
  await loginPage.fillCredentials('invalid@example.com', 'wrongpassword');
});

When('je clique sur le bouton de connexion', async function() {
  await loginPage.submit();
});

Then('je dois être redirigé vers le tableau de bord', async function() {
  await loginPage.isOnDashboard();
});

Then('je dois voir un message d\'erreur', async function() {
  const errorMessage = await this.page.textContent('.error-message');
  expect(errorMessage).toContain('Identifiants invalides');
});
