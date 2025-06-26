/**
 * Tests unitaires pour le store d'authentification Pinia
 * Teste la gestion d'état d'authentification et localStorage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createAuthStoreMock, authMockScenarios, mockUsers } from '../../../mocks/frontend/stores/auth.mock';

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock des composables Vue
vi.mock('vue', () => ({
  ref: vi.fn((value) => ({
    value,
    get value() { return this._value; },
    set value(newValue) { this._value = newValue; },
    _value: value
  })),
  computed: vi.fn((fn) => ({
    get value() { return fn(); }
  })),
  readonly: vi.fn((ref) => ref)
}));

describe('Auth Store - Tests Unitaires', () => {
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Reset des mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    authStore = createAuthStoreMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. GESTION D'ÉTAT D'AUTHENTIFICATION
  // ==========================================
  describe('🔐 Gestion d\'État d\'Authentification', () => {
    describe('Cas passant', () => {
      test('should initialize with no user authenticated', () => {
        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(authStore.isAuthenticated.value).toBe(false);
        expect(authStore.isAdmin.value).toBe(false);
      });

      test('should authenticate user successfully', async () => {
        // Act
        const user = await authStore.login('john.doe@email.com');

        // Assert
        expect(user.firstname).toBe('John');
        expect(user.role).toBe('USER');
        expect(authStore.currentUser.value).toEqual(user);
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(authStore.isAdmin.value).toBe(false);
      });

      test('should authenticate admin user correctly', async () => {
        // Act
        const admin = await authStore.login('admin@gym.com');

        // Assert
        expect(admin.role).toBe('ADMIN');
        expect(authStore.isAdmin.value).toBe(true);
        expect(authStore.isAuthenticated.value).toBe(true);
      });

      test('should logout user successfully', async () => {
        // Arrange
        await authStore.login('john.doe@email.com');
        expect(authStore.isAuthenticated.value).toBe(true);

        // Act
        authStore.logout();

        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(authStore.isAuthenticated.value).toBe(false);
        expect(authStore.isAdmin.value).toBe(false);
      });

      test('should fetch available users', async () => {
        // Act
        const users = await authStore.getAvailableUsers();

        // Assert
        expect(users).toHaveLength(4);
        expect(users[0].email).toBe('admin@gym.com');
        expect(users[1].email).toBe('john.doe@email.com');
        expect(users.some(u => u.role === 'ADMIN')).toBe(true);
        expect(users.filter(u => u.role === 'USER')).toHaveLength(3);
      });
    });

    describe('Cas non passant', () => {
      test('should reject login with invalid email', async () => {
        // Act & Assert
        await expect(
          authStore.login('invalid@email.com')
        ).rejects.toThrow('User not found');
        
        expect(authStore.currentUser.value).toBeNull();
        expect(authStore.isAuthenticated.value).toBe(false);
      });

      test('should reject login with empty email', async () => {
        // Act & Assert
        await expect(
          authStore.login('')
        ).rejects.toThrow('User not found');
      });

      test('should reject login with malformed email', async () => {
        // Act & Assert
        await expect(
          authStore.login('not-an-email')
        ).rejects.toThrow('User not found');
      });
    });

    describe('Cas limite', () => {
      test('should handle case insensitive email matching', async () => {
        // Act
        const user = await authStore.login('JOHN.DOE@EMAIL.COM');

        // Assert
        expect(user.email).toBe('john.doe@email.com');
        expect(authStore.isAuthenticated.value).toBe(true);
      });

      test('should handle multiple logout calls gracefully', () => {
        // Arrange
        authStore.logout(); // Premier logout
        
        // Act
        authStore.logout(); // Deuxième logout

        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(authStore.isAuthenticated.value).toBe(false);
      });

      test('should work with all available test users', async () => {
        // Test avec chaque utilisateur de test
        for (const testUser of mockUsers) {
          // Act
          const user = await authStore.login(testUser.email);
          
          // Assert
          expect(user.id).toBe(testUser.id);
          expect(user.email).toBe(testUser.email);
          expect(user.role).toBe(testUser.role);
          
          // Cleanup pour le prochain test
          authStore.logout();
        }
      });
    });
  });

  // ==========================================
  // 2. PERSISTANCE AVEC LOCALSTORAGE
  // ==========================================
  describe('💾 Persistance avec localStorage', () => {
    describe('Cas passant', () => {
      test('should save user to localStorage on login', async () => {
        // Act
        const user = await authStore.login('jane.smith@email.com');

        // Assert
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'currentUser',
          JSON.stringify(user)
        );
      });

      test('should remove user from localStorage on logout', async () => {
        // Arrange
        await authStore.login('john.doe@email.com');

        // Act
        authStore.logout();

        // Assert
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      });

      test('should restore user from localStorage on init', () => {
        // Arrange
        const storedUser = mockUsers[1]; // John Doe
        localStorageMock.getItem.mockReturnValue(JSON.stringify(storedUser));

        // Act
        authStore.initAuth();

        // Assert
        expect(localStorageMock.getItem).toHaveBeenCalledWith('currentUser');
        expect(authStore.currentUser.value).toEqual(storedUser);
        expect(authStore.isAuthenticated.value).toBe(true);
      });

      test('should restore admin from localStorage correctly', () => {
        // Arrange
        const storedAdmin = mockUsers[0]; // Admin
        localStorageMock.getItem.mockReturnValue(JSON.stringify(storedAdmin));

        // Act
        authStore.initAuth();

        // Assert
        expect(authStore.currentUser.value).toEqual(storedAdmin);
        expect(authStore.isAdmin.value).toBe(true);
      });
    });

    describe('Cas non passant', () => {
      test('should handle missing localStorage data gracefully', () => {
        // Arrange
        localStorageMock.getItem.mockReturnValue(null);

        // Act
        authStore.initAuth();

        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(authStore.isAuthenticated.value).toBe(false);
      });

      test('should handle corrupted localStorage data', () => {
        // Arrange
        localStorageMock.getItem.mockReturnValue('invalid-json-{');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        authStore.initAuth();

        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        consoleErrorSpy.mockRestore();
      });

      test('should handle localStorage exceptions during save', async () => {
        // Arrange
        const restoreLocalStorage = authMockScenarios.localStorageError();
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        const user = await authStore.login('john.doe@email.com');

        // Assert
        expect(user).toBeDefined();
        expect(authStore.isAuthenticated.value).toBe(true);
        
        // Cleanup
        restoreLocalStorage();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('Cas limite', () => {
      test('should handle empty string in localStorage', () => {
        // Arrange
        localStorageMock.getItem.mockReturnValue('');

        // Act
        authStore.initAuth();

        // Assert
        expect(authStore.currentUser.value).toBeNull();
      });

      test('should handle null user object in localStorage', () => {
        // Arrange
        localStorageMock.getItem.mockReturnValue('null');

        // Act
        authStore.initAuth();

        // Assert
        expect(authStore.currentUser.value).toBeNull();
      });

      test('should preserve user state across multiple init calls', () => {
        // Arrange
        const storedUser = mockUsers[2]; // Jane Smith
        localStorageMock.getItem.mockReturnValue(JSON.stringify(storedUser));

        // Act
        authStore.initAuth();
        const firstUser = authStore.currentUser.value;
        
        authStore.initAuth();
        const secondUser = authStore.currentUser.value;

        // Assert
        expect(firstUser).toEqual(secondUser);
        expect(authStore.isAuthenticated.value).toBe(true);
      });
    });
  });

  // ==========================================
  // 3. SCÉNARIOS DE TEST PRÉDÉFINIS
  // ==========================================
  describe('🎭 Scénarios de Test Prédéfinis', () => {
    describe('Cas passant', () => {
      test('should apply standard user logged in scenario', () => {
        // Act
        const configuredStore = authMockScenarios.standardUserLoggedIn(authStore);

        // Assert
        expect(configuredStore.currentUser.value.role).toBe('USER');
        expect(configuredStore.currentUser.value.firstname).toBe('John');
        expect(configuredStore.isAuthenticated.value).toBe(true);
        expect(configuredStore.isAdmin.value).toBe(false);
      });

      test('should apply admin logged in scenario', () => {
        // Act
        const configuredStore = authMockScenarios.adminLoggedIn(authStore);

        // Assert
        expect(configuredStore.currentUser.value.role).toBe('ADMIN');
        expect(configuredStore.currentUser.value.email).toBe('admin@gym.com');
        expect(configuredStore.isAuthenticated.value).toBe(true);
        expect(configuredStore.isAdmin.value).toBe(true);
      });

      test('should apply not logged in scenario', () => {
        // Arrange - D'abord connecter un utilisateur
        authStore.currentUser.value = mockUsers[1];

        // Act
        const configuredStore = authMockScenarios.notLoggedIn(authStore);

        // Assert
        expect(configuredStore.currentUser.value).toBeNull();
        expect(configuredStore.isAuthenticated.value).toBe(false);
        expect(configuredStore.isAdmin.value).toBe(false);
      });
    });
  });

  // ==========================================
  // 4. GESTION DES RÔLES ET PERMISSIONS
  // ==========================================
  describe('🛡️ Gestion des Rôles et Permissions', () => {
    describe('Cas passant', () => {
      test('should correctly identify admin role', async () => {
        // Act
        await authStore.login('admin@gym.com');

        // Assert
        expect(authStore.isAdmin.value).toBe(true);
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(authStore.currentUser.value.role).toBe('ADMIN');
      });

      test('should correctly identify user role', async () => {
        // Act
        await authStore.login('mike.wilson@email.com');

        // Assert
        expect(authStore.isAdmin.value).toBe(false);
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(authStore.currentUser.value.role).toBe('USER');
      });
    });

    describe('Cas limite', () => {
      test('should handle role changes during session', async () => {
        // Arrange
        await authStore.login('john.doe@email.com');
        expect(authStore.isAdmin.value).toBe(false);

        // Act - Simulation d'un changement de rôle
        authStore.currentUser.value = {
          ...authStore.currentUser.value,
          role: 'ADMIN'
        };

        // Assert
        expect(authStore.isAdmin.value).toBe(true);
      });

      test('should handle undefined role gracefully', async () => {
        // Arrange
        await authStore.login('john.doe@email.com');
        
        // Act - Simulation d'un rôle undefined
        authStore.currentUser.value = {
          ...authStore.currentUser.value,
          role: undefined
        };

        // Assert
        expect(authStore.isAdmin.value).toBe(false);
      });
    });
  });

  // ==========================================
  // 5. INTÉGRATION ET WORKFLOWS COMPLETS
  // ==========================================
  describe('🔄 Intégration et Workflows Complets', () => {
    describe('Cas passant', () => {
      test('should handle complete login-logout cycle', async () => {
        // Arrange - État initial
        expect(authStore.isAuthenticated.value).toBe(false);

        // Act - Login
        await authStore.login('jane.smith@email.com');
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();

        // Act - Logout
        authStore.logout();
        expect(authStore.isAuthenticated.value).toBe(false);
        expect(localStorageMock.removeItem).toHaveBeenCalled();
      });

      test('should handle app restart simulation', async () => {
        // Arrange - Login initial
        await authStore.login('admin@gym.com');
        const originalUser = authStore.currentUser.value;

        // Simulate app restart
        authStore.logout(); // Reset state
        localStorageMock.getItem.mockReturnValue(JSON.stringify(originalUser));

        // Act - Restore on app init
        authStore.initAuth();

        // Assert - État restauré
        expect(authStore.currentUser.value).toEqual(originalUser);
        expect(authStore.isAdmin.value).toBe(true);
        expect(authStore.isAuthenticated.value).toBe(true);
      });
    });

    describe('Cas limite', () => {
      test('should handle rapid login-logout sequences', async () => {
        // Act - Séquence rapide
        await authStore.login('john.doe@email.com');
        authStore.logout();
        await authStore.login('admin@gym.com');
        authStore.logout();
        await authStore.login('jane.smith@email.com');

        // Assert - État final cohérent
        expect(authStore.currentUser.value.firstname).toBe('Jane');
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(authStore.isAdmin.value).toBe(false);
      });

      test('should maintain state consistency during errors', async () => {
        // Arrange - État initial authentifié
        await authStore.login('john.doe@email.com');
        const originalUser = authStore.currentUser.value;

        // Act - Tentative de login échoué
        try {
          await authStore.login('invalid@email.com');
        } catch (error) {
          // Expected error
        }

        // Assert - État original préservé
        expect(authStore.currentUser.value).toEqual(originalUser);
        expect(authStore.isAuthenticated.value).toBe(true);
      });
    });
  });
});