function calculateLoyaltyPoints(cart) {
    if (!cart || cart.length === 0) {
        return 0;
    }

    let totalPoints = 0;
    let totalAmount = 0;

    for (const item of cart) {
        if (!item.type || typeof item.price !== 'number' || item.price < 0) {
            continue;
        }

        totalAmount += item.price;
        const basePoints = Math.floor(item.price / 10);
        if (item.type === 'standard') {
            totalPoints += basePoints;
        } else if (item.type === 'premium') {
            totalPoints += basePoints * 2;
        }
    }

    if (totalAmount > 200) {
        totalPoints += 10;
    }

    return totalPoints;
}

function analyzeLoyaltyPoints(cart) {
    if (!cart || cart.length === 0) {
        return { totalPoints: 0, bonusApplied: false };
    }

    let totalPoints = 0;
    let totalAmount = 0;

    for (const item of cart) {
        if (!item.type || typeof item.price !== 'number' || item.price < 0) {
            continue;
        }

        totalAmount += item.price;
        const basePoints = Math.floor(item.price / 10);
        if (item.type === 'standard') {
            totalPoints += basePoints;
        } else if (item.type === 'premium') {
            totalPoints += basePoints * 2;
        }
    }

    const bonusApplied = totalAmount > 200;
    if (bonusApplied) {
        totalPoints += 10;
    }

    return { totalPoints, bonusApplied };
}

module.exports = { calculateLoyaltyPoints, analyzeLoyaltyPoints };
