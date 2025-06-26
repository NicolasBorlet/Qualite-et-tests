# Tests d'Intégration - Système de Gestion de Salle de Sport

## 🎯 Objectif des Tests d'Intégration

Les tests d'intégration valident que les différents composants du système fonctionnent correctement ensemble. Ils testent les workflows complets avec des dépendances réelles (base de données, API, etc.).

## 📁 Structure

```
tests/integration/
├── backend/                   # Tests d'intégration backend
│   ├── api/                  # Tests des endpoints API
│   │   ├── bookingRoutes.test.js     # Routes de réservation
│   │   ├── userRoutes.test.js        # Routes utilisateur
│   │   ├── classRoutes.test.js       # Routes de cours
│   │   └── authRoutes.test.js        # Routes d'authentification
│   ├── workflows/            # Tests de workflows métier
│   │   ├── bookingWorkflow.test.js   # Processus de réservation complet
│   │   ├── billingWorkflow.test.js   # Processus de facturation
│   │   └── adminWorkflow.test.js     # Processus d'administration
│   └── database/             # Tests de persistance
│       └── prismaIntegration.test.js # Intégration Prisma/PostgreSQL
└── frontend/                 # Tests d'intégration frontend
    ├── views/               # Tests des vues complètes
    │   ├── userJourney.test.js       # Parcours utilisateur complet
    │   └── adminJourney.test.js      # Parcours administrateur
    └── api/                 # Tests d'intégration API
        └── apiIntegration.test.js    # Communication frontend-backend
```

## 🎯 Workflows Critiques Testés

### Backend (5+ workflows)

#### 1. 📝 **Processus de Réservation Complet** (`bookingWorkflow.test.js`)
**Workflow** : Login → Sélection cours → Validation → Création réservation → Confirmation
- **Cas passant** : Utilisateur valide + cours disponible → Réservation confirmée
- **Cas non passant** : Cours complet → Erreur 409 + message explicite
- **Cas limite** : Dernière place disponible → Réservation réussie + capacité atteinte

#### 2. 💰 **Processus de Facturation Mensuelle** (`billingWorkflow.test.js`)
**Workflow** : Calcul base → Remise fidélité → Pénalités no-show → Facture finale
- **Cas passant** : Abonnement premium + fidèle → Prix avec remise
- **Cas non passant** : Utilisateur sans abonnement → Erreur facturation
- **Cas limite** : Exactement 6 mois d'ancienneté → Application remise

#### 3. 🔄 **Workflow d'Annulation Intelligent** (`bookingWorkflow.test.js`)
**Workflow** : Vérification délai → Calcul pénalité → Mise à jour statut → Notification
- **Cas passant** : Annulation 4h avant → Statut CANCELLED
- **Cas non passant** : Annulation 1h avant → Statut NO_SHOW + pénalité
- **Cas limite** : Annulation exactement 2h → Comportement défini

#### 4. 👥 **Gestion Administrative Complète** (`adminWorkflow.test.js`)
**Workflow** : Auth admin → Création cours → Gestion utilisateurs → Statistiques
- **Cas passant** : Admin authentifié → Toutes opérations autorisées
- **Cas non passant** : Utilisateur standard → Accès refusé 403
- **Cas limite** : Admin créant cours passé → Validation temporelle

#### 5. 📊 **Génération Dashboard Temps Réel** (`dashboardWorkflow.test.js`)
**Workflow** : Agrégation données → Calculs KPI → Formatage → Mise en cache
- **Cas passant** : Données complètes → Dashboard précis
- **Cas non passant** : Base vide → Valeurs par défaut
- **Cas limite** : Gros volume de données → Performance maintenue

### Frontend (3+ parcours)

#### 1. 🎯 **Parcours Utilisateur Standard** (`userJourney.test.js`)
**Parcours** : Login → Dashboard → Réservation → Profil → Logout
- **Cas passant** : Navigation fluide avec données
- **Cas non passant** : Erreurs API gérées gracieusement
- **Cas limite** : Utilisateur sans historique → Interface adaptée

#### 2. 🛠️ **Parcours Administrateur** (`adminJourney.test.js`)
**Parcours** : Login admin → Dashboard admin → Gestion → Création → Statistiques
- **Cas passant** : Fonctionnalités admin accessibles
- **Cas non passant** : Accès non autorisé → Redirection
- **Cas limite** : Volume important de données → Interface réactive

#### 3. 🔌 **Intégration API Complète** (`apiIntegration.test.js`)
**Workflow** : Requêtes CRUD → Gestion erreurs → Retry → Cache
- **Cas passant** : Communication normale avec backend
- **Cas non passant** : Backend indisponible → Fallback
- **Cas limite** : Timeout réseau → Retry automatique

## 🗄️ Environnement de Test

### Base de Données de Test
```javascript
// Configuration PostgreSQL dédiée
const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5434,                    // Port isolé
  database: 'gym_test',          // Base dédiée
  isolation: 'transaction'       // Isolation par transaction
};
```

### Setup d'Intégration
```javascript
beforeAll(async () => {
  await testDb.setup();           // Migration + seed
  await app.start();              // Serveur de test
});

beforeEach(async () => {
  await testDb.cleanData();       // Reset données
  await testDb.seedBasicData();   // Données minimales
});

afterAll(async () => {
  await app.stop();               // Arrêt serveur
  await testDb.cleanup();         // Nettoyage complet
});
```

## 🔧 Outils et Technologies

### Backend
- **Framework** : Jest + Supertest pour API
- **Base de données** : PostgreSQL test + Prisma
- **Serveur** : Instance Express dédiée
- **Isolation** : Transactions rollback automatique

### Frontend
- **Framework** : Vitest + Testing Library
- **Mock serveur** : MSW (Mock Service Worker)
- **Navigation** : Vue Router test mode
- **State** : Pinia avec reset automatique

### Infrastructure
- **Docker** : Services isolés pour tests
- **CI/CD** : Exécution parallèle des tests
- **Coverage** : Rapport de couverture intégré

## 📋 Standards de Test d'Intégration

### Structure d'un Test
```javascript
describe('Workflow Name Integration', () => {
  beforeAll(async () => {
    await setupIntegrationEnvironment();
  });

  afterAll(async () => {
    await cleanupIntegrationEnvironment();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('Complete workflow', () => {
    test('should handle end-to-end process', async () => {
      // Arrange : Setup realistic data
      // Act : Execute complete workflow
      // Assert : Verify end-to-end behavior
    });
  });
});
```

### Données de Test Réalistes
```javascript
const integrationTestData = {
  users: [
    // Utilisateurs avec profils complets
    { id: 'int-user-1', subscription: 'PREMIUM', history: [...] }
  ],
  classes: [
    // Cours avec horaires réalistes
    { datetime: futureDate(), capacity: 15, bookings: [...] }
  ],
  bookings: [
    // Réservations avec statuts variés
    { status: 'CONFIRMED', createdAt: pastDate() }
  ]
};
```

## 🎯 Objectifs de Couverture

### Backend Integration
- **API Endpoints** : 100% des routes critiques
- **Business Workflows** : Tous les processus métier principaux
- **Database Operations** : CRUD + contraintes + transactions
- **Error Handling** : Propagation d'erreurs complète

### Frontend Integration
- **User Journeys** : Parcours utilisateur complets
- **API Communication** : Tous les appels backend
- **State Management** : Flux de données complet
- **Error Boundaries** : Gestion d'erreurs globale

## ⚡ Performance et Fiabilité

### Critères de Performance
- **API Response Time** : < 500ms pour 95% des requêtes
- **Database Queries** : < 100ms pour requêtes simples
- **End-to-End Tests** : < 5s par test complet
- **Parallel Execution** : Tests indépendants

### Fiabilité
- **Isolation** : Chaque test complètement isolé
- **Idempotence** : Résultats reproductibles
- **Cleanup** : Nettoyage automatique garanti
- **Rollback** : État initial restauré après chaque test

## 🚨 Gestion des Erreurs

### Scenarios d'Erreur Testés
- **Network Failures** : Timeout, connexion refusée
- **Database Errors** : Contraintes, deadlocks
- **Business Logic Errors** : Règles métier violées
- **Authentication Errors** : Sessions expirées, accès non autorisé

### Stratégies de Recovery
- **Graceful Degradation** : Fonctionnalités limitées mais utilisables
- **Retry Mechanisms** : Tentatives automatiques
- **User Feedback** : Messages d'erreur explicites
- **Logging** : Traçabilité complète des erreurs

## 🔍 Monitoring et Debug

### Outils de Debug
- **Database Queries** : Log des requêtes SQL
- **API Calls** : Trace des appels HTTP
- **State Changes** : Évolution du state application
- **Performance Metrics** : Temps d'exécution détaillés

### Reporting
- **Coverage Reports** : Couverture par fonctionnalité
- **Performance Reports** : Métriques de performance
- **Error Reports** : Analyse des échecs
- **Trend Analysis** : Évolution de la qualité