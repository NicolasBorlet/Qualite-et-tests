const { canRenewSubscription } = require('./subscription');

describe('canRenewSubscription', () => {
  describe('Valid renewal cases', () => {
    test('should return true for active subscription that can be renewed', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-01',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(true);
    });

    test('should return true when current date equals end date', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-06',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(true);
    });
  });

  describe('Invalid status cases', () => {
    test('should return false for canceled subscription', () => {
      const subscription = {
        status: 'canceled',
        endDate: '2025-06-01',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });

    test('should return false for paused subscription', () => {
      const subscription = {
        status: 'paused',
        endDate: '2025-06-01',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });
  });

  describe('Date-related cases', () => {
    test('should return false when end date has not been reached', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-10',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });
  });

  describe('Subscription state cases', () => {
    test('should return false for subscription that has already been renewed', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-01',
        hasBeenRenewed: true,
        unpaidDebt: false,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });

    test('should return false for subscription with unpaid debt', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-01',
        hasBeenRenewed: false,
        unpaidDebt: true,
        isTrial: false,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });

    test('should return false for trial subscription', () => {
      const subscription = {
        status: 'active',
        endDate: '2025-06-01',
        hasBeenRenewed: false,
        unpaidDebt: false,
        isTrial: true,
      };
      const currentDate = '2025-06-06';

      expect(canRenewSubscription(subscription, currentDate)).toBe(false);
    });
  });
});
