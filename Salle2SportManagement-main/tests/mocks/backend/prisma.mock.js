/**
 * Mock du client Prisma pour les tests unitaires
 * Simule toutes les opérations CRUD sur les entités du système
 */

// Mock data store pour simuler la persistance
const mockDataStore = {
  users: new Map(),
  classes: new Map(),
  bookings: new Map(),
  subscriptions: new Map(),
};

// Utilitaires pour réinitialiser le store
const resetMockData = () => {
  mockDataStore.users.clear();
  mockDataStore.classes.clear();
  mockDataStore.bookings.clear();
  mockDataStore.subscriptions.clear();
};

// Générateur d'ID unique pour les tests
let mockIdCounter = 1;
const generateMockId = () => `mock-id-${mockIdCounter++}`;

// Mock du client Prisma
const prismaMock = {
  // === USER OPERATIONS ===
  user: {
    findUnique: jest.fn((params) => {
      const { where } = params;
      if (where.id) {
        return Promise.resolve(mockDataStore.users.get(where.id) || null);
      }
      if (where.email) {
        const user = Array.from(mockDataStore.users.values())
          .find(u => u.email === where.email);
        return Promise.resolve(user || null);
      }
      return Promise.resolve(null);
    }),

    findMany: jest.fn((params = {}) => {
      const users = Array.from(mockDataStore.users.values());
      const { where, orderBy, take, skip } = params;

      let filteredUsers = users;

      // Filtrage basique
      if (where) {
        if (where.role) {
          filteredUsers = filteredUsers.filter(u => u.role === where.role);
        }
      }

      // Pagination
      if (skip) filteredUsers = filteredUsers.slice(skip);
      if (take) filteredUsers = filteredUsers.slice(0, take);

      return Promise.resolve(filteredUsers);
    }),

    create: jest.fn((params) => {
      const { data } = params;
      const newUser = {
        id: generateMockId(),
        dateJoined: new Date(),
        role: 'USER',
        ...data,
      };
      mockDataStore.users.set(newUser.id, newUser);
      return Promise.resolve(newUser);
    }),

    update: jest.fn((params) => {
      const { where, data } = params;
      const existing = mockDataStore.users.get(where.id);
      if (!existing) {
        throw new Error('User not found');
      }
      const updated = { ...existing, ...data };
      mockDataStore.users.set(where.id, updated);
      return Promise.resolve(updated);
    }),

    delete: jest.fn((params) => {
      const { where } = params;
      const existing = mockDataStore.users.get(where.id);
      if (!existing) {
        throw new Error('User not found');
      }
      mockDataStore.users.delete(where.id);
      return Promise.resolve(existing);
    }),

    count: jest.fn((params = {}) => {
      const users = Array.from(mockDataStore.users.values());
      const { where } = params;

      if (!where) return Promise.resolve(users.length);

      let filteredUsers = users;
      if (where.role) {
        filteredUsers = filteredUsers.filter(u => u.role === where.role);
      }

      return Promise.resolve(filteredUsers.length);
    }),
  },

  // === CLASS OPERATIONS ===
  class: {
    findUnique: jest.fn((params) => {
      const { where } = params;
      const classItem = mockDataStore.classes.get(where.id);
      return Promise.resolve(classItem || null);
    }),

    findMany: jest.fn((params = {}) => {
      const classes = Array.from(mockDataStore.classes.values());
      const { where, orderBy, include } = params;

      let filteredClasses = classes;

      if (where) {
        if (where.datetime) {
          if (where.datetime.gte) {
            filteredClasses = filteredClasses.filter(c => c.datetime >= where.datetime.gte);
          }
          if (where.datetime.lte) {
            filteredClasses = filteredClasses.filter(c => c.datetime <= where.datetime.lte);
          }
        }
        if (where.isCancelled !== undefined) {
          filteredClasses = filteredClasses.filter(c => c.isCancelled === where.isCancelled);
        }
      }

      // Simulation d'inclusion des bookings
      if (include?.bookings) {
        filteredClasses = filteredClasses.map(c => ({
          ...c,
          bookings: Array.from(mockDataStore.bookings.values())
            .filter(b => b.classId === c.id)
        }));
      }

      return Promise.resolve(filteredClasses);
    }),

    create: jest.fn((params) => {
      const { data } = params;
      const newClass = {
        id: generateMockId(),
        isCancelled: false,
        ...data,
      };
      mockDataStore.classes.set(newClass.id, newClass);
      return Promise.resolve(newClass);
    }),

    update: jest.fn((params) => {
      const { where, data } = params;
      const existing = mockDataStore.classes.get(where.id);
      if (!existing) {
        throw new Error('Class not found');
      }
      const updated = { ...existing, ...data };
      mockDataStore.classes.set(where.id, updated);
      return Promise.resolve(updated);
    }),

    delete: jest.fn((params) => {
      const { where } = params;
      const existing = mockDataStore.classes.get(where.id);
      if (!existing) {
        throw new Error('Class not found');
      }
      mockDataStore.classes.delete(where.id);
      return Promise.resolve(existing);
    }),

    deleteMany: jest.fn((params) => {
      const { where } = params;
      const classes = Array.from(mockDataStore.classes.values());
      let deletedCount = 0;

      classes.forEach(c => {
        let shouldDelete = true;

        if (where.datetime?.lt) {
          shouldDelete = shouldDelete && c.datetime < where.datetime.lt;
        }

        if (shouldDelete) {
          mockDataStore.classes.delete(c.id);
          deletedCount++;
        }
      });

      return Promise.resolve({ count: deletedCount });
    }),
  },

  // === BOOKING OPERATIONS ===
  booking: {
    findUnique: jest.fn((params) => {
      const { where, include } = params;
      let booking = null;

      if (where.id) {
        booking = mockDataStore.bookings.get(where.id);
      } else if (where.userId_classId) {
        booking = Array.from(mockDataStore.bookings.values())
          .find(b => b.userId === where.userId_classId.userId &&
                     b.classId === where.userId_classId.classId);
      }

      if (!booking) return Promise.resolve(null);

      // Simulation des relations
      if (include) {
        if (include.user) {
          booking.user = mockDataStore.users.get(booking.userId);
        }
        if (include.class) {
          booking.class = mockDataStore.classes.get(booking.classId);
        }
      }

      return Promise.resolve(booking);
    }),

    findMany: jest.fn((params = {}) => {
      const bookings = Array.from(mockDataStore.bookings.values());
      const { where, include, orderBy, take, skip } = params;

      let filteredBookings = bookings;

      if (where) {
        if (where.userId) {
          filteredBookings = filteredBookings.filter(b => b.userId === where.userId);
        }
        if (where.classId) {
          filteredBookings = filteredBookings.filter(b => b.classId === where.classId);
        }
        if (where.status) {
          filteredBookings = filteredBookings.filter(b => b.status === where.status);
        }
        if (where.class?.datetime) {
          // Filtrage par date de classe
          const classDateFilter = where.class.datetime;
          filteredBookings = filteredBookings.filter(b => {
            const classItem = mockDataStore.classes.get(b.classId);
            if (!classItem) return false;

            if (classDateFilter.lt) {
              return classItem.datetime < classDateFilter.lt;
            }
            if (classDateFilter.gte) {
              return classItem.datetime >= classDateFilter.gte;
            }
            return true;
          });
        }
      }

      // Simulation des relations
      if (include) {
        filteredBookings = filteredBookings.map(b => {
          const enhanced = { ...b };
          if (include.user) {
            enhanced.user = mockDataStore.users.get(b.userId);
          }
          if (include.class) {
            enhanced.class = mockDataStore.classes.get(b.classId);
          }
          return enhanced;
        });
      }

      // Pagination
      if (skip) filteredBookings = filteredBookings.slice(skip);
      if (take) filteredBookings = filteredBookings.slice(0, take);

      return Promise.resolve(filteredBookings);
    }),

    create: jest.fn((params) => {
      const { data } = params;

      // Vérification des contraintes uniques
      const existingBooking = Array.from(mockDataStore.bookings.values())
        .find(b => b.userId === data.userId && b.classId === data.classId);

      if (existingBooking) {
        throw new Error('Unique constraint violation');
      }

      const newBooking = {
        id: generateMockId(),
        status: 'CONFIRMED',
        createdAt: new Date(),
        ...data,
      };

      mockDataStore.bookings.set(newBooking.id, newBooking);
      return Promise.resolve(newBooking);
    }),

    update: jest.fn((params) => {
      const { where, data } = params;
      const existing = mockDataStore.bookings.get(where.id);
      if (!existing) {
        throw new Error('Booking not found');
      }
      const updated = { ...existing, ...data };
      mockDataStore.bookings.set(where.id, updated);
      return Promise.resolve(updated);
    }),

    updateMany: jest.fn((params) => {
      const { where, data } = params;
      const bookings = Array.from(mockDataStore.bookings.values());
      let updatedCount = 0;

      bookings.forEach(b => {
        let shouldUpdate = true;

        if (where.status) {
          shouldUpdate = shouldUpdate && b.status === where.status;
        }
        if (where.class?.datetime?.lt) {
          const classItem = mockDataStore.classes.get(b.classId);
          shouldUpdate = shouldUpdate && classItem && classItem.datetime < where.class.datetime.lt;
        }

        if (shouldUpdate) {
          const updated = { ...b, ...data };
          mockDataStore.bookings.set(b.id, updated);
          updatedCount++;
        }
      });

      return Promise.resolve({ count: updatedCount });
    }),

    delete: jest.fn((params) => {
      const { where } = params;
      const existing = mockDataStore.bookings.get(where.id);
      if (!existing) {
        throw new Error('Booking not found');
      }
      mockDataStore.bookings.delete(where.id);
      return Promise.resolve(existing);
    }),

    count: jest.fn((params = {}) => {
      const bookings = Array.from(mockDataStore.bookings.values());
      const { where } = params;

      if (!where) return Promise.resolve(bookings.length);

      let filteredBookings = bookings;
      if (where.status) {
        filteredBookings = filteredBookings.filter(b => b.status === where.status);
      }

      return Promise.resolve(filteredBookings.length);
    }),
  },

  // === SUBSCRIPTION OPERATIONS ===
  subscription: {
    findUnique: jest.fn((params) => {
      const { where, include } = params;
      let subscription = null;

      if (where.id) {
        subscription = mockDataStore.subscriptions.get(where.id);
      } else if (where.userId) {
        subscription = Array.from(mockDataStore.subscriptions.values())
          .find(s => s.userId === where.userId);
      }

      if (!subscription) return Promise.resolve(null);

      // Simulation des relations
      if (include?.user) {
        subscription.user = mockDataStore.users.get(subscription.userId);
      }

      return Promise.resolve(subscription);
    }),

    findMany: jest.fn((params = {}) => {
      const subscriptions = Array.from(mockDataStore.subscriptions.values());
      const { where, include } = params;

      let filteredSubscriptions = subscriptions;

      if (where) {
        if (where.active !== undefined) {
          filteredSubscriptions = filteredSubscriptions.filter(s => s.active === where.active);
        }
        if (where.planType) {
          filteredSubscriptions = filteredSubscriptions.filter(s => s.planType === where.planType);
        }
      }

      // Simulation des relations
      if (include?.user) {
        filteredSubscriptions = filteredSubscriptions.map(s => ({
          ...s,
          user: mockDataStore.users.get(s.userId)
        }));
      }

      return Promise.resolve(filteredSubscriptions);
    }),

    create: jest.fn((params) => {
      const { data } = params;

      // Vérification de la contrainte unique userId
      const existingSubscription = Array.from(mockDataStore.subscriptions.values())
        .find(s => s.userId === data.userId);

      if (existingSubscription) {
        throw new Error('User already has a subscription');
      }

      const newSubscription = {
        id: generateMockId(),
        autoRenew: true,
        active: true,
        ...data,
      };

      mockDataStore.subscriptions.set(newSubscription.id, newSubscription);
      return Promise.resolve(newSubscription);
    }),

    update: jest.fn((params) => {
      const { where, data } = params;
      const existing = mockDataStore.subscriptions.get(where.id);
      if (!existing) {
        throw new Error('Subscription not found');
      }
      const updated = { ...existing, ...data };
      mockDataStore.subscriptions.set(where.id, updated);
      return Promise.resolve(updated);
    }),

    delete: jest.fn((params) => {
      const { where } = params;
      const existing = mockDataStore.subscriptions.get(where.id);
      if (!existing) {
        throw new Error('Subscription not found');
      }
      mockDataStore.subscriptions.delete(where.id);
      return Promise.resolve(existing);
    }),

    count: jest.fn((params = {}) => {
      const subscriptions = Array.from(mockDataStore.subscriptions.values());
      const { where } = params;

      if (!where) return Promise.resolve(subscriptions.length);

      let filteredSubscriptions = subscriptions;
      if (where.active !== undefined) {
        filteredSubscriptions = filteredSubscriptions.filter(s => s.active === where.active);
      }

      return Promise.resolve(filteredSubscriptions.length);
    }),
  },

  // === TRANSACTION SUPPORT ===
  $transaction: jest.fn((operations) => {
    // Simulation basique des transactions
    // Dans un vrai test, on pourrait implémenter un rollback
    return Promise.all(operations.map(op => op()));
  }),

  // === UTILITIES ===
  $disconnect: jest.fn(() => Promise.resolve()),
  $connect: jest.fn(() => Promise.resolve()),
};

// Utilitaires pour les tests
const mockHelpers = {
  // Réinitialise toutes les données de test
  resetAll: () => {
    resetMockData();
    mockIdCounter = 1;
    jest.clearAllMocks();
  },

  // Ajoute des données de test
  seedData: (data) => {
    if (data.users) {
      data.users.forEach(user => {
        mockDataStore.users.set(user.id, user);
      });
    }
    if (data.classes) {
      data.classes.forEach(cls => {
        mockDataStore.classes.set(cls.id, cls);
      });
    }
    if (data.bookings) {
      data.bookings.forEach(booking => {
        mockDataStore.bookings.set(booking.id, booking);
      });
    }
    if (data.subscriptions) {
      data.subscriptions.forEach(subscription => {
        mockDataStore.subscriptions.set(subscription.id, subscription);
      });
    }
  },

  // Accès au store pour vérifications
  getStore: () => mockDataStore,
};

module.exports = {
  prismaMock,
  mockHelpers,
};
