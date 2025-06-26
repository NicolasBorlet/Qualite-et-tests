/**
 * Tests unitaires pour le service API gym
 * Teste la communication avec le backend et gestion d'erreurs
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClientMock, gymServiceMock, apiMockScenarios, HTTP_STATUS } from '../../../mocks/frontend/api.mock';

// Mock du service gym basé sur la structure observée
const createGymService = (apiClient) => {
  return {
    // === DASHBOARD ===
    async getUserDashboard(userId) {
      const response = await apiClient.get(`/dashboard/user/${userId}`);
      return response;
    },

    async getAdminDashboard() {
      const response = await apiClient.get('/dashboard/admin');
      return response;
    },

    // === CLASSES ===
    async getAllClasses() {
      const response = await apiClient.get('/classes');
      return response;
    },

    async getClass(classId) {
      const response = await apiClient.get(`/classes/${classId}`);
      return response;
    },

    async createClass(classData) {
      const response = await apiClient.post('/classes', classData);
      return response;
    },

    async updateClass(classId, updateData) {
      const response = await apiClient.put(`/classes/${classId}`, updateData);
      return response;
    },

    async deleteClass(classId) {
      const response = await apiClient.delete(`/classes/${classId}`);
      return response;
    },

    // === BOOKINGS ===
    async getUserBookings(userId) {
      const response = await apiClient.get(`/bookings/user/${userId}`);
      return response;
    },

    async getAllBookings() {
      const response = await apiClient.get('/bookings');
      return response;
    },

    async createBooking(userId, classId) {
      const response = await apiClient.post('/bookings', { userId, classId });
      return response;
    },

    async cancelBooking(bookingId, userId) {
      const response = await apiClient.put(`/bookings/${bookingId}/cancel`, { userId });
      return response;
    },

    async updateBookingStatus(bookingId, status) {
      const response = await apiClient.put(`/bookings/${bookingId}`, { status });
      return response;
    },

    // === USERS ===
    async getAllUsers() {
      const response = await apiClient.get('/users');
      return response;
    },

    async getUser(userId) {
      const response = await apiClient.get(`/users/${userId}`);
      return response;
    },

    async createUser(userData) {
      const response = await apiClient.post('/users', userData);
      return response;
    },

    async updateUser(userId, updateData) {
      const response = await apiClient.put(`/users/${userId}`, updateData);
      return response;
    },

    async deleteUser(userId) {
      const response = await apiClient.delete(`/users/${userId}`);
      return response;
    },

    // === SUBSCRIPTIONS ===
    async getUserSubscription(userId) {
      const response = await apiClient.get(`/subscriptions/user/${userId}`);
      return response;
    },

    async getAllSubscriptions() {
      const response = await apiClient.get('/subscriptions');
      return response;
    },

    async createSubscription(subscriptionData) {
      const response = await apiClient.post('/subscriptions', subscriptionData);
      return response;
    },

    async updateSubscription(subscriptionId, updateData) {
      const response = await apiClient.put(`/subscriptions/${subscriptionId}`, updateData);
      return response;
    },

    async calculateMonthlyBilling(userId) {
      const response = await apiClient.get(`/subscriptions/user/${userId}/billing`);
      return response;
    }
  };
};

describe('Gym Service - Tests Unitaires', () => {
  let gymService;

  beforeEach(() => {
    // Reset des mocks
    vi.clearAllMocks();
    
    // Configuration du service avec client API mocké
    gymService = createGymService(apiClientMock);
  });

  afterEach(() => {
    apiMockScenarios.reset();
  });

  // ==========================================
  // 1. COMMUNICATION API - DASHBOARD
  // ==========================================
  describe('📊 Communication API - Dashboard', () => {
    describe('Cas passant', () => {
      test('should fetch user dashboard successfully', async () => {
        // Arrange
        const expectedData = {
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            subscription: { planType: 'PREMIUM', active: true },
            stats: { totalBookings: 5, confirmedBookings: 4 },
            recentBookings: []
          }
        };
        apiClientMock.get.mockResolvedValue(expectedData);

        // Act
        const result = await gymService.getUserDashboard('user-1');

        // Assert
        expect(result.data.user.firstname).toBe('John');
        expect(result.data.subscription.planType).toBe('PREMIUM');
        expect(result.data.stats.totalBookings).toBe(5);
        expect(apiClientMock.get).toHaveBeenCalledWith('/dashboard/user/user-1');
      });

      test('should fetch admin dashboard successfully', async () => {
        // Arrange
        const expectedData = {
          data: {
            stats: {
              totalUsers: 150,
              activeSubscriptions: 142,
              totalBookings: 1250
            },
            revenue: { monthly: 6789.50, yearly: 78450.00 }
          }
        };
        apiClientMock.get.mockResolvedValue(expectedData);

        // Act
        const result = await gymService.getAdminDashboard();

        // Assert
        expect(result.data.stats.totalUsers).toBe(150);
        expect(result.data.revenue.monthly).toBe(6789.50);
        expect(apiClientMock.get).toHaveBeenCalledWith('/dashboard/admin');
      });
    });

    describe('Cas non passant', () => {
      test('should handle user dashboard API error', async () => {
        // Arrange
        const error = new Error('User not found');
        error.response = { status: 404, data: { error: 'User not found' } };
        apiClientMock.get.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.getUserDashboard('invalid-user')
        ).rejects.toThrow('User not found');
      });

      test('should handle admin dashboard authorization error', async () => {
        // Arrange
        const error = new Error('Access denied');
        error.response = { status: 403, data: { error: 'Access denied' } };
        apiClientMock.get.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.getAdminDashboard()
        ).rejects.toThrow('Access denied');
      });
    });

    describe('Cas limite', () => {
      test('should handle dashboard with empty data', async () => {
        // Arrange
        const emptyData = {
          data: {
            user: { id: 'user-1', firstname: 'New', lastname: 'User' },
            subscription: null,
            stats: { totalBookings: 0, confirmedBookings: 0 },
            recentBookings: []
          }
        };
        apiClientMock.get.mockResolvedValue(emptyData);

        // Act
        const result = await gymService.getUserDashboard('user-1');

        // Assert
        expect(result.data.subscription).toBeNull();
        expect(result.data.stats.totalBookings).toBe(0);
        expect(result.data.recentBookings).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // 2. GESTION DES RÉSERVATIONS
  // ==========================================
  describe('📅 Gestion des Réservations', () => {
    describe('Cas passant', () => {
      test('should create booking successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            id: 'booking-1',
            userId: 'user-1',
            classId: 'class-1',
            status: 'CONFIRMED',
            createdAt: '2024-01-15T14:30:00Z'
          }
        };
        apiClientMock.post.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.createBooking('user-1', 'class-1');

        // Assert
        expect(result.data.status).toBe('CONFIRMED');
        expect(result.data.userId).toBe('user-1');
        expect(result.data.classId).toBe('class-1');
        expect(apiClientMock.post).toHaveBeenCalledWith('/bookings', {
          userId: 'user-1',
          classId: 'class-1'
        });
      });

      test('should cancel booking successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            id: 'booking-1',
            status: 'CANCELLED',
            updatedAt: '2024-01-15T15:00:00Z'
          }
        };
        apiClientMock.put.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.data.status).toBe('CANCELLED');
        expect(apiClientMock.put).toHaveBeenCalledWith('/bookings/booking-1/cancel', {
          userId: 'user-1'
        });
      });

      test('should fetch user bookings successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: [
            {
              id: 'booking-1',
              status: 'CONFIRMED',
              class: { title: 'Yoga', datetime: '2024-01-16T10:00:00Z' }
            },
            {
              id: 'booking-2',
              status: 'CANCELLED',
              class: { title: 'Pilates', datetime: '2024-01-15T18:00:00Z' }
            }
          ]
        };
        apiClientMock.get.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.getUserBookings('user-1');

        // Assert
        expect(result.data).toHaveLength(2);
        expect(result.data[0].class.title).toBe('Yoga');
        expect(apiClientMock.get).toHaveBeenCalledWith('/bookings/user/user-1');
      });
    });

    describe('Cas non passant', () => {
      test('should handle booking creation conflict error', async () => {
        // Arrange
        const error = new Error('Class is full');
        error.response = { status: 409, data: { error: 'Class is full' } };
        apiClientMock.post.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.createBooking('user-1', 'full-class')
        ).rejects.toThrow('Class is full');
      });

      test('should handle booking cancellation access denied', async () => {
        // Arrange
        const error = new Error('Access denied');
        error.response = { status: 403, data: { error: 'Access denied' } };
        apiClientMock.put.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.cancelBooking('booking-1', 'wrong-user')
        ).rejects.toThrow('Access denied');
      });

      test('should handle booking not found error', async () => {
        // Arrange
        const error = new Error('Booking not found');
        error.response = { status: 404, data: { error: 'Booking not found' } };
        apiClientMock.put.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.cancelBooking('invalid-booking', 'user-1')
        ).rejects.toThrow('Booking not found');
      });
    });

    describe('Cas limite', () => {
      test('should handle empty bookings list', async () => {
        // Arrange
        apiClientMock.get.mockResolvedValue({ data: [] });

        // Act
        const result = await gymService.getUserBookings('new-user');

        // Assert
        expect(result.data).toHaveLength(0);
      });

      test('should handle late cancellation (NO_SHOW)', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            id: 'booking-1',
            status: 'NO_SHOW',
            updatedAt: '2024-01-15T15:00:00Z'
          }
        };
        apiClientMock.put.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.cancelBooking('booking-1', 'user-1');

        // Assert
        expect(result.data.status).toBe('NO_SHOW');
      });
    });
  });

  // ==========================================
  // 3. GESTION DES COURS
  // ==========================================
  describe('🏃 Gestion des Cours', () => {
    describe('Cas passant', () => {
      test('should fetch all classes successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: [
            {
              id: 'class-1',
              title: 'Yoga Morning',
              coach: 'Sarah Johnson',
              datetime: '2024-01-16T09:00:00Z',
              capacity: 15,
              isCancelled: false
            },
            {
              id: 'class-2',
              title: 'Pilates Evening',
              coach: 'Emma Thompson',
              datetime: '2024-01-16T18:30:00Z',
              capacity: 12,
              isCancelled: false
            }
          ]
        };
        apiClientMock.get.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.getAllClasses();

        // Assert
        expect(result.data).toHaveLength(2);
        expect(result.data[0].title).toBe('Yoga Morning');
        expect(result.data[1].coach).toBe('Emma Thompson');
        expect(apiClientMock.get).toHaveBeenCalledWith('/classes');
      });

      test('should create class successfully', async () => {
        // Arrange
        const classData = {
          title: 'New Yoga Class',
          coach: 'New Coach',
          datetime: '2024-01-20T10:00:00Z',
          duration: 60,
          capacity: 15
        };
        const expectedResponse = {
          data: { id: 'class-new', ...classData, isCancelled: false }
        };
        apiClientMock.post.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.createClass(classData);

        // Assert
        expect(result.data.title).toBe('New Yoga Class');
        expect(result.data.isCancelled).toBe(false);
        expect(apiClientMock.post).toHaveBeenCalledWith('/classes', classData);
      });

      test('should update class successfully', async () => {
        // Arrange
        const updateData = { capacity: 20, coach: 'Updated Coach' };
        const expectedResponse = {
          data: { id: 'class-1', ...updateData }
        };
        apiClientMock.put.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.updateClass('class-1', updateData);

        // Assert
        expect(result.data.capacity).toBe(20);
        expect(result.data.coach).toBe('Updated Coach');
        expect(apiClientMock.put).toHaveBeenCalledWith('/classes/class-1', updateData);
      });
    });

    describe('Cas non passant', () => {
      test('should handle class creation validation error', async () => {
        // Arrange
        const error = new Error('Validation failed');
        error.response = {
          status: 400,
          data: {
            error: 'Validation failed',
            details: ['Title is required', 'Invalid datetime format']
          }
        };
        apiClientMock.post.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.createClass({ title: '', datetime: 'invalid' })
        ).rejects.toThrow('Validation failed');
      });

      test('should handle class not found error', async () => {
        // Arrange
        const error = new Error('Class not found');
        error.response = { status: 404, data: { error: 'Class not found' } };
        apiClientMock.get.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.getClass('invalid-class')
        ).rejects.toThrow('Class not found');
      });
    });
  });

  // ==========================================
  // 4. GESTION D'ERREURS RÉSEAU
  // ==========================================
  describe('🌐 Gestion d\'Erreurs Réseau', () => {
    describe('Cas non passant', () => {
      test('should handle network timeout error', async () => {
        // Arrange
        const timeoutError = new Error('timeout of 5000ms exceeded');
        timeoutError.code = 'ECONNABORTED';
        apiClientMock.get.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(
          gymService.getAllClasses()
        ).rejects.toThrow('timeout of 5000ms exceeded');
      });

      test('should handle network connection error', async () => {
        // Arrange
        const networkError = new Error('Network Error');
        networkError.code = 'NETWORK_ERROR';
        apiClientMock.get.mockRejectedValue(networkError);

        // Act & Assert
        await expect(
          gymService.getUserDashboard('user-1')
        ).rejects.toThrow('Network Error');
      });

      test('should handle server internal error', async () => {
        // Arrange
        const serverError = new Error('Internal Server Error');
        serverError.response = {
          status: 500,
          data: { error: 'Internal server error' }
        };
        apiClientMock.post.mockRejectedValue(serverError);

        // Act & Assert
        await expect(
          gymService.createUser({ firstname: 'Test' })
        ).rejects.toThrow('Internal Server Error');
      });
    });

    describe('Cas limite', () => {
      test('should handle malformed API response', async () => {
        // Arrange
        apiClientMock.get.mockResolvedValue({ invalidStructure: true });

        // Act
        const result = await gymService.getAllClasses();

        // Assert
        expect(result.invalidStructure).toBe(true);
        // Le service devrait retourner la réponse telle quelle pour que les composants gèrent
      });

      test('should handle empty API response', async () => {
        // Arrange
        apiClientMock.get.mockResolvedValue({});

        // Act
        const result = await gymService.getAllUsers();

        // Assert
        expect(result).toEqual({});
      });
    });
  });

  // ==========================================
  // 5. GESTION DES ABONNEMENTS
  // ==========================================
  describe('💳 Gestion des Abonnements', () => {
    describe('Cas passant', () => {
      test('should fetch user subscription successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            id: 'sub-1',
            userId: 'user-1',
            planType: 'PREMIUM',
            startDate: '2024-01-01',
            endDate: '2024-02-01',
            active: true
          }
        };
        apiClientMock.get.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.getUserSubscription('user-1');

        // Assert
        expect(result.data.planType).toBe('PREMIUM');
        expect(result.data.active).toBe(true);
        expect(apiClientMock.get).toHaveBeenCalledWith('/subscriptions/user/user-1');
      });

      test('should calculate monthly billing successfully', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            userId: 'user-1',
            planType: 'PREMIUM',
            basePrice: 59.99,
            loyaltyDiscount: 6.00,
            noShowPenalty: 0,
            finalAmount: 53.99,
            details: {
              loyaltyEligible: true,
              monthsSubscribed: 8,
              noShowsThisMonth: 1
            }
          }
        };
        apiClientMock.get.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.calculateMonthlyBilling('user-1');

        // Assert
        expect(result.data.finalAmount).toBe(53.99);
        expect(result.data.loyaltyDiscount).toBe(6.00);
        expect(result.data.details.loyaltyEligible).toBe(true);
        expect(apiClientMock.get).toHaveBeenCalledWith('/subscriptions/user/user-1/billing');
      });
    });

    describe('Cas non passant', () => {
      test('should handle user without subscription', async () => {
        // Arrange
        apiClientMock.get.mockResolvedValue({ data: null });

        // Act
        const result = await gymService.getUserSubscription('user-without-sub');

        // Assert
        expect(result.data).toBeNull();
      });

      test('should handle billing calculation error', async () => {
        // Arrange
        const error = new Error('No active subscription found');
        error.response = { status: 404, data: { error: 'No active subscription found' } };
        apiClientMock.get.mockRejectedValue(error);

        // Act & Assert
        await expect(
          gymService.calculateMonthlyBilling('user-without-sub')
        ).rejects.toThrow('No active subscription found');
      });
    });

    describe('Cas limite', () => {
      test('should handle subscription with penalties', async () => {
        // Arrange
        const expectedResponse = {
          data: {
            userId: 'user-problematic',
            planType: 'STANDARD',
            basePrice: 39.99,
            loyaltyDiscount: 0,
            noShowPenalty: 6.00,
            finalAmount: 45.99,
            details: {
              loyaltyEligible: false,
              monthsSubscribed: 2,
              noShowsThisMonth: 7
            }
          }
        };
        apiClientMock.get.mockResolvedValue(expectedResponse);

        // Act
        const result = await gymService.calculateMonthlyBilling('user-problematic');

        // Assert
        expect(result.data.noShowPenalty).toBe(6.00);
        expect(result.data.finalAmount).toBe(45.99);
        expect(result.data.details.noShowsThisMonth).toBe(7);
      });
    });
  });
});