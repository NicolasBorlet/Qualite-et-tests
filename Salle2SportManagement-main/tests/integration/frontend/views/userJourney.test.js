/**
 * Tests d'intégration - Parcours utilisateur complet
 * Teste le workflow complet d'un utilisateur standard
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { gymServiceMock, apiMockScenarios } from '../../../mocks/frontend/api.mock';
import { createAuthStoreMock, authMockScenarios } from '../../../mocks/frontend/stores/auth.mock';

// Mock des composants Vue (simulation des vrais composants)
const MockLoginView = {
  name: 'LoginView',
  template: `
    <div class="login-view">
      <h1>Connexion</h1>
      <select v-model="selectedEmail" data-testid="user-select">
        <option value="">Sélectionnez un utilisateur</option>
        <option v-for="user in availableUsers" :key="user.id" :value="user.email">
          {{ user.firstname }} {{ user.lastname }} - {{ user.email }}
        </option>
      </select>
      <button @click="handleLogin" data-testid="login-button" :disabled="!selectedEmail">
        Se connecter
      </button>
      <div v-if="error" class="error" data-testid="error-message">{{ error }}</div>
      <div v-if="loading" class="loading" data-testid="loading">Connexion...</div>
    </div>
  `,
  data() {
    return {
      selectedEmail: '',
      availableUsers: [],
      error: null,
      loading: false
    };
  },
  async mounted() {
    try {
      this.availableUsers = await this.$authStore.getAvailableUsers();
    } catch (error) {
      this.error = 'Erreur lors du chargement des utilisateurs';
    }
  },
  methods: {
    async handleLogin() {
      if (!this.selectedEmail) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        await this.$authStore.login(this.selectedEmail);
        this.$router.push('/dashboard');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    }
  }
};

const MockDashboardView = {
  name: 'DashboardView',
  template: `
    <div class="dashboard-view">
      <h1>Dashboard</h1>
      <div v-if="user" class="user-info" data-testid="user-info">
        Bienvenue {{ user.firstname }} {{ user.lastname }}
      </div>
      <div v-if="dashboardData" class="dashboard-content">
        <div class="stats" data-testid="user-stats">
          <p>Réservations totales: {{ dashboardData.stats.totalBookings }}</p>
          <p>Réservations confirmées: {{ dashboardData.stats.confirmedBookings }}</p>
        </div>
        <div class="classes" data-testid="available-classes">
          <h2>Cours disponibles</h2>
          <div v-for="cls in availableClasses" :key="cls.id" class="class-card">
            <h3>{{ cls.title }}</h3>
            <p>Coach: {{ cls.coach }}</p>
            <p>Date: {{ formatDate(cls.datetime) }}</p>
            <p>Places: {{ cls.capacity - cls.bookingsCount }}/{{ cls.capacity }}</p>
            <button 
              @click="bookClass(cls.id)" 
              :disabled="cls.capacity <= cls.bookingsCount"
              :data-testid="'book-' + cls.id"
            >
              {{ cls.capacity <= cls.bookingsCount ? 'Complet' : 'Réserver' }}
            </button>
          </div>
        </div>
        <div class="bookings" data-testid="user-bookings">
          <h2>Mes réservations</h2>
          <div v-for="booking in userBookings" :key="booking.id" class="booking-card">
            <p>{{ booking.class.title }}</p>
            <p>Statut: {{ booking.status }}</p>
            <button 
              v-if="booking.status === 'CONFIRMED' && canCancel(booking.class.datetime)"
              @click="cancelBooking(booking.id)"
              :data-testid="'cancel-' + booking.id"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
      <button @click="handleLogout" data-testid="logout-button">Déconnexion</button>
      <div v-if="error" class="error" data-testid="error-message">{{ error }}</div>
    </div>
  `,
  data() {
    return {
      dashboardData: null,
      availableClasses: [],
      userBookings: [],
      error: null
    };
  },
  computed: {
    user() {
      return this.$authStore.currentUser;
    }
  },
  async mounted() {
    await this.loadDashboardData();
    await this.loadAvailableClasses();
    await this.loadUserBookings();
  },
  methods: {
    async loadDashboardData() {
      try {
        const response = await this.$gymService.getUserDashboard(this.user.id);
        this.dashboardData = response.data;
      } catch (error) {
        this.error = 'Erreur lors du chargement du dashboard';
      }
    },
    
    async loadAvailableClasses() {
      try {
        const response = await this.$gymService.getAllClasses();
        this.availableClasses = response.data.map(cls => ({
          ...cls,
          bookingsCount: 0 // Simplifié pour le test
        }));
      } catch (error) {
        this.error = 'Erreur lors du chargement des cours';
      }
    },
    
    async loadUserBookings() {
      try {
        const response = await this.$gymService.getUserBookings(this.user.id);
        this.userBookings = response.data;
      } catch (error) {
        this.error = 'Erreur lors du chargement des réservations';
      }
    },
    
    async bookClass(classId) {
      try {
        await this.$gymService.createBooking(this.user.id, classId);
        await this.loadUserBookings();
        await this.loadAvailableClasses();
      } catch (error) {
        this.error = error.message;
      }
    },
    
    async cancelBooking(bookingId) {
      try {
        await this.$gymService.cancelBooking(bookingId, this.user.id);
        await this.loadUserBookings();
        await this.loadAvailableClasses();
      } catch (error) {
        this.error = error.message;
      }
    },
    
    canCancel(classDateTime) {
      const now = new Date();
      const classTime = new Date(classDateTime);
      const hoursUntil = (classTime - now) / (1000 * 60 * 60);
      return hoursUntil >= 2;
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    },
    
    handleLogout() {
      this.$authStore.logout();
      this.$router.push('/login');
    }
  }
};

// Configuration du routeur de test
const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', component: MockLoginView },
      { path: '/dashboard', component: MockDashboardView },
      { path: '/', redirect: '/login' }
    ]
  });
};

describe('User Journey - Tests d\'Intégration', () => {
  let router;
  let authStore;
  let pinia;

  beforeEach(() => {
    // Setup Pinia
    pinia = createPinia();
    setActivePinia(pinia);
    
    // Setup Router
    router = createTestRouter();
    
    // Setup Auth Store
    authStore = createAuthStoreMock();
    
    // Reset mocks
    vi.clearAllMocks();
    apiMockScenarios.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. PARCOURS UTILISATEUR STANDARD COMPLET
  // ==========================================
  describe('🎯 Parcours Utilisateur Standard', () => {
    describe('Cas passant', () => {
      test('should complete full user journey: login → dashboard → booking → logout', async () => {
        // Setup des mocks pour un parcours réussi
        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 3, confirmedBookings: 2 },
            subscription: { planType: 'STANDARD', active: true }
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [
            {
              id: 'class-1',
              title: 'Yoga Morning',
              coach: 'Sarah Johnson',
              datetime: '2024-01-16T09:00:00Z',
              capacity: 15
            },
            {
              id: 'class-2',
              title: 'Pilates Evening',
              coach: 'Emma Thompson',
              datetime: '2024-01-16T18:30:00Z',
              capacity: 12
            }
          ]
        });

        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        // 1. ÉTAPE : Accès à la page de login
        await router.push('/login');
        await router.isReady();

        const loginWrapper = mount(MockLoginView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification que la page de login s'affiche
        expect(loginWrapper.find('[data-testid="user-select"]').exists()).toBe(true);
        expect(loginWrapper.find('[data-testid="login-button"]').exists()).toBe(true);

        // 2. ÉTAPE : Sélection et connexion d'un utilisateur
        const userSelect = loginWrapper.find('[data-testid="user-select"]');
        await userSelect.setValue('john.doe@email.com');

        const loginButton = loginWrapper.find('[data-testid="login-button"]');
        await loginButton.trigger('click');
        await flushPromises();

        // Vérification que l'utilisateur est connecté
        expect(authStore.isAuthenticated.value).toBe(true);
        expect(authStore.currentUser.value.email).toBe('john.doe@email.com');

        // 3. ÉTAPE : Navigation vers le dashboard
        await router.push('/dashboard');
        await router.isReady();

        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification que le dashboard s'affiche avec les bonnes données
        expect(dashboardWrapper.find('[data-testid="user-info"]').text()).toContain('Bienvenue John Doe');
        expect(dashboardWrapper.find('[data-testid="user-stats"]').text()).toContain('Réservations totales: 3');
        expect(dashboardWrapper.find('[data-testid="available-classes"]').exists()).toBe(true);

        // 4. ÉTAPE : Réservation d'un cours
        gymServiceMock.createBooking.mockResolvedValue({
          data: {
            id: 'booking-1',
            userId: 'user-1',
            classId: 'class-1',
            status: 'CONFIRMED'
          }
        });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-1',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Yoga Morning',
              datetime: '2024-01-16T09:00:00Z'
            }
          }]
        });

        const bookButton = dashboardWrapper.find('[data-testid="book-class-1"]');
        await bookButton.trigger('click');
        await flushPromises();

        // Vérification que la réservation a été créée
        expect(gymServiceMock.createBooking).toHaveBeenCalledWith('user-1', 'class-1');
        expect(dashboardWrapper.find('[data-testid="user-bookings"]').text()).toContain('Yoga Morning');

        // 5. ÉTAPE : Déconnexion
        const logoutButton = dashboardWrapper.find('[data-testid="logout-button"]');
        await logoutButton.trigger('click');

        // Vérification que l'utilisateur est déconnecté
        expect(authStore.isAuthenticated.value).toBe(false);
        expect(authStore.currentUser.value).toBeNull();
      });

      test('should handle booking cancellation workflow', async () => {
        // Setup utilisateur connecté avec une réservation existante
        authMockScenarios.standardUserLoggedIn(authStore);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 1, confirmedBookings: 1 }
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-1',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Yoga Morning',
              datetime: '2024-01-16T09:00:00Z' // Dans le futur, annulation possible
            }
          }]
        });

        // Mount dashboard
        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification qu'il y a une réservation avec bouton d'annulation
        expect(dashboardWrapper.find('[data-testid="cancel-booking-1"]').exists()).toBe(true);

        // Setup mock pour annulation
        gymServiceMock.cancelBooking.mockResolvedValue({
          data: { id: 'booking-1', status: 'CANCELLED' }
        });

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-1',
            status: 'CANCELLED',
            class: {
              id: 'class-1',
              title: 'Yoga Morning',
              datetime: '2024-01-16T09:00:00Z'
            }
          }]
        });

        // Annulation de la réservation
        const cancelButton = dashboardWrapper.find('[data-testid="cancel-booking-1"]');
        await cancelButton.trigger('click');
        await flushPromises();

        // Vérification que l'annulation a été effectuée
        expect(gymServiceMock.cancelBooking).toHaveBeenCalledWith('booking-1', 'user-1');
      });
    });

    describe('Cas non passant', () => {
      test('should handle login failure gracefully', async () => {
        // Mount login page
        const loginWrapper = mount(MockLoginView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Tentative de connexion avec email invalide
        const userSelect = loginWrapper.find('[data-testid="user-select"]');
        await userSelect.setValue('invalid@email.com');

        const loginButton = loginWrapper.find('[data-testid="login-button"]');
        await loginButton.trigger('click');
        await flushPromises();

        // Vérification que l'erreur est affichée
        expect(loginWrapper.find('[data-testid="error-message"]').exists()).toBe(true);
        expect(loginWrapper.find('[data-testid="error-message"]').text()).toContain('User not found');

        // Vérification que l'utilisateur n'est pas connecté
        expect(authStore.isAuthenticated.value).toBe(false);
      });

      test('should handle API errors gracefully in dashboard', async () => {
        // Setup utilisateur connecté
        authMockScenarios.standardUserLoggedIn(authStore);

        // Simulation d'erreur API
        gymServiceMock.getUserDashboard.mockRejectedValue(new Error('API Error'));
        gymServiceMock.getAllClasses.mockRejectedValue(new Error('Classes unavailable'));
        gymServiceMock.getUserBookings.mockRejectedValue(new Error('Bookings unavailable'));

        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification que les erreurs sont gérées
        expect(dashboardWrapper.find('[data-testid="error-message"]').exists()).toBe(true);
      });

      test('should handle booking failure (class full)', async () => {
        // Setup utilisateur connecté
        authMockScenarios.standardUserLoggedIn(authStore);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 0, confirmedBookings: 0 }
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({
          data: [{
            id: 'class-1',
            title: 'Popular Class',
            coach: 'Coach',
            datetime: '2024-01-16T09:00:00Z',
            capacity: 10
          }]
        });

        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Simulation d'une erreur de cours complet
        const error = new Error('Class is full');
        error.response = { status: 409, data: { error: 'Class is full' } };
        gymServiceMock.createBooking.mockRejectedValue(error);

        const bookButton = dashboardWrapper.find('[data-testid="book-class-1"]');
        await bookButton.trigger('click');
        await flushPromises();

        // Vérification que l'erreur est affichée
        expect(dashboardWrapper.find('[data-testid="error-message"]').text()).toContain('Class is full');
      });
    });

    describe('Cas limite', () => {
      test('should handle user without subscription', async () => {
        // Setup utilisateur sans abonnement
        authMockScenarios.standardUserLoggedIn(authStore);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 0, confirmedBookings: 0 },
            subscription: null
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });
        gymServiceMock.getUserBookings.mockResolvedValue({ data: [] });

        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification que le dashboard s'affiche même sans abonnement
        expect(dashboardWrapper.find('[data-testid="user-info"]').exists()).toBe(true);
        expect(dashboardWrapper.find('[data-testid="user-stats"]').text()).toContain('Réservations totales: 0');
      });

      test('should handle late cancellation (NO_SHOW)', async () => {
        // Setup utilisateur avec réservation tardive
        authMockScenarios.standardUserLoggedIn(authStore);

        gymServiceMock.getUserDashboard.mockResolvedValue({
          data: {
            user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
            stats: { totalBookings: 1, confirmedBookings: 1 }
          }
        });

        gymServiceMock.getAllClasses.mockResolvedValue({ data: [] });

        // Cours dans 1h (trop tard pour annuler)
        const soonClass = new Date();
        soonClass.setHours(soonClass.getHours() + 1);

        gymServiceMock.getUserBookings.mockResolvedValue({
          data: [{
            id: 'booking-1',
            status: 'CONFIRMED',
            class: {
              id: 'class-1',
              title: 'Yoga Soon',
              datetime: soonClass.toISOString()
            }
          }]
        });

        const dashboardWrapper = mount(MockDashboardView, {
          global: {
            plugins: [router, pinia],
            provide: {
              $authStore: authStore,
              $gymService: gymServiceMock
            }
          }
        });

        await flushPromises();

        // Vérification qu'il n'y a pas de bouton d'annulation (trop tard)
        expect(dashboardWrapper.find('[data-testid="cancel-booking-1"]').exists()).toBe(false);
      });
    });
  });
});