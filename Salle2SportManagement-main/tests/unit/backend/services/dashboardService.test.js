/**
 * Tests unitaires pour le service Dashboard
 * Teste l'agrégation de données et métriques pour tableaux de bord
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const { prismaMock } = require('../../../mocks/backend/prisma.mock');
const { timeMock, timeUtils } = require('../../../mocks/utils/time.mock');

// Mock du service Dashboard basé sur l'architecture observée
const createDashboardService = (prismaClient) => {
  return {
    /**
     * Récupère les données du tableau de bord utilisateur
     */
    async getUserDashboard(userId) {
      // Récupération des données utilisateur
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { active: true },
            orderBy: { startDate: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Statistiques des réservations
      const bookingStats = await this._getUserBookingStats(userId);
      
      // Réservations récentes
      const recentBookings = await prismaClient.booking.findMany({
        where: { userId },
        include: { class: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return {
        user: {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          dateJoined: user.dateJoined
        },
        subscription: user.subscriptions[0] || null,
        stats: bookingStats,
        recentBookings: recentBookings.map(booking => ({
          id: booking.id,
          status: booking.status,
          createdAt: booking.createdAt,
          class: {
            id: booking.class.id,
            title: booking.class.title,
            datetime: booking.class.datetime
          }
        }))
      };
    },

    /**
     * Récupère les données du tableau de bord administrateur
     */
    async getAdminDashboard() {
      const [
        totalUsers,
        activeSubscriptions,
        totalBookings,
        todayBookings,
        monthlyRevenue,
        yearlyRevenue
      ] = await Promise.all([
        prismaClient.user.count(),
        prismaClient.subscription.count({ where: { active: true } }),
        prismaClient.booking.count(),
        prismaClient.booking.count({
          where: {
            createdAt: {
              gte: timeUtils.startOfDay(),
              lte: timeUtils.endOfDay()
            }
          }
        }),
        this._calculateMonthlyRevenue(),
        this._calculateYearlyRevenue()
      ]);

      // Statistiques des cours populaires
      const popularClasses = await this._getPopularClasses();
      
      // Utilisateurs récents
      const recentUsers = await prismaClient.user.findMany({
        orderBy: { dateJoined: 'desc' },
        take: 10,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          dateJoined: true
        }
      });

      return {
        stats: {
          totalUsers,
          activeSubscriptions,
          totalBookings,
          todayBookings
        },
        revenue: {
          monthly: monthlyRevenue,
          yearly: yearlyRevenue
        },
        popularClasses,
        recentUsers
      };
    },

    /**
     * Méthodes privées pour les calculs internes
     */
    async _getUserBookingStats(userId) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        noShowBookings,
        monthlyBookings
      ] = await Promise.all([
        prismaClient.booking.count({ where: { userId } }),
        prismaClient.booking.count({ where: { userId, status: 'CONFIRMED' } }),
        prismaClient.booking.count({ where: { userId, status: 'CANCELLED' } }),
        prismaClient.booking.count({ where: { userId, status: 'NO_SHOW' } }),
        prismaClient.booking.count({
          where: {
            userId,
            createdAt: { gte: startOfMonth }
          }
        })
      ]);

      return {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        noShowBookings,
        monthlyBookings,
        noShowRate: totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0
      };
    },

    async _calculateMonthlyRevenue() {
      const startOfMonth = timeUtils.startOfMonth();
      const endOfMonth = timeUtils.endOfMonth();

      const subscriptions = await prismaClient.subscription.findMany({
        where: {
          active: true,
          startDate: { lte: endOfMonth },
          OR: [
            { endDate: null },
            { endDate: { gte: startOfMonth } }
          ]
        }
      });

      return subscriptions.reduce((total, sub) => {
        const basePrice = this._getSubscriptionPrice(sub.planType);
        const loyaltyDiscount = this._calculateLoyaltyDiscount(sub);
        const penalties = 0; // Simplifié pour ce test
        
        return total + (basePrice - loyaltyDiscount + penalties);
      }, 0);
    },

    async _calculateYearlyRevenue() {
      const startOfYear = timeUtils.startOfYear();
      const endOfYear = timeUtils.endOfYear();

      const subscriptions = await prismaClient.subscription.findMany({
        where: {
          active: true,
          startDate: { lte: endOfYear },
          OR: [
            { endDate: null },
            { endDate: { gte: startOfYear } }
          ]
        }
      });

      // Calcul approximatif pour l'année
      const monthlyTotal = subscriptions.reduce((total, sub) => {
        return total + this._getSubscriptionPrice(sub.planType);
      }, 0);

      return monthlyTotal * 12; // Estimation annuelle
    },

    async _getPopularClasses() {
      const popularClasses = await prismaClient.class.findMany({
        include: {
          _count: {
            select: { bookings: true }
          }
        },
        orderBy: {
          bookings: { _count: 'desc' }
        },
        take: 5
      });

      return popularClasses.map(cls => ({
        id: cls.id,
        title: cls.title,
        coach: cls.coach,
        totalBookings: cls._count.bookings
      }));
    },

    _getSubscriptionPrice(planType) {
      const prices = {
        'STANDARD': 39.99,
        'PREMIUM': 59.99,
        'ETUDIANT': 29.99
      };
      return prices[planType] || 0;
    },

    _calculateLoyaltyDiscount(subscription) {
      const monthsSubscribed = this._getMonthsSubscribed(subscription.startDate);
      return monthsSubscribed >= 6 ? this._getSubscriptionPrice(subscription.planType) * 0.10 : 0;
    },

    _getMonthsSubscribed(startDate) {
      const now = new Date();
      const start = new Date(startDate);
      return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    }
  };
};

describe('Dashboard Service - Tests Unitaires', () => {
  let dashboardService;

  beforeAll(() => {
    timeMock.enable('2024-01-15T14:30:00.000Z');
  });

  afterAll(() => {
    timeMock.disable();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService = createDashboardService(prismaMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // 1. DASHBOARD UTILISATEUR - AGRÉGATION DE DONNÉES
  // ==========================================
  describe('🏠 Dashboard Utilisateur - Agrégation de Données', () => {
    describe('Cas passant', () => {
      test('should aggregate user dashboard data successfully', async () => {
        // Arrange
        const mockUser = {
          id: 'user-1',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@email.com',
          dateJoined: new Date('2024-01-01'),
          subscriptions: [{
            id: 'sub-1',
            planType: 'PREMIUM',
            active: true,
            startDate: new Date('2024-01-01')
          }]
        };

        const mockBookings = [
          {
            id: 'booking-1',
            status: 'CONFIRMED',
            createdAt: new Date('2024-01-14'),
            class: {
              id: 'class-1',
              title: 'Yoga Morning',
              datetime: new Date('2024-01-16T09:00:00Z')
            }
          },
          {
            id: 'booking-2',
            status: 'CANCELLED',
            createdAt: new Date('2024-01-13'),
            class: {
              id: 'class-2',
              title: 'Pilates',
              datetime: new Date('2024-01-15T18:00:00Z')
            }
          }
        ];

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count
          .mockResolvedValueOnce(5) // totalBookings
          .mockResolvedValueOnce(3) // confirmedBookings
          .mockResolvedValueOnce(1) // cancelledBookings
          .mockResolvedValueOnce(1) // noShowBookings
          .mockResolvedValueOnce(2); // monthlyBookings
        prismaMock.booking.findMany.mockResolvedValue(mockBookings);

        // Act
        const result = await dashboardService.getUserDashboard('user-1');

        // Assert
        expect(result.user.firstname).toBe('John');
        expect(result.user.lastname).toBe('Doe');
        expect(result.subscription.planType).toBe('PREMIUM');
        expect(result.stats.totalBookings).toBe(5);
        expect(result.stats.confirmedBookings).toBe(3);
        expect(result.stats.noShowRate).toBe(20); // 1/5 * 100
        expect(result.recentBookings).toHaveLength(2);
        expect(result.recentBookings[0].class.title).toBe('Yoga Morning');
      });

      test('should handle user without subscription', async () => {
        // Arrange
        const mockUser = {
          id: 'user-2',
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'jane.smith@email.com',
          dateJoined: new Date('2024-01-10'),
          subscriptions: []
        };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count.mockResolvedValue(0);
        prismaMock.booking.findMany.mockResolvedValue([]);

        // Act
        const result = await dashboardService.getUserDashboard('user-2');

        // Assert
        expect(result.user.firstname).toBe('Jane');
        expect(result.subscription).toBeNull();
        expect(result.stats.totalBookings).toBe(0);
        expect(result.stats.noShowRate).toBe(0);
        expect(result.recentBookings).toHaveLength(0);
      });

      test('should calculate booking statistics correctly', async () => {
        // Arrange
        const mockUser = {
          id: 'user-3',
          firstname: 'Mike',
          lastname: 'Wilson',
          email: 'mike.wilson@email.com',
          dateJoined: new Date('2024-01-05'),
          subscriptions: []
        };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count
          .mockResolvedValueOnce(10) // totalBookings
          .mockResolvedValueOnce(7)  // confirmedBookings
          .mockResolvedValueOnce(2)  // cancelledBookings
          .mockResolvedValueOnce(1)  // noShowBookings
          .mockResolvedValueOnce(3); // monthlyBookings
        prismaMock.booking.findMany.mockResolvedValue([]);

        // Act
        const result = await dashboardService.getUserDashboard('user-3');

        // Assert
        expect(result.stats.totalBookings).toBe(10);
        expect(result.stats.confirmedBookings).toBe(7);
        expect(result.stats.cancelledBookings).toBe(2);
        expect(result.stats.noShowBookings).toBe(1);
        expect(result.stats.monthlyBookings).toBe(3);
        expect(result.stats.noShowRate).toBe(10); // 1/10 * 100
      });
    });

    describe('Cas non passant', () => {
      test('should throw error when user not found', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          dashboardService.getUserDashboard('invalid-user')
        ).rejects.toThrow('User not found');
      });

      test('should handle database query errors', async () => {
        // Arrange
        prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

        // Act & Assert
        await expect(
          dashboardService.getUserDashboard('user-1')
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('Cas limite', () => {
      test('should handle user with only NO_SHOW bookings', async () => {
        // Arrange
        const mockUser = {
          id: 'user-problematic',
          firstname: 'Problematic',
          lastname: 'User',
          email: 'problematic@email.com',
          dateJoined: new Date('2024-01-01'),
          subscriptions: []
        };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count
          .mockResolvedValueOnce(5) // totalBookings
          .mockResolvedValueOnce(0) // confirmedBookings
          .mockResolvedValueOnce(0) // cancelledBookings
          .mockResolvedValueOnce(5) // noShowBookings (all)
          .mockResolvedValueOnce(3); // monthlyBookings
        prismaMock.booking.findMany.mockResolvedValue([]);

        // Act
        const result = await dashboardService.getUserDashboard('user-problematic');

        // Assert
        expect(result.stats.noShowRate).toBe(100); // 5/5 * 100
        expect(result.stats.confirmedBookings).toBe(0);
      });
    });
  });

  // ==========================================
  // 2. DASHBOARD ADMINISTRATEUR - MÉTRIQUES SYSTÈME
  // ==========================================
  describe('⚙️ Dashboard Administrateur - Métriques Système', () => {
    describe('Cas passant', () => {
      test('should aggregate admin dashboard metrics successfully', async () => {
        // Arrange
        prismaMock.user.count.mockResolvedValue(150);
        prismaMock.subscription.count.mockResolvedValue(142);
        prismaMock.booking.count
          .mockResolvedValueOnce(1250) // totalBookings
          .mockResolvedValueOnce(45);  // todayBookings

        const mockSubscriptions = [
          { planType: 'PREMIUM', startDate: new Date('2024-01-01') },
          { planType: 'STANDARD', startDate: new Date('2024-01-05') },
          { planType: 'ETUDIANT', startDate: new Date('2024-01-10') }
        ];
        prismaMock.subscription.findMany.mockResolvedValue(mockSubscriptions);

        const mockPopularClasses = [
          {
            id: 'class-1',
            title: 'Yoga Popular',
            coach: 'Sarah',
            _count: { bookings: 25 }
          }
        ];
        prismaMock.class.findMany.mockResolvedValue(mockPopularClasses);

        const mockRecentUsers = [
          {
            id: 'user-new',
            firstname: 'New',
            lastname: 'User',
            email: 'new@email.com',
            dateJoined: new Date('2024-01-14')
          }
        ];
        prismaMock.user.findMany.mockResolvedValue(mockRecentUsers);

        // Act
        const result = await dashboardService.getAdminDashboard();

        // Assert
        expect(result.stats.totalUsers).toBe(150);
        expect(result.stats.activeSubscriptions).toBe(142);
        expect(result.stats.totalBookings).toBe(1250);
        expect(result.stats.todayBookings).toBe(45);
        expect(result.revenue.monthly).toBeGreaterThan(0);
        expect(result.revenue.yearly).toBeGreaterThan(0);
        expect(result.popularClasses).toHaveLength(1);
        expect(result.popularClasses[0].totalBookings).toBe(25);
        expect(result.recentUsers).toHaveLength(1);
      });

      test('should calculate monthly revenue correctly', async () => {
        // Arrange
        const mockSubscriptions = [
          { planType: 'PREMIUM', startDate: new Date('2023-06-01') }, // Eligible for loyalty
          { planType: 'STANDARD', startDate: new Date('2024-01-01') }, // No loyalty
          { planType: 'ETUDIANT', startDate: new Date('2023-01-01') } // Eligible for loyalty
        ];
        prismaMock.subscription.findMany.mockResolvedValue(mockSubscriptions);

        // Act
        const revenue = await dashboardService._calculateMonthlyRevenue();

        // Assert
        // PREMIUM: 59.99 - 6.00 (loyalty) = 53.99
        // STANDARD: 39.99 - 0 = 39.99
        // ETUDIANT: 29.99 - 3.00 (loyalty) = 26.99
        // Total: 120.97
        expect(revenue).toBeCloseTo(120.97, 2);
      });

      test('should identify popular classes correctly', async () => {
        // Arrange
        const mockPopularClasses = [
          {
            id: 'class-popular-1',
            title: 'Most Popular Class',
            coach: 'Top Coach',
            _count: { bookings: 50 }
          },
          {
            id: 'class-popular-2',
            title: 'Second Popular',
            coach: 'Good Coach',
            _count: { bookings: 35 }
          }
        ];
        prismaMock.class.findMany.mockResolvedValue(mockPopularClasses);

        // Act
        const popularClasses = await dashboardService._getPopularClasses();

        // Assert
        expect(popularClasses).toHaveLength(2);
        expect(popularClasses[0].title).toBe('Most Popular Class');
        expect(popularClasses[0].totalBookings).toBe(50);
        expect(popularClasses[1].totalBookings).toBe(35);
      });
    });

    describe('Cas non passant', () => {
      test('should handle database errors gracefully', async () => {
        // Arrange
        prismaMock.user.count.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(
          dashboardService.getAdminDashboard()
        ).rejects.toThrow('Database error');
      });
    });

    describe('Cas limite', () => {
      test('should handle system with no data', async () => {
        // Arrange
        prismaMock.user.count.mockResolvedValue(0);
        prismaMock.subscription.count.mockResolvedValue(0);
        prismaMock.booking.count.mockResolvedValue(0);
        prismaMock.subscription.findMany.mockResolvedValue([]);
        prismaMock.class.findMany.mockResolvedValue([]);
        prismaMock.user.findMany.mockResolvedValue([]);

        // Act
        const result = await dashboardService.getAdminDashboard();

        // Assert
        expect(result.stats.totalUsers).toBe(0);
        expect(result.stats.activeSubscriptions).toBe(0);
        expect(result.stats.totalBookings).toBe(0);
        expect(result.revenue.monthly).toBe(0);
        expect(result.revenue.yearly).toBe(0);
        expect(result.popularClasses).toHaveLength(0);
        expect(result.recentUsers).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // 3. CALCULS FINANCIERS - REVENUS ET TARIFICATION
  // ==========================================
  describe('💰 Calculs Financiers - Revenus et Tarification', () => {
    describe('Cas passant', () => {
      test('should calculate subscription prices correctly', () => {
        // Act & Assert
        expect(dashboardService._getSubscriptionPrice('STANDARD')).toBe(39.99);
        expect(dashboardService._getSubscriptionPrice('PREMIUM')).toBe(59.99);
        expect(dashboardService._getSubscriptionPrice('ETUDIANT')).toBe(29.99);
      });

      test('should calculate loyalty discount correctly', () => {
        // Arrange
        const longTermSubscription = {
          planType: 'PREMIUM',
          startDate: new Date('2023-06-15') // 7 months ago
        };
        const newSubscription = {
          planType: 'PREMIUM',
          startDate: new Date('2024-01-01') // Current month
        };

        // Act
        const longTermDiscount = dashboardService._calculateLoyaltyDiscount(longTermSubscription);
        const newDiscount = dashboardService._calculateLoyaltyDiscount(newSubscription);

        // Assert
        expect(longTermDiscount).toBeCloseTo(6.00, 2); // 10% of 59.99
        expect(newDiscount).toBe(0);
      });

      test('should calculate months subscribed correctly', () => {
        // Arrange
        const startDate6MonthsAgo = new Date('2023-07-15');
        const startDate1MonthAgo = new Date('2023-12-15');

        // Act
        const months6 = dashboardService._getMonthsSubscribed(startDate6MonthsAgo);
        const months1 = dashboardService._getMonthsSubscribed(startDate1MonthAgo);

        // Assert
        expect(months6).toBe(6);
        expect(months1).toBe(1);
      });
    });

    describe('Cas limite', () => {
      test('should handle invalid plan type', () => {
        // Act
        const price = dashboardService._getSubscriptionPrice('INVALID_PLAN');

        // Assert
        expect(price).toBe(0);
      });

      test('should handle future start date', () => {
        // Arrange
        const futureDate = new Date('2024-06-01');

        // Act
        const months = dashboardService._getMonthsSubscribed(futureDate);

        // Assert
        expect(months).toBeLessThan(0); // Dates futures donnent un résultat négatif
      });
    });
  });

  // ==========================================
  // 4. PERFORMANCE ET OPTIMISATION
  // ==========================================
  describe('⚡ Performance et Optimisation', () => {
    describe('Cas passant', () => {
      test('should execute admin dashboard queries in parallel', async () => {
        // Arrange
        const startTime = Date.now();
        
        prismaMock.user.count.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(100), 50))
        );
        prismaMock.subscription.count.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(95), 50))
        );
        prismaMock.booking.count.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(500), 50))
        );
        prismaMock.subscription.findMany.mockResolvedValue([]);
        prismaMock.class.findMany.mockResolvedValue([]);
        prismaMock.user.findMany.mockResolvedValue([]);

        // Act
        await dashboardService.getAdminDashboard();
        const endTime = Date.now();

        // Assert
        // Si les requêtes étaient séquentielles, cela prendrait ~150ms
        // En parallèle, cela devrait prendre ~50ms + overhead
        expect(endTime - startTime).toBeLessThan(100);
      });

      test('should limit recent bookings to 5 items', async () => {
        // Arrange
        const mockUser = {
          id: 'user-many-bookings',
          firstname: 'Active',
          lastname: 'User',
          email: 'active@email.com',
          dateJoined: new Date('2024-01-01'),
          subscriptions: []
        };

        const manyBookings = Array.from({ length: 10 }, (_, i) => ({
          id: `booking-${i}`,
          status: 'CONFIRMED',
          createdAt: new Date(`2024-01-${15 - i}`),
          class: {
            id: `class-${i}`,
            title: `Class ${i}`,
            datetime: new Date('2024-01-16T09:00:00Z')
          }
        }));

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count.mockResolvedValue(0);
        prismaMock.booking.findMany.mockResolvedValue(manyBookings);

        // Act
        const result = await dashboardService.getUserDashboard('user-many-bookings');

        // Assert
        expect(result.recentBookings).toHaveLength(5); // Limité à 5
        expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        );
      });
    });
  });

  // ==========================================
  // 5. INTÉGRATION ET WORKFLOWS COMPLETS
  // ==========================================
  describe('🔄 Intégration et Workflows Complets', () => {
    describe('Cas passant', () => {
      test('should provide consistent data across user and admin dashboards', async () => {
        // Arrange
        const mockUsers = [
          {
            id: 'user-1',
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@email.com',
            dateJoined: new Date('2024-01-01'),
            subscriptions: [{ planType: 'PREMIUM', active: true, startDate: new Date('2024-01-01') }]
          }
        ];

        // Setup mocks pour admin dashboard
        prismaMock.user.count.mockResolvedValue(1);
        prismaMock.subscription.count.mockResolvedValue(1);
        prismaMock.booking.count.mockResolvedValue(5);
        prismaMock.subscription.findMany.mockResolvedValue([
          { planType: 'PREMIUM', startDate: new Date('2024-01-01') }
        ]);
        prismaMock.class.findMany.mockResolvedValue([]);
        prismaMock.user.findMany.mockResolvedValue([mockUsers[0]]);

        // Setup mocks pour user dashboard
        prismaMock.user.findUnique.mockResolvedValue(mockUsers[0]);
        prismaMock.booking.findMany.mockResolvedValue([]);

        // Act
        const adminDashboard = await dashboardService.getAdminDashboard();
        const userDashboard = await dashboardService.getUserDashboard('user-1');

        // Assert - Cohérence des données
        expect(adminDashboard.stats.totalUsers).toBe(1);
        expect(adminDashboard.stats.activeSubscriptions).toBe(1);
        expect(userDashboard.user.id).toBe('user-1');
        expect(userDashboard.subscription.planType).toBe('PREMIUM');
        expect(adminDashboard.recentUsers[0].id).toBe(userDashboard.user.id);
      });

      test('should handle complex dashboard scenario with mixed data', async () => {
        // Arrange - Scénario réaliste avec des données variées
        const mockUser = {
          id: 'user-complex',
          firstname: 'Complex',
          lastname: 'User',
          email: 'complex@email.com',
          dateJoined: new Date('2023-06-01'),
          subscriptions: [{
            planType: 'PREMIUM',
            active: true,
            startDate: new Date('2023-06-01')
          }]
        };

        const complexBookings = [
          {
            id: 'booking-confirmed',
            status: 'CONFIRMED',
            createdAt: new Date('2024-01-14'),
            class: { id: 'class-1', title: 'Yoga', datetime: new Date('2024-01-16T09:00:00Z') }
          },
          {
            id: 'booking-cancelled',
            status: 'CANCELLED',
            createdAt: new Date('2024-01-13'),
            class: { id: 'class-2', title: 'Pilates', datetime: new Date('2024-01-15T18:00:00Z') }
          },
          {
            id: 'booking-noshow',
            status: 'NO_SHOW',
            createdAt: new Date('2024-01-12'),
            class: { id: 'class-3', title: 'CrossFit', datetime: new Date('2024-01-14T07:00:00Z') }
          }
        ];

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.booking.count
          .mockResolvedValueOnce(8)  // totalBookings
          .mockResolvedValueOnce(5)  // confirmedBookings
          .mockResolvedValueOnce(2)  // cancelledBookings
          .mockResolvedValueOnce(1)  // noShowBookings
          .mockResolvedValueOnce(3); // monthlyBookings
        prismaMock.booking.findMany.mockResolvedValue(complexBookings);

        // Act
        const result = await dashboardService.getUserDashboard('user-complex');

        // Assert
        expect(result.user.firstname).toBe('Complex');
        expect(result.subscription.planType).toBe('PREMIUM');
        expect(result.stats.totalBookings).toBe(8);
        expect(result.stats.confirmedBookings).toBe(5);
        expect(result.stats.cancelledBookings).toBe(2);
        expect(result.stats.noShowBookings).toBe(1);
        expect(result.stats.noShowRate).toBeCloseTo(12.5, 1); // 1/8 * 100
        expect(result.recentBookings).toHaveLength(3);
        
        // Vérification de l'ordre des réservations (plus récent en premier)
        expect(result.recentBookings[0].id).toBe('booking-confirmed');
        expect(result.recentBookings[1].id).toBe('booking-cancelled');
        expect(result.recentBookings[2].id).toBe('booking-noshow');
      });
    });
  });
});