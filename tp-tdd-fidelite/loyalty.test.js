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

    test('should return 14 points for a premium product of 70€', () => {
        const cart = [
            { type: 'premium', price: 70 }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(14);
    });

    test('should add 10 bonus points for cart total over 200€', () => {
        const cart = [
            { type: 'standard', price: 150 },
            { type: 'premium', price: 100 }
        ];
        // Standard: 15 points (150/10)
        // Premium: 20 points (100/10 * 2)
        // Total: 35 + 10 bonus = 45 points
        expect(calculateLoyaltyPoints(cart)).toBe(45);
    });

    test('should return 0 points for negative price', () => {
        const cart = [
            { type: 'standard', price: -50 }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });

    test('should return 0 points for missing price', () => {
        const cart = [
            { type: 'standard' }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });

    test('should return 0 points for missing type', () => {
        const cart = [
            { price: 50 }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });
});
