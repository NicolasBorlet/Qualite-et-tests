# Tests End-to-End (E2E) - Salle de Sport Management

## 🎯 Objectif

Ce dossier contient les tests End-to-End utilisant **Playwright** pour valider les parcours utilisateur critiques complets de l'application de gestion de salle de sport. Ces tests simulent l'interaction réelle d'un utilisateur avec l'interface web et vérifient le bon fonctionnement des workflows de bout en bout.

## 🛠️ Configuration et Outils

### Technologies utilisées
- **Playwright** - Framework de test E2E moderne et robuste
- **Node.js** - Environnement d'exécution
- **Fixtures personnalisées** - Données de test stables et reproductibles

### Structure des tests
```
tests/e2e/
├── README.md                     # Documentation (ce fichier)
├── playwright.config.js          # Configuration Playwright
├── fixtures/
│   ├── users.json               # Données utilisateurs de test
│   ├── classes.json             # Données des cours
│   └── subscriptions.json       # Données d'abonnements
├── utils/
│   ├── auth-helpers.js          # Utilitaires d'authentification
│   ├── data-helpers.js          # Helpers pour manipulation des données
│   └── page-objects.js          # Page Objects pour maintenir les sélecteurs
├── journeys/
│   ├── user-dashboard.spec.js    # Parcours tableau de bord utilisateur
│   ├── booking-workflow.spec.js  # Parcours réservation de cours
│   ├── cancellation.spec.js     # Parcours annulation de cours
│   ├── subscription.spec.js     # Parcours gestion d'abonnement
│   └── admin-management.spec.js  # Parcours administration
└── reports/                     # Rapports et captures d'écran des tests
```

## 📋 Parcours Utilisateur Critiques Couverts

### 1. 🏠 Connexion utilisateur et affichage du tableau de bord
**Fichier :** `journeys/user-dashboard.spec.js`

#### Cas passant
- Connexion réussie avec utilisateur valide
- Affichage correct des statistiques personnelles
- Navigation fluide vers les différentes sections
- Données cohérentes entre dashboard et API

#### Cas non passant
- Tentative de connexion avec utilisateur inexistant
- Gestion des erreurs de chargement des données
- Timeout de session et redirection

#### Cas limite
- Utilisateur sans historique de réservations
- Utilisateur avec compte suspendu
- Charge lourde de données (nombreuses réservations)

### 2. 📅 Réservation de cours et vérification dans l'historique
**Fichier :** `journeys/booking-workflow.spec.js`

#### Cas passant
- Sélection et réservation d'un cours disponible
- Confirmation immédiate de la réservation
- Apparition dans l'historique utilisateur
- Mise à jour du nombre de places disponibles

#### Cas non passant
- Tentative de réservation d'un cours complet
- Conflit horaire avec une réservation existante
- Erreur réseau pendant la réservation

#### Cas limite
- Réservation de la dernière place disponible
- Réservation simultanée par plusieurs utilisateurs
- Cours à capacité minimale (1 place)

### 3. ❌ Annulation de cours et gestion de la politique d'annulation
**Fichier :** `journeys/cancellation.spec.js`

#### Cas passant
- Annulation dans les délais (>2h avant le cours)
- Libération automatique de la place
- Statut "CANCELLED" dans l'historique

#### Cas non passant
- Tentative d'annulation tardive (<2h avant le cours)
- Annulation d'une réservation déjà annulée
- Tentative d'annulation par un autre utilisateur

#### Cas limite
- Annulation exactement à la limite des 2h
- Annulation d'un cours annulé par l'administration
- Multiple tentatives d'annulation simultanées

### 4. 💳 Affichage des informations d'abonnement
**Fichier :** `journeys/subscription.spec.js`

#### Cas passant
- Affichage correct du plan d'abonnement actuel
- Historique des paiements
- Dates d'échéance et renouvellement
- Calcul correct des tarifs avec remises fidélité

#### Cas non passant
- Utilisateur sans abonnement actif
- Abonnement expiré
- Erreur de facturation

#### Cas limite
- Abonnement à la limite d'expiration
- Utilisateur avec historique de no-shows (pénalités)
- Changement de plan en cours de période

### 5. 👨‍💼 Accès aux fonctionnalités administrateur pour création de cours
**Fichier :** `journeys/admin-management.spec.js`

#### Cas passant
- Connexion administrateur réussie
- Création d'un nouveau cours avec tous les détails
- Modification d'un cours existant
- Annulation d'un cours avec notification des participants

#### Cas non passant
- Tentative d'accès admin par utilisateur standard
- Création de cours avec données invalides
- Conflit d'horaire de coach

#### Cas limite
- Création de cours à capacité maximale
- Modification de cours avec réservations existantes
- Suppression de cours populaire

## 🔧 Données de Test et Fixtures

### Utilisateurs de test
```json
{
  "standardUser": {
    "id": "e2e-user-1",
    "email": "john.doe.e2e@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "role": "USER"
  },
  "adminUser": {
    "id": "e2e-admin-1",
    "email": "admin.e2e@gym.com",
    "firstname": "Admin",
    "lastname": "Test",
    "role": "ADMIN"
  },
  "premiumUser": {
    "id": "e2e-user-premium",
    "email": "premium.e2e@example.com",
    "firstname": "Premium",
    "lastname": "User",
    "role": "USER"
  }
}
```

### Cours de test
```json
{
  "availableClass": {
    "id": "e2e-class-1",
    "title": "E2E Yoga Test",
    "coach": "Sarah E2E",
    "capacity": 10,
    "datetime": "2024-02-15T10:00:00Z"
  },
  "fullClass": {
    "id": "e2e-class-full",
    "title": "E2E Full Class",
    "coach": "Emma E2E",
    "capacity": 1,
    "datetime": "2024-02-15T14:00:00Z"
  },
  "soonClass": {
    "id": "e2e-class-soon",
    "title": "E2E Soon Class",
    "coach": "Mike E2E",
    "capacity": 5,
    "datetime": "2024-02-15T16:00:00Z"
  }
}
```

## 🚀 Exécution des Tests

### Commandes principales
```bash
# Installation des dépendances
npm install

# Exécution de tous les tests E2E
npm run test:e2e

# Exécution en mode headed (avec interface graphique)
npm run test:e2e:headed

# Exécution d'un parcours spécifique
npx playwright test journeys/user-dashboard.spec.js

# Génération du rapport
npm run test:e2e:report
```

### Variables d'environnement
```bash
# URL de l'application de test
E2E_BASE_URL=http://localhost:8080

# Configuration de la base de données de test
E2E_DB_URL=postgresql://test:test@localhost:5432/gym_test

# Timeout par défaut (ms)
E2E_TIMEOUT=30000
```

## 📊 Stratégie de Test et Hypothèses

### Hypothèses techniques
1. **Environment isolé** : Tests exécutés sur un environnement dédié avec base de données de test
2. **Données stables** : Fixtures chargées avant chaque suite de tests
3. **État prévisible** : Chaque test repart d'un état connu et contrôlé
4. **Nettoyage automatique** : Rollback des données après chaque test

### Gestion des sessions et authentification
- **Cookies persistants** : Sauvegarde des sessions utilisateur entre les tests
- **Tokens d'authentification** : Gestion automatique des JWT
- **Multi-utilisateur** : Tests simultanés avec différents rôles

### Stratégie de data seeding
1. **Setup global** : Chargement des utilisateurs et données de base
2. **Setup par suite** : Données spécifiques à chaque parcours
3. **Cleanup** : Nettoyage automatique après chaque test
4. **Idempotence** : Tests réexécutables sans conflit

## 🔍 Assertions et Vérifications

### Types de vérifications
- **UI/UX** : Présence et contenu des éléments visuels
- **Data** : Cohérence des données affichées avec l'API
- **Navigation** : Flux correct entre les pages
- **Performance** : Temps de chargement des pages critiques
- **Accessibilité** : Respect des standards WCAG

### Stratégie de capture
- **Screenshots automatiques** : En cas d'échec de test
- **Vidéos** : Enregistrement des parcours complets
- **Traces réseau** : Monitoring des appels API
- **Logs** : Capture des erreurs JavaScript

## 📈 Métriques et Reporting

### Indicateurs suivis
- **Taux de succès** : Pourcentage de tests passants
- **Temps d'exécution** : Performance des parcours
- **Couverture fonctionnelle** : Fonctionnalités testées
- **Stabilité** : Consistance des résultats

### Rapports générés
- **HTML Report** : Rapport détaillé avec captures
- **JUnit XML** : Intégration CI/CD
- **JSON** : Données brutes pour analytics
- **Traces** : Debug en cas d'échec

## 🔄 Intégration CI/CD

### Pipeline de test
1. **Build** : Compilation de l'application
2. **Start services** : Lancement des services (frontend + backend)
3. **Seed data** : Chargement des fixtures
4. **Run E2E** : Exécution des tests Playwright
5. **Generate report** : Création des rapports
6. **Cleanup** : Nettoyage des ressources

### Critères de succès
- **100% des parcours critiques** doivent passer
- **Temps d'exécution < 10 minutes** pour la suite complète
- **Pas de flaky tests** : Stabilité > 95%

## 🛡️ Bonnes Pratiques Implémentées

### Robustesse des tests
- **Wait strategies** : Attente intelligente des éléments
- **Retry logic** : Nouvelle tentative en cas d'échec temporaire
- **Isolation** : Tests indépendants les uns des autres
- **Déterminisme** : Résultats reproductibles

### Maintenabilité
- **Page Objects** : Abstraction des sélecteurs et actions
- **Helpers** : Fonctions utilitaires réutilisables
- **Configuration centralisée** : Paramètres dans un seul endroit
- **Documentation** : Code auto-documenté et commenté

Cette stratégie E2E garantit une couverture complète des parcours utilisateur critiques avec une approche structurée et maintenable, adaptée aux besoins spécifiques de l'application de gestion de salle de sport.
