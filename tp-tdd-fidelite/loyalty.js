function calculateLoyaltyPoints(cart) {
    if (!cart || cart.length === 0) {
        return 0;
    }

    let totalPoints = 0;

    for (const item of cart) {
        const basePoints = Math.floor(item.price / 10);
        if (item.type === 'standard') {
            totalPoints += basePoints;
        } else if (item.type === 'premium') {
            totalPoints += basePoints * 2;
        }
    }

    return totalPoints;
}

module.exports = { calculateLoyaltyPoints };
