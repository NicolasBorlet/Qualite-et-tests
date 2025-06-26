/**
 * Utilitaires d'authentification pour les tests E2E
 * Gère la connexion, les sessions et les rôles utilisateur
 */

import { LoginPage } from './page-objects.js';
import usersFixture from '../fixtures/users.json' assert { type: 'json' };

export class AuthHelper {
  constructor(page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.users = usersFixture;
  }

  /**
   * Connexion d'un utilisateur standard
   */
  async loginAsStandardUser() {
    const user = this.users.standardUser;
    await this.loginPage.navigate();
    await this.loginPage.login(user.email);
    
    // Vérifier que la connexion a réussi
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(user);
    
    return user;
  }

  /**
   * Connexion d'un utilisateur premium (avec historique)
   */
  async loginAsPremiumUser() {
    const user = this.users.premiumUser;
    await this.loginPage.navigate();
    await this.loginPage.login(user.email);
    
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(user);
    
    return user;
  }

  /**
   * Connexion d'un administrateur
   */
  async loginAsAdmin() {
    const admin = this.users.adminUser;
    await this.loginPage.navigate();
    await this.loginPage.login(admin.email);
    
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(admin);
    
    return admin;
  }

  /**
   * Connexion d'un nouvel utilisateur sans historique
   */
  async loginAsNewUser() {
    const user = this.users.newUser;
    await this.loginPage.navigate();
    await this.loginPage.login(user.email);
    
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(user);
    
    return user;
  }

  /**
   * Connexion d'un utilisateur problématique (avec no-shows)
   */
  async loginAsProblematicUser() {
    const user = this.users.problematicUser;
    await this.loginPage.navigate();
    await this.loginPage.login(user.email);
    
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(user);
    
    return user;
  }

  /**
   * Tentative de connexion avec des identifiants invalides
   */
  async loginWithInvalidCredentials() {
    const invalidCreds = this.users.credentials.invalidCredentials;
    await this.loginPage.navigate();
    
    try {
      await this.loginPage.login(invalidCreds.email);
      return false; // La connexion n'aurait pas dû réussir
    } catch (error) {
      // Vérifier que l'erreur est affichée
      const errorMessage = await this.loginPage.getErrorMessage();
      return errorMessage && errorMessage.includes('User not found');
    }
  }

  /**
   * Connexion avec un utilisateur spécifique par ID
   */
  async loginAsUser(userId) {
    // Trouver l'utilisateur dans les fixtures
    let user = null;
    
    // Chercher dans les utilisateurs principaux
    for (const [key, userData] of Object.entries(this.users)) {
      if (userData.id === userId) {
        user = userData;
        break;
      }
    }
    
    // Chercher dans les utilisateurs concurrents
    if (!user && this.users.concurrentUsers) {
      user = this.users.concurrentUsers.find(u => u.id === userId);
    }
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found in fixtures`);
    }
    
    await this.loginPage.navigate();
    await this.loginPage.login(user.email);
    
    await this.page.waitForURL('/dashboard');
    await this.verifyUserIsLoggedIn(user);
    
    return user;
  }

  /**
   * Vérification qu'un utilisateur est bien connecté
   */
  async verifyUserIsLoggedIn(expectedUser) {
    // Vérifier que l'utilisateur est sur le dashboard
    await this.page.waitForSelector('[data-testid="user-info"]');
    
    // Vérifier que les informations utilisateur sont correctes
    const userInfo = await this.page.locator('[data-testid="user-info"]').textContent();
    const expectedName = `${expectedUser.firstname} ${expectedUser.lastname}`;
    
    if (!userInfo.includes(expectedName)) {
      throw new Error(`Expected user ${expectedName} but found ${userInfo}`);
    }
    
    // Vérifier la présence du bouton de déconnexion
    await this.page.waitForSelector('[data-testid="logout-button"]');
    
    return true;
  }

  /**
   * Déconnexion de l'utilisateur actuel
   */
  async logout() {
    const logoutButton = '[data-testid="logout-button"]';
    
    if (await this.page.locator(logoutButton).isVisible()) {
      await this.page.click(logoutButton);
      await this.page.waitForURL('/login');
      
      // Vérifier que l'utilisateur est bien déconnecté
      await this.page.waitForSelector('[data-testid="user-select"]');
      return true;
    }
    
    return false;
  }

  /**
   * Vérification du statut de connexion
   */
  async isLoggedIn() {
    try {
      await this.page.waitForSelector('[data-testid="logout-button"]', { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir l'utilisateur actuellement connecté depuis l'interface
   */
  async getCurrentUser() {
    if (!(await this.isLoggedIn())) {
      return null;
    }
    
    const userInfo = await this.page.locator('[data-testid="user-info"]').textContent();
    
    // Extraire le nom depuis "Bienvenue John Doe"
    const nameMatch = userInfo.match(/Bienvenue (.+)/);
    if (nameMatch) {
      const fullName = nameMatch[1];
      const [firstname, lastname] = fullName.split(' ');
      
      // Retrouver l'utilisateur complet dans les fixtures
      for (const [key, userData] of Object.entries(this.users)) {
        if (userData.firstname === firstname && userData.lastname === lastname) {
          return userData;
        }
      }
      
      // Chercher dans les utilisateurs concurrents
      if (this.users.concurrentUsers) {
        const concurrentUser = this.users.concurrentUsers.find(
          u => u.firstname === firstname && u.lastname === lastname
        );
        if (concurrentUser) return concurrentUser;
      }
    }
    
    return null;
  }

  /**
   * Simulation d'une session expirée
   */
  async simulateExpiredSession() {
    // Supprimer les cookies d'authentification
    await this.page.context().clearCookies();
    
    // Supprimer le localStorage
    await this.page.evaluate(() => {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    });
    
    // Tenter d'accéder à une page protégée
    await this.page.goto('/dashboard');
    
    // Doit être redirigé vers login
    await this.page.waitForURL('/login');
  }

  /**
   * Sauvegarde de l'état d'authentification
   */
  async saveAuthState(filePath) {
    await this.page.context().storageState({ path: filePath });
  }

  /**
   * Restauration de l'état d'authentification
   */
  async restoreAuthState(filePath) {
    // Cette méthode est utilisée lors de la création du contexte
    // Elle n'est donc pas appelée directement ici
    return filePath;
  }

  /**
   * Connexions multiples pour tests de concurrence
   */
  async loginMultipleUsers(userCount = 3) {
    const concurrentUsers = this.users.concurrentUsers.slice(0, userCount);
    const contexts = [];
    
    for (let i = 0; i < concurrentUsers.length; i++) {
      const user = concurrentUsers[i];
      
      // Créer un nouveau contexte de navigateur pour chaque utilisateur
      const context = await this.page.context().browser().newContext();
      const page = await context.newPage();
      const authHelper = new AuthHelper(page);
      
      // Connecter l'utilisateur
      await authHelper.loginAsUser(user.id);
      
      contexts.push({
        user,
        context,
        page,
        authHelper
      });
    }
    
    return contexts;
  }

  /**
   * Nettoyage des contextes multiples
   */
  async cleanupMultipleUsers(contexts) {
    for (const { context } of contexts) {
      await context.close();
    }
  }

  /**
   * Vérification des permissions administrateur
   */
  async verifyAdminAccess() {
    const currentUser = await this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      throw new Error('Admin access required but user is not admin');
    }
    
    // Vérifier l'accès à la section admin
    await this.page.goto('/admin');
    await this.page.waitForSelector('[data-testid="admin-menu"]');
    
    return true;
  }

  /**
   * Vérification du refus d'accès admin pour utilisateur standard
   */
  async verifyAdminAccessDenied() {
    const currentUser = await this.getCurrentUser();
    if (!currentUser || currentUser.role === 'ADMIN') {
      throw new Error('Standard user required for this test');
    }
    
    // Tenter d'accéder à la section admin
    await this.page.goto('/admin');
    
    // Doit être redirigé ou voir un message d'erreur
    await Promise.race([
      this.page.waitForURL('/dashboard'), // Redirection
      this.page.waitForSelector('[data-testid="access-denied"]') // Message d'erreur
    ]);
    
    return true;
  }

  /**
   * Test de sécurité : tentative de manipulation de session
   */
  async testSessionSecurity() {
    await this.loginAsStandardUser();
    
    // Modifier le localStorage pour tenter de devenir admin
    await this.page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      if (user) {
        user.role = 'ADMIN';
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    });
    
    // Recharger la page
    await this.page.reload();
    
    // Tenter d'accéder aux fonctionnalités admin
    await this.page.goto('/admin');
    
    // L'accès doit être refusé car le token JWT n'est pas admin
    const hasAdminAccess = await this.page.locator('[data-testid="admin-menu"]').isVisible();
    
    if (hasAdminAccess) {
      throw new Error('Security vulnerability: localStorage manipulation granted admin access');
    }
    
    return true;
  }
}