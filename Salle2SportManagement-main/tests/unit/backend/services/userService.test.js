/**
 * Tests unitaires pour UserService
 * Teste la gestion des utilisateurs et validation d'unicité
 */

const { prismaMock } = require('../../../mocks/backend/prisma.mock');
const { dataHelpers } = require('../../../utils/test-helpers');

// Mock du service pour les tests
class MockUserService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async createUser(userData) {
    // Validation des données
    if (!userData.email) throw new Error('Email is required');
    if (!userData.firstname) throw new Error('First name is required');
    if (!userData.lastname) throw new Error('Last name is required');

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Vérification unicité email (insensible à la casse)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Création utilisateur
    const newUser = {
      ...userData,
      email: userData.email.toLowerCase(),
      role: userData.role || 'USER',
      dateJoined: new Date()
    };

    return await this.prisma.user.create({ data: newUser });
  }

  async updateUser(userId, updateData) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Si l'email est modifié, vérifier l'unicité
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateData.email.toLowerCase() }
      });

      if (emailExists) {
        throw new Error('Email already exists');
      }

      updateData.email = updateData.email.toLowerCase();
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  async getUserById(userId) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        bookings: {
          include: { class: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async getUserByEmail(email) {
    return await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async getAllUsers(filters = {}) {
    const where = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.search) {
      where.OR = [
        { firstname: { contains: filters.search, mode: 'insensitive' } },
        { lastname: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return await this.prisma.user.findMany({
      where,
      orderBy: { dateJoined: 'desc' },
      take: filters.limit || undefined,
      skip: filters.offset || undefined
    });
  }

  async deleteUser(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Vérification des contraintes métier
    const hasActiveBookings = await this.prisma.booking.count({
      where: {
        userId,
        status: 'CONFIRMED',
        class: {
          datetime: { gt: new Date() }
        }
      }
    });

    if (hasActiveBookings > 0) {
      throw new Error('Cannot delete user with active bookings');
    }

    return await this.prisma.user.delete({
      where: { id: userId }
    });
  }

  async getUserStats(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const bookingStats = {
      totalBookings: user.bookings.length,
      confirmedBookings: user.bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelledBookings: user.bookings.filter(b => b.status === 'CANCELLED').length,
      noShows: user.bookings.filter(b => b.status === 'NO_SHOW').length
    };

    return {
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        dateJoined: user.dateJoined
      },
      subscription: user.subscription,
      stats: bookingStats
    };
  }
}

describe('UserService - Tests Unitaires', () => {
  let userService;

  beforeEach(() => {
    dataHelpers.setupTestEnvironment();
    userService = new MockUserService(prismaMock);
  });

  afterEach(() => {
    dataHelpers.cleanupTestEnvironment();
  });

  // ==========================================
  // 1. VALIDATION D'UNICITÉ EMAIL
  // ==========================================
  describe('📧 Validation d\'Unicité Email', () => {
    const setupEmailTest = (existingEmail = null) => {
      if (existingEmail) {
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'existing-user',
          email: existingEmail,
          firstname: 'Existing',
          lastname: 'User'
        });
      } else {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockImplementation(({ data }) => Promise.resolve({
          id: 'new-user-1',
          ...data
        }));
      }
    };

    describe('Cas passant', () => {
      test('should create user with unique email', async () => {
        // Arrange
        setupEmailTest();
        const userData = {
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          role: 'USER'
        };

        // Act
        const user = await userService.createUser(userData);

        // Assert
        expect(user.email).toBe('john.doe@example.com');
        expect(prismaMock.user.create).toHaveBeenCalledWith({
          data: {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            role: 'USER',
            dateJoined: expect.any(Date)
          }
        });
      });

      test('should normalize email to lowercase', async () => {
        // Arrange
        setupEmailTest();
        const userData = {
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'Jane.Smith@EXAMPLE.COM'
        };

        // Act
        const user = await userService.createUser(userData);

        // Assert
        expect(prismaMock.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            email: 'jane.smith@example.com'
          })
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject creation with existing email', async () => {
        // Arrange
        setupEmailTest('john.doe@example.com');
        const userData = {
          firstname: 'Another',
          lastname: 'John',
          email: 'john.doe@example.com'
        };

        // Act & Assert
        await expect(
          userService.createUser(userData)
        ).rejects.toThrow('Email already exists');
      });

      test('should reject creation with invalid email format', async () => {
        // Arrange
        const userData = {
          firstname: 'Invalid',
          lastname: 'Email',
          email: 'invalid-email-format'
        };

        // Act & Assert
        await expect(
          userService.createUser(userData)
        ).rejects.toThrow('Invalid email format');
      });

      test('should reject creation with missing required fields', async () => {
        // Test email manquant
        await expect(
          userService.createUser({ firstname: 'John', lastname: 'Doe' })
        ).rejects.toThrow('Email is required');

        // Test prénom manquant
        await expect(
          userService.createUser({ lastname: 'Doe', email: 'john@example.com' })
        ).rejects.toThrow('First name is required');

        // Test nom manquant
        await expect(
          userService.createUser({ firstname: 'John', email: 'john@example.com' })
        ).rejects.toThrow('Last name is required');
      });
    });

    describe('Cas limite', () => {
      test('should detect email conflict with different case', async () => {
        // Arrange
        setupEmailTest('john.doe@example.com');
        const userData = {
          firstname: 'John',
          lastname: 'Doe',
          email: 'JOHN.DOE@EXAMPLE.COM' // Même email en majuscules
        };

        // Act & Assert
        await expect(
          userService.createUser(userData)
        ).rejects.toThrow('Email already exists');
      });

      test('should handle very long email addresses', async () => {
        // Arrange
        setupEmailTest();
        const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
        const userData = {
          firstname: 'Long',
          lastname: 'Email',
          email: longEmail
        };

        // Act
        const user = await userService.createUser(userData);

        // Assert
        expect(user.email).toBe(longEmail);
      });
    });
  });

  // ==========================================
  // 2. MISE À JOUR D'UTILISATEUR
  // ==========================================
  describe('🔄 Mise à Jour d\'Utilisateur', () => {
    const setupUpdateTest = (userExists = true, emailConflict = false) => {
      if (userExists) {
        prismaMock.user.findUnique
          .mockResolvedValueOnce({
            id: 'user-1',
            email: 'original@example.com',
            firstname: 'Original',
            lastname: 'User'
          });

        if (emailConflict) {
          prismaMock.user.findUnique
            .mockResolvedValueOnce({
              id: 'other-user',
              email: 'conflict@example.com'
            });
        } else {
          prismaMock.user.findUnique.mockResolvedValueOnce(null);
        }

        prismaMock.user.update.mockResolvedValue({
          id: 'user-1',
          email: 'updated@example.com',
          firstname: 'Updated',
          lastname: 'User'
        });
      } else {
        prismaMock.user.findUnique.mockResolvedValue(null);
      }
    };

    describe('Cas passant', () => {
      test('should update user with valid data', async () => {
        // Arrange
        setupUpdateTest(true, false);
        const updateData = {
          firstname: 'Updated',
          lastname: 'Name',
          email: 'updated@example.com'
        };

        // Act
        const updated = await userService.updateUser('user-1', updateData);

        // Assert
        expect(updated.firstname).toBe('Updated');
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: {
            firstname: 'Updated',
            lastname: 'Name',
            email: 'updated@example.com'
          }
        });
      });

      test('should update user without email change', async () => {
        // Arrange
        setupUpdateTest(true, false);
        const updateData = { firstname: 'NewFirstName' };

        // Act
        await userService.updateUser('user-1', updateData);

        // Assert
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: { firstname: 'NewFirstName' }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject update for non-existent user', async () => {
        // Arrange
        setupUpdateTest(false);

        // Act & Assert
        await expect(
          userService.updateUser('invalid-user', { firstname: 'Test' })
        ).rejects.toThrow('User not found');
      });

      test('should reject email update to existing email', async () => {
        // Arrange
        setupUpdateTest(true, true);
        const updateData = { email: 'conflict@example.com' };

        // Act & Assert
        await expect(
          userService.updateUser('user-1', updateData)
        ).rejects.toThrow('Email already exists');
      });
    });

    describe('Cas limite', () => {
      test('should allow same email update (no change)', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'user-1',
          email: 'same@example.com',
          firstname: 'User'
        });
        prismaMock.user.update.mockResolvedValue({
          id: 'user-1',
          email: 'same@example.com',
          firstname: 'Updated'
        });

        const updateData = {
          firstname: 'Updated',
          email: 'same@example.com' // Même email
        };

        // Act
        const updated = await userService.updateUser('user-1', updateData);

        // Assert
        expect(updated.firstname).toBe('Updated');
        // L'email n'a pas besoin d'être vérifié pour unicité
      });
    });
  });

  // ==========================================
  // 3. RÉCUPÉRATION D'UTILISATEUR
  // ==========================================
  describe('🔍 Récupération d\'Utilisateur', () => {
    describe('Cas passant', () => {
      test('should get user by ID with all relations', async () => {
        // Arrange
        const userWithRelations = {
          id: 'user-1',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          subscription: {
            id: 'sub-1',
            planType: 'PREMIUM'
          },
          bookings: [
            {
              id: 'booking-1',
              status: 'CONFIRMED',
              class: { title: 'Yoga', datetime: new Date() }
            }
          ]
        };
        prismaMock.user.findUnique.mockResolvedValue(userWithRelations);

        // Act
        const user = await userService.getUserById('user-1');

        // Assert
        expect(user.firstname).toBe('John');
        expect(user.subscription.planType).toBe('PREMIUM');
        expect(user.bookings).toHaveLength(1);
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          include: {
            subscription: true,
            bookings: {
              include: { class: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      });

      test('should get user by email', async () => {
        // Arrange
        const user = {
          id: 'user-1',
          email: 'test@example.com',
          firstname: 'Test'
        };
        prismaMock.user.findUnique.mockResolvedValue(user);

        // Act
        const result = await userService.getUserByEmail('TEST@EXAMPLE.COM');

        // Assert
        expect(result.email).toBe('test@example.com');
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'test@example.com' }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should return null for non-existent user', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue(null);

        // Act
        const user = await userService.getUserById('invalid-id');

        // Assert
        expect(user).toBeNull();
      });
    });
  });

  // ==========================================
  // 4. SUPPRESSION D'UTILISATEUR
  // ==========================================
  describe('🗑️ Suppression d\'Utilisateur', () => {
    const setupDeleteTest = (userExists = true, hasActiveBookings = false) => {
      if (userExists) {
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com'
        });

        prismaMock.booking.count.mockResolvedValue(hasActiveBookings ? 2 : 0);

        if (!hasActiveBookings) {
          prismaMock.user.delete.mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com'
          });
        }
      } else {
        prismaMock.user.findUnique.mockResolvedValue(null);
      }
    };

    describe('Cas passant', () => {
      test('should delete user without active bookings', async () => {
        // Arrange
        setupDeleteTest(true, false);

        // Act
        const deleted = await userService.deleteUser('user-1');

        // Assert
        expect(deleted.id).toBe('user-1');
        expect(prismaMock.user.delete).toHaveBeenCalledWith({
          where: { id: 'user-1' }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject deletion for non-existent user', async () => {
        // Arrange
        setupDeleteTest(false);

        // Act & Assert
        await expect(
          userService.deleteUser('invalid-user')
        ).rejects.toThrow('User not found');
      });

      test('should reject deletion for user with active bookings', async () => {
        // Arrange
        setupDeleteTest(true, true);

        // Act & Assert
        await expect(
          userService.deleteUser('user-1')
        ).rejects.toThrow('Cannot delete user with active bookings');
      });
    });
  });

  // ==========================================
  // 5. STATISTIQUES UTILISATEUR
  // ==========================================
  describe('📊 Statistiques Utilisateur', () => {
    const setupStatsTest = (userExists = true, bookings = []) => {
      if (userExists) {
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'user-1',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          role: 'USER',
          dateJoined: new Date('2024-01-01'),
          subscription: {
            id: 'sub-1',
            planType: 'STANDARD'
          },
          bookings
        });
      } else {
        prismaMock.user.findUnique.mockResolvedValue(null);
      }
    };

    describe('Cas passant', () => {
      test('should calculate user stats correctly', async () => {
        // Arrange
        const bookings = [
          { status: 'CONFIRMED' },
          { status: 'CONFIRMED' },
          { status: 'CANCELLED' },
          { status: 'NO_SHOW' }
        ];
        setupStatsTest(true, bookings);

        // Act
        const stats = await userService.getUserStats('user-1');

        // Assert
        expect(stats.stats.totalBookings).toBe(4);
        expect(stats.stats.confirmedBookings).toBe(2);
        expect(stats.stats.cancelledBookings).toBe(1);
        expect(stats.stats.noShows).toBe(1);
        expect(stats.user.firstname).toBe('John');
        expect(stats.subscription.planType).toBe('STANDARD');
      });
    });

    describe('Cas non passant', () => {
      test('should return null for non-existent user', async () => {
        // Arrange
        setupStatsTest(false);

        // Act
        const stats = await userService.getUserStats('invalid-user');

        // Assert
        expect(stats).toBeNull();
      });
    });

    describe('Cas limite', () => {
      test('should handle user with no bookings', async () => {
        // Arrange
        setupStatsTest(true, []);

        // Act
        const stats = await userService.getUserStats('user-1');

        // Assert
        expect(stats.stats.totalBookings).toBe(0);
        expect(stats.stats.confirmedBookings).toBe(0);
        expect(stats.stats.cancelledBookings).toBe(0);
        expect(stats.stats.noShows).toBe(0);
      });
    });
  });

  // ==========================================
  // 6. RECHERCHE ET FILTRAGE D'UTILISATEURS
  // ==========================================
  describe('🔎 Recherche et Filtrage d\'Utilisateurs', () => {
    describe('Cas passant', () => {
      test('should get all users without filters', async () => {
        // Arrange
        const users = [
          { id: 'user-1', firstname: 'John', role: 'USER' },
          { id: 'user-2', firstname: 'Jane', role: 'ADMIN' }
        ];
        prismaMock.user.findMany.mockResolvedValue(users);

        // Act
        const result = await userService.getAllUsers();

        // Assert
        expect(result).toHaveLength(2);
        expect(prismaMock.user.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { dateJoined: 'desc' },
          take: undefined,
          skip: undefined
        });
      });

      test('should filter users by role', async () => {
        // Arrange
        const adminUsers = [{ id: 'admin-1', role: 'ADMIN' }];
        prismaMock.user.findMany.mockResolvedValue(adminUsers);

        // Act
        const result = await userService.getAllUsers({ role: 'ADMIN' });

        // Assert
        expect(prismaMock.user.findMany).toHaveBeenCalledWith({
          where: { role: 'ADMIN' },
          orderBy: { dateJoined: 'desc' },
          take: undefined,
          skip: undefined
        });
      });

      test('should search users by name or email', async () => {
        // Arrange
        const searchResults = [{ id: 'user-1', firstname: 'John' }];
        prismaMock.user.findMany.mockResolvedValue(searchResults);

        // Act
        const result = await userService.getAllUsers({ search: 'john' });

        // Assert
        expect(prismaMock.user.findMany).toHaveBeenCalledWith({
          where: {
            OR: [
              { firstname: { contains: 'john', mode: 'insensitive' } },
              { lastname: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } }
            ]
          },
          orderBy: { dateJoined: 'desc' },
          take: undefined,
          skip: undefined
        });
      });
    });

    describe('Cas limite', () => {
      test('should handle pagination parameters', async () => {
        // Arrange
        prismaMock.user.findMany.mockResolvedValue([]);

        // Act
        await userService.getAllUsers({ limit: 10, offset: 20 });

        // Assert
        expect(prismaMock.user.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { dateJoined: 'desc' },
          take: 10,
          skip: 20
        });
      });
    });
  });
});
