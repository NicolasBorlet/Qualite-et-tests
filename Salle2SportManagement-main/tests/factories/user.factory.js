/**
 * Factory pour la génération d'utilisateurs de test
 * Utilise le pattern Factory pour créer des données cohérentes
 */

const { v4: uuidv4 } = require('uuid');

const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

// Données de base pour génération aléatoire
const FIRST_NAMES = [
  'Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Catherine',
  'David', 'Sylvie', 'Paul', 'Alice', 'Philippe', 'Martine',
  'Nicolas', 'Françoise', 'Daniel', 'Monique', 'Jacques', 'Nathalie'
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit',
  'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre',
  'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent'
];

const DOMAINS = [
  'example.com', 'test.org', 'demo.net', 'sample.fr',
  'univ.edu', 'student.fr', 'alumni.org'
];

/**
 * Factory principale pour les utilisateurs
 */
class UserFactory {
  static defaults = {
    role: ROLES.USER,
    dateJoined: () => new Date()
  };

  /**
   * Crée un utilisateur avec des valeurs par défaut
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Utilisateur créé
   */
  static create(overrides = {}) {
    const firstname = overrides.firstname || UserFactory.randomFirstName();
    const lastname = overrides.lastname || UserFactory.randomLastName();
    const domain = overrides.domain || UserFactory.randomDomain();
    
    return {
      id: overrides.id || uuidv4(),
      firstname,
      lastname,
      email: overrides.email || UserFactory.generateEmail(firstname, lastname, domain),
      dateJoined: overrides.dateJoined || UserFactory.defaults.dateJoined(),
      role: overrides.role || UserFactory.defaults.role,
      ...overrides
    };
  }

  /**
   * Crée plusieurs utilisateurs
   * @param {number} count - Nombre d'utilisateurs
   * @param {Object} template - Template de base
   * @returns {Array} Liste d'utilisateurs
   */
  static createMany(count, template = {}) {
    return Array.from({ length: count }, (_, index) => 
      UserFactory.create({
        ...template,
        id: template.id || `user-${Date.now()}-${index}`
      })
    );
  }

  /**
   * Crée un utilisateur administrateur
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Administrateur créé
   */
  static createAdmin(overrides = {}) {
    return UserFactory.create({
      role: ROLES.ADMIN,
      email: overrides.email || 'admin@gym.com',
      firstname: overrides.firstname || 'Admin',
      lastname: overrides.lastname || 'Système',
      ...overrides
    });
  }

  /**
   * Crée un utilisateur étudiant
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Étudiant créé
   */
  static createStudent(overrides = {}) {
    const firstname = overrides.firstname || UserFactory.randomFirstName();
    const lastname = overrides.lastname || UserFactory.randomLastName();
    
    return UserFactory.create({
      firstname,
      lastname,
      email: overrides.email || UserFactory.generateEmail(firstname, lastname, 'univ.edu'),
      role: ROLES.USER,
      ...overrides
    });
  }

  /**
   * Crée un utilisateur fidèle (> 6 mois d'ancienneté)
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Utilisateur fidèle
   */
  static createLoyalUser(overrides = {}) {
    const loyaltyDate = new Date();
    loyaltyDate.setMonth(loyaltyDate.getMonth() - 8); // 8 mois d'ancienneté
    
    return UserFactory.create({
      dateJoined: loyaltyDate,
      ...overrides
    });
  }

  /**
   * Crée un nouvel utilisateur (< 1 mois)
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Nouvel utilisateur
   */
  static createNewUser(overrides = {}) {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - Math.floor(Math.random() * 30)); // 0-30 jours
    
    return UserFactory.create({
      dateJoined: recentDate,
      ...overrides
    });
  }

  /**
   * Crée un utilisateur avec une date d'inscription spécifique
   * @param {Date|string} joinDate - Date d'inscription
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Utilisateur avec date spécifique
   */
  static createWithJoinDate(joinDate, overrides = {}) {
    return UserFactory.create({
      dateJoined: new Date(joinDate),
      ...overrides
    });
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Génère un prénom aléatoire
   * @returns {string} Prénom
   */
  static randomFirstName() {
    return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  }

  /**
   * Génère un nom de famille aléatoire
   * @returns {string} Nom de famille
   */
  static randomLastName() {
    return LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  }

  /**
   * Génère un domaine email aléatoire
   * @returns {string} Domaine
   */
  static randomDomain() {
    return DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  }

  /**
   * Génère une adresse email à partir du nom et prénom
   * @param {string} firstname - Prénom
   * @param {string} lastname - Nom
   * @param {string} domain - Domaine
   * @returns {string} Email généré
   */
  static generateEmail(firstname, lastname, domain = 'example.com') {
    const cleanFirstname = firstname.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastname = lastname.toLowerCase().replace(/[^a-z]/g, '');
    return `${cleanFirstname}.${cleanLastname}@${domain}`;
  }

  /**
   * Génère des utilisateurs pour différents types d'abonnement
   * @param {string} planType - Type d'abonnement
   * @returns {Object} Utilisateur adapté au plan
   */
  static createForSubscriptionPlan(planType) {
    const planConfigs = {
      STANDARD: {
        dateJoined: new Date('2024-01-01'),
        domain: 'example.com'
      },
      PREMIUM: {
        dateJoined: new Date('2023-06-01'), // Éligible à la remise
        domain: 'example.com'
      },
      ETUDIANT: {
        dateJoined: new Date('2024-01-01'),
        domain: 'univ.edu'
      }
    };

    const config = planConfigs[planType] || planConfigs.STANDARD;
    const firstname = UserFactory.randomFirstName();
    const lastname = UserFactory.randomLastName();

    return UserFactory.create({
      firstname,
      lastname,
      email: UserFactory.generateEmail(firstname, lastname, config.domain),
      dateJoined: config.dateJoined
    });
  }

  /**
   * Crée un batch d'utilisateurs pour tests de performance
   * @param {number} count - Nombre d'utilisateurs
   * @returns {Array} Batch d'utilisateurs
   */
  static createBatch(count) {
    const batch = [];
    const batchId = Date.now();
    
    for (let i = 0; i < count; i++) {
      batch.push(UserFactory.create({
        id: `batch-${batchId}-user-${i + 1}`,
        email: `batch.user.${i + 1}@test-batch.com`
      }));
    }
    
    return batch;
  }

  /**
   * Crée des utilisateurs avec des profils spécifiques pour les tests
   * @returns {Object} Collection d'utilisateurs de test
   */
  static createTestSuite() {
    return {
      admin: UserFactory.createAdmin({
        id: 'test-admin-001',
        email: 'test.admin@gym.com'
      }),
      
      standardUser: UserFactory.create({
        id: 'test-user-001',
        email: 'test.user@example.com'
      }),
      
      premiumUser: UserFactory.createLoyalUser({
        id: 'test-premium-001',
        email: 'test.premium@example.com'
      }),
      
      student: UserFactory.createStudent({
        id: 'test-student-001',
        email: 'test.student@univ.edu'
      }),
      
      newUser: UserFactory.createNewUser({
        id: 'test-new-001',
        email: 'test.new@example.com'
      }),
      
      inactiveUser: UserFactory.create({
        id: 'test-inactive-001',
        email: 'test.inactive@example.com',
        dateJoined: new Date('2023-12-01')
      })
    };
  }

  /**
   * Réinitialise les compteurs et état de la factory
   */
  static reset() {
    // Méthode pour nettoyer l'état si nécessaire
    // Peut être étendue pour gérer des caches ou compteurs
  }
}

/**
 * Builder pattern pour création plus flexible
 */
class UserBuilder {
  constructor() {
    this.userData = {
      id: uuidv4(),
      role: ROLES.USER,
      dateJoined: new Date()
    };
  }

  withId(id) {
    this.userData.id = id;
    return this;
  }

  withName(firstname, lastname) {
    this.userData.firstname = firstname;
    this.userData.lastname = lastname;
    return this;
  }

  withEmail(email) {
    this.userData.email = email;
    return this;
  }

  withRole(role) {
    this.userData.role = role;
    return this;
  }

  withJoinDate(date) {
    this.userData.dateJoined = new Date(date);
    return this;
  }

  asAdmin() {
    this.userData.role = ROLES.ADMIN;
    return this;
  }

  asLoyalUser() {
    const loyaltyDate = new Date();
    loyaltyDate.setMonth(loyaltyDate.getMonth() - 8);
    this.userData.dateJoined = loyaltyDate;
    return this;
  }

  asStudent() {
    if (!this.userData.email || !this.userData.email.includes('univ.edu')) {
      const firstname = this.userData.firstname || UserFactory.randomFirstName();
      const lastname = this.userData.lastname || UserFactory.randomLastName();
      this.userData.email = UserFactory.generateEmail(firstname, lastname, 'univ.edu');
    }
    return this;
  }

  build() {
    // Génération automatique des champs manquants
    if (!this.userData.firstname) {
      this.userData.firstname = UserFactory.randomFirstName();
    }
    if (!this.userData.lastname) {
      this.userData.lastname = UserFactory.randomLastName();
    }
    if (!this.userData.email) {
      this.userData.email = UserFactory.generateEmail(
        this.userData.firstname,
        this.userData.lastname
      );
    }

    return { ...this.userData };
  }
}

module.exports = {
  UserFactory,
  UserBuilder,
  ROLES
};