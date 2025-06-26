/**
 * Fixtures pour les données de cours
 * Données de test réalistes pour les cours de fitness
 */

// Types de cours disponibles
const CLASS_TYPES = {
  YOGA: 'Yoga',
  PILATES: 'Pilates',
  CARDIO: 'Cardio',
  MUSCULATION: 'Musculation',
  ZUMBA: 'Zumba',
  CROSSFIT: 'CrossFit',
  SPINNING: 'Spinning',
  AQUAGYM: 'Aquagym'
};

// Coaches disponibles
const COACHES = [
  'Sarah Johnson',
  'Mike Rodriguez',
  'Emma Thompson',
  'David Chen',
  'Lisa Anderson',
  'Alex Martin',
  'Sophie Dubois',
  'Thomas Lefebvre'
];

// Cours de test standard
const testClasses = {
  // === COURS FUTURS (RÉSERVABLES) ===
  futureYogaClass: {
    id: 'class-001',
    title: 'Yoga Débutant',
    coach: 'Sarah Johnson',
    datetime: new Date('2024-01-16T09:00:00Z'),
    duration: 60,
    capacity: 15,
    isCancelled: false
  },

  futurePilatesClass: {
    id: 'class-002',
    title: 'Pilates Intermédiaire',
    coach: 'Emma Thompson',
    datetime: new Date('2024-01-16T18:30:00Z'),
    duration: 45,
    capacity: 12,
    isCancelled: false
  },

  futureCardioClass: {
    id: 'class-003',
    title: 'Cardio Intensif',
    coach: 'Mike Rodriguez',
    datetime: new Date('2024-01-17T07:30:00Z'),
    duration: 30,
    capacity: 20,
    isCancelled: false
  },

  futureCrossfitClass: {
    id: 'class-004',
    title: 'CrossFit WOD',
    coach: 'Alex Martin',
    datetime: new Date('2024-01-17T19:00:00Z'),
    duration: 60,
    capacity: 10,
    isCancelled: false
  },

  // === COURS PROCHE DE LA LIMITE D'ANNULATION ===
  soonClass: {
    id: 'class-005',
    title: 'Zumba Party',
    coach: 'Lisa Anderson',
    datetime: new Date('2024-01-15T16:00:00Z'), // Dans 1h30 (no-show si annulation)
    duration: 45,
    capacity: 25,
    isCancelled: false
  },

  // === COURS PASSÉS ===
  pastYogaClass: {
    id: 'class-006',
    title: 'Yoga Matinal',
    coach: 'Sarah Johnson',
    datetime: new Date('2024-01-14T08:00:00Z'),
    duration: 60,
    capacity: 15,
    isCancelled: false
  },

  pastCancelledClass: {
    id: 'class-007',
    title: 'Spinning Annulé',
    coach: 'David Chen',
    datetime: new Date('2024-01-13T19:00:00Z'),
    duration: 45,
    capacity: 18,
    isCancelled: true
  },

  // === COURS SPÉCIAUX ===
  fullCapacityClass: {
    id: 'class-008',
    title: 'Aquagym Populaire',
    coach: 'Sophie Dubois',
    datetime: new Date('2024-01-18T10:00:00Z'),
    duration: 45,
    capacity: 8, // Petite capacité pour tests de saturation
    isCancelled: false
  },

  cancelledFutureClass: {
    id: 'class-009',
    title: 'Musculation Annulée',
    coach: 'Thomas Lefebvre',
    datetime: new Date('2024-01-19T12:00:00Z'),
    duration: 90,
    capacity: 12,
    isCancelled: true
  },

  // === COURS POUR TESTS DE CONFLITS ===
  conflictClass1: {
    id: 'class-010',
    title: 'Yoga Conflit A',
    coach: 'Sarah Johnson',
    datetime: new Date('2024-01-20T14:00:00Z'),
    duration: 60,
    capacity: 15,
    isCancelled: false
  },

  conflictClass2: {
    id: 'class-011',
    title: 'Pilates Conflit B',
    coach: 'Emma Thompson',
    datetime: new Date('2024-01-20T14:30:00Z'), // Conflit avec le précédent
    duration: 45,
    capacity: 12,
    isCancelled: false
  }
};

// Listes de cours pour différents scénarios
const classLists = {
  // Tous les cours
  all: Object.values(testClasses),

  // Cours futurs réservables
  available: [
    testClasses.futureYogaClass,
    testClasses.futurePilatesClass,
    testClasses.futureCardioClass,
    testClasses.futureCrossfitClass,
    testClasses.fullCapacityClass
  ],

  // Cours passés
  past: [
    testClasses.pastYogaClass,
    testClasses.pastCancelledClass
  ],

  // Cours annulés
  cancelled: [
    testClasses.pastCancelledClass,
    testClasses.cancelledFutureClass
  ],

  // Cours avec conflits horaires
  conflicting: [
    testClasses.conflictClass1,
    testClasses.conflictClass2
  ],

  // Cours du jour
  today: [
    testClasses.soonClass
  ],

  // Cours de la semaine
  thisWeek: [
    testClasses.futureYogaClass,
    testClasses.futurePilatesClass,
    testClasses.futureCardioClass,
    testClasses.futureCrossfitClass,
    testClasses.soonClass,
    testClasses.fullCapacityClass
  ]
};

// Données pour création de cours
const classCreationData = {
  validClassData: {
    title: 'Nouveau Cours de Yoga',
    coach: 'Sarah Johnson',
    datetime: new Date('2024-01-25T10:00:00Z'),
    duration: 60,
    capacity: 15
  },

  shortClassData: {
    title: 'HIIT Express',
    coach: 'Mike Rodriguez',
    datetime: new Date('2024-01-25T12:30:00Z'),
    duration: 20,
    capacity: 25
  },

  longClassData: {
    title: 'Atelier Yoga Avancé',
    coach: 'Sarah Johnson',
    datetime: new Date('2024-01-26T14:00:00Z'),
    duration: 120,
    capacity: 10
  },

  invalidPastDate: {
    title: 'Cours dans le Passé',
    coach: 'Emma Thompson',
    datetime: new Date('2024-01-10T10:00:00Z'), // Date passée
    duration: 60,
    capacity: 15
  },

  invalidCapacity: {
    title: 'Cours Capacité Invalide',
    coach: 'David Chen',
    datetime: new Date('2024-01-25T16:00:00Z'),
    duration: 45,
    capacity: 0 // Capacité invalide
  },

  missingFields: {
    title: 'Cours Incomplet',
    // Coach manquant
    datetime: new Date('2024-01-25T18:00:00Z'),
    duration: 60,
    capacity: 12
  }
};

// Données de mise à jour
const classUpdateData = {
  reschedule: {
    datetime: new Date('2024-01-26T10:00:00Z')
  },

  changeCoach: {
    coach: 'Lisa Anderson'
  },

  increaseCapacity: {
    capacity: 20
  },

  cancelClass: {
    isCancelled: true
  },

  completeUpdate: {
    title: 'Yoga Intermédiaire Modifié',
    coach: 'Sophie Dubois',
    datetime: new Date('2024-01-27T11:00:00Z'),
    duration: 75,
    capacity: 18
  }
};

// Plannings de cours pour tests complexes
const classSchedules = {
  // Planning d'une journée type
  dailySchedule: [
    {
      ...testClasses.futureCardioClass,
      datetime: new Date('2024-01-16T07:30:00Z')
    },
    {
      ...testClasses.futureYogaClass,
      datetime: new Date('2024-01-16T09:00:00Z')
    },
    {
      title: 'Pilates Midi',
      coach: 'Emma Thompson',
      datetime: new Date('2024-01-16T12:30:00Z'),
      duration: 45,
      capacity: 12,
      isCancelled: false
    },
    {
      ...testClasses.futurePilatesClass,
      datetime: new Date('2024-01-16T18:30:00Z')
    }
  ],

  // Planning avec conflits
  conflictSchedule: [
    testClasses.conflictClass1,
    testClasses.conflictClass2
  ],

  // Planning de la semaine
  weeklySchedule: classLists.thisWeek
};

// Générateurs de cours
const classGenerators = {
  /**
   * Génère un cours aléatoire
   * @param {Object} overrides - Propriétés à surcharger
   * @returns {Object} Cours généré
   */
  generateRandomClass: (overrides = {}) => {
    const types = Object.values(CLASS_TYPES);
    const coaches = COACHES;
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomCoach = coaches[Math.floor(Math.random() * coaches.length)];
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    
    // Date future aléatoire (1-30 jours)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
    futureDate.setHours(8 + Math.floor(Math.random() * 12)); // 8h-20h
    futureDate.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]);
    futureDate.setSeconds(0);
    futureDate.setMilliseconds(0);
    
    return {
      id: `class-${timestamp}`,
      title: randomType,
      coach: randomCoach,
      datetime: futureDate,
      duration: [30, 45, 60, 75, 90][Math.floor(Math.random() * 5)],
      capacity: 8 + Math.floor(Math.random() * 17), // 8-24 places
      isCancelled: false,
      ...overrides
    };
  },

  /**
   * Génère une série de cours
   * @param {number} count - Nombre de cours
   * @param {Object} template - Template de base
   * @returns {Array} Liste de cours
   */
  generateClassSeries: (count, template = {}) => {
    return Array.from({ length: count }, (_, index) => 
      classGenerators.generateRandomClass({
        ...template,
        id: `generated-class-${index + 1}`
      })
    );
  },

  /**
   * Génère un planning quotidien
   * @param {Date} date - Date du planning
   * @param {number} classCount - Nombre de cours
   * @returns {Array} Planning de la journée
   */
  generateDailySchedule: (date, classCount = 4) => {
    const schedule = [];
    const startHour = 8;
    const hoursInterval = Math.floor(12 / classCount);
    
    for (let i = 0; i < classCount; i++) {
      const classDate = new Date(date);
      classDate.setHours(startHour + (i * hoursInterval));
      classDate.setMinutes(0);
      classDate.setSeconds(0);
      classDate.setMilliseconds(0);
      
      schedule.push(classGenerators.generateRandomClass({
        datetime: classDate,
        id: `daily-class-${i + 1}`
      }));
    }
    
    return schedule;
  },

  /**
   * Génère des cours avec capacité spécifique
   * @param {number} capacity - Capacité souhaitée
   * @param {number} count - Nombre de cours
   * @returns {Array} Cours avec capacité fixe
   */
  generateClassesWithCapacity: (capacity, count = 3) => {
    return classGenerators.generateClassSeries(count, { capacity });
  },

  /**
   * Génère des cours passés pour tests d'historique
   * @param {number} daysAgo - Nombre de jours dans le passé
   * @param {number} count - Nombre de cours
   * @returns {Array} Cours passés
   */
  generatePastClasses: (daysAgo = 7, count = 5) => {
    return Array.from({ length: count }, (_, index) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - daysAgo + index);
      pastDate.setHours(10 + (index * 2));
      
      return classGenerators.generateRandomClass({
        datetime: pastDate,
        id: `past-class-${index + 1}`
      });
    });
  }
};

module.exports = {
  testClasses,
  classLists,
  classCreationData,
  classUpdateData,
  classSchedules,
  classGenerators,
  CLASS_TYPES,
  COACHES
};