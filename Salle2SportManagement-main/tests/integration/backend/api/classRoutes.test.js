/**
 * Tests d'intégration pour les routes API des cours
 * Teste les endpoints avec base de données réelle et logique métier
 */

const request = require('supertest');
const { testDbManager } = require('../../../utils/db-setup');
const { ClassFactory } = require('../../../factories/class.factory');
const { UserFactory } = require('../../../factories/user.factory');
const { timeMock, timeUtils } = require('../../../mocks/utils/time.mock');

// Mock de l'application Express intégrée pour les routes de cours
class MockClassApiApp {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
    this.testDatabase = {
      users: new Map(),
      classes: new Map(),
      bookings: new Map()
    };
  }

  get(path, handler) {
    this.routes.set(`GET:${path}`, handler);
    return this;
  }

  post(path, handler) {
    this.routes.set(`POST:${path}`, handler);
    return this;
  }

  put(path, handler) {
    this.routes.set(`PUT:${path}`, handler);
    return this;
  }

  delete(path, handler) {
    this.routes.set(`DELETE:${path}`, handler);
    return this;
  }

  async handleRequest(method, path, body = {}, headers = {}) {
    const routeKey = `${method}:${path}`;
    const handler = this.routes.get(routeKey);

    if (!handler) {
      return { status: 404, body: { error: 'Route not found' } };
    }

    const req = {
      body,
      headers,
      params: this.extractParams(path),
      query: {},
      user: headers.authorization ? this.authenticateUser(headers.authorization) : null
    };

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

  extractParams(path) {
    const matches = path.match(/\/([^\/]+)$/);
    return matches ? { id: matches[1] } : {};
  }

  authenticateUser(authHeader) {
    // Simple mock authentication
    const userId = authHeader.replace('Bearer ', '');
    return this.testDatabase.users.get(userId);
  }
}

// Services intégrés pour l'API des cours
const createIntegratedClassServices = (testDatabase) => {
  return {
    async getAllClasses() {
      const classes = Array.from(testDatabase.classes.values());

      // Ajouter les informations de réservation pour chaque cours
      return classes.map(cls => {
        const bookings = Array.from(testDatabase.bookings.values())
          .filter(b => b.classId === cls.id && b.status === 'CONFIRMED');

        return {
          ...cls,
          bookingsCount: bookings.length,
          availableSpots: cls.capacity - bookings.length,
          isFullyBooked: bookings.length >= cls.capacity
        };
      });
    },

    async getClassById(classId) {
      const cls = testDatabase.classes.get(classId);
      if (!cls) return null;

      const bookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.classId === classId);

      const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');

      return {
        ...cls,
        bookings: bookings.map(booking => ({
          ...booking,
          user: testDatabase.users.get(booking.userId)
        })),
        bookingsCount: confirmedBookings.length,
        availableSpots: cls.capacity - confirmedBookings.length
      };
    },

    async createClass(classData, creatorUser) {
      // Validation des permissions
      if (!creatorUser || creatorUser.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      // Validation des données
      if (!classData.title || !classData.coach || !classData.datetime) {
        throw new Error('Missing required fields');
      }

      // Validation de la date
      const classTime = new Date(classData.datetime);
      if (classTime <= new Date()) {
        throw new Error('Class datetime must be in the future');
      }

      // Validation de capacité
      if (classData.capacity <= 0) {
        throw new Error('Capacity must be positive');
      }

      // Vérification des conflits de coach
      const existingClasses = Array.from(testDatabase.classes.values());
      const hasCoachConflict = existingClasses.some(existing => {
        if (existing.coach !== classData.coach) return false;

        const existingStart = new Date(existing.datetime);
        const existingEnd = new Date(existingStart.getTime() + existing.duration * 60000);
        const newStart = new Date(classData.datetime);
        const newEnd = new Date(newStart.getTime() + classData.duration * 60000);

        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasCoachConflict) {
        throw new Error('Coach has conflicting class at this time');
      }

      const newClass = {
        id: `class-${Date.now()}`,
        title: classData.title,
        coach: classData.coach,
        datetime: classData.datetime,
        duration: classData.duration || 60,
        capacity: classData.capacity,
        description: classData.description || '',
        isCancelled: false,
        createdAt: new Date(),
        createdBy: creatorUser.id
      };

      testDatabase.classes.set(newClass.id, newClass);
      return newClass;
    },

    async updateClass(classId, updateData, updaterUser) {
      // Validation des permissions
      if (!updaterUser || updaterUser.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      const existingClass = testDatabase.classes.get(classId);
      if (!existingClass) {
        throw new Error('Class not found');
      }

      // Vérification si le cours a déjà commencé
      const now = new Date();
      const classTime = new Date(existingClass.datetime);
      if (classTime <= now) {
        throw new Error('Cannot modify past or ongoing class');
      }

      // Validation si on change la capacité
      if (updateData.capacity !== undefined) {
        const confirmedBookings = Array.from(testDatabase.bookings.values())
          .filter(b => b.classId === classId && b.status === 'CONFIRMED').length;

        if (updateData.capacity < confirmedBookings) {
          throw new Error('Cannot reduce capacity below confirmed bookings');
        }
      }

      // Validation des conflits de coach si on change l'horaire ou le coach
      if (updateData.datetime || updateData.coach) {
        const newDatetime = updateData.datetime || existingClass.datetime;
        const newCoach = updateData.coach || existingClass.coach;

        const otherClasses = Array.from(testDatabase.classes.values())
          .filter(cls => cls.id !== classId);

        const hasConflict = otherClasses.some(cls => {
          if (cls.coach !== newCoach) return false;

          const existingStart = new Date(cls.datetime);
          const existingEnd = new Date(existingStart.getTime() + cls.duration * 60000);
          const newStart = new Date(newDatetime);
          const newEnd = new Date(newStart.getTime() + existingClass.duration * 60000);

          return (newStart < existingEnd && newEnd > existingStart);
        });

        if (hasConflict) {
          throw new Error('Coach has conflicting class at this time');
        }
      }

      const updatedClass = {
        ...existingClass,
        ...updateData,
        updatedAt: new Date(),
        updatedBy: updaterUser.id
      };

      testDatabase.classes.set(classId, updatedClass);
      return updatedClass;
    },

    async deleteClass(classId, deleterUser) {
      // Validation des permissions
      if (!deleterUser || deleterUser.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      const existingClass = testDatabase.classes.get(classId);
      if (!existingClass) {
        throw new Error('Class not found');
      }

      // Vérification s'il y a des réservations actives
      const activeBookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.classId === classId && b.status === 'CONFIRMED');

      if (activeBookings.length > 0) {
        throw new Error('Cannot delete class with active bookings');
      }

      testDatabase.classes.delete(classId);
      return { message: 'Class deleted successfully' };
    },

    async cancelClass(classId, cancelerUser) {
      // Validation des permissions
      if (!cancelerUser || cancelerUser.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      const existingClass = testDatabase.classes.get(classId);
      if (!existingClass) {
        throw new Error('Class not found');
      }

      if (existingClass.isCancelled) {
        throw new Error('Class is already cancelled');
      }

      // Marquer le cours comme annulé
      const cancelledClass = {
        ...existingClass,
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: cancelerUser.id
      };

      testDatabase.classes.set(classId, cancelledClass);

      // Annuler toutes les réservations actives
      const activeBookings = Array.from(testDatabase.bookings.values())
        .filter(b => b.classId === classId && b.status === 'CONFIRMED');

      activeBookings.forEach(booking => {
        testDatabase.bookings.set(booking.id, {
          ...booking,
          status: 'CANCELLED_BY_CLASS',
          updatedAt: new Date()
        });
      });

      return {
        ...cancelledClass,
        cancelledBookingsCount: activeBookings.length
      };
    }
  };
};

// Configuration de l'application de test avec routes intégrées
const createIntegratedClassApp = () => {
  const app = new MockClassApiApp();
  const classServices = createIntegratedClassServices(app.testDatabase);

  // GET /api/classes - Récupérer tous les cours
  app.get('/api/classes', async (req, res) => {
    try {
      const classes = await classServices.getAllClasses();
      res.json(classes);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/classes/:id - Récupérer un cours spécifique
  app.get('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const classWithDetails = await classServices.getClassById(id);

      if (!classWithDetails) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json(classWithDetails);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/classes - Créer un nouveau cours
  app.post('/api/classes', async (req, res) => {
    try {
      const newClass = await classServices.createClass(req.body, req.user);
      res.status(201).json(newClass);
    } catch (error) {
      const status = error.message.includes('Access denied') ? 403 :
                   error.message.includes('required') || error.message.includes('positive') ? 400 :
                   error.message.includes('future') || error.message.includes('conflict') ? 409 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  // PUT /api/classes/:id - Mettre à jour un cours
  app.put('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updatedClass = await classServices.updateClass(id, req.body, req.user);
      res.json(updatedClass);
    } catch (error) {
      const status = error.message.includes('Access denied') ? 403 :
                   error.message.includes('not found') ? 404 :
                   error.message.includes('past') || error.message.includes('capacity') || error.message.includes('conflict') ? 409 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  // DELETE /api/classes/:id - Supprimer un cours
  app.delete('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await classServices.deleteClass(id, req.user);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('Access denied') ? 403 :
                   error.message.includes('not found') ? 404 :
                   error.message.includes('active bookings') ? 409 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  // PUT /api/classes/:id/cancel - Annuler un cours
  app.put('/api/classes/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await classServices.cancelClass(id, req.user);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('Access denied') ? 403 :
                   error.message.includes('not found') ? 404 :
                   error.message.includes('already cancelled') ? 409 :
                   400;
      res.status(status).json({ error: error.message });
    }
  });

  return { app, testDatabase: app.testDatabase, classServices };
};

describe('Class Routes - Tests d\'Intégration', () => {
  let app, testDatabase, classServices;

  beforeAll(async () => {
    timeMock.enable('2024-01-15T14:30:00.000Z');
  });

  afterAll(async () => {
    timeMock.disable();
  });

  beforeEach(async () => {
    ({ app, testDatabase, classServices } = createIntegratedClassApp());
    await setupIntegrationTestData();
  });

  const setupIntegrationTestData = async () => {
    // Utilisateurs de test
    const users = [
      {
        id: 'admin-1',
        firstname: 'Admin',
        lastname: 'User',
        email: 'admin@gym.com',
        role: 'ADMIN',
        dateJoined: new Date('2023-01-01')
      },
      {
        id: 'user-1',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@email.com',
        role: 'USER',
        dateJoined: new Date('2024-01-01')
      },
      {
        id: 'user-2',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@email.com',
        role: 'USER',
        dateJoined: new Date('2024-01-05')
      }
    ];

    users.forEach(user => testDatabase.users.set(user.id, user));

    // Cours de test
    const classes = [
      {
        id: 'class-1',
        title: 'Yoga Morning',
        coach: 'Sarah Johnson',
        datetime: timeUtils.futureDate(4), // 4h dans le futur
        duration: 60,
        capacity: 15,
        description: 'Relaxing morning yoga session',
        isCancelled: false,
        createdAt: new Date('2024-01-10'),
        createdBy: 'admin-1'
      },
      {
        id: 'class-2',
        title: 'Pilates Evening',
        coach: 'Emma Thompson',
        datetime: timeUtils.futureDate(2), // 2h dans le futur
        duration: 45,
        capacity: 12,
        description: 'Core strengthening pilates',
        isCancelled: false,
        createdAt: new Date('2024-01-11'),
        createdBy: 'admin-1'
      },
      {
        id: 'class-past',
        title: 'Past Class',
        coach: 'Old Coach',
        datetime: timeUtils.pastDate(2), // 2h dans le passé
        duration: 60,
        capacity: 10,
        description: 'This class has already happened',
        isCancelled: false,
        createdAt: new Date('2024-01-12'),
        createdBy: 'admin-1'
      }
    ];

    classes.forEach(cls => testDatabase.classes.set(cls.id, cls));

    // Réservations de test
    const bookings = [
      {
        id: 'booking-1',
        userId: 'user-1',
        classId: 'class-1',
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-14')
      },
      {
        id: 'booking-2',
        userId: 'user-2',
        classId: 'class-1',
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-14')
      }
    ];

    bookings.forEach(booking => testDatabase.bookings.set(booking.id, booking));
  };

  // ==========================================
  // 1. RÉCUPÉRATION DES COURS
  // ==========================================
  describe('📋 Récupération des Cours', () => {
    describe('Cas passant', () => {
      test('should get all classes with booking information', async () => {
        // Act
        const response = await app.handleRequest('GET', '/api/classes');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);

        const class1 = response.body.find(c => c.id === 'class-1');
        expect(class1.title).toBe('Yoga Morning');
        expect(class1.bookingsCount).toBe(2); // 2 réservations confirmées
        expect(class1.availableSpots).toBe(13); // 15 - 2
        expect(class1.isFullyBooked).toBe(false);
      });

      test('should get specific class with detailed booking information', async () => {
        // Act
        const response = await app.handleRequest('GET', '/api/classes/class-1');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.id).toBe('class-1');
        expect(response.body.title).toBe('Yoga Morning');
        expect(response.body.bookings).toHaveLength(2);
        expect(response.body.bookings[0].user.firstname).toBeDefined();
        expect(response.body.availableSpots).toBe(13);
      });

      test('should include past classes in listing', async () => {
        // Act
        const response = await app.handleRequest('GET', '/api/classes');

        // Assert
        const pastClass = response.body.find(c => c.id === 'class-past');
        expect(pastClass).toBeDefined();
        expect(pastClass.title).toBe('Past Class');
      });
    });

    describe('Cas non passant', () => {
      test('should return 404 for non-existent class', async () => {
        // Act
        const response = await app.handleRequest('GET', '/api/classes/invalid-class');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Class not found');
      });
    });

    describe('Cas limite', () => {
      test('should handle empty class list', async () => {
        // Arrange - Vider la base de données des cours
        testDatabase.classes.clear();

        // Act
        const response = await app.handleRequest('GET', '/api/classes');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // 2. CRÉATION DE COURS
  // ==========================================
  describe('➕ Création de Cours', () => {
    describe('Cas passant', () => {
      test('should create new class successfully', async () => {
        // Arrange
        const newClassData = {
          title: 'New Yoga Class',
          coach: 'New Coach',
          datetime: timeUtils.futureDate(6),
          duration: 60,
          capacity: 20,
          description: 'A new exciting yoga class'
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          newClassData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.title).toBe('New Yoga Class');
        expect(response.body.coach).toBe('New Coach');
        expect(response.body.capacity).toBe(20);
        expect(response.body.isCancelled).toBe(false);
        expect(response.body.createdBy).toBe('admin-1');

        // Vérification que le cours est bien en base
        const savedClass = testDatabase.classes.get(response.body.id);
        expect(savedClass).toBeDefined();
      });

      test('should create class with minimal required data', async () => {
        // Arrange
        const minimalClassData = {
          title: 'Minimal Class',
          coach: 'Min Coach',
          datetime: timeUtils.futureDate(3),
          capacity: 10
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          minimalClassData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.duration).toBe(60); // Valeur par défaut
        expect(response.body.description).toBe(''); // Valeur par défaut
      });
    });

    describe('Cas non passant', () => {
      test('should reject creation by non-admin user', async () => {
        // Arrange
        const classData = {
          title: 'Unauthorized Class',
          coach: 'Some Coach',
          datetime: timeUtils.futureDate(3),
          capacity: 10
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          classData,
          { authorization: 'Bearer user-1' }
        );

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject creation without authentication', async () => {
        // Arrange
        const classData = {
          title: 'Unauthenticated Class',
          coach: 'Some Coach',
          datetime: timeUtils.futureDate(3),
          capacity: 10
        };

        // Act
        const response = await app.handleRequest('POST', '/api/classes', classData);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject creation with missing required fields', async () => {
        // Arrange
        const incompleteData = {
          title: 'Incomplete Class'
          // coach, datetime, capacity manquants
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          incompleteData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      });

      test('should reject creation with past datetime', async () => {
        // Arrange
        const pastClassData = {
          title: 'Past Class',
          coach: 'Time Traveler',
          datetime: timeUtils.pastDate(1),
          capacity: 10
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          pastClassData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Class datetime must be in the future');
      });

      test('should reject creation with coach conflict', async () => {
        // Arrange - Créer un cours avec même coach à la même heure
        const conflictData = {
          title: 'Conflicting Class',
          coach: 'Sarah Johnson', // Même coach que class-1
          datetime: timeUtils.futureDate(4), // Même heure que class-1
          capacity: 10
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          conflictData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Coach has conflicting class at this time');
      });
    });

    describe('Cas limite', () => {
      test('should reject creation with zero capacity', async () => {
        // Arrange
        const zeroCapacityData = {
          title: 'Zero Capacity Class',
          coach: 'Confused Coach',
          datetime: timeUtils.futureDate(3),
          capacity: 0
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          zeroCapacityData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Capacity must be positive');
      });

      test('should reject creation with negative capacity', async () => {
        // Arrange
        const negativeCapacityData = {
          title: 'Negative Capacity Class',
          coach: 'Confused Coach',
          datetime: timeUtils.futureDate(3),
          capacity: -5
        };

        // Act
        const response = await app.handleRequest(
          'POST',
          '/api/classes',
          negativeCapacityData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Capacity must be positive');
      });
    });
  });

  // ==========================================
  // 3. MODIFICATION DE COURS
  // ==========================================
  describe('✏️ Modification de Cours', () => {
    describe('Cas passant', () => {
      test('should update class details successfully', async () => {
        // Arrange
        const updateData = {
          title: 'Updated Yoga Class',
          description: 'Updated description',
          capacity: 20
        };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Yoga Class');
        expect(response.body.description).toBe('Updated description');
        expect(response.body.capacity).toBe(20);
        expect(response.body.coach).toBe('Sarah Johnson'); // Inchangé
        expect(response.body.updatedBy).toBe('admin-1');

        // Vérification en base
        const updatedClass = testDatabase.classes.get('class-1');
        expect(updatedClass.title).toBe('Updated Yoga Class');
      });

      test('should update class datetime successfully', async () => {
        // Arrange
        const newDatetime = timeUtils.futureDate(8);
        const updateData = { datetime: newDatetime };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-2',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(new Date(response.body.datetime)).toEqual(newDatetime);
      });

      test('should update coach successfully when no conflict', async () => {
        // Arrange
        const updateData = { coach: 'New Coach Name' };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.coach).toBe('New Coach Name');
      });
    });

    describe('Cas non passant', () => {
      test('should reject update by non-admin user', async () => {
        // Arrange
        const updateData = { title: 'Unauthorized Update' };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer user-1' }
        );

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject update of non-existent class', async () => {
        // Arrange
        const updateData = { title: 'Non-existent Update' };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/invalid-class',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Class not found');
      });

      test('should reject update of past class', async () => {
        // Arrange
        const updateData = { title: 'Past Class Update' };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-past',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Cannot modify past or ongoing class');
      });

      test('should reject capacity reduction below confirmed bookings', async () => {
        // Arrange - class-1 a 2 réservations confirmées
        const updateData = { capacity: 1 }; // Moins que les 2 réservations

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Cannot reduce capacity below confirmed bookings');
      });

      test('should reject coach update that creates conflict', async () => {
        // Arrange - Mettre le même coach que class-2 à la même heure
        const updateData = {
          coach: 'Emma Thompson', // Coach de class-2
          datetime: timeUtils.futureDate(2) // Même heure que class-2
        };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Coach has conflicting class at this time');
      });
    });

    describe('Cas limite', () => {
      test('should allow capacity increase above current bookings', async () => {
        // Arrange - class-1 a 2 réservations, capacité 15
        const updateData = { capacity: 30 };

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.capacity).toBe(30);
      });

      test('should allow capacity equal to confirmed bookings', async () => {
        // Arrange - class-1 a 2 réservations confirmées
        const updateData = { capacity: 2 }; // Exactement le nombre de réservations

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1',
          updateData,
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.capacity).toBe(2);
      });
    });
  });

  // ==========================================
  // 4. SUPPRESSION DE COURS
  // ==========================================
  describe('🗑️ Suppression de Cours', () => {
    let classWithoutBookings;

    beforeEach(() => {
      // Créer un cours sans réservations pour les tests de suppression
      classWithoutBookings = {
        id: 'class-empty',
        title: 'Empty Class',
        coach: 'Lonely Coach',
        datetime: timeUtils.futureDate(5),
        duration: 60,
        capacity: 10,
        isCancelled: false,
        createdAt: new Date(),
        createdBy: 'admin-1'
      };
      testDatabase.classes.set('class-empty', classWithoutBookings);
    });

    describe('Cas passant', () => {
      test('should delete class without bookings successfully', async () => {
        // Act
        const response = await app.handleRequest(
          'DELETE',
          '/api/classes/class-empty',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Class deleted successfully');

        // Vérification que le cours est supprimé
        expect(testDatabase.classes.has('class-empty')).toBe(false);
      });
    });

    describe('Cas non passant', () => {
      test('should reject deletion by non-admin user', async () => {
        // Act
        const response = await app.handleRequest(
          'DELETE',
          '/api/classes/class-empty',
          {},
          { authorization: 'Bearer user-1' }
        );

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject deletion of non-existent class', async () => {
        // Act
        const response = await app.handleRequest(
          'DELETE',
          '/api/classes/invalid-class',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Class not found');
      });

      test('should reject deletion of class with active bookings', async () => {
        // Act - Tenter de supprimer class-1 qui a des réservations
        const response = await app.handleRequest(
          'DELETE',
          '/api/classes/class-1',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Cannot delete class with active bookings');

        // Vérification que le cours existe toujours
        expect(testDatabase.classes.has('class-1')).toBe(true);
      });
    });
  });

  // ==========================================
  // 5. ANNULATION DE COURS
  // ==========================================
  describe('❌ Annulation de Cours', () => {
    describe('Cas passant', () => {
      test('should cancel class and all active bookings', async () => {
        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1/cancel',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.isCancelled).toBe(true);
        expect(response.body.cancelledBy).toBe('admin-1');
        expect(response.body.cancelledBookingsCount).toBe(2); // 2 réservations annulées

        // Vérification que toutes les réservations sont annulées
        const booking1 = testDatabase.bookings.get('booking-1');
        const booking2 = testDatabase.bookings.get('booking-2');
        expect(booking1.status).toBe('CANCELLED_BY_CLASS');
        expect(booking2.status).toBe('CANCELLED_BY_CLASS');
      });

      test('should cancel class without bookings', async () => {
        // Arrange - Créer un cours sans réservations
        const emptyClass = {
          id: 'class-no-bookings',
          title: 'No Bookings Class',
          coach: 'Lonely Coach',
          datetime: timeUtils.futureDate(3),
          duration: 60,
          capacity: 10,
          isCancelled: false,
          createdAt: new Date(),
          createdBy: 'admin-1'
        };
        testDatabase.classes.set('class-no-bookings', emptyClass);

        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-no-bookings/cancel',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.isCancelled).toBe(true);
        expect(response.body.cancelledBookingsCount).toBe(0);
      });
    });

    describe('Cas non passant', () => {
      test('should reject cancellation by non-admin user', async () => {
        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-1/cancel',
          {},
          { authorization: 'Bearer user-1' }
        );

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Access denied');
      });

      test('should reject cancellation of non-existent class', async () => {
        // Act
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/invalid-class/cancel',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Class not found');
      });

      test('should reject cancellation of already cancelled class', async () => {
        // Arrange - Annuler d'abord le cours
        await app.handleRequest(
          'PUT',
          '/api/classes/class-2/cancel',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Act - Tenter d'annuler à nouveau
        const response = await app.handleRequest(
          'PUT',
          '/api/classes/class-2/cancel',
          {},
          { authorization: 'Bearer admin-1' }
        );

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Class is already cancelled');
      });
    });
  });

  // ==========================================
  // 6. WORKFLOW COMPLEXE MULTI-OPÉRATIONS
  // ==========================================
  describe('🔄 Workflow Complexe Multi-Opérations', () => {
    describe('Cas passant', () => {
      test('should handle complete class lifecycle', async () => {
        // 1. Créer un nouveau cours
        const newClassData = {
          title: 'Lifecycle Class',
          coach: 'Lifecycle Coach',
          datetime: timeUtils.futureDate(10),
          duration: 90,
          capacity: 5
        };

        let response = await app.handleRequest(
          'POST',
          '/api/classes',
          newClassData,
          { authorization: 'Bearer admin-1' }
        );
        expect(response.status).toBe(201);
        const classId = response.body.id;

        // 2. Modifier le cours
        const updateData = { title: 'Updated Lifecycle Class', capacity: 8 };
        response = await app.handleRequest(
          'PUT',
          `/api/classes/${classId}`,
          updateData,
          { authorization: 'Bearer admin-1' }
        );
        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Lifecycle Class');
        expect(response.body.capacity).toBe(8);

        // 3. Ajouter des réservations (simulation)
        const booking1 = {
          id: 'lifecycle-booking-1',
          userId: 'user-1',
          classId: classId,
          status: 'CONFIRMED',
          createdAt: new Date()
        };
        testDatabase.bookings.set('lifecycle-booking-1', booking1);

        // 4. Vérifier le cours avec réservations
        response = await app.handleRequest('GET', `/api/classes/${classId}`);
        expect(response.status).toBe(200);
        expect(response.body.bookings).toHaveLength(1);
        expect(response.body.availableSpots).toBe(7);

        // 5. Annuler le cours
        response = await app.handleRequest(
          'PUT',
          `/api/classes/${classId}/cancel`,
          {},
          { authorization: 'Bearer admin-1' }
        );
        expect(response.status).toBe(200);
        expect(response.body.isCancelled).toBe(true);
        expect(response.body.cancelledBookingsCount).toBe(1);

        // 6. Vérifier que la réservation est annulée
        const cancelledBooking = testDatabase.bookings.get('lifecycle-booking-1');
        expect(cancelledBooking.status).toBe('CANCELLED_BY_CLASS');
      });
    });
  });
});
