# Stratégie de Tests - Système de Gestion de Salle de Sport

## 1. Introduction

### Présentation de l'application
Cette application de gestion de salle de sport est un système fullstack permettant la gestion complète des adhérents, des cours, des réservations et des abonnements. Elle comporte deux interfaces distinctes : une interface utilisateur pour la réservation de cours et une interface administrateur pour la gestion complète du système.

### Enjeux fonctionnels critiques
- **Gestion financière** : Calcul des abonnements, pénalités, remises loyauté
- **Capacité et disponibilité** : Gestion des créneaux, limites de capacité
- **Intégrité des données** : Cohérence entre utilisateurs, réservations et cours
- **Règles métier** : Politiques d'annulation, gestion des no-shows, conflits horaires

### Objectifs de la stratégie de test
- Garantir la fiabilité des processus de réservation et de facturation
- Assurer la robustesse du système face aux erreurs utilisateur
- Valider la cohérence des données et la conformité aux règles métier
- Vérifier la performance et la sécurité de l'application

## 2. Identification des Fonctionnalités Critiques

### Criticité FORTE
1. **Système de réservation** (`BookingService`)
   - Création de réservations avec vérification de capacité
   - Gestion des conflits horaires
   - Règles d'annulation (2h avant le cours)
   - Marquage automatique des no-shows

2. **Calcul de facturation** (`SubscriptionService`)
   - Tarification par type d'abonnement (STANDARD: 39.99€, PREMIUM: 59.99€, ETUDIANT: 29.99€)
   - Remise fidélité (10% après 6 mois)
   - Pénalités no-show (15% si >5 no-shows/mois)

3. **Gestion des capacités** (`ClassService`)
   - Vérification de la disponibilité des places
   - Gestion des cours complets
   - Prévention du surbooking

### Criticité MOYENNE
4. **Authentification et autorisation**
   - Connexion utilisateur
   - Contrôle d'accès admin/utilisateur
   - Persistance des sessions

5. **Gestion des utilisateurs** (`UserService`)
   - Création/modification des profils
   - Validation de l'unicité des emails
   - Gestion des rôles

6. **Interface utilisateur réactive**
   - Mise à jour temps réel des disponibilités
   - Gestion des états de chargement
   - Affichage des erreurs

### Criticité FAIBLE
7. **Fonctionnalités de reporting**
   - Tableaux de bord utilisateur/admin
   - Statistiques d'utilisation
   - Purge des anciens cours

## 3. Couverture par Typologie de Test

### Tests Unitaires (TU)
**Objectif** : Valider la logique métier isolée

**Fonctionnalités testées** :
- **Services Backend** : Toutes les méthodes de `BookingService`, `SubscriptionService`, `ClassService`
- **Calculs de facturation** : Algorithmes de pricing, remises, pénalités
- **Validations métier** : Contraintes temporelles, règles d'annulation
- **Utilitaires** : Formatage des données, transformations

**Outils** : Jest + Supertest pour Node.js
**Justification** : Ces composants contiennent la logique métier critique et doivent être testés de manière isolée pour garantir leur fiabilité.

**Exclusions volontaires** :
- Contrôleurs simples (delegation vers services)
- Repositories Prisma (déjà testés par l'ORM)
- Configuration et middleware Express basiques

### Tests d'Intégration (TI)
**Objectif** : Valider les interactions entre composants

**Fonctionnalités testées** :
- **API Endpoints** : Chaîne complète Controller → Service → Repository
- **Base de données** : Transactions, contraintes, relations
- **Workflows complexes** : Processus de réservation complet
- **Gestion d'erreurs** : Propagation et mapping des erreurs

**Outils** : Jest + Base de données de test PostgreSQL
**Justification** : Les workflows de réservation impliquent plusieurs services et la base de données. Les tests d'intégration garantissent que ces interactions fonctionnent correctement.

**Exclusions volontaires** :
- Intégrations avec des services externes (non présents)
- Tests de performance de base de données (couverts par les tests de charge)

### Tests End-to-End (E2E)
**Objectif** : Valider les parcours utilisateur complets

**Fonctionnalités testées** :
- **Parcours de réservation** : Connexion → Sélection cours → Réservation → Confirmation
- **Parcours d'annulation** : Annulation dans les temps vs no-show
- **Parcours administrateur** : Gestion des utilisateurs, cours, réservations
- **Gestion des erreurs** : Messages d'erreur utilisateur, états d'échec

**Outils** : Playwright + Docker Compose
**Justification** : Ces parcours représentent la valeur métier principale et doivent être testés dans leur intégralité pour garantir l'expérience utilisateur.

**Exclusions volontaires** :
- Parcours de récupération de mot de passe (non implémenté)
- Tests sur tous les navigateurs (focus sur Chrome/Firefox)

### Tests de Charge
**Objectif** : Valider les performances sous charge

**Fonctionnalités testées** :
- **Endpoint de réservation** : Montée en charge sur la création de réservations
- **Dashboard admin** : Performance des agrégations de données
- **Requêtes concurrentes** : Gestion des réservations simultanées sur le même cours

**Outils** : Artillery ou k6
**Justification** : Le système de réservation doit gérer la concurrence (plusieurs utilisateurs réservant le même cours) et supporter la charge d'une salle de sport active.

**Exclusions volontaires** :
- Tests de charge sur l'authentification (workflow simple)
- Performance de la base de données (responsabilité de PostgreSQL)

### Tests de Sécurité
**Objectif** : Identifier les vulnérabilités de sécurité

**Fonctionnalités testées** :
- **Injection SQL** : Validation des inputs utilisateur
- **Autorisation** : Accès aux ressources selon les rôles
- **Validation des données** : Prévention des injections XSS
- **Authentification** : Robustesse du système de login

**Outils** : OWASP ZAP + tests manuels
**Justification** : L'application gère des données personnelles et financières, nécessitant une sécurité robuste.

**Exclusions volontaires** :
- Tests de pénétration avancés (hors scope)
- Audit de sécurité de l'infrastructure Docker

## 4. Approche par Couche

### Backend (Node.js/Express)
**Tests prioritaires** :
- **Tests unitaires** : Services métier (80% de couverture visée)
- **Tests d'intégration** : API + Base de données
- **Tests de charge** : Endpoints critiques

**Spécificités backend** :
- Validation Prisma avec base de données réelle
- Mock des dépendances externes
- Tests de régression sur les migrations

### Frontend (Vue.js)
**Tests prioritaires** :
- **Tests unitaires** : Composants Vue, stores Pinia
- **Tests d'intégration** : Services API
- **Tests E2E** : Parcours utilisateur complets

**Spécificités frontend** :
- Tests de réactivité Vue.js
- Validation du state management Pinia
- Tests d'accessibilité de base

## 5. Planification et Priorisation

### Phase 1 : Fondations (Semaine 1)
1. **Setup de l'environnement de test**
   - Configuration Jest pour backend
   - Configuration Vitest pour frontend
   - Base de données de test PostgreSQL

2. **Tests unitaires critiques**
   - `BookingService` : Logique de réservation
   - `SubscriptionService` : Calculs de facturation
   - `ClassService` : Gestion des capacités

### Phase 2 : Intégration (Semaine 2)
3. **Tests d'intégration backend**
   - API de réservation complète
   - Workflows de gestion admin
   - Gestion d'erreurs

4. **Tests unitaires frontend**
   - Composants critiques (Dashboard, Admin)
   - Stores Pinia
   - Services API

### Phase 3 : Parcours utilisateur (Semaine 3)
5. **Tests E2E**
   - Parcours de réservation
   - Parcours d'administration
   - Gestion des erreurs utilisateur

### Phase 4 : Performance et sécurité (Semaine 4)
6. **Tests de charge**
   - Endpoint de réservation
   - Dashboard admin
   - Concurrence sur les cours

7. **Tests de sécurité**
   - Validation des inputs
   - Contrôle d'accès
   - Audit de sécurité

## 6. Indicateurs de Succès

### Couverture de code
- **Backend** : 80% minimum sur les services métier
- **Frontend** : 70% minimum sur les composants et stores
- **API** : 90% des endpoints couverts par les tests d'intégration

### Performance
- **Temps de réponse** : <500ms pour les endpoints de réservation
- **Charge** : Support de 50 utilisateurs simultanés
- **Disponibilité** : 99.5% de uptime

### Qualité
- **Zéro régression** : Tous les tests passent avant chaque déploiement
- **Détection des bugs** : 90% des bugs détectés avant la production
- **Maintenance** : Temps de correction <2h pour les bugs critiques

### Sécurité
- **Zéro vulnérabilité critique** : Aucune faille de sécurité majeure
- **Validation des données** : 100% des inputs utilisateur validés
- **Contrôle d'accès** : Tous les endpoints protégés selon les rôles

## 7. Carte de Couverture Prévisionnelle

```
Système de Gestion de Salle de Sport
├── Backend (Node.js/Express) - 80% couverture
│   ├── Services métier ████████████████ 100% (TU)
│   ├── API Endpoints ████████████████ 90% (TI)
│   ├── Base de données ████████████████ 85% (TI)
│   └── Middleware ████████ 60% (TI)
│
├── Frontend (Vue.js) - 70% couverture
│   ├── Composants Vue ████████████████ 80% (TU)
│   ├── Stores Pinia ████████████████ 90% (TU)
│   ├── Services API ████████████████ 85% (TI)
│   └── Router ████████ 60% (TI)
│
├── Parcours utilisateur - 90% couverture
│   ├── Réservation ████████████████ 100% (E2E)
│   ├── Administration ████████████████ 90% (E2E)
│   └── Gestion erreurs ████████████████ 85% (E2E)
│
├── Performance - Tests ciblés
│   ├── Réservation ████████████████ 100% (Charge)
│   ├── Dashboard ████████████████ 90% (Charge)
│   └── Concurrence ████████████████ 100% (Charge)
│
└── Sécurité - Audit complet
    ├── Injection ████████████████ 100% (Sécurité)
    ├── Autorisation ████████████████ 100% (Sécurité)
    └── Validation ████████████████ 100% (Sécurité)
```

Cette stratégie assure une couverture complète des fonctionnalités critiques tout en optimisant les efforts de test selon les risques métier identifiés.

## 8. Stratégie de Mocking

### Objectif du Mocking
Le mocking permet d'isoler les unités de code testées en remplaçant leurs dépendances par des implémentations contrôlées. Cette approche garantit des tests rapides, déterministes et focalisés sur la logique métier.

### Classification des Dépendances à Mocker

#### 8.1 Mocks (Comportement simulé)
**Base de données Prisma** - Tests Unitaires
- **Justification** : Les tests unitaires doivent être isolés de la base de données pour rester rapides et déterministes
- **Approche** : Mock complet du client Prisma avec simulation des méthodes CRUD
- **Implémentation** : `tests/mocks/prisma.mock.js`

**Services externes** - Tests Unitaires et Intégration
- **Justification** : Éviter les dépendances externes imprévisibles
- **Approche** : Mock des services avec comportements préprogrammés
- **Implémentation** : `tests/mocks/services/`

#### 8.2 Stubs (Données prédéfinies)
**API Responses** - Tests Frontend
- **Justification** : Contrôler les réponses HTTP pour tester tous les scénarios
- **Approche** : Stubbing des appels axios avec MSW (Mock Service Worker)
- **Implémentation** : `tests/mocks/api/`

**Date/Time** - Tests avec logique temporelle
- **Justification** : Tests déterministes des règles d'annulation et no-shows
- **Approche** : Stubbing de `Date.now()` et méthodes temporelles
- **Implémentation** : `tests/mocks/time.mock.js`

#### 8.3 Fakes (Implémentations légères)
**Base de données** - Tests d'Intégration
- **Justification** : Tests d'intégration nécessitent une vraie persistance mais isolée
- **Approche** : Base de données PostgreSQL dédiée aux tests
- **Implémentation** : Configuration Docker + scripts de setup

**LocalStorage** - Tests Frontend
- **Justification** : Tester la persistance des sessions sans navigateur réel
- **Approche** : Fake localStorage en mémoire
- **Implémentation** : `tests/mocks/storage.fake.js`

### 8.4 Mocks par Couche

#### Backend - Tests Unitaires
```javascript
// Prisma Client Mock
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  booking: { /* méthodes similaires */ },
  class: { /* méthodes similaires */ },
  subscription: { /* méthodes similaires */ }
}
```

#### Backend - Tests d'Intégration
```javascript
// Base de données de test réelle
// Configuration dans docker-compose.test.yml
// Scripts de migration et seeding dédiés
```

#### Frontend - Tests Unitaires
```javascript
// API Service Mock
const apiMock = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}

// Pinia Store Mock
const authStoreMock = {
  currentUser: ref(null),
  isAuthenticated: computed(() => false),
  login: jest.fn(),
  logout: jest.fn()
}
```

#### Frontend - Tests d'Intégration
```javascript
// MSW pour intercepter les requêtes HTTP
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/classes', (req, res, ctx) => {
    return res(ctx.json(mockClasses))
  })
)
```

### 8.5 Justification des Choix de Mock/Stub/Fake

#### Pourquoi Mock Prisma en TU ?
- **Performance** : Tests instantanés vs connexions DB
- **Isolation** : Focus sur la logique métier uniquement
- **Déterminisme** : Contrôle total des données de test
- **Parallélisation** : Pas de conflits entre tests simultanés

#### Pourquoi Fake DB en TI ?
- **Réalisme** : Validation des requêtes SQL et contraintes
- **Intégrité** : Test des transactions et relations
- **Performance** : Plus rapide qu'une DB de production
- **Isolation** : Environnement dédié aux tests

#### Pourquoi Stub API en Frontend ?
- **Contrôle** : Simulation de tous les cas d'erreur
- **Rapidité** : Pas de réseau impliqué
- **Fiabilité** : Pas de dépendance au backend
- **Scénarios** : Test des timeouts, erreurs 500, etc.

### 8.6 Exclusions Volontaires

#### Ne PAS mocker
- **Express framework** : Partie intégrante de l'architecture
- **Vue.js reactivity** : Core framework à tester réellement
- **Node.js built-ins** : `fs`, `path`, etc. (sauf cas spécifiques)
- **Prisma schema validation** : Logique métier importante

#### Justifications des exclusions
- **Frameworks** : Leur fonctionnement est déjà testé par leurs mainteneurs
- **Built-ins** : Stable et fiable, mock apporterait peu de valeur
- **Validations** : Partie critique de l'intégrité des données

### 8.7 Outils et Technologies

#### Backend
- **Jest** : Framework de test principal
- **jest-mock-extended** : Mocks typés pour TypeScript
- **supertest** : Tests d'API HTTP
- **testcontainers** : Base de données Docker pour TI

#### Frontend
- **Vitest** : Framework de test Vue.js
- **@vue/test-utils** : Utilitaires de test Vue
- **MSW** : Mock Service Worker pour API
- **fake-indexeddb** : Mock du storage navigateur

### 8.8 Structure des Mocks

```
tests/
├── mocks/
│   ├── backend/
│   │   ├── prisma.mock.js          # Mock client Prisma
│   │   ├── services/               # Mocks des services
│   │   │   ├── booking.mock.js
│   │   │   ├── user.mock.js
│   │   │   └── class.mock.js
│   │   └── repositories/           # Mocks des repositories
│   ├── frontend/
│   │   ├── api.mock.js             # Mock client API
│   │   ├── stores/                 # Mocks des stores Pinia
│   │   └── components/             # Mocks de composants
│   ├── fixtures/                   # Données de test
│   │   ├── users.js
│   │   ├── classes.js
│   │   ├── bookings.js
│   │   └── subscriptions.js
│   ├── factories/                  # Générateurs de données
│   │   ├── user.factory.js
│   │   ├── class.factory.js
│   │   └── booking.factory.js
│   └── utils/                      # Utilitaires de test
│       ├── db-setup.js
│       ├── time.mock.js
│       └── test-helpers.js
```

### 8.9 Maintenance des Mocks

#### Principes de maintenance
- **Synchronisation** : Mocks alignés avec les vraies implémentations
- **Évolution** : Mise à jour lors des changements d'API
- **Documentation** : Chaque mock documenté avec son usage
- **Validation** : Tests des mocks eux-mêmes si complexes

#### Indicateurs de qualité
- **Cohérence** : Comportement mock = comportement réel
- **Couverture** : Tous les cas d'usage mockés
- **Performance** : Mocks plus rapides que les vraies implémentations
- **Simplicité** : Mocks simples et compréhensibles