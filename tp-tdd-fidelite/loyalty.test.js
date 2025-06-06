const { calculateLoyaltyPoints } = require('./loyalty');

describe('calculateLoyaltyPoints', () => {
    test('should return 0 points for empty cart', () => {
        const cart = [];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });
});
