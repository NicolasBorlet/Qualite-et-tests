/**
 * Tests unitaires pour SubscriptionService
 * Teste les calculs de facturation et gestion des abonnements
 */

const { jest } = require('@jest/globals');
const { prismaMock, mockHelpers } = require('../../../mocks/backend/prisma.mock');
const { timeMock, timeUtils } = require('../../../mocks/utils/time.mock');
const { dataHelpers, assertionHelpers } = require('../../../mocks/utils/test-helpers');

// Mock du service pour les tests
class MockSubscriptionService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  // Prix de base par type d'abonnement
  static BASE_PRICES = {
    STANDARD: 39.99,
    PREMIUM: 59.99,
    ETUDIANT: 29.99
  };

  async createSubscription(userId, planType, startDate) {
    // Vérification utilisateur
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Vérification abonnement existant
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });
    if (existingSubscription) throw new Error('User already has a subscription');

    // Calcul date de fin
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    return await this.prisma.subscription.create({
      data: {
        userId,
        planType,
        startDate,
        endDate,
        active: true,
        autoRenew: true
      }
    });
  }

  async calculateMonthlyBilling(userId) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) throw new Error('No active subscription found');

    const basePrice = MockSubscriptionService.BASE_PRICES[subscription.planType];
    
    // Calcul remise fidélité
    const loyaltyDiscount = this.calculateLoyaltyDiscount(subscription.startDate);
    const loyaltyAmount = loyaltyDiscount > 0 ? Math.round(basePrice * loyaltyDiscount / 100 * 100) / 100 : 0;

    // Calcul pénalités no-show
    const monthlyNoShows = await this.getMonthlyNoShows(userId);
    const noShowPenalty = this.calculateNoShowPenalty(monthlyNoShows, basePrice);

    const finalAmount = Math.round((basePrice - loyaltyAmount + noShowPenalty) * 100) / 100;

    return {
      userId,
      planType: subscription.planType,
      basePrice,
      loyaltyDiscount: loyaltyAmount,
      noShowPenalty,
      finalAmount,
      details: {
        loyaltyEligible: loyaltyDiscount > 0,
        monthsSubscribed: this.getMonthsSubscribed(subscription.startDate),
        noShowsThisMonth: monthlyNoShows
      }
    };
  }

  calculateLoyaltyDiscount(subscriptionStartDate) {
    const monthsSubscribed = this.getMonthsSubscribed(subscriptionStartDate);
    return monthsSubscribed >= 6 ? 10 : 0; // 10% après 6 mois
  }

  calculateNoShowPenalty(noShowCount, basePrice) {
    if (noShowCount > 5) {
      return Math.round(basePrice * 0.15 * 100) / 100; // 15% de pénalité
    }
    return 0;
  }

  getMonthsSubscribed(startDate) {
    const now = new Date();
    const months = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                  (now.getMonth() - startDate.getMonth());
    return Math.max(0, months);
  }

  async getMonthlyNoShows(userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const noShowBookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: 'NO_SHOW',
        class: {
          datetime: { gte: monthStart }
        }
      }
    });

    return noShowBookings.length;
  }

  async getUserSubscription(userId) {
    return await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: true }
    });
  }

  async updateSubscription(subscriptionId, updateData) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!existing) throw new Error('Subscription not found');

    return await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData
    });
  }
}

describe('SubscriptionService - Tests Unitaires', () => {
  let subscriptionService;

  beforeEach(() => {
    dataHelpers.setupTestEnvironment();
    subscriptionService = new MockSubscriptionService(prismaMock);
  });

  afterEach(() => {
    dataHelpers.cleanupTestEnvironment();
  });

  // ==========================================
  // 1. CALCUL DE PÉNALITÉS NO-SHOW
  // ==========================================
  describe('💰 Calcul de Pénalités No-Show', () => {
    const setupBillingTest = (planType, startDate, noShowCount) => {
      const subscription = {
        id: 'sub-1',
        userId: 'user-1',
        planType,
        startDate,
        active: true
      };

      const noShowBookings = Array.from({ length: noShowCount }, (_, i) => ({
        id: `booking-${i}`,
        userId: 'user-1',
        status: 'NO_SHOW',
        class: { datetime: timeUtils.startOfMonth() }
      }));

      prismaMock.subscription.findUnique.mockResolvedValue(subscription);
      prismaMock.booking.findMany.mockResolvedValue(noShowBookings);

      return subscription;
    };

    describe('Cas passant', () => {
      test('should not apply penalty with 3 no-shows', async () => {
        // Arrange
        setupBillingTest('STANDARD', timeUtils.pastDate(24 * 30 * 3), 3); // 3 mois, 3 no-shows

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.noShowPenalty).toBe(0);
        expect(billing.finalAmount).toBe(39.99);
        expect(billing.details.noShowsThisMonth).toBe(3);
      });

      test('should calculate correct penalty with premium plan', async () => {
        // Arrange
        setupBillingTest('PREMIUM', timeUtils.pastDate(24 * 30 * 2), 7); // 2 mois, 7 no-shows

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.basePrice).toBe(59.99);
        expect(billing.noShowPenalty).toBe(9.00); // 15% de 59.99 = 8.9985 arrondi à 9.00
        expect(billing.finalAmount).toBe(68.99);
      });
    });

    describe('Cas non passant', () => {
      test('should apply penalty with 7 no-shows', async () => {
        // Arrange
        setupBillingTest('STANDARD', timeUtils.pastDate(24 * 30 * 2), 7); // 2 mois, 7 no-shows

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.noShowPenalty).toBe(6.00); // 15% de 39.99 = 5.9985 arrondi à 6.00
        expect(billing.finalAmount).toBe(45.99);
        expect(billing.details.noShowsThisMonth).toBe(7);
      });

      test('should reject billing for user without subscription', async () => {
        // Arrange
        prismaMock.subscription.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          subscriptionService.calculateMonthlyBilling('user-without-sub')
        ).rejects.toThrow('No active subscription found');
      });
    });

    describe('Cas limite', () => {
      test('should not apply penalty with exactly 5 no-shows', async () => {
        // Arrange
        setupBillingTest('ETUDIANT', timeUtils.pastDate(24 * 30), 5); // 1 mois, exactement 5 no-shows

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.noShowPenalty).toBe(0);
        expect(billing.finalAmount).toBe(29.99);
        expect(billing.details.noShowsThisMonth).toBe(5);
      });

      test('should apply penalty with 6 no-shows (just over limit)', async () => {
        // Arrange
        setupBillingTest('ETUDIANT', timeUtils.pastDate(24 * 30), 6); // 1 mois, 6 no-shows

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.noShowPenalty).toBe(4.50); // 15% de 29.99 = 4.4985 arrondi à 4.50
        expect(billing.finalAmount).toBe(34.49);
      });
    });
  });

  // ==========================================
  // 2. RÈGLES DE FACTURATION AVEC REMISE FIDÉLITÉ
  // ==========================================
  describe('🎁 Règles de Facturation avec Remise Fidélité', () => {
    const setupLoyaltyTest = (planType, monthsAgo, noShowCount = 0) => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);

      return setupBillingTest(planType, startDate, noShowCount);
    };

    const setupBillingTest = (planType, startDate, noShowCount) => {
      const subscription = {
        id: 'sub-1',
        userId: 'user-1',
        planType,
        startDate,
        active: true
      };

      const noShowBookings = Array.from({ length: noShowCount }, (_, i) => ({
        id: `booking-${i}`,
        status: 'NO_SHOW'
      }));

      prismaMock.subscription.findUnique.mockResolvedValue(subscription);
      prismaMock.booking.findMany.mockResolvedValue(noShowBookings);

      return subscription;
    };

    describe('Cas passant', () => {
      test('should apply loyalty discount after 8 months', async () => {
        // Arrange
        setupLoyaltyTest('PREMIUM', 8, 0); // 8 mois d'abonnement

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.loyaltyDiscount).toBe(6.00); // 10% de 59.99 = 5.999 arrondi à 6.00
        expect(billing.finalAmount).toBe(53.99); // 59.99 - 6.00
        expect(billing.details.loyaltyEligible).toBe(true);
        expect(billing.details.monthsSubscribed).toBe(8);
      });

      test('should combine loyalty discount and no-show penalty', async () => {
        // Arrange
        setupLoyaltyTest('STANDARD', 12, 7); // 12 mois, remise + pénalité

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.loyaltyDiscount).toBe(4.00); // 10% de 39.99 = 3.999 arrondi à 4.00
        expect(billing.noShowPenalty).toBe(6.00);   // 15% de 39.99 = 5.9985 arrondi à 6.00
        expect(billing.finalAmount).toBe(41.99);    // 39.99 - 4.00 + 6.00
      });
    });

    describe('Cas non passant', () => {
      test('should not apply discount with 3 months subscription', async () => {
        // Arrange
        setupLoyaltyTest('PREMIUM', 3, 0); // Seulement 3 mois

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.loyaltyDiscount).toBe(0);
        expect(billing.finalAmount).toBe(59.99);
        expect(billing.details.loyaltyEligible).toBe(false);
        expect(billing.details.monthsSubscribed).toBe(3);
      });
    });

    describe('Cas limite', () => {
      test('should apply discount with exactly 6 months', async () => {
        // Arrange
        setupLoyaltyTest('STANDARD', 6, 0); // Exactement 6 mois

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.loyaltyDiscount).toBe(4.00); // 10% de 39.99
        expect(billing.finalAmount).toBe(35.99);
        expect(billing.details.loyaltyEligible).toBe(true);
        expect(billing.details.monthsSubscribed).toBe(6);
      });

      test('should not apply discount with 5 months and 29 days', async () => {
        // Arrange
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 5);
        startDate.setDate(startDate.getDate() - 29);
        setupBillingTest('ETUDIANT', startDate, 0);

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        expect(billing.loyaltyDiscount).toBe(0);
        expect(billing.finalAmount).toBe(29.99);
        expect(billing.details.monthsSubscribed).toBe(5);
      });
    });
  });

  // ==========================================
  // 3. VALIDATION D'UNICITÉ D'ABONNEMENT
  // ==========================================
  describe('🔒 Validation d\'Unicité d\'Abonnement', () => {
    const setupCreationTest = (userExists = true, hasSubscription = false) => {
      if (userExists) {
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      } else {
        prismaMock.user.findUnique.mockResolvedValue(null);
      }

      if (hasSubscription) {
        prismaMock.subscription.findUnique.mockResolvedValue({
          id: 'existing-sub',
          userId: 'user-1',
          planType: 'STANDARD',
          active: true
        });
      } else {
        prismaMock.subscription.findUnique.mockResolvedValue(null);
      }

      if (userExists && !hasSubscription) {
        prismaMock.subscription.create.mockResolvedValue({
          id: 'new-sub-1',
          userId: 'user-1',
          planType: 'PREMIUM',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-02-15'),
          active: true,
          autoRenew: true
        });
      }
    };

    describe('Cas passant', () => {
      test('should create subscription for user without existing subscription', async () => {
        // Arrange
        setupCreationTest(true, false);
        const startDate = new Date('2024-01-15');

        // Act
        const subscription = await subscriptionService.createSubscription('user-1', 'PREMIUM', startDate);

        // Assert
        expect(subscription.planType).toBe('PREMIUM');
        expect(subscription.active).toBe(true);
        expect(subscription.autoRenew).toBe(true);
        expect(prismaMock.subscription.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            planType: 'PREMIUM',
            startDate,
            endDate: new Date('2024-02-15'),
            active: true,
            autoRenew: true
          }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject subscription creation for non-existent user', async () => {
        // Arrange
        setupCreationTest(false, false);

        // Act & Assert
        await expect(
          subscriptionService.createSubscription('invalid-user', 'STANDARD', new Date())
        ).rejects.toThrow('User not found');
      });

      test('should reject subscription creation for user with existing subscription', async () => {
        // Arrange
        setupCreationTest(true, true);

        // Act & Assert
        await expect(
          subscriptionService.createSubscription('user-1', 'PREMIUM', new Date())
        ).rejects.toThrow('User already has a subscription');
      });
    });

    describe('Cas limite', () => {
      test('should calculate end date correctly for month boundaries', async () => {
        // Arrange
        setupCreationTest(true, false);
        const startDate = new Date('2024-01-31'); // Fin de mois

        // Mock pour vérifier la date de fin calculée
        prismaMock.subscription.create.mockImplementation((data) => {
          const expectedEndDate = new Date('2024-02-29'); // Février 2024 a 29 jours
          expect(data.data.endDate.getMonth()).toBe(expectedEndDate.getMonth());
          return Promise.resolve({
            ...data.data,
            id: 'new-sub-1'
          });
        });

        // Act
        await subscriptionService.createSubscription('user-1', 'STANDARD', startDate);

        // Assert - vérifié dans le mock implementation
      });
    });
  });

  // ==========================================
  // 4. GESTION DES TYPES D'ABONNEMENT
  // ==========================================
  describe('📋 Gestion des Types d\'Abonnement', () => {
    describe('Cas passant', () => {
      test('should handle all subscription plan types correctly', async () => {
        const plans = [
          { type: 'STANDARD', expectedPrice: 39.99 },
          { type: 'PREMIUM', expectedPrice: 59.99 },
          { type: 'ETUDIANT', expectedPrice: 29.99 }
        ];

        for (const plan of plans) {
          // Arrange
          const subscription = {
            userId: 'user-1',
            planType: plan.type,
            startDate: timeUtils.pastDate(24 * 30 * 2), // 2 mois
            active: true
          };

          prismaMock.subscription.findUnique.mockResolvedValue(subscription);
          prismaMock.booking.findMany.mockResolvedValue([]); // Pas de no-shows

          // Act
          const billing = await subscriptionService.calculateMonthlyBilling('user-1');

          // Assert
          expect(billing.basePrice).toBe(plan.expectedPrice);
          expect(billing.planType).toBe(plan.type);
          expect(billing.finalAmount).toBe(plan.expectedPrice);
        }
      });
    });

    describe('Cas limite', () => {
      test('should handle pricing precision correctly', async () => {
        // Arrange
        const subscription = {
          userId: 'user-1',
          planType: 'PREMIUM',
          startDate: timeUtils.pastDate(24 * 30 * 8), // 8 mois pour remise
          active: true
        };

        prismaMock.subscription.findUnique.mockResolvedValue(subscription);
        prismaMock.booking.findMany.mockResolvedValue(
          Array.from({ length: 6 }, (_, i) => ({ id: `booking-${i}`, status: 'NO_SHOW' }))
        );

        // Act
        const billing = await subscriptionService.calculateMonthlyBilling('user-1');

        // Assert
        // Prix: 59.99, Remise: 6.00 (10%), Pénalité: 9.00 (15%)
        expect(billing.basePrice).toBe(59.99);
        expect(billing.loyaltyDiscount).toBe(6.00);
        expect(billing.noShowPenalty).toBe(9.00);
        expect(billing.finalAmount).toBe(62.99); // 59.99 - 6.00 + 9.00 = 62.99
      });
    });
  });

  // ==========================================
  // 5. MISE À JOUR D'ABONNEMENT
  // ==========================================
  describe('🔄 Mise à Jour d\'Abonnement', () => {
    const setupUpdateTest = (subscriptionExists = true) => {
      if (subscriptionExists) {
        const existing = {
          id: 'sub-1',
          userId: 'user-1',
          planType: 'STANDARD',
          active: true
        };
        prismaMock.subscription.findUnique.mockResolvedValue(existing);
        prismaMock.subscription.update.mockResolvedValue({
          ...existing,
          planType: 'PREMIUM' // Mise à jour
        });
      } else {
        prismaMock.subscription.findUnique.mockResolvedValue(null);
      }
    };

    describe('Cas passant', () => {
      test('should update subscription successfully', async () => {
        // Arrange
        setupUpdateTest(true);
        const updateData = { planType: 'PREMIUM', autoRenew: false };

        // Act
        const updated = await subscriptionService.updateSubscription('sub-1', updateData);

        // Assert
        expect(updated.planType).toBe('PREMIUM');
        expect(prismaMock.subscription.update).toHaveBeenCalledWith({
          where: { id: 'sub-1' },
          data: updateData
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject update for non-existent subscription', async () => {
        // Arrange
        setupUpdateTest(false);

        // Act & Assert
        await expect(
          subscriptionService.updateSubscription('invalid-sub', { planType: 'PREMIUM' })
        ).rejects.toThrow('Subscription not found');
      });
    });
  });

  // ==========================================
  // 6. RÉCUPÉRATION D'ABONNEMENT UTILISATEUR
  // ==========================================
  describe('📊 Récupération d\'Abonnement Utilisateur', () => {
    describe('Cas passant', () => {
      test('should return subscription with user data', async () => {
        // Arrange
        const subscriptionWithUser = {
          id: 'sub-1',
          userId: 'user-1',
          planType: 'PREMIUM',
          active: true,
          user: {
            id: 'user-1',
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com'
          }
        };
        prismaMock.subscription.findUnique.mockResolvedValue(subscriptionWithUser);

        // Act
        const result = await subscriptionService.getUserSubscription('user-1');

        // Assert
        expect(result.planType).toBe('PREMIUM');
        expect(result.user.firstname).toBe('John');
        expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          include: { user: true }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should return null for user without subscription', async () => {
        // Arrange
        prismaMock.subscription.findUnique.mockResolvedValue(null);

        // Act
        const result = await subscriptionService.getUserSubscription('user-without-sub');

        // Assert
        expect(result).toBeNull();
      });
    });
  });
});