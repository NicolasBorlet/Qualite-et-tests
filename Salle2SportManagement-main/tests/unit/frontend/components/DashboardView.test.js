/**
 * Tests unitaires pour le composant DashboardView
 * Teste l'affichage des données utilisateur et interactions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { gymServiceMock, apiMockScenarios } from '../../../mocks/frontend/api.mock';
import { createAuthStoreMock, authMockScenarios } from '../../../mocks/frontend/stores/auth.mock';

// Mock du composant DashboardView
const DashboardView = {
  name: 'DashboardView',
  template: `
    <div class="dashboard-view">
      <div v-if="loading" class="loading" data-testid="loading">Chargement...</div>
      <div v-else-if="error" class="error" data-testid="error">{{ error }}</div>
      <div v-else class="dashboard-content">
        <header class="dashboard-header">
          <h1 data-testid="page-title">Tableau de bord</h1>
          <div v-if="user" class="user-info" data-testid="user-info">
            Bienvenue {{ user.firstname }} {{ user.lastname }}
          </div>
        </header>

        <div class="dashboard-stats" data-testid="dashboard-stats">
          <div class="stat-card">
            <h3>Réservations totales</h3>
            <span class="stat-value" data-testid="total-bookings">{{ stats.totalBookings || 0 }}</span>
          </div>
          <div class="stat-card">
            <h3>Réservations confirmées</h3>
            <span class="stat-value" data-testid="confirmed-bookings">{{ stats.confirmedBookings || 0 }}</span>
          </div>
          <div class="stat-card">
            <h3>Taux de no-show</h3>
            <span class="stat-value" data-testid="noshow-rate">{{ formatPercentage(stats.noShowRate) }}</span>
          </div>
        </div>

        <div class="subscription-info" data-testid="subscription-info">
          <h2>Abonnement</h2>
          <div v-if="subscription" class="subscription-active">
            <p>Plan : <strong data-testid="plan-type">{{ subscription.planType }}</strong></p>
            <p>Statut : <span :class="subscriptionStatusClass" data-testid="subscription-status">
              {{ subscription.active ? 'Actif' : 'Inactif' }}
            </span></p>
          </div>
          <div v-else class="subscription-none" data-testid="no-subscription">
            <p>Aucun abonnement actif</p>
            <button class="btn-primary" data-testid="subscribe-button">S'abonner</button>
          </div>
        </div>

        <div class="available-classes" data-testid="available-classes">
          <h2>Cours disponibles</h2>
          <div v-if="availableClasses.length === 0" class="no-classes" data-testid="no-classes">
            Aucun cours disponible pour le moment
          </div>
          <div v-else class="classes-grid">
            <div v-for="cls in availableClasses" :key="cls.id" class="class-card" :data-testid="'class-' + cls.id">
              <h3>{{ cls.title }}</h3>
              <p class="coach">Coach: {{ cls.coach }}</p>
              <p class="datetime">{{ formatDateTime(cls.datetime) }}</p>
              <p class="capacity">Places: {{ cls.availableSpots }}/{{ cls.capacity }}</p>
              <button 
                @click="bookClass(cls.id)"
                :disabled="isClassFull(cls) || bookingInProgress"
                :class="getBookingButtonClass(cls)"
                :data-testid="'book-' + cls.id"
              >
                {{ getBookingButtonText(cls) }}
              </button>
            </div>
          </div>
        </div>

        <div class="user-bookings" data-testid="user-bookings">
          <h2>Mes réservations</h2>
          <div v-if="userBookings.length === 0" class="no-bookings" data-testid="no-bookings">
            Aucune réservation pour le moment
          </div>
          <div v-else class="bookings-list">
            <div v-for="booking in userBookings" :key="booking.id" class="booking-card" :data-testid="'booking-' + booking.id">
              <h4>{{ booking.class.title }}</h4>
              <p class="status" :class="'status-' + booking.status.toLowerCase()">
                Statut: {{ formatBookingStatus(booking.status) }}
              </p>
              <p class="datetime">{{ formatDateTime(booking.class.datetime) }}</p>
              <button 
                v-if="canCancelBooking(booking)"
                @click="cancelBooking(booking.id)"
                :disabled="cancellingBooking === booking.id"
                class="btn-cancel"
                :data-testid="'cancel-' + booking.id"
              >
                {{ cancellingBooking === booking.id ? 'Annulation...' : 'Annuler' }}
              </button>
            </div>
          </div>
        </div>

        <div class="dashboard-actions" data-testid="dashboard-actions">
          <button @click="refreshDashboard" :disabled="loading" class="btn-refresh" data-testid="refresh-button">
            {{ loading ? 'Actualisation...' : 'Actualiser' }}
          </button>
          <button @click="logout" class="btn-logout" data-testid="logout-button">
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      loading: false,
      error: null,
      dashboardData: null,
      availableClasses: [],
      userBookings: [],
      bookingInProgress: false,
      cancellingBooking: null
    };
  },
  computed: {
    user() {
      return this.$authStore.currentUser.value;
    },
    stats() {
      return this.dashboardData?.stats || {};
    },
    subscription() {
      return this.dashboardData?.subscription;
    },
    subscriptionStatusClass() {
      return this.subscription?.active ? 'status-active' : 'status-inactive';
    }
  },
  async mounted() {
    await this.loadDashboard();
  },
  methods: {
    async loadDashboard() {
      this.loading = true;
      this.error = null;
      
      try {
        await Promise.all([
          this.loadDashboardData(),
          this.loadAvailableClasses(),
          this.loadUserBookings()
        ]);
      } catch (error) {
        this.error = 'Erreur lors du chargement du tableau de bord';
        console.error('Dashboard loading error:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadDashboardData() {
      if (!this.user) {
        throw new Error('Utilisateur non connecté');
      }
      
      const response = await this.$gymService.getUserDashboard(this.user.id);
      this.dashboardData = response.data;
    },

    async loadAvailableClasses() {
      const response = await this.$gymService.getAllClasses();
      this.availableClasses = response.data
        .filter(cls => !cls.isCancelled && new Date(cls.datetime) > new Date())
        .map(cls => ({
          ...cls,
          availableSpots: cls.capacity - (cls.bookingsCount || 0)
        }));
    },

    async loadUserBookings() {
      if (!this.user) return;
      
      const response = await this.$gymService.getUserBookings(this.user.id);
      this.userBookings = response.data.sort((a, b) => 
        new Date(b.class.datetime) - new Date(a.class.datetime)
      );
    },

    async bookClass(classId) {
      if (!this.user || this.bookingInProgress) return;
      
      this.bookingInProgress = true;
      
      try {
        await this.$gymService.createBooking(this.user.id, classId);
        
        // Actualiser les données après réservation
        await Promise.all([
          this.loadAvailableClasses(),
          this.loadUserBookings(),
          this.loadDashboardData()
        ]);
        
      } catch (error) {
        this.error = error.message || 'Erreur lors de la réservation';
      } finally {
        this.bookingInProgress = false;
      }
    },

    async cancelBooking(bookingId) {
      if (!this.user || this.cancellingBooking) return;
      
      this.cancellingBooking = bookingId;
      
      try {
        await this.$gymService.cancelBooking(bookingId, this.user.id);
        
        // Actualiser les données après annulation
        await Promise.all([
          this.loadAvailableClasses(),
          this.loadUserBookings(),
          this.loadDashboardData()
        ]);
        
      } catch (error) {
        this.error = error.message || 'Erreur lors de l\'annulation';
      } finally {
        this.cancellingBooking = null;
      }
    },

    async refreshDashboard() {
      await this.loadDashboard();
    },

    logout() {
      this.$authStore.logout();
      this.$router.push('/login');
    },

    isClassFull(cls) {
      return cls.availableSpots <= 0;
    },

    canCancelBooking(booking) {
      if (booking.status !== 'CONFIRMED') return false;
      
      const classTime = new Date(booking.class.datetime);
      const now = new Date();
      const hoursUntilClass = (classTime - now) / (1000 * 60 * 60);
      
      return hoursUntilClass >= 2;
    },

    getBookingButtonClass(cls) {
      return {
        'btn-book': true,
        'btn-disabled': this.isClassFull(cls) || this.bookingInProgress,
        'btn-available': !this.isClassFull(cls) && !this.bookingInProgress
      };
    },

    getBookingButtonText(cls) {
      if (this.bookingInProgress) return 'Réservation...';
      if (this.isClassFull(cls)) return 'Complet';
      return 'Réserver';
    },

    formatDateTime(dateString) {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatBookingStatus(status) {
      const statusMap = {
        'CONFIRMED': 'Confirmée',
        'CANCELLED': 'Annulée',
        'NO_SHOW': 'Absence',
        'CANCELLED_BY_CLASS': 'Cours annulé'
      };
      return statusMap[status] || status;
    },

    formatPercentage(value) {
      return value ? `${Math.round(value)}%` : '0%';
    }
  }
};

// Configuration du routeur de test
const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/dashboard', component: DashboardView },
      { path: '/login', component: { template: '<div>Login</div>' } }
    ]
  });
};

describe('DashboardView - Tests Unitaires', () => {
  let wrapper;
  let router;
  let authStore;
  let pinia;

  beforeEach(async () => {
    // Setup Pinia
    pinia = createPinia();
    setActivePinia(pinia);
    
    // Setup Router
    router = createTestRouter();
    await router.push('/dashboard');
    await router.isReady();
    
    // Setup Auth Store
    authStore = createAuthStoreMock();
    authMockScenarios.standardUserLoggedIn(authStore);
    
    // Reset mocks
    vi.clearAllMocks();
    apiMockScenarios.reset();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  const createWrapper = () => {
    return mount(DashboardView, {
      global: {
        plugins: [router, pinia],
        provide: {
          $gymService: gymServiceMock
        },
        config: {
          globalProperties: {
            $authStore: authStore,
            $gymService: gymServiceMock
          }
        }
      }
    });
  };

  // ==========================================
  // 1. RENDU DU COMPOSANT ET ÉTAT INITIAL
  // ==========================================
  describe('🎨 Rendu du Composant et État Initial', () => {
    describe('Cas passant', () => {
      test('should render dashboard layout correctly', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 5, confirmedBookings: 4, noShowRate: 10 },
            subscription: { planType: 'PREMIUM', active: true }
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="page-title"]').text()).toBe('Tableau de bord');
        expect(wrapper.find('[data-testid="user-info"]').text()).toContain('Bienvenue John Doe');
        expect(wrapper.find('[data-testid="dashboard-stats"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="subscription-info"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="available-classes"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="user-bookings"]').exists()).toBe(true);
      });

      test('should display user statistics correctly', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 12, confirmedBookings: 10, noShowRate: 16.67 },
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="total-bookings"]').text()).toBe('12');
        expect(wrapper.find('[data-testid="confirmed-bookings"]').text()).toBe('10');
        expect(wrapper.find('[data-testid="noshow-rate"]').text()).toBe('17%');
      });

      test('should display subscription information correctly', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 0, confirmedBookings: 0, noShowRate: 0 },
            subscription: { planType: 'STANDARD', active: true }
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="plan-type"]').text()).toBe('STANDARD');
        expect(wrapper.find('[data-testid="subscription-status"]').text()).toBe('Actif');
        expect(wrapper.find('[data-testid="subscription-status"]').classes()).toContain('status-active');
      });

      test('should handle user without subscription', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 0, confirmedBookings: 0, noShowRate: 0 },
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="no-subscription"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="no-subscription"]').text()).toContain('Aucun abonnement actif');
        expect(wrapper.find('[data-testid="subscribe-button"]').exists()).toBe(true);
      });
    });

    describe('Cas non passant', () => {
      test('should display loading state initially', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        );
        gymServiceMock.getAllClasses.mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        );
        gymServiceMock.getUserBookings.mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        );

        // Act
        wrapper = createWrapper();
        await wrapper.vm.$nextTick();

        // Assert
        expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="loading"]').text()).toBe('Chargement...');
      });

      test('should display error when dashboard loading fails', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockRejectedValue(new Error('API Error'));
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="error"]').text()).toBe('Erreur lors du chargement du tableau de bord');
      });
    });

    describe('Cas limite', () => {
      test('should handle empty statistics gracefully', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'New', lastname: 'User' },
            stats: {},
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="total-bookings"]').text()).toBe('0');
        expect(wrapper.find('[data-testid="confirmed-bookings"]').text()).toBe('0');
        expect(wrapper.find('[data-testid="noshow-rate"]').text()).toBe('0%');
      });
    });
  });

  // ==========================================
  // 2. AFFICHAGE DES COURS DISPONIBLES
  // ==========================================
  describe('📚 Affichage des Cours Disponibles', () => {
    describe('Cas passant', () => {
      test('should display available classes correctly', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 0, confirmedBookings: 0, noShowRate: 0 },
            subscription: { planType: 'PREMIUM', active: true }
          }
        });

        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [
            {
              id: 'class-1',
              title: 'Yoga Morning',
              coach: 'Sarah Johnson',
              datetime: futureDate.toISOString(),
              capacity: 15,
              bookingsCount: 5,
              isCancelled: false
            },
            {
              id: 'class-2',
              title: 'Pilates Evening',
              coach: 'Emma Thompson',
              datetime: futureDate.toISOString(),
              capacity: 12,
              bookingsCount: 12,
              isCancelled: false
            }
          ]
        });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="class-class-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="class-class-1"]').text()).toContain('Yoga Morning');
        expect(wrapper.find('[data-testid="class-class-1"]').text()).toContain('Sarah Johnson');
        expect(wrapper.find('[data-testid="class-class-1"]').text()).toContain('10/15');

        expect(wrapper.find('[data-testid="class-class-2"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="class-class-2"]').text()).toContain('0/12');
      });

      test('should filter out cancelled and past classes', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 2);

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [
            {
              id: 'class-future',
              title: 'Future Class',
              coach: 'Coach A',
              datetime: futureDate.toISOString(),
              capacity: 10,
              bookingsCount: 0,
              isCancelled: false
            },
            {
              id: 'class-past',
              title: 'Past Class',
              coach: 'Coach B',
              datetime: pastDate.toISOString(),
              capacity: 10,
              bookingsCount: 0,
              isCancelled: false
            },
            {
              id: 'class-cancelled',
              title: 'Cancelled Class',
              coach: 'Coach C',
              datetime: futureDate.toISOString(),
              capacity: 10,
              bookingsCount: 0,
              isCancelled: true
            }
          ]
        });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="class-class-future"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="class-class-past"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="class-class-cancelled"]').exists()).toBe(false);
      });

      test('should display empty state when no classes available', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="no-classes"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="no-classes"]').text()).toBe('Aucun cours disponible pour le moment');
      });
    });
  });

  // ==========================================
  // 3. FONCTIONNALITÉ DE RÉSERVATION
  // ==========================================
  describe('📅 Fonctionnalité de Réservation', () => {
    describe('Cas passant', () => {
      test('should book class successfully', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: { planType: 'PREMIUM', active: true }
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [{
            id: 'class-available',
            title: 'Available Class',
            coach: 'Coach',
            datetime: futureDate.toISOString(),
            capacity: 10,
            bookingsCount: 5,
            isCancelled: false
          }]
        });

        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });
        gymServiceMock.createBooking.mockResolvedValue({
          data: { id: 'new-booking', status: 'CONFIRMED' }
        });

        wrapper = createWrapper();
        await flushPromises();

        // Act
        const bookButton = wrapper.find('[data-testid="book-class-available"]');
        await bookButton.trigger('click');
        await flushPromises();

        // Assert
        expect(gymServiceMock.createBooking).toHaveBeenCalledWith('user-1', 'class-available');
        expect(gymServiceMock.getUserBookings).toHaveBeenCalledTimes(2); // Initial + after booking
      });

      test('should disable booking button when class is full', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [{
            id: 'class-full',
            title: 'Full Class',
            coach: 'Coach',
            datetime: futureDate.toISOString(),
            capacity: 10,
            bookingsCount: 10,
            isCancelled: false
          }]
        });

        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        const bookButton = wrapper.find('[data-testid="book-class-full"]');
        expect(bookButton.element.disabled).toBe(true);
        expect(bookButton.text()).toBe('Complet');
      });
    });

    describe('Cas non passant', () => {
      test('should handle booking error gracefully', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [{
            id: 'class-error',
            title: 'Error Class',
            coach: 'Coach',
            datetime: futureDate.toISOString(),
            capacity: 10,
            bookingsCount: 5,
            isCancelled: false
          }]
        });

        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });
        gymServiceMock.createBooking.mockRejectedValue(new Error('Booking failed'));

        wrapper = createWrapper();
        await flushPromises();

        // Act
        const bookButton = wrapper.find('[data-testid="book-class-error"]');
        await bookButton.trigger('click');
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="error"]').text()).toBe('Booking failed');
      });
    });
  });

  // ==========================================
  // 4. GESTION DES RÉSERVATIONS UTILISATEUR
  // ==========================================
  describe('👤 Gestion des Réservations Utilisateur', () => {
    describe('Cas passant', () => {
      test('should display user bookings correctly', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [
            {
              id: 'booking-1',
              status: 'CONFIRMED',
              class: {
                id: 'class-1',
                title: 'My Booked Class',
                datetime: futureDate.toISOString()
              }
            },
            {
              id: 'booking-2',
              status: 'CANCELLED',
              class: {
                id: 'class-2',
                title: 'Cancelled Class',
                datetime: futureDate.toISOString()
              }
            }
          ]
        });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="booking-booking-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="booking-booking-1"]').text()).toContain('My Booked Class');
        expect(wrapper.find('[data-testid="booking-booking-1"]').text()).toContain('Confirmée');
        
        expect(wrapper.find('[data-testid="booking-booking-2"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="booking-booking-2"]').text()).toContain('Annulée');
      });

      test('should show cancel button for cancellable bookings', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4); // 4h dans le futur, annulable

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-cancellable',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Cancellable Class',
              datetime: futureDate.toISOString()
            }
          }]
        });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        const cancelButton = wrapper.find('[data-testid="cancel-booking-cancellable"]');
        expect(cancelButton.exists()).toBe(true);
        expect(cancelButton.text()).toBe('Annuler');
      });

      test('should hide cancel button for non-cancellable bookings', async () => {
        // Arrange
        const soonDate = new Date();
        soonDate.setHours(soonDate.getHours() + 1); // 1h dans le futur, non annulable

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-soon',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Soon Class',
              datetime: soonDate.toISOString()
            }
          }]
        });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        const cancelButton = wrapper.find('[data-testid="cancel-booking-soon"]');
        expect(cancelButton.exists()).toBe(false);
      });

      test('should cancel booking successfully', async () => {
        // Arrange
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 4);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-to-cancel',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Class to Cancel',
              datetime: futureDate.toISOString()
            }
          }]
        });

        gymServiceMock.cancelBooking.mockResolvedValue({
          data: { id: 'booking-to-cancel', status: 'CANCELLED' }
        });

        wrapper = createWrapper();
        await flushPromises();

        // Act
        const cancelButton = wrapper.find('[data-testid="cancel-booking-to-cancel"]');
        await cancelButton.trigger('click');
        await flushPromises();

        // Assert
        expect(gymServiceMock.cancelBooking).toHaveBeenCalledWith('booking-to-cancel', 'user-1');
        expect(gymServiceMock.getUserBookings).toHaveBeenCalledTimes(2); // Initial + after cancellation
      });

      test('should display empty state when no bookings', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // Act
        wrapper = createWrapper();
        await flushPromises();

        // Assert
        expect(wrapper.find('[data-testid="no-bookings"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="no-bookings"]').text()).toBe('Aucune réservation pour le moment');
      });
    });
  });

  // ==========================================
  // 5. ACTIONS ET NAVIGATION
  // ==========================================
  describe('🎯 Actions et Navigation', () => {
    describe('Cas passant', () => {
      test('should refresh dashboard when refresh button clicked', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        wrapper = createWrapper();
        await flushPromises();

        // Reset call counts
        gymServiceMock.getUserDashboard.mockClear();
        gymServiceMock.getAllClasses.mockClear();
        gymServiceMock.getUserBookings.mockClear();

        // Act
        const refreshButton = wrapper.find('[data-testid="refresh-button"]');
        await refreshButton.trigger('click');
        await flushPromises();

        // Assert
        expect(gymServiceMock.getUserDashboard).toHaveBeenCalledTimes(1);
        expect(gymServiceMock.getAllClasses).toHaveBeenCalledTimes(1);
        expect(gymServiceMock.getUserBookings).toHaveBeenCalledTimes(1);
      });

      test('should logout when logout button clicked', async () => {
        // Arrange
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: {},
            subscription: null
          }
        });
        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        const routerPushSpy = vi.spyOn(router, 'push');

        wrapper = createWrapper();
        await flushPromises();

        // Act
        const logoutButton = wrapper.find('[data-testid="logout-button"]');
        await logoutButton.trigger('click');

        // Assert
        expect(authStore.currentUser.value).toBeNull();
        expect(routerPushSpy).toHaveBeenCalledWith('/login');
      });
    });
  });
});