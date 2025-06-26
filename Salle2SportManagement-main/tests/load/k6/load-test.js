import bookingScenario from './scenarios/booking-simultaneous.js';
import cancellationScenario from './scenarios/mass-cancellation.js';
import planningScenario from './scenarios/planning-mass-view.js';
import userCreationScenario from './scenarios/user-creation-loop.js';

export let options = {
  scenarios: {
    booking: { executor: 'constant-vus', exec: 'booking', vus: 25, duration: '1m' },
    planning: { executor: 'constant-vus', exec: 'planning', vus: 25, duration: '1m' },
    userCreation: { executor: 'constant-vus', exec: 'userCreation', vus: 10, duration: '1m' },
    cancellation: { executor: 'constant-vus', exec: 'cancellation', vus: 10, duration: '1m' },
  },
};

export function booking() { bookingScenario(); }
export function planning() { planningScenario(); }
export function userCreation() { userCreationScenario(); }
export function cancellation() { cancellationScenario(); }
