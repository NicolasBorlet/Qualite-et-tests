# TP6 - Mock React Application

## 📋 Objectif du projet

Application React de démonstration utilisant MSW (Mock Service Worker) pour simuler une API de produits. Ce projet illustre les bonnes pratiques de qualité de code, tests automatisés et intégration continue.

## 🚀 Instructions pour lancer l'application

### Prérequis
- Node.js (version 18 ou supérieure)
- npm

### Installation et démarrage
```bash
# Cloner le projet
git clone <repository-url>
cd tp6-mock-react

# Installer les dépendances
npm install

# Lancer l'application en mode développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📜 Scripts disponibles

- `npm run dev` - Lance l'application en mode développement
- `npm run build` - Build l'application pour la production
- `npm run preview` - Prévisualise le build de production
- `npm run lint` - Exécute ESLint pour vérifier la qualité du code
- `npm run format` - Formate le code avec Prettier
- `npm run test` - Lance les tests unitaires (Vitest)
- `npm run test:ui` - Lance les tests avec l'interface graphique
- `npx playwright test` - Lance les tests end-to-end

## 🏗️ Structure du code

```
src/
├── App.jsx              # Composant principal
├── main.jsx            # Point d'entrée de l'application
├── mocks/              # Configuration MSW
│   ├── browser.js      # Configuration MSW pour le navigateur
│   └── handlers.js     # Handlers d'API mockés
└── utils/
    └── generateProducts.js  # Générateur de produits avec Faker

tests/
├── products.spec.js    # Tests unitaires
└── e2e.spec.js        # Tests end-to-end Playwright

public/
└── mockServiceWorker.js  # Service Worker MSW
```

## 🧪 Tests

Le projet utilise plusieurs niveaux de tests :

### Tests unitaires (Vitest + Testing Library)
- Tests des composants React
- Mocking des appels API
- Tests des différents états (chargement, succès, erreur)

### Tests end-to-end (Playwright)
- Tests du parcours utilisateur complet
- Tests d'intégration avec MSW
- Tests des interactions utilisateur

## 🔧 Outils de qualité

### Linting et formatage
- **ESLint** : Analyse statique du code JavaScript/React
- **Prettier** : Formatage automatique du code

### Hooks de pre-commit
- **Husky** : Exécute automatiquement les tests et le linting avant chaque commit

### Intégration continue
- **GitHub Actions** : Pipeline CI/CD automatisé
- Tests automatiques sur chaque push/PR
- Linting et vérification de qualité

## 🎯 Fonctionnalités

- Affichage d'une liste de produits générés aléatoirement
- Bouton de rechargement pour générer de nouveaux produits
- Gestion des états de chargement
- Gestion des cas d'erreur (liste vide)
- API mockée avec MSW pour simuler un backend

## 👨‍💻 Auteur

Développé dans le cadre du TP6 - Qualité et Tests
