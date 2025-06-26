/**
 * Utilitaires communs pour les tests
 * Fonctions helper pour simplifier l'écriture et la maintenance des tests
 */

const { prismaMock, mockHelpers } = require('../mocks/backend/prisma.mock');
const { timeMock, timeUtils } = require('../mocks/utils/time.mock');

/**
 * Utilitaires pour la gestion des données de test
 */
const dataHelpers = {
  /**
   * Nettoie et prépare l'environnement de test
   */
  setupTestEnvironment: () => {
    // Réinitialise les mocks Prisma
    mockHelpers.resetAll();
    
    // Réinitialise le mock de temps
    timeMock.reset();
    
    // Configure une date fixe pour les tests
    timeMock.enable('2024-01-15T14:30:00.000Z');
  },

  /**
   * Nettoie après les tests
   */
  cleanupTestEnvironment: () => {
    // Désactive le mock de temps
    timeMock.disable();
    
    // Reset des mocks Prisma
    mockHelpers.resetAll();
  },

  /**
   * Seed des données de test standard
   * @param {Object} options - Options de seeding
   */
  seedTestData: (options = {}) => {
    const {
      users = true,
      classes = true,
      subscriptions = true,
      bookings = true
    } = options;

    const testData = {};

    if (users) {
      testData.users = [
        {
          id: 'user-1',
          firstname: 'Jean',
          lastname: 'Dupont',
          email: 'jean.dupont@example.com',
          dateJoined: new Date('2024-01-01'),
          role: 'USER'
        },
        {
          id: 'admin-1',
          firstname: 'Admin',
          lastname: 'Système',
          email: 'admin@gym.com',
          dateJoined: new Date('2023-01-01'),
          role: 'ADMIN'
        }
      ];
    }

    if (classes) {
      testData.classes = [
        {
          id: 'class-1',
          title: 'Yoga Matinal',
          coach: 'Sarah Johnson',
          datetime: timeUtils.futureDate(2),
          duration: 60,
          capacity: 15,
          isCancelled: false
        },
        {
          id: 'class-2',
          title: 'Pilates',
          coach: 'Emma Thompson',
          datetime: timeUtils.futureDate(4),
          duration: 45,
          capacity: 12,
          isCancelled: false
        }
      ];
    }

    if (subscriptions) {
      testData.subscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planType: 'STANDARD',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-01'),
          active: true,
          autoRenew: true
        }
      ];
    }

    if (bookings) {
      testData.bookings = [
        {
          id: 'booking-1',
          userId: 'user-1',
          classId: 'class-1',
          status: 'CONFIRMED',
          createdAt: new Date('2024-01-14')
        }
      ];
    }

    mockHelpers.seedData(testData);
    return testData;
  },

  /**
   * Crée un utilisateur de test avec toutes les relations
   * @param {Object} userData - Données utilisateur
   * @returns {Object} Utilisateur complet avec relations
   */
  createCompleteUser: (userData = {}) => {
    const user = {
      id: 'test-user-1',
      firstname: 'Test',
      lastname: 'User',
      email: 'test@example.com',
      role: 'USER',
      dateJoined: new Date('2024-01-01'),
      ...userData
    };

    const subscription = {
      id: 'test-sub-1',
      userId: user.id,
      planType: 'STANDARD',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
      active: true,
      autoRenew: true
    };

    mockHelpers.seedData({
      users: [user],
      subscriptions: [subscription]
    });

    return { user, subscription };
  }
};

/**
 * Utilitaires pour les assertions de test
 */
const assertionHelpers = {
  /**
   * Vérifie qu'un utilisateur a été créé correctement
   * @param {Object} user - Utilisateur à vérifier
   * @param {Object} expectedData - Données attendues
   */
  assertUserCreated: (user, expectedData) => {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.firstname).toBe(expectedData.firstname);
    expect(user.lastname).toBe(expectedData.lastname);
    expect(user.email).toBe(expectedData.email);
    expect(user.role).toBe(expectedData.role || 'USER');
    expect(user.dateJoined).toBeInstanceOf(Date);
  },

  /**
   * Vérifie qu'une réservation a été créée correctement
   * @param {Object} booking - Réservation à vérifier
   * @param {Object} expectedData - Données attendues
   */
  assertBookingCreated: (booking, expectedData) => {
    expect(booking).toBeDefined();
    expect(booking.id).toBeDefined();
    expect(booking.userId).toBe(expectedData.userId);
    expect(booking.classId).toBe(expectedData.classId);
    expect(booking.status).toBe(expectedData.status || 'CONFIRMED');
    expect(booking.createdAt).toBeInstanceOf(Date);
  },

  /**
   * Vérifie qu'un cours a été créé correctement
   * @param {Object} classItem - Cours à vérifier
   * @param {Object} expectedData - Données attendues
   */
  assertClassCreated: (classItem, expectedData) => {
    expect(classItem).toBeDefined();
    expect(classItem.id).toBeDefined();
    expect(classItem.title).toBe(expectedData.title);
    expect(classItem.coach).toBe(expectedData.coach);
    expect(classItem.duration).toBe(expectedData.duration);
    expect(classItem.capacity).toBe(expectedData.capacity);
    expect(classItem.isCancelled).toBe(false);
  },

  /**
   * Vérifie qu'un abonnement a été créé correctement
   * @param {Object} subscription - Abonnement à vérifier
   * @param {Object} expectedData - Données attendues
   */
  assertSubscriptionCreated: (subscription, expectedData) => {
    expect(subscription).toBeDefined();
    expect(subscription.id).toBeDefined();
    expect(subscription.userId).toBe(expectedData.userId);
    expect(subscription.planType).toBe(expectedData.planType);
    expect(subscription.active).toBe(true);
  },

  /**
   * Vérifie qu'une erreur contient le message attendu
   * @param {Error} error - Erreur à vérifier
   * @param {string} expectedMessage - Message attendu
   */
  assertErrorMessage: (error, expectedMessage) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(expectedMessage);
  },

  /**
   * Vérifie qu'un mock a été appelé avec les bons paramètres
   * @param {Function} mockFn - Fonction mockée
   * @param {Array} expectedArgs - Arguments attendus
   * @param {number} callIndex - Index de l'appel (défaut: 0)
   */
  assertMockCalledWith: (mockFn, expectedArgs, callIndex = 0) => {
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
  }
};

/**
 * Utilitaires pour la simulation d'événements
 */
const eventHelpers = {
  /**
   * Simule le passage du temps pour les tests temporels
   * @param {number} hours - Nombre d'heures à avancer
   */
  advanceTimeByHours: (hours) => {
    timeMock.advanceTime(timeUtils.hoursToMs(hours));
  },

  /**
   * Simule une date spécifique pour un test
   * @param {Date|string} date - Date à simuler
   * @param {Function} testFn - Fonction de test à exécuter
   */
  withFixedDate: async (date, testFn) => {
    timeMock.setCurrentTime(date);
    try {
      await testFn();
    } finally {
      timeMock.reset();
    }
  },

  /**
   * Simule un cours proche de sa limite d'annulation
   * @returns {Object} Cours et contexte temporel
   */
  simulateNearCancellationDeadline: () => {
    const classTime = timeUtils.futureDate(1.5); // 1h30 dans le futur
    const canCancel = false; // Trop tard pour annuler
    
    return {
      classTime,
      canCancel,
      isNearDeadline: true
    };
  },

  /**
   * Simule un cours avec possibilité d'annulation
   * @returns {Object} Cours et contexte temporel
   */
  simulateCancellableClass: () => {
    const classTime = timeUtils.futureDate(4); // 4h dans le futur
    const canCancel = true;
    
    return {
      classTime,
      canCancel,
      isNearDeadline: false
    };
  }
};

/**
 * Utilitaires pour les tests d'intégration
 */
const integrationHelpers = {
  /**
   * Prépare une base de données de test
   * @param {Object} schema - Schéma de données à créer
   */
  setupTestDatabase: async (schema = {}) => {
    // Cette fonction serait étendue pour les tests d'intégration réels
    // avec une vraie base de données de test
    const testData = dataHelpers.seedTestData(schema);
    return testData;
  },

  /**
   * Crée un contexte de test avec utilisateur authentifié
   * @param {Object} userData - Données utilisateur
   * @returns {Object} Contexte d'authentification
   */
  createAuthenticatedContext: (userData = {}) => {
    const user = {
      id: 'auth-user-1',
      role: 'USER',
      ...userData
    };

    return {
      user,
      isAuthenticated: true,
      token: 'mock-jwt-token'
    };
  },

  /**
   * Simule une requête HTTP avec en-têtes
   * @param {Object} requestData - Données de la requête
   * @returns {Object} Objet requête simulé
   */
  createMockRequest: (requestData = {}) => {
    return {
      body: requestData.body || {},
      params: requestData.params || {},
      query: requestData.query || {},
      headers: {
        'content-type': 'application/json',
        ...requestData.headers
      },
      user: requestData.user || null
    };
  },

  /**
   * Simule une réponse HTTP
   * @returns {Object} Objet réponse simulé
   */
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  }
};

/**
 * Utilitaires pour les tests de performance
 */
const performanceHelpers = {
  /**
   * Mesure le temps d'exécution d'une fonction
   * @param {Function} fn - Fonction à mesurer
   * @returns {Object} Résultat et temps d'exécution
   */
  measureExecutionTime: async (fn) => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    return {
      result,
      executionTime: endTime - startTime
    };
  },

  /**
   * Génère une charge de données pour les tests de performance
   * @param {number} count - Nombre d'éléments
   * @param {Function} generator - Fonction génératrice
   * @returns {Array} Données générées
   */
  generateTestLoad: (count, generator) => {
    return Array.from({ length: count }, (_, index) => generator(index));
  }
};

module.exports = {
  dataHelpers,
  assertionHelpers,
  eventHelpers,
  integrationHelpers,
  performanceHelpers
};