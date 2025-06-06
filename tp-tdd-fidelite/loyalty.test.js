const { calculateLoyaltyPoints } = require('./loyalty');

describe('calculateLoyaltyPoints', () => {
    test('should return 0 points for empty cart', () => {
        const cart = [];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });

    test('should return 3 points for a standard product of 35€', () => {
        const cart = [
            { type: 'standard', price: 35 }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(3);
    });
});
