import bookingScenario from './scenarios/booking-simultaneous.js';
import cancellationScenario from './scenarios/mass-cancellation.js';
import planningScenario from './scenarios/planning-mass-view.js';
import userCreationScenario from './scenarios/user-creation-loop.js';

export let options = {
  scenarios: {
    booking: {
      executor: 'ramping-vus',
      exec: 'booking',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '15s', target: 0 },
      ],
    },
    planning: {
      executor: 'ramping-vus',
      exec: 'planning',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '15s', target: 0 },
      ],
    },
    userCreation: {
      executor: 'ramping-vus',
      exec: 'userCreation',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '15s', target: 25 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 0 },
      ],
    },
    cancellation: {
      executor: 'ramping-vus',
      exec: 'cancellation',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '15s', target: 25 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 0 },
      ],
    },
  },
};

export function booking() { bookingScenario(); }
export function planning() { planningScenario(); }
export function userCreation() { userCreationScenario(); }
export function cancellation() { cancellationScenario(); }
