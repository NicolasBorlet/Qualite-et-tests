/**
 * Configuration Playwright pour les tests E2E
 * Optimisé pour l'application de gestion de salle de sport
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration des variables d'environnement pour les tests E2E
 */
const config = {
  // URL de base de l'application (peut être surchargée par E2E_BASE_URL)
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  
  // Timeout global pour les tests (30 secondes)
  timeout: parseInt(process.env.E2E_TIMEOUT) || 30000,
  
  // Configuration de la base de données de test
  dbUrl: process.env.E2E_DB_URL || 'postgresql://test:test@localhost:5432/gym_test',
  
  // Configuration API backend
  apiUrl: process.env.E2E_API_URL || 'http://localhost:8000/api'
};

export default defineConfig({
  // Dossier des tests E2E
  testDir: './journeys',
  
  // Pattern des fichiers de test
  testMatch: '**/*.spec.js',
  
  // Timeout global pour chaque test (30 secondes)
  timeout: config.timeout,
  
  // Timeout pour les expect (5 secondes)
  expect: {
    timeout: 5000
  },
  
  // Configuration des workers (tests en parallèle)
  fullyParallel: true,
  
  // Nombre de tentatives en cas d'échec
  retries: process.env.CI ? 2 : 0,
  
  // Nombre de workers (processus parallèles)
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter pour les résultats
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['line']
  ],
  
  // Configuration globale pour tous les tests
  use: {
    // URL de base
    baseURL: config.baseURL,
    
    // Configuration des traces (debugging)
    trace: 'on-first-retry',
    
    // Screenshots automatiques
    screenshot: 'only-on-failure',
    
    // Enregistrement vidéo
    video: 'retain-on-failure',
    
    // Configuration du navigateur
    viewport: { width: 1280, height: 720 },
    
    // Ignorer les erreurs HTTPS en développement
    ignoreHTTPSErrors: true,
    
    // Configuration des headers par défaut
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    
    // Locale française
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris'
  },

  // Configuration des projets (navigateurs)
  projects: [
    // Setup global (preparation des données de test)
    {
      name: 'setup',
      testMatch: '**/setup/*.setup.js',
      teardown: 'cleanup'
    },
    
    // Cleanup global (nettoyage après tous les tests)
    {
      name: 'cleanup',
      testMatch: '**/setup/*.cleanup.js'
    },

    // Tests Chrome Desktop
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Stockage des sessions authentifiées
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests Firefox Desktop
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests Safari Desktop (macOS uniquement)
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests Mobile - Chrome Android
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests Mobile - Safari iOS
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests Admin (avec authentification administrateur)
    {
      name: 'admin-tests',
      testMatch: '**/admin-*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json'
      },
      dependencies: ['setup']
    }
  ],

  // Configuration du serveur de développement (si besoin de le démarrer)
  webServer: [
    // Frontend (Vue.js)
    {
      command: 'npm run dev',
      cwd: '../frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: config.apiUrl
      }
    },
    
    // Backend (Node.js/Express)
    {
      command: 'npm run test:server',
      cwd: '../backend', 
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: config.dbUrl,
        JWT_SECRET: 'test-secret-key',
        PORT: '8000'
      }
    }
  ],

  // Dossiers à ignorer
  testIgnore: [
    '**/node_modules/**',
    '**/reports/**',
    '**/playwright/.auth/**'
  ],

  // Configuration des globals pour les helpers
  globalSetup: require.resolve('./utils/global-setup.js'),
  globalTeardown: require.resolve('./utils/global-teardown.js')
});

// Export de la configuration pour utilisation dans les helpers
export { config };