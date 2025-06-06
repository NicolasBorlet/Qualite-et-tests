const { calculateLoyaltyPoints, analyzeLoyaltyPoints } = require('./loyalty');

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

    test('should ignore items with invalid type', () => {
        const cart = [
            { type: 'invalid', price: 50 }
        ];
        expect(calculateLoyaltyPoints(cart)).toBe(0);
    });
});

describe('analyzeLoyaltyPoints', () => {
    test('should return correct analysis for empty cart', () => {
        const cart = [];
        expect(analyzeLoyaltyPoints(cart)).toEqual({ totalPoints: 0, bonusApplied: false });
    });

    test('should return correct analysis for cart under 200€', () => {
        const cart = [
            { type: 'standard', price: 150 }
        ];
        expect(analyzeLoyaltyPoints(cart)).toEqual({ totalPoints: 15, bonusApplied: false });
    });

    test('should return correct analysis for cart over 200€', () => {
        const cart = [
            { type: 'standard', price: 150 },
            { type: 'premium', price: 100 }
        ];
        expect(analyzeLoyaltyPoints(cart)).toEqual({ totalPoints: 45, bonusApplied: true });
    });
});

describe('Performance', () => {
    test('should handle 1000 products efficiently', () => {
        const cart = Array(1000).fill().map((_, index) => ({
            type: index % 2 === 0 ? 'standard' : 'premium',
            price: 50
        }));

        const startTime = process.hrtime();
        const result = analyzeLoyaltyPoints(cart);
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

        // Vérification des points
        // 500 produits standard à 50€ = 2500 points (50/10 * 500)
        // 500 produits premium à 50€ = 5000 points (50/10 * 2 * 500)
        // Total: 7500 points + 10 bonus (car total > 200€)
        expect(result).toEqual({ totalPoints: 7510, bonusApplied: true });

        // Le test doit s'exécuter en moins de 100ms
        expect(executionTime).toBeLessThan(100);
    });
});
