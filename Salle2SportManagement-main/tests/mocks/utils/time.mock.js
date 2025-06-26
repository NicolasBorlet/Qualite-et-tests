/**
 * Utilitaires de mocking pour la gestion du temps
 * Permet de contrôler les dates et heures dans les tests
 */

// Date fixe pour les tests déterministes
const FIXED_DATE = new Date('2024-01-15T14:30:00.000Z');

// Stockage de la vraie implémentation de Date
const RealDate = Date;

/**
 * Mock de Date pour les tests
 */
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(MockDate._currentTime || FIXED_DATE);
    } else {
      super(...args);
    }
  }

  static now() {
    return (MockDate._currentTime || FIXED_DATE).getTime();
  }

  static _currentTime = null;

  /**
   * Définit une date/heure spécifique pour les tests
   * @param {Date|string|number} dateTime - Date à utiliser
   */
  static setCurrentTime(dateTime) {
    if (typeof dateTime === 'string' || typeof dateTime === 'number') {
      MockDate._currentTime = new RealDate(dateTime);
    } else if (dateTime instanceof RealDate) {
      MockDate._currentTime = dateTime;
    } else {
      MockDate._currentTime = FIXED_DATE;
    }
  }

  /**
   * Avance le temps d'une durée donnée
   * @param {number} milliseconds - Millisecondes à ajouter
   */
  static advanceTime(milliseconds) {
    const current = MockDate._currentTime || FIXED_DATE;
    MockDate._currentTime = new RealDate(current.getTime() + milliseconds);
  }

  /**
   * Remet le temps à la date fixe par défaut
   */
  static reset() {
    MockDate._currentTime = null;
  }

  /**
   * Obtient la date/heure courante mockée
   * @returns {Date} Date courante
   */
  static getCurrentTime() {
    return MockDate._currentTime || FIXED_DATE;
  }
}

/**
 * Utilitaires pour créer des dates relatives
 */
const timeUtils = {
  /**
   * Crée une date dans le futur
   * @param {number} hoursFromNow - Heures à ajouter à maintenant
   * @returns {Date} Date future
   */
  futureDate: (hoursFromNow = 1) => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getTime() + (hoursFromNow * 60 * 60 * 1000));
  },

  /**
   * Crée une date dans le passé
   * @param {number} hoursAgo - Heures à soustraire de maintenant
   * @returns {Date} Date passée
   */
  pastDate: (hoursAgo = 1) => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getTime() - (hoursAgo * 60 * 60 * 1000));
  },

  /**
   * Crée une date exactement 2 heures dans le futur (limite d'annulation)
   * @returns {Date} Date limite d'annulation
   */
  cancelDeadline: () => {
    return timeUtils.futureDate(2);
  },

  /**
   * Crée une date juste avant la limite d'annulation (1h59min)
   * @returns {Date} Date de no-show
   */
  noShowTime: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getTime() + (119 * 60 * 1000)); // 1h59min
  },

  /**
   * Crée une date il y a 6 mois (éligibilité remise fidélité)
   * @returns {Date} Date d'il y a 6 mois
   */
  loyaltyEligibleDate: () => {
    const now = MockDate.getCurrentTime();
    const sixMonthsAgo = new RealDate(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sixMonthsAgo;
  },

  /**
   * Crée une date il y a 30 jours (purge des anciens cours)
   * @returns {Date} Date de purge
   */
  purgeDate: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  },

  /**
   * Début du mois courant
   * @returns {Date} Premier jour du mois
   */
  startOfMonth: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), now.getMonth(), 1);
  },

  /**
   * Fin du mois courant
   * @returns {Date} Dernier jour du mois
   */
  endOfMonth: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  },

  /**
   * Convertit des minutes en millisecondes
   * @param {number} minutes - Nombre de minutes
   * @returns {number} Millisecondes équivalentes
   */
  minutesToMs: (minutes) => minutes * 60 * 1000,

  /**
   * Convertit des heures en millisecondes
   * @param {number} hours - Nombre d'heures
   * @returns {number} Millisecondes équivalentes
   */
  hoursToMs: (hours) => hours * 60 * 60 * 1000,

  /**
   * Convertit des jours en millisecondes
   * @param {number} days - Nombre de jours
   * @returns {number} Millisecondes équivalentes
   */
  daysToMs: (days) => days * 24 * 60 * 60 * 1000,

  /**
   * Début du jour courant
   * @returns {Date} Début de la journée
   */
  startOfDay: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  },

  /**
   * Fin du jour courant
   * @returns {Date} Fin de la journée
   */
  endOfDay: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  },

  /**
   * Début de l'année courante
   * @returns {Date} Premier jour de l'année
   */
  startOfYear: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  },

  /**
   * Fin de l'année courante
   * @returns {Date} Dernier jour de l'année
   */
  endOfYear: () => {
    const now = MockDate.getCurrentTime();
    return new RealDate(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  },
};

/**
 * Fonctions pour activer/désactiver le mock de Date
 */
const timeMock = {
  /**
   * Active le mock de Date
   * @param {Date|string|number} [fixedDate] - Date fixe à utiliser
   */
  enable: (fixedDate = FIXED_DATE) => {
    MockDate.setCurrentTime(fixedDate);
    global.Date = MockDate;
  },

  /**
   * Désactive le mock de Date
   */
  disable: () => {
    global.Date = RealDate;
    MockDate.reset();
  },

  /**
   * Exécute une fonction avec une date mockée
   * @param {Date|string|number} mockDate - Date à utiliser
   * @param {Function} fn - Fonction à exécuter
   * @returns {*} Résultat de la fonction
   */
  withMockedDate: (mockDate, fn) => {
    timeMock.enable(mockDate);
    try {
      return fn();
    } finally {
      timeMock.disable();
    }
  },

  /**
   * Avance le temps de manière contrôlée
   * @param {number} milliseconds - Millisecondes à avancer
   */
  advanceTime: (milliseconds) => {
    MockDate.advanceTime(milliseconds);
  },

  /**
   * Obtient la date courante mockée
   * @returns {Date} Date courante
   */
  getCurrentTime: () => MockDate.getCurrentTime(),

  /**
   * Définit une nouvelle date courante
   * @param {Date|string|number} dateTime - Nouvelle date
   */
  setCurrentTime: (dateTime) => {
    MockDate.setCurrentTime(dateTime);
  },

  /**
   * Remet le temps à la date par défaut
   */
  reset: () => {
    MockDate.reset();
  }
};

/**
 * Scénarios de test temporels prédéfinis
 */
const timeScenarios = {
  /**
   * Cours prévu dans 3 heures (annulation possible)
   */
  cancellableClass: () => {
    const classTime = timeUtils.futureDate(3);
    timeMock.setCurrentTime(MockDate.getCurrentTime());
    return { classTime, canCancel: true };
  },

  /**
   * Cours prévu dans 1 heure (no-show)
   */
  noShowClass: () => {
    const classTime = timeUtils.futureDate(1);
    timeMock.setCurrentTime(MockDate.getCurrentTime());
    return { classTime, canCancel: false };
  },

  /**
   * Cours passé (no-show automatique)
   */
  pastClass: () => {
    const classTime = timeUtils.pastDate(1);
    timeMock.setCurrentTime(MockDate.getCurrentTime());
    return { classTime, isPast: true };
  },

  /**
   * Utilisateur éligible à la remise fidélité
   */
  loyaltyEligible: () => {
    const subscriptionStart = timeUtils.loyaltyEligibleDate();
    return { subscriptionStart, isEligible: true };
  },

  /**
   * Calcul de facturation en milieu de mois
   */
  midMonthBilling: () => {
    timeMock.setCurrentTime(new RealDate('2024-01-15T12:00:00Z'));
    return {
      monthStart: timeUtils.startOfMonth(),
      monthEnd: timeUtils.endOfMonth(),
      currentTime: timeMock.getCurrentTime()
    };
  }
};

module.exports = {
  timeMock,
  timeUtils,
  timeScenarios,
  MockDate,
  FIXED_DATE
};