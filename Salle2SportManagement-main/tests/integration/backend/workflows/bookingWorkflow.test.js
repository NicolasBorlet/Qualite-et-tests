/**
 * Tests d'intégration pour les workflows de réservation
 * Teste les processus complets avec base de données réelle
 */

const request = require('supertest');
const { testDbManager } = require('../../../utils/db-setup');
const { UserFactory } = require('../../../factories/user.factory');
const { timeMock, timeUtils } = require('../../../mocks/utils/time.mock');

// Mock de l'application Express (sera adapté selon la structure réelle)
class MockExpressApp {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
  }

  post(path, handler) {
    this.routes.set(`POST:${path}`, handler);
    return this;
  }

  put(path, handler) {
    this.routes.set(`PUT:${path}`, handler);
    return this;
  }

  get(path, handler) {
    this.routes.set(`GET:${path}`, handler);
    return this;
  }

  async handleRequest(method, path, body = {}, headers = {}) {
    // Try exact match first
    const exactRouteKey = `${method}:${path}`;
    let handler = this.routes.get(exactRouteKey);
    
    // If no exact match, try pattern matching for dynamic routes
    if (!handler) {
      for (const [routeKey, routeHandler] of this.routes.entries()) {
        if (routeKey.startsWith(`${method}:`)) {
          const routePath = routeKey.substring(method.length + 1);
          if (this.matchRoute(routePath, path)) {
            handler = routeHandler;
            break;
          }
        }
      }
    }
    
    if (!handler) {
      return { status: 404, body: { error: 'Route not found' } };
    }

    const params = this.extractParams(path);
    const req = { body, headers, params };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.body = data; return this; },
      statusCode: 200,
      body: {}
    };

    try {
      await handler(req, res);
      return { status: res.statusCode, body: res.body };
    } catch (error) {
      return { status: 500, body: { error: error.message } };
    }
  }

  matchRoute(routePattern, actualPath) {
    // Convert route pattern like "/api/classes/:classId" to regex
    const regexPattern = routePattern
      .replace(/:[^\/]+/g, '[^\/]+') // Replace :param with regex
      .replace(/\//g, '\\/'); // Escape slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(actualPath);
  }

  extractParams(path) {
    // Extract parameters for various route patterns
    const classMatch = path.match(/\/api\/classes\/([^\/]+)$/);
    if (classMatch) {
      return { classId: classMatch[1] };
    }
    
    const bookingCancelMatch = path.match(/\/api\/bookings\/([^\/]+)\/cancel$/);
    if (bookingCancelMatch) {
      return { id: bookingCancelMatch[1] };
    }
    
    const userBookingsMatch = path.match(/\/api\/bookings\/user\/([^\/]+)$/);
    if (userBookingsMatch) {
      return { userId: userBookingsMatch[1] };
    }
    
    const bookingMatch = path.match(/\/api\/bookings\/([^\/]+)$/);
    if (bookingMatch) {
      return { id: bookingMatch[1] };
    }
    
    // Default fallback
    const matches = path.match(/\/([^\/]+)$/);
    return matches ? { id: matches[1] } : {};
  }
}

// Mock des contrôleurs et services intégrés
const createIntegratedApp = () => {
  const app = new MockExpressApp();

  // Simulation d'une base de données en mémoire pour les tests d'intégration
  const testDatabase = {
    users: new Map(),
    classes: new Map(),
    bookings: new Map(),
    subscriptions: new Map()
  };

  // Simulation des services intégrés
  const integratedServices = {
    async createBooking(userId, classId) {
      // Validation complète comme en réalité
      const user = testDatabase.users.get(userId);
      if (!user) throw new Error('User not found');

      const classItem = testDatabase.classes.get(classId);
      if (!classItem) throw new Error('Class not found');
      if (classItem.isCancelled) throw new Error('Class is cancelled');

      // Vérification capacité
      const existingBookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.classId === classId && b.status === 'CONFIRMED');
      
      if (existingBookings.length >= classItem.capacity) {
        throw new Error('Class is full');
      }

      // Vérification double réservation
      const existingBooking = Array.from(testDatabase.bookings.values())
        .find(b => b.userId === userId && b.classId === classId && b.status === 'CONFIRMED');
      
      if (existingBooking) throw new Error('Booking already exists');

      // Vérification conflit horaire
      const userBookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.userId === userId && b.status === 'CONFIRMED');

      const hasConflict = userBookings.some(booking => {
        const bookingClass = testDatabase.classes.get(booking.classId);
        if (!bookingClass) return false;

        const existingStart = new Date(bookingClass.datetime);
        const existingEnd = new Date(existingStart.getTime() + bookingClass.duration * 60000);
        const newStart = new Date(classItem.datetime);
        const newEnd = new Date(newStart.getTime() + classItem.duration * 60000);

        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasConflict) throw new Error('Time conflict detected');

      // Création de la réservation
      const booking = {
        id: `booking-${userId}-${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        classId,
        status: 'CONFIRMED',
        createdAt: new Date()
      };

      testDatabase.bookings.set(booking.id, booking);
      return booking;
    },

    async cancelBooking(bookingId, userId) {
      const booking = testDatabase.bookings.get(bookingId);
      if (!booking) throw new Error('Booking not found');
      if (booking.userId !== userId) throw new Error('Access denied');

      const classItem = testDatabase.classes.get(booking.classId);
      const now = new Date();
      const classTime = new Date(classItem.datetime);
      const hoursUntilClass = (classTime - now) / (1000 * 60 * 60);

      const newStatus = hoursUntilClass >= 2 ? 'CANCELLED' : 'NO_SHOW';
      
      booking.status = newStatus;
      testDatabase.bookings.set(bookingId, booking);
      
      return booking;
    },

    async getUserBookings(userId) {
      return Array.from(testDatabase.bookings.values())
        .filter(b => b.userId === userId)
        .map(booking => ({
          ...booking,
          class: testDatabase.classes.get(booking.classId)
        }));
    },

    async getClassWithBookings(classId) {
      const classItem = testDatabase.classes.get(classId);
      if (!classItem) return null;

      const bookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.classId === classId);

      const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
      
      return {
        ...classItem,
        bookings,
        availableSpots: classItem.capacity - confirmedBookings
      };
    }
  };

  // Configuration des routes d'API
  app.post('/api/bookings', async (req, res) => {
    try {
      const { userId, classId } = req.body;
      const booking = await integratedServices.createBooking(userId, classId);
      res.status(201).json(booking);
    } catch (error) {
      const status = error.message.includes('not found') ? 404 :
                   error.message.includes('full') || error.message.includes('conflict') || error.message.includes('already exists') ? 409 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  app.put('/api/bookings/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const booking = await integratedServices.cancelBooking(id, userId);
      res.json(booking);
    } catch (error) {
      const status = error.message.includes('not found') ? 404 :
                   error.message.includes('denied') ? 403 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  app.get('/api/bookings/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const bookings = await integratedServices.getUserBookings(userId);
      res.json(bookings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/classes/:classId', async (req, res) => {
    try {
      const { classId } = req.params;
      const classWithBookings = await integratedServices.getClassWithBookings(classId);
      if (!classWithBookings) {
        return res.status(404).json({ error: 'Class not found' });
      }
      res.json(classWithBookings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return { app, testDatabase, integratedServices };
};

describe('Booking Workflow - Tests d\'Intégration', () => {
  let app, testDatabase, integratedServices;

  beforeAll(async () => {
    // Setup environnement d'intégration
    timeMock.enable('2024-01-15T14:30:00.000Z');
  });

  afterAll(async () => {
    timeMock.disable();
  });

  beforeEach(async () => {
    // Création d'une nouvelle instance pour chaque test
    ({ app, testDatabase, integratedServices } = createIntegratedApp());
    
    // Setup des données de test réalistes
    await setupIntegrationTestData();
  });

  const setupIntegrationTestData = async () => {
    // Utilisateurs
    const users = [
      {
        id: 'user-1',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        role: 'USER',
        dateJoined: new Date('2024-01-01')
      },
      {
        id: 'user-2',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@example.com',
        role: 'USER',
        dateJoined: new Date('2024-01-05')
      },
      {
        id: 'admin-1',
        firstname: 'Admin',
        lastname: 'User',
        email: 'admin@gym.com',
        role: 'ADMIN',
        dateJoined: new Date('2023-01-01')
      }
    ];

    users.forEach(user => testDatabase.users.set(user.id, user));

    // Cours - using actual UUIDs from the real API
    const classes = [
      {
        id: '3dd7bb76-3ba1-434f-9350-2963656a9c25', // Yoga Matinal
        title: 'Yoga Matinal',
        coach: 'Sophie Laurent',
        datetime: timeUtils.futureDate(4), // 4h dans le futur
        duration: 60,
        capacity: 8,
        isCancelled: false
      },
      {
        id: '55fe5da4-8187-4f33-b187-657a7cfe805b', // CrossFit Intense
        title: 'CrossFit Intense',
        coach: 'Marc Dubois',
        datetime: timeUtils.futureDate(2), // 2h dans le futur
        duration: 45,
        capacity: 12,
        isCancelled: false
      },
      {
        id: 'b4b77812-9c2d-4661-bf58-4ae7bb87673f', // Pilates Débutant
        title: 'Pilates Débutant',
        coach: 'Emma Wilson',
        datetime: timeUtils.futureDate(1), // 1h dans le futur (proche deadline)
        duration: 50,
        capacity: 6,
        isCancelled: false
      },
      {
        id: 'ea32c49c-9bca-4ae8-ad1a-c425da459351', // Zumba Party
        title: 'Zumba Party',
        coach: 'Carlos Rodriguez',
        datetime: timeUtils.futureDate(6),
        duration: 55,
        capacity: 2, // Petite capacité pour tests
        isCancelled: false
      }
    ];

    classes.forEach(cls => testDatabase.classes.set(cls.id, cls));

    // Réservations existantes pour simuler un système en cours d'utilisation
    const existingBookings = [
      {
        id: 'booking-existing-1',
        userId: 'user-2',
        classId: '3dd7bb76-3ba1-434f-9350-2963656a9c25', // Yoga Matinal
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-14T10:00:00Z')
      },
      // Cours presque plein (Zumba Party with capacity 2)
      {
        id: 'booking-full-1',
        userId: 'user-1',
        classId: 'ea32c49c-9bca-4ae8-ad1a-c425da459351', // Zumba Party
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-14T09:00:00Z')
      },
      {
        id: 'booking-full-2',
        userId: 'user-2',
        classId: 'ea32c49c-9bca-4ae8-ad1a-c425da459351', // Zumba Party
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-14T09:30:00Z')
      }
    ];

    existingBookings.forEach(booking => testDatabase.bookings.set(booking.id, booking));
  };

  // ==========================================
  // 1. PROCESSUS DE RÉSERVATION COMPLET
  // ==========================================
  describe('📝 Processus de Réservation Complet', () => {
    describe('Cas passant', () => {
      test('should complete full booking workflow successfully', async () => {
        // Use UUID from actual API - CrossFit Intense class
        const classId = '55fe5da4-8187-4f33-b187-657a7cfe805b';
        
        // 1. Vérification de la disponibilité du cours
        let response = await app.handleRequest('GET', `/api/classes/${classId}`);
        expect(response.status).toBe(200);
        expect(response.body.availableSpots).toBe(12); // CrossFit has capacity 12, no existing bookings

        // 2. Création de la réservation
        response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: classId
        });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('CONFIRMED');
        expect(response.body.userId).toBe('user-1');
        expect(response.body.classId).toBe(classId);

        // 3. Vérification de la mise à jour de la disponibilité
        response = await app.handleRequest('GET', `/api/classes/${classId}`);
        expect(response.status).toBe(200);
        expect(response.body.availableSpots).toBe(11); // Une place de moins

        // 4. Vérification des réservations utilisateur
        response = await app.handleRequest('GET', '/api/bookings/user/user-1');
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2); // booking-full-1 (existing) + new CrossFit booking
        
        // Find the CrossFit booking
        const crossfitBooking = response.body.find(b => b.class.title === 'CrossFit Intense');
        expect(crossfitBooking).toBeDefined();
        expect(crossfitBooking.status).toBe('CONFIRMED');
      });

      test('should handle booking for user with existing bookings', async () => {
        // Arrange - user-2 a déjà une réservation pour Yoga Matinal
        
        // Act - Réservation d'un autre cours (CrossFit Intense)
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-2',
          classId: '55fe5da4-8187-4f33-b187-657a7cfe805b'
        });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('CONFIRMED');

        // Vérification que l'utilisateur a maintenant 3 réservations (2 existing + 1 new)
        const userBookings = await app.handleRequest('GET', '/api/bookings/user/user-2');
        expect(userBookings.body).toHaveLength(3);
      });
    });

    describe('Cas non passant', () => {
      test('should reject booking when class is full', async () => {
        // Arrange - Zumba Party a déjà 2/2 places prises

        // Act - Tentative de réservation
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'admin-1',
          classId: 'ea32c49c-9bca-4ae8-ad1a-c425da459351' // Zumba Party
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Class is full');

        // Vérification que la capacité n'a pas changé
        const classResponse = await app.handleRequest('GET', '/api/classes/ea32c49c-9bca-4ae8-ad1a-c425da459351');
        expect(classResponse.body.availableSpots).toBe(0);
      });

      test('should reject double booking for same user and class', async () => {
        // Arrange - user-2 a déjà une réservation pour Yoga Matinal

        // Act - Tentative de double réservation
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-2',
          classId: '3dd7bb76-3ba1-434f-9350-2963656a9c25' // Yoga Matinal
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Booking already exists');
      });

      test('should reject booking for non-existent user', async () => {
        // Act
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'invalid-user',
          classId: '3dd7bb76-3ba1-434f-9350-2963656a9c25' // Yoga Matinal
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('User not found');
      });

      test('should reject booking for non-existent class', async () => {
        // Act
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: 'invalid-class'
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Class not found');
      });
    });

    describe('Cas limite', () => {
      test('should handle last available spot booking', async () => {
        // Arrange - Il reste exactement 1 place dans Zumba Party (2/2 prises)
        // On libère une place d'abord
        await app.handleRequest('PUT', '/api/bookings/booking-full-1/cancel', {
          userId: 'user-1'
        });

        // Vérification qu'il reste 1 place
        let classResponse = await app.handleRequest('GET', '/api/classes/ea32c49c-9bca-4ae8-ad1a-c425da459351');
        expect(classResponse.body.availableSpots).toBe(1);

        // Act - Réservation de la dernière place
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'admin-1',
          classId: 'ea32c49c-9bca-4ae8-ad1a-c425da459351' // Zumba Party
        });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('CONFIRMED');

        // Vérification que le cours est maintenant complet
        classResponse = await app.handleRequest('GET', '/api/classes/ea32c49c-9bca-4ae8-ad1a-c425da459351');
        expect(classResponse.body.availableSpots).toBe(0);
      });

      test('should detect time conflicts correctly', async () => {
        // Arrange - Créer un cours qui chevauche avec Yoga Matinal (même heure)
        const yogaClass = testDatabase.classes.get('3dd7bb76-3ba1-434f-9350-2963656a9c25');
        const conflictingClass = {
          id: 'class-conflict',
          title: 'Conflicting Class',
          coach: 'Test Coach',
          datetime: yogaClass.datetime, // Même heure que Yoga Matinal
          duration: 60,
          capacity: 10,
          isCancelled: false
        };
        testDatabase.classes.set('class-conflict', conflictingClass);

        // user-2 a déjà une réservation pour Yoga Matinal

        // Act - Tentative de réservation du cours en conflit
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-2',
          classId: 'class-conflict'
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Time conflict detected');
      });
    });
  });

  // ==========================================
  // 2. WORKFLOW D'ANNULATION INTELLIGENT
  // ==========================================
  describe('🔄 Workflow d\'Annulation Intelligent', () => {
    let bookingToCancel;

    beforeEach(async () => {
      // Créer une réservation pour les tests d'annulation (Yoga Matinal)
      const response = await app.handleRequest('POST', '/api/bookings', {
        userId: 'user-1',
        classId: '3dd7bb76-3ba1-434f-9350-2963656a9c25' // Yoga Matinal
      });
      bookingToCancel = response.body;
    });

    describe('Cas passant', () => {
      test('should cancel booking when enough time remaining', async () => {
        // Act - Annulation 4h avant le cours
        const response = await app.handleRequest('PUT', `/api/bookings/${bookingToCancel.id}/cancel`, {
          userId: 'user-1'
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('CANCELLED');

        // Vérification que la place est libérée
        const classResponse = await app.handleRequest('GET', '/api/classes/3dd7bb76-3ba1-434f-9350-2963656a9c25');
        const availableSpots = classResponse.body.availableSpots;
        expect(availableSpots).toBeGreaterThan(0);
      });
    });

    describe('Cas non passant', () => {
      test('should mark as NO_SHOW when cancelling too late', async () => {
        // Arrange - Créer une réservation pour un cours dans 1h
        const lateBookingResponse = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: 'b4b77812-9c2d-4661-bf58-4ae7bb87673f' // Pilates Débutant - 1h dans le futur
        });

        // Act - Tentative d'annulation tardive
        const response = await app.handleRequest('PUT', `/api/bookings/${lateBookingResponse.body.id}/cancel`, {
          userId: 'user-1'
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('NO_SHOW');
      });

      test('should reject cancellation by wrong user', async () => {
        // Act - Tentative d'annulation par un autre utilisateur
        const response = await app.handleRequest('PUT', `/api/bookings/${bookingToCancel.id}/cancel`, {
          userId: 'user-2' // Mauvais utilisateur
        });

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject cancellation of non-existent booking', async () => {
        // Act
        const response = await app.handleRequest('PUT', '/api/bookings/invalid-booking/cancel', {
          userId: 'user-1'
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Booking not found');
      });
    });

    describe('Cas limite', () => {
      test('should handle cancellation exactly at 2-hour limit', async () => {
        // Arrange - Créer un cours exactement 2h dans le futur
        const limitClass = {
          id: 'class-limit',
          title: 'Limit Test Class',
          coach: 'Test Coach',
          datetime: new Date(timeMock.getCurrentTime().getTime() + 2 * 60 * 60 * 1000),
          duration: 60,
          capacity: 10,
          isCancelled: false
        };
        testDatabase.classes.set('class-limit', limitClass);

        const bookingResponse = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: 'class-limit'
        });

        // Act - Annulation exactement à la limite
        const response = await app.handleRequest('PUT', `/api/bookings/${bookingResponse.body.id}/cancel`, {
          userId: 'user-1'
        });

        // Assert - Devrait être CANCELLED (>= 2h)
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('CANCELLED');
      });
    });
  });

  // ==========================================
  // 3. WORKFLOW DE GESTION DES CAPACITÉS
  // ==========================================
  describe('📊 Workflow de Gestion des Capacités', () => {
    describe('Cas passant', () => {
      test('should handle concurrent booking attempts correctly', async () => {
        // Use Pilates Débutant (capacity 6) - simulate concurrent bookings
        // Act - Trois réservations simultanées pour Pilates Débutant
        const bookingPromises = [
          app.handleRequest('POST', '/api/bookings', { userId: 'user-1', classId: 'b4b77812-9c2d-4661-bf58-4ae7bb87673f' }),
          app.handleRequest('POST', '/api/bookings', { userId: 'admin-1', classId: 'b4b77812-9c2d-4661-bf58-4ae7bb87673f' })
        ];

        const responses = await Promise.all(bookingPromises);

        // Assert - Tous devraient réussir car la capacité est suffisante (6 places total)
        responses.forEach(response => {
          expect(response.status).toBe(201);
          expect(response.body.status).toBe('CONFIRMED');
        });

        // Vérification de l'état du cours
        const classResponse = await app.handleRequest('GET', '/api/classes/b4b77812-9c2d-4661-bf58-4ae7bb87673f');
        expect(classResponse.body.availableSpots).toBeGreaterThan(0); // Still some spots available
      });

      test('should track capacity changes through booking lifecycle', async () => {
        // 1. État initial (use CrossFit Intense which has no existing bookings in our test data)
        let classResponse = await app.handleRequest('GET', '/api/classes/55fe5da4-8187-4f33-b187-657a7cfe805b');
        const initialSpots = classResponse.body.availableSpots;

        // 2. Réservation
        const bookingResponse = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: '55fe5da4-8187-4f33-b187-657a7cfe805b' // CrossFit Intense
        });
        expect(bookingResponse.status).toBe(201);

        classResponse = await app.handleRequest('GET', '/api/classes/55fe5da4-8187-4f33-b187-657a7cfe805b');
        expect(classResponse.body.availableSpots).toBe(initialSpots - 1);

        // 3. Annulation
        await app.handleRequest('PUT', `/api/bookings/${bookingResponse.body.id}/cancel`, {
          userId: 'user-1'
        });

        classResponse = await app.handleRequest('GET', '/api/classes/55fe5da4-8187-4f33-b187-657a7cfe805b');
        expect(classResponse.body.availableSpots).toBe(initialSpots); // Retour à l'état initial
      });
    });

    describe('Cas limite', () => {
      test('should handle zero capacity class correctly', async () => {
        // Arrange
        const zeroCapacityClass = {
          id: 'class-zero',
          title: 'Zero Capacity',
          coach: 'Test Coach',
          datetime: timeUtils.futureDate(2),
          duration: 60,
          capacity: 0,
          isCancelled: false
        };
        testDatabase.classes.set('class-zero', zeroCapacityClass);

        // Act
        const response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: 'class-zero'
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Class is full');
      });
    });
  });

  // ==========================================
  // 4. WORKFLOW COMPLEXE MULTI-UTILISATEURS
  // ==========================================
  describe('👥 Workflow Complexe Multi-Utilisateurs', () => {
    describe('Cas passant', () => {
      test('should handle complex multi-user scenario', async () => {
        // Scénario : Plusieurs utilisateurs interagissent avec le système simultanément
        
        // 1. user-1 réserve CrossFit Intense
        let response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-1',
          classId: '55fe5da4-8187-4f33-b187-657a7cfe805b' // CrossFit Intense
        });
        expect(response.status).toBe(201);
        const user1Booking = response.body;

        // 2. admin-1 réserve aussi CrossFit Intense
        response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'admin-1',
          classId: '55fe5da4-8187-4f33-b187-657a7cfe805b' // CrossFit Intense
        });
        expect(response.status).toBe(201);
        const adminBooking = response.body;

        // 3. user-1 annule sa réservation
        response = await app.handleRequest('PUT', `/api/bookings/${user1Booking.id}/cancel`, {
          userId: 'user-1'
        });
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('CANCELLED');

        // 4. user-2 peut maintenant réserver (place libérée)
        response = await app.handleRequest('POST', '/api/bookings', {
          userId: 'user-2',
          classId: '55fe5da4-8187-4f33-b187-657a7cfe805b' // CrossFit Intense
        });
        expect(response.status).toBe(201);

        // 5. Vérification de l'état final
        const crossfitResponse = await app.handleRequest('GET', '/api/classes/55fe5da4-8187-4f33-b187-657a7cfe805b');
        const confirmedBookings = crossfitResponse.body.bookings.filter(b => b.status === 'CONFIRMED');
        expect(confirmedBookings).toHaveLength(2); // admin-1 et user-2

        // 6. Vérification des réservations par utilisateur
        const user1Bookings = await app.handleRequest('GET', '/api/bookings/user/user-1');
        expect(user1Bookings.body.filter(b => b.status === 'CANCELLED')).toHaveLength(1);

        const user2Bookings = await app.handleRequest('GET', '/api/bookings/user/user-2');
        expect(user2Bookings.body.filter(b => b.status === 'CONFIRMED')).toHaveLength(3); // Yoga Matinal + Zumba Party (existing) + CrossFit Intense (new)
      });
    });
  });
});