/**
 * Mock du store d'authentification Pinia
 * Simule le comportement du store auth avec localStorage
 */

import { ref, computed, readonly } from 'vue';

// Données de test pour les utilisateurs disponibles
const MOCK_AVAILABLE_USERS = [
  {
    id: 'admin-1',
    firstname: 'Admin',
    lastname: 'Système',
    email: 'admin@gym.com',
    role: 'ADMIN',
    dateJoined: '2023-01-01'
  },
  {
    id: 'user-1',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@email.com',
    role: 'USER',
    dateJoined: '2024-01-01'
  },
  {
    id: 'user-2',
    firstname: 'Jane',
    lastname: 'Smith',
    email: 'jane.smith@email.com',
    role: 'USER',
    dateJoined: '2024-01-15'
  },
  {
    id: 'user-3',
    firstname: 'Mike',
    lastname: 'Wilson',
    email: 'mike.wilson@email.com',
    role: 'USER',
    dateJoined: '2024-01-10'
  }
];

/**
 * Crée un mock du store d'authentification
 */
export function createAuthStoreMock() {
  const currentUser = ref(null);
  
  const isAuthenticated = computed(() => !!currentUser.value);
  const isAdmin = computed(() => currentUser.value?.role === 'ADMIN');

  const login = async (email) => {
    // Recherche utilisateur par email (insensible à la casse)
    const user = MOCK_AVAILABLE_USERS.find(u => 
      u.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      throw new Error('User not found');
    }

    currentUser.value = user;
    
    // Simulation de la sauvegarde localStorage
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    return user;
  };

  const logout = () => {
    currentUser.value = null;
    
    try {
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  };

  const initAuth = () => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        currentUser.value = parsedUser;
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
      try {
        localStorage.removeItem('currentUser');
      } catch (e) {
        console.warn('localStorage not available:', e);
      }
    }
  };

  const getAvailableUsers = async () => {
    // Simulation d'un appel API
    return Promise.resolve([...MOCK_AVAILABLE_USERS]);
  };

  return {
    currentUser,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    initAuth,
    getAvailableUsers
  };
}

/**
 * Scénarios de test prédéfinis pour le store auth
 */
export const authMockScenarios = {
  /**
   * Utilisateur standard connecté
   */
  standardUserLoggedIn: (storeMock) => {
    storeMock.currentUser.value = MOCK_AVAILABLE_USERS[1]; // John Doe
    return storeMock;
  },

  /**
   * Administrateur connecté
   */
  adminLoggedIn: (storeMock) => {
    storeMock.currentUser.value = MOCK_AVAILABLE_USERS[0]; // Admin
    return storeMock;
  },

  /**
   * Aucun utilisateur connecté
   */
  notLoggedIn: (storeMock) => {
    storeMock.currentUser.value = null;
    return storeMock;
  },

  /**
   * Simulation d'une erreur de localStorage
   */
  localStorageError: () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('localStorage full');
    };
    
    return () => {
      localStorage.setItem = originalSetItem;
    };
  }
};

/**
 * Données de test exportées
 */
export const mockUsers = MOCK_AVAILABLE_USERS;

export default {
  createAuthStoreMock,
  authMockScenarios,
  mockUsers
};