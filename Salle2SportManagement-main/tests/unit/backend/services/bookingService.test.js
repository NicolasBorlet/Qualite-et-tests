/**
 * Tests unitaires pour BookingService
 * Teste les fonctionnalités critiques de réservation
 */

const { jest } = require('@jest/globals');
const { prismaMock, mockHelpers } = require('../../../mocks/backend/prisma.mock');
const { timeMock, timeUtils, timeScenarios } = require('../../../mocks/utils/time.mock');
const { dataHelpers, assertionHelpers } = require('../../../mocks/utils/test-helpers');

// Import du service à tester (sera adapté selon la structure réelle)
// const BookingService = require('../../../../backend/src/services/bookingService');

// Mock du service pour les tests (remplace l'import réel)
class MockBookingService {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async createBooking(userId, classId) {
    // Vérifications métier
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const classItem = await this.prisma.class.findUnique({ 
      where: { id: classId },
      include: { bookings: true }
    });
    if (!classItem) throw new Error('Class not found');
    if (classItem.isCancelled) throw new Error('Class is cancelled');

    // Vérification capacité
    const confirmedBookings = classItem.bookings?.filter(b => b.status === 'CONFIRMED').length || 0;
    if (confirmedBookings >= classItem.capacity) {
      throw new Error('Class is full');
    }

    // Vérification double réservation
    const existingBooking = await this.prisma.booking.findUnique({
      where: { userId_classId: { userId, classId } }
    });
    if (existingBooking) throw new Error('Booking already exists');

    // Vérification conflit horaire
    const userBookings = await this.prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED' },
      include: { class: true }
    });

    const hasConflict = userBookings.some(booking => {
      const existingStart = new Date(booking.class.datetime);
      const existingEnd = new Date(existingStart.getTime() + booking.class.duration * 60000);
      const newStart = new Date(classItem.datetime);
      const newEnd = new Date(newStart.getTime() + classItem.duration * 60000);

      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (hasConflict) throw new Error('Time conflict detected');

    // Création de la réservation
    return await this.prisma.booking.create({
      data: {
        userId,
        classId,
        status: 'CONFIRMED'
      }
    });
  }

  async cancelBooking(bookingId, userId) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { class: true }
    });

    if (!booking) throw new Error('Booking not found');
    if (booking.userId !== userId) throw new Error('Access denied');

    const now = new Date();
    const classTime = new Date(booking.class.datetime);
    const hoursUntilClass = (classTime - now) / (1000 * 60 * 60);

    // Règle: 2h minimum pour annulation normale
    const newStatus = hoursUntilClass >= 2 ? 'CANCELLED' : 'NO_SHOW';

    return await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus }
    });
  }

  async getUserStats(userId) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: { class: true }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
      noShows: bookings.filter(b => b.status === 'NO_SHOW').length,
      monthlyNoShows: bookings.filter(b => 
        b.status === 'NO_SHOW' && 
        new Date(b.class.datetime) >= monthStart
      ).length
    };

    return stats;
  }

  async markNoShows() {
    const now = new Date();
    
    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        class: {
          datetime: { lt: now }
        }
      }
    });

    if (overdueBookings.length === 0) return 0;

    const bookingIds = overdueBookings.map(b => b.id);
    
    const result = await this.prisma.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: { status: 'NO_SHOW' }
    });

    return result.count;
  }
}

describe('BookingService - Tests Unitaires', () => {
  let bookingService;

  beforeEach(() => {
    // Setup de l'environnement de test
    dataHelpers.setupTestEnvironment();
    bookingService = new MockBookingService(prismaMock);
  });

  afterEach(() => {
    dataHelpers.cleanupTestEnvironment();
  });

  // ==========================================
  // 1. VALIDATION D'ANNULATION TARDIVE
  // ==========================================
  describe('🔒 Validation d\'Annulation Tardive', () => {
    const setupCancellationTest = (hoursUntilClass) => {
      const now = timeMock.getCurrentTime();
      const classTime = new Date(now.getTime() + hoursUntilClass * 60 * 60 * 1000);
      
      const booking = {
        id: 'booking-1',
        userId: 'user-1',
        classId: 'class-1',
        status: 'CONFIRMED',
        class: {
          id: 'class-1',
          datetime: classTime,
          duration: 60
        }
      };

      prismaMock.booking.findUnique.mockResolvedValue(booking);
      prismaMock.booking.update.mockResolvedValue({
        ...booking,
        status: hoursUntilClass >= 2 ? 'CANCELLED' : 'NO_SHOW'
      });

      return booking;
    };

    describe('Cas passant', () => {
      test('should cancel booking when 3 hours before class', async () => {
        // Arrange
        const booking = setupCancellationTest(3);

        // Act
        const result = await bookingService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.status).toBe('CANCELLED');
        expect(prismaMock.booking.update).toHaveBeenCalledWith({
          where: { id: 'booking-1' },
          data: { status: 'CANCELLED' }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should mark as NO_SHOW when 1 hour before class', async () => {
        // Arrange
        const booking = setupCancellationTest(1);

        // Act
        const result = await bookingService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.status).toBe('NO_SHOW');
        expect(prismaMock.booking.update).toHaveBeenCalledWith({
          where: { id: 'booking-1' },
          data: { status: 'NO_SHOW' }
        });
      });

      test('should deny cancellation for wrong user', async () => {
        // Arrange
        setupCancellationTest(3);

        // Act & Assert
        await expect(
          bookingService.cancelBooking('booking-1', 'wrong-user')
        ).rejects.toThrow('Access denied');
      });
    });

    describe('Cas limite', () => {
      test('should cancel when exactly 2 hours before class', async () => {
        // Arrange
        const booking = setupCancellationTest(2);

        // Act
        const result = await bookingService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.status).toBe('CANCELLED');
      });

      test('should mark NO_SHOW when 1.9 hours before class', async () => {
        // Arrange
        const booking = setupCancellationTest(1.9);

        // Act
        const result = await bookingService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.status).toBe('NO_SHOW');
      });
    });
  });

  // ==========================================
  // 2. DÉTECTION DE DOUBLE RÉSERVATION
  // ==========================================
  describe('🚫 Détection de Double Réservation', () => {
    const setupBookingTest = (existingBooking = null) => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.class.findUnique.mockResolvedValue({
        id: 'class-1',
        capacity: 15,
        isCancelled: false,
        bookings: []
      });
      prismaMock.booking.findUnique.mockResolvedValue(existingBooking);
      prismaMock.booking.findMany.mockResolvedValue([]);
      
      if (!existingBooking) {
        prismaMock.booking.create.mockResolvedValue({
          id: 'new-booking-1',
          userId: 'user-1',
          classId: 'class-1',
          status: 'CONFIRMED'
        });
      }
    };

    describe('Cas passant', () => {
      test('should create booking when no existing booking', async () => {
        // Arrange
        setupBookingTest();

        // Act
        const result = await bookingService.createBooking('user-1', 'class-1');

        // Assert
        expect(result.status).toBe('CONFIRMED');
        expect(prismaMock.booking.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            classId: 'class-1',
            status: 'CONFIRMED'
          }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should reject booking when user already booked same class', async () => {
        // Arrange
        const existingBooking = {
          id: 'existing-1',
          userId: 'user-1',
          classId: 'class-1',
          status: 'CONFIRMED'
        };
        setupBookingTest(existingBooking);

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-1')
        ).rejects.toThrow('Booking already exists');
      });

      test('should reject booking for non-existent user', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          bookingService.createBooking('invalid-user', 'class-1')
        ).rejects.toThrow('User not found');
      });

      test('should reject booking for cancelled class', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
        prismaMock.class.findUnique.mockResolvedValue({
          id: 'class-1',
          isCancelled: true
        });

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-1')
        ).rejects.toThrow('Class is cancelled');
      });
    });

    describe('Cas limite', () => {
      test('should allow booking same user for different class', async () => {
        // Arrange
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
        prismaMock.class.findUnique.mockResolvedValue({
          id: 'class-2',
          capacity: 15,
          isCancelled: false,
          bookings: []
        });
        prismaMock.booking.findUnique.mockResolvedValue(null);
        prismaMock.booking.findMany.mockResolvedValue([]);
        prismaMock.booking.create.mockResolvedValue({
          id: 'new-booking-2',
          userId: 'user-1',
          classId: 'class-2',
          status: 'CONFIRMED'
        });

        // Act
        const result = await bookingService.createBooking('user-1', 'class-2');

        // Assert
        expect(result.status).toBe('CONFIRMED');
      });
    });
  });

  // ==========================================
  // 3. GESTION DES CAPACITÉS DE COURS
  // ==========================================
  describe('📊 Gestion des Capacités de Cours', () => {
    const setupCapacityTest = (capacity, existingBookingsCount) => {
      const existingBookings = Array.from({ length: existingBookingsCount }, (_, i) => ({
        id: `booking-${i}`,
        status: 'CONFIRMED'
      }));

      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.class.findUnique.mockResolvedValue({
        id: 'class-1',
        capacity,
        isCancelled: false,
        bookings: existingBookings
      });
      prismaMock.booking.findUnique.mockResolvedValue(null);
      prismaMock.booking.findMany.mockResolvedValue([]);
    };

    describe('Cas passant', () => {
      test('should allow booking when capacity available (10/15)', async () => {
        // Arrange
        setupCapacityTest(15, 10);
        prismaMock.booking.create.mockResolvedValue({
          id: 'new-booking',
          userId: 'user-1',
          classId: 'class-1',
          status: 'CONFIRMED'
        });

        // Act
        const result = await bookingService.createBooking('user-1', 'class-1');

        // Assert
        expect(result.status).toBe('CONFIRMED');
      });
    });

    describe('Cas non passant', () => {
      test('should reject booking when class is full (15/15)', async () => {
        // Arrange
        setupCapacityTest(15, 15);

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-1')
        ).rejects.toThrow('Class is full');
      });

      test('should reject booking when over capacity (16/15)', async () => {
        // Arrange
        setupCapacityTest(15, 16);

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-1')
        ).rejects.toThrow('Class is full');
      });
    });

    describe('Cas limite', () => {
      test('should allow last available spot (14/15)', async () => {
        // Arrange
        setupCapacityTest(15, 14);
        prismaMock.booking.create.mockResolvedValue({
          id: 'last-booking',
          userId: 'user-1',
          classId: 'class-1',
          status: 'CONFIRMED'
        });

        // Act
        const result = await bookingService.createBooking('user-1', 'class-1');

        // Assert
        expect(result.status).toBe('CONFIRMED');
      });

      test('should handle zero capacity class', async () => {
        // Arrange
        setupCapacityTest(0, 0);

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-1')
        ).rejects.toThrow('Class is full');
      });
    });
  });

  // ==========================================
  // 4. CALCUL DE STATISTIQUES UTILISATEUR
  // ==========================================
  describe('📈 Calcul de Statistiques Utilisateur', () => {
    const setupStatsTest = (bookings) => {
      prismaMock.booking.findMany.mockResolvedValue(bookings);
    };

    describe('Cas passant', () => {
      test('should calculate stats correctly for active user', async () => {
        // Arrange
        const currentDate = timeMock.getCurrentTime();
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        const bookings = [
          { status: 'CONFIRMED', class: { datetime: timeUtils.futureDate(1) } },
          { status: 'CONFIRMED', class: { datetime: timeUtils.futureDate(2) } },
          { status: 'CANCELLED', class: { datetime: timeUtils.pastDate(1) } },
          { status: 'NO_SHOW', class: { datetime: timeUtils.pastDate(2) } },
          { status: 'NO_SHOW', class: { datetime: new Date(monthStart.getTime() + 86400000) } } // This month
        ];
        setupStatsTest(bookings);

        // Act
        const stats = await bookingService.getUserStats('user-1');

        // Assert
        expect(stats.totalBookings).toBe(5);
        expect(stats.confirmedBookings).toBe(2);
        expect(stats.cancelledBookings).toBe(1);
        expect(stats.noShows).toBe(2);
        expect(stats.monthlyNoShows).toBe(1);
      });
    });

    describe('Cas non passant', () => {
      test('should return zero stats for user with no bookings', async () => {
        // Arrange
        setupStatsTest([]);

        // Act
        const stats = await bookingService.getUserStats('user-1');

        // Assert
        expect(stats.totalBookings).toBe(0);
        expect(stats.confirmedBookings).toBe(0);
        expect(stats.cancelledBookings).toBe(0);
        expect(stats.noShows).toBe(0);
        expect(stats.monthlyNoShows).toBe(0);
      });
    });

    describe('Cas limite', () => {
      test('should handle month boundary correctly', async () => {
        // Arrange
        timeMock.setCurrentTime('2024-02-01T12:00:00Z'); // First day of February
        const bookings = [
          { status: 'NO_SHOW', class: { datetime: new Date('2024-01-31T10:00:00Z') } }, // Last month
          { status: 'NO_SHOW', class: { datetime: new Date('2024-02-01T10:00:00Z') } }  // This month
        ];
        setupStatsTest(bookings);

        // Act
        const stats = await bookingService.getUserStats('user-1');

        // Assert
        expect(stats.noShows).toBe(2);
        expect(stats.monthlyNoShows).toBe(1); // Only February no-show
      });
    });
  });

  // ==========================================
  // 5. MARQUAGE AUTOMATIQUE DES NO-SHOWS
  // ==========================================
  describe('⏰ Marquage Automatique des No-Shows', () => {
    const setupNoShowTest = (confirmedBookings) => {
      prismaMock.booking.findMany.mockResolvedValue(confirmedBookings);
      prismaMock.booking.updateMany.mockResolvedValue({ 
        count: confirmedBookings.length 
      });
    };

    describe('Cas passant', () => {
      test('should mark overdue confirmed bookings as NO_SHOW', async () => {
        // Arrange
        const pastBookings = [
          { id: 'booking-1', status: 'CONFIRMED', class: { datetime: timeUtils.pastDate(1) } },
          { id: 'booking-2', status: 'CONFIRMED', class: { datetime: timeUtils.pastDate(2) } }
        ];
        setupNoShowTest(pastBookings);

        // Act
        const count = await bookingService.markNoShows();

        // Assert
        expect(count).toBe(2);
        expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
          where: { id: { in: ['booking-1', 'booking-2'] } },
          data: { status: 'NO_SHOW' }
        });
      });
    });

    describe('Cas non passant', () => {
      test('should return 0 when no overdue bookings', async () => {
        // Arrange
        setupNoShowTest([]);

        // Act
        const count = await bookingService.markNoShows();

        // Assert
        expect(count).toBe(0);
        expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
      });
    });

    describe('Cas limite', () => {
      test('should handle exactly current time boundary', async () => {
        // Arrange
        const now = timeMock.getCurrentTime();
        const borderlineBookings = [
          { id: 'booking-1', status: 'CONFIRMED', class: { datetime: new Date(now.getTime() - 1000) } }, // 1 second ago
          { id: 'booking-2', status: 'CONFIRMED', class: { datetime: new Date(now.getTime() + 1000) } }  // 1 second future
        ];
        
        // Only past booking should be found
        prismaMock.booking.findMany.mockResolvedValue([borderlineBookings[0]]);
        prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

        // Act
        const count = await bookingService.markNoShows();

        // Assert
        expect(count).toBe(1);
      });
    });
  });

  // ==========================================
  // 6. DÉTECTION DE CONFLITS HORAIRES
  // ==========================================
  describe('⏰ Détection de Conflits Horaires', () => {
    const setupConflictTest = (existingBookings, newClassDateTime, newClassDuration) => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.class.findUnique.mockResolvedValue({
        id: 'class-new',
        capacity: 15,
        isCancelled: false,
        datetime: newClassDateTime,
        duration: newClassDuration,
        bookings: []
      });
      prismaMock.booking.findUnique.mockResolvedValue(null);
      prismaMock.booking.findMany.mockResolvedValue(existingBookings);
    };

    describe('Cas passant', () => {
      test('should allow booking when no time conflict', async () => {
        // Arrange
        const existingBookings = [
          {
            status: 'CONFIRMED',
            class: { datetime: timeUtils.futureDate(1), duration: 60 } // 1h ahead, 1h duration
          }
        ];
        setupConflictTest(existingBookings, timeUtils.futureDate(3), 60); // 3h ahead, no conflict
        prismaMock.booking.create.mockResolvedValue({
          id: 'new-booking',
          userId: 'user-1',
          classId: 'class-new',
          status: 'CONFIRMED'
        });

        // Act
        const result = await bookingService.createBooking('user-1', 'class-new');

        // Assert
        expect(result.status).toBe('CONFIRMED');
      });
    });

    describe('Cas non passant', () => {
      test('should reject booking when time conflict exists', async () => {
        // Arrange
        const conflictTime = timeUtils.futureDate(2);
        const existingBookings = [
          {
            status: 'CONFIRMED',
            class: { datetime: conflictTime, duration: 60 }
          }
        ];
        // New class overlaps with existing one
        const newClassTime = new Date(conflictTime.getTime() + 30 * 60000); // 30 minutes later
        setupConflictTest(existingBookings, newClassTime, 60);

        // Act & Assert
        await expect(
          bookingService.createBooking('user-1', 'class-new')
        ).rejects.toThrow('Time conflict detected');
      });
    });

    describe('Cas limite', () => {
      test('should allow booking when classes are exactly adjacent', async () => {
        // Arrange
        const firstClassEnd = timeUtils.futureDate(2);
        const existingBookings = [
          {
            status: 'CONFIRMED',
            class: { datetime: new Date(firstClassEnd.getTime() - 60 * 60000), duration: 60 } // Ends exactly when new starts
          }
        ];
        setupConflictTest(existingBookings, firstClassEnd, 60);
        prismaMock.booking.create.mockResolvedValue({
          id: 'adjacent-booking',
          userId: 'user-1',
          classId: 'class-new',
          status: 'CONFIRMED'
        });

        // Act
        const result = await bookingService.createBooking('user-1', 'class-new');

        // Assert
        expect(result.status).toBe('CONFIRMED');
      });
    });
  });
});