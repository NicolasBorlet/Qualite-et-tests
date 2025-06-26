import bookingScenario from './scenarios/booking-simultaneous.js';
import cancellationScenario from './scenarios/mass-cancellation.js';
import planningScenario from './scenarios/planning-mass-view.js';
import userCreationScenario from './scenarios/user-creation-loop.js';

export let options = {
  scenarios: {
    booking: { executor: 'constant-vus', exec: 'booking', vus: 10, duration: '12m' },
    planning: { executor: 'constant-vus', exec: 'planning', vus: 10, duration: '12m' },
    userCreation: { executor: 'constant-vus', exec: 'userCreation', vus: 5, duration: '12m' },
    cancellation: { executor: 'constant-vus', exec: 'cancellation', vus: 5, duration: '12m' },
  },
};

export function booking() { bookingScenario(); }
export function planning() { planningScenario(); }
export function userCreation() { userCreationScenario(); }
export function cancellation() { cancellationScenario(); }
