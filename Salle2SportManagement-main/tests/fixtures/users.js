/**
 * Fixtures pour les données utilisateur
 * Données de test réalistes pour les utilisateurs du système
 */

const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

// Utilisateurs de test standard
const testUsers = {
  // === UTILISATEURS STANDARD ===
  standardUser: {
    id: 'user-001',
    firstname: 'Jean',
    lastname: 'Dupont',
    email: 'jean.dupont@example.com',
    dateJoined: new Date('2024-01-01T10:00:00Z'),
    role: ROLES.USER
  },

  premiumUser: {
    id: 'user-002',
    firstname: 'Marie',
    lastname: 'Martin',
    email: 'marie.martin@example.com',
    dateJoined: new Date('2023-06-15T14:30:00Z'),
    role: ROLES.USER
  },

  studentUser: {
    id: 'user-003',
    firstname: 'Thomas',
    lastname: 'Etudiant',
    email: 'thomas.etudiant@univ.edu',
    dateJoined: new Date('2024-01-10T09:00:00Z'),
    role: ROLES.USER
  },

  // === ADMINISTRATEURS ===
  adminUser: {
    id: 'admin-001',
    firstname: 'Sophie',
    lastname: 'Administrateur',
    email: 'admin@gym.com',
    dateJoined: new Date('2023-01-01T08:00:00Z'),
    role: ROLES.ADMIN
  },

  // === CAS PARTICULIERS ===
  newUser: {
    id: 'user-004',
    firstname: 'Paul',
    lastname: 'Nouveau',
    email: 'paul.nouveau@example.com',
    dateJoined: new Date('2024-01-14T16:00:00Z'),
    role: ROLES.USER
  },

  loyalUser: {
    id: 'user-005',
    firstname: 'Christine',
    lastname: 'Fidele',
    email: 'christine.fidele@example.com',
    dateJoined: new Date('2023-01-01T10:00:00Z'),
    role: ROLES.USER
  },

  inactiveUser: {
    id: 'user-006',
    firstname: 'Marc',
    lastname: 'Inactif',
    email: 'marc.inactif@example.com',
    dateJoined: new Date('2023-12-01T12:00:00Z'),
    role: ROLES.USER
  },

  problematicUser: {
    id: 'user-007',
    firstname: 'Albert',
    lastname: 'Problème',
    email: 'albert.probleme@example.com',
    dateJoined: new Date('2023-11-15T11:00:00Z'),
    role: ROLES.USER
  }
};

// Listes d'utilisateurs pour différents scénarios
const userLists = {
  // Tous les utilisateurs
  all: Object.values(testUsers),

  // Utilisateurs standard uniquement
  regularUsers: [
    testUsers.standardUser,
    testUsers.premiumUser,
    testUsers.studentUser,
    testUsers.newUser,
    testUsers.loyalUser,
    testUsers.inactiveUser,
    testUsers.problematicUser
  ],

  // Administrateurs uniquement
  admins: [
    testUsers.adminUser
  ],

  // Utilisateurs actifs (récemment joints)
  activeUsers: [
    testUsers.standardUser,
    testUsers.premiumUser,
    testUsers.studentUser,
    testUsers.newUser
  ],

  // Utilisateurs éligibles à la remise fidélité (>6 mois)
  loyaltyEligible: [
    testUsers.premiumUser,
    testUsers.loyalUser,
    testUsers.adminUser
  ],

  // Utilisateurs récents (<1 mois)
  recentUsers: [
    testUsers.standardUser,
    testUsers.studentUser,
    testUsers.newUser
  ]
};

// Données partielles pour les tests de création
const userCreationData = {
  validUserData: {
    firstname: 'Nouveau',
    lastname: 'Utilisateur',
    email: 'nouveau.user@example.com',
    role: ROLES.USER
  },

  adminCreationData: {
    firstname: 'Nouvel',
    lastname: 'Admin',
    email: 'nouvel.admin@gym.com',
    role: ROLES.ADMIN
  },

  invalidEmailData: {
    firstname: 'Invalide',
    lastname: 'Email',
    email: 'email-invalide',
    role: ROLES.USER
  },

  duplicateEmailData: {
    firstname: 'Doublon',
    lastname: 'Email',
    email: 'jean.dupont@example.com', // Email déjà existant
    role: ROLES.USER
  },

  missingFieldsData: {
    firstname: 'Incomplet',
    // lastname manquant
    email: 'incomplet@example.com',
    role: ROLES.USER
  }
};

// Données de mise à jour
const userUpdateData = {
  standardUpdate: {
    firstname: 'Jean-Pierre',
    lastname: 'Dupont-Martin'
  },

  emailUpdate: {
    email: 'nouveau.email@example.com'
  },

  roleUpdate: {
    role: ROLES.ADMIN
  },

  invalidUpdate: {
    email: 'email-invalide'
  }
};

// Profils utilisateur avec historique
const userProfiles = {
  // Utilisateur modèle - actif, ponctuel
  modelUser: {
    ...testUsers.standardUser,
    stats: {
      totalBookings: 12,
      confirmedBookings: 10,
      cancelledBookings: 2,
      noShows: 0,
      monthlyNoShows: 0,
      loyaltyEligible: false
    }
  },

  // Utilisateur premium avec remise
  vipUser: {
    ...testUsers.premiumUser,
    stats: {
      totalBookings: 45,
      confirmedBookings: 38,
      cancelledBookings: 5,
      noShows: 2,
      monthlyNoShows: 0,
      loyaltyEligible: true
    }
  },

  // Étudiant avec quelques absences
  casualStudent: {
    ...testUsers.studentUser,
    stats: {
      totalBookings: 8,
      confirmedBookings: 6,
      cancelledBookings: 1,
      noShows: 1,
      monthlyNoShows: 1,
      loyaltyEligible: false
    }
  },

  // Utilisateur problématique avec beaucoup de no-shows
  problematicProfile: {
    ...testUsers.problematicUser,
    stats: {
      totalBookings: 15,
      confirmedBookings: 8,
      cancelledBookings: 1,
      noShows: 6,
      monthlyNoShows: 6,
      loyaltyEligible: false
    }
  },

  // Nouvel utilisateur sans historique
  freshUser: {
    ...testUsers.newUser,
    stats: {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      noShows: 0,
      monthlyNoShows: 0,
      loyaltyEligible: false
    }
  }
};

// Générateurs de données utilisateur
const userGenerators = {
  /**
   * Génère un utilisateur aléatoire
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Utilisateur généré
   */
  generateRandomUser: (overrides = {}) => {
    const names = [
      ['Pierre', 'Durand'], ['Alice', 'Bernard'], ['Michel', 'Petit'],
      ['Sylvie', 'Robert'], ['David', 'Richard'], ['Catherine', 'Moreau']
    ];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    
    return {
      id: `user-${timestamp}`,
      firstname: randomName[0],
      lastname: randomName[1],
      email: `${randomName[0].toLowerCase()}.${randomName[1].toLowerCase()}@example.com`,
      dateJoined: new Date(),
      role: ROLES.USER,
      ...overrides
    };
  },

  /**
   * Génère une liste d'utilisateurs
   * @param {number} count - Nombre d'utilisateurs à générer
   * @param {Object} template - Template de base
   * @returns {Array} Liste d'utilisateurs
   */
  generateUserList: (count, template = {}) => {
    return Array.from({ length: count }, (_, index) => 
      userGenerators.generateRandomUser({
        ...template,
        id: `generated-user-${index + 1}`
      })
    );
  },

  /**
   * Génère un utilisateur avec abonnement spécifique
   * @param {string} planType - Type d'abonnement
   * @returns {Object} Utilisateur avec profil adapté
   */
  generateUserForPlan: (planType) => {
    const baseUser = userGenerators.generateRandomUser();
    
    const planProfiles = {
      STANDARD: { dateJoined: new Date('2024-01-01') },
      PREMIUM: { dateJoined: new Date('2023-06-01') },
      ETUDIANT: { 
        dateJoined: new Date('2024-01-01'),
        email: baseUser.email.replace('@example.com', '@univ.edu')
      }
    };

    return {
      ...baseUser,
      ...planProfiles[planType]
    };
  }
};

module.exports = {
  testUsers,
  userLists,
  userCreationData,
  userUpdateData,
  userProfiles,
  userGenerators,
  ROLES
};