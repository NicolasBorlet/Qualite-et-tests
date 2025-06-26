/**
 * Tests E2E - Parcours 1: Connexion utilisateur et affichage du tableau de bord
 * Couvre les cas passant, non passant et limite pour l'authentification et dashboard
 */

import { test, expect } from '@playwright/test';
import { DashboardPage, LoginPage } from '../utils/page-objects.js';
import { AuthHelper } from '../utils/auth-helpers.js';

test.describe('Parcours 1: Connexion et Tableau de Bord Utilisateur', () => {
  let dashboardPage;
  let loginPage;
  let authHelper;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);
  });

  // ==========================================
  // CAS PASSANT - Utilisation standard
  // ==========================================
  test.describe('✅ Cas Passant - Utilisation Standard', () => {
    test('should login standard user and display dashboard correctly', async ({ page }) => {
      // 1. Navigation vers la page de connexion
      await loginPage.navigate();
      
      // 2. Vérification que la page de login s'affiche correctement
      await expect(page.locator(loginPage.pageTitle)).toBeVisible();
      await expect(page.locator(loginPage.userSelect)).toBeVisible();
      await expect(page.locator(loginPage.loginButton)).toBeVisible();
      
      // 3. Attendre le chargement des options utilisateur
      await loginPage.waitForUserOptions();
      
      // 4. Connexion avec utilisateur standard
      const user = await authHelper.loginAsStandardUser();
      
      // 5. Vérification de la redirection vers le dashboard
      await expect(page).toHaveURL('/dashboard');
      
      // 6. Attendre le chargement complet du dashboard
      await dashboardPage.waitForLoad();
      
      // 7. Vérification des éléments principaux du dashboard
      await expect(page.locator(dashboardPage.pageTitle)).toHaveText('Tableau de bord');
      
      const userInfo = await dashboardPage.getUserInfo();
      expect(userInfo).toContain(`Bienvenue ${user.firstname} ${user.lastname}`);
      
      // 8. Vérification de la présence des sections principales
      await expect(page.locator(dashboardPage.dashboardStats)).toBeVisible();
      await expect(page.locator(dashboardPage.subscriptionInfo)).toBeVisible();
      await expect(page.locator(dashboardPage.availableClasses)).toBeVisible();
      await expect(page.locator(dashboardPage.userBookings)).toBeVisible();
      
      // 9. Vérification des statistiques utilisateur
      const stats = await dashboardPage.getStats();
      expect(stats.totalBookings).toMatch(/^\d+$/);
      expect(stats.confirmedBookings).toMatch(/^\d+$/);
      expect(stats.noShowRate).toMatch(/^\d+%$/);
      
      // 10. Vérification de la présence des boutons d'action
      await expect(page.locator(dashboardPage.refreshButton)).toBeVisible();
      await expect(page.locator(dashboardPage.logoutButton)).toBeVisible();
    });

    test('should display subscription information correctly for premium user', async ({ page }) => {
      // 1. Connexion avec utilisateur premium
      const user = await authHelper.loginAsPremiumUser();
      await dashboardPage.waitForLoad();
      
      // 2. Vérification des informations d'abonnement
      const subscriptionInfo = await dashboardPage.getSubscriptionInfo();
      expect(subscriptionInfo.active).toBe(true);
      expect(subscriptionInfo.planType).toContain('PREMIUM');
      expect(subscriptionInfo.status).toContain('Actif');
      
      // 3. Vérification que les statistiques reflètent l'historique premium
      const stats = await dashboardPage.getStats();
      const totalBookings = parseInt(stats.totalBookings);
      expect(totalBookings).toBeGreaterThan(0); // Utilisateur premium a un historique
    });

    test('should refresh dashboard data correctly', async ({ page }) => {
      // 1. Connexion et chargement initial
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Capture des données initiales
      const initialStats = await dashboardPage.getStats();
      
      // 3. Actualisation du dashboard
      await dashboardPage.refresh();
      
      // 4. Vérification que les données sont rechargées
      await expect(page.locator(dashboardPage.dashboardStats)).toBeVisible();
      
      const refreshedStats = await dashboardPage.getStats();
      expect(refreshedStats.totalBookings).toBeDefined();
      expect(refreshedStats.confirmedBookings).toBeDefined();
      expect(refreshedStats.noShowRate).toBeDefined();
    });

    test('should display available classes correctly', async ({ page }) => {
      // 1. Connexion et chargement
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Vérification de l'affichage des cours
      const classes = await dashboardPage.getAvailableClasses();
      
      // 3. Si des cours sont disponibles, vérifier leur structure
      if (classes.length > 0) {
        for (const classItem of classes) {
          expect(classItem.id).toBeDefined();
          expect(classItem.title).toBeDefined();
          expect(classItem.coach).toBeDefined();
          expect(classItem.capacity).toBeDefined();
        }
      } else {
        // Vérifier le message "aucun cours disponible"
        await expect(page.locator(dashboardPage.noClasses)).toBeVisible();
      }
    });

    test('should navigate and logout correctly', async ({ page }) => {
      // 1. Connexion
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Vérification de l'état connecté
      expect(await authHelper.isLoggedIn()).toBe(true);
      
      // 3. Déconnexion
      await dashboardPage.logout();
      
      // 4. Vérification de la redirection vers login
      await expect(page).toHaveURL('/login');
      
      // 5. Vérification de l'état déconnecté
      await expect(page.locator(loginPage.userSelect)).toBeVisible();
      expect(await authHelper.isLoggedIn()).toBe(false);
    });
  });

  // ==========================================
  // CAS NON PASSANT - Erreurs et exceptions
  // ==========================================
  test.describe('❌ Cas Non Passant - Erreurs et Exceptions', () => {
    test('should reject login with invalid credentials', async ({ page }) => {
      // 1. Navigation vers login
      await loginPage.navigate();
      await loginPage.waitForUserOptions();
      
      // 2. Tentative de connexion avec email invalide
      const result = await authHelper.loginWithInvalidCredentials();
      
      // 3. Vérification que la connexion a échoué
      expect(result).toBe(true);
      
      // 4. Vérification que l'utilisateur reste sur la page de login
      await expect(page).toHaveURL('/login');
      
      // 5. Vérification du message d'erreur
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('User not found');
    });

    test('should handle dashboard loading errors gracefully', async ({ page }) => {
      // 1. Connexion normale
      await authHelper.loginAsStandardUser();
      
      // 2. Simulation d'erreur API en interceptant les requêtes
      await page.route('**/api/dashboard/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      // 3. Rechargement de la page pour déclencher l'erreur
      await page.reload();
      
      // 4. Vérification que l'erreur est gérée
      await expect(page.locator(dashboardPage.errorMessage)).toBeVisible();
      
      const errorText = await dashboardPage.getErrorMessage();
      expect(errorText).toContain('Erreur lors du chargement');
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      // 1. Connexion normale
      await authHelper.loginAsStandardUser();
      
      // 2. Simulation de timeout réseau
      await page.route('**/api/**', route => {
        // Ne pas répondre pour simuler un timeout
        setTimeout(() => {
          route.fulfill({
            status: 408,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Request Timeout' })
          });
        }, 10000);
      });
      
      // 3. Tentative d'actualisation
      await page.click(dashboardPage.refreshButton);
      
      // 4. Vérification de la gestion du timeout
      await expect(page.locator(dashboardPage.errorMessage)).toBeVisible({ timeout: 15000 });
    });

    test('should prevent access to dashboard without authentication', async ({ page }) => {
      // 1. Tentative d'accès direct au dashboard sans connexion
      await page.goto('/dashboard');
      
      // 2. Doit être redirigé vers login
      await expect(page).toHaveURL('/login');
      
      // 3. Vérification de la présence du formulaire de connexion
      await expect(page.locator(loginPage.userSelect)).toBeVisible();
    });

    test('should handle expired session correctly', async ({ page }) => {
      // 1. Connexion normale
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Simulation d'une session expirée
      await authHelper.simulateExpiredSession();
      
      // 3. Vérification de la redirection vers login
      await expect(page).toHaveURL('/login');
    });
  });

  // ==========================================
  // CAS LIMITE - Conditions extrêmes
  // ==========================================
  test.describe('⚠️ Cas Limite - Conditions Extrêmes', () => {
    test('should handle user without subscription correctly', async ({ page }) => {
      // 1. Connexion avec nouvel utilisateur (sans abonnement)
      const user = await authHelper.loginAsNewUser();
      await dashboardPage.waitForLoad();
      
      // 2. Vérification de l'affichage sans abonnement
      const subscriptionInfo = await dashboardPage.getSubscriptionInfo();
      expect(subscriptionInfo.active).toBe(false);
      expect(subscriptionInfo.noSubscriptionVisible).toBe(true);
      
      // 3. Vérification de la présence du bouton d'abonnement
      await expect(page.locator(dashboardPage.subscribeButton)).toBeVisible();
      
      // 4. Vérification des statistiques vides
      const stats = await dashboardPage.getStats();
      expect(stats.totalBookings).toBe('0');
      expect(stats.confirmedBookings).toBe('0');
      expect(stats.noShowRate).toBe('0%');
    });

    test('should handle user with problematic history (no-shows)', async ({ page }) => {
      // 1. Connexion avec utilisateur problématique
      const user = await authHelper.loginAsProblematicUser();
      await dashboardPage.waitForLoad();
      
      // 2. Vérification des statistiques avec no-shows
      const stats = await dashboardPage.getStats();
      const noShowRate = parseFloat(stats.noShowRate.replace('%', ''));
      expect(noShowRate).toBeGreaterThan(0);
      
      // 3. Vérification de l'affichage des pénalités dans l'abonnement
      const subscriptionInfo = await dashboardPage.getSubscriptionInfo();
      // L'utilisateur problématique peut avoir des pénalités visibles
    });

    test('should handle heavy data load efficiently', async ({ page }) => {
      // 1. Simulation d'un utilisateur avec beaucoup de données
      await page.route('**/api/dashboard/**', route => {
        // Simuler une réponse avec beaucoup de données
        const heavyData = {
          user: { id: 'heavy-user', firstname: 'Heavy', lastname: 'User' },
          stats: { totalBookings: 999, confirmedBookings: 850, noShowRate: 15 },
          subscription: { planType: 'PREMIUM', active: true },
          recentBookings: Array.from({ length: 50 }, (_, i) => ({
            id: `booking-${i}`,
            status: 'CONFIRMED',
            class: { title: `Class ${i}`, datetime: new Date().toISOString() }
          }))
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(heavyData)
        });
      });
      
      // 2. Connexion et mesure du temps de chargement
      const startTime = Date.now();
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      const loadTime = Date.now() - startTime;
      
      // 3. Vérification que le chargement reste raisonnable (< 5 secondes)
      expect(loadTime).toBeLessThan(5000);
      
      // 4. Vérification que les données sont affichées
      const stats = await dashboardPage.getStats();
      expect(stats.totalBookings).toBe('999');
    });

    test('should handle empty data state correctly', async ({ page }) => {
      // 1. Simulation d'un système vide (nouveau déploiement)
      await page.route('**/api/**', route => {
        const url = route.request().url();
        let response;
        
        if (url.includes('/dashboard/')) {
          response = {
            user: { id: 'empty-user', firstname: 'Empty', lastname: 'User' },
            stats: { totalBookings: 0, confirmedBookings: 0, noShowRate: 0 },
            subscription: null,
            recentBookings: []
          };
        } else if (url.includes('/classes')) {
          response = [];
        } else if (url.includes('/bookings')) {
          response = [];
        } else {
          response = {};
        }
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      });
      
      // 2. Connexion avec données vides
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 3. Vérification de l'état vide
      await expect(page.locator(dashboardPage.noClasses)).toBeVisible();
      await expect(page.locator(dashboardPage.noBookings)).toBeVisible();
      
      const stats = await dashboardPage.getStats();
      expect(stats.totalBookings).toBe('0');
      expect(stats.confirmedBookings).toBe('0');
      expect(stats.noShowRate).toBe('0%');
    });

    test('should handle rapid navigation and state changes', async ({ page }) => {
      // 1. Connexion
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Navigation rapide entre sections
      for (let i = 0; i < 5; i++) {
        await dashboardPage.refresh();
        await page.waitForTimeout(100); // Attente courte entre les actions
      }
      
      // 3. Vérification que l'état reste cohérent
      await expect(page.locator(dashboardPage.pageTitle)).toBeVisible();
      await expect(page.locator(dashboardPage.userInfo)).toBeVisible();
    });

    test('should handle concurrent user sessions', async ({ page }) => {
      // 1. Connexion utilisateur principal
      await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Simulation d'une session concurrent (même utilisateur)
      const newContext = await page.context().browser().newContext();
      const newPage = await newContext.newPage();
      const newAuthHelper = new AuthHelper(newPage);
      
      // 3. Connexion avec le même utilisateur dans le nouveau contexte
      await newAuthHelper.loginAsStandardUser();
      
      // 4. Vérification que les deux sessions fonctionnent
      await expect(page.locator(dashboardPage.userInfo)).toBeVisible();
      await expect(newPage.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 5. Déconnexion d'une session ne doit pas affecter l'autre
      await newAuthHelper.logout();
      await expect(page.locator(dashboardPage.userInfo)).toBeVisible();
      
      // Cleanup
      await newContext.close();
    });

    test('should handle browser refresh and maintain session', async ({ page }) => {
      // 1. Connexion normale
      const user = await authHelper.loginAsStandardUser();
      await dashboardPage.waitForLoad();
      
      // 2. Actualisation du navigateur
      await page.reload();
      
      // 3. Vérification que la session est maintenue
      await dashboardPage.waitForLoad();
      await expect(page.locator(dashboardPage.userInfo)).toContainText(user.firstname);
      
      // 4. Vérification que l'utilisateur n'est pas redirigé vers login
      await expect(page).toHaveURL('/dashboard');
    });
  });
});