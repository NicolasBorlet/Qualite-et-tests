/**
 * Mock du client API pour les tests frontend
 * Simule les appels HTTP vers le backend
 */

const { jest } = require('@jest/globals');

// États de réponse HTTP
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

/**
 * Mock du client API Axios
 */
const apiClientMock = {
  // === MÉTHODES HTTP DE BASE ===
  
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),

  // === CONFIGURATION ===
  defaults: {
    baseURL: 'http://localhost:3000/api',
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
  },

  // === INTERCEPTORS ===
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn()
    },
    response: {
      use: jest.fn(),
      eject: jest.fn()
    }
  }
};

/**
 * Mock du service Gym (gymService.js)
 */
const gymServiceMock = {
  // === DASHBOARD ===
  getUserDashboard: jest.fn(async (userId) => {
    return {
      data: {
        user: {
          id: userId,
          firstname: 'Test',
          lastname: 'User',
          email: 'test@example.com'
        },
        subscription: {
          planType: 'STANDARD',
          active: true,
          endDate: '2024-02-15'
        },
        stats: {
          totalBookings: 5,
          confirmedBookings: 4,
          cancelledBookings: 1,
          noShows: 0
        },
        recentBookings: []
      }
    };
  }),

  getAdminDashboard: jest.fn(async () => {
    return {
      data: {
        stats: {
          totalUsers: 150,
          activeSubscriptions: 142,
          totalBookings: 1250,
          confirmedBookings: 1100,
          cancelledBookings: 120,
          noShows: 30
        },
        revenue: {
          monthly: 6789.50,
          yearly: 78450.00
        }
      }
    };
  }),

  // === CLASSES ===
  getAllClasses: jest.fn(async () => {
    return {
      data: []
    };
  }),

  getClass: jest.fn(async (classId) => {
    return {
      data: {
        id: classId,
        title: 'Test Class',
        coach: 'Test Coach',
        datetime: '2024-01-16T10:00:00Z',
        duration: 60,
        capacity: 15,
        isCancelled: false,
        bookings: []
      }
    };
  }),

  createClass: jest.fn(async (classData) => {
    return {
      data: {
        id: 'new-class-id',
        ...classData,
        isCancelled: false
      }
    };
  }),

  updateClass: jest.fn(async (classId, updateData) => {
    return {
      data: {
        id: classId,
        ...updateData
      }
    };
  }),

  deleteClass: jest.fn(async (classId) => {
    return {
      data: { message: 'Class deleted successfully' }
    };
  }),

  // === BOOKINGS ===
  getUserBookings: jest.fn(async (userId) => {
    return {
      data: []
    };
  }),

  getAllBookings: jest.fn(async () => {
    return {
      data: []
    };
  }),

  createBooking: jest.fn(async (userId, classId) => {
    return {
      data: {
        id: 'new-booking-id',
        userId,
        classId,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString()
      }
    };
  }),

  cancelBooking: jest.fn(async (bookingId, userId) => {
    return {
      data: {
        id: bookingId,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      }
    };
  }),

  updateBookingStatus: jest.fn(async (bookingId, status) => {
    return {
      data: {
        id: bookingId,
        status,
        updatedAt: new Date().toISOString()
      }
    };
  }),

  // === USERS ===
  getAllUsers: jest.fn(async () => {
    return {
      data: []
    };
  }),

  getUser: jest.fn(async (userId) => {
    return {
      data: {
        id: userId,
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        role: 'USER',
        dateJoined: '2024-01-01T10:00:00Z'
      }
    };
  }),

  createUser: jest.fn(async (userData) => {
    return {
      data: {
        id: 'new-user-id',
        ...userData,
        dateJoined: new Date().toISOString()
      }
    };
  }),

  updateUser: jest.fn(async (userId, updateData) => {
    return {
      data: {
        id: userId,
        ...updateData
      }
    };
  }),

  deleteUser: jest.fn(async (userId) => {
    return {
      data: { message: 'User deleted successfully' }
    };
  }),

  // === SUBSCRIPTIONS ===
  getUserSubscription: jest.fn(async (userId) => {
    return {
      data: {
        id: 'subscription-id',
        userId,
        planType: 'STANDARD',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        active: true,
        autoRenew: true
      }
    };
  }),

  getAllSubscriptions: jest.fn(async () => {
    return {
      data: []
    };
  }),

  createSubscription: jest.fn(async (subscriptionData) => {
    return {
      data: {
        id: 'new-subscription-id',
        ...subscriptionData,
        active: true,
        autoRenew: true
      }
    };
  }),

  updateSubscription: jest.fn(async (subscriptionId, updateData) => {
    return {
      data: {
        id: subscriptionId,
        ...updateData
      }
    };
  }),

  deleteSubscription: jest.fn(async (subscriptionId) => {
    return {
      data: { message: 'Subscription deleted successfully' }
    };
  }),

  calculateMonthlyBilling: jest.fn(async (userId) => {
    return {
      data: {
        userId,
        planType: 'STANDARD',
        basePrice: 39.99,
        loyaltyDiscount: 0,
        noShowPenalty: 0,
        finalAmount: 39.99,
        details: {
          loyaltyEligible: false,
          monthsSubscribed: 3,
          noShowsThisMonth: 0
        }
      }
    };
  })
};

/**
 * Scénarios de mock prédéfinis
 */
const apiMockScenarios = {
  /**
   * Simule des réponses de succès normales
   */
  successfulResponses: () => {
    // Réinitialise tous les mocks avec des réponses de succès
    Object.keys(gymServiceMock).forEach(method => {
      if (jest.isMockFunction(gymServiceMock[method])) {
        gymServiceMock[method].mockClear();
      }
    });
  },

  /**
   * Simule des erreurs réseau
   */
  networkErrors: () => {
    const networkError = new Error('Network Error');
    networkError.code = 'NETWORK_ERROR';
    
    Object.keys(gymServiceMock).forEach(method => {
      if (jest.isMockFunction(gymServiceMock[method])) {
        gymServiceMock[method].mockRejectedValue(networkError);
      }
    });
  },

  /**
   * Simule des erreurs 404 (ressource non trouvée)
   */
  notFoundErrors: () => {
    const notFoundError = new Error('Request failed with status code 404');
    notFoundError.response = {
      status: HTTP_STATUS.NOT_FOUND,
      data: { error: 'Resource not found' }
    };
    
    gymServiceMock.getUser.mockRejectedValueOnce(notFoundError);
    gymServiceMock.getClass.mockRejectedValueOnce(notFoundError);
  },

  /**
   * Simule des erreurs de validation (400)
   */
  validationErrors: () => {
    const validationError = new Error('Request failed with status code 400');
    validationError.response = {
      status: HTTP_STATUS.BAD_REQUEST,
      data: { 
        error: 'Validation failed',
        details: ['Email is required', 'Invalid date format']
      }
    };
    
    gymServiceMock.createUser.mockRejectedValueOnce(validationError);
    gymServiceMock.createClass.mockRejectedValueOnce(validationError);
  },

  /**
   * Simule des erreurs de conflit (409)
   */
  conflictErrors: () => {
    const conflictError = new Error('Request failed with status code 409');
    conflictError.response = {
      status: HTTP_STATUS.CONFLICT,
      data: { error: 'Resource already exists or conflict detected' }
    };
    
    gymServiceMock.createBooking.mockRejectedValueOnce(conflictError);
  },

  /**
   * Simule des erreurs d'autorisation (403)
   */
  authorizationErrors: () => {
    const authError = new Error('Request failed with status code 403');
    authError.response = {
      status: HTTP_STATUS.FORBIDDEN,
      data: { error: 'Access denied' }
    };
    
    gymServiceMock.getAdminDashboard.mockRejectedValueOnce(authError);
    gymServiceMock.getAllUsers.mockRejectedValueOnce(authError);
  },

  /**
   * Simule des erreurs serveur (500)
   */
  serverErrors: () => {
    const serverError = new Error('Request failed with status code 500');
    serverError.response = {
      status: HTTP_STATUS.INTERNAL_ERROR,
      data: { error: 'Internal server error' }
    };
    
    Object.keys(gymServiceMock).forEach(method => {
      if (jest.isMockFunction(gymServiceMock[method])) {
        gymServiceMock[method].mockRejectedValueOnce(serverError);
      }
    });
  },

  /**
   * Simule des délais de réponse (timeout)
   */
  timeoutErrors: () => {
    const timeoutError = new Error('timeout of 5000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    
    gymServiceMock.getAllClasses.mockRejectedValueOnce(timeoutError);
    gymServiceMock.getUserDashboard.mockRejectedValueOnce(timeoutError);
  },

  /**
   * Simule un utilisateur sans abonnement
   */
  userWithoutSubscription: () => {
    gymServiceMock.getUserSubscription.mockResolvedValueOnce({
      data: null
    });
    
    gymServiceMock.getUserDashboard.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          firstname: 'Test',
          lastname: 'User',
          email: 'test@example.com'
        },
        subscription: null,
        stats: {
          totalBookings: 0,
          confirmedBookings: 0,
          cancelledBookings: 0,
          noShows: 0
        },
        recentBookings: []
      }
    });
  },

  /**
   * Simule un cours complet
   */
  fullClass: () => {
    const conflictError = new Error('Request failed with status code 409');
    conflictError.response = {
      status: HTTP_STATUS.CONFLICT,
      data: { error: 'Class is full' }
    };
    
    gymServiceMock.createBooking.mockRejectedValueOnce(conflictError);
  },

  /**
   * Simule une liste de classes vide
   */
  emptyClassList: () => {
    gymServiceMock.getAllClasses.mockResolvedValueOnce({
      data: []
    });
  },

  /**
   * Réinitialise tous les mocks
   */
  reset: () => {
    Object.keys(gymServiceMock).forEach(method => {
      if (jest.isMockFunction(gymServiceMock[method])) {
        gymServiceMock[method].mockReset();
      }
    });
    
    Object.keys(apiClientMock).forEach(method => {
      if (jest.isMockFunction(apiClientMock[method])) {
        apiClientMock[method].mockReset();
      }
    });
  }
};

/**
 * Données de test pour les réponses API
 */
const apiMockData = {
  user: {
    id: 'user-1',
    firstname: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    role: 'USER',
    dateJoined: '2024-01-01T10:00:00Z'
  },

  admin: {
    id: 'admin-1',
    firstname: 'Test',
    lastname: 'Admin',
    email: 'admin@gym.com',
    role: 'ADMIN',
    dateJoined: '2023-01-01T10:00:00Z'
  },

  class: {
    id: 'class-1',
    title: 'Yoga Test',
    coach: 'Test Coach',
    datetime: '2024-01-16T10:00:00Z',
    duration: 60,
    capacity: 15,
    isCancelled: false
  },

  booking: {
    id: 'booking-1',
    userId: 'user-1',
    classId: 'class-1',
    status: 'CONFIRMED',
    createdAt: '2024-01-15T10:00:00Z'
  },

  subscription: {
    id: 'subscription-1',
    userId: 'user-1',
    planType: 'STANDARD',
    startDate: '2024-01-01',
    endDate: '2024-02-01',
    active: true,
    autoRenew: true
  }
};

module.exports = {
  apiClientMock,
  gymServiceMock,
  apiMockScenarios,
  apiMockData,
  HTTP_STATUS
};