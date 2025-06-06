function calculateLoyaltyPoints(cart) {
    if (!cart || cart.length === 0) {
        return 0;
    }

    let totalPoints = 0;

    for (const item of cart) {
        if (item.type === 'standard') {
            totalPoints += Math.floor(item.price / 10);
        }
    }

    return totalPoints;
}

module.exports = { calculateLoyaltyPoints };
