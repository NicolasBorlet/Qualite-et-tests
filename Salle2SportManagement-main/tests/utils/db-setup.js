/**
 * Utilitaires pour la configuration de base de données de test
 * Gestion des environnements de test d'intégration
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration de la base de données de test
const TEST_DB_CONFIG = {
  // Base de données PostgreSQL pour tests d'intégration
  postgresql: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5434, // Port différent de la prod
    database: process.env.TEST_DB_NAME || 'gym_management_test',
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'test_password'
  },

  // Configuration Prisma pour les tests
  prisma: {
    databaseUrl: process.env.TEST_DATABASE_URL || 
      'postgresql://postgres:test_password@localhost:5434/gym_management_test'
  }
};

/**
 * Gestionnaire de base de données de test
 */
class TestDatabaseManager {
  constructor() {
    this.isSetup = false;
    this.originalDatabaseUrl = process.env.DATABASE_URL;
  }

  /**
   * Configure l'environnement de base de données pour les tests
   */
  async setup() {
    if (this.isSetup) {
      return;
    }

    try {
      // Sauvegarde l'URL de base de données originale
      this.originalDatabaseUrl = process.env.DATABASE_URL;
      
      // Configure l'URL de test
      process.env.DATABASE_URL = TEST_DB_CONFIG.prisma.databaseUrl;
      
      // Vérifie si la base de données de test existe
      await this.ensureTestDatabaseExists();
      
      // Lance les migrations
      await this.runMigrations();
      
      this.isSetup = true;
      console.log('✅ Test database setup completed');
      
    } catch (error) {
      console.error('❌ Test database setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Nettoie et remet en état la base de données de test
   */
  async cleanup() {
    if (!this.isSetup) {
      return;
    }

    try {
      // Nettoie toutes les données
      await this.clearAllData();
      
      // Restaure l'URL de base de données originale
      if (this.originalDatabaseUrl) {
        process.env.DATABASE_URL = this.originalDatabaseUrl;
      }
      
      this.isSetup = false;
      console.log('✅ Test database cleanup completed');
      
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error.message);
      throw error;
    }
  }

  /**
   * Vérifie et crée la base de données de test si nécessaire
   */
  async ensureTestDatabaseExists() {
    try {
      // Commande pour créer la base de données si elle n'existe pas
      const createDbCommand = `
        PGPASSWORD=${TEST_DB_CONFIG.postgresql.password} 
        createdb -h ${TEST_DB_CONFIG.postgresql.host} 
        -p ${TEST_DB_CONFIG.postgresql.port} 
        -U ${TEST_DB_CONFIG.postgresql.username} 
        ${TEST_DB_CONFIG.postgresql.database}
      `;
      
      execSync(createDbCommand, { stdio: 'pipe' });
      console.log('📊 Test database created');
      
    } catch (error) {
      // La base peut déjà exister, c'est OK
      if (!error.message.includes('already exists')) {
        console.log('📊 Test database already exists or creation skipped');
      }
    }
  }

  /**
   * Lance les migrations Prisma sur la base de test
   */
  async runMigrations() {
    try {
      const backendPath = path.join(__dirname, '../../backend');
      
      // Génère le client Prisma
      execSync('npx prisma generate', { 
        cwd: backendPath,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: TEST_DB_CONFIG.prisma.databaseUrl }
      });
      
      // Lance les migrations
      execSync('npx prisma migrate deploy', { 
        cwd: backendPath,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: TEST_DB_CONFIG.prisma.databaseUrl }
      });
      
      console.log('🔄 Database migrations applied');
      
    } catch (error) {
      console.error('Migration error:', error.message);
      throw new Error(`Failed to run migrations: ${error.message}`);
    }
  }

  /**
   * Vide toutes les tables de la base de données de test
   */
  async clearAllData() {
    try {
      const backendPath = path.join(__dirname, '../../backend');
      
      // Reset complet de la base de données
      execSync('npx prisma migrate reset --force', { 
        cwd: backendPath,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: TEST_DB_CONFIG.prisma.databaseUrl }
      });
      
      console.log('🧹 Test database cleared');
      
    } catch (error) {
      console.error('Clear data error:', error.message);
      // Tentative alternative avec truncate
      await this.truncateAllTables();
    }
  }

  /**
   * Truncate toutes les tables (méthode alternative)
   */
  async truncateAllTables() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_CONFIG.prisma.databaseUrl
        }
      }
    });

    try {
      // Ordre important pour respecter les contraintes de clés étrangères
      await prisma.booking.deleteMany();
      await prisma.subscription.deleteMany();
      await prisma.class.deleteMany();
      await prisma.user.deleteMany();
      
      console.log('🧹 All tables truncated');
      
    } catch (error) {
      console.error('Truncate error:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Seed la base de données avec des données de test
   * @param {Object} seedData - Données à insérer
   */
  async seedDatabase(seedData = {}) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_CONFIG.prisma.databaseUrl
        }
      }
    });

    try {
      // Crée les utilisateurs
      if (seedData.users) {
        for (const userData of seedData.users) {
          await prisma.user.create({ data: userData });
        }
      }

      // Crée les cours
      if (seedData.classes) {
        for (const classData of seedData.classes) {
          await prisma.class.create({ data: classData });
        }
      }

      // Crée les abonnements
      if (seedData.subscriptions) {
        for (const subData of seedData.subscriptions) {
          await prisma.subscription.create({ data: subData });
        }
      }

      // Crée les réservations
      if (seedData.bookings) {
        for (const bookingData of seedData.bookings) {
          await prisma.booking.create({ data: bookingData });
        }
      }

      console.log('🌱 Test database seeded');
      
    } catch (error) {
      console.error('Seed error:', error.message);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Vérifie la connectivité de la base de données
   */
  async checkConnection() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_CONFIG.prisma.databaseUrl
        }
      }
    });

    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }
}

/**
 * Utilitaires pour Docker Compose (si utilisé pour les tests)
 */
const dockerHelpers = {
  /**
   * Lance les services Docker pour les tests
   */
  async startTestServices() {
    try {
      execSync('docker-compose -f docker-compose.test.yml up -d db', {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../..')
      });
      
      // Attend que la base soit prête
      await this.waitForDatabase();
      
      console.log('🐳 Docker test services started');
      
    } catch (error) {
      console.error('Docker start error:', error.message);
      throw error;
    }
  },

  /**
   * Arrête les services Docker de test
   */
  async stopTestServices() {
    try {
      execSync('docker-compose -f docker-compose.test.yml down', {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../..')
      });
      
      console.log('🐳 Docker test services stopped');
      
    } catch (error) {
      console.error('Docker stop error:', error.message);
    }
  },

  /**
   * Attend que la base de données soit prête
   */
  async waitForDatabase(maxAttempts = 30) {
    const dbManager = new TestDatabaseManager();
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (await dbManager.checkConnection()) {
        return true;
      }
      
      console.log(`⏳ Waiting for database... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Database failed to become ready');
  }
};

/**
 * Configuration Jest pour les tests d'intégration
 */
const jestSetup = {
  /**
   * Setup global pour tous les tests d'intégration
   */
  async globalSetup() {
    const dbManager = new TestDatabaseManager();
    
    // Stocke l'instance pour le cleanup
    global.__TEST_DB_MANAGER__ = dbManager;
    
    await dbManager.setup();
  },

  /**
   * Cleanup global après tous les tests
   */
  async globalTeardown() {
    if (global.__TEST_DB_MANAGER__) {
      await global.__TEST_DB_MANAGER__.cleanup();
    }
  },

  /**
   * Setup avant chaque test
   */
  async beforeEach() {
    if (global.__TEST_DB_MANAGER__) {
      await global.__TEST_DB_MANAGER__.clearAllData();
    }
  }
};

// Instance singleton pour les tests
const testDbManager = new TestDatabaseManager();

module.exports = {
  TestDatabaseManager,
  testDbManager,
  dockerHelpers,
  jestSetup,
  TEST_DB_CONFIG
};