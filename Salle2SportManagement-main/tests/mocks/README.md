# Guide des Mocks - Système de Gestion de Salle de Sport

Ce dossier contient tous les mocks, stubs, fakes et utilitaires nécessaires pour les tests du système de gestion de salle de sport.

## 📁 Structure des Dossiers

```
tests/mocks/
├── backend/                 # Mocks pour les tests backend
│   ├── prisma.mock.js      # Mock complet du client Prisma
│   ├── services/           # Mocks des services métier
│   │   ├── booking.mock.js # Mock du service de réservation
│   │   └── subscription.mock.js # Mock du service d'abonnement
│   └── repositories/       # Mocks des repositories (si nécessaire)
├── frontend/               # Mocks pour les tests frontend
│   ├── api.mock.js        # Mock du client API et services
│   ├── stores/            # Mocks des stores Pinia
│   └── components/        # Mocks de composants Vue
├── fixtures/              # Données de test statiques
│   ├── users.js          # Utilisateurs de test
│   ├── classes.js        # Cours de test
│   ├── bookings.js       # Réservations de test
│   └── subscriptions.js  # Abonnements de test
├── factories/             # Générateurs de données dynamiques
│   ├── user.factory.js   # Factory pour utilisateurs
│   ├── class.factory.js  # Factory pour cours
│   └── booking.factory.js # Factory pour réservations
└── utils/                 # Utilitaires de mocking
    ├── time.mock.js      # Mock du temps/dates
    ├── db-setup.js       # Configuration base de données test
    └── test-helpers.js   # Helpers communs
```

## 🎯 Types de Mocks par Couche

### Tests Unitaires Backend

#### Mock Prisma (`backend/prisma.mock.js`)
```javascript
const { prismaMock, mockHelpers } = require('./mocks/backend/prisma.mock');

beforeEach(() => {
  mockHelpers.resetAll();
});

// Test avec données simulées
test('should create user', async () => {
  prismaMock.user.create.mockResolvedValue({
    id: 'user-1',
    email: 'test@example.com'
  });
  
  const result = await userService.createUser(userData);
  expect(result.email).toBe('test@example.com');
});
```

#### Mock Services (`backend/services/`)
```javascript
const { bookingServiceMock, mockScenarios } = require('./mocks/backend/services/booking.mock');

test('should handle full class', async () => {
  mockScenarios.fullClass();
  
  await expect(
    bookingController.createBooking(req, res)
  ).rejects.toThrow('Class is full');
});
```

### Tests d'Intégration Backend

#### Base de Données Réelle
```javascript
const { testDbManager } = require('./mocks/utils/db-setup');

beforeAll(async () => {
  await testDbManager.setup();
});

afterAll(async () => {
  await testDbManager.cleanup();
});

beforeEach(async () => {
  await testDbManager.clearAllData();
});
```

### Tests Frontend

#### Mock API (`frontend/api.mock.js`)
```javascript
const { gymServiceMock, apiMockScenarios } = require('./mocks/frontend/api.mock');

test('should handle network error', async () => {
  apiMockScenarios.networkErrors();
  
  await expect(
    gymService.getAllClasses()
  ).rejects.toThrow('Network Error');
});
```

## 🔧 Utilitaires Disponibles

### Mock du Temps (`utils/time.mock.js`)
```javascript
const { timeMock, timeUtils, timeScenarios } = require('./mocks/utils/time.mock');

test('should handle cancellation deadline', () => {
  timeMock.enable('2024-01-15T14:30:00Z');
  
  const { classTime, canCancel } = timeScenarios.noShowClass();
  expect(canCancel).toBe(false);
  
  timeMock.disable();
});
```

### Helpers de Test (`utils/test-helpers.js`)
```javascript
const { dataHelpers, assertionHelpers } = require('./mocks/utils/test-helpers');

beforeEach(() => {
  dataHelpers.setupTestEnvironment();
});

afterEach(() => {
  dataHelpers.cleanupTestEnvironment();
});

test('should create user correctly', async () => {
  const user = await userService.create(userData);
  assertionHelpers.assertUserCreated(user, userData);
});
```

### Factories (`factories/`)
```javascript
const { UserFactory } = require('./mocks/factories/user.factory');

test('should work with different user types', () => {
  const admin = UserFactory.createAdmin();
  const student = UserFactory.createStudent();
  const loyalUser = UserFactory.createLoyalUser();
  
  expect(admin.role).toBe('ADMIN');
  expect(student.email).toContain('univ.edu');
});
```

## 📋 Scénarios de Test Prédéfinis

### Scénarios de Réservation
```javascript
const { mockScenarios } = require('./mocks/backend/services/booking.mock');

// Cours complet
mockScenarios.fullClass();

// Conflit de créneaux
mockScenarios.timeConflict();

// Annulation tardive (no-show)
mockScenarios.lateCancel();

// Réservation existante
mockScenarios.existingBooking();
```

### Scénarios d'Abonnement
```javascript
const { mockScenarios } = require('./mocks/backend/services/subscription.mock');

// Utilisateur premium avec remise
mockScenarios.premiumWithLoyalty();

// Étudiant avec pénalités
mockScenarios.studentWithPenalties();

// Pas d'abonnement
mockScenarios.noSubscription();
```

### Scénarios API Frontend
```javascript
const { apiMockScenarios } = require('./mocks/frontend/api.mock');

// Erreurs réseau
apiMockScenarios.networkErrors();

// Erreurs de validation
apiMockScenarios.validationErrors();

// Erreurs d'autorisation
apiMockScenarios.authorizationErrors();
```

## 🎯 Patterns d'Usage

### Test Unitaire avec Mock Complet
```javascript
const { prismaMock, mockHelpers } = require('./mocks/backend/prisma.mock');
const { timeMock } = require('./mocks/utils/time.mock');

describe('BookingService', () => {
  beforeEach(() => {
    mockHelpers.resetAll();
    timeMock.enable('2024-01-15T14:30:00Z');
  });

  afterEach(() => {
    timeMock.disable();
  });

  test('should create booking successfully', async () => {
    // Arrange
    const userData = { id: 'user-1' };
    const classData = { id: 'class-1', capacity: 15 };
    
    prismaMock.user.findUnique.mockResolvedValue(userData);
    prismaMock.class.findUnique.mockResolvedValue(classData);
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.booking.count.mockResolvedValue(10);
    prismaMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      classId: 'class-1',
      status: 'CONFIRMED'
    });

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
```

### Test d'Intégration avec Base Réelle
```javascript
const { testDbManager } = require('./mocks/utils/db-setup');
const { UserFactory } = require('./mocks/factories/user.factory');

describe('User API Integration', () => {
  beforeAll(async () => {
    await testDbManager.setup();
  });

  afterAll(async () => {
    await testDbManager.cleanup();
  });

  beforeEach(async () => {
    await testDbManager.clearAllData();
  });

  test('should create user via API', async () => {
    // Arrange
    const userData = UserFactory.create();
    
    // Act
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    // Assert
    expect(response.body.email).toBe(userData.email);
    
    // Vérification en base
    const userInDb = await prisma.user.findUnique({
      where: { id: response.body.id }
    });
    expect(userInDb).toBeTruthy();
  });
});
```

### Test Frontend avec Mock API
```javascript
const { mount } = require('@vue/test-utils');
const { gymServiceMock } = require('./mocks/frontend/api.mock');

describe('DashboardView', () => {
  beforeEach(() => {
    gymServiceMock.getUserDashboard.mockResolvedValue({
      data: {
        user: { firstname: 'Test', lastname: 'User' },
        stats: { totalBookings: 5 }
      }
    });
  });

  test('should display user dashboard', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        mocks: {
          $gymService: gymServiceMock
        }
      }
    });

    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('Test User');
    expect(wrapper.text()).toContain('5');
  });
});
```

## 🔄 Maintenance des Mocks

### Synchronisation avec l'API Réelle
- Les mocks doivent être mis à jour lors des changements d'API
- Utiliser des tests "contract" pour vérifier la cohérence
- Documenter les comportements mockés

### Bonnes Pratiques
1. **Simplicité** : Mocks simples et compréhensibles
2. **Réalisme** : Comportement proche de la réalité
3. **Maintenance** : Mocks faciles à maintenir
4. **Performance** : Plus rapides que les vraies implémentations
5. **Isolation** : Chaque test indépendant

### Validation des Mocks
```javascript
// Test que le mock se comporte comme la vraie implémentation
describe('Mock Validation', () => {
  test('prisma mock should match real behavior', () => {
    // Valide que le mock a les mêmes méthodes que Prisma
    expect(prismaMock.user.create).toBeDefined();
    expect(prismaMock.user.findMany).toBeDefined();
    // ... autres validations
  });
});
```

Cette architecture de mocks permet une couverture de test complète tout en maintenant des tests rapides et fiables.