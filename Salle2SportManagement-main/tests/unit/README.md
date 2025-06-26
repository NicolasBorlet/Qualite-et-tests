# Tests Unitaires - Système de Gestion de Salle de Sport

## 🎯 Objectif des Tests Unitaires

Les tests unitaires valident le comportement des unités de code isolées (services, composants, fonctions) sans dépendances externes. Ils garantissent que la logique métier critique fonctionne correctement dans tous les scénarios.

## 📁 Structure

```
tests/unit/
├── backend/                    # Tests unitaires backend
│   ├── services/              # Tests des services métier
│   │   ├── bookingService.test.js     # Service de réservation
│   │   ├── subscriptionService.test.js # Service d'abonnement
│   │   ├── classService.test.js       # Service de cours
│   │   ├── userService.test.js        # Service utilisateur
│   │   └── dashboardService.test.js   # Service dashboard
│   ├── controllers/           # Tests des contrôleurs (si nécessaire)
│   └── utils/                # Tests des utilitaires
└── frontend/                  # Tests unitaires frontend
    ├── components/           # Tests des composants Vue
    │   ├── DashboardView.test.js      # Vue dashboard utilisateur
    │   ├── AdminView.test.js          # Vue administration
    │   └── LoginView.test.js          # Vue de connexion
    ├── stores/               # Tests des stores Pinia
    │   └── auth.test.js              # Store d'authentification
    └── services/             # Tests des services frontend
        └── gymService.test.js        # Service API gym
```

## 🎯 Fonctionnalités Critiques Testées

### Backend (5+ fonctionnalités)

#### 1. 🔒 **Validation d'Annulation Tardive** (`bookingService.test.js`)
- **Cas passant** : Annulation 3h avant le cours → Status CANCELLED
- **Cas non passant** : Annulation 1h avant le cours → Status NO_SHOW
- **Cas limite** : Annulation exactement 2h avant → Status CANCELLED

#### 2. 💰 **Calcul de Pénalités No-Show** (`subscriptionService.test.js`)
- **Cas passant** : 3 no-shows → Pas de pénalité
- **Cas non passant** : 7 no-shows → Pénalité 15%
- **Cas limite** : Exactement 5 no-shows → Pas de pénalité

#### 3. 🚫 **Détection de Double Réservation** (`bookingService.test.js`)
- **Cas passant** : Première réservation → Succès
- **Cas non passant** : Même utilisateur, même cours → Erreur
- **Cas limite** : Même utilisateur, cours différent même horaire → Erreur conflit

#### 4. 📊 **Gestion des Capacités de Cours** (`classService.test.js`)
- **Cas passant** : 10 réservations pour capacité 15 → Places disponibles
- **Cas non passant** : 15 réservations pour capacité 15 → Cours complet
- **Cas limite** : 14ème réservation sur capacité 15 → Dernière place

#### 5. 💳 **Règles de Facturation avec Remise Fidélité** (`subscriptionService.test.js`)
- **Cas passant** : 8 mois d'abonnement → Remise 10%
- **Cas non passant** : 3 mois d'abonnement → Pas de remise
- **Cas limite** : Exactement 6 mois → Remise 10%

#### 6. 👥 **Validation d'Unicité Email** (`userService.test.js`)
- **Cas passant** : Email unique → Création réussie
- **Cas non passant** : Email existant → Erreur conflit
- **Cas limite** : Email avec casse différente → Erreur conflit

#### 7. 📈 **Calculs de Statistiques Dashboard** (`dashboardService.test.js`)
- **Cas passant** : Données complètes → Statistiques exactes
- **Cas non passant** : Pas de données → Valeurs par défaut
- **Cas limite** : Utilisateur sans activité → Zéros

### Frontend (5+ fonctionnalités)

#### 1. 📱 **Affichage des Réservations** (`DashboardView.test.js`)
- **Cas passant** : Utilisateur avec réservations → Liste affichée
- **Cas non passant** : Erreur API → Message d'erreur
- **Cas limite** : Utilisateur sans réservation → Message informatif

#### 2. ❌ **Annulation de Réservation** (`DashboardView.test.js`)
- **Cas passant** : Annulation autorisée → Confirmation et mise à jour
- **Cas non passant** : Annulation tardive → Message d'erreur
- **Cas limite** : Annulation limite 2h → Gestion du cas critique

#### 3. 👤 **Création de Compte Admin** (`AdminView.test.js`)
- **Cas passant** : Formulaire valide → Utilisateur créé
- **Cas non passant** : Email invalide → Messages d'erreur
- **Cas limite** : Champs vides → Validation formulaire

#### 4. 🔐 **Interaction Dashboard Admin** (`AdminView.test.js`)
- **Cas passant** : Admin connecté → Données complètes
- **Cas non passant** : Accès non autorisé → Redirection
- **Cas limite** : Timeout API → Gestion d'erreur

#### 5. 🔑 **Authentification Utilisateur** (`LoginView.test.js`)
- **Cas passant** : Connexion valide → Redirection dashboard
- **Cas non passant** : Email inexistant → Message d'erreur
- **Cas limite** : Sélection utilisateur vide → Validation

#### 6. 🔄 **Gestion d'État d'Authentification** (`auth.test.js`)
- **Cas passant** : Login → State mis à jour et localStorage
- **Cas non passant** : Logout → State nettoyé
- **Cas limite** : Restauration depuis localStorage → State cohérent

#### 7. 🌐 **Communication API** (`gymService.test.js`)
- **Cas passant** : Requête normale → Données retournées
- **Cas non passant** : Erreur réseau → Exception capturée
- **Cas limite** : Timeout → Gestion de délai dépassé

## 🔧 Configuration et Outils

### Backend
- **Framework** : Jest avec mocks Prisma
- **Mocks** : Client Prisma complet + services
- **Isolation** : Chaque test indépendant
- **Setup** : Mock data reset avant chaque test

### Frontend
- **Framework** : Vitest + Vue Test Utils
- **Mocks** : API service + stores Pinia
- **Isolation** : Composants testés sans dépendances
- **Setup** : Mocks API et localStorage

## 📋 Standards de Test

### Structure d'un Test
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks et état initial
  });

  describe('Cas passant', () => {
    test('should handle normal case', () => {
      // Arrange - Act - Assert
    });
  });

  describe('Cas non passant', () => {
    test('should handle error case', () => {
      // Test comportement d'erreur
    });
  });

  describe('Cas limite', () => {
    test('should handle edge case', () => {
      // Test valeurs limites
    });
  });
});
```

### Critères de Qualité
- **Isolation** : Chaque test indépendant
- **Clarté** : Noms explicites et structure AAA
- **Couverture** : Tous les chemins critiques testés
- **Performance** : Tests rapides (<100ms par test)
- **Maintenance** : Tests faciles à comprendre et modifier

## 🎯 Objectifs de Couverture

### Backend
- **Services métier** : 90% de couverture ligne
- **Logique critique** : 100% des cas d'erreur
- **Validations** : Tous les cas limites

### Frontend
- **Composants** : 80% de couverture branche
- **Stores** : 90% des mutations et actions
- **Services** : 100% des méthodes publiques

## 🚫 Exclusions Volontaires

### Ne sont PAS testés en unitaire
- **Configuration** : Middleware Express, config Vite
- **Infrastructure** : Connexions DB réelles, Docker
- **Intégrations** : Communication réseau réelle
- **UI complexe** : Interactions multi-composants

### Justifications
- Ces éléments sont couverts par les **tests d'intégration**
- Focus sur la **logique métier pure**
- Évite les **dépendances externes** imprévisibles
- Maintient la **rapidité d'exécution**