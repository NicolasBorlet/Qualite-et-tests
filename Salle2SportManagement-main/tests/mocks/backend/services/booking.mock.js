/**
 * Mock du BookingService pour les tests unitaires
 * Simule les méthodes principales de gestion des réservations
 */

const { jest } = require('@jest/globals');

// États possibles des réservations
const BOOKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
};

// Mock du service de réservation
const bookingServiceMock = {
  // === MÉTHODES PRINCIPALES ===
  
  /**
   * Crée une nouvelle réservation
   * @param {string} userId - ID de l'utilisateur
   * @param {string} classId - ID du cours
   * @returns {Promise<Object>} Réservation créée
   */
  createBooking: jest.fn(async (userId, classId) => {
    // Comportement par défaut : succès
    return {
      id: `booking-${Date.now()}`,
      userId,
      classId,
      status: BOOKING_STATUS.CONFIRMED,
      createdAt: new Date()
    };
  }),

  /**
   * Annule une réservation
   * @param {string} bookingId - ID de la réservation
   * @param {string} userId - ID de l'utilisateur (pour vérification)
   * @returns {Promise<Object>} Réservation mise à jour
   */
  cancelBooking: jest.fn(async (bookingId, userId) => {
    // Comportement par défaut : annulation normale
    return {
      id: bookingId,
      userId,
      status: BOOKING_STATUS.CANCELLED,
      updatedAt: new Date()
    };
  }),

  /**
   * Met à jour le statut d'une réservation
   * @param {string} bookingId - ID de la réservation
   * @param {string} status - Nouveau statut
   * @returns {Promise<Object>} Réservation mise à jour
   */
  updateBookingStatus: jest.fn(async (bookingId, status) => {
    return {
      id: bookingId,
      status,
      updatedAt: new Date()
    };
  }),

  /**
   * Récupère les réservations d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste des réservations
   */
  getUserBookings: jest.fn(async (userId) => {
    // Comportement par défaut : liste vide
    return [];
  }),

  /**
   * Récupère toutes les réservations
   * @returns {Promise<Array>} Liste complète des réservations
   */
  getAllBookings: jest.fn(async () => {
    return [];
  }),

  /**
   * Récupère les réservations d'un cours
   * @param {string} classId - ID du cours
   * @returns {Promise<Array>} Réservations du cours
   */
  getClassBookings: jest.fn(async (classId) => {
    return [];
  }),

  /**
   * Marque automatiquement les no-shows
   * @returns {Promise<number>} Nombre de réservations marquées
   */
  markNoShows: jest.fn(async () => {
    return 0;
  }),

  /**
   * Vérifie si un utilisateur peut réserver un cours
   * @param {string} userId - ID de l'utilisateur
   * @param {string} classId - ID du cours
   * @returns {Promise<boolean>} true si possible
   */
  canUserBookClass: jest.fn(async (userId, classId) => {
    return true;
  }),

  /**
   * Compte les réservations avec un statut donné
   * @param {string} status - Statut à compter
   * @returns {Promise<number>} Nombre de réservations
   */
  countBookingsByStatus: jest.fn(async (status) => {
    return 0;
  }),

  /**
   * Récupère les statistiques d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Statistiques utilisateur
   */
  getUserStats: jest.fn(async (userId) => {
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      noShows: 0,
      monthlyNoShows: 0
    };
  }),

  // === MÉTHODES DE VALIDATION ===

  /**
   * Valide une nouvelle réservation
   * @param {string} userId - ID utilisateur
   * @param {string} classId - ID cours
   * @returns {Promise<Object>} Résultat de validation
   */
  validateBooking: jest.fn(async (userId, classId) => {
    return {
      valid: true,
      errors: []
    };
  }),

  /**
   * Vérifie les conflits de créneaux
   * @param {string} userId - ID utilisateur
   * @param {Date} datetime - Date/heure du cours
   * @returns {Promise<boolean>} true si conflit détecté
   */
  hasTimeConflict: jest.fn(async (userId, datetime) => {
    return false;
  }),

  /**
   * Vérifie si le cours est complet
   * @param {string} classId - ID du cours
   * @returns {Promise<boolean>} true si complet
   */
  isClassFull: jest.fn(async (classId) => {
    return false;
  }),

  /**
   * Vérifie si l'utilisateur a déjà réservé ce cours
   * @param {string} userId - ID utilisateur
   * @param {string} classId - ID cours
   * @returns {Promise<boolean>} true si déjà réservé
   */
  hasExistingBooking: jest.fn(async (userId, classId) => {
    return false;
  }),
};

// === HELPERS POUR LES TESTS ===

/**
 * Configure le mock pour simuler différents scénarios
 */
const mockScenarios = {
  /**
   * Simule une réservation qui réussit
   */
  successfulBooking: () => {
    bookingServiceMock.createBooking.mockResolvedValueOnce({
      id: 'test-booking-1',
      userId: 'user-1',
      classId: 'class-1',
      status: BOOKING_STATUS.CONFIRMED,
      createdAt: new Date()
    });
  },

  /**
   * Simule un cours complet
   */
  fullClass: () => {
    bookingServiceMock.isClassFull.mockResolvedValueOnce(true);
    bookingServiceMock.createBooking.mockRejectedValueOnce(
      new Error('Class is full')
    );
  },

  /**
   * Simule un conflit de créneaux
   */
  timeConflict: () => {
    bookingServiceMock.hasTimeConflict.mockResolvedValueOnce(true);
    bookingServiceMock.createBooking.mockRejectedValueOnce(
      new Error('Time conflict detected')
    );
  },

  /**
   * Simule une réservation déjà existante
   */
  existingBooking: () => {
    bookingServiceMock.hasExistingBooking.mockResolvedValueOnce(true);
    bookingServiceMock.createBooking.mockRejectedValueOnce(
      new Error('Booking already exists')
    );
  },

  /**
   * Simule une annulation tardive (no-show)
   */
  lateCancel: () => {
    bookingServiceMock.cancelBooking.mockResolvedValueOnce({
      id: 'booking-1',
      userId: 'user-1',
      status: BOOKING_STATUS.NO_SHOW,
      updatedAt: new Date()
    });
  },

  /**
   * Simule une annulation normale
   */
  normalCancel: () => {
    bookingServiceMock.cancelBooking.mockResolvedValueOnce({
      id: 'booking-1',
      userId: 'user-1',
      status: BOOKING_STATUS.CANCELLED,
      updatedAt: new Date()
    });
  },

  /**
   * Simule des statistiques utilisateur avec plusieurs no-shows
   */
  userWithNoShows: (noShowCount = 6) => {
    bookingServiceMock.getUserStats.mockResolvedValueOnce({
      totalBookings: 10,
      confirmedBookings: 4,
      cancelledBookings: 3,
      noShows: noShowCount,
      monthlyNoShows: Math.min(noShowCount, 8)
    });
  },

  /**
   * Réinitialise tous les mocks
   */
  reset: () => {
    Object.keys(bookingServiceMock).forEach(key => {
      if (typeof bookingServiceMock[key].mockReset === 'function') {
        bookingServiceMock[key].mockReset();
      }
    });
  }
};

// Données de test courantes
const mockBookingData = {
  validBooking: {
    id: 'booking-1',
    userId: 'user-1',
    classId: 'class-1',
    status: BOOKING_STATUS.CONFIRMED,
    createdAt: new Date('2024-01-15T10:00:00Z')
  },

  cancelledBooking: {
    id: 'booking-2',
    userId: 'user-1',
    classId: 'class-2',
    status: BOOKING_STATUS.CANCELLED,
    createdAt: new Date('2024-01-14T10:00:00Z'),
    updatedAt: new Date('2024-01-14T15:00:00Z')
  },

  noShowBooking: {
    id: 'booking-3',
    userId: 'user-2',
    classId: 'class-1',
    status: BOOKING_STATUS.NO_SHOW,
    createdAt: new Date('2024-01-13T10:00:00Z'),
    updatedAt: new Date('2024-01-13T18:00:00Z')
  },

  userStats: {
    totalBookings: 5,
    confirmedBookings: 2,
    cancelledBookings: 2,
    noShows: 1,
    monthlyNoShows: 1
  }
};

module.exports = {
  bookingServiceMock,
  mockScenarios,
  mockBookingData,
  BOOKING_STATUS
};