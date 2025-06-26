/**
 * Mock du SubscriptionService pour les tests unitaires
 * Simule les calculs de facturation et gestion des abonnements
 */

const { jest } = require('@jest/globals');

// Types d'abonnements et tarifs
const SUBSCRIPTION_PLANS = {
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM', 
  ETUDIANT: 'ETUDIANT'
};

const BASE_PRICES = {
  [SUBSCRIPTION_PLANS.STANDARD]: 39.99,
  [SUBSCRIPTION_PLANS.PREMIUM]: 59.99,
  [SUBSCRIPTION_PLANS.ETUDIANT]: 29.99
};

// Mock du service d'abonnement
const subscriptionServiceMock = {
  // === GESTION DES ABONNEMENTS ===

  /**
   * Crée un nouvel abonnement
   * @param {string} userId - ID de l'utilisateur
   * @param {string} planType - Type d'abonnement
   * @param {Date} startDate - Date de début
   * @returns {Promise<Object>} Abonnement créé
   */
  createSubscription: jest.fn(async (userId, planType, startDate) => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    return {
      id: `subscription-${Date.now()}`,
      userId,
      planType,
      startDate,
      endDate,
      active: true,
      autoRenew: true
    };
  }),

  /**
   * Met à jour un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} Abonnement mis à jour
   */
  updateSubscription: jest.fn(async (subscriptionId, updateData) => {
    return {
      id: subscriptionId,
      ...updateData,
      updatedAt: new Date()
    };
  }),

  /**
   * Récupère l'abonnement d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object|null>} Abonnement ou null
   */
  getUserSubscription: jest.fn(async (userId) => {
    // Comportement par défaut : pas d'abonnement
    return null;
  }),

  /**
   * Récupère tous les abonnements
   * @returns {Promise<Array>} Liste des abonnements
   */
  getAllSubscriptions: jest.fn(async () => {
    return [];
  }),

  /**
   * Supprime un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @returns {Promise<Object>} Abonnement supprimé
   */
  deleteSubscription: jest.fn(async (subscriptionId) => {
    return {
      id: subscriptionId,
      deletedAt: new Date()
    };
  }),

  // === CALCULS DE FACTURATION ===

  /**
   * Calcule le montant mensuel d'un abonnement
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Détail du calcul
   */
  calculateMonthlyBilling: jest.fn(async (userId) => {
    // Comportement par défaut : abonnement standard sans pénalités
    return {
      userId,
      planType: SUBSCRIPTION_PLANS.STANDARD,
      basePrice: BASE_PRICES.STANDARD,
      loyaltyDiscount: 0,
      noShowPenalty: 0,
      finalAmount: BASE_PRICES.STANDARD,
      details: {
        loyaltyEligible: false,
        monthsSubscribed: 3,
        noShowsThisMonth: 2
      }
    };
  }),

  /**
   * Calcule la remise fidélité
   * @param {Date} subscriptionStartDate - Date de début d'abonnement
   * @returns {number} Pourcentage de remise (0-10)
   */
  calculateLoyaltyDiscount: jest.fn((subscriptionStartDate) => {
    const monthsSubscribed = Math.floor(
      (new Date() - subscriptionStartDate) / (1000 * 60 * 60 * 24 * 30)
    );
    return monthsSubscribed >= 6 ? 10 : 0;
  }),

  /**
   * Calcule la pénalité no-show
   * @param {number} noShowCount - Nombre de no-shows ce mois
   * @param {number} basePrice - Prix de base
   * @returns {number} Montant de la pénalité
   */
  calculateNoShowPenalty: jest.fn((noShowCount, basePrice) => {
    if (noShowCount > 5) {
      return Math.round(basePrice * 0.15 * 100) / 100; // 15% du prix de base
    }
    return 0;
  }),

  /**
   * Vérifie si un utilisateur est éligible à la remise fidélité
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<boolean>} true si éligible
   */
  isLoyaltyEligible: jest.fn(async (userId) => {
    return false;
  }),

  /**
   * Compte les no-shows du mois pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<number>} Nombre de no-shows
   */
  getMonthlyNoShows: jest.fn(async (userId) => {
    return 0;
  }),

  // === VALIDATION ET UTILS ===

  /**
   * Valide les données d'un abonnement
   * @param {Object} subscriptionData - Données à valider
   * @returns {Object} Résultat de validation
   */
  validateSubscriptionData: jest.fn((subscriptionData) => {
    return {
      valid: true,
      errors: []
    };
  }),

  /**
   * Vérifie si un utilisateur peut avoir un abonnement
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<boolean>} true si possible
   */
  canUserSubscribe: jest.fn(async (userId) => {
    return true;
  }),

  /**
   * Renouvelle automatiquement un abonnement
   * @param {string} subscriptionId - ID de l'abonnement
   * @returns {Promise<Object>} Abonnement renouvelé
   */
  renewSubscription: jest.fn(async (subscriptionId) => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    return {
      id: subscriptionId,
      startDate: now,
      endDate,
      renewedAt: now
    };
  }),

  /**
   * Obtient les statistiques des abonnements
   * @returns {Promise<Object>} Statistiques globales
   */
  getSubscriptionStats: jest.fn(async () => {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      subscriptionsByPlan: {
        [SUBSCRIPTION_PLANS.STANDARD]: 0,
        [SUBSCRIPTION_PLANS.PREMIUM]: 0,
        [SUBSCRIPTION_PLANS.ETUDIANT]: 0
      },
      totalRevenue: 0,
      averageSubscriptionLength: 0
    };
  })
};

// === HELPERS POUR LES TESTS ===

/**
 * Scénarios de test prédéfinis
 */
const mockScenarios = {
  /**
   * Utilisateur avec abonnement standard récent
   */
  standardSubscriptionNew: () => {
    subscriptionServiceMock.getUserSubscription.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      planType: SUBSCRIPTION_PLANS.STANDARD,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
      active: true
    });

    subscriptionServiceMock.calculateMonthlyBilling.mockResolvedValueOnce({
      userId: 'user-1',
      planType: SUBSCRIPTION_PLANS.STANDARD,
      basePrice: 39.99,
      loyaltyDiscount: 0,
      noShowPenalty: 0,
      finalAmount: 39.99,
      details: {
        loyaltyEligible: false,
        monthsSubscribed: 1,
        noShowsThisMonth: 0
      }
    });
  },

  /**
   * Utilisateur premium avec remise fidélité
   */
  premiumWithLoyalty: () => {
    const oldStartDate = new Date();
    oldStartDate.setMonth(oldStartDate.getMonth() - 8);

    subscriptionServiceMock.getUserSubscription.mockResolvedValueOnce({
      id: 'sub-2',
      userId: 'user-2',
      planType: SUBSCRIPTION_PLANS.PREMIUM,
      startDate: oldStartDate,
      active: true
    });

    subscriptionServiceMock.isLoyaltyEligible.mockResolvedValueOnce(true);
    subscriptionServiceMock.calculateLoyaltyDiscount.mockReturnValueOnce(10);

    subscriptionServiceMock.calculateMonthlyBilling.mockResolvedValueOnce({
      userId: 'user-2',
      planType: SUBSCRIPTION_PLANS.PREMIUM,
      basePrice: 59.99,
      loyaltyDiscount: 6.00, // 10% de 59.99
      noShowPenalty: 0,
      finalAmount: 53.99,
      details: {
        loyaltyEligible: true,
        monthsSubscribed: 8,
        noShowsThisMonth: 1
      }
    });
  },

  /**
   * Utilisateur étudiant avec pénalités no-show
   */
  studentWithPenalties: () => {
    subscriptionServiceMock.getUserSubscription.mockResolvedValueOnce({
      id: 'sub-3',
      userId: 'user-3',
      planType: SUBSCRIPTION_PLANS.ETUDIANT,
      startDate: new Date('2024-01-01'),
      active: true
    });

    subscriptionServiceMock.getMonthlyNoShows.mockResolvedValueOnce(7);
    subscriptionServiceMock.calculateNoShowPenalty.mockReturnValueOnce(4.50);

    subscriptionServiceMock.calculateMonthlyBilling.mockResolvedValueOnce({
      userId: 'user-3',
      planType: SUBSCRIPTION_PLANS.ETUDIANT,
      basePrice: 29.99,
      loyaltyDiscount: 0,
      noShowPenalty: 4.50,
      finalAmount: 34.49,
      details: {
        loyaltyEligible: false,
        monthsSubscribed: 1,
        noShowsThisMonth: 7
      }
    });
  },

  /**
   * Utilisateur sans abonnement
   */
  noSubscription: () => {
    subscriptionServiceMock.getUserSubscription.mockResolvedValueOnce(null);
    subscriptionServiceMock.canUserSubscribe.mockResolvedValueOnce(true);
  },

  /**
   * Erreur lors de la création d'abonnement
   */
  subscriptionCreationError: () => {
    subscriptionServiceMock.canUserSubscribe.mockResolvedValueOnce(false);
    subscriptionServiceMock.createSubscription.mockRejectedValueOnce(
      new Error('User already has an active subscription')
    );
  },

  /**
   * Réinitialise tous les mocks
   */
  reset: () => {
    Object.keys(subscriptionServiceMock).forEach(key => {
      if (typeof subscriptionServiceMock[key].mockReset === 'function') {
        subscriptionServiceMock[key].mockReset();
      }
    });
  }
};

// Données de test courantes
const mockSubscriptionData = {
  standardSubscription: {
    id: 'sub-1',
    userId: 'user-1',
    planType: SUBSCRIPTION_PLANS.STANDARD,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-02-01'),
    active: true,
    autoRenew: true
  },

  premiumSubscription: {
    id: 'sub-2',
    userId: 'user-2',
    planType: SUBSCRIPTION_PLANS.PREMIUM,
    startDate: new Date('2023-06-01'),
    endDate: new Date('2024-06-01'),
    active: true,
    autoRenew: true
  },

  studentSubscription: {
    id: 'sub-3',
    userId: 'user-3',
    planType: SUBSCRIPTION_PLANS.ETUDIANT,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-02-15'),
    active: true,
    autoRenew: false
  },

  billingExample: {
    userId: 'user-1',
    planType: SUBSCRIPTION_PLANS.STANDARD,
    basePrice: 39.99,
    loyaltyDiscount: 0,
    noShowPenalty: 0,
    finalAmount: 39.99,
    details: {
      loyaltyEligible: false,
      monthsSubscribed: 3,
      noShowsThisMonth: 2
    }
  },

  subscriptionStats: {
    totalSubscriptions: 150,
    activeSubscriptions: 142,
    subscriptionsByPlan: {
      [SUBSCRIPTION_PLANS.STANDARD]: 80,
      [SUBSCRIPTION_PLANS.PREMIUM]: 45,
      [SUBSCRIPTION_PLANS.ETUDIANT]: 25
    },
    totalRevenue: 6789.85,
    averageSubscriptionLength: 4.2
  }
};

module.exports = {
  subscriptionServiceMock,
  mockScenarios,
  mockSubscriptionData,
  SUBSCRIPTION_PLANS,
  BASE_PRICES
};